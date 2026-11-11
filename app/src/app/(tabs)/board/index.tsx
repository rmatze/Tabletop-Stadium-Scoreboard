// What the board is showing, Prev / Auto / Next, and this week's games (tap one to lock it on screen).
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Loading, Row, Screen, Section, tap } from '@/components/ui';
import { api, ApiError, BoardState, describeScreen, GameSummary } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { useTheme } from '@/lib/theme';

export default function BoardTab() {
  const t = useTheme();
  const { board, offline, setOffline, reload } = useBoard();
  const [state, setState] = useState<BoardState | null>(null);
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!board || inFlight.current) return;
    inFlight.current = true;
    try {
      const [st, gs] = await Promise.all([api.state(board), api.games(board)]);
      setState(st);
      setGames(gs);
      setFailed(null);
      setOffline(false);
    } catch (e) {
      setFailed((e as Error).message);
      if (e instanceof ApiError && e.offline) setOffline(true);
    } finally {
      inFlight.current = false;
    }
  }, [board, setOffline]);

  // Poll every 5 seconds while this tab is on screen (like the web page does).
  useFocusEffect(useCallback(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]));

  const control = async (action: 'prev' | 'next' | 'auto' | 'lock' | 'pin', gameId?: string) => {
    if (!board) return;
    try {
      await api.control(board, action, gameId);
    } catch (e) {
      setFailed((e as Error).message);
    }
    refresh();
  };

  if (!board) return <Loading />;
  const sc = state?.screen;
  const current = sc?.type === 'game' ? sc.game?.id : null;
  const mode = sc?.mode === 'pinned' ? 'Locked' : sc?.mode === 'peek' ? 'Peeking' : 'Auto';

  return (
    <>
      <Stack.Screen options={{ title: board.name }} />
      <Screen onRefresh={async () => { await Promise.all([refresh(), reload()]); }}>
        {failed || offline ? (
          <Banner text={failed || "Can't reach the board."} action="Find board" onAction={() => router.push('/connect')} />
        ) : null}

        <Section title="Now showing">
          <View style={styles.now}>
            <Text style={[styles.nowText, { color: t.text }]} numberOfLines={2}>{state ? describeScreen(state) : '…'}</Text>
            <View style={styles.tags}>
              <Tag text={mode} color={mode === 'Auto' ? t.muted : t.accent} />
              {state?.demo ? <Tag text="Demo" color={t.accent} /> : null}
              {state && !state.status.ok ? <Tag text="Data error" color={t.danger} /> : null}
            </View>
          </View>
        </Section>
        <View style={styles.controls}>
          <Button title="◀ Prev" onPress={() => control('prev')} />
          <Button title="Auto" kind="primary" onPress={() => control('auto')} />
          <Button title="Next ▶" onPress={() => control('next')} />
        </View>

        <Section title="This week" footer="Tap a game to lock it on screen. It returns to Auto 5 minutes after that game ends, or when you tap Auto.">
          {games === null ? <Row first label="Loading…" /> : games.length === 0 ? <Row first label="No games this week yet" /> :
            games.map((g, i) => <GameRow key={g.id} g={g} first={i === 0} current={g.id === current}
              onPress={() => { tap(); control('pin', g.id); }} />)}
        </Section>
      </Screen>
    </>
  );
}

function GameRow({ g, first, current, onPress }: { g: GameSummary; first: boolean; current: boolean; onPress: () => void }) {
  const t = useTheme();
  const when = g.state === 'pre' && g.start_ts
    ? new Date(g.start_ts * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : g.status;
  const score = g.state === 'pre' ? '' : `  ${g.away_score} – ${g.home_score}`;
  return (
    <Row first={first} onPress={onPress} label={`${g.away} @ ${g.home}${score}`}
      right={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: g.state === 'in' ? t.live : t.muted, fontWeight: g.state === 'in' ? '600' : '400' }}>{when}</Text>
          {current ? <View style={[styles.dot, { backgroundColor: t.accentFill }]} /> : null}
        </View>
      )} />
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.tag, { color, borderColor: color }]}>{text.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  now: { padding: 16, gap: 10 },
  nowText: { fontSize: 24, fontWeight: '700', letterSpacing: 0.2 },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  controls: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
