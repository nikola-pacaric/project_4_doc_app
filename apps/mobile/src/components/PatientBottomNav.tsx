import { getActiveLocale, t } from '@project4/i18n';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export type PatientNavTab = 'today' | 'timeline' | 'profile' | 'settings';

export type PatientBottomNavPalette = {
  /** Bar background (glass/surface). */
  background: string;
  shadow: string;
  onSurfaceVariant: string;
  primaryContainer: string;
  onPrimaryContainer: string;
};

interface PatientBottomNavProps {
  active: PatientNavTab;
  onToday: () => void;
  onTimeline: () => void;
  onProfile: () => void;
  onSettings: () => void;
  palette: PatientBottomNavPalette;
  /** When true, Profile tab is non-interactive (e.g. offline on home). */
  profileDisabled?: boolean;
  profileDisabledHint?: string;
}

const tabs: Array<{
  id: PatientNavTab;
  icon: string;
  labelKey: 'home.nav.today' | 'home.nav.timeline' | 'home.nav.profile' | 'settings.title';
}> = [
  { id: 'today', icon: '📅', labelKey: 'home.nav.today' },
  { id: 'timeline', icon: '☰', labelKey: 'home.nav.timeline' },
  { id: 'profile', icon: '👤', labelKey: 'home.nav.profile' },
  { id: 'settings', icon: '⚙', labelKey: 'settings.title' },
];

/**
 * Shared Stitch-style patient bottom navigation.
 * One size/layout for Home, Timeline, Profile (Baseline), and Settings.
 */
export function PatientBottomNav({
  active,
  onToday,
  onTimeline,
  onProfile,
  onSettings,
  palette,
  profileDisabled = false,
  profileDisabledHint,
}: PatientBottomNavProps) {
  const locale = getActiveLocale();

  function handlePress(id: PatientNavTab) {
    if (id === active) return;
    if (id === 'today') onToday();
    else if (id === 'timeline') onTimeline();
    else if (id === 'profile') onProfile();
    else onSettings();
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: palette.background,
          shadowColor: palette.shadow,
        },
      ]}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        const disabled = tab.id === 'profile' && profileDisabled;
        const activeColor = palette.onPrimaryContainer;
        const idleColor = palette.onSurfaceVariant;

        return (
          <Pressable
            accessibilityHint={
              disabled && profileDisabledHint ? profileDisabledHint : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={tab.id}
            onPress={() => handlePress(tab.id)}
            style={({ pressed }) => [
              styles.item,
              selected && [
                styles.itemActive,
                { backgroundColor: palette.primaryContainer },
              ],
              disabled && styles.disabled,
              pressed && !disabled && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.icon,
                { color: selected ? activeColor : idleColor },
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.label,
                selected && styles.labelActive,
                { color: selected ? activeColor : idleColor },
              ]}
            >
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
    paddingHorizontal: 12,
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
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  itemActive: {
    flex: 1.15,
    paddingHorizontal: 14,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  labelActive: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.4,
  },
});
