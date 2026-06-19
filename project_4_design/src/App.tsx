/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Heart, Smartphone, Database, Layers, Sparkles, AlertCircle, HelpCircle, Info, Landmark, FileText } from 'lucide-react';
import { PhoneEmulator } from './components/PhoneEmulator';
import { DoctorDashboard } from './components/DoctorDashboard';
import { DesignSystemExplorer } from './components/DesignSystemExplorer';
import { SystemDocsView } from './components/SystemDocsView';
import { initialEntries, initialPatientProfile, initialInviteCodes } from './data';
import { PatientEntry, PatientProfile, InviteCode, Language, Theme, getPatientEntryDetails } from './types';

export default function App() {
  // Global States
  const [lang, setLang] = useState<Language>('EN');
  const [theme, setTheme] = useState<Theme>('light');
  const [activeRole, setActiveRole] = useState<'patient_emulator' | 'doctor' | 'design_system' | 'system_docs'>('patient_emulator');

  // Interactive Live Data Sync State
  const [entries, setEntries] = useState<PatientEntry[]>(initialEntries);
  const [profile, setProfile] = useState<PatientProfile>(initialPatientProfile);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>(initialInviteCodes);
  const [isOffline, setIsOffline] = useState(false);

  // Live synchronisation toast notification setup
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleSaveEntry = (newEntry: PatientEntry) => {
    // If clinician timeline is viewed, simulate a small live database event notification!
    setEntries([newEntry, ...entries]);
    const details = getPatientEntryDetails(newEntry);
    setSyncToast(`[Live Sync] New entry "${details.name}" added to Ana's clinical study file!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.data.id !== id));
    setSyncToast(`[Live Sync] Entry deleted. Database updated.`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  return (
    <div className={`min-h-screen font-sans ${
      theme === 'dark' ? 'bg-[#101820] text-white' : 'bg-[#FFF7F5] text-[#34292D]'
    }`}>
      
      {/* Top Universal Branding Bar with Architectural Honesty */}
      <header className={`px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
        theme === 'dark' ? 'bg-[#172431] border-slate-850' : 'bg-white border-pink-101 shadow-xs'
      }`} id="app-universal-header">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F45B7A] to-pink-600 flex items-center justify-center text-white font-bold shadow-md">
            ❤️
          </div>
          <div>
            <h1 className="text-xl font-black font-sans tracking-tight flex items-center gap-1">
              MyHealth Research Portal
              <span className="text-xs px-1.5 py-0.5 bg-pink-100 text-[#F45B7A] rounded-full font-mono uppercase font-bold tracking-wider">3-Month Pilot</span>
            </h1>
            <p className="text-xs text-gray-400 font-serif">Private patient tracking & clinical research monitoring system • Bilingual (EN / SR)</p>
          </div>
        </div>

        {/* Global Action State Switchers */}
        <div className="flex items-center gap-2 flex-wrap" id="app-tab-selectors">
          <button
            onClick={() => setActiveRole('patient_emulator')}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
              activeRole === 'patient_emulator'
                ? 'bg-[#F45B7A] text-white shadow-md'
                : theme === 'dark' ? 'bg-slate-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> 📱 Patient App Emulator
          </button>

          <button
            onClick={() => setActiveRole('doctor')}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
              activeRole === 'doctor'
                ? 'bg-indigo-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-slate-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database className="w-4 h-4" /> 🩺 Doctor Dashboard Portal
          </button>

          <button
            onClick={() => setActiveRole('design_system')}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
              activeRole === 'design_system'
                ? 'bg-teal-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-slate-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" /> {lang === 'EN' ? '🎨 Brand & Design System' : '🎨 Dizajn i Brend'}
          </button>

          <button
            onClick={() => setActiveRole('system_docs')}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
              activeRole === 'system_docs'
                ? 'bg-pink-650 text-white shadow-md'
                : theme === 'dark' ? 'bg-slate-800 text-gray-300 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 text-pink-400" /> {lang === 'EN' ? '📄 Export & PDF Specs' : '📄 Izvoz i PDF Specifikacija'}
          </button>
        </div>
      </header>

      {/* Central Interactive Sync Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-slate-900 text-white border border-[#F45B7A] rounded-xl shadow-2xl animate-slide-in-up flex items-center gap-2 max-w-sm text-xs font-mono" id="app-sync-toast">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Primary Layout Showcase Area */}
      <main className="p-6 max-w-7xl mx-auto" id="app-main-content">

        {/* Live Synchronisation Tutorial Banner */}
        <div className={`mb-6 p-4 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#172431] border-slate-805 text-gray-200' : 'bg-gradient-to-r from-pink-50 to-indigo-50 border-pink-100 text-slate-800'
        }`} id="app-intro-banner">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5 text-[#F45B7A] flex-shrink-0 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">Live Simulation Sync Enabled</h4>
              <p className="text-xs font-serif leading-relaxed">
                This interactive prototype showcases the <strong>full multi-panel bilingual ecosystem</strong> of the MyHealth pilot study. 
                Any logs you create (or delete) in the <strong>Patient App Emulator</strong> immediately reflect in the clinician's <strong>Doctor Dashboard Portal</strong> under patient Ana Vukević's timeline! Try adding symptoms, meals, or medication.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamically Render selected dashboard panel */}
        {activeRole === 'patient_emulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start" id="app-patient-view">
            {/* Emulator Phone layout */}
            <div className="lg:col-span-2 flex justify-center">
              <PhoneEmulator
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                entries={entries}
                onSaveEntry={handleSaveEntry}
                onDeleteEntry={handleDeleteEntry}
                profile={profile}
                setProfile={setProfile}
                isOffline={isOffline}
                setIsOffline={setIsOffline}
              />
            </div>

            {/* Explanatory Sidebar Guide */}
            <div className="lg:col-span-2 space-y-4" id="app-patient-guides">
              <div className={`p-5 rounded-2xl border ${
                theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-pink-101 shadow-sm'
              }`}>
                <h3 className="text-base font-bold font-sans text-indigo-800 mb-2">📱 Explore Patient Experience</h3>
                <p className="text-xs font-serif text-gray-500 leading-relaxed mb-4">
                  The emulator on the left runs a fully structured client simulator representing a study patient (Ana Vuković, Study Day 12). 
                  Explore the multi-panel layout across different screen states:
                </p>

                <div className="space-y-3 font-semibold text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl" id="guide-card-1">
                    <p className="text-[#F45B7A] uppercase text-[10px] tracking-widest mb-1 font-mono">1. Multi-Step Baseline Profile Wizard</p>
                    <p className="text-gray-600 font-serif font-normal">
                      Click the "Complete baseline profile" banner to open a 6-step questionnaire targeting gender, occupations, height and weight tracking details.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl" id="guide-card-2">
                    <p className="text-indigo-700 uppercase text-[10px] tracking-widest mb-1 font-mono">2. Dynamic Chronological Timeline</p>
                    <p className="text-gray-600 font-serif font-normal">
                      Switch between "Home" and "Timeline" tabs inside the phone. Any entries you log are sorted under May 7 (Today) or May 6 (Yesterday).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl" id="guide-card-3">
                    <p className="text-green-700 uppercase text-[10px] tracking-widest mb-1 font-mono">3. Photo Compression & Voice Input Simulation</p>
                    <p className="text-gray-600 font-serif font-normal">
                      Add a "Note" or "Stool Log". Tap the Camera or Mic icons to simulate privacy-respecting compression upload tasks or bilingual speech text transcription!
                    </p>
                  </div>
                </div>

                {/* Direct quick jumps */}
                <div className="mt-4 pt-4 border-t border-dashed flex gap-2">
                  <button
                    onClick={() => setLang(lang === 'EN' ? 'SR' : 'EN')}
                    className="flex-1 py-2 text-xs border bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-mono font-bold text-center"
                  >
                    🌐 Current Lang: {lang}
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="flex-1 py-2 text-xs border bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-800 font-mono font-bold text-center"
                  >
                    🎨 Theme: {theme.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Informational checklist info card */}
              <div className={`p-4 rounded-xl border border-dashed text-xs space-y-2 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-[#fff5f3] border-pink-200'
              }`} id="study-details-card">
                <h4 className="font-bold flex items-center gap-1 text-[#F45B7A]"><Info className="w-4 h-4" /> Pilot Constraints Details</h4>
                <p className="text-gray-500 font-serif text-[11px] leading-relaxed">
                  "Patient-first, privacy-by-design. We maintain an offline-aware tracking loop, enabling patients to register daily wellness stats without server internet access. Synced flags highlight database commit status."
                </p>
              </div>
            </div>
          </div>
        )}

        {activeRole === 'doctor' && (
          <div id="app-doctor-view">
            <DoctorDashboard
              lang={lang}
              theme={theme}
              entries={entries}
              inviteCodes={inviteCodes}
              setInviteCodes={setInviteCodes}
              isOffline={isOffline}
            />
          </div>
        )}

        {activeRole === 'design_system' && (
          <div id="app-design-system-view">
            <DesignSystemExplorer
              lang={lang}
              theme={theme}
            />
          </div>
        )}

        {activeRole === 'system_docs' && (
          <div id="app-system-docs-view">
            <SystemDocsView
              lang={lang}
              theme={theme}
            />
          </div>
        )}

      </main>

      {/* Footer bar with honest developer credentials */}
      <footer className="py-8 text-center text-xs text-gray-400 font-mono border-t mt-12 border-dashed border-gray-200" id="app-footer">
        <p>Built with care for clinical research in health sciences.</p>
        <p className="mt-1 opacity-75">Design system v1.2 © 2026 Private Patient Tracking Study. Confidential & Secured.</p>
      </footer>
    </div>
  );
}
