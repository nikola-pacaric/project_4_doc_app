import {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { spacing } from '@project4/ui-tokens';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';
import { toLocalTimeInput } from '../utils/dateTime';

interface TimePickerFieldProps {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  value?: string;
  valueStyle?: StyleProp<TextStyle>;
}

function toTimeDate(value: string | undefined): Date {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  const date = new Date();
  if (!match) return date;

  const [, hour = '', minute = ''] = match;
  date.setHours(Number(hour), Number(minute), 0, 0);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function TimePickerField({
  label,
  labelStyle,
  onChange,
  placeholder,
  style,
  value,
  valueStyle,
}: TimePickerFieldProps) {
  const displayValue = value?.trim() || placeholder || '';

  function selectTime(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'set' && selectedDate) {
      onChange(toLocalTimeInput(selectedDate));
    }
  }

  function openClock() {
    DateTimePickerAndroid.open({
      display: 'clock',
      is24Hour: true,
      mode: 'time',
      onChange: selectTime,
      value: toTimeDate(value),
    });
  }

  return (
    <View style={styles.field}>
      <Text style={[sharedStyles.fieldLabel, labelStyle]}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityRole="button"
        onPress={openClock}
        style={({ pressed }) => [styles.control, style, pressed && styles.pressed]}
      >
        <Text style={[styles.value, !value && styles.placeholder, valueStyle]}>{displayValue}</Text>
        <Text accessible={false} style={styles.icon}>
          ◷
        </Text>
      </Pressable>
    </View>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
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
    placeholder: { color: colors.mutedText },
    icon: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  }),
);
