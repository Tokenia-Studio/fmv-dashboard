# FMV Dashboard - Contexto del Proyecto

Ultima actualizacion: 2026-01-26

---

## Resumen

Dashboard financiero para **Fabricaciones Metalicas Valdepinto (FMV)** que permite visualizar y analizar datos contables desde archivos Excel del diario.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18 + Vite 5 |
| Estilos | Tailwind CSS |
| Graficos | Recharts |
| Excel | SheetJS (xlsx) |
| Backend | Supabase |
| Auth | Supabase Auth |
| Database | PostgreSQL (Supabase) |
| Storage | Supabase Storage |
| Hosting | Vercel |
| Repo | GitHub |

---

## URLs

| Servicio | URL |
|----------|-----|
| **Produccion** | https://fmv-dashboard-v2.vercel.app |
| **GitHub** | https://github.com/Tokenia-Studio/fmv-dashboard |
| **Supabase** | https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr |

---

## Credenciales Supabase

```
Project ID: ryjavkyudanppnobbhkr
URL: https://ryjavkyudanppnobbhkr.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5amF2a3l1ZGFucHBub2JiaGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzOTYxMDgsImV4cCI6MjA4NDk3MjEwOH0.2Oq2Fk6suP-CjH-iAjstMduodAWbatpH7npNUJzm-oM
```

---

## Base de Datos

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `movimientos` | Asientos contables del diario |
| `proveedores` | Maestro de proveedores |
| `archivos_cargados` | Registro de archivos subidos por año |
| `configuracion` | Configuracion de la app |
| `datos_manuales` | Datos para indicadores (horas, trabajadores) |

### Storage

| Bucket | Contenido |
|--------|-----------|
| `excels` | Archivos Excel subidos |

### RLS (Row Level Security)

Todas las tablas tienen RLS habilitado con politicas para usuarios autenticados:
- SELECT, INSERT, UPDATE, DELETE permitidos para `authenticated`

---

## Funcionalidades Implementadas

### Autenticacion
- [x] Login con email/password via Supabase Auth
- [x] Registro de nuevos usuarios
- [x] Sesion persistente
- [x] Logout
- [x] Plantillas de email personalizadas (docs/email-templates.md)

### Carga de Datos
- [x] Subir Excel del diario contable
- [x] Subir maestro de proveedores
- [x] Parseo automatico de columnas
- [x] Validacion de cuadre (debe = haber)
- [x] Persistencia en Supabase
- [x] Carga automatica al iniciar sesion
- [x] Reemplazo de datos por año

### Visualizacion
- [x] PyG Analitico mensual
- [x] Servicios Exteriores (grupo 62)
- [x] Financiacion (deuda, gastos financieros)
- [x] Pagos a Proveedores (Top 15)
- [x] Cash Flow
- [x] Export a Excel

---

## Pendiente por Implementar

Segun `instrucciones.pdf`:

### 1. Pestaña Dashboard (nueva)
- [ ] Ventas (Grupo 70)
- [ ] Compras (Grupo 60)
- [ ] Variacion existencias (61 + 71 neteado)
- [ ] Servicios (62)
- [ ] Personal (64)
- [ ] Resto gastos/ingresos
- [ ] Resultado neto (debe cuadrar con PyG)

### 2. Pestaña PyG Analitico (mejorar)
Estructura requerida:
```
VENTAS (70)
(-) Compras (60)
(±) Var. existencias (61 + 71)
= MARGEN BRUTO
(-) Servicios ext. (62)
(-) Personal (64)
(+) Subvenciones (74)
(+) Otros ingresos (75)
= EBITDA
(-) Resto gastos (63, 65, 66, 67, 69)
(-) Amortizaciones (68)
(+) Ingresos excepcionales (77, 78)
= RESULTADO
```

### 3. Pestaña Testeo
- [ ] Alertar cuentas sin clasificar
- [ ] Opcion para incorporar cuentas nuevas al PyG
- [ ] Verificar que el diario esta cuadrado
- [ ] Mostrar cuentas desconocidas

### 4. Pestaña Indicadores
KPIs con datos manuales:
- [ ] Gastos/Trabajador
- [ ] Gastos/Hora Trabajada
- [ ] Ingresos/Hora Trabajada
- [ ] Ventas por dia laborable
- [ ] % gastos sobre ventas
- [ ] Inputs manuales: horas, dias laborables, trabajadores

---

## Estructura del Proyecto

```
fmv-dashboard-v2/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── LoginScreen.jsx      # Login con Supabase
│   │   ├── Layout/
│   │   │   ├── Header.jsx           # Navegacion + usuario
│   │   │   └── Footer.jsx
│   │   ├── PyG/
│   │   ├── ServiciosExt/
│   │   ├── Financiacion/
│   │   ├── Proveedores/
│   │   ├── CashFlow/
│   │   ├── Upload/
│   │   │   └── UploadTab.jsx        # Carga de Excel
│   │   └── UI/
│   ├── context/
│   │   └── DataContext.jsx          # Estado global + Supabase
│   ├── lib/
│   │   └── supabase.js              # Cliente Supabase
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   └── calculations.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── docs/
│   ├── email-templates.md           # Plantillas de email
│   └── CONTEXTO-PROYECTO.md         # Este archivo
├── supabase-schema.sql              # Schema de la BD
├── .env                             # Variables locales
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Variables de Entorno

### Local (.env)
```
VITE_SUPABASE_URL=https://ryjavkyudanppnobbhkr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Vercel
Configuradas en Vercel > Settings > Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Deploy a Vercel
vercel --prod
```

---

## Flujo de Datos

1. Usuario hace login (Supabase Auth)
2. App carga movimientos desde Supabase (si existen)
3. Usuario sube Excel del diario
4. Excel se parsea en el navegador
5. Movimientos se guardan en Supabase (batches de 500)
6. Excel se sube al Storage (opcional)
7. Datos calculados se generan en el frontend
8. Al recargar, datos persisten desde Supabase

---

## Notas Tecnicas

- Los Excel grandes (>50k filas) pueden tardar en procesarse
- Insercion en batches de 500 para evitar limites de Supabase
- RLS requiere politicas separadas para cada operacion (SELECT, INSERT, UPDATE, DELETE)
- `FOR ALL` en politicas RLS no siempre funciona - usar politicas individuales

---

## Contacto

**Cliente:** Fabricaciones Metalicas Valdepinto (FMV)
**Desarrollo:** TOKENIA Studio
**Operador:** Carlos Gomez
