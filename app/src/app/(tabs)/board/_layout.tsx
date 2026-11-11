import { Stack } from 'expo-router';

import { useTheme } from '@/lib/theme';

export default function BoardStack() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: t.bg }, headerTintColor: t.text, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Board' }} />
    </Stack>
  );
}
