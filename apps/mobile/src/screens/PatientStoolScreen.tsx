import type { StoolRecord, UserProfile } from '@project4/contracts';
import type { StoolDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientStool, type AppSupabaseClient } from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { StoolFormScreen } from './StoolFormScreen';

interface PatientStoolScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

export function PatientStoolScreen({ client, onBack, onSaved, profile }: PatientStoolScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStool, setSavedStool] = useState<StoolRecord | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  async function save(draft: StoolDraft) {
    setSaving(true);
    setError(null);
    try {
      const saved = await createPatientStool(client, profile.id, draft);
      setSavedStool(saved);
      onSaved();
    } catch {
      setError(t(locale, 'stool.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (savedStool) {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        style={sharedStyles.screen}
      >
        <View style={styles.successIcon}>
          <Text selectable style={styles.successIconText}>
            ✓
          </Text>
        </View>
        <Text selectable style={styles.title}>
          {t(locale, 'stool.savedTitle')}
        </Text>
        <Text selectable style={styles.entrySummary}>
          {t(locale, 'stool.bristolSelected').replace('{type}', String(savedStool.bristolType))}
        </Text>
        <Text selectable style={styles.detail}>
          {t(locale, 'stool.savedDetail')}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={t(locale, 'stool.addAnother')}
            onPress={() => {
              setSavedStool(null);
              setFormVersion((current) => current + 1);
            }}
          />
          <PrimaryButton label={t(locale, 'stool.done')} onPress={onBack} variant="secondary" />
        </View>
      </ScrollView>
    );
  }

  return (
    <StoolFormScreen busy={saving} error={error} key={formVersion} onBack={onBack} onSave={save} />
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    flexGrow: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  successIconText: { color: '#ffffff', fontSize: 38, fontWeight: '800' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  entrySummary: { color: colors.accent, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  detail: { color: colors.mutedText, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  actions: { gap: spacing.sm, paddingTop: spacing.md },
});
