import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ eyebrow, title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 17,
    lineHeight: 26,
  },
});
