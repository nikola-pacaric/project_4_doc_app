import { symptomTypes, type SymptomType } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

interface SymptomSelectorProps {
  expanded: SymptomType[];
  onToggleExpanded: (type: SymptomType) => void;
  onToggle: (type: SymptomType) => void;
  renderDetails?: (type: SymptomType) => ReactNode;
  selected: SymptomType[];
}

export function SymptomSelector({
  expanded,
  onToggle,
  onToggleExpanded,
  renderDetails,
  selected,
}: SymptomSelectorProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <View style={styles.list}>
      {symptomTypes.map((type) => {
        const checked = selected.includes(type);
        const isExpanded = expanded.includes(type);
        const label = t(locale, `symptom.type.${type}`);

        return (
          <Fragment key={type}>
            <View style={[styles.option, checked && styles.optionSelected]}>
              <Pressable
                accessibilityLabel={`${t(locale, 'symptom.checkboxLabel')} ${label}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                hitSlop={6}
                onPress={() => onToggle(type)}
                style={styles.checkboxTarget}
              >
                <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                  {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel={`${label}: ${t(
                  locale,
                  isExpanded ? 'symptom.collapseDetails' : 'symptom.expandDetails',
                )}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !checked, expanded: checked && isExpanded }}
                disabled={!checked}
                onPress={() => onToggleExpanded(type)}
                style={styles.labelTarget}
              >
                <Text style={[styles.label, checked && styles.labelSelected]}>{label}</Text>
                {checked ? <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text> : null}
              </Pressable>
            </View>
            {checked && isExpanded ? renderDetails?.(type) : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: '#fff0f3',
  },
  checkbox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  checkboxTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  label: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  labelTarget: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  labelSelected: {
    color: colors.accent,
  },
  chevron: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
});
