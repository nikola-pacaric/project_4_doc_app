import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { spacing } from '@project4/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';
import { toLocalMonthInput } from '../utils/dateTime';

interface MonthPickerFieldProps {
  label: string;
  maximumDate?: Date;
  onChange: (value: string) => void;
  value: string;
}

function toMonthDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return new Date();

  const [, year = '', month = ''] = match;
  const parsed = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function MonthPickerField({ label, maximumDate, onChange, value }: MonthPickerFieldProps) {
  function selectMonth(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'set' && selectedDate) {
      onChange(toLocalMonthInput(selectedDate));
    }
  }

  function openCalendar() {
    DateTimePickerAndroid.open({
      display: 'calendar',
      maximumDate,
      mode: 'date',
      onChange: selectMonth,
      value: toMonthDate(value),
    });
  }

  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        onPress={openCalendar}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <Text style={styles.value}>{value}</Text>
        <Text accessible={false} style={styles.icon}>
          📅
        </Text>
      </Pressable>
    </View>
  );
}

const styles = createThemedStyles(() => StyleSheet.create({
  field: { gap: spacing.xs },
  control: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.72 },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
  icon: { fontSize: 20 },
}));
