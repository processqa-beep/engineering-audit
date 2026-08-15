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
// ROUTER (POST — Atomic 1-Shot Audit Submission + Photo Upload)
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

      // Save photos directly into Drive's Photos folder
      var photoMap = {};
      if (data.photos && data.photos.length > 0 && headerRes.driveFolderId) {
        photoMap = saveAuditPhotosToDrive(headerRes.driveFolderId, data.photos);
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
function saveAuditPhotosToDrive(auditFolderId, photos) {
  var photoMap = {};
  if (!photos || photos.length === 0) return photoMap;
  try {
    var auditFolder = auditFolderId ? DriveApp.getFolderById(auditFolderId) : null;
    if (!auditFolder) return photoMap;

    var photosFolder = getOrCreateFolder(auditFolder, 'Photos');

    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      var base64Data = p.photoBase64 || '';
      if (!base64Data) continue;

      if (base64Data.indexOf('base64,') !== -1) {
        base64Data = base64Data.split('base64,')[1];
      }

      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, 'image/jpeg', p.fileName || ('Photo_Sr' + p.sr + '.jpg'));
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
// STEP 2 — AUDIT RESULTS
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

  try {
    sendDeviationAlertEmail(auditId, actions);
  } catch (mailErr) {
    Logger.log('Email error: ' + mailErr);
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
  body += 'Please take immediate action.\n\nProcess QA — Borosil Renewables Ltd.';

  MailApp.sendEmail('mehul.chikhaliya@borosil.com', subject, body);
}

function sendTestNotificationEmail(email) {
  MailApp.sendEmail(email, 'Test — Engineering Audit Portal', 'Connection confirmed. Your Plant Engineering Audit Portal is connected to Google Sheets.\n\nProcess QA — Borosil Renewables Ltd.');
}
