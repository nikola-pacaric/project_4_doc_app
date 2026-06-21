import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { spacing } from '@project4/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles } from '../theme';
import { toLocalDateInput } from '../utils/dateTime';

interface DatePickerFieldProps {
  label: string;
  maximumDate?: Date;
  onChange: (value: string) => void;
  value: string;
}

function toDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();

  const [, year = '', month = '', day = ''] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function DatePickerField({ label, maximumDate, onChange, value }: DatePickerFieldProps) {
  function selectDate(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'set' && selectedDate) {
      onChange(toLocalDateInput(selectedDate));
    }
  }

  function openCalendar() {
    DateTimePickerAndroid.open({
      display: 'calendar',
      maximumDate,
      mode: 'date',
      onChange: selectDate,
      value: toDate(value),
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

const styles = StyleSheet.create({
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
});
