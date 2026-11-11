// Scans the QR code the board shows (press and hold its screen). The code holds http://<ip>:<port>/settings.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Loading } from '@/components/ui';
import { parseAddress, probe } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { useTheme } from '@/lib/theme';

export default function Scan() {
  const t = useTheme();
  const { connect } = useBoard();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const handled = useRef<string | null>(null);

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={[styles.msg, { color: t.text }]}>The camera is used to read the QR code on your scoreboard.</Text>
        <View style={{ flexDirection: 'row', width: '100%' }}>
          {permission.canAskAgain
            ? <Button title="Allow camera" kind="primary" onPress={requestPermission} />
            : <Button title="Open Settings" kind="primary" onPress={() => Linking.openSettings()} />}
        </View>
      </View>
    );
  }

  const onScan = async ({ data }: { data: string }) => {
    if (checking || handled.current === data) return;
    handled.current = data;
    const a = parseAddress(data);
    if (!a || !/^https?:\/\//i.test(data.trim())) {
      setStatus("That QR code isn't from a scoreboard.");
      return;
    }
    setChecking(true);
    setStatus(`Connecting to ${a.host}…`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const b = await probe(a.host, a.port);
      await connect(b);
      router.dismissAll();
      router.replace('/board');
    } catch (e) {
      setStatus(`${(e as Error).message} Is your phone on the same Wi-Fi as the board?`);
      handled.current = null;
      setChecking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
      <View pointerEvents="none" style={styles.frameWrap}><View style={styles.frame} /></View>
      <View style={styles.caption}>
        {checking ? <ActivityIndicator color="#fff" style={{ marginBottom: 8 }} /> : null}
        <Text style={styles.captionText}>
          {status || "Press and hold the board's screen for about a second, then point your camera at the QR code."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  msg: { fontSize: 17, textAlign: 'center', lineHeight: 23 },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: '#FFD21F' },
  caption: { position: 'absolute', left: 24, right: 24, bottom: 56, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 14, borderRadius: 14 },
  captionText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 20 },
});
