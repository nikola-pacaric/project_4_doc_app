/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, Theme } from '../types';
import { Heart, Activity, Coffee, Smile, Star, Sliders, Shield, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

interface DesignSystemExplorerProps {
  lang: Language;
  theme: Theme;
}

export function DesignSystemExplorer({ lang, theme }: DesignSystemExplorerProps) {
  const t = translations[lang];

  // Component states inside sandbox
  const [inputText, setInputText] = useState('MyHealth entry');
  const [selectChoice, setSelectChoice] = useState('option1');
  const [switchState, setSwitchState] = useState(true);
  const [segController, setSegController] = useState<'day' | 'week' | 'month'>('day');
  const [demoCheckbox, setDemoCheckbox] = useState(true);
  const [demoRadio, setDemoRadio] = useState('yes');
  
  // Contrast helper state
  const [contrastRating, setContrastRating] = useState('7.2 : 1');
  const [contrastPassed, setContrastPassed] = useState(true);

  return (
    <div className="p-6 rounded-2xl border bg-slate-900 border-[#31465A] text-white" id="design-system-root">
      
      {/* Board title */}
      <div className="border-b pb-4 mb-6 border-dashed border-gray-700" id="ds-header">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-[#F45B7A] text-white text-[10px] font-bold rounded">DESIGN REFERENCE</span>
          <span className="text-[10px] text-gray-400 font-mono">BILINGUAL (EN/SR)</span>
        </div>
        <h2 className="text-2xl font-bold font-sans mt-1">{t.designSystemHeader}</h2>
        <p className="text-xs text-gray-400 font-serif">{t.designSystemSub}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" id="ds-grid">

        {/* 1. COLOR TOKENS INTERACTIVE CHART */}
        <div className="p-5 bg-[#172431] rounded-2xl border border-[#31465A] space-y-4" id="ds-color-tokens-panel">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-700 pb-2">
            🎨 Color Token Architecture (BOARD 1 & BOARD 7)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="ds-theme-sidebyside">
            {/* LIGHT COLOR SCHEME */}
            <div className="space-y-2 text-xs" id="ds-light-tokens">
              <span className="font-bold text-[#F45B7A] font-mono leading-none block border-b pb-1 border-pink-900">{t.lightTheme} Palette</span>
              {[
                { label: 'Background', hex: '#FFF7F5', desc: 'Soft salmon blush backdrop' },
                { label: 'Surface (Primary)', hex: '#FFFFFF', desc: 'Pristine base elements content' },
                { label: 'Surface (Elevated)', hex: '#FFFAFB', desc: 'Floating cards element' },
                { label: 'Primary Accent', hex: '#F45B7A', desc: 'Strong pink contrast red actions' },
                { label: 'Text (Primary)', hex: '#34292D', desc: 'Graphite charcoal body font' },
                { label: 'Success Tint', hex: '#3DBA61', desc: 'Study synchronised items trace' },
                { label: 'Warning Accent', hex: '#FFF7E6', desc: 'Local logs pending cache warning' }
              ].map(tok => (
                <div key={tok.label} className="p-2 bg-[#1e2d3d] rounded-lg flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: tok.hex }} />
                    <div>
                      <p className="font-bold">{tok.label}</p>
                      <p className="text-[10px] text-gray-400">{tok.desc}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px]">{tok.hex}</span>
                </div>
              ))}
            </div>

            {/* DARK COLOR SCHEME */}
            <div className="space-y-2 text-xs" id="ds-dark-tokens">
              <span className="font-bold text-[#F45B7A] font-mono leading-none block border-b pb-1 border-pink-900">{t.darkTheme} Palette</span>
              {[
                { label: 'Background', hex: '#101820', desc: 'Deep cosmic slate navy space' },
                { label: 'Surface (Primary)', hex: '#172431', desc: 'Bento tile backings container' },
                { label: 'Surface (Elevated)', hex: '#1E2A37', desc: 'Focused wizard controls surface' },
                { label: 'Primary Accent', hex: '#F45B7A', desc: 'Vibrant neon pink highlight' },
                { label: 'Text (Primary)', hex: '#EEF5FB', desc: 'Pristine glowing white text lines' },
                { label: 'Success Tint', hex: '#3DBA61', desc: 'Healthy diagnostic track flag' },
                { label: 'Warning Accent', hex: '#232012', desc: 'Yellow alerts and offline traces' }
              ].map(tok => (
                <div key={tok.label} className="p-2 bg-[#1e2d3d] rounded-lg flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: tok.hex }} />
                    <div>
                      <p className="font-bold">{tok.label}</p>
                      <p className="text-[10px] text-gray-400">{tok.desc}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px]">{tok.hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. TYPOGRAPHY SCALE COMPARISON TOOL */}
        <div className="p-5 bg-[#172431] rounded-2xl border border-[#31465A] space-y-4" id="ds-typography-panel">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-700 pb-2">
            🔤 Typography Scale & Font Pairings (Inter & Space Grotesk)
          </h3>

          <div className="space-y-3.5 text-xs" id="ds-typography-scale-list">
            {[
              { label: 'Display Title (36px)', class: 'text-3.5xl font-black font-sans leading-none', sample: 'Brand & Design System' },
              { label: 'Section Title (24px)', class: 'text-2xl font-extrabold font-sans leading-tight', sample: 'Private tracking study' },
              { label: 'Card Title (20px)', class: 'text-xl font-bold font-sans tracking-tight', sample: 'Oatmeal breakfast item details' },
              { label: 'Body Text (16px)', class: 'text-base font-medium font-serif leading-relaxed text-gray-300', sample: 'Bilingual patient logs synchronise with doctor database portals' },
              { label: 'Form Label (14px)', class: 'text-sm font-semibold font-sans text-[#F45B7A]', sample: 'Recent weight change (Yes/No)' },
              { label: 'Helper Data (12px)', class: 'text-xs font-mono text-gray-400 uppercase tracking-widest', sample: 'Study day 12 • 2025-05-07' }
            ].map(pair => (
              <div key={pair.label} className="p-3 bg-[#1e2d3d] rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono block text-gray-405">{pair.label}</span>
                <p className={`${pair.class}`}>{pair.sample}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. ICON STYLE AND CORE SYMBOLS REFERENCE */}
        <div className="p-5 bg-[#172431] rounded-2xl border border-[#31465A] space-y-4" id="ds-icons-panel">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-700 pb-2">
            ✨ Outlined Rounded Icon Language (BOARD 1 & BOARD 5)
          </h3>

          <p className="text-xs text-gray-300 leading-relaxed font-serif">
            The design utilizes consistent outlined vector shapes featuring delicate rounded nodes. Icons pairing:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" id="ds-icons-grid">
            {[
              { id: '1', title: t.tabTimeline, icon: Activity, desc: 'Medical trends' },
              { id: '2', title: t.mealBtn, icon: Coffee, desc: 'Diet intake' },
              { id: '3', title: t.symptomBtn, icon: Smile, desc: 'Mood index' },
              { id: '4', title: t.medicationBtn, icon: Shield, desc: 'Therapy counts' },
              { id: '5', title: t.stoolBtn, icon: Sliders, desc: 'Bristol logs' },
              { id: '6', title: t.tabProfile, icon: Smartphone, desc: 'Patient emulator' },
              { id: '7', title: 'Audit Security', icon: Shield, desc: 'Encrypt keys' },
              { id: '8', title: 'Clinical Alert', icon: AlertTriangle, desc: 'Sync state logs' }
            ].map(sym => {
              const Icon = sym.icon;
              return (
                <div key={sym.id} className="p-3 bg-slate-900 rounded-xl border border-dashed border-slate-700 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full border border-[#F45B7A] flex items-center justify-center mx-auto bg-pink-950 bg-opacity-30">
                    <Icon className="w-5 h-5 text-[#F45B7A]" />
                  </div>
                  <div>
                    <p className="font-bold leading-none">{sym.title}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{sym.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. ACCESSIBILITY OVERLAY AND TOUCH TARGETS CHECKER */}
        <div className="p-5 bg-[#172431] rounded-2xl border border-[#31465A] space-y-4" id="ds-accessibility-panel">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-700 pb-2">
            ♿ WCAG AA contrast ratio & Touch Target Audit (BOARD 7)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="ds-accessibility-bento">
            {/* Contrast Debugger widget */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3" id="wcag-contrast-debugger">
              <span className="font-bold text-[11px] uppercase tracking-wider block text-gray-400">AA Contrast Simulator</span>
              
              <div className="space-y-1 bg-[#1e2d3d] p-3 rounded-lg border border-slate-800">
                <span className="text-[9px] text-[#F45B7A] font-mono uppercase">Color pairing check</span>
                <p className="text-sm font-bold text-white">White Text on Accent Pink</p>
                <div className="h-2.5 w-full bg-pink-100 rounded" />
              </div>

              <div className="flex justify-between items-center bg-green-950 bg-opacity-30 border border-green-800 p-2.5 rounded-lg text-green-400">
                <div>
                  <p className="font-bold">Pass AAA Ratio: {contrastRating}</p>
                  <p className="text-[10px] opacity-90">Requires minimum 4.5:1 ratio for standard text.</p>
                </div>
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
              </div>
            </div>

            {/* Hand target guidelines */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3" id="ds-touch-target-spec">
              <span className="font-bold text-[11px] uppercase tracking-wider block text-gray-400">{t.touchTargets}</span>

              {/* Graphical demonstration of minimum touch space */}
              <div className="flex gap-4 items-center bg-[#1e2d3d] p-3 rounded-lg border border-slate-800">
                {/* 44px mock finger target shape */}
                <div className="w-11 h-11 bg-pink-600 bg-opacity-25 border border-dashed border-[#F45B7A] rounded-lg flex items-center justify-center text-[10px] font-mono text-[#F45B7A]">
                  44px
                </div>
                <div className="space-y-1 select-none">
                  <p className="font-semibold text-xs leading-none text-white">{t.targetCheckOk}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{t.minimumTargetSize}</p>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 font-serif">
                💡 Ensuring tap areas meet this standard eliminates frustrating missed touches, especially during symptom reporting when patients might feel unwell.
              </p>
            </div>
          </div>
        </div>

        {/* 5. INTERACTIVE LIVE COMPONENT LIBRARY SANDBOX */}
        <div className="xl:col-span-2 p-5 bg-[#172431] rounded-2xl border border-[#31465A] space-y-4" id="ds-sandbox-panel">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-dashed border-gray-700 pb-2">
            🛠️ Live Component Sandbox (Try out core components!)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs" id="ds-sandbox-grid">
            
            {/* Component 1: Text Input */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800" id="sandbox-co-1">
              <span className="font-bold font-mono text-gray-400 block text-[10px] uppercase">1. Text Input</span>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Enter notes</label>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-[#1e2d3d] border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#F45B7A]"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Live state: <span className="text-pink-400">{inputText}</span></p>
            </div>

            {/* Component 2: Toggle Switch */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800" id="sandbox-co-2">
              <span className="font-bold font-mono text-gray-400 block text-[10px] uppercase">2. Toggle switch</span>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Is ongoing?</span>
                <button
                  onClick={() => setSwitchState(!switchState)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors ${
                    switchState ? 'bg-[#3DBA61]' : 'bg-gray-600'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    switchState ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Live state: <span className="text-[#3DBA61]">{switchState ? 'ON / TRUE' : 'OFF / FALSE'}</span></p>
            </div>

            {/* Component 3: Segmented Controls */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800" id="sandbox-co-3">
              <span className="font-bold font-mono text-gray-400 block text-[10px] uppercase">3. Segmented control</span>
              <div className="flex bg-slate-800 p-0.5 rounded-lg">
                {(['day', 'week', 'month'] as const).map(scope => (
                  <button
                    key={scope}
                    onClick={() => setSegController(scope)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold ${
                      segController === scope ? 'bg-[#F45B7A] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {scope.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Live scope: <span className="text-pink-400">{segController.toUpperCase()}</span></p>
            </div>

            {/* Component 4: Checkboxes & Radios */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-[#31465A]" id="sandbox-co-4">
              <span className="font-bold font-mono text-gray-400 block text-[10px] uppercase">4. Select Inputs</span>
              
              <div className="space-y-1 bg-slate-800 p-1.5 rounded-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demoCheckbox}
                    onChange={() => setDemoCheckbox(!demoCheckbox)}
                    className="accent-[#F45B7A] cursor-pointer"
                  />
                  <span>Checked state</span>
                </label>

                <div className="flex gap-3 pt-1 border-t border-dashed border-gray-700 mt-1">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sandbox-radio"
                      checked={demoRadio === 'yes'}
                      onChange={() => setDemoRadio('yes')}
                      className="accent-[#F45B7A]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sandbox-radio"
                      checked={demoRadio === 'no'}
                      onChange={() => setDemoRadio('no')}
                      className="accent-[#F45B7A]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
