import {
  CalendarDays,
  Check,
  ClipboardList,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DATA_SOURCE_KEY, EMPTY_EMPLOYEE, MONTHS, SHIFTS } from "./lib/constants.js";
import {
  employeeName,
  formatDateLabel,
  generateSchedule,
  monthLabel,
  shiftLabel,
  shiftRange,
} from "./lib/schedule.js";
import { createDataClient } from "./services/dataClient.js";

const initialEndpoint = import.meta.env.VITE_APPS_SCRIPT_URL || "";

export default function App() {
  const [activeTab, setActiveTab] = useState("sorteo");
  const [appsScriptUrl, setAppsScriptUrl] = useState(
    () => localStorage.getItem(DATA_SOURCE_KEY) || initialEndpoint,
  );
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const client = useMemo(() => createDataClient(appsScriptUrl), [appsScriptUrl]);
  const sourceLabel = appsScriptUrl ? "Google Sheets" : "Demo local";

  async function refreshData() {
    setLoading(true);
    try {
      const [employeeRows, scheduleRows] = await Promise.all([
        client.listEmployees(),
        client.listSchedules(),
      ]);
      setEmployees(employeeRows);
      setSchedules(scheduleRows || []);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, [client]);

  function notify(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(null), 3600);
  }

  async function createEmployee(employee) {
    setBusy(true);
    try {
      await client.createEmployee(employee);
      notify("Personal cargado correctamente.");
      await refreshData();
      setActiveTab("personal");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function updateEmployee(id, changes) {
    setBusy(true);
    try {
      await client.updateEmployee(id, changes);
      notify("Datos actualizados.");
      await refreshData();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee(id) {
    if (!window.confirm("Eliminar este registro de personal?")) return;
    setBusy(true);
    try {
      await client.deleteEmployee(id);
      notify("Registro eliminado.");
      await refreshData();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule() {
    if (!schedule) return;
    setBusy(true);
    try {
      await client.saveSchedule(schedule);
      notify("Planilla guardada en la base de datos.");
      await refreshData();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function saveEndpoint(nextUrl) {
    const trimmed = nextUrl.trim();
    if (trimmed) {
      localStorage.setItem(DATA_SOURCE_KEY, trimmed);
    } else {
      localStorage.removeItem(DATA_SOURCE_KEY);
    }
    setAppsScriptUrl(trimmed);
    notify(trimmed ? "Conexion configurada." : "Modo demo local activado.");
  }

  const stats = useMemo(() => buildStats(employees), [employees]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <CalendarDays size={26} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Hospital</p>
            <h1>Guardias Pasivas</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="source-pill">
            <Database size={16} aria-hidden="true" />
            {sourceLabel}
          </span>
          <button className="icon-button" type="button" onClick={refreshData} title="Actualizar">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="summary-grid" aria-label="Resumen">
          <Metric icon={Users} label="Personal" value={stats.total} />
          <Metric icon={Check} label="Activos" value={stats.active} accent="green" />
          <Metric icon={ClipboardList} label="Con restriccion" value={stats.restricted} accent="amber" />
          <Metric icon={X} label="Licencia" value={stats.inactive} accent="red" />
        </section>

        <nav className="tabs" aria-label="Vistas">
          <TabButton
            active={activeTab === "sorteo"}
            icon={CalendarDays}
            label="Sorteo"
            onClick={() => setActiveTab("sorteo")}
          />
          <TabButton
            active={activeTab === "personal"}
            icon={Users}
            label="Personal"
            onClick={() => setActiveTab("personal")}
          />
          <TabButton
            active={activeTab === "nuevo"}
            icon={UserRoundPlus}
            label="Nuevo"
            onClick={() => setActiveTab("nuevo")}
          />
          <TabButton
            active={activeTab === "config"}
            icon={Settings}
            label="Conexion"
            onClick={() => setActiveTab("config")}
          />
        </nav>

        {loading ? (
          <LoadingPanel />
        ) : (
          <>
            {activeTab === "sorteo" && (
              <DrawPage
                employees={employees}
                schedules={schedules}
                schedule={schedule}
                setSchedule={setSchedule}
                saveSchedule={saveSchedule}
                busy={busy}
                notify={notify}
              />
            )}
            {activeTab === "personal" && (
              <RosterPage
                employees={employees}
                busy={busy}
                updateEmployee={updateEmployee}
                deleteEmployee={deleteEmployee}
              />
            )}
            {activeTab === "nuevo" && <EmployeePage busy={busy} onSubmit={createEmployee} />}
            {activeTab === "config" && (
              <ConfigPage
                currentUrl={appsScriptUrl}
                onSave={saveEndpoint}
                client={client}
                notify={notify}
              />
            )}
          </>
        )}
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent = "blue" }) {
  return (
    <article className={`metric metric-${accent}`}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button className={active ? "tab active" : "tab"} type="button" onClick={onClick}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function LoadingPanel() {
  return (
    <section className="panel loading-panel">
      <Loader2 className="spin" size={28} aria-hidden="true" />
      <p>Cargando datos...</p>
    </section>
  );
}

function DrawPage({ employees, schedules, schedule, setSchedule, saveSchedule, busy, notify }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  function handleGenerate() {
    try {
      setSchedule(generateSchedule(employees, month, year));
      notify("Sorteo generado.");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function exportCsv() {
    if (!schedule) return;

    const header = ["Fecha", "Turno", "Apellido", "Nombre", "Legajo"];
    const lines = schedule.rows.flatMap((row) =>
      SHIFTS.map((shift) => {
        const assigned = row.assignments[shift.id];
        return [
          row.date,
          shift.label,
          assigned?.apellido || "",
          assigned?.nombre || "",
          assigned?.legajo || "",
        ];
      }),
    );

    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `guardias-${schedule.year}-${String(schedule.month).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="tool-layout">
      <div className="panel control-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Periodo</p>
            <h2>Generar planilla mensual</h2>
          </div>
        </div>

        <div className="form-grid compact">
          <label>
            <span>Mes</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Año</span>
            <input
              type="number"
              min="2024"
              max="2100"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </label>
        </div>

        <button className="primary-action" type="button" onClick={handleGenerate}>
          <CalendarDays size={18} aria-hidden="true" />
          Generar sorteo
        </button>

        <div className="history-list">
          <div className="mini-heading">
            <FileSpreadsheet size={16} aria-hidden="true" />
            <span>Planillas guardadas</span>
          </div>
          {schedules.length === 0 ? (
            <p className="empty-copy">Todavia no hay planillas guardadas.</p>
          ) : (
            schedules.slice(0, 6).map((item) => (
              <div className="history-row" key={item.id}>
                <strong>{item.periodo || monthLabel(item.month, item.year)}</strong>
                <span>{item.total_guardias || 0} guardias</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel schedule-panel">
        {!schedule ? (
          <div className="empty-state">
            <CalendarDays size={40} aria-hidden="true" />
            <h2>Sin planilla generada</h2>
            <p>Selecciona el periodo y genera el sorteo para revisar la asignacion.</p>
          </div>
        ) : (
          <>
            <div className="schedule-toolbar">
              <div>
                <p className="eyebrow">Planilla</p>
                <h2>{monthLabel(schedule.month, schedule.year)}</h2>
              </div>
              <div className="button-row">
                <button className="secondary-action" type="button" onClick={saveSchedule} disabled={busy}>
                  {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                  Guardar
                </button>
                <button className="secondary-action" type="button" onClick={exportCsv}>
                  <Download size={17} aria-hidden="true" />
                  CSV
                </button>
                <button className="secondary-action" type="button" onClick={() => window.print()}>
                  <Printer size={17} aria-hidden="true" />
                  Imprimir
                </button>
              </div>
            </div>
            <ScheduleTable schedule={schedule} />
          </>
        )}
      </div>
    </section>
  );
}

function ScheduleTable({ schedule }) {
  return (
    <div className="table-wrap printable">
      <table className="data-table schedule-table">
        <thead>
          <tr>
            <th>Fecha</th>
            {SHIFTS.map((shift) => (
              <th key={shift.id}>
                {shift.label}
                <span>{shift.range}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.rows.map((row) => (
            <tr key={row.date}>
              <td className="date-cell">
                <strong>{formatDateLabel(row.date)}</strong>
              </td>
              {SHIFTS.map((shift) => {
                const assigned = row.assignments[shift.id];
                return (
                  <td key={shift.id}>
                    <div className={`assignment ${shift.className}`}>
                      <strong>{assigned ? `${assigned.apellido}, ${assigned.nombre}` : "Sin personal"}</strong>
                      <span>LP {assigned?.legajo || "-"}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RosterPage({ employees, busy, updateEmployee, deleteEmployee }) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);

  const filtered = employees.filter((employee) =>
    `${employee.apellido} ${employee.nombre} ${employee.legajo}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <section className="panel">
      <div className="section-heading with-search">
        <div>
          <p className="eyebrow">Nomina</p>
          <h2>Personal registrado</h2>
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nombre, apellido o LP"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="table-wrap">
        <table className="data-table roster-table">
          <thead>
            <tr>
              <th>Personal</th>
              <th>Turno ordinario</th>
              <th>Restriccion</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((employee) => (
              <RosterRow
                key={employee.id}
                employee={employee}
                editing={editingId === employee.id}
                busy={busy}
                onEdit={() => setEditingId(employee.id)}
                onCancel={() => setEditingId(null)}
                onSave={async (changes) => {
                  await updateEmployee(employee.id, changes);
                  setEditingId(null);
                }}
                onToggle={() => updateEmployee(employee.id, { activo: !employee.activo })}
                onDelete={() => deleteEmployee(employee.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <p className="empty-copy padded">No se encontraron registros.</p>}
    </section>
  );
}

function RosterRow({ employee, editing, busy, onEdit, onCancel, onSave, onToggle, onDelete }) {
  const [draft, setDraft] = useState(employee);

  useEffect(() => {
    setDraft(employee);
  }, [employee, editing]);

  if (editing) {
    return (
      <tr className="editing-row">
        <td>
          <div className="inline-grid">
            <input
              value={draft.apellido}
              onChange={(event) => setDraft({ ...draft, apellido: event.target.value })}
              aria-label="Apellido"
            />
            <input
              value={draft.nombre}
              onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}
              aria-label="Nombre"
            />
            <input
              value={draft.legajo}
              onChange={(event) => setDraft({ ...draft, legajo: event.target.value })}
              aria-label="Legajo"
            />
          </div>
        </td>
        <td>
          <ShiftSelect
            value={draft.turno_ordinario}
            onChange={(value) => setDraft({ ...draft, turno_ordinario: value })}
          />
        </td>
        <td>
          <RestrictionSelect
            value={draft.restriccion_horaria}
            onChange={(value) => setDraft({ ...draft, restriccion_horaria: value })}
          />
        </td>
        <td>
          <StatusPill active={draft.activo} />
        </td>
        <td>
          <div className="icon-row">
            <button className="icon-button success" type="button" disabled={busy} onClick={() => onSave(draft)}>
              <Check size={17} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" disabled={busy} onClick={onCancel}>
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <div className="person-cell">
          <strong>{employeeName(employee)}</strong>
          <span>LP {employee.legajo}</span>
        </div>
      </td>
      <td>
        <span className="plain-pill">{shiftLabel(employee.turno_ordinario)}</span>
      </td>
      <td>
        {employee.restriccion_horaria ? (
          <span className="warning-pill">No {shiftLabel(employee.restriccion_horaria)}</span>
        ) : (
          <span className="muted-pill">Sin restriccion</span>
        )}
      </td>
      <td>
        <button className="status-button" type="button" onClick={onToggle} disabled={busy}>
          <StatusPill active={employee.activo} />
        </button>
      </td>
      <td>
        <div className="icon-row">
          <button className="icon-button" type="button" onClick={onEdit} title="Editar">
            <Edit3 size={17} aria-hidden="true" />
          </button>
          <button className="icon-button danger" type="button" onClick={onDelete} title="Eliminar">
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmployeePage({ busy, onSubmit }) {
  return (
    <section className="panel narrow-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Alta</p>
          <h2>Registrar personal</h2>
        </div>
      </div>
      <EmployeeForm busy={busy} onSubmit={onSubmit} />
    </section>
  );
}

function EmployeeForm({ busy, onSubmit }) {
  const [draft, setDraft] = useState(EMPTY_EMPLOYEE);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(draft);
    setDraft(EMPTY_EMPLOYEE);
  }

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>Apellido</span>
          <input
            required
            value={draft.apellido}
            onChange={(event) => updateField("apellido", event.target.value)}
            placeholder="Perez"
          />
        </label>
        <label>
          <span>Nombre</span>
          <input
            required
            value={draft.nombre}
            onChange={(event) => updateField("nombre", event.target.value)}
            placeholder="Juan"
          />
        </label>
        <label>
          <span>Legajo personal</span>
          <input
            required
            value={draft.legajo}
            onChange={(event) => updateField("legajo", event.target.value)}
            placeholder="929"
          />
        </label>
        <label>
          <span>Turno ordinario</span>
          <ShiftSelect
            value={draft.turno_ordinario}
            onChange={(value) => updateField("turno_ordinario", value)}
          />
        </label>
        <label className="span-2">
          <span>Restriccion horaria</span>
          <RestrictionSelect
            value={draft.restriccion_horaria}
            onChange={(value) => updateField("restriccion_horaria", value)}
          />
        </label>
      </div>

      <button className="primary-action" type="submit" disabled={busy}>
        {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
        Guardar personal
      </button>
    </form>
  );
}

function ConfigPage({ currentUrl, onSave, client, notify }) {
  const [draftUrl, setDraftUrl] = useState(currentUrl);
  const [checking, setChecking] = useState(false);

  async function testConnection() {
    setChecking(true);
    try {
      const result = await client.health();
      notify(
        result.spreadsheetUrl
          ? "Conexion correcta con Google Sheets."
          : "Modo demo local funcionando.",
      );
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="panel narrow-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Datos</p>
          <h2>Conexion Apps Script</h2>
        </div>
      </div>

      <div className="config-stack">
        <label>
          <span>URL del Web App</span>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="primary-action" type="button" onClick={() => onSave(draftUrl)}>
            <Save size={18} aria-hidden="true" />
            Guardar conexion
          </button>
          <button className="secondary-action" type="button" onClick={testConnection} disabled={checking}>
            {checking ? <Loader2 className="spin" size={17} /> : <Database size={17} />}
            Probar
          </button>
          <button className="secondary-action" type="button" onClick={() => onSave("")}>
            <X size={17} aria-hidden="true" />
            Demo local
          </button>
        </div>
      </div>
    </section>
  );
}

function ShiftSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Sin turno</option>
      {SHIFTS.map((shift) => (
        <option key={shift.id} value={shift.id}>
          {shift.label} ({shiftRange(shift.id)})
        </option>
      ))}
      <option value="franquero">Franquero</option>
    </select>
  );
}

function RestrictionSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Sin restriccion</option>
      {SHIFTS.map((shift) => (
        <option key={shift.id} value={shift.id}>
          No puede {shift.label} ({shiftRange(shift.id)})
        </option>
      ))}
    </select>
  );
}

function StatusPill({ active }) {
  return <span className={active ? "status-pill active" : "status-pill inactive"}>{active ? "Activo" : "Licencia"}</span>;
}

function buildStats(employees) {
  return {
    total: employees.length,
    active: employees.filter((employee) => employee.activo).length,
    inactive: employees.filter((employee) => !employee.activo).length,
    restricted: employees.filter((employee) => employee.restriccion_horaria).length,
  };
}
