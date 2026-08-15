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
        const qs = Object.entries({ ...extraParams, action, callback: cb, _t: String(Date.now()) })
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
 * ENGINEERING AUDIT SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * PROCESS QA & EQUIPMENT HEALTH PORTAL
 * --------------------------------------------------------------------------
 * Executed by: process.qa@borosil.com
 * Access: Anyone or Anyone within Borosil
 */

var SYSTEM_FOLDER_NAME = "Engineering Audit System";
var DEFAULT_RECIPIENT_EMAILS = ["mehul.chikhaliya@borosil.com", "process.qa@borosil.com"];

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || "PING";
  var callback = params.callback;
  var response = { success: true, timestamp: new Date().toISOString() };
  
  try {
    var ss = getOrCreateMasterSpreadsheet();
    if (action === "SUBMIT_AUDIT" && params.payload) {
      var postData = JSON.parse(params.payload);
      response = handleSubmitAudit(ss, postData.auditHeader, postData.auditResults, postData.actions);
    } else if (action === "PING") {
      response.message = "Process QA Engineering Audit Google Apps Script API Online!";
      response.spreadsheetId = ss.getId();
      response.spreadsheetUrl = ss.getUrl();
    } else if (action === "TEST_EMAIL") {
      var targetEmail = params.email || "mehul.chikhaliya@borosil.com";
      sendProcessQaEmailDirect(
        targetEmail + ",process.qa@borosil.com",
        "✅ [Process QA Audit Test] Connection Verified for " + targetEmail,
        "Hello Mehul Chikhaliya,\\n\\nThis is a test notification from your Engineering Audit System running under process.qa@borosil.com.\\n\\nYour Google Apps Script Web App API is connected successfully, and emails are sending properly to " + targetEmail + "!\\n\\nProcess QA Department",
        null
      );
      response.message = "Test email sent successfully to " + targetEmail + " and process.qa@borosil.com";
    } else if (action === "GET_SECTIONS") { response.data = readSheetData(ss, "Sections"); }
    else if (action === "GET_LINES") { response.data = readSheetData(ss, "Lines"); }
    else if (action === "GET_EQUIPMENT") { response.data = readSheetData(ss, "Equipment"); }
    else if (action === "GET_COMPONENTS") { response.data = readSheetData(ss, "Components"); }
    else if (action === "GET_CHECKPOINTS") { response.data = readSheetData(ss, "Checkpoints"); }
    else if (action === "GET_AUDITS") { response.data = readSheetData(ss, "Audits"); }
    else if (action === "GET_ACTIONS") { response.data = readSheetData(ss, "Actions"); }
  } catch (err) {
    response.success = false; response.error = err.toString();
  }
  
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(response) + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response = { success: true, timestamp: new Date().toISOString() };
  try {
    var postData;
    if (e && e.postData && e.postData.contents) {
      try { postData = JSON.parse(e.postData.contents); } catch(err) { if (e.parameter && e.parameter.payload) postData = JSON.parse(e.parameter.payload); }
    } else if (e && e.parameter && e.parameter.payload) { postData = JSON.parse(e.parameter.payload); }
    
    var action = postData.action;
    var ss = getOrCreateMasterSpreadsheet();
    if (action === "SUBMIT_AUDIT") {
      response = handleSubmitAudit(ss, postData.auditHeader, postData.auditResults, postData.actions);
    } else if (action === "UPLOAD_PHOTO") {
      response = handleUploadPhoto(postData.base64Data, postData.fileName, postData.folderId);
    } else if (action === "UPDATE_ACTION") {
      response = handleUpdateAction(ss, postData.actionItem);
    }
  } catch (err) {
    response.success = false; response.error = err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateMasterFolder() {
  var folders = DriveApp.getFoldersByName(SYSTEM_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  var main = DriveApp.createFolder(SYSTEM_FOLDER_NAME);
  main.createFolder("Master Data"); main.createFolder("Audit Records"); main.createFolder("Photos"); main.createFolder("Reports"); main.createFolder("Backup");
  return main;
}

function getOrCreateMasterSpreadsheet() {
  var main = getOrCreateMasterFolder();
  var files = main.getFilesByName("Engineering_Audit_Database");
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  var ss = SpreadsheetApp.create("Engineering_Audit_Database");
  var ssFile = DriveApp.getFileById(ss.getId());
  var masterFolder = main.getFoldersByName("Master Data").next();
  ssFile.moveTo(masterFolder);
  ["Sections","Lines","Equipment","Components","Checkpoints","Audit_Templates","Employees","Audits","Audit_Results","Actions","Photo_Records","Mail_Configs","Settings"].forEach(function(t){
    if (!ss.getSheetByName(t)) ss.insertSheet(t);
  });
  return ss;
}

function handleSubmitAudit(ss, header, results, actions) {
  if (!header) header = {};
  if (!results) results = [];
  if (!actions) actions = [];

  var auditId = header.auditId || ("ENG-" + Date.now());
  var dateStr = header.date || new Date().toISOString().substring(0, 10);
  var year = new Date(dateStr).getFullYear().toString();
  var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var month = monthNames[new Date(dateStr).getMonth()];
  var mainFolder = getOrCreateMasterFolder();
  var auditFolder = getOrCreateSubfolder(getOrCreateSubfolder(getOrCreateSubfolder(getOrCreateSubfolder(mainFolder, "Audit Records"), year), month), auditId);
  header.driveFolderId = auditFolder.getId();
  appendObjectToSheet(ss, "Audits", header);
  if (results) results.forEach(function(r) { appendObjectToSheet(ss, "Audit_Results", r); });
  if (actions) actions.forEach(function(a) { appendObjectToSheet(ss, "Actions", a); });

  sendProcessQaAuditHtmlEmails(ss, header, results, actions);
  return { success: true, driveFolderId: auditFolder.getId(), driveFolderUrl: auditFolder.getUrl() };
}

function sendProcessQaAuditHtmlEmails(ss, header, results, actions) {
  try {
    var mailConfigs = readSheetData(ss, "Mail_Configs");
    var recipients = ["mehul.chikhaliya@borosil.com", "process.qa@borosil.com"];
    if (mailConfigs) {
      mailConfigs.forEach(function(cfg) {
        if (cfg.active === true || cfg.active === "true") {
          if (cfg.email && recipients.indexOf(cfg.email) === -1) recipients.push(cfg.email);
        }
      });
    }
    
    var lineName = (header.lineName || "Tempered Line 4") + " (" + (header.sectionName || "Grinding") + ")";
    var auditorName = header.auditorName || "Mehul Chikhaliya";
    var dateStr = header.date || new Date().toISOString().substring(0, 10);
    var overallStatus = header.overallStatus || "FAIL";
    var totalPoints = header.totalCheckpoints !== undefined ? header.totalCheckpoints : (results ? results.length : 0);
    var okCount = header.okCount !== undefined ? header.okCount : (results ? results.filter(function(r){ return r.status === "OK"; }).length : 0);
    var ngCount = header.ngCount !== undefined ? header.ngCount : (actions ? actions.length : 0);
    var passRate = header.compliancePercent !== undefined ? Number(header.compliancePercent).toFixed(1) : "0.0";

    var subject = "⚠️ [Process QA Audit Alert] DEVIATIONS FOUND: " + (header.equipmentName || "Benteler Machine") + " (" + overallStatus + ")";
    var plainBody = "Dear Process Owner,\\n\\nPlease review audit deviations for " + lineName + ".\\n\\nProcess QA Department";

    var htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">' +
      '<div style="background-color: #4f46e5; color: #ffffff; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;"><h2 style="margin: 0; font-size: 18px; font-weight: bold;">ENGINEERING AUDIT & EQUIPMENT HEALTH DEVIATION REPORT</h2></div>' +
      '<p style="font-size: 13px; font-weight: bold;">Dear Process Owner,</p><p style="font-size: 13px; color: #475569;">Please review the following deviations identified during today\'s process audit:</p>' +
      '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">' +
        '<tr><td style="padding: 8px; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1;">Area / Line</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #4f46e5;">' + lineName + '</td><td style="padding: 8px; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1;">Auditor</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">' + auditorName + '</td></tr>' +
        '<tr><td style="padding: 8px; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1;">Equipment</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">' + (header.equipmentName || "Benteler Double Edger") + '</td><td style="padding: 8px; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1;">Date</td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + dateStr + '</td></tr>' +
      '</table>' +
      '<table style="width: 100%; text-align: center; margin-bottom: 24px;"><tr>' +
        '<td style="background-color: #f1f5f9; padding: 12px; border-radius: 8px;"><span style="font-size: 20px; font-weight: 800;">' + totalPoints + '</span><br/><span style="font-size: 10px;">TOTAL POINTS</span></td>' +
        '<td style="background-color: #dcfce7; padding: 12px; border-radius: 8px;"><span style="font-size: 20px; font-weight: 800; color: #15803d;">' + okCount + '</span><br/><span style="font-size: 10px; color: #166534;">PASS</span></td>' +
        '<td style="background-color: #ffe4e6; padding: 12px; border-radius: 8px;"><span style="font-size: 20px; font-weight: 800; color: #be123c;">' + ngCount + '</span><br/><span style="font-size: 10px; color: #9f1239;">DEVIATIONS</span></td>' +
        '<td style="background-color: #e0e7ff; padding: 12px; border-radius: 8px;"><span style="font-size: 20px; font-weight: 800; color: #4338ca;">' + passRate + '%</span><br/><span style="font-size: 10px; color: #3730a3;">PASS RATE</span></td>' +
      '</tr></table>' +
      '<h3 style="color: #be123c; font-size: 14px;">DEVIATION FINDINGS & ACTION TABLE</h3>' +
      '<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;"><thead><tr style="background-color: #f8fafc;"><th style="padding: 8px; border: 1px solid #cbd5e1;">#</th><th style="padding: 8px; border: 1px solid #cbd5e1;">Audit Point</th><th style="padding: 8px; border: 1px solid #cbd5e1;">Specification</th><th style="padding: 8px; border: 1px solid #cbd5e1;">Actual Value</th><th style="padding: 8px; border: 1px solid #cbd5e1;">Severity</th><th style="padding: 8px; border: 1px solid #cbd5e1;">Photo / Remarks</th></tr></thead><tbody>';

    var ngResults = results ? results.filter(function(r){ return r.status === "NG"; }) : [];
    if (ngResults.length === 0 && actions) {
      actions.forEach(function(act, idx) {
        htmlBody += '<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (idx + 1) + '</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">' + (act.componentName || "Component") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Specification</td><td style="padding: 8px; border: 1px solid #cbd5e1; color: #be123c;">' + (act.observation || "NG") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (act.priority || "HIGH") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (act.recommendedAction || "") + '</td></tr>';
      });
    } else if (ngResults.length > 0) {
      ngResults.forEach(function(res, idx) {
        var photoHtml = res.photoUrl ? '<br/><img src="' + res.photoUrl + '" style="max-width: 140px; max-height: 100px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 6px; display: block;"/>' : '';
        htmlBody += '<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (idx + 1) + '</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">' + (res.componentName || "Component") + '<br/><span style="font-weight: normal; color: #64748b;">' + (res.checkpointText || "") + '</span></td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (res.standardRange || "N/A") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1; color: #be123c;">' + (res.actualValue || "NG") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (res.isCritical ? "CRITICAL" : "MEDIUM") + '</td><td style="padding: 8px; border: 1px solid #cbd5e1;">' + (res.observationNotes || res.recommendedAction || "") + photoHtml + '</td></tr>';
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
