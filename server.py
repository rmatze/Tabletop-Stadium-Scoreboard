"""NFL desktop scoreboard server.

    python server.py            # live ESPN data
    python server.py --demo     # scripted fake game, no internet needed for data

Board:     http://localhost:8080/
Settings:  http://localhost:8080/settings   (works from your phone on the same Wi-Fi)
"""
import argparse
import io
import logging
import os
import socket
import threading
import time
from collections import deque

import requests
from flask import Flask, Response, abort, jsonify, request, send_file, send_from_directory

import config
import demo as demomod
import espn
import events as evmod
import wifi as wifimod

log = logging.getLogger("scoreboard")
HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "static")
LOGO_DIR = os.environ.get("SCOREBOARD_LOGO_CACHE", os.path.join(HERE, "logo_cache"))


class Logos:
    """Downloads each team logo from ESPN once and keeps it on disk."""

    def __init__(self, session):
        self.session = session
        self.failed = {}  # abbr -> time of last failure
        self.lock = threading.Lock()
        os.makedirs(LOGO_DIR, exist_ok=True)

    def path(self, abbr):
        return os.path.join(LOGO_DIR, f"{abbr}.png")

    def get(self, abbr):
        """Local file path, downloading it first if needed. None if unavailable."""
        if abbr not in espn.TEAM_NAMES:
            return None
        p = self.path(abbr)
        if os.path.exists(p):
            return p
        if time.time() - self.failed.get(abbr, 0) < 300:
            return None
        with self.lock:
            if os.path.exists(p):
                return p
            try:
                r = self.session.get(espn.REMOTE_LOGO.format(abbr.lower()), headers=espn.UA, timeout=10)
                r.raise_for_status()
                if not r.content.startswith(b"\x89PNG"):
                    raise ValueError("not a PNG")
                with open(p + ".tmp", "wb") as f:
                    f.write(r.content)
                os.replace(p + ".tmp", p)
                return p
            except Exception as e:
                log.warning("logo %s download failed: %s", abbr, e)
                self.failed[abbr] = time.time()
                return None

    def prefetch(self):
        """Grab all 32 in the background so the board works offline afterwards."""
        def run():
            for abbr in espn.TEAM_NAMES:
                self.get(abbr)
                time.sleep(0.2)
        threading.Thread(target=run, daemon=True).start()


def fav_rank(g, favs):
    ranks = [favs.index(t["abbr"]) for t in (g["away"], g["home"]) if t["abbr"] in favs]
    return min(ranks) if ranks else None


def browse_order(games):
    order = {"in": 0, "pre": 1, "post": 2}
    return sorted(games, key=lambda g: (order.get(g["state"], 3), g.get("start_ts") or 0))


class Hub:
    def __init__(self, demo=False, demo_speed=5.0, demo_start=0):
        self.demo = demomod.Demo(demo_speed, demo_start) if demo else None
        self.lock = threading.RLock()
        self.history = deque(maxlen=150)   # (time, games) snapshots, used for TV delay
        self.events = deque(maxlen=300)
        self.seq = 0
        self.prev = {}
        self.standings = espn.build_divisions({})
        self.standings_at = 0
        self.meta = demomod.META if demo else {}
        self.last_week = []
        self.last_week_at = 0
        self.last_week_key = None
        self.drive_start = {}
        self.status = {"ok": False, "error": "starting", "updated": 0}
        self.view = {"mode": "auto", "game_id": None, "post_seen": None}
        self.cursor, self.cursor_at = 0, time.time()   # rotation position (taps move it)
        self.wifi = wifimod.Wifi()
        self.session = requests.Session()

    # ---------- polling ----------
    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()
        self.wifi.start()

    def _loop(self):
        while True:
            games = []
            try:
                if self.demo:
                    games = self.demo.games(time.time())
                else:
                    games, self.meta = espn.fetch_scoreboard(self.session)
                self._ingest(games)
                self.status = {"ok": True, "error": None, "updated": time.time()}
            except Exception as e:  # keep showing the last good data
                log.warning("scoreboard fetch failed: %s", e)
                self.status = {"ok": False, "error": str(e)[:200], "updated": self.status.get("updated", 0)}
            self._maybe_standings()
            self._maybe_last_week()
            time.sleep(self._interval(games))

    def _interval(self, games):
        if self.demo:
            return 1
        s = config.get()
        if any(g["state"] == "in" for g in games):
            return s["poll_live_seconds"]
        now = time.time()
        if any(g["state"] == "pre" and g.get("start_ts") and g["start_ts"] - now < 1800 for g in games):
            return 30
        return 300 if games else 60

    def _ingest(self, games):
        now = time.time()
        cur = {g["id"]: g for g in games}
        for g in games:
            ds = self.drive_start.get(g["id"])
            if g["state"] == "in" and g.get("possession") and g.get("ball_x") is not None:
                if not ds or ds[0] != g["possession"]:
                    ds = (g["possession"], g["ball_x"])
                    self.drive_start[g["id"]] = ds
            g["drive_start_x"] = ds[1] if ds and ds[0] == g.get("possession") else None
        new = evmod.detect(self.prev, cur) if self.prev else []
        with self.lock:
            for e in new:
                self._add_event(e, now)
            self.history.append((now, games))
            self.prev = cur

    def _add_event(self, e, ts):
        self.seq += 1
        e["seq"], e["ts"] = self.seq, ts
        self.events.append(e)
        log.info("event: %s %s", e["kind"], e.get("abbr") or "")

    def _maybe_standings(self):
        if time.time() - self.standings_at < 1800:
            return
        try:
            self.standings = demomod.standings() if self.demo else espn.fetch_standings(self.session)
            self.standings_at = time.time()
        except Exception as e:
            log.warning("standings fetch failed: %s", e)
            self.standings_at = time.time() - 1500  # retry in ~5 min

    def _maybe_last_week(self):
        key = (self.meta.get("year"), self.meta.get("type"), self.meta.get("week"))
        if key == self.last_week_key and time.time() - self.last_week_at < 3600:
            return
        try:
            self.last_week = demomod.last_week() if self.demo else espn.fetch_previous_week(self.session, self.meta)
            self.last_week_key, self.last_week_at = key, time.time()
        except Exception as e:
            log.warning("last-week fetch failed: %s", e)
            self.last_week_at = time.time() - 3300  # retry in ~5 min

    # ---------- what to show ----------
    def games_now(self):
        """Latest snapshot that is at least `delay_seconds` old (TV sync)."""
        cutoff = time.time() - config.get()["delay_seconds"]
        with self.lock:
            if not self.history:
                return []
            chosen = self.history[0][1]
            for ts, g in self.history:
                if ts <= cutoff:
                    chosen = g
                else:
                    break
            return chosen

    def field_theme(self, g, s):
        """Which team's colors/logo/end zones the field uses."""
        favs = s["favorites"]
        team = None
        if s["field_theme"] in ("favorite", "favorite_always"):
            sides = sorted((x for x in ("away", "home") if g[x]["abbr"] in favs),
                           key=lambda x: favs.index(g[x]["abbr"]))
            if sides:
                team = g[sides[0]]
            elif s["field_theme"] == "favorite_always" and favs:
                team = espn.static_team(favs[0])
        team = team or g["home"]
        keys = ("abbr", "name", "full", "city", "color", "alt", "logo")
        out = {k: team.get(k) for k in keys}
        out["city"] = out.get("city") or espn.TEAM_CITY.get(out["abbr"], "")
        return out

    def _game_screen(self, g, mode, s, reason, label=None):
        favs = s["favorites"]
        fav_sides = [x for x in ("away", "home") if g[x]["abbr"] in favs]
        view = ("field" if s["live_view"] == "field" and g["state"] == "in"
                and g.get("status_name") != "STATUS_HALFTIME" else "scoreboard")
        scr = {"type": "game", "mode": mode, "reason": reason, "game": g,
               "fav_sides": fav_sides, "view": view, "label": label}
        if view == "field":
            scr["field"] = self.field_theme(g, s)
            scr["field_angle"], scr["score_bug"] = s["field_angle"], s["score_bug"]
        return scr

    @staticmethod
    def _hidden(g, s):
        hid, favs = set(s["hidden_teams"]), set(s["favorites"])
        teams = {g["away"]["abbr"], g["home"]["abbr"]}
        return bool(teams & hid) and not (teams & favs)

    def _scope_divisions(self, scope, s):
        favs = s["favorites"]
        if scope == "favorites":
            divs = [espn.TEAM_DIVISION[f] for f in favs if f in espn.TEAM_DIVISION]
            return list(dict.fromkeys(divs)) or list(espn.DIVISIONS)
        if scope == "divisions":
            return s["selected_divisions"] or self._scope_divisions("favorites", s)
        if scope in ("afc", "nfc"):
            return [d for d in espn.DIVISIONS if d.startswith(scope.upper())]
        return list(espn.DIVISIONS)

    @staticmethod
    def _byes(week_games, label):
        """Teams with no game in a regular-season week (only meaningful once that week's schedule is known)."""
        if not week_games or not str(label).startswith("WEEK"):
            return []
        playing = {t for g in week_games for t in (g["away"]["abbr"], g["home"]["abbr"])}
        return [t for div in espn.DIVISIONS.values() for t in div if t not in playing]

    def _hidden_team(self, abbr, s):
        return abbr in s.get("hidden_teams", []) and abbr not in s["favorites"]

    def _record(self, abbr):
        for rows in (self.standings or {}).values():
            for r in rows:
                if r["abbr"] == abbr:
                    return r
        return None

    def _bye_screen(self, abbr, label, s):
        team = espn.static_team(abbr)
        r = self._record(abbr)
        if r:
            team["record"] = f'{r["w"]}-{r["l"]}' + (f'-{r["t"]}' if r.get("t") else "")
        return {"type": "bye", "mode": "auto", "team": team, "label": label,
                "division": espn.TEAM_DIVISION.get(abbr, ""), "favorites": s["favorites"]}

    def _score_grid_by_division(self, games, s, scope):
        """4-per-screen scores: one screen per division per week, with that division's teams on a bye."""
        weeks = {}                                       # label -> every game that week (any state), for byes
        for g in list(games) + (self.last_week if s["include_last_week"] else []):
            weeks.setdefault(g.get("week_label") or "", []).append(g)
        if scope == "favorites":
            divs = self._scope_divisions("favorites", s)
        elif scope == "divisions":
            divs = self._scope_divisions("divisions", s)
        else:                                            # all: favorites' divisions first
            first = self._scope_divisions("favorites", s) if s["favorites"] else []
            divs = first + [d for d in espn.DIVISIONS if d not in first]
        out = []
        for label, wk in weeks.items():
            finals = [g for g in wk if g["state"] == "post" and not self._hidden(g, s)]
            byes = set(self._byes(wk, label))
            for d in divs:
                teams = espn.DIVISIONS[d]
                gs = [g for g in finals if {g["away"]["abbr"], g["home"]["abbr"]} & set(teams)]
                if not gs:
                    continue
                dbyes = [espn.static_team(t) for t in teams if t in byes and not self._hidden_team(t, s)]
                out.append({"type": "scores", "mode": "auto", "label": label, "division": d,
                            "games": gs[:4], "byes": dbyes[:max(0, 4 - len(gs[:4]))], "favorites": s["favorites"]})
        return out

    def _live_grid(self, games, s):
        """No favorite playing but other games live: one screen per division that has a live game,
        with all of that division's games this week (live, final, upcoming) and its byes. Tap a tile for the gamecast."""
        label = (self.meta or {}).get("label") or next((g.get("week_label") for g in games if g.get("week_label")), "")
        byes = set(self._byes(games, label))
        first = self._scope_divisions("favorites", s) if s["favorites"] else []
        out = []
        for d in first + [d for d in espn.DIVISIONS if d not in first]:
            teams = set(espn.DIVISIONS[d])
            gs = [g for g in games if {g["away"]["abbr"], g["home"]["abbr"]} & teams and not self._hidden(g, s)]
            if not any(g["state"] == "in" for g in gs):
                continue
            gs.sort(key=lambda g: ({"in": 0, "post": 1, "pre": 2}.get(g["state"], 3), g.get("start_ts") or 0))
            dbyes = [espn.static_team(t) for t in espn.DIVISIONS[d] if t in byes and not self._hidden_team(t, s)]
            out.append({"type": "scores", "mode": "auto", "label": label, "division": d, "live": True,
                        "games": gs[:4], "byes": dbyes[:max(0, 4 - len(gs[:4]))], "favorites": s["favorites"]})
        return out

    def _score_items(self, games, s, seen):
        scope = s["scores_scope"]
        if scope == "off":
            return []
        favs = set(s["favorites"])
        if scope == "favorites" and not favs:
            scope = "all"
        if s["scores_layout"] == "grid":
            return self._score_grid_by_division(games, s, scope)
        teams = None
        if scope == "favorites":
            teams = favs
        elif scope == "divisions":
            teams = {t for d in self._scope_divisions("divisions", s) for t in espn.DIVISIONS[d]}
        pool = [g for g in games if g["state"] == "post"]
        if s["include_last_week"]:
            pool += self.last_week
        picked = []
        for g in pool:
            if g["id"] in seen or self._hidden(g, s):
                continue
            if teams is not None and not ({g["away"]["abbr"], g["home"]["abbr"]} & teams):
                continue
            seen.add(g["id"])
            picked.append(g)
        return [self._game_screen(g, "auto", s, "score", g.get("week_label")) for g in picked]

    def _standings_items(self, s):
        scope = s["standings_scope"]
        if scope == "off":
            return []
        favs = s["favorites"]
        if scope == "favorites" and not favs:
            scope = "league"
        divs = self._scope_divisions(scope, s)
        layout = s["standings_layout"]
        if layout == "division":
            return [{"type": "standings", "mode": "auto", "division": d,
                     "rows": self.standings.get(d, []), "favorites": favs} for d in divs]
        if layout == "conference":
            out = []
            for conf in ("AFC", "NFC"):
                cd = [d for d in divs if d.startswith(conf)]
                if cd:
                    out.append({"type": "standings_grid", "mode": "auto", "title": f"{conf} STANDINGS",
                                "divisions": [{"name": d, "rows": self.standings.get(d, [])} for d in cd],
                                "favorites": favs})
            return out
        # ranked
        confs = [None] if scope == "league" else list(dict.fromkeys(d.split()[0] for d in divs))
        out = []
        for conf in confs:
            rows = espn.ranked(self.standings, conf)
            title = f"{conf} STANDINGS" if conf else "NFL STANDINGS"
            for i in range(0, len(rows), 8):
                out.append({"type": "standings_ranked", "mode": "auto", "title": title,
                            "start": i + 1, "rows": rows[i:i + 8], "favorites": favs,
                            "seeds": bool(conf) and all(r.get("seed") for r in rows)})
        return out

    def idle_items(self, games, s):
        favs = s["favorites"]
        items, seen = [], set()
        week_label = (self.meta or {}).get("label") or next((g.get("week_label") for g in games if g.get("week_label")), "")
        byes = set(self._byes(games, week_label))
        for f in favs:  # favorites' games this week (final or upcoming) always come first
            for g in games:
                if f in (g["away"]["abbr"], g["home"]["abbr"]) and g["id"] not in seen and g["state"] != "in":
                    seen.add(g["id"])
                    items.append(self._game_screen(g, "auto", s, "favorite", g.get("week_label")))
            if f in byes and not self._hidden_team(f, s):
                items.append(self._bye_screen(f, week_label, s))
        items += self._score_items(games, s, seen)
        items += self._standings_items(s)
        return items

    def _auto_pool(self, games, s):
        """Everything Auto mode is rotating through right now, in order."""
        favs = s["favorites"]
        live = [g for g in games if g["state"] == "in"]
        fav_live = sorted([g for g in live if fav_rank(g, favs) is not None],
                          key=lambda g: fav_rank(g, favs))
        if fav_live:
            pool = fav_live if s["rotate_live_favorites"] else fav_live[:1]
            return [self._game_screen(g, "auto", s, "favorite live") for g in pool]
        other = [g for g in live if not self._hidden(g, s)]
        mode = s["other_live_mode"] if other else "off"
        if mode == "grid":
            pages = self._live_grid(games, s)
            if pages:
                return pages
            mode = "live"
        if mode == "live":
            return [self._game_screen(g, "auto", s, "live game") for g in other]
        idle = self.idle_items(games, s)
        if mode == "mix":
            # live games get every other slot
            lives = [self._game_screen(g, "auto", s, "live game") for g in other]
            items = []
            for i, item in enumerate(idle or [None]):
                items.append(lives[i % len(lives)])
                if item:
                    items.append(item)
            return items
        return idle or [{"type": "idle", "mode": "auto"}]

    def _slot(self, now, s):
        return self.cursor + int((now - self.cursor_at) // s["rotate_seconds"])

    def screen(self, now=None):
        now = now or time.time()
        s = config.get()
        games = self.games_now()
        byid = {g["id"]: g for g in games}

        v = self.view
        if v["mode"] == "peek":
            # a tap jumped to another game: show it briefly, then carry on with Auto
            g = byid.get(v["game_id"])
            if g and now - v["pinned_at"] < PEEK_SECONDS:
                return self._game_screen(g, "auto", s, "you tapped to this game")
            self.view = {"mode": "auto", "game_id": None, "post_seen": None}
        if v["mode"] == "pinned":
            g = byid.get(v["game_id"])
            if g and g["state"] == "post":
                v["post_seen"] = v["post_seen"] or now
            # a game that isn't live (upcoming, or already over) only stays locked for PIN_IDLE seconds
            stale = g and g["state"] != "in" and now - v.get("pinned_at", now) > PIN_IDLE
            if g and not stale and not (v["post_seen"] and now - v["post_seen"] > 300):
                return self._game_screen(g, "pinned", s, "you picked this game")
            self.view = {"mode": "auto", "game_id": None, "post_seen": None}

        pool = self._auto_pool(games, s)
        return pool[self._slot(now, s) % len(pool)]

    def control(self, action, game_id=None):
        """next/prev = flip through (no lock), lock = hold the game on screen, pin = lock a chosen game, auto = resume."""
        s = config.get()
        now = time.time()
        games = browse_order(self.games_now())
        ids = [g["id"] for g in games]
        if action == "auto":
            self.view = {"mode": "auto", "game_id": None, "post_seen": None}
            return
        if action == "lock":
            cur = self.screen(now)
            if cur.get("type") == "game":
                self.view = {"mode": "pinned", "game_id": cur["game"]["id"], "post_seen": None, "pinned_at": now}
            return
        if action == "pin" and game_id in ids:
            self.view = {"mode": "pinned", "game_id": game_id, "post_seen": None, "pinned_at": now}
            return
        if action not in ("next", "prev"):
            return
        step = 1 if action == "next" else -1
        was = self.view["mode"]
        cur = self.screen(now)
        self.view = {"mode": "auto", "game_id": None, "post_seen": None}
        pool = self._auto_pool(self.games_now(), s)
        if len(pool) > 1 and was != "peek":
            # flip to the next/previous thing in the rotation, then keep rotating from there
            self.cursor, self.cursor_at = self._slot(now, s) + step, now
            return
        # only one thing rotating (e.g. one favorite live): peek at the other games instead
        nav = [g["id"] for g in games if not self._hidden(g, s)] or ids
        if not nav:
            return
        cur_id = cur["game"]["id"] if cur.get("type") == "game" else None
        target = nav[(nav.index(cur_id) + step) % len(nav)] if cur_id in nav else (nav[0] if step == 1 else nav[-1])
        self.view = {"mode": "peek", "game_id": target, "post_seen": None, "pinned_at": now}

    def events_for(self, since, screen):
        s = config.get()
        favs = set(s["favorites"])
        cutoff = time.time() - s["delay_seconds"]
        shown = screen["game"]["id"] if screen["type"] == "game" else None
        out, latest = [], 0
        with self.lock:
            for e in self.events:
                if e["ts"] > cutoff:
                    break
                latest = e["seq"]
                if since < 0 or e["seq"] <= since:
                    continue
                if not s["animations"].get(e["kind"], True):
                    continue
                if (e["game_id"] == shown or e.get("force") or
                        (s["alert_all_favorites"] and e["kind"] in evmod.BIG and e.get("abbr") in favs)):
                    out.append(e)
        return out, latest

    def test_event(self, kind):
        scr = self.screen()
        if scr["type"] == "game":
            g = scr["game"]
        else:
            g = (self.games_now() or demomod.Demo().games(time.time()))[0]
        side = g.get("possession") or "home"
        label = {"turnover": "INTERCEPTION"}.get(kind)
        e = evmod.make_event(kind, g, side if kind != "final" else ("home" if g["home"]["score"] >= g["away"]["score"] else "away"), label=label)
        e["force"] = True
        with self.lock:
            self._add_event(e, time.time() - config.get()["delay_seconds"] - 0.01)


def create_app(hub):
    app = Flask(__name__, static_folder=STATIC, static_url_path="/static")
    logos = Logos(requests.Session())
    logos.prefetch()

    @app.get("/logo/<abbr>.png")
    def logo(abbr):
        p = logos.get(abbr.upper())
        if not p:
            abort(404)
        return send_file(p, mimetype="image/png", max_age=30 * 86400)

    @app.get("/")
    def board():
        return send_from_directory(STATIC, "board.html")

    @app.get("/settings")
    def settings_page():
        return send_from_directory(STATIC, "settings.html")

    @app.get("/api/state")
    def state():
        since = request.args.get("since", -1, type=int)
        scr = hub.screen()
        evs, latest = hub.events_for(since, scr)
        s = config.get()
        return jsonify({
            "screen": scr, "events": evs, "seq": latest, "status": hub.status,
            "demo": bool(hub.demo), "favorites": s["favorites"], "time": time.time(),
            "display": {k: s[k] for k in ("tier", "rotate", "viewport", "show_last_play")},
            "wifi": {k: hub.wifi.state[k] for k in ("available", "connected", "ssid", "offline")},
        })

    @app.get("/api/games")
    def games():
        out = []
        for g in browse_order(hub.games_now()):
            a, h = g["away"], g["home"]
            if g["state"] == "pre":
                status = "upcoming"
            elif g["state"] == "post":
                status = g["detail"] or "Final"
            else:
                status = g["detail"] or f'{g["period_label"]} {g["clock"]}'
            out.append({"id": g["id"], "state": g["state"], "away": a["abbr"], "home": h["abbr"],
                        "away_score": a["score"], "home_score": h["score"], "status": status,
                        "start_ts": g.get("start_ts")})
        return jsonify(out)

    @app.get("/api/teams")
    def teams():
        return jsonify([{"division": d, "teams": [{"abbr": a, "name": espn.TEAM_NAMES[a],
                                                   "logo": espn.logo_url(a)} for a in abbrs]}
                        for d, abbrs in espn.DIVISIONS.items()])

    @app.route("/api/settings", methods=["GET", "POST"])
    def settings():
        if request.method == "POST":
            return jsonify(config.update(request.get_json(force=True) or {}))
        return jsonify(config.get())

    @app.post("/api/control")
    def control():
        body = request.get_json(force=True) or {}
        hub.control(body.get("action"), body.get("game_id"))
        return jsonify({"ok": True, "view": hub.view})

    @app.get("/api/wifi")
    def wifi_status():
        """Current connection plus the last connect attempt (the board and phone poll this while connecting)."""
        return jsonify({**hub.wifi.state, "attempt": hub.wifi.attempt})

    @app.get("/api/wifi/scan")
    def wifi_scan():
        return jsonify(hub.wifi.scan())

    @app.post("/api/wifi/connect")
    def wifi_connect():
        body = request.get_json(force=True) or {}
        ssid, psk = str(body.get("ssid", ""))[:32], str(body.get("psk", ""))[:63]
        if not ssid:
            return jsonify({"ok": False, "error": "Pick a network first."}), 400
        if not hub.wifi.connect(ssid, psk):
            return jsonify({"ok": False, "error": "Wi-Fi setup isn't available or is already busy."}), 409
        return jsonify({"ok": True})

    touchlog = deque(maxlen=300)

    @app.route("/api/touchlog", methods=["GET", "POST"])
    def touch_log():
        """Tap recorder for troubleshooting the touch screen: the board posts what it receives, open this page to read it."""
        if request.method == "POST":
            for line in (request.get_json(force=True) or [])[:50]:
                touchlog.append(time.strftime("%H:%M:%S ") + str(line)[:200])
            return jsonify({"ok": True})
        return Response("\n".join(touchlog) or "(no taps recorded yet)", mimetype="text/plain")

    @app.get("/api/info")
    def info():
        ip = lan_ip()
        port = request.host.split(":")[1] if ":" in request.host else "80"
        return jsonify({"ip": ip, "settings_url": f"http://{ip}:{port}/settings" if ip else None,
                        "app": "tabletop-stadium-scoreboard", "api": 1, "hostname": socket.gethostname()})

    @app.get("/api/qr.svg")
    def qr():
        """QR code of the phone settings page, shown in the on-screen menu."""
        ip = lan_ip()
        if not ip:
            abort(404)
        port = request.host.split(":")[1] if ":" in request.host else "80"
        try:
            import segno
        except ImportError:
            abort(404)
        buf = io.BytesIO()
        segno.make(f"http://{ip}:{port}/settings", error="m").save(buf, kind="svg", scale=10, border=2, dark="#000", light="#fff")
        return Response(buf.getvalue(), mimetype="image/svg+xml", headers={"Cache-Control": "no-store"})

    @app.post("/api/test")
    def test():
        kind = (request.get_json(force=True) or {}).get("kind", "touchdown")
        if kind not in evmod.LABELS:
            return jsonify({"ok": False, "error": "unknown kind"}), 400
        hub.test_event(kind)
        return jsonify({"ok": True})

    return app


PIN_IDLE = 600       # seconds a locked non-live game stays on screen before going back to Auto
PEEK_SECONDS = 30    # a tapped-to game (when only one thing is rotating) stays this long


def lan_ip():
    """This device's address on the home network (no traffic is sent)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sk:
            sk.connect(("10.255.255.255", 1))
            ip = sk.getsockname()[0]
        return None if ip.startswith("127.") else ip
    except OSError:
        return None


def main():
    ap = argparse.ArgumentParser(description="NFL desktop scoreboard")
    ap.add_argument("--demo", action="store_true", help="run a scripted fake game")
    ap.add_argument("--demo-speed", type=float, default=5.0, help="seconds per demo play (0 = paused)")
    ap.add_argument("--demo-start", type=int, default=0, help=argparse.SUPPRESS)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    hub = Hub(demo=args.demo, demo_speed=args.demo_speed, demo_start=args.demo_start)
    hub.start()
    print(f"\n  Scoreboard: http://localhost:{args.port}/\n  Settings:   http://localhost:{args.port}/settings\n"
          + ("  (demo mode)\n" if args.demo else ""))
    create_app(hub).run(host=args.host, port=args.port, threaded=True)


if __name__ == "__main__":
    main()
