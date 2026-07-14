import { darkTheme } from '@project4/ui-tokens';
import { Platform, StatusBar, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '../theme';

/**
 * Shared Tactile Bloom tokens matching Baseline form design.
 * Used by patient entry forms (Daily, Food, Symptoms, etc.).
 */
export const tactileStitch = {
  background: '#fdf8fd',
  surface: '#ffffff',
  surfaceContainer: '#f1ecf2',
  surfaceContainerLow: '#f7f2f8',
  surfaceContainerHigh: '#ebe7ec',
  secondaryContainer: '#fcdae1',
  primary: '#a63553',
  primaryContainer: '#f4718f',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#6b022a',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#564145',
  outline: '#897174',
  outlineVariant: '#dcbfc3',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  shadow: 'rgba(166, 53, 83, 0.08)',
} as const;

export type TactilePalette = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  secondaryContainer: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  errorContainer: string;
  onErrorContainer: string;
  shadow: string;
};

export function isDarkThemeActive(): boolean {
  return colors.background === darkTheme.colors.background;
}

export function getTactilePalette(): TactilePalette {
  if (!isDarkThemeActive()) return tactileStitch;

  return {
    background: colors.background,
    surface: colors.surface,
    surfaceContainer: colors.surfaceAlt,
    surfaceContainerLow: colors.surfaceAlt,
    surfaceContainerHigh: colors.surfaceAlt,
    secondaryContainer: colors.surfaceAlt,
    primary: colors.accentStrong,
    primaryContainer: colors.accent,
    onPrimary: colors.onAccent,
    onPrimaryContainer: colors.onAccent,
    onSurface: colors.text,
    onSurfaceVariant: colors.mutedText,
    outline: colors.mutedText,
    outlineVariant: colors.border,
    error: colors.danger,
    errorContainer: colors.surfaceAlt,
    onErrorContainer: colors.danger,
    shadow: '#000000',
  };
}

export function tactilePillInputStyle(palette: TactilePalette): TextStyle {
  return {
    backgroundColor: palette.surfaceContainerLow,
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 0,
    color: palette.onSurface,
  };
}

export function tactileMultilineInputStyle(palette: TactilePalette): TextStyle {
  return {
    ...tactilePillInputStyle(palette),
    borderRadius: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  };
}

export function tactileFieldLabelStyle(palette: TactilePalette): TextStyle {
  return {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  };
}

export function tactileSoftLabelStyle(palette: TactilePalette): TextStyle {
  return {
    color: palette.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  };
}

export const tactileFormLayout = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerBlock: {
    gap: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 24,
    elevation: 2,
    gap: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  } satisfies ViewStyle,
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sectionIconGlyph: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  fieldGap: {
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  action: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    elevation: 3,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  statusBanner: {
    borderRadius: 20,
    gap: 4,
    padding: 16,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
  },
  successText: {
    fontSize: 15,
    lineHeight: 22,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: '30%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentedTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentedItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  segmentedLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dashedAdd: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
