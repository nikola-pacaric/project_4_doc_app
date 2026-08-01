import { t, type Locale } from '@project4/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import {
  addLocalDays,
  parseLocalDateInput,
  startOfWeekMonday,
  toLocalDateInput,
  toDeviceCalendarDateInput,
  weekDayKeys,
} from '../utils/dateTime';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export type WeekDayStripPalette = {
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  shadow: string;
};

interface WeekDayStripProps {
  locale: Locale;
  maximumDay?: string;
  onSelectedDayChange: (day: string) => void;
  palette: WeekDayStripPalette;
  selectedDay: string;
}

function localeTag(locale: Locale): string {
  return locale === 'sr' ? 'sr-Latn' : 'en';
}

function pickDayInWeek(
  weekDays: string[],
  preferredDay: string,
  maximumDay: string,
): string {
  if (weekDays.includes(preferredDay) && preferredDay <= maximumDay) {
    return preferredDay;
  }

  const preferredWeekday = parseLocalDateInput(preferredDay).getDay();
  const sameWeekday = weekDays.find(
    (day) => day <= maximumDay && parseLocalDateInput(day).getDay() === preferredWeekday,
  );
  if (sameWeekday) return sameWeekday;

  const available = weekDays.filter((day) => day <= maximumDay);
  return available[available.length - 1] ?? weekDays[0] ?? preferredDay;
}

export function WeekDayStrip({
  locale,
  maximumDay = toLocalDateInput(new Date()),
  onSelectedDayChange,
  palette,
  selectedDay,
}: WeekDayStripProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekMonday(parseLocalDateInput(selectedDay)),
  );

  useEffect(() => {
    const selectedWeekStart = startOfWeekMonday(parseLocalDateInput(selectedDay));
    setWeekStart((current) =>
      toDeviceCalendarDateInput(selectedWeekStart) === toDeviceCalendarDateInput(current)
        ? current
        : selectedWeekStart,
    );
  }, [selectedDay]);

  const weekDays = useMemo(() => weekDayKeys(weekStart), [weekStart]);
  const maxWeekStart = useMemo(
    () => startOfWeekMonday(parseLocalDateInput(maximumDay)),
    [maximumDay],
  );
  const canGoNext = toDeviceCalendarDateInput(weekStart) < toDeviceCalendarDateInput(maxWeekStart);

  const weekLabel = useMemo(() => {
    const start = weekStart;
    const end = addLocalDays(weekStart, 6);
    const startFormatter = new Intl.DateTimeFormat(localeTag(locale), {
      day: 'numeric',
      month: 'short',
    });
    const endFormatter = new Intl.DateTimeFormat(localeTag(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${startFormatter.format(start)} – ${endFormatter.format(end)}`;
  }, [locale, weekStart]);

  const shiftWeek = useCallback(
    (deltaWeeks: number) => {
      const nextStart = addLocalDays(weekStart, deltaWeeks * 7);
      if (toDeviceCalendarDateInput(nextStart) > toDeviceCalendarDateInput(maxWeekStart)) return;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWeekStart(nextStart);
      const nextDays = weekDayKeys(nextStart);
      const nextSelected = pickDayInWeek(nextDays, selectedDay, maximumDay);
      if (nextSelected !== selectedDay) {
        onSelectedDayChange(nextSelected);
      }
    },
    [maxWeekStart, maximumDay, onSelectedDayChange, selectedDay, weekStart],
  );

  const swipeHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx <= -40) {
            shiftWeek(1);
          } else if (gesture.dx >= 40) {
            shiftWeek(-1);
          }
        },
      }).panHandlers,
    [shiftWeek],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.weekHeader}>
        <Pressable
          accessibilityLabel={t(locale, 'timeline.previousWeek')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => shiftWeek(-1)}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: palette.surfaceContainer,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.navIcon, { color: palette.onSurfaceVariant }]}>‹</Text>
        </Pressable>
        <Text style={[styles.weekLabel, { color: palette.onSurface }]}>{weekLabel}</Text>
        <Pressable
          accessibilityLabel={t(locale, 'timeline.nextWeek')}
          accessibilityRole="button"
          disabled={!canGoNext}
          hitSlop={8}
          onPress={() => shiftWeek(1)}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: palette.surfaceContainer,
            },
            pressed && styles.pressed,
            !canGoNext && styles.disabled,
          ]}
        >
          <Text style={[styles.navIcon, { color: palette.onSurfaceVariant }]}>›</Text>
        </Pressable>
      </View>

      <View {...swipeHandlers} style={styles.strip}>
        {weekDays.map((day) => {
          const date = parseLocalDateInput(day);
          const selected = day === selectedDay;
          const disabled = day > maximumDay;
          const weekday = new Intl.DateTimeFormat(localeTag(locale), {
            weekday: 'short',
          })
            .format(date)
            .replace(/\.$/, '')
            .toUpperCase()
            .slice(0, 3);
          const dayNumber = String(date.getDate());

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={day}
              onPress={() => {
                if (!disabled && day !== selectedDay) {
                  onSelectedDayChange(day);
                }
              }}
              style={({ pressed }) => [
                styles.dayChip,
                {
                  backgroundColor: selected
                    ? palette.primaryContainer
                    : palette.surfaceContainer,
                  shadowColor: palette.shadow,
                },
                selected && styles.dayChipSelected,
                disabled && styles.dayChipDisabled,
                pressed && !disabled && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.weekday,
                  {
                    color: selected ? palette.onPrimaryContainer : palette.onSurfaceVariant,
                    opacity: selected ? 0.85 : 0.7,
                  },
                  disabled && styles.textDisabled,
                ]}
              >
                {weekday}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: selected ? palette.onPrimaryContainer : palette.onSurfaceVariant,
                    fontWeight: selected ? '800' : '600',
                  },
                  disabled && styles.textDisabled,
                ]}
              >
                {dayNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  weekHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  weekLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  navIcon: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  strip: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  dayChip: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 80,
    minWidth: 48,
    paddingHorizontal: 2,
    paddingVertical: 12,
  },
  dayChipSelected: {
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  dayChipDisabled: {
    opacity: 0.38,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dayNumber: {
    fontSize: 18,
  },
  textDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.35,
  },
});
