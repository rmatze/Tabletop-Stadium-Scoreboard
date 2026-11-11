// Client for the board's HTTP API (server.py). The app talks to the same endpoints as the
// phone settings page (static/settings.html), so the board needs no changes to support it.

export const DEFAULT_PORT = 8080;
export const SERVICE_TYPE = 'scoreboard'; // mDNS: _scoreboard._tcp (deploy/scoreboard.avahi.service)

export type Board = { host: string; port: number; name: string };

export const baseUrl = (b: Board) => `http://${b.host.includes(':') ? `[${b.host}]` : b.host}:${b.port}`;
export const logoUrl = (b: Board, abbr: string) => `${baseUrl(b)}/logo/${abbr}.png`;

export type Choice = string;
export type Settings = {
  favorites: string[];
  hidden_teams: string[];
  selected_divisions: string[];
  live_view: Choice;
  field_theme: Choice;
  field_angle: Choice;
  score_bug: Choice;
  rotate_seconds: number;
  rotate_live_favorites: boolean;
  other_live_mode: Choice;
  scores_scope: Choice;
  scores_layout: Choice;
  include_last_week: boolean;
  standings_scope: Choice;
  standings_layout: Choice;
  alert_all_favorites: boolean;
  delay_seconds: number;
  poll_live_seconds: number;
  tier: Choice;
  rotate: Choice;
  show_last_play: boolean;
  viewport: { x: number; y: number; width: number; height: number };
  animations: Record<string, boolean>;
};
export type SettingsPatch = Partial<Omit<Settings, 'viewport' | 'animations'>> & {
  viewport?: Partial<Settings['viewport']>;
  animations?: Record<string, boolean>;
};

export type Team = { abbr: string; name: string; logo: string };
export type Division = { division: string; teams: Team[] };

export type GameSummary = {
  id: string;
  state: 'pre' | 'in' | 'post';
  away: string;
  home: string;
  away_score: number;
  home_score: number;
  status: string;
  start_ts?: number | null;
};

export type Screen = {
  type: string;
  mode?: string;
  label?: string;
  title?: string;
  division?: string;
  game?: { id: string; away: { abbr: string }; home: { abbr: string } };
};
export type BoardState = { screen: Screen; demo: boolean; status: { ok: boolean } };

export type WifiNetwork = { ssid: string; signal: number; secure: boolean };
export type WifiStatus = {
  available: boolean;
  connected: boolean;
  ssid?: string | null;
  ip?: string | null;
  attempt?: { state?: 'connecting' | 'ok' | 'failed'; ssid?: string; error?: string } | null;
};

export type BoardInfo = { ip: string | null; settings_url: string | null; app?: string; api?: number; hostname?: string };

export class ApiError extends Error {
  constructor(message: string, public offline = false) {
    super(message);
  }
}

async function request<T>(b: Board, path: string, body?: unknown, timeoutMs = 6000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(baseUrl(b) + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? { 'Cache-Control': 'no-store' } : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    throw new ApiError(`Can't reach the board at ${b.host}:${b.port}.`, true);
  } finally {
    clearTimeout(timer);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // fall through to the status check
  }
  if (!res.ok) throw new ApiError((data && data.error) || `The board answered with an error (${res.status}).`);
  return data as T;
}

export const api = {
  info: (b: Board, timeoutMs?: number) => request<BoardInfo>(b, '/api/info', undefined, timeoutMs),
  settings: (b: Board) => request<Settings>(b, '/api/settings'),
  saveSettings: (b: Board, patch: SettingsPatch) => request<Settings>(b, '/api/settings', patch),
  teams: (b: Board) => request<Division[]>(b, '/api/teams'),
  state: (b: Board) => request<BoardState>(b, '/api/state'),
  games: (b: Board) => request<GameSummary[]>(b, '/api/games'),
  control: (b: Board, action: 'prev' | 'next' | 'auto' | 'lock' | 'pin', game_id?: string) =>
    request<{ ok: boolean }>(b, '/api/control', { action, game_id }),
  test: (b: Board, kind: string) => request<{ ok: boolean }>(b, '/api/test', { kind }),
  wifi: (b: Board) => request<WifiStatus>(b, '/api/wifi'),
  wifiScan: (b: Board) => request<{ networks?: WifiNetwork[] }>(b, '/api/wifi/scan', undefined, 30000),
  wifiConnect: (b: Board, ssid: string, psk: string) => request<{ ok: boolean }>(b, '/api/wifi/connect', { ssid, psk }),
};

/** Reads a typed address or the board's QR code: "192.168.1.42", "scoreboard.local:8080", "http://10.0.0.5:8080/settings". */
export function parseAddress(input: string): { host: string; port: number } | null {
  const m = input.trim().match(/^(?:https?:\/\/)?(\[[0-9a-fA-F:]+\]|[^\s/:?#]+)(?::(\d{1,5}))?(?:[/?#].*)?$/);
  if (!m) return null;
  const host = m[1].replace(/^\[|\]$/g, '');
  const port = m[2] ? Number(m[2]) : DEFAULT_PORT;
  if (!host || port < 1 || port > 65535) return null;
  return { host, port };
}

/** Confirms a scoreboard answers at this address, and names it. */
export async function probe(host: string, port: number, name?: string): Promise<Board> {
  const draft: Board = { host, port, name: name || host };
  const info = await api.info(draft, 4000);
  if (!info || !('settings_url' in info)) throw new ApiError("That address answered, but it isn't a scoreboard.");
  return { ...draft, name: name || info.hostname?.split('.')[0] || host };
}

/** What the board is showing, in a few words (same wording as the web settings page). */
export function describeScreen(st: BoardState): string {
  const sc = st.screen;
  if (sc.type === 'game' && sc.game) {
    return `${sc.game.away.abbr} @ ${sc.game.home.abbr}${sc.label ? ` (${sc.label.toLowerCase()})` : ''}`;
  }
  if (sc.type === 'standings') return `${sc.division} standings`;
  if (sc.type === 'scores') return `${(sc.label || '').toLowerCase()} scores`.trim();
  if ((sc.type === 'standings_grid' || sc.type === 'standings_ranked') && sc.title) return sc.title;
  return 'Nothing scheduled';
}
