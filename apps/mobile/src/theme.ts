import { darkTheme, lightTheme, spacing, typography } from '@project4/ui-tokens';
import { Platform, StatusBar, StyleSheet } from 'react-native';

type ThemeColors = { [Key in keyof typeof lightTheme.colors]: string };
type ThemeName = 'light' | 'dark';

let activeTheme: ThemeName = 'light';

function getThemeColors(): ThemeColors {
  return activeTheme === 'dark' ? darkTheme.colors : lightTheme.colors;
}

export function setAppTheme(theme: ThemeName): void {
  activeTheme = theme;
}

export const colors: ThemeColors = new Proxy({} as ThemeColors, {
  get(_target, property) {
    return getThemeColors()[property as keyof ThemeColors];
  },
});

export function createThemedStyles<T extends object>(factory: () => T): T {
  let renderedTheme: ThemeName | null = null;
  let renderedStyles: T | null = null;

  function stylesForActiveTheme(): T {
    if (!renderedStyles || renderedTheme !== activeTheme) {
      renderedTheme = activeTheme;
      renderedStyles = factory();
    }
    return renderedStyles;
  }

  return new Proxy({} as T, {
    get(_target, property) {
      return stylesForActiveTheme()[property as keyof T];
    },
  });
}

export const sharedStyles = createThemedStyles(() => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formScreen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + spacing.sm : 0,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  formScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
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
}));
