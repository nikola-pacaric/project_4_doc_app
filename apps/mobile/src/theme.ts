import { lightTheme, spacing, typography } from '@project4/ui-tokens';
import { StyleSheet } from 'react-native';

export const colors = lightTheme.colors;

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.mutedText,
    fontSize: 17,
    lineHeight: 26,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: typography.controlMinHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  success: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 22,
  },
});
