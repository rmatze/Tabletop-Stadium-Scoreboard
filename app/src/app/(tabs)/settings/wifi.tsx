// Move the board to another Wi-Fi network. The board falls back to the old network if the new one fails.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Loading, Row, Screen, Section, tap } from '@/components/ui';
import { api, WifiNetwork, WifiStatus } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { useTheme } from '@/lib/theme';

export default function Wifi() {
  const t = useTheme();
  const { board } = useBoard();
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ssid, setSsid] = useState('');
  const [psk, setPsk] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (board) api.wifi(board).then(setStatus).catch(() => {});
    return () => { alive.current = false; };
  }, [board]);

  if (!board) return <Loading />;

  const scan = async () => {
    setScanning(true);
    setMsg(null);
    try {
      const r = await api.wifiScan(board);
      setNetworks(r.networks || []);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const join = async () => {
    if (!ssid) return setMsg('Pick a network first.');
    if (psk && psk.length < 8) return setMsg('Wi-Fi passwords are at least 8 characters.');
    setConnecting(true);
    setMsg(`Connecting to ${ssid}… this can take up to a minute.`);
    try {
      await api.wifiConnect(board, ssid, psk);
    } catch (e) {
      setConnecting(false);
      return setMsg((e as Error).message);
    }
    const t0 = Date.now();
    const tick = async () => {
      if (!alive.current) return;
      let w: WifiStatus | null = null;
      try { w = await api.wifi(board); setStatus(w); } catch { /* the board may have moved networks */ }
      const a = w?.attempt || {};
      if (a.state === 'connecting' && Date.now() - t0 < 150000) return setTimeout(tick, 2000);
      setConnecting(false);
      setMsg(a.state === 'ok' ? `Connected to ${a.ssid}. If that's a different network, move your phone to it too, then find the board again.`
        : a.state === 'failed' ? a.error || "Couldn't connect. The board went back to its old network."
        : 'No answer from the board. It may have switched networks: join your phone to the new Wi-Fi and find the board again.');
    };
    setTimeout(tick, 2000);
  };

  return (
    <Screen>
      <Section title="Current">
        <Row first label={status?.connected ? status.ssid || 'Connected' : 'Not connected'} help={status?.ip || undefined} />
      </Section>

      <Section title="Networks" footer="If you switch networks, your phone needs to join the new Wi-Fi too.">
        {networks === null ? (
          <Row first label={scanning ? 'Scanning…' : 'Scan to find networks'} right={scanning ? <ActivityIndicator /> :
            <Text onPress={scan} style={{ color: t.accent, fontWeight: '600' }}>Scan</Text>} />
        ) : networks.length === 0 ? (
          <Row first label="No networks found" right={<Text onPress={scan} style={{ color: t.accent, fontWeight: '600' }}>Scan again</Text>} />
        ) : networks.map((n, i) => (
          <Row key={n.ssid} first={i === 0} label={n.ssid} help={`${n.secure ? 'Secured' : 'Open'} · ${n.signal} dBm`}
            right={n.ssid === ssid ? <Text style={{ color: t.accent, fontSize: 18 }}>✓</Text> : undefined}
            onPress={() => { tap(); setSsid(n.ssid); }} />
        ))}
      </Section>

      {ssid ? (
        <Section title={`Join ${ssid}`}>
          <TextInput value={psk} onChangeText={setPsk} secureTextEntry autoCapitalize="none" autoCorrect={false}
            placeholder="Password (blank if open)" placeholderTextColor={t.muted} textContentType="password"
            style={[styles.input, { color: t.text }]} />
        </Section>
      ) : null}
      {ssid ? <View style={styles.btn}><Button title="Connect" kind="primary" busy={connecting} onPress={join} /></View> : null}

      {msg ? <Text style={[styles.msg, { color: t.muted }]}>{msg}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 17, paddingHorizontal: 16, paddingVertical: 14 },
  btn: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12 },
  msg: { marginHorizontal: 32, marginTop: 16, fontSize: 14, lineHeight: 20 },
});
