import type { TranslationKey } from '@project4/i18n';

export type DoctorExportStage = 'preparing' | 'sharing';

interface DoctorExportFailureState {
  errorKey: TranslationKey;
  status: null;
}

export function doctorExportFailureState(stage: DoctorExportStage): DoctorExportFailureState {
  return {
    errorKey: stage === 'sharing' ? 'doctor.exportShareError' : 'doctor.exportError',
    status: null,
  };
}
