/**
 * PLANT ENGINEERING AUDIT PORTAL — GOOGLE APPS SCRIPT BACKEND
 * Architecture: Vercel (Frontend) → JSONP GET / POST → Google Apps Script → Google Sheets + Drive
 */

var SPREADSHEET_ID = "1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0";

function getDatabaseSpreadsheet(e) {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 5) {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
  } catch (err) {}

  try {
    var explicitId = (e && e.parameter && e.parameter.sheetId) ? e.parameter.sheetId.trim() : '';
    if (explicitId && explicitId.length > 5) {
      return SpreadsheetApp.openById(explicitId);
    }
  } catch (err) {}

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (err) {}

  return null;
}

function SETUP_PERMISSIONS() {
  Logger.log("Testing Spreadsheet & Drive permissions...");
  var ss = getDatabaseSpreadsheet();
  if (ss) {
    Logger.log("✅ SUCCESS! Connected to: " + ss.getName() + " (ID: " + ss.getId() + ")");
  } else {
    Logger.log("⚠️ Could not open spreadsheet.");
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ROUTER (JSONP GET)
// ──────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  var result;
  try {
    var action   = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'PING';
    var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
    var ss       = getDatabaseSpreadsheet(e);

    if (action === 'SEND_TEST_EMAIL') {
      var email = (e.parameter && e.parameter.email) ? e.parameter.email : 'mehul.chikhaliya@borosil.com';
      sendTestNotificationEmail(email);
      result = { status: 'SUCCESS', message: 'Test email sent to ' + email };

    } else if (!ss) {
      result = { status: 'ERROR', message: 'Could not open Google Sheet with ID: ' + SPREADSHEET_ID };

    } else if (action === 'PING') {
      result = {
        status: 'SUCCESS',
        message: 'Connected to ' + (ss.getName ? ss.getName() : 'Google Sheet'),
        sheetName: ss.getName ? ss.getName() : 'Google Sheet',
        sheetId: ss.getId ? ss.getId() : SPREADSHEET_ID,
        sheetUrl: ss.getUrl ? ss.getUrl() : '',
        timestamp: new Date().toISOString()
      };

    } else if (action === 'GET_CHECKPOINTS' || action === 'getMasterData' || action === 'syncMasterData') {
      result = handleGetCheckpoints(ss);

    } else if (action === 'GET_AUDITS' || action === 'getAuditHistory') {
      result = handleGetAudits(ss);

    } else if (action === 'GET_ACTIONS') {
      result = handleGetActions(ss);

    } else if (action === 'AUDIT_HEADER') {
      var header = JSON.parse(e.parameter.payload || '{}');
      result = handleAuditHeader(ss, header);

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

// ──────────────────────────────────────────────────────────────────────────────
// ROUTER (POST — Atomic 1-Shot Audit Submission + Photo Upload + Alert Email)
// Supports both fetch POST body and hidden form iframe POST
// ──────────────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var raw = '';
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e && e.parameter && e.parameter.postData) {
      raw = e.parameter.postData;
    }

    var data = raw ? JSON.parse(raw) : {};
    var ss   = getDatabaseSpreadsheet(e);
    var act  = data.action || (e && e.parameter && e.parameter.action) || 'SUBMIT_AUDIT';

    if (!ss) return respond({ status: 'ERROR', message: 'Spreadsheet not accessible' });

    if (act === 'SUBMIT_AUDIT') {
      var headerRes  = handleAuditHeader(ss, data.header || {});
      var auditId    = (data.header && data.header.auditId) ? data.header.auditId : ('ENG-' + Date.now());
      var dateStr    = (data.header && data.header.date) ? data.header.date : '';

      // Save photos directly into Drive's Photos folder
      var photoMap = {};
      if (data.photos && data.photos.length > 0) {
        photoMap = saveAuditPhotosToDrive(headerRes.driveFolderId, data.photos, auditId, dateStr);
      }

      // Attach Drive photo links to results
      var resultsWithUrls = (data.results || []).map(function(r) {
        if (photoMap[r.sr]) {
          r.photoUrl = photoMap[r.sr];
        }
        return r;
      });

      var resultsRes = handleAuditResults(ss, auditId, resultsWithUrls);
      var actionsRes = handleAuditActions(ss, auditId, data.actions || []);

      // Send Deviation Alert Email if any Non-Conformance / Observations occurred
      if (data.actions && data.actions.length > 0) {
        try {
          sendDeviationAlertEmail(auditId, data.header || {}, data.actions, resultsWithUrls, headerRes.driveFolderUrl);
        } catch (mailErr) {
          Logger.log('Deviation alert email notice: ' + mailErr);
        }
      }

      return respond({
        status: 'SUCCESS',
        auditId: auditId,
        driveFolderId: headerRes.driveFolderId,
        driveFolderUrl: headerRes.driveFolderUrl,
        resultsAdded: resultsRes.rowsAdded,
        actionsAdded: actionsRes.actionsAdded,
        photosSaved: Object.keys(photoMap).length
      });
    }

    if (act === 'AUDIT_HEADER')  return respond(handleAuditHeader(ss, data));
    if (act === 'UPDATE_ACTION') return respond(handleUpdateAction(ss, data));
    return respond({ status: 'ERROR', message: 'Unknown action: ' + act });
  } catch (err) {
    return respond({ status: 'ERROR', message: err.toString() });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────────────────────────────────
// SAVE PHOTOS TO GOOGLE DRIVE (Photos Subfolder)
// ──────────────────────────────────────────────────────────────────────────────
function saveAuditPhotosToDrive(auditFolderId, photos, auditId, dateStr) {
  var photoMap = {};
  if (!photos || photos.length === 0) return photoMap;
  try {
    var auditFolder = null;
    if (auditFolderId) {
      try { auditFolder = DriveApp.getFolderById(auditFolderId); } catch (e) {}
    }
    if (!auditFolder && auditId) {
      var folderInfo = createAuditDriveFolderHierarchy(auditId, dateStr);
      if (folderInfo && folderInfo.folderId) {
        auditFolder = DriveApp.getFolderById(folderInfo.folderId);
      }
    }
    if (!auditFolder) return photoMap;

    var photosFolder = getOrCreateFolder(auditFolder, 'Photos');

    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      var base64Data = p.photoBase64 || '';
      if (!base64Data) continue;

      if (base64Data.indexOf('base64,') !== -1) {
        base64Data = base64Data.split('base64,')[1];
      }
      // Fix URL-decoding spaces to +
      base64Data = base64Data.replace(/ /g, '+');

      var decoded = Utilities.base64Decode(base64Data);
      var fileName = p.fileName || ('Photo_Sr' + (p.sr || (i + 1)) + '.jpg');
      var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
      var file = photosFolder.createFile(blob);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}

      photoMap[p.sr] = file.getUrl();
    }
  } catch (err) {
    Logger.log('Photo upload error: ' + err.toString());
  }
  return photoMap;
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 1 — AUDIT HEADER
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// STEP 2 — AUDIT RESULTS (Only Evaluated Checkpoints Saved)
// ──────────────────────────────────────────────────────────────────────────────
function handleAuditResults(ss, auditId, results) {
  var sheet = ss.getSheetByName('Audit_Details');
  if (!sheet) {
    sheet = ss.insertSheet('Audit_Details');
    sheet.appendRow([
      'Audit ID','Sr No.','Component','Checkpoint','Standard Parameter',
      'Actual Value','Status','Observation Notes','Recommended Action',
      'Photo URL','Critical','Timestamp'
    ]);
    sheet.setFrozenRows(1);
  }

  var nowStr = new Date().toISOString();
  var rows = [];
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    rows.push([
      auditId,
      r.sr || r.srNo || (i + 1),
      r.comp || r.componentName || '',
      r.ck || r.checkpointText || '',
      r.std || r.standardParameter || '',
      r.val || r.actualValue || '',
      r.status || '',
      r.notes || r.observationNotes || '',
      r.action || r.recommendedAction || '',
      r.photoUrl || '',
      (r.crit === 1 || r.isCritical === true || r.isCritical === 'Yes') ? 'Yes' : 'No',
      nowStr
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { status: 'SUCCESS', auditId: auditId, rowsAdded: rows.length };
}

// ──────────────────────────────────────────────────────────────────────────────
// STEP 3 — AUDIT ACTIONS
// ──────────────────────────────────────────────────────────────────────────────
function handleAuditActions(ss, auditId, actions) {
  if (!actions || actions.length === 0) return { status: 'SUCCESS', message: 'No actions to save.' };

  var sheet = ss.getSheetByName('Action_Tracker');
  if (!sheet) {
    sheet = ss.insertSheet('Action_Tracker');
    sheet.appendRow([
      'Action ID','Audit ID','Component','Checkpoint','Observation',
      'Recommended Action','Priority','Status','Target Date','Closure Remark','Closed Date','Created At'
    ]);
    sheet.setFrozenRows(1);
  }

  var nowStr = new Date().toISOString();
  var rows = [];
  for (var i = 0; i < actions.length; i++) {
    var a = actions[i];
    rows.push([
      a.id || a.actionId || ('ACT-' + Date.now() + '-' + i),
      auditId,
      a.comp || a.componentName || '',
      a.ck || a.checkpointText || '',
      a.obs || a.observation || '',
      a.act || a.recommendedAction || '',
      a.prio || a.priority || 'Medium',
      a.status || 'Open',
      a.target || a.targetDate || '',
      '',
      '',
      nowStr
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { status: 'SUCCESS', auditId: auditId, actionsAdded: rows.length };
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
    var photosF = getOrCreateFolder(auditF, 'Photos');

    return { folderId: auditF.getId(), folderUrl: auditF.getUrl(), photosFolderId: photosF.getId() };
  } catch (err) {
    Logger.log('Drive folder error: ' + err);
    return { folderId: '', folderUrl: '', photosFolderId: '' };
  }
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML DEVIATION NOTIFICATION EMAIL TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────
function sendDeviationAlertEmail(auditId, header, actions, results, driveFolderUrl) {
  if (!actions || actions.length === 0) return;

  var recipients = 'mehul.chikhaliya@borosil.com, process.qa@borosil.com';
  var auditDate = (header && header.date) ? header.date : new Date().toISOString().substring(0, 10);
  var auditorName = (header && header.auditorName) ? header.auditorName : 'Auditor';
  var section = (header && (header.sectionName || header.sectionId)) ? (header.sectionName || header.sectionId) : 'Engineering';
  var subSection = (header && (header.subSectionName || header.subSectionId)) ? (header.subSectionName || header.subSectionId) : 'General';
  var lineMachine = ((header && (header.lineName || header.lineId)) ? (header.lineName || header.lineId) : '') + ' - ' + ((header && (header.equipmentName || header.equipmentId)) ? (header.equipmentName || header.equipmentId) : '');
  var totalDeviations = actions.length;
  var criticalCount = actions.filter(function(a) { return String(a.priority || a.prio).toLowerCase() === 'critical'; }).length;
  var auditUrl = driveFolderUrl || ('https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);

  var isSingle = totalDeviations === 1;
  var singleAction = actions[0] || {};
  var matchingResult = null;
  if (results && results.length > 0) {
    for (var r = 0; r < results.length; r++) {
      if (results[r].comp === singleAction.comp || results[r].ck === singleAction.ck) {
        matchingResult = results[r];
        break;
      }
    }
  }

  var subject = (criticalCount > 0 ? '⚠️ CRITICAL DEVIATION' : '⚠️ AUDIT DEVIATION') + ' — ' + auditId + ' (' + section + ')';

  // Build rows for multiple deviations table
  var deviationRowsHtml = '';
  for (var i = 0; i < actions.length; i++) {
    var act = actions[i];
    var isCrit = String(act.priority || act.prio).toLowerCase() === 'critical';
    deviationRowsHtml += '<tr>' +
      '<td>' + lineMachine + '</td>' +
      '<td>' + (act.comp || act.componentName || '-') + '</td>' +
      '<td>' + (act.ck || act.checkpointText || '-') + '</td>' +
      '<td>' + (act.obs || act.observation || '-') + '</td>' +
      '<td style="color:' + (isCrit ? '#c62828' : '#b71c1c') + '; font-weight:bold;">' + (act.prio || act.priority || 'Medium') + '</td>' +
      '<td>' + (act.status || 'Open') + '</td>' +
      '</tr>';
  }

  // Single Deviation parameters
  var compName = singleAction.comp || singleAction.componentName || 'Component';
  var ckText = singleAction.ck || singleAction.checkpointText || 'Checkpoint';
  var stdParam = (matchingResult && matchingResult.std) ? matchingResult.std : 'Standard Parameter';
  var actVal = (matchingResult && matchingResult.val) ? matchingResult.val : (singleAction.obs || 'NG');
  var crit = singleAction.prio || singleAction.priority || 'Medium';
  var obs = singleAction.obs || singleAction.observation || 'Deviation observed during audit';
  var failImpact = (matchingResult && matchingResult.whatImpactIfThisPartGetsFail) ? matchingResult.whatImpactIfThisPartGetsFail : ((matchingResult && matchingResult.impactOfFailure) ? matchingResult.impactOfFailure : 'Equipment wear / operational stoppage');
  var corrAction = singleAction.act || singleAction.recommendedAction || 'Perform corrective maintenance';
  var targetDate = singleAction.target || singleAction.targetDate || 'Immediate';
  var photoUrl = (matchingResult && matchingResult.photoUrl) ? matchingResult.photoUrl : '';

  // Construct complete stylized HTML email
  var html = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>BRL Engineering Audit - Deviation Report</title>' +
'<style>' +
'    body { margin: 0; padding: 20px; background: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #222; }' +
'    .container { max-width: 900px; margin: auto; background: #ffffff; border: 1px solid #d9dee3; }' +
'    .header { padding: 20px 25px; border-bottom: 3px solid #1f4e78; }' +
'    .header h1 { margin: 0; font-size: 22px; color: #1f4e78; }' +
'    .header p { margin: 6px 0 0; font-size: 13px; color: #666; }' +
'    .intro { padding: 20px 25px 0px 25px; font-size: 14px; line-height: 1.6; }' +
'    .status { margin: 20px 25px; padding: 12px 15px; background: #fff1f1; border-left: 5px solid #d32f2f; color: #b71c1c; font-weight: bold; }' +
'    .summary { margin: 20px 25px; padding: 12px 15px; background: #f3f8fc; border-left: 5px solid #1f4e78; font-size: 13px; }' +
'    .section { margin: 20px 25px; }' +
'    .section-title { font-size: 16px; font-weight: bold; color: #1f4e78; padding-bottom: 8px; border-bottom: 1px solid #ddd; margin-bottom: 12px; }' +
'    table { width: 100%; border-collapse: collapse; font-size: 13px; }' +
'    th { width: 25%; background: #f2f5f7; text-align: left; padding: 10px; border: 1px solid #ddd; font-weight: bold; }' +
'    td { padding: 10px; border: 1px solid #ddd; }' +
'    .critical { color: #c62828; font-weight: bold; }' +
'    .observation { background: #fff8e1; padding: 12px; border: 1px solid #f0d98a; line-height: 1.6; }' +
'    .action { background: #f3f8fc; padding: 12px; border: 1px solid #c8dcea; line-height: 1.6; }' +
'    .photo { text-align: center; margin-top: 10px; }' +
'    .photo img { max-width: 500px; width: 100%; border: 1px solid #ccc; }' +
'    .button { display: inline-block; padding: 10px 18px; background: #1f4e78; color: white !important; text-decoration: none; border-radius: 4px; font-weight: bold; }' +
'    .footer { margin-top: 25px; padding: 15px 25px; background: #f2f5f7; font-size: 12px; color: #666; text-align: center; line-height: 1.6; }' +
'    .signature { padding: 20px 25px; font-size: 14px; line-height: 1.6; }' +
'</style>' +
'</head>' +
'<body>' +
'<div class="container">' +
'    <div class="header">' +
'        <h1>BRL Engineering Audit – Deviation Notification</h1>' +
'        <p>Automated Engineering Audit Management System</p>' +
'    </div>' +
'    <div class="intro">' +
'        <p>Dear Process Owner,</p>' +
'        <p>Please review the following deviations identified during today\'s process audit. Kindly take the necessary corrective action and ensure timely closure of the identified points.</p>' +
'    </div>' +
'    <div class="status">⚠ DEVIATION IDENTIFIED – ACTION REQUIRED</div>' +
'    <div class="summary">' +
'        <strong>Audit Date:</strong> ' + auditDate + '<br>' +
'        <strong>Auditor:</strong> ' + auditorName + '<br>' +
'        <strong>Section:</strong> ' + section + '<br>' +
'        <strong>Sub Section:</strong> ' + subSection + '<br>' +
'        <strong>Total Deviations:</strong> ' + totalDeviations + '<br>' +
'        <strong>Critical Deviations:</strong> ' + criticalCount + '' +
'    </div>';

  if (isSingle) {
    html += '<div class="section">' +
'        <div class="section-title">Deviation Details</div>' +
'        <table>' +
'            <tr><th>Audit ID</th><td>' + auditId + '</td></tr>' +
'            <tr><th>Line / Machine</th><td>' + lineMachine + '</td></tr>' +
'            <tr><th>Component</th><td>' + compName + '</td></tr>' +
'            <tr><th>Checkpoint</th><td>' + ckText + '</td></tr>' +
'            <tr><th>Standard Parameter</th><td>' + stdParam + '</td></tr>' +
'            <tr><th>Actual Value</th><td class="critical">' + actVal + '</td></tr>' +
'            <tr><th>Criticality</th><td class="critical">' + crit + '</td></tr>' +
'            <tr><th>Status</th><td>' + (singleAction.status || 'NG') + '</td></tr>' +
'        </table>' +
'    </div>' +
'    <div class="section">' +
'        <div class="section-title">Observation</div>' +
'        <div class="observation">' + obs + '</div>' +
'    </div>' +
'    <div class="section">' +
'        <div class="section-title">Potential Impact</div>' +
'        <div class="observation">' + failImpact + '</div>' +
'    </div>' +
'    <div class="section">' +
'        <div class="section-title">Corrective Action Required</div>' +
'        <div class="action">' + corrAction + '</div>' +
'    </div>' +
'    <div class="section">' +
'        <div class="section-title">Responsibility & Target Completion Date</div>' +
'        <table>' +
'            <tr><th>Responsible Person</th><td>Process Engineering Team</td></tr>' +
'            <tr><th>Department</th><td>Engineering / Maintenance</td></tr>' +
'            <tr><th>Target Completion Date</th><td>' + targetDate + '</td></tr>' +
'        </table>' +
'    </div>';

    if (photoUrl) {
      html += '<div class="section">' +
'        <div class="section-title">Deviation Photograph</div>' +
'        <div class="photo"><img src="' + photoUrl + '" alt="Deviation Photo"></div>' +
'    </div>';
    }
  }

  // Multiple Deviations table
  if (!isSingle) {
    html += '<div class="section">' +
'        <div class="section-title">Deviation Summary</div>' +
'        <table>' +
'            <thead><tr><th>Line / Machine</th><th>Component</th><th>Checkpoint</th><th>Observation</th><th>Criticality</th><th>Status</th></tr></thead>' +
'            <tbody>' + deviationRowsHtml + '</tbody>' +
'        </table>' +
'    </div>';
  }

  html += '<div class="section" style="text-align:center;">' +
'        <a href="' + auditUrl + '" class="button">View Audit Records in Drive</a>' +
'    </div>' +
'    <div class="signature">' +
'        <p>Kindly review the above observations and ensure that the necessary corrective actions are implemented within the specified timeline.</p>' +
'        <p>For any clarification, please contact the Audit Team.</p>' +
'        <p>Regards,<br><strong>BRL Engineering Audit Team</strong></p>' +
'    </div>' +
'    <div class="footer">' +
'        This is an automatically generated notification from the BRL Engineering Audit Management System.<br><br>' +
'        Please do not reply directly to this email.' +
'    </div>' +
'</div>' +
'</body>' +
'</html>';

  try {
    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      htmlBody: html
    });
  } catch (e) {
    Logger.log('MailApp error: ' + e.toString());
  }
}

function sendTestNotificationEmail(email) {
  var target = email || 'mehul.chikhaliya@borosil.com';
  var testActions = [{
    id: 'ACT-TEST-1',
    comp: 'Spindle Bearing Unit',
    ck: 'Check spindle vibration & temperature levels',
    obs: 'Elevated temperature 65°C detected during run',
    act: 'Inspect lubrication & check bearing clearance',
    prio: 'Critical',
    status: 'Open',
    target: '2026-08-20'
  }];

  var testHeader = {
    date: new Date().toISOString().substring(0, 10),
    auditorName: 'Mehul Chikhaliya',
    sectionName: 'Grinding (M1)',
    subSectionName: 'Edger Section',
    lineName: 'BL#1',
    equipmentName: 'Benteler Edger'
  };

  sendDeviationAlertEmail('ENG-TEST-' + Date.now(), testHeader, testActions, [], 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);
}
