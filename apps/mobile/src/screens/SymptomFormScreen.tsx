import type { SymptomType } from '@project4/contracts';
import {
  createSymptomDraft,
  validateSymptom,
  validateSymptoms,
  type SymptomDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SymptomDetailsCard } from '../components/SymptomDetailsCard';
import { SymptomSelector } from '../components/SymptomSelector';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface SymptomFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDrafts?: SymptomDraft[];
  message?: string | null;
  onBack: () => void;
  onSave: (drafts: SymptomDraft[]) => void | Promise<void>;
}

function currentLocalDateTime(): string {
  const now = new Date();
  return `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`;
}

export function SymptomFormScreen({
  busy = false,
  error,
  initialDrafts = [],
  message,
  onBack,
  onSave,
}: SymptomFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [drafts, setDrafts] = useState<SymptomDraft[]>(initialDrafts);
  const [expandedTypes, setExpandedTypes] = useState<SymptomType[]>(
    initialDrafts.flatMap((draft) => (draft.type ? [draft.type] : [])),
  );
  const [showErrors, setShowErrors] = useState(false);

  function toggleSymptom(type: SymptomType) {
    setShowErrors(false);
    const selected = drafts.some((draft) => draft.type === type);
    setExpandedTypes((expanded) =>
      selected
        ? expanded.filter((candidate) => candidate !== type)
        : [...expanded.filter((candidate) => candidate !== type), type],
    );
    setDrafts((current) =>
      selected
        ? current.filter((draft) => draft.type !== type)
        : [...current, createSymptomDraft(type, currentLocalDateTime())],
    );
  }

  function toggleExpanded(type: SymptomType) {
    if (!drafts.some((draft) => draft.type === type)) return;
    setExpandedTypes((current) =>
      current.includes(type)
        ? current.filter((candidate) => candidate !== type)
        : [...current, type],
    );
  }

  function updateDraft(type: SymptomType, nextDraft: SymptomDraft) {
    setDrafts((current) => current.map((draft) => (draft.type === type ? nextDraft : draft)));
  }

  function save() {
    if (!validateSymptoms(drafts)) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);
    void onSave(drafts);
  }

  const selectedTypes = drafts.flatMap((draft) => (draft.type ? [draft.type] : []));
  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'symptom.subtitle')}
          title={t(locale, 'symptom.title')}
        />

        <View style={styles.selectorSection}>
          <Text style={styles.sectionTitle}>{t(locale, 'symptom.selectTitle')}</Text>
          <Text style={styles.sectionHelp}>{t(locale, 'symptom.selectHelp')}</Text>
          <SymptomSelector
            expanded={expandedTypes}
            onToggle={toggleSymptom}
            onToggleExpanded={toggleExpanded}
            renderDetails={(type) => {
              const draft = drafts.find((candidate) => candidate.type === type);
              return draft ? (
                <SymptomDetailsCard
                  draft={draft}
                  invalid={showErrors && !validateSymptom(draft).valid}
                  onChange={(nextDraft) => updateDraft(type, nextDraft)}
                />
              ) : null;
            }}
            selected={selectedTypes}
          />
        </View>

        {showErrors ? (
          <Text style={sharedStyles.error}>{t(locale, 'symptom.requiredError')}</Text>
        ) : null}
        {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
        {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
        <View style={styles.actions}>
          <View style={styles.action}>
            <PrimaryButton
              label={t(locale, 'common.cancel')}
              onPress={onBack}
              variant="secondary"
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton busy={busy} label={t(locale, 'common.save')} onPress={save} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  selectorSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHelp: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  action: { flex: 1 },
});
