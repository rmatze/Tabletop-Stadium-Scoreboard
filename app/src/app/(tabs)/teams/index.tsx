// Favorite teams (in priority order) and hidden teams.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, Loading, Row, Screen, Section, tap, TeamChip } from '@/components/ui';
import { logoUrl } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { useTheme } from '@/lib/theme';

type Mode = 'favorites' | 'hidden';

export default function Teams() {
  const t = useTheme();
  const { board, settings, teams, save, reload, error } = useBoard();
  const [mode, setMode] = useState<Mode>('favorites');

  if (!board) return <Loading />;
  if (!settings) {
    return error ? (
      <Screen onRefresh={reload}><Banner text={error} action="Find board" onAction={() => router.push('/connect')} /></Screen>
    ) : <Loading text="Loading teams…" />;
  }

  const favs = settings.favorites;
  const hidden = settings.hidden_teams;
  const name = (abbr: string) => teams.flatMap(d => d.teams).find(x => x.abbr === abbr)?.name || abbr;

  const toggle = (abbr: string) => {
    if (mode === 'favorites') {
      save({ favorites: favs.includes(abbr) ? favs.filter(x => x !== abbr) : [...favs, abbr] });
    } else {
      save({ hidden_teams: hidden.includes(abbr) ? hidden.filter(x => x !== abbr) : [...hidden, abbr] });
    }
  };
  const move = (i: number, step: -1 | 1) => {
    const next = [...favs];
    [next[i], next[i + step]] = [next[i + step], next[i]];
    tap();
    save({ favorites: next });
  };

  return (
    <Screen onRefresh={reload}>
      <View style={[styles.segment, { backgroundColor: t.line }]}>
        {(['favorites', 'hidden'] as Mode[]).map(m => (
          <Pressable key={m} onPress={() => { tap(); setMode(m); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
            style={[styles.segBtn, mode === m && { backgroundColor: t.card }]}>
            <Text style={[styles.segText, { color: t.text }]}>{m === 'favorites' ? `Favorites (${favs.length})` : `Hidden (${hidden.length})`}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'favorites' ? (
        <Section title="Priority" footer="The first team wins when two favorites play at once (unless rotation is on). Tap teams below to add or remove.">
          {favs.length === 0 ? <Row first label="No favorites yet" help="Tap a team below to add it." /> : favs.map((abbr, i) => (
            <Row key={abbr} first={i === 0} label={`${i + 1}. ${name(abbr)}`} right={(
              <View style={styles.orderBtns}>
                <SmallIcon text="↑" disabled={i === 0} onPress={() => move(i, -1)} label={`Move ${abbr} up`} />
                <SmallIcon text="↓" disabled={i === favs.length - 1} onPress={() => move(i, 1)} label={`Move ${abbr} down`} />
                <SmallIcon text="✕" onPress={() => { tap(); save({ favorites: favs.filter(x => x !== abbr) }); }} label={`Remove ${abbr}`} />
              </View>
            )} />
          ))}
        </Section>
      ) : (
        <Text style={[styles.hint, { color: t.muted }]}>
          Hidden teams never rotate onto the screen and are skipped by Next/Prev, unless they're playing one of your favorites.
        </Text>
      )}

      {teams.map(d => (
        <Section key={d.division} title={d.division} plain>
          <View style={styles.grid}>
            {d.teams.map(team => {
              const i = favs.indexOf(team.abbr);
              const state = mode === 'favorites' ? (i >= 0 ? 'on' : 'off') : (hidden.includes(team.abbr) ? 'hidden' : 'off');
              return (
                <TeamChip key={team.abbr} abbr={team.abbr} logo={logoUrl(board, team.abbr)} state={state}
                  badge={mode === 'favorites' && i >= 0 ? i + 1 : undefined} onPress={() => toggle(team.abbr)} />
              );
            })}
          </View>
        </Section>
      ))}
    </Screen>
  );
}

function SmallIcon({ text, onPress, disabled, label }: { text: string; onPress: () => void; disabled?: boolean; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} accessibilityLabel={label}
      style={({ pressed }) => [styles.icon, { backgroundColor: t.chip, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderRadius: 9, padding: 2 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  segText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18, marginHorizontal: 32, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderBtns: { flexDirection: 'row', gap: 6 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
