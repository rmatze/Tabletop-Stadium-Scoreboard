import { useColorScheme } from 'react-native';

// Grouped-list colors close to each platform's system settings, with the board's yellow as the accent.
const light = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#0B0E12',
  muted: '#6B7280',
  line: '#D9DCE1',
  accent: '#C99A00',     // board yellow, darkened to read on white
  accentFill: '#FFD21F', // board yellow for filled shapes
  onAccent: '#111111',
  chip: '#F2F2F7',
  chipOn: '#FFF6CC',
  live: '#1E9E5A',
  danger: '#D93036',
  dangerFill: '#FDECEC',
};
const dark: typeof light = {
  bg: '#0B0E12',
  card: '#161B22',
  text: '#EEF2F6',
  muted: '#8894A1',
  line: '#26303B',
  accent: '#FFD21F',
  accentFill: '#FFD21F',
  onAccent: '#111111',
  chip: '#10151B',
  chipOn: '#2A2610',
  live: '#2FBF71',
  danger: '#E5484D',
  dangerFill: '#2A1314',
};
export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
