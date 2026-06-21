import {
  filterPatientTimelineEntries,
  type PatientEntry,
  type UserProfile,
} from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createTextEntry,
  deletePatientEntry,
  getPatientBaseline,
  listRecentPatientEntries,
  updateEntryTimestamp,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EntryComposer } from '../components/EntryComposer';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TimelineEntryCard } from '../components/TimelineEntryCard';
import { colors, sharedStyles } from '../theme';
import { BaselineScreen } from './BaselineScreen';
import { DailyFormScreen } from './DailyFormScreen';
import { PatientExerciseScreen } from './PatientExerciseScreen';
import { PatientMedicationScreen } from './PatientMedicationScreen';
import { PatientMenstruationScreen } from './PatientMenstruationScreen';
import { PatientNoteScreen } from './PatientNoteScreen';
import { PatientSymptomsScreen } from './PatientSymptomsScreen';
import { PatientStoolScreen } from './PatientStoolScreen';

interface TimelineScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onSignOut: () => Promise<void>;
}

function sortEntries(entries: PatientEntry[]): PatientEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

export function TimelineScreen({ client, profile, onSignOut }: TimelineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);

  const loadEntries = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [nextEntries, baseline] = await Promise.all([
          listRecentPatientEntries(client, profile.id),
          getPatientBaseline(client, profile.id),
        ]);
        setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
        setCanTrackMenstruation(baseline?.sex === 'female');
      } catch {
        setError(t(locale, 'entry.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, locale, profile.id],
  );

  useEffect(() => {
    let active = true;

    void Promise.all([
      listRecentPatientEntries(client, profile.id),
      getPatientBaseline(client, profile.id),
    ])
      .then(([nextEntries, baseline]) => {
        if (active) {
          setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
          setCanTrackMenstruation(baseline?.sex === 'female');
        }
      })
      .catch(() => {
        if (active) {
          setError(t(locale, 'entry.loadError'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

  async function createEntry(text: string, occurredAt: string): Promise<boolean> {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const created = await createTextEntry(client, profile.id, text, occurredAt);
      setEntries((current) => sortEntries([created, ...current]));
      setMessage(t(locale, 'entry.saved'));
      return true;
    } catch {
      setError(t(locale, 'entry.saveError'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function editTimestamp(entryId: string, occurredAt: string): Promise<boolean> {
    setError(null);
    setMessage(null);

    try {
      const updated = await updateEntryTimestamp(client, entryId, occurredAt);
      setEntries((current) =>
        sortEntries(current.map((entry) => (entry.id === entryId ? updated : entry))),
      );
      setMessage(t(locale, 'entry.updated'));
      return true;
    } catch {
      setError(t(locale, 'entry.updateError'));
      return false;
    }
  }

  async function removeEntry(entryId: string) {
    setError(null);
    setMessage(null);

    try {
      await deletePatientEntry(client, entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
    } catch {
      setError(t(locale, 'entry.saveError'));
    }
  }

  if (showBaseline) {
    return (
      <BaselineScreen
        client={client}
        onBack={() => {
          setShowBaseline(false);
          setCanTrackMenstruation(false);
          setEntries((current) => filterPatientTimelineEntries(current, null));
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showDailyForm) {
    return (
      <DailyFormScreen client={client} onBack={() => setShowDailyForm(false)} profile={profile} />
    );
  }

  if (showSymptomForm) {
    return (
      <PatientSymptomsScreen
        client={client}
        onBack={() => setShowSymptomForm(false)}
        profile={profile}
      />
    );
  }

  if (showStoolForm) {
    return (
      <PatientStoolScreen
        client={client}
        onBack={() => setShowStoolForm(false)}
        onSaved={() => {
          setShowStoolForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMedicationForm) {
    return (
      <PatientMedicationScreen
        client={client}
        onBack={() => setShowMedicationForm(false)}
        onSaved={() => {
          setShowMedicationForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showExerciseForm) {
    return (
      <PatientExerciseScreen
        client={client}
        onBack={() => setShowExerciseForm(false)}
        onSaved={() => {
          setShowExerciseForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMenstruationForm && canTrackMenstruation) {
    return (
      <PatientMenstruationScreen
        client={client}
        onBack={() => setShowMenstruationForm(false)}
        onSaved={() => {
          setShowMenstruationForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showNoteForm) {
    return (
      <PatientNoteScreen
        client={client}
        onBack={() => setShowNoteForm(false)}
        onSaved={() => {
          setShowNoteForm(false);
          setMessage(t(locale, 'note.saved'));
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  const header = (
    <View style={styles.headerContent}>
      <ScreenHeader
        eyebrow={profile.displayName ?? t(locale, 'role.patient')}
        title={t(locale, 'timeline.title')}
      />
      <EntryComposer busy={saving} onCreate={createEntry} />
      {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
      {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
      <PrimaryButton
        label={t(locale, 'note.open')}
        onPress={() => setShowNoteForm(true)}
        variant="secondary"
      />
      <PrimaryButton
        label={t(locale, 'symptom.open')}
        onPress={() => setShowSymptomForm(true)}
        variant="secondary"
      />
      <PrimaryButton
        label={t(locale, 'exercise.open')}
        onPress={() => setShowExerciseForm(true)}
        variant="secondary"
      />
      {canTrackMenstruation ? (
        <PrimaryButton
          label={t(locale, 'menstruation.open')}
          onPress={() => setShowMenstruationForm(true)}
          variant="secondary"
        />
      ) : null}
      <View style={styles.headerActions}>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'stool.open')}
            onPress={() => setShowStoolForm(true)}
            variant="secondary"
          />
        </View>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'medication.open')}
            onPress={() => setShowMedicationForm(true)}
            variant="secondary"
          />
        </View>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'daily.open')}
            onPress={() => setShowDailyForm(true)}
            variant="secondary"
          />
        </View>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'baseline.open')}
            onPress={() => setShowBaseline(true)}
            variant="secondary"
          />
        </View>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'timeline.refresh')}
            onPress={() => void loadEntries(true)}
            variant="secondary"
          />
        </View>
        <View style={styles.headerAction}>
          <PrimaryButton
            label={t(locale, 'auth.signOut')}
            onPress={() => void onSignOut()}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={entries}
        keyExtractor={(entry) => entry.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <Text style={styles.empty}>{t(locale, 'entry.empty')}</Text>
          )
        }
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadEntries(true)}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <TimelineEntryCard
            entry={item}
            onDelete={removeEntry}
            onUpdateTimestamp={editTimestamp}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerContent: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerAction: {
    flex: 1,
  },
  empty: {
    color: colors.mutedText,
    fontSize: 17,
    lineHeight: 25,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});
