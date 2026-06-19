/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Trash2, Copy, Check, Download, AlertTriangle, ShieldCheck, History, RefreshCw, Eye, Sparkles, Info } from 'lucide-react';
import { translations } from '../translations';
import { Language, Theme, InviteCode, PatientEntry, ExportSetup, getPatientEntryDetails } from '../types';
import { initialInviteCodes, mockPatients } from '../data';

interface DoctorDashboardProps {
  lang: Language;
  theme: Theme;
  entries: PatientEntry[];
  inviteCodes: InviteCode[];
  setInviteCodes: (codes: InviteCode[]) => void;
  isOffline: boolean;
}

export function DoctorDashboard({
  lang,
  theme,
  entries,
  inviteCodes,
  setInviteCodes,
  isOffline
}: DoctorDashboardProps) {
  const t = translations[lang];
  const isDark = theme === 'dark';

  // Roster states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('P-001');
  const [patientFilter, setPatientFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Code Generator states
  const [copiedCodeCode, setCopiedCodeCode] = useState<string | null>(null);
  const [newGeneratedCode, setNewGeneratedCode] = useState('');

  // Export Wizard states
  const [exportStep, setExportStep] = useState<1 | 2 | 3>(1);
  const [exportPeriod, setExportPeriod] = useState<'all' | 'current_month' | 'selected_day'>('all');
  const [exportContent, setExportContent] = useState<'all_data' | 'all_with_images' | 'images_only'>('all_data');
  const [exportFormat, setExportFormat] = useState<'json_files' | 'raw_audit' | 'embedded_base64'>('json_files');
  const [exportProgress, setExportProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Clinician Audit logs state
  const [auditLogs, setAuditLogs] = useState<{ id: string; time: string; event: string; ip: string; status: string }[]>([
    { id: '1', time: '2025-05-07 10:15', event: 'Invite generated (Code X7Q2-M9RL-B4N5)', ip: '109.92.12.45', status: 'Success' },
    { id: '2', time: '2025-05-06 16:42', event: 'Patient data exported (P-001 - Period: May 1 to May 6)', ip: '109.92.12.45', status: 'Success' },
    { id: '3', time: '2025-05-05 09:20', event: 'Patient invite code K3PW-BDTA-G1J2 redeemed by Ana Vuković', ip: '109.92.14.88', status: 'Success' }
  ]);

  // Generate unique randomized mock code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let segments = [];
    for (let s = 0; s < 3; s++) {
      let segment = '';
      for (let i = 0; i < 4; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    const finalCode = segments.join('-');
    setNewGeneratedCode(finalCode);

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 7);

    const newCodeItem: InviteCode = {
      code: finalCode,
      created: now.toISOString().split('T')[0],
      expires: expiry.toISOString().split('T')[0],
      status: 'Unused'
    };

    setInviteCodes([newCodeItem, ...inviteCodes]);

    // Add to clinician audit logs
    const auditObj = {
      id: `audit-${Date.now()}`,
      time: new Date().toISOString().replace('T', ' ').substring(0, 16),
      event: `Invite generated (Code ${finalCode})`,
      ip: '109.92.12.45',
      status: 'Success'
    };
    setAuditLogs([auditObj, ...auditLogs]);
  };

  const copyToClipboard = (code: string) => {
    setCopiedCodeCode(code);
    setTimeout(() => setCopiedCodeCode(null), 2000);
  };

  const revokeCode = (code: string) => {
    setInviteCodes(inviteCodes.map(c => c.code === code ? { ...c, status: 'Revoked' } : c));
  };

  // Run mock export animation
  const startExportAction = () => {
    setExporting(true);
    setExportSuccess(false);
    setExportProgress(10);

    const timer = setInterval(() => {
      setExportProgress(old => {
        if (old >= 100) {
          clearInterval(timer);
          setExporting(false);
          setExportSuccess(true);

          // Add to auditor logs
          const auditObj = {
            id: `audit-${Date.now()}`,
            time: new Date().toISOString().replace('T', ' ').substring(0, 16),
            event: `ZIP exported (Scope: ${exportContent}, Period: ${exportPeriod})`,
            ip: '109.92.12.45',
            status: 'Success'
          };
          setAuditLogs([auditObj, ...auditLogs]);

          return 100;
        }
        return old + 15;
      });
    }, 400);
  };

  // Filter cohort list
  const filteredPatients = mockPatients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = patientFilter === 'All' ||
                          (patientFilter === 'Active' && patient.status === 'Active') ||
                          (patientFilter === 'Inactive' && patient.status === 'Inactive');
    return matchesSearch && matchesFilter;
  });

  const activePatientDetails = mockPatients.find(p => p.id === selectedPatientId) || mockPatients[0];

  return (
    <div className={`p-6 rounded-2xl border ${
      isDark ? 'bg-[#101820] border-[#31465A] text-white' : 'bg-white border-[#FFF7F5] text-[#34292D]'
    }`} id="doctor-dashboard-root">

      {/* Header card info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-6 border-slate-200 border-dashed" id="dr-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#F45B7A] text-white text-[10px] uppercase font-bold rounded">Clinician Profile</span>
            <span className="text-[11px] font-mono font-bold text-green-500 animate-pulse">● System Connected</span>
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight mt-1">{t.drTitle}</h2>
          <p className="text-xs text-gray-400 font-serif">{t.researchDoctor} • Private Research Track v1.0 • 3-month pilot</p>
        </div>

        <div className="mt-3 md:mt-0 flex gap-2" id="dr-header-actions">
          <div className="px-3 py-2 bg-pink-50 text-[#F45B7A] rounded-xl text-center border border-pink-100 flex flex-col justify-center">
            <span className="text-xs font-bold leading-none">{filteredPatients.length}</span>
            <span className="text-[9px] text-gray-500 font-mono mt-0.5">Cohort Roster</span>
          </div>
          <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-center border border-blue-100 flex flex-col justify-center">
            <span className="text-xs font-bold leading-none">{entries.length}</span>
            <span className="text-[9px] text-gray-500 font-mono mt-0.5">Total Logs</span>
          </div>
        </div>
      </div>

      {/* Bento Grid layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dr-bento-grid">

        {/* BENTO COLUMN 1: Linked Patient Cohort Panel */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-[#172431] border-slate-800' : 'bg-[#FFF7F5] border-slate-100'
        }`} id="dr-bento-patients">

          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                👥 {t.findLinkedPatients}
              </h3>
              {/* Segmented controls filter tab */}
              <div className="flex bg-gray-200 bg-opacity-50 p-0.5 rounded-lg text-xs" id="dr-patient-filters">
                {(['All', 'Active', 'Inactive'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setPatientFilter(filter)}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      patientFilter === filter
                        ? 'bg-[#F45B7A] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-905'
                    }`}
                  >
                    {filter === 'All' ? 'Svi' : filter === 'Active' ? t.active : 'Neaktivni'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Search bar */}
            <div className="relative" id="dr-cohort-search">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#F45B7A] ${
                  isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-700'
                }`}
              />
            </div>

            {/* Patients list table */}
            <div className="overflow-x-auto rounded-xl border border-gray-150" id="dr-patients-table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF7F5] text-[10px] font-bold uppercase text-gray-400 border-b">
                  <tr>
                    <th className="p-2.5">{t.fullName}</th>
                    <th className="p-2.5">{t.patientId}</th>
                    <th className="p-2.5">{t.status}</th>
                    <th className="p-2.5">{t.lastEntry}</th>
                    <th className="p-2.5 text-center">Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                  {filteredPatients.map(patient => {
                    const isSelected = patient.id === selectedPatientId;
                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-pink-50 bg-opacity-70 font-semibold' : ''
                        }`}
                      >
                        <td className="p-2.5 flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {patient.name.split(' ').map(n=>n[0]).join('')}
                          </span>
                          <div>
                            <p className="text-gray-900">{patient.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{patient.email}</p>
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-indigo-700">{patient.id}</td>
                        <td className="p-2.5">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            patient.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className="text-[11px]">{patient.status === 'Active' ? t.active : 'Offline'}</span>
                        </td>
                        <td className="p-2.5 text-gray-550 font-serif">{patient.id === 'P-001' ? 'Today, 19:10' : patient.lastEntry}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-gray-800">
                          {patient.id === 'P-001' ? entries.length : patient.entriesCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-[11px] mt-4 rounded-xl flex gap-1.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{t.doctorAccessLevel} {t.readOnlyByDesign}</span>
          </div>
        </div>

        {/* BENTO COLUMN 2: Clinical Timeline Preview */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#172431] border-slate-800' : 'bg-[#FFF7F5] border-slate-100'
        }`} id="dr-bento-clinical-timeline">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1 border-b pb-2 mb-3">
            📋 Timeline: {activePatientDetails.name} <span className="text-indigo-600 font-mono text-xs">{activePatientDetails.id}</span>
          </h3>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 text-xs" id="dr-focused-timeline">
            {activePatientDetails.id === 'P-001' ? (
              entries.map(entry => {
                const details = getPatientEntryDetails(entry);
                return (
                  <div
                    key={details.id}
                    className="p-2.5 bg-white rounded-lg border border-gray-100 flex flex-col justify-between text-[#34292D]"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold flex items-center gap-1">
                        {entry.type === 'meal' ? '🍲' : entry.type === 'medication' ? '💊' : entry.type === 'symptom' ? '⚠️' : '📊'}
                        {details.name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono">{details.timestamp} {details.time}</span>
                    </div>
                    <p className="text-gray-500 font-serif mt-1">{details.description}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-8 text-gray-400">
                ⚠️ Demografski podaci su bezbedno anonimizovani za ovog pacijenta u nultoj fazi.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* LOWER BENTO ROW: Export center & Invite Codes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-dashed border-gray-200" id="dr-lower-bento-row">

        {/* Invite Code Manager Panel */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#172431] border-slate-800' : 'bg-white border-slate-100'
        }`} id="dr-invite-box">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex justify-between items-center border-b pb-2 mb-3">
            <span>🔑 {t.inviteCodeManagement}</span>
            <button
              onClick={generateCode}
              className="text-xs bg-[#F45B7A] hover:bg-[#eb4c6d] text-white px-2 py-1 rounded font-bold shadow-sm"
            >
              Generate Invite
            </button>
          </h3>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1" id="invite-codes-list">
            {inviteCodes.map(c => (
              <div
                key={c.code}
                className="p-2.5 bg-[#FFF7F5] border rounded-xl flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-bold font-mono tracking-wider text-[#F45B7A]">{c.code}</p>
                  <p className="text-[10px] text-gray-400">Created: {c.created} • Expiry: {c.expires}</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                    c.status === 'Unused' ? 'bg-green-150 text-green-700 border border-green-200 bg-white' :
                    c.status === 'Redeemed' ? 'bg-blue-150 text-blue-700 border border-blue-200 bg-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status === 'Unused' ? t.unused : c.status === 'Redeemed' ? t.redeemed : c.status === 'Revoked' ? t.revoked : t.expired}
                  </span>

                  {c.status === 'Unused' && (
                    <button
                      onClick={() => copyToClipboard(c.code)}
                      className="p-1 bg-white hover:bg-slate-50 border rounded"
                      title="Copy code"
                    >
                      {copiedCodeCode === c.code ? <span className="text-green-500">Copied!</span> : <Copy className="w-3" />}
                    </button>
                  )}

                  {c.status === 'Unused' && (
                    <button
                      onClick={() => revokeCode(c.code)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded font-semibold"
                    >
                      {t.revokeBtn}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Export Wizard matching Board 6 */}
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-[#172431] border-slate-800' : 'bg-white border-slate-100'
        }`} id="dr-export-box">
          <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider border-b pb-2 mb-3">
            📤 {t.exports} Setup Wizard ({exportStep} of 3)
          </h3>

          <div className="space-y-4" id="export-wizard-inner">
            {exportStep === 1 && (
              <div className="space-y-3" id="export-wizard-step-1">
                <label className="block text-xs font-bold text-gray-500">{t.exportPeriod}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'All Time' },
                    { val: 'current_month', label: t.currentPartialMonth },
                    { val: 'selected_day', label: t.selectedDay }
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => setExportPeriod(p.val as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold ${
                        exportPeriod === p.val
                          ? 'bg-[#F45B7A] text-white border-[#F45B7A]'
                          : 'bg-[#FFF7F5] border-gray-150'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setExportStep(2)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    Setup Content →
                  </button>
                </div>
              </div>
            )}

            {exportStep === 2 && (
              <div className="space-y-3" id="export-wizard-step-2">
                <label className="block text-xs font-bold text-gray-500">{t.exportContentLabel}</label>
                <div className="space-y-2">
                  {[
                    { val: 'all_data', label: t.allDataNoImages },
                    { val: 'all_with_images', label: t.allDataWithImages },
                    { val: 'images_only', label: t.imagesOnlyWithLabels }
                  ].map(c => (
                    <label key={c.val} className="flex items-center gap-2 p-2 bg-[#FFF7F5] rounded-xl border text-xs cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={exportContent === c.val}
                        onChange={() => setExportContent(c.val as any)}
                        className="accent-[#F45B7A]"
                      />
                      <span className="font-semibold">{c.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setExportStep(1)}
                    className="text-gray-500 hover:underline text-xs"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setExportStep(3)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
                  >
                    Review Setup →
                  </button>
                </div>
              </div>
            )}

            {exportStep === 3 && (
              <div className="space-y-3" id="export-wizard-step-3">
                <div className="p-3 bg-[#FFF7F5] rounded-xl border text-xs space-y-1.5" id="export-setup-summary">
                  <p className="font-bold text-gray-500">{t.exportSummary}</p>
                  <p className="text-gray-400">{t.exportSummaryDesc}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono border-t border-dashed border-gray-200">
                    <div>Scope: <span className="font-bold text-gray-800">{exportContent}</span></div>
                    <div>Period: <span className="font-bold text-gray-800">{exportPeriod}</span></div>
                    <div>Target: <span className="font-bold text-indigo-700">{activePatientDetails.id}</span></div>
                    <div>Connected: <span className="font-bold text-green-600">Secure AES-256</span></div>
                  </div>
                </div>

                {exporting && (
                  <div className="space-y-1" id="exporting-progress-indicator">
                    <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                      <div
                        className="bg-[#F45B7A] h-full transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono text-center">Export compiling: {exportProgress}%</p>
                  </div>
                )}

                {exportSuccess && (
                  <div className="p-2.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium border border-green-250 animate-bounce flex items-center gap-1.5 shadow-sm" id="export-success-indicator">
                    <span>🎉 Zip bundle package compiled successfully!</span>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setExportStep(2)}
                    className="text-gray-500 hover:underline text-xs"
                  >
                    ← Back
                  </button>
                  {exportSuccess ? (
                    <button
                      onClick={() => {
                        setExportSuccess(false);
                        setExportStep(1);
                      }}
                      className="bg-[#3DBA61] text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1 shadow-md"
                    >
                      <Download className="w-4 h-4" /> Dowload ZIP Mockup
                    </button>
                  ) : (
                    <button
                      onClick={startExportAction}
                      disabled={exporting}
                      className="bg-gradient-to-r from-indigo-600 to-[#F45B7A] text-white font-bold text-xs px-4 py-1.5 rounded-lg hover:opacity-95 shadow-md flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" /> {t.beginExport}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Clinician Audit Logs History List */}
      <div className="space-y-2 mt-6 pt-6 border-t border-dashed border-gray-200" id="dr-audit-logs">
        <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
          <History className="w-4 h-4" /> Audit Logs: Security Access Tracking
        </h3>
        <div className="overflow-y-auto max-h-[160px] text-[11px] font-mono divide-y divide-gray-100 border rounded-xl divide-opacity-40" id="audit-logs-scroll">
          {auditLogs.map(item => (
            <div key={item.id} className="p-2.5 bg-[#FFF7F5] flex justify-between items-center hover:bg-slate-50">
              <div className="flex gap-4">
                <span className="text-gray-400">{item.time}</span>
                <span className="font-bold text-indigo-800">IP: {item.ip}</span>
                <span className="text-gray-500 font-sans">{item.event}</span>
              </div>
              <span className="px-1.5 py-0.2 text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
