// Grouped-list building blocks in the style of the iOS / Android system settings.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';

import { useTheme } from '@/lib/theme';

export const tap = () => { Haptics.selectionAsync().catch(() => {}); };

export function Screen({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<unknown> }) {
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? (
        <RefreshControl refreshing={refreshing} tintColor={t.muted}
          onRefresh={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }} />
      ) : undefined}>
      {children}
    </ScrollView>
  );
}

export function Section({ title, footer, children, plain }: { title?: string; footer?: string; children: ReactNode; plain?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 22, marginHorizontal: 16 }}>
      {title ? <Text style={[s.sectionTitle, { color: t.muted }]}>{title.toUpperCase()}</Text> : null}
      <View style={plain ? null : [s.card, { backgroundColor: t.card }]}>{children}</View>
      {footer ? <Text style={[s.footer, { color: t.muted }]}>{footer}</Text> : null}
    </View>
  );
}

type RowProps = {
  label: string;
  help?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  first?: boolean;
  destructive?: boolean;
  disabled?: boolean;
};
export function Row({ label, help, value, right, onPress, chevron, first, destructive, disabled }: RowProps) {
  const t = useTheme();
  const body = (
    <View style={[s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }, disabled && { opacity: 0.4 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, { color: destructive ? t.danger : t.text }]}>{label}</Text>
        {help ? <Text style={[s.help, { color: t.muted }]}>{help}</Text> : null}
      </View>
      {value !== undefined ? <Text style={[s.value, { color: t.muted }]} numberOfLines={1}>{value}</Text> : null}
      {right}
      {chevron ? <Chevron /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} disabled={disabled} android_ripple={{ color: t.line }}
      style={({ pressed }) => pressed && Platform.OS === 'ios' ? { backgroundColor: t.line } : null}>
      {body}
    </Pressable>
  );
}

export function Chevron() {
  const t = useTheme();
  return (
    <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={t.muted}
      fallback={<Text style={{ color: t.muted, fontSize: 18, marginLeft: 6 }}>›</Text>} />
  );
}

export function SwitchRow({ value, onChange, ...rest }: Omit<RowProps, 'right' | 'onPress' | 'value'> & { value: boolean; onChange: (v: boolean) => void }) {
  return <Row {...rest} right={<Switch value={value} onValueChange={v => { tap(); onChange(v); }} />} />;
}

/** A number field that saves when you finish typing, clamped like config.py does. */
export function NumberRow({ value, min, max, unit, onChange, ...rest }:
  Omit<RowProps, 'right' | 'onPress' | 'value'> & { value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  const t = useTheme();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(text));
    if (!Number.isFinite(n) || text.trim() === '') return setText(String(value));
    const v = Math.max(min, Math.min(max, n));
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <Row {...rest} right={(
      <View style={s.numWrap}>
        <TextInput value={text} onChangeText={setText} onEndEditing={commit} onSubmitEditing={commit}
          keyboardType="number-pad" returnKeyType="done" selectTextOnFocus maxLength={4}
          style={[s.num, { color: t.text, backgroundColor: t.chip, borderColor: t.line }]} />
        {unit ? <Text style={{ color: t.muted, marginLeft: 6 }}>{unit}</Text> : null}
      </View>
    )} />
  );
}

export function Button({ title, onPress, kind = 'plain', busy, disabled, small }:
  { title: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger'; busy?: boolean; disabled?: boolean; small?: boolean }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accentFill : kind === 'danger' ? t.dangerFill : t.card;
  const fg = kind === 'primary' ? t.onAccent : kind === 'danger' ? t.danger : t.text;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} disabled={disabled || busy}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, borderColor: kind === 'plain' ? t.line : bg },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function TeamChip({ abbr, logo, state, badge, onPress }:
  { abbr: string; logo: string; state: 'off' | 'on' | 'hidden'; badge?: number; onPress: () => void }) {
  const t = useTheme();
  const on = state === 'on', hid = state === 'hidden';
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button"
      accessibilityState={{ selected: on || hid }} accessibilityLabel={abbr}
      style={({ pressed }) => [s.chip, {
        backgroundColor: on ? t.chipOn : hid ? t.dangerFill : t.chip,
        borderColor: on ? t.accent : hid ? t.danger : t.line, opacity: pressed ? 0.7 : hid ? 0.8 : 1,
      }]}>
      <Image source={{ uri: logo }} style={{ width: 26, height: 26 }} contentFit="contain" transition={150} />
      <Text style={[s.chipText, { color: t.text }, hid && { textDecorationLine: 'line-through' }]}>{abbr}</Text>
      {badge ? <View style={[s.badge, { backgroundColor: t.accentFill }]}><Text style={s.badgeText}>{badge}</Text></View> : null}
    </Pressable>
  );
}

export function Banner({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={[s.banner, { backgroundColor: t.dangerFill, borderColor: t.danger }]}>
      <Text style={{ color: t.text, flex: 1 }}>{text}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={{ color: t.danger, fontWeight: '600' }}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, padding: 24 }}>
      <ActivityIndicator color={t.muted} />
      {text ? <Text style={{ color: t.muted, marginTop: 12, textAlign: 'center' }}>{text}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontSize: 13, letterSpacing: 0.4, marginLeft: 16, marginBottom: 6 },
  footer: { fontSize: 13, marginHorizontal: 16, marginTop: 6, lineHeight: 18 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, gap: 10 },
  label: { fontSize: 16 },
  help: { fontSize: 13, marginTop: 2, lineHeight: 17 },
  value: { fontSize: 16, maxWidth: '50%' },
  numWrap: { flexDirection: 'row', alignItems: 'center' },
  num: { minWidth: 64, textAlign: 'center', fontSize: 16, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, minHeight: 46 },
  btnSmall: { flex: 0, paddingVertical: 6, paddingHorizontal: 12, minHeight: 32, borderRadius: 8 },
  btnText: { fontSize: 16, fontWeight: '600' },
  chip: { flexBasis: '23%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  badge: { position: 'absolute', top: -7, right: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#111' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1 },
});
