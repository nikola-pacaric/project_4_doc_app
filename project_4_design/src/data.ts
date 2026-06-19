/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientEntry, PatientProfile, InviteCode } from './types';

export const initialPatientProfile: PatientProfile = {
  fullName: "Ana Vuković",
  email: "ana.vukovic@example.com",
  birthYear: "1985",
  gender: "Female",
  occupation: "Teacher",
  weight: "68",
  height: "166",
  recentWeightChange: "No",
  profileCompleted: true
};

export const initialEntries: PatientEntry[] = [
  {
    type: 'meal',
    data: {
      id: 'log-1',
      type: 'Breakfast',
      name: 'Breakfast',
      time: '09:30',
      description: 'Oatmeal with berries and almond milk',
      status: 'synced',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'symptom',
    data: {
      id: 'log-2',
      symptoms: ['Bloating'],
      startDate: '2025-05-07',
      startTime: '11:15',
      isOngoing: true,
      painDetails: {
        intensity: '1',
        description: 'Abdominal bloating was mild after morning meal.',
        affectsDaily: 'A little'
      },
      status: 'pending',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'medication',
    data: {
      id: 'log-3',
      name: 'Vitamin D 1000 IU',
      dose: '1 tablet (1000 IU)',
      time: '12:30',
      reason: 'Chronic therapy supplement',
      isChronic: true,
      status: 'synced',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'stool',
    data: {
      id: 'log-4',
      bristolType: 4,
      urgency: 'Mild',
      painCramping: false,
      mucusInStool: false,
      bloodInStool: false,
      fattyOilyStool: false,
      blackTarryStool: false,
      notes: 'Bristol Type 4, clear stool.',
      status: 'pending',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'exercise',
    data: {
      id: 'log-5',
      activityType: 'Walking',
      durationMinutes: 30,
      intensity: 'Light',
      notes: 'Walk, 30 min. Fresh air.',
      status: 'synced',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'note',
    data: {
      id: 'log-6',
      noteType: 'General note',
      title: 'Felt good post-walk',
      content: 'Felt good after the walk. Evening is relaxing.',
      status: 'synced',
      timestamp: '2025-05-07'
    }
  },
  {
    type: 'meal',
    data: {
      id: 'log-7',
      type: 'Lunch',
      name: 'Grilled chicken salad',
      time: '13:45',
      description: 'Grilled chicken, lettuce, cucumbers, cherry tomatoes, olive oil.',
      status: 'synced',
      timestamp: '2025-05-06'
    }
  },
  {
    type: 'symptom',
    data: {
      id: 'log-8',
      symptoms: ['Pain'],
      startDate: '2025-05-06',
      startTime: '15:10',
      isOngoing: false,
      painDetails: {
        intensity: '2',
        description: 'Throbbing pain on the right side.',
        affectsDaily: 'Moderately'
      },
      status: 'synced',
      timestamp: '2025-05-06'
    }
  }
];

export const initialInviteCodes: InviteCode[] = [
  {
    code: "X7Q2-M9RL-B4N5",
    created: "2025-05-07",
    expires: "2025-05-14",
    status: "Unused"
  },
  {
    code: "K3PW-BDTA-G1J2",
    created: "2025-05-05",
    expires: "2025-05-12",
    status: "Redeemed",
    patientName: "Ana Vuković"
  },
  {
    code: "B6HY-2QNM-Z9F7",
    created: "2025-04-30",
    expires: "2025-05-07",
    status: "Expired"
  },
  {
    code: "L9RT-4VFP-P6D8",
    created: "2025-04-28",
    expires: "2025-05-05",
    status: "Revoked"
  }
];

export const mockPatients = [
  {
    id: "P-001",
    name: "Ana Vuković",
    email: "ana.vukovic@example.com",
    gender: "Female",
    age: 39,
    joined: "May 3, 2025",
    lastEntry: "Today, 19:10",
    status: "Active",
    entriesCount: 12
  },
  {
    id: "P-002",
    name: "Marko Petrović",
    email: "marko.petrovic@example.com",
    gender: "Male",
    age: 44,
    joined: "Apr 28, 2025",
    lastEntry: "Yesterday, 18:42",
    status: "Active",
    entriesCount: 8
  },
  {
    id: "P-003",
    name: "Jelena Mikić",
    email: "jelena.mikic@example.com",
    gender: "Female",
    age: 31,
    joined: "Apr 20, 2025",
    lastEntry: "May 5, 2025",
    status: "Active",
    entriesCount: 15
  },
  {
    id: "P-004",
    name: "Nikola Đorđević",
    email: "nikola.djordjevic@example.com",
    gender: "Male",
    age: 50,
    joined: "Apr 15, 2025",
    lastEntry: "Yesterday, 14:15",
    status: "Inactive",
    entriesCount: 4
  },
  {
    id: "P-005",
    name: "Marija Ilić",
    email: "marija.ilic@example.com",
    gender: "Female",
    age: 27,
    joined: "Apr 10, 2025",
    lastEntry: "Apr 30, 2025",
    status: "Inactive",
    entriesCount: 10
  }
];
