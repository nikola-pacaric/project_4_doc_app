/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, Mic, Volume2, Plus, Trash2, CheckCircle2, ChevronRight, AlertTriangle, ShieldCheck, HelpCircle, Sparkles } from 'lucide-react';
import { translations } from '../translations';
import { Language, Theme, PatientProfile, PatientEntry, MealType } from '../types';

interface FormsProps {
  lang: Language;
  theme: Theme;
  onSave: (entry: PatientEntry) => void;
  onCancel: () => void;
  profile: PatientProfile;
  onUpdateProfile: (p: PatientProfile) => void;
  formType: 'baseline' | 'daily' | 'meal' | 'symptom' | 'stool' | 'medication' | 'exercise' | 'menstruation' | 'note';
}

export function Forms({ lang, theme, onSave, onCancel, profile, onUpdateProfile, formType }: FormsProps) {
  const t = translations[lang];
  const isDark = theme === 'dark';

  // State managers
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // 1. Baseline Profile Wizard (6 steps)
  const [baselineStep, setBaselineStep] = useState(1);
  const [baselineSex, setBaselineSex] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [baselineBirthYear, setBaselineBirthYear] = useState('1985');
  const [baselineOccupation, setBaselineOccupation] = useState('Teacher');
  const [baselineWeight, setBaselineWeight] = useState('68');
  const [baselineHeight, setBaselineHeight] = useState('166');
  const [recentWeightChange, setRecentWeightChange] = useState<'Yes' | 'No'>('No');
  const [weightChangeAmount, setWeightChangeAmount] = useState('5 kg');
  const [weightChangePeriod, setWeightChangePeriod] = useState('Last 3 months');
  const [weightChangeReason, setWeightChangeReason] = useState('Diet and increased activity');

  // 2. Daily Tracking Form (8 steps)
  const [dailyStep, setDailyStep] = useState(1);
  const [hydrationCups, setHydrationCups] = useState(4);
  const [wakeTime, setWakeTime] = useState('07:20');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [sleepDurationHours, setSleepDurationHours] = useState(7);
  const [sleepDurationMin, setSleepDurationMin] = useState(15);
  const [sleepQuality, setSleepQuality] = useState<'Good' | 'Fair' | 'Poor'>('Good');
  const [activityType, setActivityType] = useState('Walking');
  const [activityMinutes, setActivityMinutes] = useState(30);
  const [activityIntensity, setActivityIntensity] = useState<'Light' | 'Moderate' | 'Vigorous'>('Moderate');
  const [includeStrength, setIncludeStrength] = useState(false);
  const [dayDescription, setDayDescription] = useState('Busy but productive');
  const [dayNotes, setDayNotes] = useState('Felt more energetic in the afternoon.');

  // 3. Meal Form (Dynamic Item log)
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [mealName, setMealName] = useState('Grilled chicken salad');
  const [mealTime, setMealTime] = useState('12:45');
  const [mealDesc, setMealDesc] = useState('Chicken, mixed greens, avocado, olive oil, tomato, lemon juice');
  const [foodItems, setFoodItems] = useState<{ id: string; name: string }[]>([
    { id: '1', name: 'Oatmeal with berries and almond milk' }
  ]);
  const [newItemText, setNewItemText] = useState('');

  // 4. Symptom Selection
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Pain']);
  const [symptomStartDate, setSymptomStartDate] = useState('2025-05-07');
  const [symptomStartTime, setSymptomStartTime] = useState('10:30');
  const [symptomOngoing, setSymptomOngoing] = useState(true);
  const [painIntensity, setPainIntensity] = useState<'1' | '2' | '3'>('2');
  const [painDescription, setPainDescription] = useState('Throbbing pain on the right side.');
  const [painAffectsDaily, setPainAffectsDaily] = useState<'Not at all' | 'A little' | 'Moderately' | 'A lot'>('Moderately');

  // 5. Stool Form
  const [bristolType, setBristolType] = useState<number>(4);
  const [stoolUrgency, setStoolUrgency] = useState<'None' | 'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [painCramping, setPainCramping] = useState(true);
  const [mucusInStool, setMucusInStool] = useState(false);
  const [bloodInStool, setBloodInStool] = useState(false);
  const [fattyOilyStool, setFattyOilyStool] = useState(false);
  const [blackTarryStool, setBlackTarryStool] = useState(false);
  const [stoolNotes, setStoolNotes] = useState('Usually like smooth soft snake.');

  // 6. Medication Form
  const [medName, setMedName] = useState('Vitamin D 1000 IU');
  const [medDose, setMedDose] = useState('1 tablet');
  const [medTime, setMedTime] = useState('12:30');
  const [medReason, setMedReason] = useState('Daily health maintenance');
  const [medIsChronic, setMedIsChronic] = useState(true);

  // 7. Exercise / Activity
  const [exType, setExType] = useState('Walking');
  const [exDuration, setExDuration] = useState(30);
  const [exIntensity, setExIntensity] = useState<'Light' | 'Moderate' | 'Vigorous'>('Light');
  const [exNotes, setExNotes] = useState('Evening walk in the park.');

  // 8. Menstruation Form
  const [mensFlow, setMensFlow] = useState<'Light' | 'Moderate' | 'Heavy'>('Moderate');
  const [mensSymptoms, setMensSymptoms] = useState<string[]>(['Cramps']);
  const [mensNotes, setMensNotes] = useState('Mild cramps. Used ibuprofen.');

  // 9. Notes, custom voice, photo workflow
  const [customNoteType, setCustomNoteType] = useState('General note');
  const [customNoteTitle, setCustomNoteTitle] = useState('Evening thoughts');
  const [customNoteContent, setCustomNoteContent] = useState('Felt a bit more tired today. Had a late dinner.');
  const [photoState, setPhotoState] = useState<'none' | 'camera_active' | 'uploading' | 'has_photo'>('none');
  const [voiceState, setVoiceState] = useState<'none' | 'permission_dialog' | 'listening' | 'has_transcript'>('none');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [transcript, setTranscript] = useState('');

  // Media workflow actions
  const triggerCamera = () => {
    setPhotoState('camera_active');
  };

  const capturePhoto = () => {
    setPhotoState('uploading');
    setTimeout(() => {
      // Mock compress and upload
      setPhotoPreview('/assets/meal_sample.jpg'); // dummy photo placeholder or abstract design
      setPhotoState('has_photo');
    }, 1500);
  };

  const removePhoto = () => {
    setPhotoState('none');
    setPhotoPreview('');
  };

  const triggerVoiceInput = () => {
    setVoiceState('permission_dialog');
  };

  const acceptVoicePermission = () => {
    setVoiceState('listening');
    setTimeout(() => {
      setTranscript(t.feltTiredVoice);
      setCustomNoteContent(t.feltTiredVoice);
      setVoiceState('has_transcript');
    }, 3000);
  };

  const stopVoiceListening = () => {
    if (voiceState === 'listening') {
      setTranscript(t.feltTiredVoice);
      setCustomNoteContent(t.feltTiredVoice);
      setVoiceState('has_transcript');
    }
  };

  const handleSave = () => {
    setErrors([]);
    setLoading(true);

    setTimeout(() => {
      const nowStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);

      let logPayload: PatientEntry;

      if (formType === 'baseline') {
        const p: PatientProfile = {
          fullName: profile.fullName || "Ana Vuković",
          email: profile.email || "ana.vukovic@example.com",
          birthYear: baselineBirthYear,
          gender: baselineSex,
          occupation: baselineOccupation,
          weight: baselineWeight,
          height: baselineHeight,
          recentWeightChange,
          weightChangeAmount: recentWeightChange === 'Yes' ? weightChangeAmount : undefined,
          weightChangePeriod: recentWeightChange === 'Yes' ? weightChangePeriod : undefined,
          weightChangeReason: recentWeightChange === 'Yes' ? weightChangeReason : undefined,
          profileCompleted: true
        };
        onUpdateProfile(p);
        setLoading(false);
        setSuccess(true);
        setTimeout(() => onCancel(), 1000);
        return;
      }

      if (formType === 'meal') {
        if (foodItems.length === 0 && !mealName) {
          setErrors([t.requiredAtLeastOneItem]);
          setLoading(false);
          return;
        }
        logPayload = {
          type: 'meal',
          data: {
            id: `log-${Date.now()}`,
            type: mealType,
            name: mealName || mealType,
            time: mealTime || timeStr,
            description: mealDesc || foodItems.map(f => f.name).join(', '),
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'daily') {
        logPayload = {
          type: 'hydration', // save main metrics
          data: {
            id: `log-${Date.now()}`,
            amountCups: hydrationCups,
            type: 'Water',
            time: wakeTime,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'symptom') {
        logPayload = {
          type: 'symptom',
          data: {
            id: `log-${Date.now()}`,
            symptoms: selectedSymptoms,
            startDate: symptomStartDate,
            startTime: symptomStartTime,
            isOngoing: symptomOngoing,
            painDetails: selectedSymptoms.includes('Pain') ? {
              intensity: painIntensity,
              description: painDescription,
              affectsDaily: painAffectsDaily
            } : undefined,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'stool') {
        logPayload = {
          type: 'stool',
          data: {
            id: `log-${Date.now()}`,
            bristolType: bristolType,
            urgency: stoolUrgency,
            painCramping: painCramping,
            mucusInStool: mucusInStool,
            bloodInStool: bloodInStool,
            fattyOilyStool: fattyOilyStool,
            blackTarryStool: blackTarryStool,
            notes: stoolNotes,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'medication') {
        logPayload = {
          type: 'medication',
          data: {
            id: `log-${Date.now()}`,
            name: medName,
            dose: medDose,
            time: medTime || timeStr,
            reason: medReason,
            isChronic: medIsChronic,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'exercise') {
        logPayload = {
          type: 'exercise',
          data: {
            id: `log-${Date.now()}`,
            activityType: exType,
            durationMinutes: exDuration,
            intensity: exIntensity,
            notes: exNotes,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else if (formType === 'menstruation') {
        logPayload = {
          type: 'menstruation',
          data: {
            id: `log-${Date.now()}`,
            flow: mensFlow,
            symptoms: mensSymptoms,
            notes: mensNotes,
            status: 'pending',
            timestamp: nowStr
          }
        };
      } else { // Note Form
        logPayload = {
          type: 'note',
          data: {
            id: `log-${Date.now()}`,
            noteType: customNoteType,
            title: customNoteTitle,
            content: customNoteContent,
            status: 'pending',
            photoUrl: photoState === 'has_photo' ? '/assets/photo_placeholder.jpg' : undefined,
            timestamp: nowStr
          }
        };
      }

      onSave(logPayload);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => onCancel(), 1000);
    }, 1000);
  };

  // Add multiple custom meal items helper
  const addFoodItemAction = () => {
    if (newItemText.trim() === '') return;
    setFoodItems([...foodItems, { id: `item-${Date.now()}`, name: newItemText }]);
    setNewItemText('');
  };

  const removeFoodItemAction = (id: string) => {
    setFoodItems(foodItems.filter(item => item.id !== id));
  };

  const handleSymptomCheckbox = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleMensSymptomCheckbox = (s: string) => {
    if (mensSymptoms.includes(s)) {
      setMensSymptoms(mensSymptoms.filter(e => e !== s));
    } else {
      setMensSymptoms([...mensSymptoms, s]);
    }
  };

  return (
    <div className={`p-4 rounded-xl shadow-lg border h-full flex flex-col justify-between ${
      isDark ? 'bg-[#172431] border-[#31465A] text-[#EEF5FB]' : 'bg-[#FFF7F5] border-[#F0DFE1] text-[#34292D]'
    }`} id="form-container">

      {/* Form Title & Top Banner */}
      <div className="flex justify-between items-center border-b pb-2 mb-4 border-dashed border-opacity-30 border-current" id="form-header">
        <h2 className="text-lg font-bold font-sans tracking-tight">
          {formType === 'baseline' ? `${t.step} ${baselineStep} ${t.of} 6: ${t.aboutYou}` :
           formType === 'daily' ? `${t.step} ${dailyStep} ${t.of} 8: ${t.dailyFormBtn}` :
           formType === 'meal' ? t.addMeal :
           formType === 'symptom' ? t.symptomBtn :
           formType === 'stool' ? t.stoolTitle :
           formType === 'medication' ? t.medicationTitle :
           formType === 'exercise' ? t.exerciseTitle :
           formType === 'menstruation' ? t.periodTitle : t.noteTitle}
        </h2>
        <button onClick={onCancel} className={`px-2 py-1 text-xs rounded hover:opacity-80 font-mono ${
          isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
        }`} id="cancel-btn">
          ❌
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 mb-4 text-sm scrollbar-thin" id="form-scrollable">
        {errors.length > 0 && (
          <div className="p-3 mb-3 bg-red-100 border border-red-300 text-red-800 rounded-lg" id="form-errors">
            <p className="font-bold">{t.validationSummary}</p>
            <ul className="list-disc pl-4 text-xs mt-1">
              {errors.map((e, idx) => <li key={idx}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* ==================== 1. BASELINE MEDICAL PROFILE ==================== */}
        {formType === 'baseline' && (
          <div className="space-y-4" id="baseline-wizard">
            {baselineStep === 1 && (
              <div className="space-y-3" id="baseline-step-1">
                <p className="text-xs text-[#8A767D]">{t.aboutYou}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.sex}</label>
                  <div className="flex gap-2">
                    {(['Female', 'Male', 'Other'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBaselineSex(s)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium ${
                          baselineSex === s
                            ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                            : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                        }`}
                      >
                        {s === 'Female' ? t.female : s === 'Male' ? t.male : t.other}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.birthYear}</label>
                  <input
                    type="number"
                    value={baselineBirthYear}
                    onChange={e => setBaselineBirthYear(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.occupation}</label>
                  <input
                    type="text"
                    value={baselineOccupation}
                    onChange={e => setBaselineOccupation(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            )}

            {baselineStep === 2 && (
              <div className="space-y-3" id="baseline-step-2">
                <p className="text-xs text-[#8A767D]">{t.bodyState}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.weight} (kg)</label>
                  <input
                    type="number"
                    value={baselineWeight}
                    onChange={e => setBaselineWeight(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.height} (cm)</label>
                  <input
                    type="number"
                    value={baselineHeight}
                    onChange={e => setBaselineHeight(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.recentWeightChangeQuestion}</label>
                  <div className="flex gap-2">
                    {(['Yes', 'No'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRecentWeightChange(opt)}
                        className={`flex-1 py-2 text-xs rounded-lg border font-medium ${
                          recentWeightChange === opt
                            ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                            : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                        }`}
                      >
                        {opt === 'Yes' ? 'Da' : 'Ne'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {baselineStep === 3 && (
              <div className="space-y-3" id="baseline-step-3">
                <p className="text-xs text-[#8A767D]">{t.howMuchChange}</p>
                {recentWeightChange === 'Yes' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.howMuchChange}</label>
                      <input
                        type="text"
                        value={weightChangeAmount}
                        onChange={e => setWeightChangeAmount(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                          isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.timePeriod}</label>
                      <select
                        value={weightChangePeriod}
                        onChange={e => setWeightChangePeriod(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg border focus:outline-none ${
                          isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="Last 3 months">{t.lastThreeMonths}</option>
                        <option value="Last 6 months">{t.lastSixMonths}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.reasonForChange}</label>
                      <select
                        value={weightChangeReason}
                        onChange={e => setWeightChangeReason(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg border focus:outline-none ${
                          isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="Diet and increased activity">{t.dietAndActivity}</option>
                        <option value="Stress/Medical condition">{t.stressOrMedical}</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500">
                    💡 Nema skorašnjih promena težine. Kliknite nastavi.
                  </div>
                )}
              </div>
            )}

            {baselineStep > 3 && (
              <div className="p-4 border border-[#3DA61] text-center text-xs space-y-2 rounded-lg" id="baseline-step-4">
                <CheckCircle2 className="w-8 h-8 text-[#3DBA61] mx-auto" />
                <p className="font-semibold text-lg text-[#3DBA61]">{t.profileSaved}</p>
                <p className="text-[#8A767D]">{t.profileSavedMsg}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. DAILY TRACKING FORM ==================== */}
        {formType === 'daily' && (
          <div className="space-y-4" id="daily-wizard">
            {dailyStep === 1 && (
              <div className="space-y-3" id="daily-step-1">
                <div className="flex items-center gap-2">
                  <volume2 className="w-4 h-4 text-[#F45B7A]" />
                  <p className="text-xs font-bold text-[#8A767D] uppercase tracking-wider">{t.hydrationSec}</p>
                </div>
                <label className="block text-xs font-semibold mb-1">{t.waterCups} (250 ml)</label>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-mono font-bold text-[#F45B7A]">{hydrationCups}</span>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={hydrationCups}
                    onChange={e => setHydrationCups(parseInt(e.target.value))}
                    className="flex-1 accent-[#F45B7A] h-2 bg-gray-200 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0 cups</span>
                  <span>1.0 L</span>
                  <span>2.0 L (Goal)</span>
                  <span>3.5 L</span>
                </div>
              </div>
            )}

            {dailyStep === 2 && (
              <div className="space-y-3" id="daily-step-2">
                <p className="text-xs font-bold text-[#8A767D] uppercase">{t.sleepSec}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.wakeTime}</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={e => setWakeTime(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">{t.sleepDuration} (Sati)</label>
                    <input
                      type="number"
                      value={sleepDurationHours}
                      onChange={e => setSleepDurationHours(parseInt(e.target.value))}
                      className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">(Minuti)</label>
                    <input
                      type="number"
                      value={sleepDurationMin}
                      onChange={e => setSleepDurationMin(parseInt(e.target.value))}
                      className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.sleepQuality}</label>
                  <div className="flex gap-2">
                    {(['Poor', 'Fair', 'Good'] as const).map(quality => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => setSleepQuality(quality)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium ${
                          sleepQuality === quality
                            ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                            : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                        }`}
                      >
                        {quality === 'Good' ? t.good : quality === 'Fair' ? t.okay : t.bad}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dailyStep === 3 && (
              <div className="space-y-3" id="daily-step-3">
                <p className="text-xs font-bold text-[#8A767D] uppercase">{t.activitySec}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.whatKindActivity}</label>
                  <input
                    type="text"
                    value={activityType}
                    onChange={e => setActivityType(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.durationMin}</label>
                  <input
                    type="number"
                    value={activityMinutes}
                    onChange={e => setActivityMinutes(parseInt(e.target.value))}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.intensity}</label>
                  <div className="flex gap-2">
                    {(['Light', 'Moderate', 'Vigorous'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setActivityIntensity(m)}
                        className={`flex-1 py-1 text-xs rounded-lg border font-medium ${
                          activityIntensity === m
                            ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                            : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                        }`}
                      >
                        {m === 'Light' ? t.light : m === 'Moderate' ? t.moderate : t.severe}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dailyStep === 4 && (
              <div className="space-y-3" id="daily-step-4">
                <p className="text-xs font-bold text-[#8A767D] uppercase">{t.reviewComplete}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.dayDescription}</label>
                  <input
                    type="text"
                    value={dayDescription}
                    onChange={e => setDayDescription(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t.anythingElseNotes}</label>
                  <textarea
                    rows={3}
                    value={dayNotes}
                    onChange={e => setDayNotes(e.target.value)}
                    className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            )}

            {dailyStep > 4 && (
              <div className="p-4 border border-[#3DA61] text-center text-xs space-y-2 rounded-lg" id="daily-step-final">
                <CheckCircle2 className="w-8 h-8 text-[#3DBA61] mx-auto" />
                <p className="font-semibold text-lg text-[#3DBA61]">{t.savedSuccessfully}</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. MEALS ADD FORM ==================== */}
        {formType === 'meal' && (
          <div className="space-y-3" id="meal-add-form">
            <div>
              <label className="block text-xs font-semibold mb-1">{t.mealType}</label>
              <select
                value={mealType}
                onChange={e => setMealType(e.target.value as MealType)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="Breakfast">{t.dailyFormBtn} / Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.mealNameOpt}</label>
              <input
                type="text"
                value={mealName}
                onChange={e => setMealName(e.target.value)}
                placeholder="Plate of food"
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.timeOfMeal}</label>
              <input
                type="time"
                value={mealTime}
                onChange={e => setMealTime(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.descriptionIngredients}</label>
              <textarea
                rows={2}
                value={mealDesc}
                onChange={e => setMealDesc(e.target.value)}
                placeholder="Feta, olive oil, spinach, etc."
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* List with dynamic deletion */}
            <div className="space-y-2 mt-4" id="meal-items-list">
              <label className="block text-xs font-semibold">{t.addFoodItem}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  placeholder="e.g. Avocado"
                  onKeyDown={e => e.key === 'Enter' && addFoodItemAction()}
                  className={`flex-1 p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                    isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={addFoodItemAction}
                  className="p-2 bg-[#F45B7A] text-white rounded-lg hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {foodItems.map(item => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${
                      isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => removeFoodItemAction(item.id)}
                      className="text-red-500 font-bold hover:text-red-700 p-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. SYMPTOM FORM ==================== */}
        {formType === 'symptom' && (
          <div className="space-y-3" id="symptom-form">
            <p className="text-xs text-[#8A767D]">{t.selectSymptomsMsg}</p>
            <div className="grid grid-cols-2 gap-2" id="symptoms-grid">
              {['Bloating', 'Pain', 'Nausea', 'Fatigue'].map(sym => (
                <label
                  key={sym}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    selectedSymptoms.includes(sym)
                      ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                      : isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(sym)}
                    onChange={() => handleSymptomCheckbox(sym)}
                    className="hidden"
                  />
                  <span className="text-xs font-semibold">
                    {sym === 'Bloating' ? t.bloating : sym === 'Pain' ? t.pain : sym === 'Nausea' ? t.nausea : t.fatigue}
                  </span>
                </label>
              ))}
            </div>

            {selectedSymptoms.includes('Pain') && (
              <div className={`p-3 mt-4 rounded-xl border ${
                isDark ? 'bg-[#1e2a38] border-[#31465A]' : 'bg-[#fff] border-[#F1E5E6]'
              }`} id="pain-symptom-details">
                <p className="text-xs font-bold text-[#F45B7A] mb-2 uppercase tracking-wide">{t.symptomDetailsPain}</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t.startDate}</label>
                    <input
                      type="date"
                      value={symptomStartDate}
                      onChange={e => setSymptomStartDate(e.target.value)}
                      className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{t.startTime}</label>
                    <input
                      type="time"
                      value={symptomStartTime}
                      onChange={e => setSymptomStartTime(e.target.value)}
                      className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Ongoing toggle with beautiful banner */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-semibold">{t.isOngoing}</span>
                    <button
                      type="button"
                      onClick={() => setSymptomOngoing(!symptomOngoing)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                        symptomOngoing ? 'bg-[#3DBA61]' : 'bg-gray-400'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        symptomOngoing ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  {symptomOngoing && (
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-800 text-[11px] flex gap-1 border border-orange-200">
                      <AlertTriangle className="w-3" />
                      <span>{t.ongoingWarning}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1">{t.urgencyLabel} (Intensity)</label>
                    <div className="flex gap-1">
                      {(['1', '2', '3'] as const).map(intensity => (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() => setPainIntensity(intensity)}
                          className={`flex-1 py-1.5 text-xs rounded-lg border font-medium ${
                            painIntensity === intensity
                              ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                              : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                          }`}
                        >
                          {intensity === '1' ? t.mild : intensity === '2' ? t.moderate : t.severe}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">{t.notesOptional}</label>
                    <input
                      type="text"
                      value={painDescription}
                      onChange={e => setPainDescription(e.target.value)}
                      className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">{t.affectsDailyQuestion}</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['Not at all', 'A little', 'Moderately', 'A lot'] as const).map(aff => (
                        <button
                          key={aff}
                          type="button"
                          onClick={() => setPainAffectsDaily(aff)}
                          className={`py-1 text-[10px] rounded-md border font-medium ${
                            painAffectsDaily === aff
                              ? 'bg-purple-600 text-white border-purple-600'
                              : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                          }`}
                        >
                          {aff === 'Not at all' ? t.notAtAll : aff === 'A little' ? t.little : aff === 'Moderately' ? t.moderately : t.alot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. STOOL FORM ==================== */}
        {formType === 'stool' && (
          <div className="space-y-3" id="stool-form">
            <p className="text-xs text-[#8A767D]">{t.bristolScale}</p>

            {/* Slider with Bristol illustration helper */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-[#1e2a38] border-gray-800' : 'bg-white border-gray-200'
            }`} id="bristol-helper">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-[#F45B7A] font-mono">{t.bristolLabel}: Type {bristolType}</span>
                <span className="text-[11px] text-gray-400">Bristol Chart</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={bristolType}
                onChange={e => setBristolType(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg accent-amber-800 cursor-pointer mb-2"
              />
              <p className="text-xs font-medium text-amber-700" id="bristol-type-desc">
                {bristolType === 1 ? t.bristolDesc1 :
                 bristolType === 2 ? t.bristolDesc2 :
                 bristolType === 3 ? t.bristolDesc3 :
                 bristolType === 4 ? t.bristolDesc4 :
                 bristolType === 5 ? t.bristolDesc5 :
                 bristolType === 6 ? t.bristolDesc6 : t.bristolDesc7}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.urgencyLabel}</label>
              <div className="grid grid-cols-4 gap-1">
                {(['None', 'Mild', 'Moderate', 'Severe'] as const).map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setStoolUrgency(u)}
                    className={`py-1.5 text-xs rounded-lg border font-medium ${
                      stoolUrgency === u
                        ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                        : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                    }`}
                  >
                    {u === 'None' ? t.none : u === 'Mild' ? t.mild : u === 'Moderate' ? t.moderate : t.severe}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes parameters */}
            <div className="space-y-2 pt-2 border-t border-dashed border-gray-300">
              <span className="text-xs font-semibold block">Symptom checkmarks</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t.painCrampingLabel, checked: painCramping, set: setPainCramping },
                  { label: t.mucusLabel, checked: mucusInStool, set: setMucusInStool },
                  { label: t.bloodLabel, checked: bloodInStool, set: setBloodInStool },
                  { label: t.fattyLabel, checked: fattyOilyStool, set: setFattyOilyStool },
                  { label: t.blackTarryLabel, checked: blackTarryStool, set: setBlackTarryStool }
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all text-xs ${
                      item.checked
                        ? 'bg-[#1e2a38] line-through text-[#F45B7A] border-[#F45B7A]'
                        : isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => item.set(!item.checked)}
                      className="rounded accent-[#F45B7A]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.notesOptional}</label>
              <input
                type="text"
                value={stoolNotes}
                onChange={e => setStoolNotes(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div className="p-2.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-[10px] flex gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t.clinicalWarning}</span>
            </div>
          </div>
        )}

        {/* ==================== 6. MEDICATIONS FORM ==================== */}
        {formType === 'medication' && (
          <div className="space-y-3" id="medication-form">
            <div>
              <label className="block text-xs font-semibold mb-1">{t.medicationName}</label>
              <input
                type="text"
                value={medName}
                onChange={e => setMedName(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.doseLabel}</label>
              <input
                type="text"
                value={medDose}
                onChange={e => setMedDose(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.timeTaken}</label>
              <input
                type="time"
                value={medTime}
                onChange={e => setMedTime(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.reasonOptional}</label>
              <input
                type="text"
                value={medReason}
                onChange={e => setMedReason(e.target.value)}
                placeholder="Diagnostic backup"
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Chronic Therapy Toggle */}
            <div className="flex items-center justify-between py-1 border-t border-dashed border-gray-300 mt-2">
              <span className="text-xs font-semibold">{t.isChronicTherapy}</span>
              <button
                type="button"
                onClick={() => setMedIsChronic(!medIsChronic)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  medIsChronic ? 'bg-purple-600' : 'bg-gray-400'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  medIsChronic ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t.chronicExplanation}</p>
          </div>
        )}

        {/* ==================== 7. EXERCISE FORM ==================== */}
        {formType === 'exercise' && (
          <div className="space-y-3" id="exercise-form">
            <div>
              <label className="block text-xs font-semibold mb-1">{t.whatKindActivity}</label>
              <input
                type="text"
                value={exType}
                onChange={e => setExType(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.durationMin}</label>
              <input
                type="number"
                value={exDuration}
                onChange={e => setExDuration(parseInt(e.target.value))}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.intensity}</label>
              <div className="flex gap-2">
                {(['Light', 'Moderate', 'Vigorous'] as const).map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setExIntensity(i)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium ${
                      exIntensity === i
                        ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                        : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                    }`}
                  >
                    {i === 'Light' ? t.light : i === 'Moderate' ? t.moderate : t.severe}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{t.notesOptional}</label>
              <input
                type="text"
                value={exNotes}
                onChange={e => setExNotes(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
        )}

        {/* ==================== 8. MENSTRUATION FORM ==================== */}
        {formType === 'menstruation' && (
          <div className="space-y-3" id="period-form">
            <div>
              <label className="block text-xs font-semibold mb-1">{t.flowLabel}</label>
              <div className="flex gap-2">
                {(['Light', 'Moderate', 'Heavy'] as const).map(fl => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => setMensFlow(fl)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium ${
                      mensFlow === fl
                        ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                        : isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300'
                    }`}
                  >
                    {fl === 'Light' ? t.light : fl === 'Moderate' ? t.okay : t.heavy}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Symptoms</label>
              <div className="grid grid-cols-2 gap-2">
                {['Cramps', 'Headache', 'Mood changes', 'Breast tenderness', 'Other'].map(s => (
                  <label
                    key={s}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs border cursor-pointer ${
                      mensSymptoms.includes(s)
                        ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                        : isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-150'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={mensSymptoms.includes(s)}
                      onChange={() => handleMensSymptomCheckbox(s)}
                      className="hidden"
                    />
                    <span>
                      {s === 'Cramps' ? t.cramps :
                       s === 'Headache' ? t.headache :
                       s === 'Mood changes' ? t.moodChanges :
                       s === 'Breast tenderness' ? t.breastTenderness : t.otherSymptom}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.notesOptional}</label>
              <input
                type="text"
                value={mensNotes}
                onChange={e => setMensNotes(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
        )}

        {/* ==================== 9. NOTE / VOICE / PHOTO WORKFLOW ==================== */}
        {formType === 'note' && (
          <div className="space-y-3" id="note-voice-photo-form">
            <div>
              <label className="block text-xs font-semibold mb-1">{t.noteTypeLabel}</label>
              <select
                value={customNoteType}
                onChange={e => setCustomNoteType(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="General note">{t.generalNote}</option>
                <option value="Symptom connection">Symptom Link</option>
                <option value="Activity logger">Activity Detail</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.noteTitleText}</label>
              <input
                type="text"
                value={customNoteTitle}
                onChange={e => setCustomNoteTitle(e.target.value)}
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t.noteContentLabel}</label>
              <textarea
                rows={3}
                value={customNoteContent}
                onChange={e => setCustomNoteContent(e.target.value)}
                placeholder="Type or use your voice below..."
                className={`w-full p-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Interactive Photo & Voice Upload Section */}
            <div className="grid grid-cols-2 gap-2 mt-4" id="media-sandbox">
              {/* Photo component */}
              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`} id="photo-box">
                <span className="text-[11px] font-bold block text-gray-400 mb-1 flex items-center gap-1">
                  <Camera className="w-3" /> {t.addPhoto}
                </span>

                {photoState === 'none' && (
                  <button
                    type="button"
                    onClick={triggerCamera}
                    className="w-full py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg hover:bg-pink-100 font-medium text-xs flex justify-center items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" /> Start Camera
                  </button>
                )}

                {photoState === 'camera_active' && (
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-gray-500 animate-pulse font-mono">Camera viewport active...</p>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold font-mono"
                    >
                      📸 CAPTURE
                    </button>
                  </div>
                )}

                {photoState === 'uploading' && (
                  <div className="text-center space-y-1">
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-[#F45B7A] animate-spin mx-auto" />
                    <p className="text-[10px] text-[#F45B7A] font-medium">{t.uploadingPhoto}</p>
                  </div>
                )}

                {photoState === 'has_photo' && (
                  <div className="space-y-1.5">
                    {/* Abstract placeholder design */}
                    <div className="h-10 bg-gradient-to-r from-teal-400 to-indigo-500 rounded flex items-center justify-center text-white text-[10px] font-mono shadow-inner tracking-widest uppercase">
                      COM-PHOTO
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="w-full py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] rounded"
                    >
                      {t.retake}
                    </button>
                  </div>
                )}
              </div>

              {/* Voice component */}
              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`} id="voice-box">
                <span className="text-[11px] font-bold block text-gray-400 mb-1 flex items-center gap-1">
                  <Mic className="w-3" /> {t.voiceInput}
                </span>

                {voiceState === 'none' && (
                  <button
                    type="button"
                    onClick={triggerVoiceInput}
                    className="w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium text-xs flex justify-center items-center gap-1"
                  >
                    <Mic className="w-3.5 h-3.5" /> Start Rec
                  </button>
                )}

                {voiceState === 'permission_dialog' && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-500 font-medium">{t.micPermissionTitle}</p>
                    <button
                      type="button"
                      onClick={acceptVoicePermission}
                      className="w-full py-1 bg-green-600 text-white rounded font-semibold text-[10px]"
                    >
                      {t.allowMic}
                    </button>
                  </div>
                )}

                {voiceState === 'listening' && (
                  <div className="text-center space-y-1">
                    <div className="flex justify-center items-center gap-1">
                      <span className="w-1.5 h-3 bg-[#F45B7A] rounded animate-bounce" />
                      <span className="w-1.5 h-4.5 bg-[#F45B7A] rounded animate-bounce delay-75" />
                      <span className="w-1.5 h-2.5 bg-[#F45B7A] rounded animate-bounce delay-150" />
                    </div>
                    <button
                      type="button"
                      onClick={stopVoiceListening}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      {t.tapToStop}
                    </button>
                  </div>
                )}

                {voiceState === 'has_transcript' && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-[#3DBA61] font-semibold flex items-center gap-0.5">
                      ✓ Voice transcripted (Bilingual SR/EN)
                    </p>
                    <button
                      type="button"
                      onClick={() => setVoiceState('none')}
                      className="w-full py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] rounded"
                    >
                      Clear Rec
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Step Navigation & Save Handlers */}
      <div className="border-t pt-3 flex gap-2 justify-end" id="form-footers">
        {formType === 'baseline' ? (
          <>
            {baselineStep > 1 && baselineStep <= 3 && (
              <button
                type="button"
                onClick={() => setBaselineStep(prev => prev - 1)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                }`}
              >
                {t.back}
              </button>
            )}
            {baselineStep < 3 ? (
              <button
                type="button"
                onClick={() => setBaselineStep(prev => prev + 1)}
                className="px-4 py-1.5 bg-[#F45B7A] text-white font-semibold text-xs rounded-lg hover:opacity-95 flex items-center gap-1 shadow-md"
              >
                {t.continue} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : baselineStep === 3 ? (
              <button
                type="button"
                onClick={() => setBaselineStep(4)}
                className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-[#3DBA61] text-white font-semibold text-xs rounded-lg hover:opacity-95 shadow-md"
              >
                {t.reviewSave}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#F45B7A] text-white font-semibold text-xs rounded-lg hover:opacity-95 shadow-md"
              >
                🔐 Finish Wizard
              </button>
            )}
          </>
        ) : formType === 'daily' ? (
          <>
            {dailyStep > 1 && dailyStep <= 4 && (
              <button
                type="button"
                onClick={() => setDailyStep(prev => prev - 1)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
                }`}
              >
                {t.back}
              </button>
            )}
            {dailyStep < 4 ? (
              <button
                type="button"
                onClick={() => setDailyStep(prev => prev + 1)}
                className="px-4 py-1.5 bg-[#F45B7A] text-white font-semibold text-xs rounded-lg hover:opacity-95 flex items-center gap-1 shadow-md"
              >
                {t.next} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : dailyStep === 4 ? (
              <button
                type="button"
                onClick={() => setDailyStep(5)}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-[#F45B7A] hover:to-pink-600 text-white font-semibold text-xs rounded-lg hover:opacity-95 shadow-md animate-pulse"
              >
                {t.reviewComplete}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-gradient-to-r from-green-500 to-[#3DBA61] text-white font-semibold text-xs rounded-lg hover:opacity-95 shadow-md"
              >
                🔐 Complete Day
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || success}
              className="px-5 py-1.5 bg-[#F45B7A] text-white font-semibold text-xs rounded-lg hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-3 h-3 rounded-full border border-t-transparent border-white animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : success ? (
                <span>✓ Saved</span>
              ) : (
                <span>{t.saveEntry}</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
