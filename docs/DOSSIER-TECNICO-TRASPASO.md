# DOSSIER TECNICO - FMV Dashboard
**Entrega: 23/03/2026 | TOKENIA Automation SLU → FMV**

---

## QUE ES ESTO

Panel de control financiero web para FMV. Carga datos desde Excels de Business Central y muestra: PyG, servicios exteriores, financiacion, proveedores, cash flow, presupuesto vs real, cuentas anuales y presupuesto de compras.

**Todo se ejecuta en el navegador.** No hay servidor backend. Los datos se guardan en Supabase (base de datos en la nube).

---

## DONDE ESTA TODO

| Que | Donde | URL |
|-----|-------|-----|
| App en produccion | Vercel | https://fmv-dashboard-v2.vercel.app |
| Codigo fuente | GitHub | https://github.com/Tokenia-Studio/fmv-dashboard |
| Base de datos | Supabase | https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr |
| Contrasena app | - | [en gestor de contraseñas] |

---

## ACCESOS PARA EL INFORMATICO

### Supabase (base de datos) → Rol "Developer"
1. Ir a https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr
2. Settings > Team > Invite
3. Poner email del informatico → rol **Developer**

**Puede:** ver tablas, modificar datos, ver configuracion, ver logs
**NO puede:** borrar proyecto, cambiar claves API, cambiar billing

### Vercel (hosting) → Rol "Member"
1. Ir a Vercel > Team Settings > Members > Invite
2. Rol **Member**

**Puede:** ver deployments, ver logs, forzar re-deploy
**NO puede:** borrar proyecto, cambiar dominio

### GitHub (codigo) → Permiso "Write"
1. Ir al repo > Settings > Collaborators > Add people
2. Permiso **Write**

**Puede:** clonar, hacer push, crear branches
**NO puede:** borrar repo, cambiar configuracion
**OJO:** push a master = deploy automatico a produccion

---

## STACK

React 18 + Vite 5 + Tailwind CSS + Recharts (graficos) + SheetJS (Excel) + Supabase (BD + Auth + Storage)

Hosting en Vercel. Deploy automatico al hacer `git push origin master`.

---

## VARIABLES DE ENTORNO

Solo 2 variables necesarias (estan en Vercel y en el fichero `.env` local):

```
VITE_SUPABASE_URL=https://ryjavkyudanppnobbhkr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...(clave publica)
```

Si se regeneran las claves en Supabase → actualizar en Vercel y `.env` → re-deploy.

---

## BASE DE DATOS (Supabase/PostgreSQL)

### Tablas activas (11)

| Tabla | Para que |
|-------|----------|
| `movimientos` | Asientos contables (~134k registros, anos 2024-2026) |
| `proveedores` | Maestro proveedores (1.622) |
| `presupuestos` | Datos presupuestarios por cuenta/mes |
| `archivos_cargados` | Registro de que ficheros se han subido |
| `configuracion` | Parametros de la app |
| `datos_manuales` | KPIs manuales (empleados, horas, dias) |
| `albaranes_facturas` | Albaranes y facturas de compra (de BC) |
| `pedidos_compra` | Pedidos pendientes (de BC) |
| `mapeo_grupo_cuenta` | Mapeo grupo contable → cuenta 9 digitos |
| `plan_cuentas` | Plan general de cuentas |
| `user_roles` | Roles de usuario (direccion / compras) |

### Tablas que NO tocar

| Tabla | Motivo |
|-------|--------|
| `series_estructuras`, `tiempos_estandar`, `planificacion_ordenes` | Las usa la app FMV Produccion (otro proyecto) |
| `doc_batches`, `doc_documents`, `doc_processing_log` | Gestion documental aparcada, no borrar |

### Seguridad
- Todas las tablas tienen RLS (Row Level Security) activado
- Solo usuarios autenticados pueden acceder
- Auth por email + password (Supabase Auth, JWT)

### Storage
- Bucket `excels` (privado): ficheros Excel subidos por usuarios

---

## COMO SE CARGAN DATOS

1. El usuario exporta un Excel desde Business Central
2. En la app → pestana "Cargar Datos" → selecciona ano → sube fichero
3. La app parsea el Excel en el navegador, borra los datos del ano anterior, e inserta los nuevos en Supabase
4. Se recalcula todo automaticamente

**Tipos de ficheros que se cargan:**
- Diario contable (movimientos)
- Presupuesto anual
- Albaranes/facturas (Hoja2 "Movimientos valor")
- Pedidos de compra ("pedidos anual.xlsx")
- Maestro de proveedores

---

## COMO EJECUTAR EN LOCAL

```bash
git clone https://github.com/Tokenia-Studio/fmv-dashboard.git
cd fmv-dashboard
npm install
# Copiar fichero .env con las claves de Supabase
npm run dev        # → http://localhost:3000
```

Requisitos: Node.js 18+, npm 9+

---

## COMO SE DESPLIEGA

```bash
git push origin master    # → Vercel detecta el push y despliega automaticamente
```

No hay CI/CD, ni pipelines, ni scripts. Push a master = produccion.

---

## ROLES DE USUARIO

| Rol | Acceso |
|-----|--------|
| `direccion` | Todo: PyG, servicios, financiacion, proveedores, cash flow, presupuesto, CCAA, cargar, usuarios |
| `compras` | Solo: servicios, proveedores, ppto compras, cargar, usuarios |

Se gestionan desde la pestana "Gestion Usuarios" dentro de la app (solo rol direccion).

---

## ARCHIVOS CLAVE DEL CODIGO

| Archivo | Que hace |
|---------|----------|
| `src/App.jsx` | Punto de entrada, routing de pestanas |
| `src/context/DataContext.jsx` | Estado global, carga de datos, calculos (~1500 lineas) |
| `src/lib/supabase.js` | Cliente de base de datos (~760 lineas) |
| `src/utils/calculations.js` | Motor de calculo financiero (~2000 lineas) |
| `src/utils/constants.js` | Grupos de cuentas, estructura balance/PyG |
| `sql/*.sql` | Scripts para recrear las tablas de la BD |

---

## SI ALGO FALLA

| Problema | Solucion |
|----------|----------|
| App no carga | Verificar en Vercel que el ultimo deploy fue OK. Si no, click "Redeploy" |
| Datos no aparecen | Comprobar en Supabase que las tablas tienen datos. Recargar Excel si es necesario |
| Login no funciona | Verificar que el proyecto Supabase esta activo y las claves API son correctas |
| Error tras deploy | Revisar logs en Vercel > Deployments > ultimo > Logs |
| Datos incorrectos | Volver a subir el Excel del ano afectado (sobreescribe el ano completo) |
| Claves perdidas | En Supabase > Settings > API → regenerar. Actualizar .env + Vercel + re-deploy |

---

## REGLAS DE ORO

1. **No borrar tablas** de Supabase (ni las aparcadas)
2. **No regenerar claves API** salvo emergencia (rompe la app hasta actualizar)
3. **No borrar el proyecto** en Supabase ni en Vercel
4. **Push a master = produccion** → probar cambios en una branch antes
5. **Los SQL estan en** `sql/` por si hay que recrear tablas desde cero

---

## CONTACTO

**Desarrollador:** Carlos Gomez - TOKENIA Automation SLU
**Cliente:** Fabricaciones Metalicas Valdepinto

---

*Documento de traspaso v1.0 — 23/03/2026*
