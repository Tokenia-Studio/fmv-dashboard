# FMV Dashboard v2.0

Dashboard financiero para **Fabricaciones Metalicas Valdepinto**.

## Caracteristicas

- **PyG Analitico**: Cuenta de resultados mensual con comparativa interanual
- **Servicios Exteriores**: Desglose por familias (621-629) con graficos interactivos
- **Financiacion**: Evolucion de deuda, gastos financieros y ratios de apalancamiento
- **Pagos Proveedores**: Top 15 proveedores con extractos exportables
- **Cash Flow**: Evolucion de tesoreria y variaciones mensuales
- **Export a Excel**: Click en cualquier grafico para exportar el detalle
- **Autenticacion**: Login con email/password via Supabase Auth

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Graficos | Recharts |
| Excel | SheetJS (xlsx) |
| Backend | Supabase (Auth + DB + Storage) |
| Hosting | Vercel |

## Requisitos

- Node.js >= 18
- npm o yarn
- Cuenta en Supabase (gratuita)

## Instalacion

```bash
cd fmv-dashboard-v2
npm install
```

## Configuracion de Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase-schema.sql` en SQL Editor
3. Crear bucket `excels` en Storage (privado)
4. Copiar credenciales a `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Produccion

```bash
npm run build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── Auth/             # Login y autenticacion
│   ├── Layout/           # Header, Footer
│   ├── PyG/              # Pestana PyG
│   ├── ServiciosExt/     # Pestana Servicios Exteriores
│   ├── Financiacion/     # Pestana Financiacion
│   ├── Proveedores/      # Pestana Pagos Proveedores
│   ├── CashFlow/         # Pestana Flujo Efectivo
│   ├── Upload/           # Pestana Carga de datos
│   └── UI/               # Componentes reutilizables
├── context/
│   └── DataContext.jsx   # Estado global
├── lib/
│   └── supabase.js       # Cliente y helpers Supabase
├── utils/
│   ├── constants.js      # Constantes y configuracion
│   ├── formatters.js     # Funciones de formateo
│   └── calculations.js   # Logica de calculos
├── App.jsx
├── main.jsx
└── index.css
```

## Base de Datos (Supabase)

### Tablas

| Tabla | Descripcion |
|-------|-------------|
| `movimientos` | Asientos contables del diario |
| `proveedores` | Maestro de proveedores |
| `archivos_cargados` | Registro de archivos subidos |
| `configuracion` | Configuracion de la app |
| `datos_manuales` | Datos para indicadores (horas, trabajadores) |

### Storage

| Bucket | Contenido |
|--------|-----------|
| `excels` | Archivos Excel subidos |

## Formato del Diario Excel

| Columna | Requerida | Descripcion |
|---------|-----------|-------------|
| Fecha registro | Si | Fecha del movimiento |
| N cuenta | Si | Cuenta contable (9 digitos) |
| Importe debe | Si | Importe en el debe |
| Importe haber | Si | Importe en el haber |
| Cod. procedencia mov. | No | Codigo del proveedor/cliente |
| Descripcion | No | Descripcion del movimiento |
| N documento | No | Numero de documento |

## Formato del Maestro de Proveedores

| Columna | Descripcion |
|---------|-------------|
| N | Codigo del proveedor |
| Nombre | Nombre del proveedor |

## Mapeo de Cuentas

| Grupo | Descripcion | Pestana |
|-------|-------------|---------|
| 60x | Compras | PyG |
| 61x | Var. Existencias MP | PyG |
| 62x | Servicios Exteriores | Servicios Ext. |
| 63x | Tributos | PyG (Resto) |
| 64x | Personal | PyG |
| 65x | Otros gastos | PyG (Resto) |
| 66x | Gastos Financieros | Financiacion |
| 68x | Amortizaciones | PyG |
| 70x | Ventas | PyG |
| 71x | Var. Existencias PT | PyG |
| 74x | Subvenciones | PyG |
| 75x | Otros ingresos | PyG |
| 17x | Deuda L/P | Financiacion |
| 52x | Deuda C/P | Financiacion |
| 57x | Tesoreria | Cash Flow |
| 40x | Proveedores | Proveedores |
| 41x | Acreedores | Proveedores |

## Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

Variables de entorno en Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

## Enlaces

- **GitHub**: https://github.com/Tokenia-Studio/fmv-dashboard
- **Supabase**: https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr

## Licencia

Proyecto desarrollado por TOKENIA Studio para FMV.
