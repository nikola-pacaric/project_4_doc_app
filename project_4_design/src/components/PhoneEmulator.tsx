/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Home, Calendar, MessageSquare, User, CheckCircle2, ChevronRight, AlertTriangle, AlertCircle, Plus, Info, Settings, Trash2, Languages, Sun, Moon, Sparkles } from 'lucide-react';
import { translations } from '../translations';
import { Language, Theme, PatientProfile, PatientEntry, getPatientEntryDetails } from '../types';
import { Forms } from './Forms';

interface PhoneEmulatorProps {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  entries: PatientEntry[];
  onSaveEntry: (entry: PatientEntry) => void;
  onDeleteEntry: (id: string) => void;
  profile: PatientProfile;
  setProfile: (p: PatientProfile) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
}

export function PhoneEmulator({
  lang,
  setLang,
  theme,
  setTheme,
  entries,
  onSaveEntry,
  onDeleteEntry,
  profile,
  setProfile,
  isOffline,
  setIsOffline
}: PhoneEmulatorProps) {
  const t = translations[lang];
  const isDark = theme === 'dark';

  // State
  const [authState, setAuthState] = useState<'signin' | 'signup' | 'consent' | 'signedin'>('signedin');
  const [selectedTab, setSelectedTab] = useState<'home' | 'timeline' | 'messages' | 'profile'>('home');
  const [activeForm, setActiveForm] = useState<'none' | 'baseline' | 'daily' | 'meal' | 'symptom' | 'stool' | 'medication' | 'exercise' | 'menstruation' | 'note'>('none');

  // Auth Inputs
  const [authEmail, setAuthEmail] = useState('ana.vukovic@example.com');
  const [authPassword, setAuthPassword] = useState('password123');
  const [authName, setAuthName] = useState('Ana Vuković');
  const [authError, setAuthError] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(true);

  // Filters
  const [timelineDate, setTimelineDate] = useState<string>('2025-05-07');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (authEmail === 'ana.vukovic@example.com' && authPassword === 'password123') {
      setAuthState('signedin');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState('consent');
  };

  const handleConsentSubmit = () => {
    if (agreeConsent) {
      setProfile({
        ...profile,
        fullName: authName,
        email: authEmail,
        profileCompleted: false
      });
      setAuthState('signedin');
    }
  };

  // Entry mapping helper
  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'meal': return '🍲';
      case 'symptom': return '⚠️';
      case 'medication': return '💊';
      case 'exercise': return '🏃';
      case 'stool': return '💩';
      case 'menstruation': return '🩸';
      default: return '📄';
    }
  };

  const currentDayEntries = entries.filter(e => e.data.timestamp === timelineDate);

  // Daily progress check. In study board, there is "4 / 7 completed" or "57%".
  // Let's compute actual progress:
  // We can count how many distinct types are logged today vs 7 total types.
  const loggedTypesToday = new Set(entries.filter(e => e.data.timestamp === '2025-05-07').map(e => e.type));
  const progressCount = Math.min(loggedTypesToday.size, 7);
  const progressPercentage = Math.round((progressCount / 7) * 100);

  return (
    <div className="flex flex-col items-center" id="phone-emulator-root">
      {/* Simulation Controls Rail above the phone */}
      <div className={`mb-3 p-3 w-full max-w-[370px] rounded-xl flex justify-between items-center text-xs font-mono border ${
        isDark ? 'bg-[#1e2a38] border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'
      }`} id="emulator-controls">
        <span className="flex items-center gap-1">
          🌐 {lang}
        </span>
        <div className="flex items-center gap-2">
          {/* Translation key switcher */}
          <button
            onClick={() => setLang(lang === 'EN' ? 'SR' : 'EN')}
            className={`px-2 py-1 rounded hover:opacity-85 font-bold ${
              isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-sm'
            }`}
          >
            {lang === 'EN' ? 'Srpski (SR)' : 'English (EN)'}
          </button>

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`p-1.5 rounded hover:opacity-85 ${
              isDark ? 'bg-gray-800 text-amber-400' : 'bg-white text-[#F45B7A] shadow-sm'
            }`}
            title="Toggle theme inside phone"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Network offline toggle */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2 py-1 rounded font-bold text-[10px] ${
              isOffline ? 'bg-amber-600 text-white' : isDark ? 'bg-gray-800 text-green-400' : 'bg-white text-green-600 border'
            }`}
          >
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </button>
        </div>
      </div>

      {/* Outer Phone Bezel Shell */}
      <div className={`w-[365px] h-[720px] rounded-[42px] border-[10px] shadow-2xl overflow-hidden flex flex-col relative transition-colors duration-200 ${
        isDark ? 'bg-[#101820] border-[#31465A] ring-1 ring-offset-2 ring-indigo-500' : 'bg-white border-[#34292D] ring-2 ring-pink-100'
      }`} id="device-screen-shell">

        {/* Dynamic Notch at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-[#101820] rounded-b-xl z-50 flex items-center justify-center" id="phone-notch">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
          <div className="w-12 h-1 bg-slate-900 rounded-full" />
        </div>

        {/* Top Native Status Bar (Android mock) */}
        <div className={`pt-6 px-5 pb-1 flex justify-between items-center text-[10px] font-mono z-40 ${
          isDark ? 'bg-[#101820] text-gray-400' : 'bg-white text-gray-500 border-b border-gray-100'
        }`} id="phone-status-bar">
          <span>09:30</span>
          {isOffline && (
            <div className="flex items-center gap-1 text-amber-500 font-bold font-sans">
              <AlertCircle className="w-3 h-3" /> Offline
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span>📡 lte</span>
            <span>📶 wi-fi</span>
            <span className="border px-1 py-0.2 rounded text-[9px] font-bold border-current">57%</span>
          </div>
        </div>

        {/* MAIN BODY SCROLL VIEW */}
        <div className={`flex-1 overflow-y-auto ${
          isDark ? 'bg-[#101820] text-white' : 'bg-[#FFF7F5] text-[#34292D]'
        }`} id="phone-body">

          {/* Check Form Modal Overlays inside device screen */}
          {activeForm !== 'none' ? (
            <div className="h-full pt-1" id="phone-active-form">
              <Forms
                lang={lang}
                theme={theme}
                formType={activeForm}
                profile={profile}
                onUpdateProfile={(p) => {
                  setProfile(p);
                }}
                onSave={(entry) => {
                  onSaveEntry(entry);
                }}
                onCancel={() => setActiveForm('none')}
              />
            </div>
          ) : (
            <>
              {/* Check Authentication states */}
              {authState === 'signin' && (
                <div className="p-5 flex flex-col justify-center h-full space-y-6" id="auth-signin">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F45B7A] text-white flex items-center justify-center mx-auto mb-2 shadow-lg">
                      ❤️
                    </div>
                    <h3 className="text-xl font-bold font-sans mt-2">{t.appName}</h3>
                    <p className="text-xs text-[#8A767D]">{t.signInTitle}</p>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t.errorSignIn}</span>
                    </div>
                  )}

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className={`w-full p-2.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                          isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Password</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className={`w-full p-2.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                          isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#F45B7A] hover:bg-[#EB4C6D] text-white font-bold text-xs rounded-lg transition shadow-md"
                    >
                      {t.signIn}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setAuthState('signup')}
                      className="text-xs text-[#F45B7A] hover:underline font-semibold"
                    >
                      {t.signUp}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2">Bilingual credentials demo login: ana.vukovic@example.com / password123</p>
                  </div>
                </div>
              )}

              {authState === 'signup' && (
                <div className="p-5 flex flex-col justify-center h-full space-y-4" id="auth-signup">
                  <h3 className="text-xl font-bold font-sans text-center">{t.signUp}</h3>
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.fullName}</label>
                      <input
                        type="text"
                        value={authName}
                        onChange={e => setAuthName(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg border ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.email}</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className={`w-full p-2 text-xs rounded-lg border ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">{t.password}</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className={`w-full p-2 text-xs rounded-lg border ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'
                        }`}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#F45B7A] text-white font-bold text-xs rounded-lg mt-2"
                    >
                      {t.createAccount}
                    </button>
                  </form>
                  <button
                    onClick={() => setAuthState('signin')}
                    className="text-xs text-gray-500 hover:underline block text-center"
                  >
                    {t.alreadyHaveAccount}
                  </button>
                </div>
              )}

              {authState === 'consent' && (
                <div className="p-5 space-y-4 h-full flex flex-col justify-between" id="auth-consent">
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1" id="consent-gate">
                    <h3 className="text-base font-bold font-sans text-[#F45B7A]">{t.consentTitle}</h3>

                    <div className="space-y-3 text-xs">
                      <div className="p-2 bg-pink-50 border border-pink-100 rounded-lg text-pink-900 text-[11px]">
                        <p className="font-bold">{t.aboutResearch}</p>
                        <p className="opacity-90">{t.aboutResearchText}</p>
                      </div>

                      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 text-[11px]">
                        <p className="font-bold">{t.yourPrivacy}</p>
                        <p className="opacity-90">{t.yourPrivacyText}</p>
                      </div>

                      <div className="p-2 bg-yellow-50 border border-yellow-101 rounded-lg text-yellow-900 text-[11px]">
                        <p className="font-bold">{t.notForDiagnosis}</p>
                        <p className="opacity-90">{t.notForDiagnosisText}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeConsent}
                        onChange={() => setAgreeConsent(!agreeConsent)}
                        className="rounded inline-block mt-0.5 accent-[#F45B7A]"
                      />
                      <span>{t.consentCheckbox}</span>
                    </label>

                    <button
                      onClick={handleConsentSubmit}
                      disabled={!agreeConsent}
                      className="w-full py-2 bg-[#F45B7A] disabled:opacity-50 text-white font-bold text-xs rounded-lg"
                    >
                      {t.acceptContinue}
                    </button>
                  </div>
                </div>
              )}

              {authState === 'signedin' && (
                <div className="flex flex-col h-full" id="signed-in-viewport">
                  {/* Header widget */}
                  <div className={`p-4 ${
                    isDark ? 'bg-[#172431]' : 'bg-[#FFF7F5]'
                  }`} id="signed-in-header">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-gray-400 font-mono">MyStudy • Study Day 12</span>
                        <h2 className="text-lg font-bold tracking-tight">
                          {lang === 'EN' ? `Good morning, Ana` : `Dobro jutro, Ana`}
                        </h2>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#F45B7A] text-white flex items-center justify-center font-semibold text-xs shadow-md">
                        AV
                      </div>
                    </div>

                    {isOffline && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-801 rounded-lg text-[10px] flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">{t.offlineNotice}</p>
                          <p className="opacity-90">Changes will synchronize when you reconnect.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TAB 1: HOME PANEL */}
                  {selectedTab === 'home' && (
                    <div className="p-4 space-y-4 flex-1" id="tab-home-view">
                      {/* Interactive Progress widget */}
                      <div className={`p-3 rounded-xl border flex items-center gap-4 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150 shadow-sm'
                      }`} id="home-progress-widget">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {/* Radial Progress */}
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke={isDark ? '#1e293b' : '#f3f4f6'}
                              strokeWidth="4"
                              fill="transparent"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              stroke="#F45B7A"
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray="125.6"
                              strokeDashoffset={125.6 - (125.6 * progressPercentage) / 100}
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">
                            {progressPercentage}%
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold">{t.dailyProgress}</h4>
                          <p className="text-[11px] text-gray-500 font-serif">
                            {progressCount} / 7 items logged today.
                          </p>
                        </div>
                      </div>

                      {/* Baseline Profile setup missing indicator */}
                      {!profile.profileCompleted && (
                        <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-pink-200 text-pink-900 rounded-xl flex justify-between items-center" id="baseline-reminder">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#F45B7A]" />
                              {t.completeProfileReminder}
                            </h4>
                            <p className="text-[10px] opacity-90">{t.completeProfileText}</p>
                          </div>
                          <button
                            onClick={() => setActiveForm('baseline')}
                            className="bg-[#F45B7A] text-white px-2.5 py-1 text-[10px] font-bold rounded hover:bg-[#e04565] transition shadow-sm"
                          >
                            {t.continueProfile}
                          </button>
                        </div>
                      )}

                      {/* Quick Actions Grid matching Boards */}
                      <div className="space-y-2" id="home-actions">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.quickActions}</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: t.dailyFormBtn, icon: '📋', type: 'daily' },
                            { label: t.symptomBtn, icon: '⚠️', type: 'symptom' },
                            { label: t.mealBtn, icon: '🍲', type: 'meal' },
                            { label: t.medicationBtn, icon: '💊', type: 'medication' },
                            { label: t.exerciseBtn, icon: '🏃', type: 'exercise' },
                            { label: t.stoolBtn, icon: '💩', type: 'stool' },
                            { label: t.mensBtn, icon: '🩸', type: 'menstruation' },
                            { label: t.noteBtn, icon: '📄', type: 'note' }
                          ].map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveForm(action.type as any)}
                              className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-gray-300'
                                  : 'bg-white border-gray-100 hover:bg-pink-50 hover:border-pink-200 shadow-sm'
                              }`}
                            >
                              <span className="text-lg mb-1">{action.icon}</span>
                              <span className="text-[9px] font-semibold leading-tight line-clamp-1">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Today's timeline snippet list */}
                      <div className="space-y-2 mt-4" id="home-recent-logs">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.recentEntries}</h4>
                          <button
                            onClick={() => setSelectedTab('timeline')}
                            className="text-xs text-[#F45B7A] hover:underline"
                          >
                            {t.viewAll}
                          </button>
                        </div>

                        <div className="space-y-1.5" id="recent-logs-list">
                          {entries.filter(e => {
                            const details = getPatientEntryDetails(e);
                            return details.timestamp === '2025-05-07';
                          }).map(entry => {
                            const details = getPatientEntryDetails(entry);
                            return (
                              <div
                                key={details.id}
                                className={`p-2.5 rounded-lg border flex justify-between items-center text-xs ${
                                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{getEntryIcon(entry.type)}</span>
                                  <div>
                                    <p className="font-semibold">{details.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{details.time}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`px-1 rounded text-[9px] font-bold ${
                                    details.status === 'synced'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-850 animate-pulse'
                                  }`}>
                                    {details.status === 'synced' ? t.completed : t.pending}
                                  </span>
                                  <button
                                    onClick={() => onDeleteEntry(details.id)}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TIMELINE PANELS */}
                  {selectedTab === 'timeline' && (
                    <div className="p-4 space-y-4 flex-1" id="tab-timeline-view">
                      {/* Date Filter selector */}
                      <div className="flex items-center justify-between border-b pb-2 mb-2 border-dashed border-gray-300" id="timeline-filters">
                        <span className="text-xs font-bold text-gray-500">Day View Selector</span>
                        <div className="flex gap-1">
                          {[
                            { label: 'May 7', dateStr: '2025-05-07' },
                            { label: 'May 6', dateStr: '2025-05-06' }
                          ].map(d => (
                            <button
                              key={d.dateStr}
                              onClick={() => setTimelineDate(d.dateStr)}
                              className={`px-2 py-1 text-xs rounded-lg border font-medium ${
                                timelineDate === d.dateStr
                                  ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                                  : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display entries for selected day */}
                      <div className="space-y-3" id="timeline-stack">
                        {currentDayEntries.length === 0 ? (
                          <div className="text-center p-8 text-xs text-gray-500" id="timeline-empty">
                            No logs registered for this date.
                          </div>
                        ) : (
                          currentDayEntries.map(entry => {
                            const details = getPatientEntryDetails(entry);
                            return (
                              <div
                                key={details.id}
                                className={`p-3 rounded-xl border flex gap-3 relative overflow-hidden transition-all ${
                                  isDark
                                    ? 'bg-[#172431] border-slate-800 hover:border-slate-700'
                                    : 'bg-white border-slate-100 hover:border-pink-300 shadow-sm'
                                }`}
                              >
                                {/* Sync Pending warning border overlay */}
                                {details.status === 'pending' && (
                                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
                                )}

                                <div className="text-base flex-shrink-0 mt-0.5">
                                  {getEntryIcon(entry.type)}
                                </div>

                                <div className="flex-1 text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm tracking-tight">{details.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">{details.time}</span>
                                  </div>

                                  <p className="text-gray-500 font-serif leading-relaxed">
                                    {details.description}
                                  </p>

                                  {/* Render nested specific types details */}
                                  {entry.type === 'stool' && (
                                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-bold">
                                      <span className="bg-amber-100 text-amber-800 px-1 rounded">Bristol {entry.data.bristolType}</span>
                                      <span className="bg-red-50 text-red-700 px-1 rounded">Urgency: {entry.data.urgency}</span>
                                    </div>
                                  )}

                                  {entry.type === 'symptom' && entry.data.painDetails && (
                                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-bold">
                                      <span className="bg-red-100 text-red-800 px-1 rounded">Intensity {entry.data.painDetails.intensity}</span>
                                      <span className="bg-purple-100 text-purple-800 px-1 rounded">Daily: {entry.data.painDetails.affectsDaily}</span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-1 mt-1 border-t border-dashed border-gray-100">
                                    <span className="text-[9px] text-[#868A7E]">
                                      {details.status === 'synced' ? 'Synced with study server' : 'Stored locally • Pending sync'}
                                    </span>
                                    <button
                                      onClick={() => onDeleteEntry(details.id)}
                                      className="text-red-500 hover:underline text-[10px] font-bold font-mono"
                                    >
                                      DELETE
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CLINICAL MESSAGES */}
                  {selectedTab === 'messages' && (
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto" id="tab-messages-view">
                      <div className="p-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-900 text-xs text-left">
                        <p className="font-bold">🧑‍⚕️ Dr. Milica Jovanović</p>
                        <p className="opacity-95 mt-1 leading-relaxed">
                          "Zdravo Ana, primetila sam tvoju zabeleženu nadutost nakon doručka. Pokušaj da pratiš unos vode i vidi da li hronična terapija suplementima pomaže. Srećno!"
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">Yesterday, 14:15</p>
                      </div>

                      <div className="p-3 rounded-xl border bg-slate-100 border-gray-200 text-gray-800 text-xs text-right ml-8">
                        <p className="font-bold text-[#F45B7A]">You (Anna)</p>
                        <p className="opacity-95 mt-1 leading-relaxed">
                          "Dragi lekarko, hvala na savetu. Zabeležile sam sve unose za danas uključujući i šetnju."
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">Today, 08:30</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PATIENT PROFILE SETTINGS */}
                  {selectedTab === 'profile' && (
                    <div className="p-4 space-y-4 flex-grow" id="tab-profile-view">
                      <div className="text-center p-4 border rounded-xl border-dashed border-gray-200">
                        <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto text-lg font-bold shadow-md">
                          AV
                        </div>
                        <h4 className="text-sm font-bold mt-2">{profile.fullName}</h4>
                        <p className="text-[11px] text-gray-400 font-mono">{profile.email}</p>
                      </div>

                      <div className="space-y-2 text-xs" id="profile-details-metrics">
                        <h5 className="font-bold text-gray-500 uppercase">{t.aboutYou}</h5>
                        <div className={`p-3 rounded-xl border space-y-2 ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-150'
                        }`}>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.birthYear}:</span>
                            <span className="font-bold">{profile.birthYear || '1985'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.sex}:</span>
                            <span className="font-bold">{profile.gender || 'Female'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.occupation}:</span>
                            <span className="font-bold">{profile.occupation || 'Teacher'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.weight}:</span>
                            <span className="font-bold">{profile.weight || '68'} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.height}:</span>
                            <span className="font-bold">{profile.height || '166'} cm</span>
                          </div>
                        </div>
                      </div>

                      {/* Action trigger links */}
                      <div className="space-y-1" id="profile-link-actions">
                        <button
                          onClick={() => setActiveForm('baseline')}
                          className="w-full text-left p-2.5 bg-[#F45B7A] text-white rounded-xl text-xs font-bold flex justify-between items-center shadow-sm"
                        >
                          ✏️ Update Medical Baseline Checklist
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setAuthState('signin')}
                          className="w-full text-left p-2.5 bg-red-100 text-red-800 rounded-xl text-xs font-bold flex justify-between items-center"
                        >
                          🚪 Logout & Change Roles
                          <span className="text-xs">→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM DEVICE BAR TABS NAVIGATION */}
                  <div className={`mt-auto border-t flex justify-around py-2.5 z-40 ${
                    isDark ? 'bg-[#101820] border-slate-800 text-gray-400' : 'bg-white border-gray-150 text-gray-500'
                  }`} id="phone-tabs-navigation">
                    {[
                      { id: 'home', label: t.tabHome, icon: Home },
                      { id: 'timeline', label: t.tabTimeline, icon: Calendar },
                      { id: 'messages', label: t.tabMessages, icon: MessageSquare },
                      { id: 'profile', label: t.tabProfile, icon: User }
                    ].map(tab => {
                      const IconComponent = tab.icon;
                      const isActive = selectedTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedTab(tab.id as any)}
                          className={`flex flex-col items-center cursor-pointer ${
                            isActive ? 'text-[#F45B7A] font-bold scale-105' : 'hover:text-gray-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mb-0.5" />
                          <span className="text-[9px] font-sans">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Device Bottom rounded physical navigation line */}
        <div className={`py-1.5 flex justify-center items-center z-40 ${
          isDark ? 'bg-[#101820]' : 'bg-white'
        }`} id="phone-physical-footer">
          <div className="w-28 h-1 bg-slate-900 rounded-full" />
        </div>
      </div>
    </div>
  );
}
