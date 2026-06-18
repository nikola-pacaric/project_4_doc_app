import {
  painDescriptions,
  painLocations,
  symptomTypes,
  type PainDescription,
  type PainLocation,
  type SymptomType,
} from '@project4/contracts';
import type { SymptomDraft, SymptomIntensity } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';

interface SymptomFieldsProps {
  drafts: SymptomDraft[];
  expanded: SymptomType[];
  invalid: SymptomType[];
  onChange: (type: SymptomType, draft: SymptomDraft) => void;
  onToggle: (type: SymptomType) => void;
  onToggleExpanded: (type: SymptomType) => void;
}

export function SymptomFields({
  drafts,
  expanded,
  invalid,
  onChange,
  onToggle,
  onToggleExpanded,
}: SymptomFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function details(draft: SymptomDraft) {
    if (!draft.type) return null;
    const type = draft.type;
    const update = (values: Partial<SymptomDraft>) => onChange(type, { ...draft, ...values });

    return (
      <div className={`symptom-detail-card ${invalid.includes(type) ? 'invalid' : ''}`}>
        <div className="symptom-detail-heading">
          <strong>{t(locale, `symptom.type.${type}`)}</strong>
          <span>{t(locale, 'symptom.detailsRequired')}</span>
        </div>
        {type === 'other' ? (
          <label>
            <span>{t(locale, 'symptom.customType')}</span>
            <input
              onChange={(event) => update({ customType: event.target.value })}
              value={draft.customType ?? ''}
            />
          </label>
        ) : null}
        <div className="time-field-row">
          <label>
            <span>{t(locale, 'symptom.startDateTime')}</span>
            <input
              onChange={(event) => update({ startedAt: event.target.value })}
              type="datetime-local"
              value={draft.startedAt ?? ''}
            />
          </label>
          <label>
            <span>{t(locale, 'symptom.endDateTime')}</span>
            <input
              onChange={(event) => update({ endedAt: event.target.value })}
              type="datetime-local"
              value={draft.endedAt ?? ''}
            />
          </label>
        </div>
        <p className="field-help">{t(locale, 'symptom.endHelp')}</p>
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
        <label>
          <span>{t(locale, 'symptom.modifyingFactors')}</span>
          <textarea
            onChange={(event) => update({ modifyingFactors: event.target.value })}
            placeholder={t(locale, 'symptom.modifyingFactorsPlaceholder')}
            rows={3}
            value={draft.modifyingFactors ?? ''}
          />
        </label>
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
              <label>
                <span>{t(locale, 'symptom.painLocationCustom')}</span>
                <input
                  onChange={(event) => update({ painLocationCustom: event.target.value })}
                  value={draft.painLocationCustom ?? ''}
                />
              </label>
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
              <label>
                <span>{t(locale, 'symptom.painRadiation')}</span>
                <input
                  onChange={(event) => update({ painRadiation: event.target.value })}
                  value={draft.painRadiation ?? ''}
                />
              </label>
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
              <label>
                <span>{t(locale, 'symptom.painDescriptionCustom')}</span>
                <textarea
                  onChange={(event) => update({ painDescriptionCustom: event.target.value })}
                  rows={3}
                  value={draft.painDescriptionCustom ?? ''}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {invalid.includes(type) ? (
          <p className="notice error">{t(locale, 'symptom.cardError')}</p>
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
                aria-expanded={checked && isExpanded}
                disabled={!checked}
                onClick={() => onToggleExpanded(type)}
                type="button"
              >
                <span>{label}</span>
                {checked ? <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span> : null}
              </button>
            </div>
            {draft && isExpanded ? details(draft) : null}
          </div>
        );
      })}
    </div>
  );
}
