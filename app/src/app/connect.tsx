// Find a board: boards announcing themselves on the Wi-Fi (mDNS), the QR code on the board, or a typed address.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { Component, ReactNode, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useZeroconf } from 'react-native-zeroconf';

import { Button, Row, Screen, Section } from '@/components/ui';
import { Board, parseAddress, probe, SERVICE_TYPE } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { useTheme } from '@/lib/theme';

// mDNS needs the native module, which Expo Go and the web don't have.
const canDiscover = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export default function Connect() {
  const t = useTheme();
  const { board, connect } = useBoard();
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const use = async (host: string, port: number, name: string | undefined, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const b = await probe(host, port, name);
      await connect(b);
      router.replace('/board');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const typed = () => {
    const a = parseAddress(address);
    if (!a) return setError('Type the address shown on the board, like 192.168.1.42 or 192.168.1.42:8080.');
    use(a.host, a.port, undefined, 'typed');
  };

  return (
    <Screen>
      <Text style={[styles.intro, { color: t.muted }]}>
        Your phone and the scoreboard need to be on the same Wi-Fi. Press and hold the board's screen for about a second
        to see its address and QR code.
      </Text>

      <Section title="On this Wi-Fi">
        {canDiscover ? (
          <DiscoveryBoundary>
            <Discovered current={board} busy={busy} onPick={(b, key) => use(b.host, b.port, b.name, key)} />
          </DiscoveryBoundary>
        ) : (
          <Row first label="Searching isn't available here" help="Use a development build of the app to find boards automatically. You can still scan or type the address." />
        )}
      </Section>

      <Section title="Scan the board's QR code" plain>
        <Button title="Scan QR code" kind="primary" onPress={() => router.push('/scan')} />
      </Section>

      <Section title="Or type its address" footer="The board shows it under the QR code, e.g. 192.168.1.42:8080">
        <View style={styles.inputRow}>
          <TextInput value={address} onChangeText={setAddress} onSubmitEditing={typed}
            placeholder="192.168.1.42:8080" placeholderTextColor={t.muted}
            autoCapitalize="none" autoCorrect={false} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'url'}
            returnKeyType="go" style={[styles.input, { color: t.text }]} />
          {busy === 'typed' ? <ActivityIndicator style={{ marginRight: 14 }} /> :
            <Text onPress={typed} style={[styles.go, { color: t.accent }]}>Connect</Text>}
        </View>
      </Section>

      {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}
    </Screen>
  );
}

function Discovered({ current, busy, onPick }: { current: Board | null; busy: string | null; onPick: (b: Board, key: string) => void }) {
  const t = useTheme();
  const { services, isScanning, error, restart } = useZeroconf({ type: SERVICE_TYPE, protocol: 'tcp' });
  const boards = services
    .map(s => ({ host: s.ipv4.find(ip => !ip.startsWith('127.')) || s.ipv4[0] || s.host.replace(/\.$/, ''), port: s.port, name: s.name }))
    .filter(b => b.host);

  if (error) {
    const denied = String(error.code) === '-65570';
    return (
      <Row first label={denied ? 'Local Network access is off' : "Couldn't search the network"}
        help={denied ? 'Turn on Local Network for Scoreboard in your phone Settings, then try again.' : error.message}
        right={<Text onPress={restart} style={{ color: t.accent, fontWeight: '600' }}>Retry</Text>} />
    );
  }
  if (!boards.length) {
    return (
      <Row first label={isScanning ? 'Looking for scoreboards…' : 'No scoreboards found'}
        help="Older boards may not announce themselves. Scan the QR code or type the address instead."
        right={isScanning ? <ActivityIndicator /> : <Text onPress={restart} style={{ color: t.accent, fontWeight: '600' }}>Search again</Text>} />
    );
  }
  return (
    <>
      {boards.map((b, i) => {
        const key = `${b.host}:${b.port}`;
        const last = current && current.name === b.name;
        return (
          <Row key={key} first={i === 0} label={b.name} help={`${key}${last ? ' · last used' : ''}`} chevron={busy !== key}
            right={busy === key ? <ActivityIndicator /> : undefined} onPress={() => onPick(b, key)} />
        );
      })}
    </>
  );
}

class DiscoveryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <Row first label="Searching isn't available" help="Scan the QR code or type the address instead." />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 21, marginHorizontal: 32, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 17, paddingHorizontal: 16, paddingVertical: 14 },
  go: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16 },
  error: { marginHorizontal: 32, marginTop: 16, fontSize: 15, lineHeight: 20 },
});
