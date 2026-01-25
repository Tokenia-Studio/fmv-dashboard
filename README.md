# FMV Dashboard v2.0

Dashboard financiero para **Fabricaciones Metálicas Valdepinto**.

## Características

- **PyG Analítico**: Cuenta de resultados mensual con comparativa interanual
- **Servicios Exteriores**: Desglose por familias (621-629) con gráficos interactivos
- **Financiación**: Evolución de deuda, gastos financieros y ratios de apalancamiento
- **Pagos Proveedores**: Top 15 proveedores con extractos exportables
- **Cash Flow**: Evolución de tesorería y variaciones mensuales
- **Export a Excel**: Click en cualquier gráfico para exportar el detalle

## Requisitos

- Node.js >= 18
- npm o yarn

## Instalación

```bash
cd fmv-dashboard-v2
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Producción

```bash
npm run build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/
│   ├── Layout/          # Header, Footer
│   ├── PyG/             # Pestaña PyG
│   ├── ServiciosExt/    # Pestaña Servicios Exteriores
│   ├── Financiacion/    # Pestaña Financiación
│   ├── Proveedores/     # Pestaña Pagos Proveedores
│   ├── CashFlow/        # Pestaña Flujo Efectivo
│   ├── Upload/          # Pestaña Carga de datos
│   └── UI/              # Componentes reutilizables
├── context/
│   └── DataContext.jsx  # Estado global
├── utils/
│   ├── constants.js     # Constantes y configuración
│   ├── formatters.js    # Funciones de formateo
│   └── calculations.js  # Lógica de cálculos
├── App.jsx
├── main.jsx
└── index.css
```

## Formato del Diario Excel

El archivo Excel del diario debe tener estas columnas:

| Columna | Requerida | Descripción |
|---------|-----------|-------------|
| Fecha registro | Sí | Fecha del movimiento |
| Nº cuenta | Sí | Cuenta contable (9 dígitos) |
| Importe debe | Sí | Importe en el debe |
| Importe haber | Sí | Importe en el haber |
| Cód. procedencia mov. | No | Código del proveedor/cliente |
| Descripción | No | Descripción del movimiento |
| Nº documento | No | Número de documento |

## Formato del Maestro de Proveedores

| Columna | Descripción |
|---------|-------------|
| Nº | Código del proveedor |
| Nombre | Nombre del proveedor |

## Mapeo de Cuentas

| Grupo | Descripción | Pestaña |
|-------|-------------|---------|
| 60x | Compras | PyG |
| 61x | Var. Existencias MP | PyG |
| 62x | Servicios Exteriores | Servicios Ext. |
| 63x | Tributos | PyG (Resto) |
| 64x | Personal | PyG |
| 65x | Otros gastos | PyG (Resto) |
| 66x | Gastos Financieros | Financiación |
| 68x | Amortizaciones | PyG |
| 70x | Ventas | PyG |
| 71x | Var. Existencias PT | PyG |
| 74x | Subvenciones | PyG |
| 75x | Otros ingresos | PyG |
| 17x | Deuda L/P | Financiación |
| 52x | Deuda C/P | Financiación |
| 57x | Tesorería | Cash Flow |
| 40x | Proveedores | Proveedores |
| 41x | Acreedores | Proveedores |

## Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

### GitHub Pages

```bash
npm run build
# Configurar GitHub Pages para servir desde carpeta dist/
```

## Stack Tecnológico

- **React 18** + Vite
- **Tailwind CSS** para estilos
- **Recharts** para gráficos
- **SheetJS (xlsx)** para Excel
- **LocalStorage** para persistencia

## Licencia

Proyecto desarrollado por TOKENIA Studio para FMV.
