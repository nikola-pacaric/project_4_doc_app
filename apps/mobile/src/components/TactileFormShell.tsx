import type { ReactNode } from 'react';
import { ActivityIndicator, Keyboard, SafeAreaView, Text, View } from 'react-native';

import { FormBottomNav } from './FormBottomNav';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { StatusMessage } from './StatusMessage';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import {
  getTactilePalette,
  isDarkThemeActive,
  tactileFormLayout as layout,
  tactileStitch,
  type TactilePalette,
} from '../theme/tactileForm';
import { colors } from '../theme';

interface TactileFormShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  message?: string | null;
  /** Leave form without saving (Today). */
  onCancelToday: () => void;
  /** Leave form without saving (Timeline). Defaults to onCancelToday. */
  onCancelTimeline?: () => void;
  /** Leave form without saving (Profile). Defaults to onCancelToday. */
  onCancelProfile?: () => void;
  /** Whether the current form differs from its saved/initial snapshot. */
  hasUnsavedChanges?: boolean;
  /** Save form (pink nav Save). */
  onSave?: () => void;
  saveBusy?: boolean;
  saveDisabled?: boolean;
  /** Extra footer content above the bottom nav. */
  footer?: ReactNode;
  /** Hide bottom nav (e.g. loading-only shell). */
  hideNav?: boolean;
  /** Confirm before any unsaved form state is abandoned. */
  guardUnsavedChanges?: boolean;
}

export function useTactileFormPalette(): TactilePalette {
  return getTactilePalette();
}

/**
 * Baseline-style form chrome with form bottom nav:
 * Today / Timeline / Profile = cancel, pink Save = save.
 */
export function TactileFormShell({
  title,
  subtitle,
  children,
  loading = false,
  hasUnsavedChanges,
  error,
  message,
  onCancelToday,
  onCancelTimeline,
  onCancelProfile,
  onSave,
  saveBusy = false,
  saveDisabled = false,
  footer,
  hideNav = false,
  guardUnsavedChanges = true,
}: TactileFormShellProps) {
  const palette = getTactilePalette();
  const dark = isDarkThemeActive();

  const confirmDiscard = useDiscardGuard({
    busy: saveBusy,
    enabled: (hasUnsavedChanges ?? guardUnsavedChanges) && !loading,
    onHardwareBack: onCancelToday,
  });

  function dismissAnd(action: () => void, confirm = false) {
    Keyboard.dismiss();
    if (confirm) {
      confirmDiscard(action);
    } else {
      action();
    }
  }

  return (
    <SafeAreaView style={[layout.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[layout.content, !hideNav && { paddingBottom: 140 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
      >
        <View style={layout.headerBlock}>
          <Text style={[layout.pageTitle, { color: palette.onSurface }]}>{title}</Text>
          {subtitle ? (
            <Text style={[layout.pageSubtitle, { color: palette.onSurfaceVariant }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={palette.primary} size="large" style={{ marginTop: 24 }} />
        ) : (
          children
        )}

        {!loading && error ? (
          <StatusMessage
            message={error}
            style={[layout.errorText, { color: palette.error }]}
            tone="error"
          />
        ) : null}
        {!loading && message ? (
          <StatusMessage
            message={message}
            style={[layout.successText, { color: palette.primary }]}
            tone="success"
          />
        ) : null}

        {!loading && footer ? footer : null}
      </KeyboardAwareScrollView>

      {!hideNav && onSave ? (
        <FormBottomNav
          navigationDisabled={saveBusy}
          onProfile={() => dismissAnd(onCancelProfile ?? onCancelToday, true)}
          onSave={() => dismissAnd(onSave)}
          onTimeline={() => dismissAnd(onCancelTimeline ?? onCancelToday, true)}
          onToday={() => dismissAnd(onCancelToday, true)}
          palette={{
            background: dark ? colors.surface : 'rgba(241, 236, 242, 0.92)',
            onPrimaryContainer: dark
              ? palette.onPrimaryContainer
              : tactileStitch.onPrimaryContainer,
            onSurfaceVariant: palette.onSurfaceVariant,
            primaryContainer: dark ? palette.primaryContainer : tactileStitch.primaryContainer,
            shadow: palette.shadow,
          }}
          saveBusy={saveBusy}
          saveDisabled={saveDisabled || loading}
        />
      ) : null}
    </SafeAreaView>
  );
}
