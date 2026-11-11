// Pick one value for a setting (a checkmark list, like the system Settings app).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

import { Loading, Row, Screen, Section, tap } from '@/components/ui';
import { Settings } from '@/lib/api';
import { useBoard } from '@/lib/board';
import { findOption } from '@/lib/options';
import { useTheme } from '@/lib/theme';

export default function ChooseOption() {
  const t = useTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { settings, save } = useBoard();
  const o = findOption(String(key));
  if (!settings || !o || o.kind !== 'choice') return <Loading />;
  const current = String(settings[o.key]);

  return (
    <Screen>
      <Stack.Screen options={{ title: o.label }} />
      <Section footer={o.help}>
        {o.choices.map(([value, label], i) => (
          <Row key={value} first={i === 0} label={label}
            right={value === current ? (
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={18} tintColor={t.accent}
                fallback={<Text style={{ color: t.accent, fontSize: 18 }}>✓</Text>} />
            ) : undefined}
            onPress={() => {
              tap();
              if (value !== current) save({ [o.key]: value } as Partial<Settings>);
              router.back();
            }} />
        ))}
      </Section>
    </Screen>
  );
}
