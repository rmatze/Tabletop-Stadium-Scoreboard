# Development

## Run it locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python server.py --demo                 # scripted game; --demo-speed 10 = 10 s per play, 0 = paused
python server.py --port 8081            # live data on another port
```

Board: `http://localhost:8080/`, settings: `http://localhost:8080/settings`. Use the browser's device toolbar at
**1024 × 600** (7"), **1280 × 400** (7.9" bar), **800 × 480** or **800 × 280** to check layouts.

Environment variables: `SCOREBOARD_SETTINGS` (path of `settings.json`), `SCOREBOARD_LOGO_CACHE` (logo folder),
`SCOREBOARD_OFFLINE_AFTER` (seconds without Wi-Fi before the *No Wi-Fi* screen, default 60).

## Layout

| Path | What it does |
|---|---|
| `server.py` | Flask web server, polling loop, rotation logic, controls API, Wi-Fi endpoints |
| `espn.py` | fetches the ESPN scoreboard and standings and normalizes them. **The only file to touch if ESPN changes** |
| `events.py` | compares updates to spot touchdowns, first downs, turnovers and so on |
| `demo.py` | the scripted fake game |
| `config.py` | settings, their allowed values and defaults (saved to `settings.json`) |
| `wifi.py` | Wi-Fi status and changes, through the root helper |
| `static/board.*` | the board display, animations, tap bar, on-screen keyboard |
| `static/settings.html` | the phone settings page |
| `deploy/` | kiosk script, services, touch fix, Wi-Fi helper and sudo rule |
| `deploy/sdcard/` | the first-boot setup script (`script_head.sh`) and SD card instructions |
| `tools/build_sdcard_script.sh` | packs the current code under `script_head.sh` into `dist/Automation_Custom_Script.sh` |
| `app/` | the iOS and Android phone app (Expo); see [app/README.md](../app/README.md) |
| `frame/field_frame.py` | CadQuery source for every frame part (the tested prints) |
| `frame/openscad/` | OpenSCAD customizers (end zones, back tray) |

## API

| Request | Does |
|---|---|
| `GET /api/state` | what's on screen, plus status |
| `POST /api/control` `{"action": "next" \| "prev" \| "auto"}` | change screens |
| `POST /api/control` `{"action": "pin", "game_id": "..."}` | lock a game |
| `POST /api/control` `{"action": "lock"}` | lock the game on screen now |
| `POST /api/test` `{"kind": "touchdown"}` | play an animation |
| `GET/POST /api/settings` | read or change settings (partial updates are fine) |
| `GET /api/wifi`, `GET /api/wifi/scan`, `POST /api/wifi/connect` | Wi-Fi status, scan, connect |
| `GET /api/info` | the board's address and settings link, plus `app`, `api` and `hostname` so the phone app can recognize it |
| `GET /api/teams`, `GET /api/games` | teams by division; this week's games |
| `GET /api/qr.svg` | QR code for the settings page |

A physical button or knob only needs a tiny script that calls `/api/control`.

The board announces itself on the network as `_scoreboard._tcp` (mDNS, `deploy/scoreboard.avahi.service`), which
is how the phone app finds it.

## Building the SD card script

```bash
bash tools/build_sdcard_script.sh       # -> dist/Automation_Custom_Script.sh
```

Releases attach this file automatically (see `.github/workflows/release.yml`).

## Building the 3D files

The STLs in `frame/stl/` come from `frame/field_frame.py` (CadQuery):

```bash
pip install cadquery trimesh manifold3d
cd frame
python field_frame.py --check           # overlap and fit report only
python field_frame.py                   # rebuild every STL, STEP and 3MF (a few minutes)
```

Every size is a named number at the top of the file. The build runs an overlap check on every part and fails loudly if
anything collides.

The OpenSCAD customizers are separate files for people without Python. With default settings, the back tray customizer
matches `back_tray.stl` to within about 0.1%. See [frame/openscad/README.md](../frame/openscad/README.md).

## Releasing

1. Update `CHANGELOG.md`.
2. Either tag it (`git tag v1.1.0 && git push --tags`), or on GitHub open **Releases → Draft a new release**, type a
   new tag such as `v1.1.0`, and click **Publish release**.
3. The release workflow builds `Automation_Custom_Script.sh` and a zip of the print files and attaches them to the
   GitHub Release.
