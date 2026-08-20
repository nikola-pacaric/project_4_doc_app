import type { StoolRecord, UserProfile } from '@project4/contracts';
import { stoolDraftDefaults, type StoolDraft } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createPatientNoStoolMarker,
  createPatientStool,
  getPatientStool,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { colors, sharedStyles, createThemedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { StoolFormScreen } from './StoolFormScreen';

interface PatientStoolScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
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

export function PatientStoolScreen({ entryToEdit, ...props }: PatientStoolScreenProps) {
  return (
    <PatientStoolScreenContent
      key={`${entryToEdit?.id ?? 'new'}:${entryToEdit?.occurredAt ?? ''}`}
      entryToEdit={entryToEdit}
      {...props}
    />
  );
}

function PatientStoolScreenContent({
  client,
  entryToEdit,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSaved,
  profile,
}: PatientStoolScreenProps) {
  const locale = getActiveLocale();
  const [initialDraft, setInitialDraft] = useState<StoolDraft | null>(null);
  const [occurredAt, setOccurredAt] = useState<string | undefined>(entryToEdit?.occurredAt);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStool, setSavedStool] = useState<StoolRecord | null>(null);
  const [savedNoStool, setSavedNoStool] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    if (!entryToEdit) return;

    let active = true;
    void getPatientStool(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          // Existing entry without stool details (e.g. "No stool today" note) —
          // keep entry id for update, do not treat as load failure.
          setInitialDraft({
            ...stoolDraftDefaults,
            entryId: entryToEdit.id,
            pain: false,
            mucus: false,
            blood: false,
            fattyStool: false,
            blackStool: false,
          });
          setOccurredAt(entryToEdit.occurredAt);
          return;
        }
        setInitialDraft(toDraft(record));
        setOccurredAt(record.occurredAt);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        setError(t(locale, 'stool.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, loadAttempt, locale]);

  function retryLoad() {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    setLoadAttempt((current) => current + 1);
  }

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
    const daySource = entryToEdit?.occurredAt
      ? new Date(entryToEdit.occurredAt)
      : occurredAt
        ? new Date(occurredAt)
        : new Date();
    const markerOccurredAt = Number.isNaN(daySource.getTime())
      ? `${toLocalDateInput(new Date())} ${toLocalTimeInput(new Date())}`
      : `${toLocalDateInput(daySource)} ${toLocalTimeInput(daySource)}`;

    setSaving(true);
    setError(null);
    try {
      await createPatientNoStoolMarker(client, profile.id, markerOccurredAt, {
        entryId: entryToEdit?.id,
      });
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
  if (loadFailed) {
    return (
      <View style={[sharedStyles.screen, styles.loadFailure]}>
        <StatusMessage
          message={error ?? t(locale, 'stool.loadError')}
          style={sharedStyles.error}
          tone="error"
        />
        <PrimaryButton label={t(locale, 'common.retry')} onPress={retryLoad} />
        <PrimaryButton label={t(locale, 'common.cancel')} onPress={onBack} variant="secondary" />
      </View>
    );
  }

  if (savedStool || savedNoStool) {
    return (
      <KeyboardAwareScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
            : t(locale, 'stool.bristolSelected').replace('{type}', String(savedStool?.bristolType))}
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
              setInitialDraft(null);
              setOccurredAt(undefined);
              setError(null);
              setFormVersion((current) => current + 1);
            }}
          />
          <PrimaryButton label={t(locale, 'stool.done')} onPress={onBack} variant="secondary" />
        </View>
      </KeyboardAwareScrollView>
    );
  }

  return (
    <StoolFormScreen
      busy={saving}
      error={error}
      initialDraft={initialDraft ?? undefined}
      key={formVersion}
      onBack={onBack}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onSave={save}
      onSaveNoStool={saveNoStool}
    />
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    content: {
      alignItems: 'stretch',
      flexGrow: 1,
      gap: spacing.md,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    loadingScreen: { alignItems: 'center', justifyContent: 'center' },
    loadFailure: { gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
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
  }),
);
