import type { SymptomType } from '@project4/contracts';
import {
  createSymptomDraft,
  validateSymptom,
  validateSymptoms,
  type SymptomDraft,
} from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { SymptomDetailsCard } from '../components/SymptomDetailsCard';
import { SymptomSelector } from '../components/SymptomSelector';
import { TactileFormShell, useTactileFormPalette } from '../components/TactileFormShell';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { tactileFormLayout as layout } from '../theme/tactileForm';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface SymptomFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDrafts?: SymptomDraft[];
  message?: string | null;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
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
  onCancelProfile,
  onCancelTimeline,
  onSave,
}: SymptomFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [drafts, setDrafts] = useState<SymptomDraft[]>(initialDrafts);
  const [expandedTypes, setExpandedTypes] = useState<SymptomType[]>(
    initialDrafts.flatMap((draft) => (draft.type ? [draft.type] : [])),
  );
  const [showErrors, setShowErrors] = useState(false);

  function toggleSymptom(type: SymptomType) {
    setShowErrors(false);
    const selected = drafts.some((draft) => draft.type === type);
    if (!selected && type === 'none') {
      setExpandedTypes([]);
      setDrafts([createSymptomDraft(type, currentLocalDateTime())]);
      return;
    }
    setExpandedTypes((expanded) =>
      selected
        ? expanded.filter((candidate) => candidate !== type)
        : [...expanded.filter((candidate) => candidate !== type && candidate !== 'none'), type],
    );
    setDrafts((current) =>
      selected
        ? current.filter((draft) => draft.type !== type)
        : [
            ...current.filter((draft) => draft.type !== 'none'),
            createSymptomDraft(type, currentLocalDateTime()),
          ],
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
    <TactileFormShell
      error={showErrors ? t(locale, 'symptom.requiredError') : error}
      message={message}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'symptom.subtitle')}
      title={t(locale, 'symptom.title')}
    >
      <TactileSectionCard icon="✚" palette={palette} title={t(locale, 'symptom.selectTitle')}>
        <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
          {t(locale, 'symptom.selectHelp')}
        </Text>
        <View style={{ gap: 12 }}>
          <SymptomSelector
            expanded={expandedTypes}
            onToggle={toggleSymptom}
            onToggleExpanded={toggleExpanded}
            renderDetails={(type) => {
              if (type === 'none') return null;
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
      </TactileSectionCard>
    </TactileFormShell>
  );
}
