const SHEET_NAMES = {
  EMPLOYEES: "Empleados",
  SCHEDULES: "Sorteos",
  DETAILS: "SorteosDetalle",
};

const EMPLOYEE_HEADERS = [
  "id",
  "nombre",
  "apellido",
  "legajo",
  "turno_ordinario",
  "restriccion_horaria",
  "activo",
  "created_at",
  "updated_at",
];

const SCHEDULE_HEADERS = [
  "id",
  "periodo",
  "mes",
  "anio",
  "generado_en",
  "total_guardias",
];

const DETAIL_HEADERS = [
  "sorteo_id",
  "fecha",
  "dia",
  "turno",
  "empleado_id",
  "apellido",
  "nombre",
  "legajo",
];

function setup() {
  const spreadsheet = getSpreadsheet_();
  ensureSheets_(spreadsheet);
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function doGet(event) {
  return handleRequest_(event, {});
}

function doPost(event) {
  const body = parseBody_(event);
  return handleRequest_(event, body);
}

function handleRequest_(event, body) {
  try {
    const action = body.action || event.parameter.action || "health";
    const result = route_(action, body);
    return json_({ ok: true, data: result });
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) });
  }
}

function route_(action, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = getSpreadsheet_();
    ensureSheets_(spreadsheet);

    switch (action) {
      case "health":
        return health_(spreadsheet);
      case "listEmployees":
        return listEmployees_(spreadsheet);
      case "createEmployee":
        return createEmployee_(spreadsheet, payload.employee);
      case "updateEmployee":
        return updateEmployee_(spreadsheet, payload.id, payload.changes);
      case "deleteEmployee":
        return deleteEmployee_(spreadsheet, payload.id);
      case "saveSchedule":
        return saveSchedule_(spreadsheet, payload.schedule);
      case "listSchedules":
        return listSchedules_(spreadsheet);
      case "getSchedule":
        return getSchedule_(spreadsheet, payload.id || payload.scheduleId);
      default:
        throw new Error("Accion no reconocida: " + action);
    }
  } finally {
    lock.releaseLock();
  }
}

function health_(spreadsheet) {
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    employeeCount: listEmployees_(spreadsheet).length,
  };
}

function listEmployees_(spreadsheet) {
  return readObjects_(spreadsheet.getSheetByName(SHEET_NAMES.EMPLOYEES), EMPLOYEE_HEADERS)
    .map(normalizeEmployee_)
    .sort((a, b) => {
      const left = `${a.apellido} ${a.nombre}`.toLowerCase();
      const right = `${b.apellido} ${b.nombre}`.toLowerCase();
      return left.localeCompare(right);
    });
}

function createEmployee_(spreadsheet, employee) {
  if (!employee) throw new Error("Faltan datos del personal.");
  const sheet = spreadsheet.getSheetByName(SHEET_NAMES.EMPLOYEES);
  const now = new Date().toISOString();
  const created = normalizeEmployee_({
    id: Utilities.getUuid(),
    nombre: employee.nombre,
    apellido: employee.apellido,
    legajo: employee.legajo,
    turno_ordinario: employee.turno_ordinario,
    restriccion_horaria: employee.restriccion_horaria,
    activo: employee.activo !== false,
    created_at: now,
    updated_at: now,
  });

  validateEmployee_(created);
  sheet.appendRow(EMPLOYEE_HEADERS.map((header) => created[header]));
  return created;
}

function updateEmployee_(spreadsheet, id, changes) {
  if (!id) throw new Error("Falta el id del registro.");
  const sheet = spreadsheet.getSheetByName(SHEET_NAMES.EMPLOYEES);
  const rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error("No se encontro el registro.");

  const current = rowToObject_(sheet.getRange(rowIndex, 1, 1, EMPLOYEE_HEADERS.length).getValues()[0], EMPLOYEE_HEADERS);
  const updated = normalizeEmployee_({
    ...current,
    ...changes,
    id,
    updated_at: new Date().toISOString(),
  });

  validateEmployee_(updated);
  sheet.getRange(rowIndex, 1, 1, EMPLOYEE_HEADERS.length).setValues([
    EMPLOYEE_HEADERS.map((header) => updated[header]),
  ]);
  return updated;
}

function deleteEmployee_(spreadsheet, id) {
  if (!id) throw new Error("Falta el id del registro.");
  const sheet = spreadsheet.getSheetByName(SHEET_NAMES.EMPLOYEES);
  const rowIndex = findRowById_(sheet, id);
  if (rowIndex < 2) throw new Error("No se encontro el registro.");
  sheet.deleteRow(rowIndex);
  return { id };
}

function saveSchedule_(spreadsheet, schedule) {
  if (!schedule || !Array.isArray(schedule.rows)) {
    throw new Error("La planilla no tiene filas para guardar.");
  }

  const scheduleId = schedule.id || Utilities.getUuid();
  const schedulesSheet = spreadsheet.getSheetByName(SHEET_NAMES.SCHEDULES);
  const detailsSheet = spreadsheet.getSheetByName(SHEET_NAMES.DETAILS);
  const createdAt = schedule.createdAt || new Date().toISOString();
  const detailRows = [];

  schedule.rows.forEach((row) => {
    Object.keys(row.assignments || {}).forEach((shiftId) => {
      const assigned = row.assignments[shiftId] || {};
      detailRows.push([
        scheduleId,
        row.date,
        row.day,
        shiftId,
        assigned.employeeId || "",
        assigned.apellido || "",
        assigned.nombre || "",
        assigned.legajo || "",
      ]);
    });
  });

  schedulesSheet.appendRow([
    scheduleId,
    schedule.periodo || `${schedule.month}/${schedule.year}`,
    schedule.month,
    schedule.year,
    createdAt,
    detailRows.length,
  ]);

  if (detailRows.length > 0) {
    detailsSheet
      .getRange(detailsSheet.getLastRow() + 1, 1, detailRows.length, DETAIL_HEADERS.length)
      .setValues(detailRows);
  }

  return {
    id: scheduleId,
    periodo: schedule.periodo,
    month: schedule.month,
    year: schedule.year,
    createdAt,
    total_guardias: detailRows.length,
  };
}

function listSchedules_(spreadsheet) {
  return readObjects_(spreadsheet.getSheetByName(SHEET_NAMES.SCHEDULES), SCHEDULE_HEADERS)
    .map((row) => ({
      id: String(row.id || ""),
      periodo: row.periodo || "",
      month: Number(row.mes || row.month || 0),
      year: Number(row.anio || row.year || 0),
      createdAt: row.generado_en || row.createdAt || "",
      total_guardias: Number(row.total_guardias || 0),
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function getSchedule_(spreadsheet, scheduleId) {
  if (!scheduleId) throw new Error("Falta el id de la planilla.");
  const schedule = listSchedules_(spreadsheet).find((item) => item.id === scheduleId);
  if (!schedule) throw new Error("No se encontro la planilla.");

  const details = readObjects_(spreadsheet.getSheetByName(SHEET_NAMES.DETAILS), DETAIL_HEADERS)
    .filter((row) => String(row.sorteo_id) === scheduleId);

  const rowsByDate = {};
  details.forEach((detail) => {
    if (!rowsByDate[detail.fecha]) {
      rowsByDate[detail.fecha] = {
        date: detail.fecha,
        day: Number(detail.dia),
        assignments: {},
      };
    }
    rowsByDate[detail.fecha].assignments[detail.turno] = {
      employeeId: detail.empleado_id,
      apellido: detail.apellido,
      nombre: detail.nombre,
      legajo: detail.legajo,
    };
  });

  return {
    ...schedule,
    rows: Object.values(rowsByDate).sort((a, b) => a.day - b.day),
  };
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const configuredId = properties.getProperty("SPREADSHEET_ID");

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    properties.setProperty("SPREADSHEET_ID", active.getId());
    return active;
  }

  const created = SpreadsheetApp.create("Guardias Pasivas DB");
  properties.setProperty("SPREADSHEET_ID", created.getId());
  return created;
}

function ensureSheets_(spreadsheet) {
  ensureSheet_(spreadsheet, SHEET_NAMES.EMPLOYEES, EMPLOYEE_HEADERS);
  ensureSheet_(spreadsheet, SHEET_NAMES.SCHEDULES, SCHEDULE_HEADERS);
  ensureSheet_(spreadsheet, SHEET_NAMES.DETAILS, DETAIL_HEADERS);
}

function ensureSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const shouldWriteHeaders = currentHeaders.every((cell) => cell === "");

  if (shouldWriteHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#edf1ef");
    sheet.autoResizeColumns(1, headers.length);
  }
}

function readObjects_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => rowToObject_(row, headers));
}

function rowToObject_(row, headers) {
  return headers.reduce((object, header, index) => {
    object[header] = row[index];
    return object;
  }, {});
}

function findRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const index = ids.findIndex((row) => String(row[0]) === String(id));
  return index === -1 ? -1 : index + 2;
}

function normalizeEmployee_(employee) {
  return {
    id: String(employee.id || ""),
    nombre: String(employee.nombre || "").trim(),
    apellido: String(employee.apellido || "").trim(),
    legajo: String(employee.legajo || "").trim(),
    turno_ordinario: String(employee.turno_ordinario || ""),
    restriccion_horaria: String(employee.restriccion_horaria || ""),
    activo: toBoolean_(employee.activo),
    created_at: employee.created_at || new Date().toISOString(),
    updated_at: employee.updated_at || new Date().toISOString(),
  };
}

function validateEmployee_(employee) {
  if (!employee.nombre) throw new Error("El nombre es obligatorio.");
  if (!employee.apellido) throw new Error("El apellido es obligatorio.");
  if (!employee.legajo) throw new Error("El legajo es obligatorio.");
}

function toBoolean_(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").toLowerCase();
  if (["false", "0", "no", "licencia", ""].indexOf(normalized) !== -1) {
    return false;
  }
  return true;
}

function parseBody_(event) {
  if (!event.postData || !event.postData.contents) return {};
  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    throw new Error("No se pudo leer el cuerpo de la solicitud.");
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
