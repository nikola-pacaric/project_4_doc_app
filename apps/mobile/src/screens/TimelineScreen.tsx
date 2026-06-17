import type { PatientEntry, UserProfile } from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createTextEntry,
  deletePatientEntry,
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

  const loadEntries = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        setEntries(await listRecentPatientEntries(client, profile.id));
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

    void listRecentPatientEntries(client, profile.id)
      .then((nextEntries) => {
        if (active) {
          setEntries(nextEntries);
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

  const header = (
    <View style={styles.headerContent}>
      <ScreenHeader
        eyebrow={profile.displayName ?? t(locale, 'role.patient')}
        title={t(locale, 'timeline.title')}
      />
      <EntryComposer busy={saving} onCreate={createEntry} />
      {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
      {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
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
