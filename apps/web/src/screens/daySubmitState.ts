interface DaySubmitDisabledInput {
  dailyCompleted: boolean;
  dailyEntryId: string | null;
  dailyReadyToSubmit: boolean;
  exerciseCompleted: boolean;
  exerciseRequired: boolean;
  foodCompleted: boolean;
  loading: boolean;
  medicationCompleted: boolean;
  medicationRequired: boolean;
  offlineMode: boolean;
  periodCompleted: boolean;
  periodRequired: boolean;
  stoolCompleted: boolean;
  submittingDay: boolean;
  symptomsCompleted: boolean;
}

export function isDaySubmitDisabled({
  dailyCompleted,
  dailyEntryId,
  dailyReadyToSubmit,
  exerciseCompleted,
  exerciseRequired,
  foodCompleted,
  loading,
  medicationCompleted,
  medicationRequired,
  offlineMode,
  periodCompleted,
  periodRequired,
  stoolCompleted,
  submittingDay,
  symptomsCompleted,
}: DaySubmitDisabledInput): boolean {
  return (
    loading ||
    submittingDay ||
    offlineMode ||
    dailyCompleted ||
    !dailyEntryId ||
    !dailyReadyToSubmit ||
    !foodCompleted ||
    !symptomsCompleted ||
    !stoolCompleted ||
    (exerciseRequired && !exerciseCompleted) ||
    (medicationRequired && !medicationCompleted) ||
    (periodRequired && !periodCompleted)
  );
}
