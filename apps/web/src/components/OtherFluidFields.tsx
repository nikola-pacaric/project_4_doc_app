import { isOtherFluidDraftStarted, type OtherFluidDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';

interface OtherFluidFieldsProps {
  createFluid: () => OtherFluidDraft;
  fluids: OtherFluidDraft[];
  onChange: (fluids: OtherFluidDraft[]) => void;
}

export function OtherFluidFields({ createFluid, fluids, onChange }: OtherFluidFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateFluid(index: number, update: Partial<OtherFluidDraft>) {
    onChange(
      fluids.map((fluid, fluidIndex) => (fluidIndex === index ? { ...fluid, ...update } : fluid)),
    );
  }

  function removeFluid(index: number) {
    const remainingFluids = fluids.filter((_, fluidIndex) => fluidIndex !== index);
    onChange(remainingFluids.length ? remainingFluids : [createFluid()]);
  }

  return (
    <fieldset className="full-width fluid-section">
      <legend>{t(locale, 'fluid.sectionTitle')}</legend>
      <p className="field-help">{t(locale, 'fluid.sectionHelp')}</p>
      {fluids.map((fluid, index) => (
        <div className="fluid-card" key={index}>
          <label>
            <span>{t(locale, 'fluid.time')}</span>
            <input
              onChange={(event) =>
                updateFluid(index, {
                  occurredAt: `${fluid.occurredAt?.slice(0, 10) ?? ''} ${event.target.value}`,
                })
              }
              required
              type="time"
              value={fluid.occurredAt?.slice(11, 16) ?? ''}
            />
          </label>
          <label>
            <span>{t(locale, 'fluid.name')}</span>
            <input
              onChange={(event) => updateFluid(index, { name: event.target.value })}
              required
              value={fluid.name ?? ''}
            />
          </label>
          {fluids.length > 1 || isOtherFluidDraftStarted(fluid) ? (
            <button className="text-button danger" onClick={() => removeFluid(index)} type="button">
              {t(locale, 'fluid.remove')}
            </button>
          ) : null}
        </div>
      ))}
      <button
        className="secondary-button add-meal-button"
        onClick={() => onChange([...fluids, createFluid()])}
        type="button"
      >
        + {t(locale, 'fluid.add')}
      </button>
    </fieldset>
  );
}
