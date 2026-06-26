import { SAMPLE_EMPLOYEES } from "../lib/constants.js";

const LOCAL_EMPLOYEES_KEY = "guardiasPasivas.localEmployees";
const LOCAL_SCHEDULES_KEY = "guardiasPasivas.localSchedules";

export function createDataClient(appsScriptUrl) {
  const endpoint = appsScriptUrl?.trim();
  if (endpoint) return new AppsScriptClient(endpoint);
  return new LocalDataClient();
}

class AppsScriptClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.type = "apps-script";
  }

  async health() {
    return this.request("health");
  }

  async listEmployees() {
    return this.request("listEmployees");
  }

  async createEmployee(employee) {
    return this.request("createEmployee", { employee });
  }

  async updateEmployee(id, changes) {
    return this.request("updateEmployee", { id, changes });
  }

  async deleteEmployee(id) {
    return this.request("deleteEmployee", { id });
  }

  async saveSchedule(schedule) {
    return this.request("saveSchedule", { schedule });
  }

  async listSchedules() {
    return this.request("listSchedules");
  }

  async request(action, payload) {
    const hasPayload = Boolean(payload);
    const url = new URL(this.endpoint);
    url.searchParams.set("action", action);

    const response = await fetch(url.toString(), {
      method: hasPayload ? "POST" : "GET",
      headers: hasPayload
        ? {
            "Content-Type": "text/plain;charset=utf-8",
          }
        : undefined,
      body: hasPayload ? JSON.stringify({ action, ...payload }) : undefined,
      redirect: "follow",
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Apps Script no devolvio JSON valido. Revisa el despliegue del Web App.");
    }

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "No se pudo completar la operacion.");
    }

    return normalizeResponse(action, result.data);
  }
}

class LocalDataClient {
  constructor() {
    this.type = "local-demo";
    ensureLocalData();
  }

  async health() {
    return {
      mode: "demo",
      spreadsheetUrl: "",
      employeeCount: this.readEmployees().length,
    };
  }

  async listEmployees() {
    return this.readEmployees();
  }

  async createEmployee(employee) {
    const now = new Date().toISOString();
    const employees = this.readEmployees();
    const created = normalizeEmployee({
      ...employee,
      id: crypto.randomUUID(),
      activo: employee.activo ?? true,
      created_at: now,
      updated_at: now,
    });

    employees.push(created);
    this.writeEmployees(employees);
    return created;
  }

  async updateEmployee(id, changes) {
    const employees = this.readEmployees();
    const nextEmployees = employees.map((employee) =>
      employee.id === id
        ? normalizeEmployee({
            ...employee,
            ...changes,
            updated_at: new Date().toISOString(),
          })
        : employee,
    );

    this.writeEmployees(nextEmployees);
    return nextEmployees.find((employee) => employee.id === id);
  }

  async deleteEmployee(id) {
    this.writeEmployees(this.readEmployees().filter((employee) => employee.id !== id));
    return { id };
  }

  async saveSchedule(schedule) {
    const schedules = this.readSchedules();
    const saved = {
      ...schedule,
      id: schedule.id || crypto.randomUUID(),
      createdAt: schedule.createdAt || new Date().toISOString(),
    };

    this.writeSchedules([saved, ...schedules]);
    return saved;
  }

  async listSchedules() {
    return this.readSchedules().map((schedule) => ({
      id: schedule.id,
      periodo: schedule.periodo,
      month: schedule.month,
      year: schedule.year,
      createdAt: schedule.createdAt,
      total_guardias: schedule.rows?.length ? schedule.rows.length * 3 : 0,
    }));
  }

  readEmployees() {
    return JSON.parse(localStorage.getItem(LOCAL_EMPLOYEES_KEY) || "[]").map(normalizeEmployee);
  }

  writeEmployees(employees) {
    localStorage.setItem(LOCAL_EMPLOYEES_KEY, JSON.stringify(employees));
  }

  readSchedules() {
    return JSON.parse(localStorage.getItem(LOCAL_SCHEDULES_KEY) || "[]");
  }

  writeSchedules(schedules) {
    localStorage.setItem(LOCAL_SCHEDULES_KEY, JSON.stringify(schedules));
  }
}

function ensureLocalData() {
  if (!localStorage.getItem(LOCAL_EMPLOYEES_KEY)) {
    localStorage.setItem(LOCAL_EMPLOYEES_KEY, JSON.stringify(SAMPLE_EMPLOYEES));
  }
  if (!localStorage.getItem(LOCAL_SCHEDULES_KEY)) {
    localStorage.setItem(LOCAL_SCHEDULES_KEY, "[]");
  }
}

function normalizeResponse(action, data) {
  if (action === "listEmployees") return (data || []).map(normalizeEmployee);
  if (action === "createEmployee" || action === "updateEmployee") return normalizeEmployee(data);
  return data;
}

export function normalizeEmployee(employee) {
  return {
    id: String(employee.id || ""),
    nombre: employee.nombre || "",
    apellido: employee.apellido || "",
    legajo: String(employee.legajo || ""),
    turno_ordinario: employee.turno_ordinario || "",
    restriccion_horaria: employee.restriccion_horaria || "",
    activo: toBoolean(employee.activo),
    created_at: employee.created_at || "",
    updated_at: employee.updated_at || "",
  };
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return !["false", "0", "no", "licencia", ""].includes(value.toLowerCase());
  }
  return Boolean(value);
}
