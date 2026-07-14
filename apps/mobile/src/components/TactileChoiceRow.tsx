import { Pressable, Text, View } from 'react-native';

import {
  tactileFormLayout as layout,
  type TactilePalette,
} from '../theme/tactileForm';

export interface TactileChoiceOption {
  value: string;
  label: string;
  detail?: string;
}

interface TactileChoiceRowProps {
  label: string;
  options: TactileChoiceOption[];
  value?: string;
  onChange: (value: string) => void;
  palette: TactilePalette;
  disabled?: boolean;
  /** horizontal chips (default) or segmented pill track for 2–3 options */
  mode?: 'chips' | 'segmented';
  vertical?: boolean;
}

/**
 * Baseline-style choice controls: soft chips or segmented yes/no pills.
 * Replaces default OptionButtons look inside tactile forms.
 */
export function TactileChoiceRow({
  label,
  options,
  value,
  onChange,
  palette,
  disabled = false,
  mode = 'chips',
  vertical = false,
}: TactileChoiceRowProps) {
  const useSegmented = mode === 'segmented' || (options.length <= 3 && !vertical && !options.some((o) => o.detail));

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: palette.primary,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={
          useSegmented && !vertical
            ? [layout.segmentedTrack, { backgroundColor: palette.surfaceContainer }]
            : [layout.optionGrid, vertical && { flexDirection: 'column' as const }]
        }
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                useSegmented && !vertical ? layout.segmentedItem : layout.optionChip,
                useSegmented && !vertical
                  ? selected && { backgroundColor: palette.primaryContainer }
                  : {
                      backgroundColor: selected
                        ? 'rgba(166, 53, 83, 0.08)'
                        : palette.surfaceContainerLow,
                      borderColor: selected ? palette.primary : 'transparent',
                    },
                disabled && layout.disabled,
                pressed && !disabled && layout.pressed,
              ]}
            >
              <Text
                style={[
                  useSegmented && !vertical ? layout.segmentedLabel : layout.optionChipLabel,
                  {
                    color: selected ? palette.onPrimaryContainer : palette.onSurfaceVariant,
                    fontWeight: selected ? '700' : '600',
                  },
                ]}
              >
                {option.label}
              </Text>
              {option.detail ? (
                <Text
                  style={{
                    color: selected ? palette.onPrimaryContainer : palette.onSurfaceVariant,
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                    opacity: 0.85,
                    textAlign: 'center',
                  }}
                >
                  {option.detail}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
