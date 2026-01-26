# Changelog

Todos los cambios notables en este proyecto.

## [2.1.0] - 2026-01-26

### Añadido
- Integracion con Supabase (Auth + Database + Storage)
- Login/registro con email y password
- Cliente Supabase con helpers (`src/lib/supabase.js`)
- Schema SQL para base de datos (`supabase-schema.sql`)
- Row Level Security (RLS) para todas las tablas
- Tabla `datos_manuales` para indicadores (horas, trabajadores)
- Mostrar email del usuario en el header

### Cambiado
- LoginScreen ahora usa Supabase Auth en lugar de password hardcodeada
- App.jsx gestiona sesion con Supabase
- Header recibe usuario y funcion logout como props

### Tablas creadas
- `movimientos` - Asientos contables
- `proveedores` - Maestro de proveedores
- `archivos_cargados` - Registro de archivos
- `configuracion` - Config de la app
- `datos_manuales` - Datos para KPIs

### Storage
- Bucket `excels` para archivos Excel

---

## [2.0.0] - 2025-12-XX

### Añadido
- Dashboard completo con React + Vite
- PyG Analitico mensual
- Servicios Exteriores con graficos
- Financiacion y ratios
- Pagos a Proveedores (Top 15)
- Cash Flow
- Carga de Excel (diario + proveedores)
- Export a Excel desde graficos
- Login simple con password

### Stack
- React 18
- Vite 5
- Tailwind CSS
- Recharts
- SheetJS (xlsx)
