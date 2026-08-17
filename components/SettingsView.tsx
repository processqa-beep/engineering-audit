'use client';

import React, { useState } from 'react';
import {
  Settings,
  HardDrive,
  Check,
  RefreshCw,
  Send,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { SystemSettings } from '../lib/types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageEngine.getSettings());
  const [testEmailAddr, setTestEmailAddr] = useState<string>('mehul.chikhaliya@borosil.com');
  const [savedMessage, setSavedMessage] = useState<string>('');
  const [pingResult, setPingResult] = useState<{ testing: boolean; message?: string; error?: string } | null>(null);
  const [emailTestResult, setEmailTestResult] = useState<{ sending: boolean; message?: string; error?: string } | null>(null);
  const [diagLogs, setDiagLogs] = useState<{ step: string; status: 'running'|'ok'|'error'|'warn'; detail: string }[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageEngine.saveSettings(settings);
    setSavedMessage('Settings successfully saved to local browser storage.');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleResetDemo = () => {
    if (confirm('Are you sure you want to reset all data back to DEMO state? Any unsaved local edits will be replaced.')) {
      StorageEngine.initializeDemoData(true);
      window.location.reload();
    }
  };

  const handleTestConnection = async () => {
    const url = settings.googleAppsScriptUrl?.trim();
    if (!url) {
      setPingResult({ testing: false, error: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    setPingResult({ testing: true });
    const res = await GasBackendClient.pingEndpoint();
    if (res.success) {
      setPingResult({ testing: false, message: res.message });
    } else {
      setPingResult({ testing: false, error: res.message });
    }
  };

  // Full diagnostic — tests every GAS action step-by-step
  const runFullDiagnostic = async () => {
    const url = (StorageEngine.getSettings().googleAppsScriptUrl || '').trim();
    if (!url || !url.startsWith('https://script.google.com/')) {
      setDiagLogs([{ step: 'Setup', status: 'error', detail: 'Apps Script URL not set or invalid. Save your settings first.' }]);
      return;
    }

    setDiagRunning(true);
    const logs: typeof diagLogs = [];
    const addLog = (step: string, status: typeof logs[0]['status'], detail: string) => {
      logs.push({ step, status, detail });
      setDiagLogs([...logs]);
    };

    // Helper — raw JSONP call with visible result
    const call = async (action: string, extraParams: Record<string,string> = {}) => {
      return new Promise<any>((resolve) => {
        const cb = 'diag_' + Date.now() + '_' + Math.floor(Math.random()*9999);
        const timer = setTimeout(() => {
          delete (window as any)[cb];
          document.getElementById(cb)?.remove();
          resolve({ status: 'TIMEOUT', message: 'No response after 15s. GAS may be misconfigured or not redeployed.' });
        }, 15000);
        (window as any)[cb] = (res: any) => {
          clearTimeout(timer);
          delete (window as any)[cb];
          document.getElementById(cb)?.remove();
          resolve(res);
        };
        const sheetIdParam = (settings.googleSheetId || '').trim();
        const qs = Object.entries({ ...extraParams, action, ...(sheetIdParam ? { sheetId: sheetIdParam } : {}), callback: cb, _t: String(Date.now()) })
          .map(([k,v]) => encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
        const s = document.createElement('script');
        s.id = cb;
        s.src = url + (url.includes('?') ? '&' : '?') + qs;
        s.onerror = () => { clearTimeout(timer); delete (window as any)[cb]; resolve({ status: 'NETWORK_ERROR', message: 'Script tag load failed. Check URL.' }); };
        document.body.appendChild(s);
      });
    };

    // Step 1 — PING
    addLog('Step 1: PING', 'running', 'Testing basic connection…');
    const ping = await call('PING');
    if (ping?.status === 'SUCCESS') {
      addLog('Step 1: PING', 'ok', `✅ Connected. Sheet: "${ping.sheetName}"  (${ping.timestamp})`);
    } else {
      addLog('Step 1: PING', 'error', `❌ ${ping?.status}: ${ping?.message || 'No response'}`);
      addLog('Diagnosis', 'warn', '👉 Apps Script connection failed. Please check your Web App URL.');
      setDiagRunning(false);
      return;
    }

    // Step 2 — AUDIT_HEADER
    addLog('Step 2: AUDIT_HEADER', 'running', 'Sending test audit header…');
    const testHeader = {
      auditId: 'DIAG-TEST-' + Date.now(),
      date: new Date().toISOString().substring(0,10),
      time: new Date().toTimeString().substring(0,5),
      sectionName: 'Diagnostic Test',
      subSectionName: 'Test',
      lineName: 'Test Line',
      equipmentName: 'Test Equipment',
      auditorName: 'Diagnostic Tool',
      totalCheckpoints: 2, okCount: 1, ngCount: 1, obsCount: 0, naCount: 0,
      compliancePercent: 50,
      overallStatus: 'FAIL'
    };
    const headerRes = await call('AUDIT_HEADER', { payload: JSON.stringify(testHeader) });
    if (headerRes?.status === 'SUCCESS') {
      addLog('Step 2: AUDIT_HEADER', 'ok', `✅ Row added to Audit_Master. Drive folder: ${headerRes.driveFolderUrl || '(no URL)'}`);
    } else {
      addLog('Step 2: AUDIT_HEADER', 'error', `❌ ${headerRes?.status}: ${headerRes?.message}`);
      setDiagRunning(false);
      return;
    }

    // Step 3 — AUDIT_RESULTS
    addLog('Step 3: AUDIT_RESULTS', 'running', 'Sending 2 test result rows…');
    const testResults = [
      { srNo:1, componentName:'Test Component A', checkpointText:'Check A', standardParameter:'OK', actualValue:'OK', status:'OK', observationNotes:'', isCritical:false, auditor:'Diagnostic', timestamp: new Date().toISOString() },
      { srNo:2, componentName:'Test Component B', checkpointText:'Check B', standardParameter:'No leakage', actualValue:'LEAK FOUND', status:'NG', observationNotes:'Leak detected', isCritical:true, auditor:'Diagnostic', timestamp: new Date().toISOString() },
    ];
    const resultsRes = await call('AUDIT_RESULTS', { payload: JSON.stringify({ auditId: testHeader.auditId, results: testResults }) });
    if (resultsRes?.status === 'SUCCESS') {
      addLog('Step 3: AUDIT_RESULTS', 'ok', `✅ ${resultsRes.rowsAdded} rows added to Audit_Details.`);
    } else {
      addLog('Step 3: AUDIT_RESULTS', 'error', `❌ ${resultsRes?.status}: ${resultsRes?.message}`);
    }

    // Step 4 — AUDIT_ACTIONS
    addLog('Step 4: AUDIT_ACTIONS', 'running', 'Sending 1 test action item…');
    const testActions = [
      { actionId:'ACT-DIAG-1', componentName:'Test Component B', checkpointText:'Check B', observation:'Leak detected', priority:'Critical', status:'Open', targetDate: '' }
    ];
    const actRes = await call('AUDIT_ACTIONS', { payload: JSON.stringify({ auditId: testHeader.auditId, actions: testActions }) });
    if (actRes?.status === 'SUCCESS') {
      addLog('Step 4: AUDIT_ACTIONS', 'ok', `✅ ${actRes.actionsAdded} actions added to Action_Tracker.`);
    } else {
      addLog('Step 4: AUDIT_ACTIONS', 'error', `❌ ${actRes?.status}: ${actRes?.message}`);
    }

    addLog('Summary', 'ok', '🎉 Diagnostic complete. Check your Google Sheet — you should see a DIAG-TEST row in Audit_Master, Audit_Details, and Action_Tracker tabs.');
    setDiagRunning(false);
  };

  const handleSendTestEmail = async () => {
    const url = settings.googleAppsScriptUrl?.trim();
    if (!url) {
      setEmailTestResult({ sending: false, error: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    if (!testEmailAddr.trim()) {
      setEmailTestResult({ sending: false, error: 'Please enter a target email address.' });
      return;
    }

    setEmailTestResult({ sending: true });
    const res = await GasBackendClient.sendTestEmail(testEmailAddr.trim());
    setEmailTestResult({
      sending: false,
      message: res ? `Test email dispatched to ${testEmailAddr}!` : 'Email dispatch failed. Verify Apps Script URL.',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>SYSTEM &amp; CLOUD INTEGRATION SETTINGS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure Google Sheets, Google Drive, and automated email integration endpoints.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Sample Demo Data</span>
        </button>
      </div>

      {savedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Settings Form Card */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
        <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center space-x-2">
          <HardDrive className="w-4 h-4" />
          <span>Google Apps Script Web App Deployment URL</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Live Google Apps Script Web App Endpoint
            </label>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={settings.googleAppsScriptUrl}
              onChange={(e) => setSettings({ ...settings, googleAppsScriptUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none mb-3"
            />

            {/* Test Email Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs text-slate-700 font-extrabold shrink-0">Test Target Email:</label>
              <input
                type="email"
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                placeholder="mehul.chikhaliya@borosil.com"
                className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none"
              />
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={pingResult?.testing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{pingResult?.testing ? 'Pinging...' : 'Ping Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={emailTestResult?.sending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{emailTestResult?.sending ? 'Sending...' : 'Send Test Email'}</span>
                </button>
              </div>
            </div>
          </div>

          {pingResult?.message && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{pingResult.message}</span>
            </div>
          )}

          {pingResult?.error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{pingResult.error}</span>
            </div>
          )}

          {emailTestResult?.message && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{emailTestResult.message}</span>
            </div>
          )}

          {emailTestResult?.error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{emailTestResult.error}</span>
            </div>
          )}

          {/* ── GAS DIAGNOSTIC PANEL ─────────────────────────────────────── */}
          <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-extrabold text-white">🔬 Full GAS Diagnostic Test</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tests PING → Audit Header → Results → Actions step by step. Shows exactly what Google Apps Script returns.</p>
              </div>
              <button
                type="button"
                onClick={runFullDiagnostic}
                disabled={diagRunning}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagRunning ? 'animate-spin' : ''}`} />
                <span>{diagRunning ? 'Running…' : 'Run Diagnostic'}</span>
              </button>
            </div>

            {diagLogs.length > 0 && (
              <div className="space-y-1.5 mt-2 font-mono text-[11px]">
                {diagLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start space-x-2 px-3 py-2 rounded-lg ${
                      log.status === 'ok'      ? 'bg-emerald-900/60 text-emerald-300' :
                      log.status === 'error'   ? 'bg-rose-900/60 text-rose-300' :
                      log.status === 'warn'    ? 'bg-amber-900/60 text-amber-300' :
                      'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="shrink-0 font-bold min-w-[140px] text-slate-200">{log.step}</span>
                    <span className="break-all">{log.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {diagLogs.length === 0 && !diagRunning && (
              <p className="text-[10px] text-slate-500 text-center py-2">Click "Run Diagnostic" to test your Google Apps Script connection end-to-end.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Main Google Drive Folder Name</label>
              <input
                type="text"
                placeholder="Engineering Audit System"
                value={settings.googleDriveFolderId}
                onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition"
          >
            Save System Settings
          </button>
        </div>
      </form>
    </div>
  );
};
