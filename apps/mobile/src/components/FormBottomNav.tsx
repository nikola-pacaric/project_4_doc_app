import { getActiveLocale, t } from '@project4/i18n';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PatientBottomNavPalette } from './PatientBottomNav';

interface FormBottomNavProps {
  onToday: () => void;
  navigationDisabled?: boolean;
  onTimeline: () => void;
  onProfile: () => void;
  onSave: () => void;
  palette: PatientBottomNavPalette;
  saveBusy?: boolean;
  saveDisabled?: boolean;
}

/**
 * Patient form bottom bar: Today / Timeline / Profile leave without saving (cancel),
 * pink Save commits the form. Matches PatientBottomNav sizing.
 */
export function FormBottomNav({
  navigationDisabled = false,
  onToday,
  onTimeline,
  onProfile,
  onSave,
  palette,
  saveBusy = false,
  saveDisabled = false,
}: FormBottomNavProps) {
  const locale = getActiveLocale();
  const idle = palette.onSurfaceVariant;
  const saveDisabledState = saveBusy || saveDisabled;

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
      <Pressable
        accessibilityState={{ disabled: navigationDisabled }}
        disabled={navigationDisabled}
        accessibilityHint={t(locale, 'common.cancel')}
        accessibilityRole="button"
        onPress={onToday}
        style={({ pressed }) => [
          styles.item,
          pressed && !navigationDisabled && styles.pressed,
          navigationDisabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: idle }]}>📅</Text>
        <Text style={[styles.label, { color: idle }]}>{t(locale, 'home.nav.today')}</Text>
      </Pressable>

      <Pressable
        accessibilityHint={t(locale, 'common.cancel')}
        accessibilityRole="button"
        accessibilityState={{ disabled: navigationDisabled }}
        disabled={navigationDisabled}
        onPress={onTimeline}
        style={({ pressed }) => [
          styles.item,
          pressed && !navigationDisabled && styles.pressed,
          navigationDisabled && styles.disabled,
        ]}
      >
        <Text style={[styles.icon, { color: idle }]}>☰</Text>
        <Text style={[styles.label, { color: idle }]}>{t(locale, 'home.nav.timeline')}</Text>
      </Pressable>

      <Pressable
        accessibilityHint={t(locale, 'common.cancel')}
        accessibilityRole="button"
        onPress={onProfile}
        style={({ pressed }) => [
          styles.item,
          pressed && !navigationDisabled && styles.pressed,
          navigationDisabled && styles.disabled,
        ]}
        accessibilityState={{ disabled: navigationDisabled }}
        disabled={navigationDisabled}
      >
        <Text style={[styles.icon, { color: idle }]}>👤</Text>
        <Text style={[styles.label, { color: idle }]}>{t(locale, 'home.nav.profile')}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saveDisabledState, busy: saveBusy }}
        disabled={saveDisabledState}
        onPress={onSave}
        style={({ pressed }) => [
          styles.item,
          styles.saveItem,
          { backgroundColor: palette.primaryContainer },
          pressed && !saveDisabledState && styles.pressed,
          saveDisabledState && styles.disabled,
        ]}
      >
        {saveBusy ? (
          <ActivityIndicator color={palette.onPrimaryContainer} />
        ) : (
          <>
            <Text style={[styles.icon, { color: palette.onPrimaryContainer }]}>💾</Text>
            <Text style={[styles.label, styles.saveLabel, { color: palette.onPrimaryContainer }]}>
              {t(locale, 'common.save')}
            </Text>
          </>
        )}
      </Pressable>
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
  saveItem: {
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
  saveLabel: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
