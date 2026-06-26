export const DATA_SOURCE_KEY = "guardiasPasivas.appsScriptUrl";

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const SHIFTS = [
  {
    id: "7-14",
    label: "Mañana",
    range: "07 a 14",
    className: "shift-morning",
  },
  {
    id: "14-21",
    label: "Tarde",
    range: "14 a 21",
    className: "shift-afternoon",
  },
  {
    id: "21-07",
    label: "Noche",
    range: "21 a 07",
    className: "shift-night",
  },
];

export const EMPTY_EMPLOYEE = {
  nombre: "",
  apellido: "",
  legajo: "",
  turno_ordinario: "7-14",
  restriccion_horaria: "",
  activo: true,
};

export const SAMPLE_EMPLOYEES = [
  {
    id: "demo-1",
    nombre: "Ana",
    apellido: "Pereyra",
    legajo: "1021",
    turno_ordinario: "7-14",
    restriccion_horaria: "",
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    nombre: "Miguel",
    apellido: "Sosa",
    legajo: "985",
    turno_ordinario: "14-21",
    restriccion_horaria: "21-07",
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    nombre: "Carla",
    apellido: "Rojas",
    legajo: "1188",
    turno_ordinario: "21-07",
    restriccion_horaria: "",
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-4",
    nombre: "Lucas",
    apellido: "Vega",
    legajo: "1130",
    turno_ordinario: "7-14",
    restriccion_horaria: "14-21",
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-5",
    nombre: "Nadia",
    apellido: "Gimenez",
    legajo: "1215",
    turno_ordinario: "14-21",
    restriccion_horaria: "",
    activo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
