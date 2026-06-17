export interface BaselineProfileDraft {
  birthYear?: number;
  sex?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  occupation?: string;
  chronicDiseases?: string;
  chronicTherapy?: string;
  heightCm?: number;
  weightKg?: number;
}

export const baselineProfileDefaults: BaselineProfileDraft = {
  chronicDiseases: '',
  chronicTherapy: '',
  occupation: '',
};
