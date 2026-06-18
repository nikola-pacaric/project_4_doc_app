export const symptomTypes = [
  'bloating',
  'pain',
  'gas',
  'stomach_burning',
  'heartburn',
  'regurgitation',
  'early_satiety',
  'belching',
  'nausea',
  'vomiting',
  'blood_present',
  'stomach_heaviness',
  'difficulty_swallowing',
  'painful_swallowing',
  'false_urge_to_defecate',
  'other',
] as const;

export const painLocations = [
  'upper_abdomen',
  'lower_abdomen',
  'left_abdomen',
  'right_abdomen',
  'whole_abdomen',
  'chest',
  'throat',
  'other',
] as const;

export const painDescriptions = [
  'cramping',
  'burning',
  'sharp',
  'dull',
  'pressure',
  'stabbing',
  'throbbing',
  'other',
] as const;

export type SymptomType = (typeof symptomTypes)[number];
export type SymptomIntensity = 1 | 2 | 3;
export type PainLocation = (typeof painLocations)[number];
export type PainDescription = (typeof painDescriptions)[number];

export interface SymptomRecord {
  entryId: string;
  occurredAt: string;
  type: SymptomType;
  customType: string | null;
  startedAt: string;
  endedAt: string | null;
  intensity: SymptomIntensity;
  modifyingFactors: string | null;
  wokeFromSleep: boolean;
  painLocation: PainLocation | null;
  painLocationCustom: string | null;
  painRadiates: boolean | null;
  painRadiation: string | null;
  painDescription: PainDescription | null;
  painDescriptionCustom: string | null;
}
