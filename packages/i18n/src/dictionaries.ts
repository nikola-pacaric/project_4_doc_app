export const dictionaries = {
  en: {
    'app.subtitle': 'Private daily research tracking for patients and linked doctors.',
    'auth.doctorLogin': 'Doctor login',
    'auth.patientLogin': 'Patient login',
    'auth.patientSignup': 'Patient signup',
    'phase.foundation': 'Phase 1 foundation',
    'role.doctor': 'Doctor',
    'role.patient': 'Patient',
  },
  sr: {
    'app.subtitle': 'Privatno dnevno pracenje istrazivanja za pacijente i povezane lekare.',
    'auth.doctorLogin': 'Prijava lekara',
    'auth.patientLogin': 'Prijava pacijenta',
    'auth.patientSignup': 'Registracija pacijenta',
    'phase.foundation': 'Osnova faze 1',
    'role.doctor': 'Lekar',
    'role.patient': 'Pacijent',
  },
} as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof (typeof dictionaries)['en'];
