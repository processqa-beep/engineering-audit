'use client';

import React, { useState } from 'react';
import {
  Settings,
  HardDrive,
  Cloud,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Send,
  AlertCircle,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { StorageEngine } from '../lib/storageEngine';
import { GasBackendClient } from '../lib/gasBackend';
import { SystemSettings } from '../lib/types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(() => StorageEngine.getSettings());
  const [testEmailAddr, setTestEmailAddr] = useState<string>('mehul.chikhaliya@borosil.com');
  const [copied, setCopied] = useState<boolean>(false);
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
      addLog('Diagnosis', 'warn', '👉 Code.gs has NOT been redeployed yet, OR the URL is wrong. Follow the redeploy steps below.');
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
      addLog('Diagnosis', 'warn', '👉 Code.gs has NOT been redeployed. The old script does not know about AUDIT_HEADER action.');
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

  const codeGsSnippet = `/**
 * PLANT ENGINEERING AUDIT PORTAL — GOOGLE APPS SCRIPT BACKEND
 * Architecture: Vercel (Frontend) → JSONP GET → Google Apps Script → Google Sheets + Drive
 *
 * Supports BOTH:
 * 1. Container-bound scripts (created from Google Sheet -> Extensions -> Apps Script)
 * 2. Standalone scripts (created at script.google.com) - auto finds or creates Engineering_Audit_Database sheet!
 */

var SPREADSHEET_ID = "1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0";

// ──────────────────────────────────────────────────────────────────────────────
// SPREADSHEET RESOLVER
// ──────────────────────────────────────────────────────────────────────────────
function getDatabaseSpreadsheet(e) {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 5) {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
  } catch (err) {}
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (err) {}

  try {
    var explicitId = (e && e.parameter && e.parameter.sheetId) ? e.parameter.sheetId.trim() : '';
    if (explicitId) {
      return SpreadsheetApp.openById(explicitId);
    }
  } catch (err) {}

  try {
    var files = DriveApp.getFilesByName('Engineering_Audit_Database');
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        return SpreadsheetApp.open(file);
      }
    }
  } catch (err) {}

  try {
    var newSS = SpreadsheetApp.create('Engineering_Audit_Database');
    return newSS;
  } catch (err) {}

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// ROUTER (JSONP GET)
// ──────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  var result;
  try {
    var action   = (e.parameter && e.parameter.action) ? e.parameter.action : 'PING';
    var callback = (e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    var ss       = getDatabaseSpreadsheet(e);

    if (!ss && action !== 'SEND_TEST_EMAIL') {
      result = {
        status: 'ERROR',
        message: 'Could not connect to Google Sheet. If using standalone Apps Script, run the script once in Apps Script editor to grant Drive permissions.'
      };
    } else if (action === 'PING') {
      result = {
        status: 'SUCCESS',
        message: 'Connected to ' + ss.getName(),
        sheetName: ss.getName(),
        sheetId: ss.getId(),
        sheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      };

    } else if (action === 'GET_CHECKPOINTS' || action === 'getMasterData' || action === 'syncMasterData') {
      result = handleGetCheckpoints(ss);

    } else if (action === 'GET_AUDITS' || action === 'getAuditHistory') {
      result = handleGetAudits(ss);

    } else if (action === 'GET_ACTIONS') {
      result = handleGetActions(ss);

    } else if (action === 'SEND_TEST_EMAIL') {
      var email = (e.parameter && e.parameter.email) ? e.parameter.email : 'mehul.chikhaliya@borosil.com';
      sendTestNotificationEmail(email);
      result = { status: 'SUCCESS', message: 'Test email sent to ' + email };

    } else if (action === 'AUDIT_HEADER') {
      var header = JSON.parse(e.parameter.payload || '{}');
      result = handleAuditHeader(ss, header);

    } else if (action === 'AUDIT_RESULTS') {
      var data = JSON.parse(e.parameter.payload || '{}');
      result = handleAuditResults(ss, data.auditId, data.results || []);

    } else if (action === 'AUDIT_ACTIONS') {
      var data2 = JSON.parse(e.parameter.payload || '{}');
      result = handleAuditActions(ss, data2.auditId, data2.actions || []);

    } else if (action === 'UPDATE_ACTION') {
      var payload = JSON.parse(e.parameter.payload || '{}');
      result = handleUpdateAction(ss, payload);

    } else {
      result = { status: 'ERROR', message: 'Unknown action: ' + action };
    }

  } catch (err) {
    result = { status: 'ERROR', message: err.toString() };
  }

  var json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss   = getDatabaseSpreadsheet(e);
    var data = (e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    var act  = data.action || 'AUDIT_HEADER';
    if (!ss) return respond({ status: 'ERROR', message: 'Spreadsheet not accessible' });
    if (act === 'AUDIT_HEADER')  return respond(handleAuditHeader(ss, data));
    if (act === 'AUDIT_RESULTS') return respond(handleAuditResults(ss, data.auditId, data.results || []));
    if (act === 'AUDIT_ACTIONS') return respond(handleAuditActions(ss, data.auditId, data.actions || []));
    if (act === 'UPDATE_ACTION') return respond(handleUpdateAction(ss, data));
    return respond({ status: 'ERROR', message: 'Unknown action' });
  } catch (err) {
    return respond({ status: 'ERROR', message: err.toString() });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleAuditHeader(ss, header) {
  var sheet = ss.getSheetByName('Audit_Master');
  if (!sheet) {
    sheet = ss.insertSheet('Audit_Master');
    sheet.appendRow([
      'Audit ID','Date','Time','Section','Sub-Section','Line','Equipment',
      'Auditor','Total Points','OK','NG','Observation','N/A','Compliance %',
      'Overall Status','Drive Folder ID','Drive Folder URL','Submitted At'
    ]);
    sheet.setFrozenRows(1);
  }

  var folderInfo = createAuditDriveFolderHierarchy(header.auditId, header.date);

  var data   = sheet.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(header.auditId)) { rowIdx = i + 1; break; }
  }

  var row = [
    header.auditId,
    header.date,
    header.time,
    header.sectionName  || header.sectionId,
    header.subSectionName || header.subSectionId,
    header.lineName     || header.lineId,
    header.equipmentName || header.equipmentId,
    header.auditorName,
    header.totalCheckpoints,
    header.okCount,
    header.ngCount,
    header.obsCount,
    header.naCount,
    header.compliancePercent,
    header.overallStatus,
    folderInfo.folderId,
    folderInfo.folderUrl,
    new Date().toISOString()
  ];

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { status: 'SUCCESS', auditId: header.auditId, driveFolderId: folderInfo.folderId, driveFolderUrl: folderInfo.folderUrl };
}

function handleAuditResults(ss, auditId, results) {
  var sheet = ss.getSheetByName('Audit_Details');
  if (!sheet) {
    sheet = ss.insertSheet('Audit_Details');
    sheet.appendRow([
      'Audit ID','Sr No.','Section','Sub-Section','Line','Equipment','Component',
      'Checkpoint','Standard Parameter','Actual Value','Status',
      'Observation Notes','Recommended Action','Photo URL',
      'Critical','Auditor','Timestamp'
    ]);
    sheet.setFrozenRows(1);
  }

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    sheet.appendRow([
      auditId,
      r.srNo      || (i + 1),
      r.sectionName    || '',
      r.subSectionName || '',
      r.lineName       || '',
      r.equipmentName  || '',
      r.componentName  || '',
      r.checkpointText || '',
      r.standardParameter || '',
      r.actualValue    || '',
      r.status         || '',
      r.observationNotes  || '',
      r.recommendedAction || '',
      r.photoUrl       || '',
      r.isCritical ? 'Yes' : 'No',
      r.auditor        || '',
      r.timestamp      || new Date().toISOString()
    ]);
  }

  return { status: 'SUCCESS', auditId: auditId, rowsAdded: results.length };
}

function handleAuditActions(ss, auditId, actions) {
  if (!actions || actions.length === 0) return { status: 'SUCCESS', message: 'No actions to save.' };

  var sheet = ss.getSheetByName('Action_Tracker');
  if (!sheet) {
    sheet = ss.insertSheet('Action_Tracker');
    sheet.appendRow([
      'Action ID','Audit ID','Section','Sub-Section','Line','Equipment','Component',
      'Checkpoint','Observation','Recommended Action','Priority','Status',
      'Target Date','Responsible Person','Closure Remark','Closure Photo','Closed Date','Created At'
    ]);
    sheet.setFrozenRows(1);
  }

  for (var i = 0; i < actions.length; i++) {
    var a = actions[i];
    sheet.appendRow([
      a.actionId || ('ACT-' + Date.now() + '-' + i),
      auditId,
      a.sectionName    || '',
      a.subSectionName || '',
      a.lineName       || '',
      a.equipmentName  || '',
      a.componentName  || '',
      a.checkpointText || '',
      a.observation    || '',
      a.recommendedAction || '',
      a.priority       || 'Medium',
      a.status         || 'Open',
      a.targetDate     || '',
      '',
      '',
      '',
      '',
      new Date().toISOString()
    ]);
  }

  try {
    sendDeviationAlertEmail(auditId, actions);
  } catch (mailErr) {
    Logger.log('Email error: ' + mailErr);
  }

  return { status: 'SUCCESS', auditId: auditId, actionsAdded: actions.length };
}

function handleGetCheckpoints(ss) {
  var sheet = ss.getSheetByName('Checkpoint_Master');
  if (!sheet) sheet = ss.getSheetByName('Checkpoints') || ss.getSheets()[0];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'SUCCESS', checkpoints: [] };

  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

  function col(names) {
    for (var n = 0; n < names.length; n++) {
      for (var h = 0; h < headers.length; h++) {
        if (headers[h] === names[n] || headers[h].indexOf(names[n]) >= 0) return h;
      }
    }
    return -1;
  }

  var srIdx    = col(['sr no.','sr no','sr_no']);
  var secIdx   = col(['section']);
  var subIdx   = col(['sub section','sub-section','subsection']);
  var lineIdx  = col(['applicable lines','applicable line','lines','line / machine','line/machine','line']);
  var compIdx  = col(['component name','component']);
  var ckIdx    = col(['checkpoint','activities to be followed','audit point']);
  var specIdx  = col(['standard parameter','specification','standard']);
  var minIdx   = col(['min','minimum']);
  var maxIdx   = col(['max','maximum']);
  var unitIdx  = col(['unit']);
  var critIdx  = col(['criticality','severity']);
  var activeIdx= col(['active']);

  var checkpoints = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ck  = ckIdx >= 0 ? String(row[ckIdx]).trim() : '';
    if (!ck) continue;

    var isActiveRaw = activeIdx >= 0 ? String(row[activeIdx]).trim().toLowerCase() : 'yes';
    if (isActiveRaw === 'no' || isActiveRaw === 'false') continue;

    var linesRaw = lineIdx >= 0 ? String(row[lineIdx]).trim() : 'ALL';
    var appLines = (!linesRaw || linesRaw.toLowerCase() === 'all')
      ? ['ALL']
      : linesRaw.split(/[,;]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });

    var crit = critIdx >= 0 ? String(row[critIdx]).trim() : 'Medium';

    checkpoints.push({
      id:               'CKP-GS-' + i,
      srNo:             srIdx >= 0 ? (Number(row[srIdx]) || i) : i,
      sectionId:        secIdx >= 0 ? String(row[secIdx]).trim() : '',
      sectionName:      secIdx >= 0 ? String(row[secIdx]).trim() : '',
      subSectionId:     subIdx >= 0 ? String(row[subIdx]).trim() : '',
      subSectionName:   subIdx >= 0 ? String(row[subIdx]).trim() : '',
      lineId:           appLines[0] || 'ALL',
      lineName:         appLines[0] || 'ALL',
      componentName:    compIdx >= 0 ? String(row[compIdx]).trim() : '',
      checkpointText:   ck,
      standardParameter: specIdx >= 0 ? String(row[specIdx]).trim() : '',
      parameterType:    (minIdx >= 0 && row[minIdx] !== '') || (maxIdx >= 0 && row[maxIdx] !== '') ? 'NUMBER' : 'OK_NG',
      minimum:          minIdx >= 0 && row[minIdx] !== '' ? Number(row[minIdx]) : undefined,
      maximum:          maxIdx >= 0 && row[maxIdx] !== '' ? Number(row[maxIdx]) : undefined,
      unit:             unitIdx >= 0 ? String(row[unitIdx]).trim() : '',
      applicableLines:  appLines,
      criticality:      crit,
      isCritical:       crit.toLowerCase() === 'critical',
      active:           true
    });
  }

  return { status: 'SUCCESS', checkpoints: checkpoints, total: checkpoints.length };
}

function handleGetAudits(ss) {
  var sheet = ss.getSheetByName('Audit_Master');
  if (!sheet) return { status: 'SUCCESS', audits: [] };
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'SUCCESS', audits: [] };
  var audits = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var r = data[i];
    audits.push({ auditId: r[0], date: r[1], section: r[3], subSection: r[4], line: r[5], auditor: r[7], compliance: r[13], status: r[14] });
  }
  return { status: 'SUCCESS', audits: audits };
}

function handleGetActions(ss) {
  var sheet = ss.getSheetByName('Action_Tracker');
  if (!sheet) return { status: 'SUCCESS', actions: [] };
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'SUCCESS', actions: [] };
  var actions = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    actions.push({ actionId: r[0], auditId: r[1], section: r[2], component: r[6], checkpoint: r[7], status: r[11], priority: r[10] });
  }
  return { status: 'SUCCESS', actions: actions };
}

function handleUpdateAction(ss, data) {
  var sheet = ss.getSheetByName('Action_Tracker');
  if (!sheet) return { status: 'ERROR', message: 'Action_Tracker sheet not found' };
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.actionId)) {
      if (data.status)         sheet.getRange(i + 1, 12).setValue(data.status);
      if (data.closureRemark)  sheet.getRange(i + 1, 15).setValue(data.closureRemark);
      if (data.closurePhotoUrl) sheet.getRange(i + 1, 16).setValue(data.closurePhotoUrl);
      if (data.status === 'Closed') sheet.getRange(i + 1, 17).setValue(new Date().toISOString().substring(0, 10));
      return { status: 'SUCCESS' };
    }
  }
  return { status: 'ERROR', message: 'Action ID not found: ' + data.actionId };
}

function createAuditDriveFolderHierarchy(auditId, dateStr) {
  try {
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var year  = dateStr ? dateStr.substring(0, 4) : String(new Date().getFullYear());
    var mIdx  = dateStr ? (Number(dateStr.substring(5, 7)) - 1) : new Date().getMonth();
    var month = monthNames[mIdx] || 'Unknown';

    var root    = getOrCreateFolder(DriveApp.getRootFolder(),   'Engineering Audit System');
    var records = getOrCreateFolder(root,    'Audit Records');
    var yearF   = getOrCreateFolder(records, year);
    var monthF  = getOrCreateFolder(yearF,   month);
    var auditF  = getOrCreateFolder(monthF,  auditId);
    getOrCreateFolder(auditF, 'Photos');

    return { folderId: auditF.getId(), folderUrl: auditF.getUrl() };
  } catch (err) {
    Logger.log('Drive folder error: ' + err);
    return { folderId: '', folderUrl: '' };
  }
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function sendDeviationAlertEmail(auditId, actions) {
  var criticals = actions.filter(function(a) { return a.priority === 'Critical'; });
  if (criticals.length === 0) return;

  var subject = '⚠️ CRITICAL AUDIT DEVIATION — ' + auditId;
  var body    = 'Critical deviations found in Audit ' + auditId + ':\n\n';
  criticals.forEach(function(a, i) {
    body += (i + 1) + '. Component: ' + a.componentName + '\n';
    body += '   Checkpoint: ' + a.checkpointText + '\n';
    body += '   Observation: ' + a.observation + '\n\n';
  });
      });
    }

    htmlBody += '</tbody></table>' +
      '<div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #4f46e5; font-size: 12px;"><strong>General Comments:</strong><br/><p style="margin: 4px 0 0 0;">Benteler Line Audit completed by Process QA. Maintenance team requested to take immediate corrective action.</p></div>' +
      '</div>';

    sendProcessQaEmailDirect(recipientList, subject, plainBody, htmlBody);
  } catch (err) { Logger.log("Mail Error: " + err.toString()); }
}

function sendProcessQaEmailDirect(recipients, subject, plainBody, htmlBody) {
  try {
    var mailObj = { to: recipients, subject: subject, body: plainBody, name: "Process QA Department", replyTo: "process.qa@borosil.com" };
    if (htmlBody) mailObj.htmlBody = htmlBody;
    MailApp.sendEmail(mailObj);
  } catch (e1) {
    try {
      var options = { name: "Process QA Department", replyTo: "process.qa@borosil.com" };
      if (htmlBody) options.htmlBody = htmlBody;
      GmailApp.sendEmail(recipients, subject, plainBody, options);
    } catch (e2) { Logger.log("Email Delivery Failed: " + e2.toString()); }
  }
}

function handleUploadPhoto(base64Data, fileName, folderId) {
  var folder = folderId ? DriveApp.getFolderById(folderId) : getOrCreateSubfolder(getOrCreateMasterFolder(), "Photos");
  var parts = base64Data.split(",");
  var decoded = Utilities.base64Decode(parts[1]);
  var blob = Utilities.newBlob(decoded, parts[0].split(";")[0].replace("data:", ""), fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { success: true, fileId: file.getId(), webViewLink: file.getUrl() };
}

function getOrCreateSubfolder(parent, name) {
  var f = parent.getFoldersByName(name);
  return f.hasNext() ? f.next() : parent.createFolder(name);
}

function readSheetData(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) return [];
  var d = s.getDataRange().getValues();
  if (d.length <= 1) return [];
  var h = d[0], res = [];
  for (var i = 1; i < d.length; i++) {
    var obj = {};
    for (var j = 0; j < h.length; j++) obj[h[j]] = d[i][j];
    res.push(obj);
  }
  return res;
}

function appendObjectToSheet(ss, name, obj) {
  var s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  var last = s.getLastRow();
  var h = last === 0 ? Object.keys(obj) : s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  if (last === 0) s.appendRow(h);
  s.appendRow(h.map(function(k){ return obj[k] !== undefined ? obj[k] : ""; }));
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeGsSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>PROCESS QA DEPLOYMENT (process.qa@borosil.com)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Executed under Process QA Admin account (<code>process.qa@borosil.com</code>) to send alert emails to <code>mehul.chikhaliya@borosil.com</code>.
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

      {/* Deploy Steps Card */}
      <div className="bg-amber-50/80 border border-amber-300 p-6 rounded-2xl space-y-3 shadow-sm">
        <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>IMPORTANT: How to update Google Apps Script for Rich HTML Deviation Emails & Photos</span>
        </h3>
        <ol className="text-xs text-slate-800 space-y-2 list-decimal list-inside font-semibold leading-relaxed">
          <li>
            Open <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold inline-flex items-center space-x-1"><span>script.google.com</span> <ExternalLink className="w-3 h-3" /></a> logged in as <code>process.qa@borosil.com</code>.
          </li>
          <li>Copy the updated <strong className="text-indigo-700">Code.gs</strong> snippet below, paste it, and save (💾).</li>
          <li>Click <strong className="text-slate-900">Deploy $\rightarrow$ Manage Deployments $\rightarrow$ Edit (pencil) $\rightarrow$ New Version $\rightarrow$ Deploy</strong>.</li>
          <li>Ensure: <strong>Execute as: Me (process.qa@borosil.com)</strong> &amp; <strong>Who has access: Anyone within BOROSIL</strong>.</li>
        </ol>
      </div>

      {/* Google Service Account Direct API Configuration */}
      <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-indigo-700 uppercase tracking-wider flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <span>🌟 Google Cloud Service Account (Direct Enterprise APIs)</span>
          </h3>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Recommended
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Bypasses Google Workspace corporate cookie restrictions. Communicates directly with the <strong>Google Drive API v3</strong> &amp; <strong>Google Sheets API v4</strong> for instant photo uploads and sheet syncing.
        </p>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
          <div className="font-bold text-slate-800 flex items-center space-x-1.5">
            <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
            <span>2-Minute Setup Steps:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-700 ml-1">
            <li>In <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Google Cloud Console</a>: Enable <strong>Google Sheets API</strong> &amp; <strong>Google Drive API</strong>.</li>
            <li>Go to <strong>IAM &amp; Admin $\rightarrow$ Service Accounts $\rightarrow$ Create Service Account</strong>.</li>
            <li>Click <strong>Keys $\rightarrow$ Add Key $\rightarrow$ Create New Key (JSON)</strong>.</li>
            <li>Share your Google Sheet (<code>{settings.googleSheetId || '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0'}</code>) with your Service Account email as <strong>Editor</strong>.</li>
          </ol>
        </div>

        <div className="space-y-3 text-xs pt-1">
          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Service Account Email (client_email)
            </label>
            <input
              type="text"
              placeholder="e.g. audit-service@your-project.iam.gserviceaccount.com"
              value={settings.serviceAccountEmail || ''}
              onChange={(e) => setSettings({ ...settings, serviceAccountEmail: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">
              Private Key (private_key from JSON)
            </label>
            <textarea
              rows={3}
              placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD..."
              value={settings.serviceAccountPrivateKey || ''}
              onChange={(e) => setSettings({ ...settings, serviceAccountPrivateKey: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-mono font-semibold focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={pingResult?.testing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{pingResult?.testing ? 'Testing API...' : 'Test Service Account Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Form Card */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
        <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center space-x-2">
          <HardDrive className="w-4 h-4" />
          <span>Google Apps Script Web App Deployment URL (Fallback)</span>
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

      {/* Code.gs Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-indigo-600" />
              <span>Google Apps Script Backend (Code.gs)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              1-click copy Process QA Apps Script code.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-indigo-600" />}
            <span>{copied ? 'Copied Code!' : 'Copy Code.gs'}</span>
          </button>
        </div>

        <pre className="bg-slate-900 p-4 rounded-xl text-slate-200 font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
          {codeGsSnippet}
        </pre>
      </div>
    </div>
  );
};
