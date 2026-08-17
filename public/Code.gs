/**
 * PLANT ENGINEERING AUDIT PORTAL — UNIVERSAL GOOGLE APPS SCRIPT BACKEND
 * Auto-Syncs Checkpoints, Dumps Photos to Drive, Sends Inline Photo Deviation Alerts
 */

var SPREADSHEET_ID = "1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0";

function getDatabaseSpreadsheet() {
  try {
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 5) {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    }
  } catch (err) {}
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {}
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// UNIVERSAL ROUTER (GET) — Serves UI OR Handles JSONP API Requests
// ──────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  var action   = (e && e.parameter && e.parameter.action) ? e.parameter.action : null;
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;

  // If no API action is specified, render the Native Web Application
  if (!action && !callback) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('BRL Engineering Audit Portal')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }

  var result;
  var ss = getDatabaseSpreadsheet();

  try {
    if (action === 'SEND_TEST_EMAIL') {
      var email = (e.parameter && e.parameter.email) ? e.parameter.email : 'mehul.chikhaliya@borosil.com';
      sendTestNotificationEmail(email);
      result = { status: 'SUCCESS', message: 'Test email dispatched to ' + email };

    } else if (!ss) {
      result = { status: 'ERROR', message: 'Could not open Google Sheet with ID: ' + SPREADSHEET_ID };

    } else if (action === 'PING') {
      result = {
        status: 'SUCCESS',
        message: 'Connected to ' + (ss.getName ? ss.getName() : 'Google Sheet'),
        sheetName: ss.getName ? ss.getName() : 'Google Sheet',
        sheetId: ss.getId ? ss.getId() : SPREADSHEET_ID,
        timestamp: new Date().toISOString()
      };

    } else if (action === 'GET_CHECKPOINTS') {
      result = handleGetCheckpoints(ss);

    } else if (action === 'SAVE_CHECKPOINTS_BATCH') {
      var batchIdx   = Number(e.parameter.batchIndex) || 0;
      var totalB     = Number(e.parameter.totalBatches) || 1;
      var batchData  = JSON.parse(e.parameter.payload || '[]');
      result = handleSaveCheckpointsBatch(ss, batchIdx, totalB, batchData);

    } else if (action === 'GET_AUDITS') {
      result = handleGetAudits(ss);

    } else if (action === 'GET_ACTIONS') {
      result = handleGetActions(ss);

    } else if (action === 'AUDIT_HEADER') {
      var header = JSON.parse(e.parameter.payload || '{}');
      var folderInfo = createAuditDriveFolderHierarchy(header.auditId, header.date);
      handleAuditHeader(ss, header, folderInfo);
      result = { status: 'SUCCESS', auditId: header.auditId, driveFolderId: folderInfo.folderId, driveFolderUrl: folderInfo.folderUrl };

    } else if (action === 'AUDIT_RESULTS') {
      var data = JSON.parse(e.parameter.payload || '{}');
      handleAuditResults(ss, data.auditId, data.results || []);
      result = { status: 'SUCCESS', auditId: data.auditId, rowsAdded: (data.results || []).length };

    } else if (action === 'AUDIT_ACTIONS') {
      var data2 = JSON.parse(e.parameter.payload || '{}');
      handleAuditActions(ss, data2.auditId, data2.actions || []);

      // Auto-trigger deviation email with Drive folder info
      if (data2.actions && data2.actions.length > 0) {
        try {
          var masterSheet = ss.getSheetByName('Audit_Master');
          var headerInfo = { auditId: data2.auditId };
          var driveFolderUrl = '';
          if (masterSheet) {
            var mData = masterSheet.getDataRange().getValues();
            for (var m = mData.length - 1; m >= 1; m--) {
              if (String(mData[m][0]) === String(data2.auditId)) {
                headerInfo = {
                  auditId: mData[m][0],
                  date: mData[m][1],
                  sectionName: mData[m][3],
                  subSectionName: mData[m][4],
                  lineName: mData[m][5],
                  equipmentName: mData[m][6],
                  auditorName: mData[m][7],
                  driveFolderUrl: mData[m][16]
                };
                driveFolderUrl = mData[m][16];
                break;
              }
            }
          }
          sendDeviationAlertEmail(data2.auditId, headerInfo, data2.actions, [], driveFolderUrl, []);
        } catch (mailErr) {
          Logger.log('Auto-email error: ' + mailErr);
        }
      }

      result = { status: 'SUCCESS', auditId: data2.auditId, actionsAdded: (data2.actions || []).length };

    } else if (action === 'SAVE_PHOTO_CHUNK') {
      var photoId     = e.parameter.photoId;
      var auditId     = e.parameter.auditId;
      var folderId    = e.parameter.folderId;
      var chunkIndex  = Number(e.parameter.chunkIndex);
      var totalChunks = Number(e.parameter.totalChunks);
      var chunkData   = e.parameter.chunkData || '';
      var fileName    = e.parameter.fileName || ('Photo_' + photoId + '.jpg');
      var srNo        = Number(e.parameter.srNo) || 1;

      result = handleSavePhotoChunk(ss, auditId, folderId, photoId, chunkIndex, totalChunks, chunkData, fileName, srNo);

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
// AUTO-DUMP CHECKPOINTS TO GOOGLE SHEETS (Checkpoint_Master tab)
// ──────────────────────────────────────────────────────────────────────────────
function handleSaveCheckpointsBatch(ss, batchIndex, totalBatches, batchData) {
  var sheet = ss.getSheetByName('Checkpoint_Master');
  if (!sheet) {
    sheet = ss.insertSheet('Checkpoint_Master');
  }

  // On first batch, clear existing rows and re-write the header
  if (batchIndex === 0) {
    sheet.clearContents();
    sheet.appendRow([
      'Sr No.', 'Section', 'Sub Section', 'Line / Machine', 'Component Name',
      'Checkpoint', 'Standard Parameter', 'Min', 'Max', 'Unit', 'Criticality', 'Active'
    ]);
    sheet.setFrozenRows(1);
  }

  var rows = [];
  for (var i = 0; i < batchData.length; i++) {
    var c = batchData[i];
    var linesStr = (c.applicableLines && Array.isArray(c.applicableLines))
      ? c.applicableLines.join(', ')
      : (c.lineName || c.lineId || 'ALL');

    rows.push([
      c.srNo || (i + 1),
      c.sectionName || c.sectionId || '',
      c.subSectionName || c.subSectionId || '',
      linesStr,
      c.componentName || '',
      c.checkpointText || '',
      c.standardParameter || '',
      c.minimum !== undefined && c.minimum !== null ? c.minimum : '',
      c.maximum !== undefined && c.maximum !== null ? c.maximum : '',
      c.unit || '',
      c.criticality || (c.isCritical ? 'Critical' : 'Medium'),
      (c.active !== false) ? 'Yes' : 'No'
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 12).setValues(rows);
  }

  return { status: 'SUCCESS', batchIndex: batchIndex, rowsAdded: rows.length };
}

// ──────────────────────────────────────────────────────────────────────────────
// CLIENT API: SUBMIT AUDIT WITH INLINE PHOTOS & EMAIL
// ──────────────────────────────────────────────────────────────────────────────
function submitAuditFromClient(payload) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) throw new Error("Could not access Google Spreadsheet with ID: " + SPREADSHEET_ID);

    var header  = payload.header || {};
    var results = payload.results || [];
    var actions = payload.actions || [];
    var photos  = payload.photos || [];

    var auditId = header.auditId || ('ENG-' + Date.now());
    var dateStr = header.date || new Date().toISOString().substring(0, 10);

    // 1. Create Google Drive Folder Hierarchy
    var folderInfo = createAuditDriveFolderHierarchy(auditId, dateStr);
    header.driveFolderId = folderInfo.folderId;
    header.driveFolderUrl = folderInfo.folderUrl;

    // 2. Save Photos to Google Drive & generate Blobs for Inline Email
    var photoResult = saveAuditPhotosToDrive(folderInfo.photosFolderId, photos, auditId, dateStr);
    var photoMap = photoResult.photoMap || {};
    var blobList = photoResult.blobList || [];

    // 3. Attach Drive Photo URLs to results
    for (var i = 0; i < results.length; i++) {
      var sr = results[i].sr || results[i].srNo;
      if (photoMap[sr]) {
        results[i].photoUrl = photoMap[sr];
      }
    }

    // 4. Save to Google Sheets
    handleAuditHeader(ss, header, folderInfo);
    handleAuditResults(ss, auditId, results);
    handleAuditActions(ss, auditId, actions);

    // 5. Send Stylized HTML Deviation Email with INLINE EMBEDDED PHOTOS
    if (actions && actions.length > 0) {
      try {
        sendDeviationAlertEmail(auditId, header, actions, results, folderInfo.folderUrl, blobList);
      } catch (mailErr) {
        Logger.log("Email error: " + mailErr.toString());
      }
    }

    return {
      status: 'SUCCESS',
      auditId: auditId,
      driveFolderId: folderInfo.folderId,
      driveFolderUrl: folderInfo.folderUrl,
      photosSaved: Object.keys(photoMap).length,
      resultsSaved: results.length,
      actionsSaved: actions.length
    };
  } catch (err) {
    Logger.log("Submission error: " + err.toString());
    return { status: 'ERROR', message: err.toString() };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CHUNKED PHOTO SAVER (Decodes Base64 & Creates JPEG in Drive's Photos Folder)
// ──────────────────────────────────────────────────────────────────────────────
function handleSavePhotoChunk(ss, auditId, folderId, photoId, chunkIndex, totalChunks, chunkData, fileName, srNo) {
  var cache = CacheService.getScriptCache();
  var key = 'photo_' + photoId + '_' + chunkIndex;
  cache.put(key, chunkData, 600); // 10 min cache

  if (chunkIndex === totalChunks - 1) {
    var fullBase64 = '';
    for (var i = 0; i < totalChunks; i++) {
      var cKey = 'photo_' + photoId + '_' + i;
      var chunk = (i === chunkIndex) ? chunkData : cache.get(cKey);
      if (chunk) {
        fullBase64 += chunk;
        cache.remove(cKey);
      }
    }

    if (fullBase64.indexOf('base64,') !== -1) {
      fullBase64 = fullBase64.split('base64,')[1];
    }
    fullBase64 = fullBase64.replace(/ /g, '+');

    try {
      var auditFolder = null;
      if (folderId) {
        try { auditFolder = DriveApp.getFolderById(folderId); } catch (e) {}
      }
      if (!auditFolder && auditId) {
        var folderInfo = createAuditDriveFolderHierarchy(auditId, '');
        if (folderInfo.folderId) auditFolder = DriveApp.getFolderById(folderInfo.folderId);
      }
      if (!auditFolder) auditFolder = DriveApp.getRootFolder();

      var photosFolder = getOrCreateFolder(auditFolder, 'Photos');
      var decoded = Utilities.base64Decode(fullBase64);
      var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
      var file = photosFolder.createFile(blob);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}

      var photoUrl = file.getUrl();

      // Update Audit_Details sheet with Photo URL for this Sr No.
      if (ss) {
        var detailsSheet = ss.getSheetByName('Audit_Details');
        if (detailsSheet) {
          var data = detailsSheet.getDataRange().getValues();
          for (var r = 1; r < data.length; r++) {
            if (String(data[r][0]) === String(auditId) && Number(data[r][1]) === Number(srNo)) {
              detailsSheet.getRange(r + 1, 10).setValue(photoUrl);
              break;
            }
          }
        }
      }

      return { status: 'SUCCESS', photoUrl: photoUrl, fileName: fileName };
    } catch (err) {
      return { status: 'ERROR', message: 'Failed to create image: ' + err.toString() };
    }
  }

  return { status: 'CHUNK_SAVED', chunkIndex: chunkIndex };
}

// ──────────────────────────────────────────────────────────────────────────────
// CLIENT API: FETCH CHECKPOINTS, HISTORY & ACTIONS
// ──────────────────────────────────────────────────────────────────────────────
function getCheckpointsFromClient() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return { status: 'ERROR', message: 'Spreadsheet not accessible' };
    return handleGetCheckpoints(ss);
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

function getAuditHistoryFromClient() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return { status: 'ERROR', message: 'Spreadsheet not accessible' };
    return handleGetAudits(ss);
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

function getActionsFromClient() {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return { status: 'ERROR', message: 'Spreadsheet not accessible' };
    return handleGetActions(ss);
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

function updateActionFromClient(data) {
  try {
    var ss = getDatabaseSpreadsheet();
    if (!ss) return { status: 'ERROR', message: 'Spreadsheet not accessible' };
    return handleUpdateAction(ss, data);
  } catch (err) {
    return { status: 'ERROR', message: err.toString() };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE PHOTOS MANAGER (Saves to Drive & Prepares Blobs)
// ──────────────────────────────────────────────────────────────────────────────
function saveAuditPhotosToDrive(photosFolderId, photos, auditId, dateStr) {
  var photoMap = {};
  var blobList = [];
  if (!photos || photos.length === 0) return { photoMap: photoMap, blobList: blobList };

  try {
    var photosFolder = null;
    if (photosFolderId) {
      try { photosFolder = DriveApp.getFolderById(photosFolderId); } catch (e) {}
    }
    if (!photosFolder && auditId) {
      var folderInfo = createAuditDriveFolderHierarchy(auditId, dateStr);
      if (folderInfo.photosFolderId) {
        photosFolder = DriveApp.getFolderById(folderInfo.photosFolderId);
      }
    }
    if (!photosFolder) photosFolder = DriveApp.getRootFolder();

    for (var i = 0; i < photos.length; i++) {
      var p = photos[i];
      var base64Data = p.photoBase64 || '';
      if (!base64Data) continue;

      if (base64Data.indexOf('base64,') !== -1) {
        base64Data = base64Data.split('base64,')[1];
      }
      base64Data = base64Data.replace(/ /g, '+');

      var decoded = Utilities.base64Decode(base64Data);
      var fileName = p.fileName || ('Photo_Sr' + (p.sr || (i + 1)) + '.jpg');
      var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
      var file = photosFolder.createFile(blob);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}

      var fileUrl = file.getUrl();
      photoMap[p.sr] = fileUrl;
      blobList.push({ sr: p.sr, blob: blob, name: fileName, url: fileUrl });
    }
  } catch (err) {
    Logger.log('Photo save error: ' + err.toString());
  }

  return { photoMap: photoMap, blobList: blobList };
}

function createAuditDriveFolderHierarchy(auditId, dateStr) {
  try {
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var year  = dateStr ? dateStr.substring(0, 4) : String(new Date().getFullYear());
    var mIdx  = dateStr ? (Number(dateStr.substring(5, 7)) - 1) : new Date().getMonth();
    var month = monthNames[mIdx] || 'Unknown';

    var root    = getOrCreateFolder(DriveApp.getRootFolder(), 'Engineering Audit System');
    var records = getOrCreateFolder(root, 'Audit Records');
    var yearF   = getOrCreateFolder(records, year);
    var monthF  = getOrCreateFolder(yearF, month);
    var auditF  = getOrCreateFolder(monthF, auditId);
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
// GOOGLE SHEETS HANDLERS
// ──────────────────────────────────────────────────────────────────────────────
function handleAuditHeader(ss, header, folderInfo) {
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

  var row = [
    header.auditId,
    header.date,
    header.time,
    header.sectionName || header.sectionId,
    header.subSectionName || header.subSectionId,
    header.lineName || header.lineId,
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

  sheet.appendRow(row);
}

function handleAuditResults(ss, auditId, results) {
  if (!results || results.length === 0) return;
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

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function handleAuditActions(ss, auditId, actions) {
  if (!actions || actions.length === 0) return;
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

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
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
    audits.push({ auditId: r[0], date: r[1], section: r[3], subSection: r[4], line: r[5], auditor: r[7], compliance: r[13], status: r[14], folderUrl: r[16] });
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
    actions.push({ actionId: r[0], auditId: r[1], component: r[2], checkpoint: r[3], observation: r[4], recommendedAction: r[5], priority: r[6], status: r[7], targetDate: r[8] });
  }
  return { status: 'SUCCESS', actions: actions };
}

function handleUpdateAction(ss, data) {
  var sheet = ss.getSheetByName('Action_Tracker');
  if (!sheet) return { status: 'ERROR', message: 'Action_Tracker sheet not found' };
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.actionId)) {
      if (data.status)         sheet.getRange(i + 1, 8).setValue(data.status);
      if (data.closureRemark)  sheet.getRange(i + 1, 10).setValue(data.closureRemark);
      if (data.status === 'Closed') sheet.getRange(i + 1, 11).setValue(new Date().toISOString().substring(0, 10));
      return { status: 'SUCCESS' };
    }
  }
  return { status: 'ERROR', message: 'Action ID not found: ' + data.actionId };
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML DEVIATION NOTIFICATION EMAIL TEMPLATE (With Inline Embedded Photos & File Attachments)
// ──────────────────────────────────────────────────────────────────────────────
function sendDeviationAlertEmail(auditId, header, actions, results, driveFolderUrl, blobs) {
  if (!actions || actions.length === 0) return;

  var recipients = (header && header.toEmails) ? header.toEmails : 'mehul.chikhaliya@borosil.com, process.qa@borosil.com';
  var ccRecipients = (header && header.ccEmails) ? header.ccEmails : '';
  var auditDate = (header && header.date) ? header.date : new Date().toISOString().substring(0, 10);
  var auditorName = (header && header.auditorName) ? header.auditorName : 'Auditor';
  var section = (header && (header.sectionName || header.sectionId)) ? (header.sectionName || header.sectionId) : 'Engineering';
  var subSection = (header && (header.subSectionName || header.subSectionId)) ? (header.subSectionName || header.subSectionId) : 'General';
  var lineName = (header && (header.lineName || header.lineId)) ? (header.lineName || header.lineId) : 'BL#1';
  var equipName = (header && (header.equipmentName || header.equipmentId)) ? (header.equipmentName || header.equipmentId) : 'Benteler Edger';
  var lineMachine = lineName + ' – ' + equipName;
  var totalDeviations = actions.length;
  var portalActionUrl = (header && header.portalUrl) ? header.portalUrl : 'https://engineering-audit.vercel.app/?tab=actions';

  var formattedDT = formatAuditDateTime(header ? header.date : null, header ? header.time : null);
  var subject = 'ENGINEERING AUDIT DEVIATION – ' + lineName + ' – ' + equipName + ' (' + formattedDT + ')';

  // Build inline image attachments dictionary and file attachments list
  var inlineImagesObj = {};
  var attachmentsList = [];
  var photoGridHtml = '';
  var primaryPhotoUrl = '';

  if (blobs && blobs.length > 0) {
    for (var b = 0; b < blobs.length; b++) {
      var imgKey = 'photo_' + b;
      inlineImagesObj[imgKey] = blobs[b].blob;
      attachmentsList.push(blobs[b].blob);

      if (b === 0) {
        primaryPhotoUrl = 'cid:' + imgKey;
      }
      photoGridHtml += '<img src="cid:' + imgKey + '" alt="' + (blobs[b].name || ('Deviation Photo ' + (b + 1))) + '" style="width:45%; max-width:400px; margin:6px; border:1px solid #cfd8dc; border-radius:6px;" />';
    }
  }

  // Build Deviation Table Rows
  var deviationRowsHtml = '';
  for (var i = 0; i < actions.length; i++) {
    var act = actions[i];
    var isCrit = String(act.priority || act.prio).toLowerCase() === 'critical';
    var isMajor = String(act.priority || act.prio).toLowerCase() === 'major' || String(act.priority || act.prio).toLowerCase() === 'high';
    var critClass = isCrit ? 'critical' : (isMajor ? 'major' : 'minor');
    var critLabel = act.priority || act.prio || (isCrit ? 'Critical' : 'Medium');

    // Find matching result details if available
    var matchedStd = '-';
    var matchedVal = act.obs || act.observation || 'NG';
    var matchedImpact = 'Operational wear / equipment stoppage risk';

    if (results && results.length > 0) {
      for (var r = 0; r < results.length; r++) {
        if (results[r].comp === act.comp || results[r].ck === act.ck || results[r].sr === act.sr) {
          if (results[r].std) matchedStd = results[r].std;
          else if (results[r].standardParameter) matchedStd = results[r].standardParameter;

          if (results[r].val) matchedVal = results[r].val;
          else if (results[r].actualValue) matchedVal = results[r].actualValue;

          if (results[r].whatImpactIfThisPartGetsFail) matchedImpact = results[r].whatImpactIfThisPartGetsFail;
          break;
        }
      }
    }

    deviationRowsHtml += '<tr>' +
      '<td style="text-align:center; font-weight:bold;">' + (i + 1) + '</td>' +
      '<td style="font-weight:bold; color:#17365d;">' + (act.comp || act.componentName || '-') + '</td>' +
      '<td>' + (act.ck || act.checkpointText || '-') + '</td>' +
      '<td class="standard">' + matchedStd + '</td>' +
      '<td class="actual">' + matchedVal + '</td>' +
      '<td><span class="' + critClass + '">' + critLabel + '</span></td>' +
      '<td class="observation">' + (act.obs || act.observation || '-') + '</td>' +
      '<td class="impact">' + matchedImpact + '</td>' +
      '</tr>';
  }

  // Full HTML Email Template
  var html = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>Engineering Audit Deviation</title>' +
'<style>' +
'    body {' +
'        margin: 0;' +
'        padding: 20px;' +
'        background: #eef2f6;' +
'        font-family: Arial, Helvetica, sans-serif;' +
'        color: #263238;' +
'    }' +
'    .container {' +
'        max-width: 1100px;' +
'        margin: 0 auto;' +
'        background: #ffffff;' +
'        border-radius: 8px;' +
'        overflow: hidden;' +
'        box-shadow: 0 2px 10px rgba(0,0,0,0.08);' +
'    }' +
'    /* INTRODUCTION */' +
'    .intro {' +
'        padding: 25px 30px 15px 30px;' +
'        font-size: 14px;' +
'        line-height: 1.7;' +
'    }' +
'    .intro p {' +
'        margin: 0 0 12px 0;' +
'    }' +
'    /* AUDIT INFORMATION */' +
'    .summary {' +
'        margin: 20px 30px;' +
'        padding: 18px;' +
'        background: #eaf3fb;' +
'        border: 1px solid #c7dced;' +
'        border-radius: 6px;' +
'    }' +
'    .summary-title {' +
'        color: #17365d;' +
'        font-size: 16px;' +
'        font-weight: bold;' +
'        margin-bottom: 12px;' +
'    }' +
'    .summary-grid {' +
'        width: 100%;' +
'        border-collapse: collapse;' +
'    }' +
'    .summary-grid td {' +
'        padding: 7px 6px;' +
'        font-size: 13px;' +
'    }' +
'    .summary-label {' +
'        color: #607d8b;' +
'        width: 25%;' +
'        font-weight: bold;' +
'    }' +
'    /* MAIN SECTION */' +
'    .section {' +
'        margin: 25px 30px;' +
'    }' +
'    .section-title {' +
'        color: #17365d;' +
'        font-size: 18px;' +
'        font-weight: bold;' +
'        padding-bottom: 10px;' +
'        border-bottom: 3px solid #1976d2;' +
'        margin-bottom: 15px;' +
'    }' +
'    /* DEVIATION TABLE */' +
'    .deviation-table {' +
'        width: 100%;' +
'        border-collapse: collapse;' +
'        font-size: 12px;' +
'        table-layout: fixed;' +
'    }' +
'    .deviation-table th {' +
'        background: #17365d;' +
'        color: #ffffff;' +
'        padding: 10px 7px;' +
'        border: 1px solid #c7d0d8;' +
'        text-align: left;' +
'        vertical-align: middle;' +
'    }' +
'    .deviation-table td {' +
'        padding: 10px 7px;' +
'        border: 1px solid #dce3e8;' +
'        vertical-align: top;' +
'        line-height: 1.5;' +
'        word-wrap: break-word;' +
'    }' +
'    .deviation-table tr:nth-child(even) td {' +
'        background: #f8fafc;' +
'    }' +
'    /* STANDARD */' +
'    .standard {' +
'        background: #eaf7ee;' +
'        color: #1b5e20;' +
'        font-weight: bold;' +
'    }' +
'    /* ACTUAL */' +
'    .actual {' +
'        background: #fff0f0;' +
'        color: #b71c1c;' +
'        font-weight: bold;' +
'    }' +
'    /* OBSERVATION */' +
'    .observation {' +
'        background: #fff8e1;' +
'    }' +
'    /* IMPACT */' +
'    .impact {' +
'        background: #fceeee;' +
'        color: #8e2424;' +
'    }' +
'    /* ACTION */' +
'    .action {' +
'        background: #eaf3fb;' +
'        color: #174f7c;' +
'    }' +
'    /* CRITICALITY */' +
'    .critical {' +
'        color: #c62828;' +
'        font-weight: bold;' +
'    }' +
'    .major {' +
'        color: #ef6c00;' +
'        font-weight: bold;' +
'    }' +
'    .minor {' +
'        color: #2e7d32;' +
'        font-weight: bold;' +
'    }' +
'    /* PHOTO */' +
'    .photo-section {' +
'        margin-top: 25px;' +
'    }' +
'    .photo-title {' +
'        font-size: 16px;' +
'        font-weight: bold;' +
'        color: #17365d;' +
'        padding-bottom: 8px;' +
'        border-bottom: 2px solid #d9e6f2;' +
'        margin-bottom: 12px;' +
'    }' +
'    .photo-container {' +
'        background: #f7f9fb;' +
'        border: 1px solid #dce3e8;' +
'        border-radius: 6px;' +
'        padding: 15px;' +
'        text-align: center;' +
'    }' +
'    .photo-container img {' +
'        max-width: 100%;' +
'        max-height: 450px;' +
'        border: 1px solid #cfd8dc;' +
'        border-radius: 5px;' +
'    }' +
'    .photo-caption {' +
'        margin-top: 8px;' +
'        font-size: 12px;' +
'        color: #78909c;' +
'    }' +
'    /* MULTIPLE PHOTOS */' +
'    .photo-grid {' +
'        text-align: center;' +
'    }' +
'    .photo-grid img {' +
'        width: 45%;' +
'        max-width: 400px;' +
'        margin: 5px;' +
'        border: 1px solid #cfd8dc;' +
'        border-radius: 5px;' +
'    }' +
'    /* BUTTON */' +
'    .button-container {' +
'        text-align: center;' +
'        margin: 30px;' +
'    }' +
'    .button {' +
'        display: inline-block;' +
'        padding: 13px 25px;' +
'        background: #1976d2;' +
'        color: #ffffff !important;' +
'        text-decoration: none;' +
'        border-radius: 5px;' +
'        font-weight: bold;' +
'        font-size: 14px;' +
'    }' +
'    /* CLOSING */' +
'    .closing {' +
'        padding: 10px 30px 25px 30px;' +
'        font-size: 14px;' +
'        line-height: 1.7;' +
'    }' +
'    @media only screen and (max-width: 700px) {' +
'        body { padding: 5px; }' +
'        .container { width: 100%; }' +
'        .intro, .section, .closing { margin-left: 15px; margin-right: 15px; }' +
'        .summary { margin-left: 15px; margin-right: 15px; }' +
'        .deviation-table { font-size: 10px; }' +
'        .deviation-table th, .deviation-table td { padding: 6px 4px; }' +
'        .photo-grid img { width: 95%; }' +
'    }' +
'</style>' +
'</head>' +
'<body>' +
'<div class="container">' +
'    <!-- INTRODUCTION -->' +
'    <div class="intro">' +
'        <p>Dear Team,</p>' +
'        <p>Please review the following deviations identified during today\'s Engineering Audit. Kindly take the necessary corrective action and ensure timely closure of the identified points.</p>' +
'    </div>' +
'    <!-- AUDIT INFORMATION -->' +
'    <div class="summary">' +
'        <div class="summary-title">Audit Information</div>' +
'        <table class="summary-grid">' +
'            <tr>' +
'                <td class="summary-label">Audit ID</td>' +
'                <td><strong>' + auditId + '</strong></td>' +
'                <td class="summary-label">Audit Date</td>' +
'                <td>' + auditDate + '</td>' +
'            </tr>' +
'            <tr>' +
'                <td class="summary-label">Auditor</td>' +
'                <td>' + auditorName + '</td>' +
'                <td class="summary-label">Section</td>' +
'                <td>' + section + '</td>' +
'            </tr>' +
'            <tr>' +
'                <td class="summary-label">Sub Section</td>' +
'                <td>' + subSection + '</td>' +
'                <td class="summary-label">Line / Machine</td>' +
'                <td>' + lineMachine + '</td>' +
'            </tr>' +
'        </table>' +
'    </div>' +
'    <!-- ENGINEERING AUDIT DEVIATION SUMMARY -->' +
'    <div class="section">' +
'        <div class="section-title">Engineering Audit Deviation Summary</div>' +
'        <table class="deviation-table">' +
'            <thead>' +
'                <tr>' +
'                    <th style="width:5%;">Sr.</th>' +
'                    <th style="width:14%;">Component</th>' +
'                    <th style="width:16%;">Checkpoint</th>' +
'                    <th style="width:14%;">Standard Parameter</th>' +
'                    <th style="width:12%;">Actual Value</th>' +
'                    <th style="width:9%;">Criticality</th>' +
'                    <th style="width:15%;">Observation</th>' +
'                    <th style="width:15%;">Potential Impact</th>' +
'                </tr>' +
'            </thead>' +
'            <tbody>' +
                deviationRowsHtml +
'            </tbody>' +
'        </table>' +
'    </div>';

  // Photo Evidence Section
  if (blobs && blobs.length > 0) {
    if (blobs.length === 1 && primaryPhotoUrl) {
      html += '    <!-- PHOTO EVIDENCE -->' +
'<div class="section photo-section">' +
'    <div class="photo-title">📷 Audit Photo Evidence</div>' +
'    <div class="photo-container">' +
'        <img src="' + primaryPhotoUrl + '" alt="Engineering Audit Deviation Photo">' +
'        <div class="photo-caption">Photo captured during Engineering Audit (' + (blobs[0].name || '') + ')</div>' +
'    </div>' +
'</div>';
    } else {
      html += '    <!-- MULTIPLE PHOTOS -->' +
'<div class="section photo-section">' +
'    <div class="photo-title">📷 Audit Photo Evidence (' + blobs.length + ' Photos)</div>' +
'    <div class="photo-container">' +
'        <div class="photo-grid">' + photoGridHtml + '</div>' +
'        <div class="photo-caption">Photos captured during Engineering Audit</div>' +
'    </div>' +
'</div>';
    }
  }

  html += '    <!-- VIEW AUDIT -->' +
'<div class="button-container">' +
'    <a href="' + portalActionUrl + '" class="button">View & Update Actions in Portal</a>' +
'</div>' +
'    <!-- CLOSING -->' +
'<div class="closing">' +
'    <p>Kindly review the above engineering observations and ensure that the necessary corrective actions are completed within the specified timeline.</p>' +
'    <p>Please update the corrective action and closure status in the BRL Engineering Audit System after completion.</p>' +
'    <p>Regards,<br><strong>Process QA</strong></p>' +
'</div>' +
'</div>' +
'</body>' +
'</html>';

  try {
    var mailOptions = {
      to: recipients,
      name: 'Process QA',
      replyTo: 'process.qa@borosil.com',
      subject: subject,
      htmlBody: html
    };

    if (ccRecipients && ccRecipients.trim().length > 0) {
      mailOptions.cc = ccRecipients.trim();
    }

    // Both inline embedded photos and file attachments
    if (Object.keys(inlineImagesObj).length > 0) {
      mailOptions.inlineImages = inlineImagesObj;
      mailOptions.attachments = attachmentsList;
    }

    MailApp.sendEmail(mailOptions);
  } catch (e) {
    Logger.log('MailApp error: ' + e.toString());
  }
}

function formatAuditDateTime(dateStr, timeStr) {
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var now = new Date();
  var day = ('0' + now.getDate()).slice(-2);
  var month = monthNames[now.getMonth()];
  var year = now.getFullYear();
  var time = timeStr || (('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2));

  if (dateStr && String(dateStr).indexOf('-') >= 0) {
    var parts = String(dateStr).split('-');
    if (parts.length === 3) {
      year = parts[0];
      var mIdx = Number(parts[1]) - 1;
      month = monthNames[mIdx] || month;
      day = ('0' + Number(parts[2])).slice(-2);
    }
  }
  return day + '-' + month + '-' + year + ' at ' + time;
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

  sendDeviationAlertEmail('ENG-TEST-' + Date.now(), testHeader, testActions, [], 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID, []);
}
