import { getActiveLocale, t } from '@project4/i18n';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { type PatientBottomNavPalette } from './PatientBottomNav';

export type DoctorNavTab = 'dashboard' | 'patients' | 'invite' | 'settings';

interface DoctorBottomNavProps {
  active: DoctorNavTab;
  onDashboard: () => void;
  onGenerateCode: () => void;
  onPatients: () => void;
  onSettings: () => void;
  palette: PatientBottomNavPalette;
}

const tabs: Array<{
  id: DoctorNavTab;
  icon: string;
  labelKey:
    | 'doctor.nav.dashboard'
    | 'doctor.nav.patientsExports'
    | 'doctor.nav.generateCode'
    | 'settings.title';
}> = [
  { id: 'dashboard', icon: '⌂', labelKey: 'doctor.nav.dashboard' },
  { id: 'patients', icon: '👥', labelKey: 'doctor.nav.patientsExports' },
  { id: 'invite', icon: '＋', labelKey: 'doctor.nav.generateCode' },
  { id: 'settings', icon: '⚙', labelKey: 'settings.title' },
];

export function DoctorBottomNav({
  active,
  onDashboard,
  onGenerateCode,
  onPatients,
  onSettings,
  palette,
}: DoctorBottomNavProps) {
  const locale = getActiveLocale();

  function handlePress(tab: DoctorNavTab) {
    if (tab === active) return;
    if (tab === 'dashboard') onDashboard();
    else if (tab === 'patients') onPatients();
    else if (tab === 'invite') onGenerateCode();
    else onSettings();
  }

  return (
    <View
      style={[styles.bar, { backgroundColor: palette.background, shadowColor: palette.shadow }]}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const color = selected ? palette.onPrimaryContainer : palette.onSurfaceVariant;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={tab.id}
            onPress={() => handlePress(tab.id)}
            style={({ pressed }) => [
              styles.item,
              selected && [styles.itemActive, { backgroundColor: palette.primaryContainer }],
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.icon, { color }]}>{tab.icon}</Text>
            <Text numberOfLines={2} style={[styles.label, { color }]}>
              {t(locale, tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    elevation: 12,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-around',
    left: 0,
    paddingBottom: Platform.OS === 'android' ? 14 : 20,
    paddingHorizontal: 8,
    paddingTop: 14,
    position: 'absolute',
    right: 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  item: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  itemActive: { flex: 1.12 },
  icon: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
