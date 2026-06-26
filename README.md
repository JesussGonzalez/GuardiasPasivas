# Guardias Pasivas

Sistema para cargar personal, generar planillas mensuales de guardias pasivas y guardar los sorteos en Google Sheets mediante un backend de Google Apps Script.

## Que cambio

- Se reemplazo Supabase por Google Apps Script como backend.
- Google Sheets queda como base de datos con tres pestañas: `Empleados`, `Sorteos` y `SorteosDetalle`.
- La pagina ahora tiene modo demo local, configuracion de URL del Web App, nomina editable, exportacion CSV, impresion y guardado de planillas.

## Desarrollo local

```bash
npm install
npm run dev
```

La app puede usarse sin configurar backend. En ese caso guarda datos de prueba en `localStorage`.

## Configurar Apps Script y Google Sheets

1. Crea una Google Sheet para la base de datos.
2. En la Sheet, abre `Extensiones > Apps Script`.
3. Copia el contenido de `apps-script/Code.gs` en el editor.
4. En `Configuracion del proyecto > Propiedades de secuencia de comandos`, crea `SPREADSHEET_ID` con el ID de la Sheet.
5. Ejecuta la funcion `setup` una vez y acepta permisos.
6. Publica en `Implementar > Nueva implementacion > Aplicacion web`.
7. Usa estas opciones: ejecutar como tu usuario y acceso para cualquiera con el enlace.
8. Copia la URL terminada en `/exec` y pegala en la vista `Conexion` de la pagina.

Tambien podes configurar la URL en Vercel con la variable:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
```

## Despliegue en Vercel

```bash
npm run build
```

Vercel detecta Vite automaticamente. Si usas la variable `VITE_APPS_SCRIPT_URL`, agregala en la configuracion del proyecto antes de desplegar.

## Modelo de datos

`Empleados`

- `id`
- `nombre`
- `apellido`
- `legajo`
- `turno_ordinario`
- `restriccion_horaria`
- `activo`
- `created_at`
- `updated_at`

`Sorteos`

- `id`
- `periodo`
- `mes`
- `anio`
- `generado_en`
- `total_guardias`

`SorteosDetalle`

- `sorteo_id`
- `fecha`
- `dia`
- `turno`
- `empleado_id`
- `apellido`
- `nombre`
- `legajo`
