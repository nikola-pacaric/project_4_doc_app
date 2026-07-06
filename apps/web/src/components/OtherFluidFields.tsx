import { isOtherFluidDraftStarted, type OtherFluidDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { PhotoUploader } from './PhotoUploader';
import { VoiceTextField } from './VoiceTextField';
import type { WebPreparedPhoto } from '../utils/photoHelper';

export interface ClientOtherFluidDraft extends OtherFluidDraft {
  localId?: string;
  existingPhotoUris?: string[];
  localPhoto?: WebPreparedPhoto | null;
}

interface OtherFluidFieldsProps {
  createFluid: () => ClientOtherFluidDraft;
  fluids: ClientOtherFluidDraft[];
  onChange: (fluids: ClientOtherFluidDraft[]) => void;
}

export function OtherFluidFields({ createFluid, fluids, onChange }: OtherFluidFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateFluid(index: number, update: Partial<ClientOtherFluidDraft>) {
    onChange(
      fluids.map((fluid, fluidIndex) => (fluidIndex === index ? { ...fluid, ...update } : fluid)),
    );
  }

  function removeFluid(index: number) {
    const remainingFluids = fluids.filter((_, fluidIndex) => fluidIndex !== index);
    onChange(remainingFluids);
  }

  return (
    <fieldset className="structured-fieldset fluid-section">
      <legend>{t(locale, 'fluid.sectionTitle')}</legend>
      <p className="field-help">{t(locale, 'fluid.sectionHelp')}</p>
      {fluids.map((fluid, index) => (
        <div className="fluid-card" key={fluid.localId ?? fluid.entryId ?? `new-${index}`}>
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
          <VoiceTextField
            label={t(locale, 'fluid.name')}
            onChange={(val) => updateFluid(index, { name: val })}
            required
            type="text"
            value={fluid.name ?? ''}
          />

          <div style={{ marginBottom: '12px' }}>
            <span className="choice-label" style={{ display: 'block', marginBottom: '6px' }}>{t(locale, 'photo.title')}</span>
            <PhotoUploader
              existingPhotoUris={fluid.existingPhotoUris}
              localPhoto={fluid.localPhoto}
              onPhotoSelected={(photo) => updateFluid(index, { localPhoto: photo })}
            />
          </div>

          {fluids.length > 1 || isOtherFluidDraftStarted(fluid) ? (
            <button
              className="text-button danger"
              onClick={() => removeFluid(index)}
              type="button"
              style={{ marginTop: '8px' }}
            >
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
