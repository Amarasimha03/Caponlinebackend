// ============================================================
// Online Test Portal — Google Apps Script Backend (Code.gs)
// ============================================================
// Sheet names: employees | assessments | questions | assignments
//              results   | violations  | sessions  | monitoring
// ============================================================

var SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ── Entry Points ────────────────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var body   = {};

    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (_) {}
    }

    var action = (e.parameter && e.parameter.action) ? e.parameter.action : (body && body.action) ? body.action : '';

    // Merge GET params into body for convenience
    if (e.parameter) {
      for (var k in e.parameter) {
        if (k !== 'action' && body[k] === undefined) body[k] = e.parameter[k];
      }
    }

    switch (action) {
      // ── Bulk DB load (server startup) ──
      case 'getDatabase':       return getDatabase();

      // ── Employees ──
      case 'createEmployee':    return createEmployee(body);
      case 'getEmployees':      return getEmployees();
      case 'updateEmployee':    return updateEmployee(body);

      // ── Assessments ──
      case 'createAssessment':  return createAssessment(body);
      case 'getAssessments':    return getAssessments();
      case 'updateAssessment':  return updateAssessment(body);

      // ── Questions ──
      case 'addQuestion':       return addQuestion(body);
      case 'getQuestions':      return getQuestions(body);

      // ── Assignments ──
      case 'assignAssessment':  return assignAssessment(body);
      case 'getAssignments':    return getAssignments(body);

      // ── Exam Lifecycle ──
      case 'startExam':         return startExam(body);
      case 'submitResult':      return submitResult(body);
      case 'getResults':        return getResults(body);

      // ── Violations ──
      case 'addViolation':      return addViolation(body);
      case 'getViolations':     return getViolations(body);
      case 'saveViolation':     return saveViolation(body);

      // ── Sessions ──
      case 'saveSession':       return saveSession(body);
      case 'getSession':        return getSession(body);

      // ── Monitoring ──
      case 'saveMonitoring':    return saveMonitoring(body);
      case 'getMonitoring':     return getMonitoring(body);

      // ── Attempt Control ──
      case 'checkAttempt':      return checkAttempt(body);
      case 'getAttempts':       return getAttempts();
      case 'resetAttempt':      return resetAttempt(body);

      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString(), stack: err.stack });
  }
}

// ── Helpers ─────────────────────────────────────────────────

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 9999);
}

function sheetToObjects(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // Skip completely empty rows
    if (!row[0] || row[0].toString().trim() === '') continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j].toString() : '';
    }
    rows.push(obj);
  }
  return rows;
}

function ensureHeaders(sheet, headers) {
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasHeaders = firstRow[0] && firstRow[0].toString().trim() !== '';
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

function findRowById(sheet, idColIndex, idValue) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][idColIndex] && values[i][idColIndex].toString() === idValue.toString()) {
      return i + 1; // 1-based row number
    }
  }
  return -1;
}

// ── BULK DB LOAD (called by Node server on startup) ─────────

function getDatabase() {
  var db = {
    employees:   [],
    assessments: [],
    questions:   [],
    assignments: [],
    results:     [],
    violations:  [],
    sessions:    [],
    monitoring:  [],
    attempts:    []
  };

  try { db.employees   = sheetToObjects(getSheet('employees'));   } catch(_) {}
  try { db.assessments = sheetToObjects(getSheet('assessments')); } catch(_) {}
  try { db.questions   = sheetToObjects(getSheet('questions'));   } catch(_) {}
  try { db.assignments = sheetToObjects(getSheet('assignments')); } catch(_) {}
  try { db.results     = sheetToObjects(getSheet('results'));     } catch(_) {}
  try { db.violations  = sheetToObjects(getSheet('violations'));  } catch(_) {}
  try { db.sessions    = sheetToObjects(getSheet('sessions'));    } catch(_) {}
  try { db.monitoring  = sheetToObjects(getSheet('monitoring'));  } catch(_) {}
  try { db.attempts    = sheetToObjects(getSheet('attempts'));    } catch(_) {}

  return jsonResponse({ success: true, data: db });
}

// ── EMPLOYEES ────────────────────────────────────────────────

var EMP_HEADERS = [
  '_id', 'employeeId', 'fullName', 'email', 'phone',
  'department', 'designation', 'company', 'role', 'password',
  'isActive', 'isVerified', 'assignedAssessments',
  'examStats', 'createdAt', 'updatedAt'
];

function createEmployee(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('employees');
    ensureHeaders(sheet, EMP_HEADERS);

    var id = body._id || generateId('EMP');
    var now = new Date().toISOString();

    sheet.appendRow([
      id,
      body.employeeId || id,
      body.fullName || body.name || '',
      body.email || '',
      body.phone || '',
      body.department || '',
      body.designation || '',
      body.company || '',
      body.role || 'employee',
      body.password || '',
      body.isActive !== undefined ? body.isActive.toString() : 'true',
      'true',
      JSON.stringify(body.assignedAssessments || []),
      JSON.stringify(body.examStats || {}),
      body.createdAt || now,
      now
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function getEmployees() {
  var sheet = getSheet('employees');
  ensureHeaders(sheet, EMP_HEADERS);
  return jsonResponse({ success: true, data: sheetToObjects(sheet) });
}

function updateEmployee(body) {
  if (!body._id) return jsonResponse({ success: false, message: '_id required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('employees');
    var rowNum = findRowById(sheet, 0, body._id); // _id is col 0
    if (rowNum === -1) return jsonResponse({ success: false, message: 'Employee not found' });

    var headers = sheet.getRange(1, 1, 1, EMP_HEADERS.length).getValues()[0];
    var row     = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

    // Patch fields
    var fieldMap = {
      fullName: 2, email: 3, phone: 4, department: 5,
      designation: 6, company: 7, role: 8, password: 9,
      isActive: 10, assignedAssessments: 12, examStats: 13
    };
    for (var f in fieldMap) {
      if (body[f] !== undefined) {
        var val = (typeof body[f] === 'object') ? JSON.stringify(body[f]) : body[f].toString();
        row[fieldMap[f]] = val;
      }
    }
    row[15] = new Date().toISOString(); // updatedAt

    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// ── ASSESSMENTS ──────────────────────────────────────────────

var ASM_HEADERS = [
  '_id', 'title', 'description', 'duration', 'passingScore',
  'category', 'status', 'maxViolations', 'isRandomized',
  'questions', 'assignedTo', 'createdBy', 'createdAt', 'updatedAt'
];

function createAssessment(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('assessments');
    ensureHeaders(sheet, ASM_HEADERS);

    var id  = body._id || generateId('ASM');
    var now = new Date().toISOString();

    sheet.appendRow([
      id,
      body.title || '',
      body.description || '',
      body.duration || 30,
      body.passingScore || body.passScore || 60,
      body.category || 'General',
      body.status || 'draft',
      body.maxViolations || 3,
      body.isRandomized ? 'true' : 'false',
      JSON.stringify(body.questions || []),
      JSON.stringify(body.assignedTo || []),
      body.createdBy || '',
      body.createdAt || now,
      now
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function getAssessments() {
  var sheet = getSheet('assessments');
  ensureHeaders(sheet, ASM_HEADERS);
  return jsonResponse({ success: true, data: sheetToObjects(sheet) });
}

function updateAssessment(body) {
  if (!body._id) return jsonResponse({ success: false, message: '_id required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('assessments');
    var rowNum = findRowById(sheet, 0, body._id);
    if (rowNum === -1) return jsonResponse({ success: false, message: 'Assessment not found' });

    var row = sheet.getRange(rowNum, 1, 1, ASM_HEADERS.length).getValues()[0];

    var fieldMap = {
      title: 1, description: 2, duration: 3, passingScore: 4,
      category: 5, status: 6, maxViolations: 7, isRandomized: 8,
      questions: 9, assignedTo: 10
    };
    for (var f in fieldMap) {
      if (body[f] !== undefined) {
        var val = (typeof body[f] === 'object') ? JSON.stringify(body[f]) : body[f].toString();
        row[fieldMap[f]] = val;
      }
    }
    row[13] = new Date().toISOString(); // updatedAt

    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// ── QUESTIONS ────────────────────────────────────────────────

var Q_HEADERS = [
  '_id', 'assessmentId', 'title', 'type',
  'option1', 'option2', 'option3', 'option4',
  'correctOptionIndex', 'correctAnswer',
  'difficulty', 'marks', 'explanation', 'createdBy', 'createdAt'
];

function addQuestion(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('questions');
    ensureHeaders(sheet, Q_HEADERS);

    var id  = body._id || generateId('Q');
    var now = new Date().toISOString();

    // Normalize options array
    var opts = body.options || [];
    var opt1 = '', opt2 = '', opt3 = '', opt4 = '';
    var correctIdx = -1;
    if (opts.length > 0) {
      opt1 = (typeof opts[0] === 'object') ? (opts[0].text || '') : opts[0] || '';
      opt2 = opts[1] ? ((typeof opts[1] === 'object') ? (opts[1].text || '') : opts[1]) : '';
      opt3 = opts[2] ? ((typeof opts[2] === 'object') ? (opts[2].text || '') : opts[2]) : '';
      opt4 = opts[3] ? ((typeof opts[3] === 'object') ? (opts[3].text || '') : opts[3]) : '';
      for (var i = 0; i < opts.length; i++) {
        if (opts[i] && opts[i].isCorrect) { correctIdx = i; break; }
      }
    }
    // Override with explicit fields
    if (body.option1 !== undefined) opt1 = body.option1;
    if (body.option2 !== undefined) opt2 = body.option2;
    if (body.option3 !== undefined) opt3 = body.option3;
    if (body.option4 !== undefined) opt4 = body.option4;

    sheet.appendRow([
      id,
      body.assessmentId || body.assessment || '',
      body.title || body.question || '',
      body.type || 'mcq',
      opt1, opt2, opt3, opt4,
      correctIdx,
      body.correctAnswer || correctIdx,
      body.difficulty || 'medium',
      body.marks || 1,
      body.explanation || '',
      body.createdBy || '',
      body.createdAt || now
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function getQuestions(body) {
  var sheet = getSheet('questions');
  ensureHeaders(sheet, Q_HEADERS);
  var rows = sheetToObjects(sheet);
  var assessmentId = body.assessmentId || '';
  if (assessmentId) {
    rows = rows.filter(function(r) {
      return r.assessmentId === assessmentId || r.assessmentId === assessmentId.toString();
    });
  }
  return jsonResponse({ success: true, data: rows });
}

// ── ASSIGNMENTS ──────────────────────────────────────────────

var ASSIGN_HEADERS = [
  '_id', 'employeeId', 'employeeMongoId', 'assessmentId',
  'examName', 'status', 'assignedBy', 'assignedAt'
];

function assignAssessment(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('assignments');
    ensureHeaders(sheet, ASSIGN_HEADERS);

    var id = generateId('ASN');

    sheet.appendRow([
      id,
      body.employeeId || '',
      body.employeeMongoId || '',
      body.assessmentId || '',
      body.examName || '',
      body.status || 'pending',
      body.assignedBy || 'Admin',
      new Date().toISOString()
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function getAssignments(body) {
  var sheet = getSheet('assignments');
  ensureHeaders(sheet, ASSIGN_HEADERS);
  var rows = sheetToObjects(sheet);
  if (body.employeeId) {
    rows = rows.filter(function(r) { return r.employeeId === body.employeeId.toString(); });
  }
  if (body.assessmentId) {
    rows = rows.filter(function(r) { return r.assessmentId === body.assessmentId.toString(); });
  }
  return jsonResponse({ success: true, data: rows });
}

// ── RESULTS ──────────────────────────────────────────────────

var RES_HEADERS = [
  '_id', 'employeeId', 'employeeMongoId', 'employeeName', 'employeeEmail',
  'assessmentId', 'assessmentTitle',
  'totalScore', 'totalMarks', 'percentage', 'passed',
  'status', 'violationCount', 'completionTime',
  'startedAt', 'submittedAt', 'autoSubmitReason', 'submissionType',
  'correctAnswers', 'wrongAnswers', 'createdAt', 'answers'
];

function startExam(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('results');
    ensureHeaders(sheet, RES_HEADERS);

    var id  = body._id || body.resultId || generateId('RES');
    var now = new Date().toISOString();

    sheet.appendRow([
      id,
      body.employeeId || '',
      body.employeeMongoId || '',
      body.employeeName || '',
      body.employeeEmail || '',
      body.assessmentId || '',
      body.assessmentTitle || '',
      0, 0, 0, 'false',
      'in-progress', 0, 0,
      body.startedAt || now,
      '', '', '', 0, 0, now, '[]'
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function submitResult(body) {
  if (!body._id && !body.resultId) return jsonResponse({ success: false, message: '_id or resultId required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('results');
    ensureHeaders(sheet, RES_HEADERS);

    var resultId = body._id || body.resultId;
    var rowNum   = findRowById(sheet, 0, resultId);
    var now      = new Date().toISOString();

    if (rowNum === -1) {
      // Insert new row (exam submitted without prior startExam call)
      sheet.appendRow([
        resultId,
        body.employeeId || '',
        body.employeeMongoId || '',
        body.employeeName || '',
        body.employeeEmail || '',
        body.assessmentId || '',
        body.assessmentTitle || '',
        body.totalScore || 0,
        body.totalMarks || 0,
        body.percentage || 0,
        body.passed ? 'true' : 'false',
        body.status || 'submitted',
        body.violationCount || 0,
        body.completionTime || 0,
        body.startedAt || now,
        body.submittedAt || now,
        body.autoSubmitReason || '',
        body.submissionType || 'Manual',
        body.correctAnswers || 0,
        body.wrongAnswers || 0,
        now,
        body.answers || '[]'
      ]);
    } else {
      var row = sheet.getRange(rowNum, 1, 1, RES_HEADERS.length).getValues()[0];
      row[7]  = body.totalScore      !== undefined ? body.totalScore      : row[7];
      row[8]  = body.totalMarks      !== undefined ? body.totalMarks      : row[8];
      row[9]  = body.percentage      !== undefined ? body.percentage      : row[9];
      row[10] = body.passed          !== undefined ? body.passed.toString(): row[10];
      row[11] = body.status          || row[11];
      row[12] = body.violationCount  !== undefined ? body.violationCount  : row[12];
      row[13] = body.completionTime  !== undefined ? body.completionTime  : row[13];
      row[15] = body.submittedAt     || now;
      row[16] = body.autoSubmitReason !== undefined ? (body.autoSubmitReason || '') : row[16];
      row[17] = body.submissionType  || row[17] || 'Manual';
      row[18] = body.correctAnswers  !== undefined ? body.correctAnswers  : row[18];
      row[19] = body.wrongAnswers    !== undefined ? body.wrongAnswers    : row[19];
      row[21] = body.answers         !== undefined ? (typeof body.answers === 'object' ? JSON.stringify(body.answers) : body.answers) : row[21];
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    }

    return jsonResponse({ success: true, _id: resultId });
  } finally {
    lock.releaseLock();
  }
}

function getResults(body) {
  var sheet = getSheet('results');
  ensureHeaders(sheet, RES_HEADERS);
  var rows = sheetToObjects(sheet);
  if (body && body.employeeId) {
    rows = rows.filter(function(r) { return r.employeeId === body.employeeId.toString(); });
  }
  if (body && body.assessmentId) {
    rows = rows.filter(function(r) { return r.assessmentId === body.assessmentId.toString(); });
  }
  return jsonResponse({ success: true, data: rows });
}

// ── VIOLATIONS ───────────────────────────────────────────────

var VIO_HEADERS = [
  '_id', 'employeeId', 'employeeMongoId', 'employeeName',
  'assessmentId', 'resultId',
  'type', 'description', 'severity', 'timestamp'
];

function addViolation(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('violations');
    ensureHeaders(sheet, VIO_HEADERS);

    var id = generateId('VIO');

    sheet.appendRow([
      id,
      body.employeeId || '',
      body.employeeMongoId || '',
      body.employeeName || '',
      body.assessmentId || '',
      body.resultId || '',
      body.type || '',
      body.description || '',
      body.severity || 'medium',
      body.timestamp || new Date().toISOString()
    ]);

    return jsonResponse({ success: true, _id: id });
  } finally {
    lock.releaseLock();
  }
}

function getViolations(body) {
  var sheet = getSheet('violations');
  ensureHeaders(sheet, VIO_HEADERS);
  var rows = sheetToObjects(sheet);
  if (body && body.employeeId) {
    rows = rows.filter(function(r) { return r.employeeId === body.employeeId.toString(); });
  }
  if (body && body.assessmentId) {
    rows = rows.filter(function(r) { return r.assessmentId === body.assessmentId.toString(); });
  }
  return jsonResponse({ success: true, data: rows });
}

// ── SESSIONS ─────────────────────────────────────────────────

var SESS_HEADERS = [
  'userId', 'name', 'email', 'role',
  'status', 'loginTime', 'logoutTime', 'updatedAt'
];

function saveSession(body) {
  if (!body.userId) return jsonResponse({ success: false, message: 'userId required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('sessions');
    ensureHeaders(sheet, SESS_HEADERS);

    var rowNum = findRowById(sheet, 0, body.userId);
    var now    = new Date().toISOString();

    if (rowNum === -1) {
      sheet.appendRow([
        body.userId, body.name || '', body.email || '',
        body.role || '', body.status || 'active',
        body.loginTime || now, body.logoutTime || '', now
      ]);
    } else {
      var row = sheet.getRange(rowNum, 1, 1, SESS_HEADERS.length).getValues()[0];
      if (body.name)       row[1] = body.name;
      if (body.email)      row[2] = body.email;
      if (body.role)       row[3] = body.role;
      if (body.status)     row[4] = body.status;
      if (body.loginTime)  row[5] = body.loginTime;
      if (body.logoutTime) row[6] = body.logoutTime;
      row[7] = now;
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    }

    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function getSession(body) {
  if (!body.userId) return jsonResponse({ success: false, message: 'userId required' });
  var sheet  = getSheet('sessions');
  ensureHeaders(sheet, SESS_HEADERS);
  var rowNum = findRowById(sheet, 0, body.userId);
  if (rowNum === -1) return jsonResponse({ success: false, message: 'Session not found' });

  var headers = sheet.getRange(1, 1, 1, SESS_HEADERS.length).getValues()[0];
  var row     = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  var session = {};
  for (var i = 0; i < headers.length; i++) {
    session[headers[i]] = row[i] !== undefined ? row[i].toString() : '';
  }
  return jsonResponse({ success: true, session: session });
}

// ── MONITORING ───────────────────────────────────────────────

var MON_HEADERS = [
  'userId', 'cameraStatus', 'screenShareStatus',
  'warningCount', 'lastActive', 'updatedAt'
];

function saveMonitoring(body) {
  if (!body.userId) return jsonResponse({ success: false, message: 'userId required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet  = getSheet('monitoring');
    ensureHeaders(sheet, MON_HEADERS);

    var rowNum = findRowById(sheet, 0, body.userId);
    var now    = new Date().toISOString();

    if (rowNum === -1) {
      sheet.appendRow([
        body.userId,
        body.cameraStatus || 'unknown',
        body.screenShareStatus || 'unknown',
        body.warningCount || 0,
        now, now
      ]);
    } else {
      var row = sheet.getRange(rowNum, 1, 1, MON_HEADERS.length).getValues()[0];
      if (body.cameraStatus !== undefined)      row[1] = body.cameraStatus;
      if (body.screenShareStatus !== undefined) row[2] = body.screenShareStatus;
      if (body.warningCount !== undefined)      row[3] = body.warningCount;
      row[4] = now;
      row[5] = now;
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    }

    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function getMonitoring(body) {
  if (!body.userId) return jsonResponse({ success: false, message: 'userId required' });
  var sheet  = getSheet('monitoring');
  ensureHeaders(sheet, MON_HEADERS);
  var rowNum = findRowById(sheet, 0, body.userId);
  if (rowNum === -1) return jsonResponse({ success: false, message: 'Not found' });

  var headers = sheet.getRange(1, 1, 1, MON_HEADERS.length).getValues()[0];
  var row     = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  var mon     = {};
  for (var i = 0; i < headers.length; i++) {
    mon[headers[i]] = row[i] !== undefined ? row[i].toString() : '';
  }
  return jsonResponse({ success: true, monitoring: mon });
}

function saveViolation(data) {
  var sheet = getSheet("violations");
  ensureHeaders(sheet, ['timestamp', 'employeeId', 'name', 'warningCount', 'reason']);
  sheet.appendRow([
    new Date(),
    data.employeeId || '',
    data.name || '',
    data.warningCount || 0,
    data.reason || ''
  ]);
  return jsonResponse({ success: true });
}

var ATTEMPT_HEADERS = ['userId', 'assessmentId', 'attemptCount', 'maxAttempts', 'lastAttempted'];

function checkAttempt(body) {
  if (!body.userId || !body.assessmentId) return jsonResponse({ success: false, message: 'userId and assessmentId required' });
  var sheet = getSheet('attempts');
  ensureHeaders(sheet, ATTEMPT_HEADERS);
  var rows = sheetToObjects(sheet);
  
  var record = rows.find(function(r) {
    return r.userId === body.userId.toString() && r.assessmentId === body.assessmentId.toString();
  });
  
  if (!record) {
    var maxAttempts = body.maxAttempts || 3;
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow([body.userId, body.assessmentId, 0, maxAttempts, new Date().toISOString()]);
    } finally {
      lock.releaseLock();
    }
    return jsonResponse({ success: true, attemptCount: 0, maxAttempts: maxAttempts, allowed: true });
  }
  
  var count = Number(record.attemptCount) || 0;
  var max = Number(record.maxAttempts) || 3;
  return jsonResponse({
    success: true,
    attemptCount: count,
    maxAttempts: max,
    allowed: count < max
  });
}

function getAttempts() {
  var sheet = getSheet('attempts');
  ensureHeaders(sheet, ATTEMPT_HEADERS);
  return jsonResponse({ success: true, data: sheetToObjects(sheet) });
}

function resetAttempt(body) {
  if (!body.userId || !body.assessmentId) return jsonResponse({ success: false, message: 'userId and assessmentId required' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('attempts');
    ensureHeaders(sheet, ATTEMPT_HEADERS);
    var rowNum = -1;
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0].toString() === body.userId.toString() && values[i][1].toString() === body.assessmentId.toString()) {
        rowNum = i + 1;
        break;
      }
    }
    if (rowNum === -1) return jsonResponse({ success: false, message: 'Record not found' });
    
    var row = sheet.getRange(rowNum, 1, 1, ATTEMPT_HEADERS.length).getValues()[0];
    row[2] = 0; // reset attemptCount
    row[4] = new Date().toISOString();
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    return jsonResponse({ success: true, message: 'Attempts reset successful' });
  } finally {
    lock.releaseLock();
  }
}
