import { MONTHS, SHIFTS } from "./constants.js";

export function employeeName(employee) {
  if (!employee) return "Sin personal";
  return `${employee.apellido || ""}, ${employee.nombre || ""}`.trim();
}

export function shiftLabel(shiftId) {
  return SHIFTS.find((shift) => shift.id === shiftId)?.label || shiftId || "-";
}

export function shiftRange(shiftId) {
  return SHIFTS.find((shift) => shift.id === shiftId)?.range || "";
}

export function monthLabel(month, year) {
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function buildDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function generateSchedule(employees, month, year) {
  const available = employees
    .filter((employee) => employee.activo)
    .sort((a, b) => employeeName(a).localeCompare(employeeName(b), "es"));

  if (available.length === 0) {
    throw new Error("No hay personal activo disponible para el sorteo.");
  }

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const assignmentCount = new Map(available.map((employee) => [employee.id, 0]));
  const lastAssignedDay = new Map();
  const rows = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const usedToday = new Set();
    const assignments = {};

    for (const shift of SHIFTS) {
      const selected = pickEmployee({
        employees: available,
        shiftId: shift.id,
        day,
        usedToday,
        assignmentCount,
        lastAssignedDay,
      });

      if (selected) {
        usedToday.add(selected.id);
        assignmentCount.set(selected.id, (assignmentCount.get(selected.id) || 0) + 1);
        lastAssignedDay.set(selected.id, day);
      }

      assignments[shift.id] = selected
        ? {
            employeeId: selected.id,
            nombre: selected.nombre,
            apellido: selected.apellido,
            legajo: selected.legajo,
          }
        : null;
    }

    rows.push({
      day,
      date: buildDate(year, month, day),
      assignments,
    });
  }

  return {
    id: crypto.randomUUID(),
    month: Number(month),
    year: Number(year),
    periodo: monthLabel(month, year),
    createdAt: new Date().toISOString(),
    rows,
  };
}

function pickEmployee({
  employees,
  shiftId,
  day,
  usedToday,
  assignmentCount,
  lastAssignedDay,
}) {
  const strictCandidates = employees.filter(
    (employee) =>
      !usedToday.has(employee.id) &&
      employee.turno_ordinario !== shiftId &&
      employee.restriccion_horaria !== shiftId,
  );

  const restrictionCandidates = employees.filter(
    (employee) =>
      !usedToday.has(employee.id) && employee.restriccion_horaria !== shiftId,
  );

  const fallbackCandidates = employees.filter((employee) => !usedToday.has(employee.id));
  const candidates =
    strictCandidates.length > 0
      ? strictCandidates
      : restrictionCandidates.length > 0
        ? restrictionCandidates
        : fallbackCandidates;

  if (candidates.length === 0) return null;

  return candidates
    .map((employee) => ({
      employee,
      count: assignmentCount.get(employee.id) || 0,
      recentlyAssigned: lastAssignedDay.get(employee.id) === day - 1 ? 1 : 0,
      tieBreaker: Math.random(),
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      if (a.recentlyAssigned !== b.recentlyAssigned) {
        return a.recentlyAssigned - b.recentlyAssigned;
      }
      return a.tieBreaker - b.tieBreaker;
    })[0].employee;
}
