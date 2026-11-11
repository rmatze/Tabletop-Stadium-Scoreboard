import { Stack } from 'expo-router';

import { useTheme } from '@/lib/theme';

export default function SettingsStack() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: t.bg }, headerTintColor: t.text, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="[key]" options={{ title: '', headerLargeTitle: false }} />
      <Stack.Screen name="wifi" options={{ title: 'Wi-Fi', headerLargeTitle: false }} />
    </Stack>
  );
}
