import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BoardProvider } from '@/lib/board';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <BoardProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: t.bg }, headerTintColor: t.text }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Find your board', headerLargeTitle: true }} />
        <Stack.Screen name="scan" options={{ title: 'Scan QR code', presentation: 'modal' }} />
      </Stack>
    </BoardProvider>
  );
}
