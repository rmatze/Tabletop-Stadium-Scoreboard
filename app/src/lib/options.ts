// The board's settings, with the same labels and help text as the web settings page
// (static/settings.html). Allowed values come from CHOICES / NUMBERS in config.py.
import type { Settings } from './api';

export type ChoiceOption = { kind: 'choice'; key: keyof Settings; label: string; help?: string; choices: [string, string][] };
export type BoolOption = { kind: 'bool'; key: keyof Settings; label: string; help?: string };
export type NumberOption = { kind: 'number'; key: keyof Settings; label: string; help?: string; min: number; max: number; unit?: string };
export type Option = ChoiceOption | BoolOption | NumberOption;

export const LIVE_VIEW: Option[] = [
  { kind: 'choice', key: 'live_view', label: 'Live game look', help: 'Halftime, pregame and finals always use the scoreboard',
    choices: [['field', 'Field'], ['scoreboard', 'Scoreboard']] },
  { kind: 'choice', key: 'field_theme', label: 'Field colors & end zones', help: 'Midfield logo and end zone names',
    choices: [['home', 'Home team'], ['favorite', 'Favorite if playing'], ['favorite_always', 'Always #1 favorite']] },
  { kind: 'choice', key: 'field_angle', label: 'Field angle', choices: [['tv', 'TV angle'], ['flat', 'Flat (top-down)']] },
  { kind: 'choice', key: 'score_bug', label: 'Score bar position', choices: [['bottom', 'Bottom'], ['top', 'Top']] },
  { kind: 'bool', key: 'show_last_play', label: 'Show last play', help: 'Text of the last play' },
];

export const ROTATION: Option[] = [
  { kind: 'number', key: 'rotate_seconds', label: 'Seconds per screen', min: 3, max: 300, unit: 's' },
  { kind: 'bool', key: 'rotate_live_favorites', label: 'Rotate between favorites', help: 'When two or more favorites play at the same time' },
  { kind: 'choice', key: 'other_live_mode', label: 'Other live games',
    help: 'When none of your favorites are playing. Scores by division: tap a game to open its gamecast',
    choices: [['grid', 'Scores by division'], ['live', 'One gamecast at a time'], ['mix', 'Mix in with scores'], ['off', 'Hide']] },
  { kind: 'choice', key: 'scores_scope', label: 'Scores',
    choices: [['favorites', 'My favorites'], ['divisions', 'My divisions'], ['all', 'All games'], ['off', 'Off']] },
  { kind: 'choice', key: 'scores_layout', label: 'Scores layout', help: '4 per screen shows one division at a time, with any teams on a bye',
    choices: [['single', 'One at a time'], ['grid', '4 per screen (by division)']] },
  { kind: 'bool', key: 'include_last_week', label: 'Include last week', help: "Previous week's finals, alongside this week's" },
  { kind: 'choice', key: 'standings_scope', label: 'Standings',
    choices: [['favorites', "Favorites' divisions"], ['divisions', 'My divisions'], ['afc', 'AFC'], ['nfc', 'NFC'], ['league', 'Whole league'], ['off', 'Off']] },
  { kind: 'choice', key: 'standings_layout', label: 'Standings layout',
    help: 'Conference shows 4 divisions side by side; Ranked lists teams by record (playoff seeds when available)',
    choices: [['division', 'One division'], ['conference', 'Conference'], ['ranked', 'Ranked list']] },
];

export const BEHAVIOR: Option[] = [
  { kind: 'bool', key: 'alert_all_favorites', label: 'Favorite alerts from any game', help: "Show a favorite's touchdown even if another game is on screen" },
  { kind: 'number', key: 'delay_seconds', label: 'TV sync delay', help: "Hold updates back so the board doesn't spoil the broadcast. Try 30–60.", min: 0, max: 300, unit: 's' },
  { kind: 'number', key: 'poll_live_seconds', label: 'Live update interval', help: 'How often to check ESPN during games', min: 5, max: 120, unit: 's' },
];

export const DISPLAY: Option[] = [
  { kind: 'choice', key: 'tier', label: 'Layout size', help: 'Auto picks from the screen size',
    choices: [['auto', 'Auto'], ['standard', 'Standard (7" etc.)'], ['compact', 'Bar: compact'], ['bar', 'Bar'], ['wide', 'Bar: wide']] },
  { kind: 'choice', key: 'rotate', label: 'Rotation', help: 'Auto turns a portrait-mounted bar screen sideways',
    choices: [['auto', 'Auto'], ['0', '0°'], ['90', '90°'], ['180', '180°'], ['270', '270°']] },
];

export const ANIMATIONS: [string, string][] = [
  ['touchdown', 'Touchdown'], ['field_goal', 'Field goal'], ['safety', 'Safety'], ['two_point', '2-point conversion'],
  ['extra_point', 'Extra point'], ['first_down', 'First down'], ['turnover', 'Turnover'], ['red_zone', 'Red zone'],
  ['kickoff', 'Kickoff'], ['halftime', 'Halftime'], ['final', 'Final'],
];

export const ALL_OPTIONS: Option[] = [...LIVE_VIEW, ...ROTATION, ...BEHAVIOR, ...DISPLAY];
export const findOption = (key: string) => ALL_OPTIONS.find(o => o.key === key);
export const choiceLabel = (o: ChoiceOption, value: unknown) => o.choices.find(([v]) => v === String(value))?.[1] ?? String(value);
