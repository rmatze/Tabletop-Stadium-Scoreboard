// Every setting from the web settings page, grouped the same way.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, Button, Loading, NumberRow, Row, Screen, Section, SwitchRow, tap } from '@/components/ui';
import { api, baseUrl, Settings, WifiStatus } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { ANIMATIONS, BEHAVIOR, choiceLabel, DISPLAY, LIVE_VIEW, Option, ROTATION } from '@/lib/options';
import { useTheme } from '@/lib/theme';

export default function SettingsTab() {
  const t = useTheme();
  const { board, settings, teams, save, reload, error, forget } = useBoard();
  const [wifi, setWifi] = useState<WifiStatus | null>(null);

  useFocusEffect(useCallback(() => {
    if (board) api.wifi(board).then(setWifi).catch(() => setWifi(null));
  }, [board]));

  if (!board) return <Loading />;
  if (!settings) {
    return error ? (
      <Screen onRefresh={reload}><Banner text={error} action="Find board" onAction={() => router.push('/connect')} /></Screen>
    ) : <Loading text="Loading settings…" />;
  }

  const rows = (list: Option[]) => list.map((o, i) => <OptionRow key={o.key} option={o} settings={settings} first={i === 0}
    onChange={v => save({ [o.key]: v } as Partial<Settings>)} />);
  const usesDivs = settings.scores_scope === 'divisions' || settings.standings_scope === 'divisions';
  const test = (kind: string, label: string) => api.test(board, kind)
    .then(() => Alert.alert('Playing on the board', label))
    .catch(e => Alert.alert("Couldn't play it", (e as Error).message));

  return (
    <Screen onRefresh={reload}>
      <Section title="Live game view">{rows(settings.live_view === 'field' ? LIVE_VIEW : LIVE_VIEW.slice(0, 1))}</Section>

      <Section title="Rotation" footer="What shows when your favorites aren't playing: their latest games first, then scores, then standings.">
        {rows(ROTATION)}
      </Section>

      {usesDivs ? (
        <Section title="Your divisions" footer='Used when Scores or Standings is set to "My divisions".' plain>
          <View style={styles.divGrid}>
            {teams.map(d => {
              const on = settings.selected_divisions.includes(d.division);
              return (
                <View key={d.division} style={{ flexBasis: '23%', flexGrow: 1 }}>
                  <Button small title={d.division} kind={on ? 'primary' : 'plain'} onPress={() => save({
                    selected_divisions: on ? settings.selected_divisions.filter(x => x !== d.division) : [...settings.selected_divisions, d.division],
                  })} />
                </View>
              );
            })}
          </View>
        </Section>
      ) : null}

      <Section title="Behavior">{rows(BEHAVIOR)}</Section>

      <Section title="Animations" footer='Turn moments on or off. "Test" plays it on the board right now.'>
        {ANIMATIONS.map(([kind, label], i) => (
          <SwitchRow key={kind} first={i === 0} label={label} value={!!settings.animations[kind]}
            onChange={v => save({ animations: { [kind]: v } })}
            help={undefined} />
        ))}
      </Section>
      <Section title="Test an animation" plain>
        <View style={styles.testGrid}>
          {ANIMATIONS.map(([kind, label]) => (
            <View key={kind} style={{ flexBasis: '31%', flexGrow: 1 }}>
              <Button small title={label} onPress={() => test(kind, label)} />
            </View>
          ))}
        </View>
      </Section>

      <Section title="Display">
        {rows(DISPLAY)}
      </Section>
      <Section title="Use only part of the screen" footer="For masking a bigger screen with your printed bezel. Pixels; 0 = full screen.">
        {(['x', 'y', 'width', 'height'] as const).map((k, i) => (
          <NumberRow key={k} first={i === 0} label={k === 'x' ? 'Left (x)' : k === 'y' ? 'Top (y)' : k[0].toUpperCase() + k.slice(1)}
            value={settings.viewport[k]} min={0} max={9999} unit="px" onChange={v => save({ viewport: { [k]: v } })} />
        ))}
      </Section>

      {wifi?.available ? (
        <Section title="Wi-Fi">
          <Row first label="Wi-Fi" value={wifi.connected ? wifi.ssid || 'Connected' : 'Not connected'} chevron
            onPress={() => router.push('/settings/wifi')} />
        </Section>
      ) : null}

      <Section title="This board">
        <Row first label={board.name} help={baseUrl(board)} />
        <Row label="Connect to a different board" chevron onPress={() => router.push('/connect')} />
        <Row label="Forget this board" destructive onPress={() => Alert.alert('Forget this board?', 'You can find it again on the next screen.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Forget', style: 'destructive', onPress: async () => { await forget(); router.replace('/connect'); } },
        ])} />
      </Section>
    </Screen>
  );
}

function OptionRow({ option: o, settings, first, onChange }:
  { option: Option; settings: Settings; first: boolean; onChange: (v: unknown) => void }) {
  const value = settings[o.key];
  if (o.kind === 'bool') return <SwitchRow first={first} label={o.label} help={o.help} value={!!value} onChange={onChange} />;
  if (o.kind === 'number') {
    return <NumberRow first={first} label={o.label} help={o.help} value={Number(value)} min={o.min} max={o.max} unit={o.unit} onChange={onChange} />;
  }
  return (
    <Row first={first} label={o.label} value={choiceLabel(o, value)} chevron
      onPress={() => { tap(); router.push({ pathname: '/settings/[key]', params: { key: String(o.key) } }); }} />
  );
}

const styles = StyleSheet.create({
  divGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
