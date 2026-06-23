import {
  filterPatientTimelineEntries,
  type PatientEntry,
  type UserProfile,
} from '@project4/contracts';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  listRecentPatientEntries,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useState } from 'react';
import { localDayRange, toLocalDateInput } from '../utils/dateTime';
import { BaselineScreen } from './BaselineScreen';
import { DailyProgressHomeScreen } from './DailyProgressHomeScreen';
import { DailyFormScreen } from './DailyFormScreen';
import { FoodFormScreen } from './FoodFormScreen';
import { PatientExerciseScreen } from './PatientExerciseScreen';
import { PatientMedicationScreen } from './PatientMedicationScreen';
import { PatientMenstruationScreen } from './PatientMenstruationScreen';
import { PatientNoteScreen } from './PatientNoteScreen';
import { PatientSymptomsScreen } from './PatientSymptomsScreen';
import { PatientStoolScreen } from './PatientStoolScreen';

interface PatientHomeScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onSignOut: () => Promise<void>;
}

function hasTodayEntry(entries: PatientEntry[], kind: PatientEntry['kind']): boolean {
  const today = toLocalDateInput(new Date());
  return entries.some(
    (entry) => entry.kind === kind && toLocalDateInput(new Date(entry.occurredAt)) === today,
  );
}

export function PatientHomeScreen({ client, profile, onSignOut }: PatientHomeScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [symptomsCompleted, setSymptomsCompleted] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseRequired, setExerciseRequired] = useState(false);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [medicationRequired, setMedicationRequired] = useState(false);
  const [medicationCompleted, setMedicationCompleted] = useState(false);
  const [periodRequired, setPeriodRequired] = useState(false);
  const [periodCompleted, setPeriodCompleted] = useState(false);
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);

  const handleActivityAnswerChange = useCallback((answer: boolean | undefined) => {
    setExerciseRequired(answer === true);
  }, []);

  const handleMedicationAnswerChange = useCallback((answer: boolean | undefined) => {
    setMedicationRequired(answer === true);
  }, []);

  const handleMenstruationAnswerChange = useCallback((answer: boolean | undefined) => {
    setPeriodRequired(answer === true);
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const range = localDayRange(toLocalDateInput(new Date()));
      const [nextEntries, baseline, dailyForm] = await Promise.all([
        listRecentPatientEntries(client, profile.id),
        getPatientBaseline(client, profile.id),
        getPatientDailyForm(client, profile.id, range.start, range.end),
      ]);
      setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
      setDailyCompleted(Boolean(dailyForm));
      setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
      setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
      setPeriodRequired(dailyForm?.details.hadMenstruation === true);
      setSymptomsCompleted(hasTodayEntry(nextEntries, 'symptom'));
      setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
      setMedicationCompleted(hasTodayEntry(nextEntries, 'medication'));
      setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
      setCanTrackMenstruation(baseline?.sex === 'female');
    } catch {
      setError(t(locale, 'entry.loadError'));
    } finally {
      setLoading(false);
    }
  }, [client, locale, profile.id]);

  useEffect(() => {
    let active = true;
    const range = localDayRange(toLocalDateInput(new Date()));

    void Promise.all([
      listRecentPatientEntries(client, profile.id),
      getPatientBaseline(client, profile.id),
      getPatientDailyForm(client, profile.id, range.start, range.end),
    ])
      .then(([nextEntries, baseline, dailyForm]) => {
        if (active) {
          setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
          setDailyCompleted(Boolean(dailyForm));
          setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
          setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
          setPeriodRequired(dailyForm?.details.hadMenstruation === true);
          setSymptomsCompleted(hasTodayEntry(nextEntries, 'symptom'));
          setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
          setMedicationCompleted(hasTodayEntry(nextEntries, 'medication'));
          setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
          setCanTrackMenstruation(baseline?.sex === 'female');
        }
      })
      .catch(() => {
        if (active) {
          setError(t(locale, 'entry.loadError'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

  if (showBaseline) {
    return (
      <BaselineScreen
        client={client}
        onBack={() => {
          setShowBaseline(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showDailyForm) {
    return (
      <DailyFormScreen
        client={client}
        onActivityAnswerChange={handleActivityAnswerChange}
        onMenstruationAnswerChange={handleMenstruationAnswerChange}
        onMedicationAnswerChange={handleMedicationAnswerChange}
        onBack={() => {
          setShowDailyForm(false);
          void loadEntries();
        }}
        onSaved={() => {
          setShowDailyForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showFoodForm) {
    return (
      <FoodFormScreen
        client={client}
        onBack={() => setShowFoodForm(false)}
        onSaved={() => {
          setShowFoodForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showSymptomForm) {
    return (
      <PatientSymptomsScreen
        client={client}
        onBack={() => {
          setShowSymptomForm(false);
        }}
        onSaved={() => {
          setSymptomsCompleted(true);
          setShowSymptomForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showStoolForm) {
    return (
      <PatientStoolScreen
        client={client}
        onBack={() => setShowStoolForm(false)}
        onSaved={() => {
          setShowStoolForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMedicationForm) {
    return (
      <PatientMedicationScreen
        client={client}
        onBack={() => setShowMedicationForm(false)}
        onSaved={() => {
          setMedicationCompleted(true);
          setShowMedicationForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showExerciseForm) {
    return (
      <PatientExerciseScreen
        client={client}
        onBack={() => setShowExerciseForm(false)}
        onSaved={() => {
          setExerciseCompleted(true);
          setShowExerciseForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMenstruationForm && canTrackMenstruation) {
    return (
      <PatientMenstruationScreen
        client={client}
        onBack={() => setShowMenstruationForm(false)}
        onSaved={() => {
          setPeriodCompleted(true);
          setShowMenstruationForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showNoteForm) {
    return (
      <PatientNoteScreen
        client={client}
        onBack={() => setShowNoteForm(false)}
        onSaved={() => {
          setShowNoteForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  return (
    <DailyProgressHomeScreen
      canTrackMenstruation={canTrackMenstruation}
      dailyCompleted={dailyCompleted}
      error={error}
      exerciseCompleted={exerciseCompleted}
      exerciseRequired={exerciseRequired}
      loading={loading}
      medicationCompleted={medicationCompleted}
      medicationRequired={medicationRequired}
      periodCompleted={periodCompleted}
      periodRequired={periodRequired}
      onOpenBaseline={() => setShowBaseline(true)}
      onOpenDaily={() => setShowDailyForm(true)}
      onOpenExercise={() => setShowExerciseForm(true)}
      onOpenFood={() => setShowFoodForm(true)}
      onOpenMedication={() => setShowMedicationForm(true)}
      onOpenNotes={() => setShowNoteForm(true)}
      onOpenPeriod={() => setShowMenstruationForm(true)}
      onOpenStool={() => setShowStoolForm(true)}
      onOpenSymptoms={() => setShowSymptomForm(true)}
      onSignOut={onSignOut}
      profile={profile}
      recentEntries={entries}
      symptomsCompleted={symptomsCompleted}
    />
  );
}
