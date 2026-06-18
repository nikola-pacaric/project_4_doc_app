import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';

interface ConditionalTextFieldProps {
  answer: boolean | undefined;
  detailKey: TranslationKey;
  id: string;
  onAnswerChange: (answer: boolean) => void;
  onTextChange: (text: string) => void;
  questionKey: TranslationKey;
  text: string;
}

export function ConditionalTextField({
  answer,
  detailKey,
  id,
  onAnswerChange,
  onTextChange,
  questionKey,
  text,
}: ConditionalTextFieldProps) {
  const locale = DEFAULT_LOCALE;

  return (
    <div className="full-width choice-field conditional-question">
      <span className="choice-label" id={`${id}-label`}>
        {t(locale, questionKey)}
      </span>
      <div aria-labelledby={`${id}-label`} className="choice-row" role="radiogroup">
        {([true, false] as const).map((value) => (
          <button
            aria-checked={answer === value}
            className={answer === value ? 'selected' : ''}
            key={String(value)}
            onClick={() => onAnswerChange(value)}
            role="radio"
            type="button"
          >
            {t(locale, value ? 'common.yes' : 'common.no')}
          </button>
        ))}
      </div>
      {answer ? (
        <div className="conditional-field-bubble">
          <label>
            <span>{t(locale, detailKey)}</span>
            <textarea
              onChange={(event) => onTextChange(event.target.value)}
              required
              rows={3}
              value={text}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
