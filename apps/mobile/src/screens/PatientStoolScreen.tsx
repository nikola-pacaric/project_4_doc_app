import type { StoolRecord, UserProfile } from '@project4/contracts';
import type { StoolDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createPatientNoStoolMarker,
  createPatientStool,
  getPatientStool,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { StoolFormScreen } from './StoolFormScreen';

interface PatientStoolScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDraft(record: StoolRecord): StoolDraft {
  return {
    entryId: record.entryId,
    bristolType: record.bristolType,
    urgencyLevel: record.urgencyLevel,
    pain: record.pain,
    mucus: record.mucus,
    blood: record.blood,
    fattyStool: record.fattyStool,
    blackStool: record.blackStool,
    notes: record.notes ?? '',
  };
}

export function PatientStoolScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: PatientStoolScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [initialDraft, setInitialDraft] = useState<StoolDraft | null>(null);
  const [occurredAt, setOccurredAt] = useState<string | undefined>(entryToEdit?.occurredAt);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStool, setSavedStool] = useState<StoolRecord | null>(null);
  const [savedNoStool, setSavedNoStool] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    if (!entryToEdit) {
      setInitialDraft(null);
      setOccurredAt(undefined);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientStool(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'stool.loadError'));
          return;
        }
        setInitialDraft(toDraft(record));
        setOccurredAt(record.occurredAt);
      })
      .catch(() => {
        if (active) setError(t(locale, 'stool.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  async function save(draft: StoolDraft) {
    setSaving(true);
    setError(null);
    try {
      const saved = await createPatientStool(client, profile.id, draft, occurredAt);
      setSavedStool(saved);
      onSaved();
    } catch {
      setError(t(locale, 'stool.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function saveNoStool() {
    const now = new Date();
    const occurredAt = `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`;
    setSaving(true);
    setError(null);
    try {
      await createPatientNoStoolMarker(client, profile.id, occurredAt);
      setSavedNoStool(true);
      onSaved();
    } catch {
      setError(t(locale, 'stool.noStoolSaveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[sharedStyles.screen, styles.loadingScreen]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (savedStool || savedNoStool) {
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
          {t(locale, savedNoStool ? 'stool.noStoolSavedTitle' : 'stool.savedTitle')}
        </Text>
        <Text selectable style={styles.entrySummary}>
          {savedNoStool
            ? t(locale, 'stool.noStoolToday')
            : t(locale, 'stool.bristolSelected').replace(
                '{type}',
                String(savedStool?.bristolType),
              )}
        </Text>
        <Text selectable style={styles.detail}>
          {t(locale, savedNoStool ? 'stool.noStoolSavedDetail' : 'stool.savedDetail')}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={t(locale, savedNoStool ? 'stool.recordBowelMovement' : 'stool.addAnother')}
            onPress={() => {
              setSavedStool(null);
              setSavedNoStool(false);
              setFormVersion((current) => current + 1);
            }}
          />
          <PrimaryButton label={t(locale, 'stool.done')} onPress={onBack} variant="secondary" />
        </View>
      </ScrollView>
    );
  }

  return (
    <StoolFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      key={formVersion}
      onBack={onBack}
      onSave={save}
      onSaveNoStool={saveNoStool}
    />
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
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
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
