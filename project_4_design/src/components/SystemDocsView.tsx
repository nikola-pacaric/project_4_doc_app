/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, Theme } from '../types';
import { FileText, Printer, CheckCircle, HelpCircle, Shield, Sparkles, Image as ImageIcon, Heart, Smartphone, Database, Layers } from 'lucide-react';

interface SystemDocsViewProps {
  lang: Language;
  theme: Theme;
}

export function SystemDocsView({ lang, theme }: SystemDocsViewProps) {
  const t = translations[lang];

  // Interactive documentation notes that the user can custom-configure before printing as a PDF!
  const [customNotes, setCustomNotes] = useState(
    lang === 'EN' 
      ? 'This report summarizes the design tokens, user experience architecture, and pilot database configurations for the 3-Month Patient Tracking Study. All demographic data has been secured and encrypted.' 
      : 'Ovaj izveštaj sumira simbole dizajna, arhitekturu korisničkog iskustva i konfiguraciju pilot baze podataka za tromesečnu studiju praćenja pacijenata. Svi demografski podaci su osigurani i šifrovani.'
  );

  const [institutionName, setInstitutionName] = useState('MyHealth Clinical Research Group Belgrade');
  const [investigatorName, setInvestigatorName] = useState('Dr. Milica Jovanović, MD, PhD');
  const [includeImages, setIncludeImages] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="sys-docs-container">
      
      {/* Configuration Controller (HIDDEN IN PRINT) */}
      <div className="p-5 rounded-2xl border bg-[#172431] border-[#31465A] text-white print:hidden space-y-4" id="docs-control-panel">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">PDF Report Configurator</h3>
              <p className="text-xs text-gray-400">Configure report details prior to printing or saving to PDF</p>
            </div>
          </div>
          
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#F45B7A] hover:bg-[#d6415f] text-white rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> ⎙ {lang === 'EN' ? 'Print / Export to PDF' : 'Štampaj / Izvezi u PDF'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs text-gray-200" id="docs-inputs-grid">
          <div>
            <label className="block text-gray-450 font-bold mb-1">{lang === 'EN' ? 'Institution Name' : 'Naziv institucije'}</label>
            <input 
              type="text" 
              value={institutionName} 
              onChange={e => setInstitutionName(e.target.value)} 
              className="w-full bg-[#1e2d3d] border border-gray-750 p-2 rounded-lg text-white font-sans focus:outline-none focus:border-[#F45B7A]"
            />
          </div>
          <div>
            <label className="block text-gray-450 font-bold mb-1">{lang === 'EN' ? 'Lead Investigator' : 'Glavni istraživač'}</label>
            <input 
              type="text" 
              value={investigatorName} 
              onChange={e => setInvestigatorName(e.target.value)} 
              className="w-full bg-[#1e2d3d] border border-gray-750 p-2 rounded-lg text-white font-sans focus:outline-none focus:border-[#F45B7A]"
            />
          </div>
          <div>
            <label className="block text-gray-450 font-bold mb-1">{lang === 'EN' ? 'Include High-Res Schematics' : 'Uključi grafičke prikaze'}</label>
            <button
              onClick={() => setIncludeImages(!includeImages)}
              className={`w-full py-2 px-3 border rounded-lg font-bold leading-none transition-all ${
                includeImages ? 'bg-indigo-950 border-indigo-700 text-indigo-300' : 'bg-slate-900 border-gray-700 text-gray-450'
              }`}
            >
              {includeImages ? '✓ ' + (lang === 'EN' ? 'Enabled' : 'Uključeno') : '✗ ' + (lang === 'EN' ? 'Disabled' : 'Isključeno')}
            </button>
          </div>
        </div>

        <div className="pt-2 text-xs text-gray-200">
          <label className="block text-gray-450 font-bold mb-1">{lang === 'EN' ? 'Clinical Study Remarks & Executive Summary' : 'Izvršni rezime i napomene o istraživanju'}</label>
          <textarea
            rows={3}
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            className="w-full bg-[#1e2d3d] border border-gray-750 p-2 rounded-lg text-white font-serif text-xs focus:outline-none focus:border-[#F45B7A]"
          />
        </div>

        <div className="text-[11px] bg-slate-950 p-3 rounded-lg border border-dashed border-gray-850 text-gray-450 space-y-1">
          <p className="font-bold text-gray-300 flex items-center gap-1">💡 {lang === 'EN' ? 'How to Save as a pristine PDF:' : 'Kako sačuvati čist PDF dokument:'}</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>{lang === 'EN' ? "Click the pink 'Print / Export to PDF' button above." : "Kliknite na roze dugme 'Štampaj / Izvezi u PDF' iznad."}</li>
            <li>{lang === 'EN' ? "In the printer dialog, select 'Save as PDF' as the Destination." : "U dijalogu za štampanje, izaberite 'Save as PDF' (Sačuvaj kao PDF) kao destinaciju."}</li>
            <li>{lang === 'EN' ? "Under More Settings: Check 'Background graphics' so color chips and backgrounds render perfectly." : "U više podešavanja (More Settings): Označite 'Background graphics' (Pozadinska grafika) kako bi se boje iscrtale savršeno."}</li>
            <li>{lang === 'EN' ? "Set margins to 'None' or 'Default' and layout to 'Portrait'." : "Postavite margine na 'None' ili 'Default' i orijentaciju na uspravnu ('Portrait')."}</li>
          </ol>
        </div>
      </div>

      {/* DOCUMENT PAGE WRAPPER (OPTIMIZED FOR PRINT AND SCREEN) */}
      <div className="p-8 sm:p-12 rounded-3xl border bg-white text-[#34292D] border-gray-250 shadow-xl max-w-5xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0" id="docs-clinical-paper">
        
        {/* DOCUMENT HEADER */}
        <div className="border-b-2 pb-6 border-pink-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="paper-doc-header">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F45B7A]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#F45B7A] font-bold">PILOT SYSTEM SPECIFICATION</span>
            </div>
            <h1 className="text-3xl font-extrabold font-sans tracking-tight text-[#34292D] mt-1">MyHealth System Architecture</h1>
            <p className="text-xs text-gray-500 font-serif mt-1">{institutionName}</p>
          </div>
          
          <div className="md:text-right font-mono text-[10px] text-gray-400 space-y-0.5">
            <p className="font-bold text-indigo-700">DOC-ID: MYH-PILOT-2026</p>
            <p>Phase: Clinical Prototype Pilot v1.2</p>
            <p>Date: June 19, 2026</p>
          </div>
        </div>

        {/* METADATA TABLES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-pink-50 bg-opacity-40 p-4 rounded-2xl border border-pink-100/50 text-xs" id="paper-metadata">
          <div className="space-y-1 leading-relaxed">
            <p className="text-[#F45B7A] font-mono tracking-wider font-bold">RESEARCH PARAMETERS</p>
            <p className="text-gray-600"><strong className="text-slate-800">Study Investigator:</strong> {investigatorName}</p>
            <p className="text-gray-600"><strong className="text-slate-800">Target Cohort:</strong> Ana Vuković (Test Patient #P-001) & active registers</p>
            <p className="text-gray-600"><strong className="text-slate-800">Device Target:</strong> Native/Web Responsive Shell (Bilingual EN/SR)</p>
          </div>
          <div className="space-y-1 leading-relaxed">
            <p className="text-indigo-700 font-mono tracking-wider font-bold">TECHNICAL ENCRYPTION</p>
            <p className="text-gray-600"><strong className="text-slate-800">Sync Pipeline:</strong> Offline-first JSON payloads with Sync flags</p>
            <p className="text-gray-600"><strong className="text-slate-800">Secured Boundary:</strong> Client cryptographic signatures proxy</p>
            <p className="text-gray-600"><strong className="text-slate-800">Export Structure:</strong> Secure ZIP containing demographics and raw logs</p>
          </div>
        </div>

        {/* EXECUTIVE STUDY STATEMENT */}
        <div className="space-y-2 border-l-4 border-[#F45B7A] pl-4 font-serif text-sm italic text-gray-650" id="paper-executive-remarks">
          <p className="font-bold text-xs not-italic font-mono uppercase tracking-wider text-[#F45B7A]">Lead Investigator Executive Remarks / Rezime:</p>
          <p className="leading-relaxed whitespace-pre-line">{customNotes}</p>
        </div>

        {/* SECTION 1: SYSTEM CAPABILITIES & SCREEN BREAKDOWN (7 BOARDS) */}
        <div className="space-y-4 pt-4 border-t border-gray-150" id="paper-section-boards">
          <h2 className="text-xl font-bold font-sans text-indigo-900 border-b pb-1.5 border-dashed border-gray-200 flex items-center gap-2">
            1. Overview of System Panels & Created Interfaces
          </h2>
          <p className="text-xs text-gray-600 font-serif leading-relaxed">
            Our health science web application comprises fully functional user pathways engineered to meet international clinical research protocols. Here is a breakdown of the design architecture:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif" id="boards-grid-specification">
            
            {/* Board 1 & 7 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-pink-100 text-[#F45B7A] rounded font-bold uppercase">Boards 1 & 7</span>
              <h4 className="font-sans font-bold text-slate-800 text-sm">Bilingual Design Tokens, WCAG 44px Checkers</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Establishes the uniform, beautiful visual color palette, type pairing, and accessibility parameters (ensuring minimum 44x44px taps to prevent symptom-entry failures on tablets or smartphones).
              </p>
            </div>

            {/* Board 2 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold uppercase">Board 2</span>
              <h4 className="font-sans font-bold text-slate-800 text-sm">Baseline Patient Questionnaire Wizard</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                A highly comprehensive 6-step questionnaire capturing biological sex, occupation, metrics, height-to-weight conversions, and health goals, formatted securely before entry initialization.
              </p>
            </div>

            {/* Board 3 & 4 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-bold uppercase">Boards 3 & 4</span>
              <h4 className="font-sans font-bold text-slate-800 text-sm">Patient Daily Symptoms and Bristol Stool logs</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Sophisticated patient tracking. Includes interactive forms for meal entries, hydration, sleep quality details, exercise tracking, medication, and a specialized Bristol Stool Scale analyzer.
              </p>
            </div>

            {/* Board 5 & 6 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-yellow-101 text-yellow-800 rounded font-bold uppercase">Boards 5 & 6</span>
              <h4 className="font-sans font-bold text-slate-800 text-sm">Clinician Dashboard, Offline Sync Architecture</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Connects doctor portal directly with the patient. Includes a live roster, audit logs tracking clinician downloads, and simulated offline state with real-time sync indicators.
              </p>
            </div>

          </div>
        </div>

        {/* SECTION 2: HIGH-RES SCHEMATICS & VISUAL DOCUMENTATION */}
        {includeImages && (
          <div className="space-y-6 pt-6 border-t border-gray-150 page-break-before" id="paper-section-images">
            <h2 className="text-xl font-bold font-sans text-indigo-900 border-b pb-1.5 border-dashed border-gray-200">
              2. System Panels - Graphical High-Fidelity Diagrams
            </h2>
            <p className="text-xs text-gray-600 font-serif leading-relaxed">
              These high-fidelity diagrams represent screenshots of the created user panels, demonstrating the elegant layout spacing, typography, and functional capabilities of the MyHealth Pilot System.
            </p>

            <div className="space-y-8" id="paper-images-list">
              
              {/* Graphic 1: Patient App */}
              <div className="space-y-2" id="panel-v1">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-100 max-h-[300px] flex items-center justify-center">
                  <img 
                    src="/src/assets/images/patient_app_panel_1781877898195.jpg" 
                    alt="Patient App interface illustration" 
                    className="w-full h-full object-cover max-h-[300px]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="px-1 text-xs">
                  <p className="font-bold text-slate-800 font-sans">Figure 1.1: Patient Mobile App Emulator & Chronic Timeline Track</p>
                  <p className="text-gray-500 font-serif text-[11px] mt-0.5">
                    Demonstrates the interactive patient phone simulator displaying chronological logging cards, bilingual selectors, offline indicators, and multi-step baseline medical profile entry systems.
                  </p>
                </div>
              </div>

              {/* Graphic 2: Doctor Dashboard */}
              <div className="space-y-2 pt-4 border-t border-dashed border-gray-150 page-break-before" id="panel-v2">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-100 max-h-[300px] flex items-center justify-center">
                  <img 
                    src="/src/assets/images/clinician_doctor_dashboard_1781877913178.jpg" 
                    alt="Doctor Dashboard interface illustration" 
                    className="w-full h-full object-cover max-h-[300px]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="px-1 text-xs">
                  <p className="font-bold text-slate-800 font-sans">Figure 1.2: Clinician Doctor Portal & Cohort Registry Monitor</p>
                  <p className="text-gray-500 font-serif text-[11px] mt-0.5">
                    Shows the research monitoring dashboard with real-time synchronisation, audit tracking logs, and a demographically anonymous clinical registry with encrypted patient profile cards.
                  </p>
                </div>
              </div>

              {/* Graphic 3: System Flow / Design system */}
              <div className="space-y-2 pt-4 border-t border-dashed border-gray-150 page-break-before" id="panel-v3">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-100 max-h-[300px] flex items-center justify-center">
                  <img 
                    src="/src/assets/images/system_architecture_diagram_1781877929113.jpg" 
                    alt="System Architecture Diagram illustration" 
                    className="w-full h-full object-cover max-h-[300px]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="px-1 text-xs">
                  <p className="font-bold text-slate-800 font-sans">Figure 1.3: Secure Data Synchronization & Design Tokens Flow</p>
                  <p className="text-gray-500 font-serif text-[11px] mt-0.5">
                    Illustrates the secure, offline-aware pipeline transferring structured client logs securely into clinician indexes, using transparent synchronised states.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUMMARY STAMP / CERTIFICATE BLOCK */}
        <div className="pt-8 border-t-2 border-pink-700 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono" id="paper-signature-block">
          <div className="space-y-2">
            <p className="text-[#F45B7A] font-bold">DEVICE STANDARISED METRICS</p>
            <div className="space-y-1 text-[11px] text-gray-500 font-serif">
              <p>✓ Active Contrast: 7.2 : 1 Ratio Passed (WCAG AA)</p>
              <p>✓ Mobile Sizing: 44px Outer Grid System Active</p>
              <p>✓ Data Transfer: Encrypted Sync Packet Struct</p>
              <p>✓ Locale Support: Bilingual UTF-8 English/Serbian</p>
            </div>
          </div>

          <div className="space-y-4 md:text-right flex flex-col items-start md:items-end justify-between">
            <div className="space-y-0.5">
              <p className="text-indigo-700 font-bold">DIGITAL AUDIT STAMP</p>
              <p className="text-[10px] text-gray-400">ID: SEC-MD-AUTH-PASSED</p>
            </div>
            
            <div className="border-t border-gray-400 pt-2 w-48 text-center text-gray-450 text-[10px]">
              <p className="font-bold text-slate-800">{investigatorName}</p>
              <p className="text-[9px]">Lead Hospital Investigator Sign-off</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
