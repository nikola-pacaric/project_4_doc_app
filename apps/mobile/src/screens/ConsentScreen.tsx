import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';

interface ConsentScreenProps {
  displayName: string | null;
  onAccept: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function ConsentScreen({ displayName, onAccept, onSignOut }: ConsentScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToApp() {
    if (!accepted) {
      setError(t(locale, 'consent.required'));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onAccept();
    } catch {
      setError(t(locale, 'auth.unexpectedError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.scrollContent}>
        <ScreenHeader
          eyebrow={displayName ?? t(locale, 'role.patient')}
          title={t(locale, 'consent.title')}
        />
        <View style={styles.consentPanel}>
          <Text style={sharedStyles.body}>{t(locale, 'consent.body')}</Text>
          <View style={styles.switchRow}>
            <Switch
              accessibilityLabel={t(locale, 'consent.accept')}
              onValueChange={setAccepted}
              thumbColor={accepted ? colors.accent : '#fff8f8'}
              trackColor={{ false: colors.border, true: '#f6afbd' }}
              value={accepted}
            />
            <Text style={styles.switchLabel}>{t(locale, 'consent.accept')}</Text>
          </View>
          {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
          <PrimaryButton
            busy={busy}
            label={t(locale, 'common.save')}
            onPress={() => void continueToApp()}
          />
          <PrimaryButton
            label={t(locale, 'auth.signOut')}
            onPress={() => void onSignOut()}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  consentPanel: {
    gap: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.lg,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
