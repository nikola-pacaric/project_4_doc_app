import {
  painDescriptions,
  painLocations,
  researchCalendarDay,
  symptomTypes,
  type PainDescription,
  type PainLocation,
  type SymptomType,
} from '@project4/contracts';
import type { SymptomDraft, SymptomIntensity } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { VoiceTextField } from './VoiceTextField';
import { StatusMessage } from './StatusMessage';

interface SymptomFieldsProps {
  drafts: SymptomDraft[];
  expanded: SymptomType[];
  invalid: SymptomType[];
  onChange: (type: SymptomType, draft: SymptomDraft) => void;
  onToggle: (type: SymptomType) => void;
  onToggleExpanded: (type: SymptomType) => void;
}

function localDateValue(value: Date): string {
  return researchCalendarDay(value);
}

export function SymptomFields({
  drafts,
  expanded,
  invalid,
  onChange,
  onToggle,
  onToggleExpanded,
}: SymptomFieldsProps) {
  const locale = getActiveLocale();
  const today = localDateValue(new Date());

  function datePart(value: string | undefined): string {
    return value?.trim().split(/[ T]/)[0] ?? '';
  }

  function timePart(value: string | undefined): string {
    return value?.trim().split(/[ T]/).at(-1) ?? '';
  }

  function details(draft: SymptomDraft) {
    if (!draft.type) return null;
    const type = draft.type;
    const update = (values: Partial<SymptomDraft>) => onChange(type, { ...draft, ...values });
    const updateDateTime = (field: 'startedAt' | 'endedAt', date?: string, time?: string) => {
      const nextDate = date ?? datePart(draft[field]);
      const nextTime = time ?? timePart(draft[field]);
      update({ [field]: `${nextDate} ${nextTime}`.trim() });
    };
    const startDate = datePart(draft.startedAt);
    const endDate = datePart(draft.endedAt) || startDate;

    return (
      <div className={`symptom-detail-card ${invalid.includes(type) ? 'invalid' : ''}`}>
        <div className="symptom-detail-heading">
          <strong>{t(locale, `symptom.type.${type}`)}</strong>
          <span>{t(locale, 'symptom.detailsRequired')}</span>
        </div>
        {type === 'other' ? (
          <VoiceTextField
            label={t(locale, 'symptom.customType')}
            onChange={(val) => update({ customType: val })}
            type="text"
            value={draft.customType ?? ''}
          />
        ) : null}
        <div className="time-field-row">
          <label>
            <span>{t(locale, 'symptom.startDate')}</span>
            <input
              max={today}
              onChange={(event) => updateDateTime('startedAt', event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label>
            <span>{t(locale, 'symptom.startTime')}</span>
            <input
              onChange={(event) => updateDateTime('startedAt', undefined, event.target.value)}
              type="time"
              value={timePart(draft.startedAt)}
            />
          </label>
        </div>
        <p className="field-help">{t(locale, 'symptom.endHelp')}</p>
        <div className="time-field-row">
          <label>
            <span>{t(locale, 'symptom.endDate')}</span>
            <input
              max={today}
              onChange={(event) => updateDateTime('endedAt', event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label>
            <span>{t(locale, 'symptom.endTime')}</span>
            <input
              onChange={(event) => updateDateTime('endedAt', endDate, event.target.value)}
              type="time"
              value={timePart(draft.endedAt)}
            />
          </label>
        </div>
        <div className="choice-field">
          <span className="choice-label">{t(locale, 'symptom.intensity')}</span>
          <div className="symptom-intensity-grid" role="radiogroup">
            {([1, 2, 3] as const).map((intensity) => (
              <button
                aria-checked={draft.intensity === intensity}
                className={draft.intensity === intensity ? 'selected' : ''}
                key={intensity}
                onClick={() => update({ intensity: intensity as SymptomIntensity })}
                role="radio"
                type="button"
              >
                <strong>{intensity}</strong>
                <span>{t(locale, `symptom.intensity${intensity}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <VoiceTextField
          label={t(locale, 'symptom.modifyingFactors')}
          onChange={(val) => update({ modifyingFactors: val })}
          placeholder={t(locale, 'symptom.modifyingFactorsPlaceholder')}
          rows={3}
          type="textarea"
          value={draft.modifyingFactors ?? ''}
        />
        <div className="choice-field">
          <span className="choice-label">{t(locale, 'symptom.sleepInterruption')}</span>
          <div className="choice-row" role="radiogroup">
            {([false, true] as const).map((answer) => (
              <button
                aria-checked={draft.wokeFromSleep === answer}
                className={draft.wokeFromSleep === answer ? 'selected' : ''}
                key={String(answer)}
                onClick={() => update({ wokeFromSleep: answer })}
                role="radio"
                type="button"
              >
                {t(locale, answer ? 'common.yes' : 'common.no')}
              </button>
            ))}
          </div>
        </div>

        {type === 'pain' ? (
          <div className="pain-detail-section">
            <strong>{t(locale, 'symptom.painTitle')}</strong>
            <label>
              <span>{t(locale, 'symptom.painLocation')}</span>
              <select
                onChange={(event) => update({ painLocation: event.target.value as PainLocation })}
                value={draft.painLocation ?? ''}
              >
                <option disabled value="">
                  {t(locale, 'symptom.selectOption')}
                </option>
                {painLocations.map((location) => (
                  <option key={location} value={location}>
                    {t(locale, `symptom.painLocation.${location}`)}
                  </option>
                ))}
              </select>
            </label>
            {draft.painLocation === 'other' ? (
              <VoiceTextField
                label={t(locale, 'symptom.painLocationCustom')}
                onChange={(val) => update({ painLocationCustom: val })}
                type="text"
                value={draft.painLocationCustom ?? ''}
              />
            ) : null}
            <div className="choice-field">
              <span className="choice-label">{t(locale, 'symptom.painRadiates')}</span>
              <div className="choice-row" role="radiogroup">
                {([false, true] as const).map((answer) => (
                  <button
                    aria-checked={draft.painRadiates === answer}
                    className={draft.painRadiates === answer ? 'selected' : ''}
                    key={String(answer)}
                    onClick={() => update({ painRadiates: answer })}
                    role="radio"
                    type="button"
                  >
                    {t(locale, answer ? 'common.yes' : 'common.no')}
                  </button>
                ))}
              </div>
            </div>
            {draft.painRadiates ? (
              <VoiceTextField
                label={t(locale, 'symptom.painRadiation')}
                onChange={(val) => update({ painRadiation: val })}
                type="text"
                value={draft.painRadiation ?? ''}
              />
            ) : null}
            <label>
              <span>{t(locale, 'symptom.painDescription')}</span>
              <select
                onChange={(event) =>
                  update({ painDescription: event.target.value as PainDescription })
                }
                value={draft.painDescription ?? ''}
              >
                <option disabled value="">
                  {t(locale, 'symptom.selectOption')}
                </option>
                {painDescriptions.map((description) => (
                  <option key={description} value={description}>
                    {t(locale, `symptom.painDescription.${description}`)}
                  </option>
                ))}
              </select>
            </label>
            {draft.painDescription === 'other' ? (
              <VoiceTextField
                label={t(locale, 'symptom.painDescriptionCustom')}
                onChange={(val) => update({ painDescriptionCustom: val })}
                rows={3}
                type="textarea"
                value={draft.painDescriptionCustom ?? ''}
              />
            ) : null}
          </div>
        ) : null}
        {invalid.includes(type) ? (
          <StatusMessage tone="error">{t(locale, 'symptom.cardError')}</StatusMessage>
        ) : null}
      </div>
    );
  }

  return (
    <div className="symptom-list">
      {symptomTypes.map((type) => {
        const draft = drafts.find((candidate) => candidate.type === type);
        const checked = Boolean(draft);
        const isExpanded = expanded.includes(type);
        const label = t(locale, `symptom.type.${type}`);
        const hasDetails = type !== 'none';
        return (
          <div className="symptom-item" key={type}>
            <div className={`symptom-option ${checked ? 'selected' : ''}`}>
              <input
                aria-label={`${t(locale, 'symptom.checkboxLabel')} ${label}`}
                checked={checked}
                onChange={() => onToggle(type)}
                type="checkbox"
              />
              <button
                aria-expanded={hasDetails && checked && isExpanded}
                disabled={!checked || !hasDetails}
                onClick={() => onToggleExpanded(type)}
                type="button"
              >
                <span>{label}</span>
                {checked && hasDetails ? (
                  <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
                ) : null}
              </button>
            </div>
            {hasDetails && draft && isExpanded ? details(draft) : null}
          </div>
        );
      })}
    </div>
  );
}
