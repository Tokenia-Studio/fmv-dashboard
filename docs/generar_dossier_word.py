"""Genera el Dossier Técnico de Traspaso en formato Word (.docx)"""
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

doc = Document()

# -- Estilos generales --
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(10)
style.paragraph_format.space_after = Pt(4)

FMV_BLUE = RGBColor(0x1a, 0x36, 0x5d)
GRAY = RGBColor(0x66, 0x66, 0x66)

def heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = FMV_BLUE
    return h

def para(text, bold=False, italic=False, color=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    return p

def add_table(headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.size = Pt(9)
    # Rows
    for row_data in rows:
        row = table.add_row()
        for i, val in enumerate(row_data):
            row.cells[i].text = str(val)
            for p in row.cells[i].paragraphs:
                for run in p.runs:
                    run.font.size = Pt(9)
    doc.add_paragraph()  # spacing
    return table

# ============================================================
# PORTADA
# ============================================================
doc.add_paragraph()
doc.add_paragraph()
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = t.add_run('DOSSIER TECNICO DE TRASPASO')
run.bold = True
run.font.size = Pt(26)
run.font.color.rgb = FMV_BLUE

t2 = doc.add_paragraph()
t2.alignment = WD_ALIGN_PARAGRAPH.CENTER
run2 = t2.add_run('FMV Dashboard - Panel de Control Financiero')
run2.font.size = Pt(16)
run2.font.color.rgb = GRAY

doc.add_paragraph()

info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
info.add_run('Cliente: ').bold = True
info.add_run('Fabricaciones Metalicas Valdepinto (FMV)\n')
info.add_run('Desarrollado por: ').bold = True
info.add_run('TOKENIA Automation SLU\n')
info.add_run('Fecha de entrega: ').bold = True
info.add_run('23 de marzo de 2026\n')
info.add_run('Version: ').bold = True
info.add_run('2.0.0')

doc.add_page_break()

# ============================================================
# 1. QUE ES ESTO
# ============================================================
heading('1. QUE ES ESTO')
para('Panel de control financiero web para FMV. Carga datos desde Excels de Business Central y muestra: PyG, servicios exteriores, financiacion, proveedores, cash flow, presupuesto vs real, cuentas anuales y presupuesto de compras.')
para('Todo se ejecuta en el navegador. No hay servidor backend. Los datos se guardan en Supabase (base de datos en la nube).', bold=True)

# ============================================================
# 2. DONDE ESTA TODO
# ============================================================
heading('2. DONDE ESTA TODO')
add_table(
    ['Que', 'Donde', 'URL'],
    [
        ['App en produccion', 'Vercel', 'https://fmv-dashboard-v2.vercel.app'],
        ['Codigo fuente', 'GitHub', 'https://github.com/Tokenia-Studio/fmv-dashboard'],
        ['Base de datos', 'Supabase', 'https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr'],
        ['Contrasena app', '-', '[en gestor de contraseñas]'],
    ]
)

# ============================================================
# 3. ACCESOS PARA EL INFORMATICO
# ============================================================
heading('3. ACCESOS PARA EL INFORMATICO')

heading('3.1 Supabase (base de datos) - Rol "Developer"', level=2)
para('1. Ir a https://supabase.com/dashboard/project/ryjavkyudanppnobbhkr')
para('2. Settings > Team > Invite')
para('3. Poner email del informatico con rol Developer')
para('Puede: ver tablas, modificar datos, ver configuracion, ver logs', color=RGBColor(0x00, 0x80, 0x00))
para('NO puede: borrar proyecto, cambiar claves API, cambiar billing', color=RGBColor(0xCC, 0x00, 0x00))

heading('3.2 Vercel (hosting) - Rol "Member"', level=2)
para('1. Ir a Vercel > Team Settings > Members > Invite')
para('2. Rol Member')
para('Puede: ver deployments, ver logs, forzar re-deploy', color=RGBColor(0x00, 0x80, 0x00))
para('NO puede: borrar proyecto, cambiar dominio', color=RGBColor(0xCC, 0x00, 0x00))

heading('3.3 GitHub (codigo) - Permiso "Write"', level=2)
para('1. Ir al repo > Settings > Collaborators > Add people')
para('2. Permiso Write')
para('Puede: clonar, hacer push, crear branches', color=RGBColor(0x00, 0x80, 0x00))
para('NO puede: borrar repo, cambiar configuracion', color=RGBColor(0xCC, 0x00, 0x00))
para('OJO: push a master = deploy automatico a produccion', bold=True, color=RGBColor(0xCC, 0x00, 0x00))

# ============================================================
# 4. STACK
# ============================================================
heading('4. STACK TECNOLOGICO')
para('React 18 + Vite 5 + Tailwind CSS + Recharts (graficos) + SheetJS (Excel) + Supabase (BD + Auth + Storage)')
para('Hosting en Vercel. Deploy automatico al hacer git push origin master.')

# ============================================================
# 5. VARIABLES DE ENTORNO
# ============================================================
heading('5. VARIABLES DE ENTORNO')
para('Solo 2 variables necesarias (estan en Vercel y en el fichero .env local):')
p = doc.add_paragraph()
run = p.add_run('VITE_SUPABASE_URL=https://ryjavkyudanppnobbhkr.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...(clave publica)')
run.font.name = 'Consolas'
run.font.size = Pt(9)
para('Si se regeneran las claves en Supabase, hay que actualizar en Vercel y .env, y luego re-deploy.', bold=True)

# ============================================================
# 6. BASE DE DATOS
# ============================================================
heading('6. BASE DE DATOS (Supabase / PostgreSQL)')

heading('Tablas activas (11)', level=2)
add_table(
    ['Tabla', 'Para que'],
    [
        ['movimientos', 'Asientos contables (~134k registros, anos 2024-2026)'],
        ['proveedores', 'Maestro proveedores (1.622)'],
        ['presupuestos', 'Datos presupuestarios por cuenta/mes'],
        ['archivos_cargados', 'Registro de ficheros subidos'],
        ['configuracion', 'Parametros de la app'],
        ['datos_manuales', 'KPIs manuales (empleados, horas, dias)'],
        ['albaranes_facturas', 'Albaranes y facturas de compra (de BC)'],
        ['pedidos_compra', 'Pedidos pendientes (de BC)'],
        ['mapeo_grupo_cuenta', 'Mapeo grupo contable a cuenta 9 digitos'],
        ['plan_cuentas', 'Plan general de cuentas'],
        ['user_roles', 'Roles de usuario (direccion / compras)'],
    ]
)

heading('Tablas que NO tocar', level=2)
add_table(
    ['Tabla', 'Motivo'],
    [
        ['series_estructuras, tiempos_estandar, planificacion_ordenes', 'Las usa la app FMV Produccion (otro proyecto)'],
        ['doc_batches, doc_documents, doc_processing_log', 'Gestion documental aparcada, no borrar'],
    ]
)

heading('Seguridad', level=2)
para('Todas las tablas tienen RLS (Row Level Security) activado. Solo usuarios autenticados pueden acceder. Auth por email + password (Supabase Auth, JWT).')

heading('Storage', level=2)
para('Bucket "excels" (privado): ficheros Excel subidos por usuarios.')

# ============================================================
# 7. COMO SE CARGAN DATOS
# ============================================================
heading('7. COMO SE CARGAN DATOS')
para('1. El usuario exporta un Excel desde Business Central')
para('2. En la app, pestana "Cargar Datos", selecciona ano y sube fichero')
para('3. La app parsea el Excel en el navegador, borra los datos del ano anterior, e inserta los nuevos')
para('4. Se recalcula todo automaticamente')

heading('Tipos de ficheros:', level=2)
para('- Diario contable (movimientos)\n- Presupuesto anual\n- Albaranes/facturas (Hoja2 "Movimientos valor")\n- Pedidos de compra ("pedidos anual.xlsx")\n- Maestro de proveedores')

# ============================================================
# 8. COMO EJECUTAR EN LOCAL
# ============================================================
heading('8. COMO EJECUTAR EN LOCAL')
para('Requisitos: Node.js 18+, npm 9+')
p = doc.add_paragraph()
run = p.add_run(
    'git clone https://github.com/Tokenia-Studio/fmv-dashboard.git\n'
    'cd fmv-dashboard\n'
    'npm install\n'
    '# Copiar fichero .env con las claves de Supabase\n'
    'npm run dev        # Abre http://localhost:3000'
)
run.font.name = 'Consolas'
run.font.size = Pt(9)

# ============================================================
# 9. COMO SE DESPLIEGA
# ============================================================
heading('9. COMO SE DESPLIEGA')
p = doc.add_paragraph()
run = p.add_run('git push origin master')
run.font.name = 'Consolas'
run.font.size = Pt(9)
run.bold = True
para('Vercel detecta el push y despliega automaticamente. No hay CI/CD, ni pipelines. Push a master = produccion.')

# ============================================================
# 10. ROLES DE USUARIO
# ============================================================
heading('10. ROLES DE USUARIO')
add_table(
    ['Rol', 'Acceso'],
    [
        ['direccion', 'Todo: PyG, servicios, financiacion, proveedores, cash flow, presupuesto, CCAA, cargar, usuarios'],
        ['compras', 'Solo: servicios, proveedores, ppto compras, cargar, usuarios'],
    ]
)
para('Se gestionan desde la pestana "Gestion Usuarios" dentro de la app (solo rol direccion).')

# ============================================================
# 11. ARCHIVOS CLAVE
# ============================================================
heading('11. ARCHIVOS CLAVE DEL CODIGO')
add_table(
    ['Archivo', 'Que hace'],
    [
        ['src/App.jsx', 'Punto de entrada, routing de pestanas'],
        ['src/context/DataContext.jsx', 'Estado global, carga de datos, calculos (~1500 lineas)'],
        ['src/lib/supabase.js', 'Cliente de base de datos (~760 lineas)'],
        ['src/utils/calculations.js', 'Motor de calculo financiero (~2000 lineas)'],
        ['src/utils/constants.js', 'Grupos de cuentas, estructura balance/PyG'],
        ['sql/*.sql', 'Scripts para recrear las tablas de la BD'],
    ]
)

# ============================================================
# 12. SI ALGO FALLA
# ============================================================
heading('12. SI ALGO FALLA')
add_table(
    ['Problema', 'Solucion'],
    [
        ['App no carga', 'Verificar en Vercel que el ultimo deploy fue OK. Si no, click "Redeploy"'],
        ['Datos no aparecen', 'Comprobar en Supabase que las tablas tienen datos. Recargar Excel si es necesario'],
        ['Login no funciona', 'Verificar que el proyecto Supabase esta activo y las claves API son correctas'],
        ['Error tras deploy', 'Revisar logs en Vercel > Deployments > ultimo > Logs'],
        ['Datos incorrectos', 'Volver a subir el Excel del ano afectado (sobreescribe el ano completo)'],
        ['Claves perdidas', 'En Supabase > Settings > API, regenerar. Actualizar .env + Vercel + re-deploy'],
    ]
)

# ============================================================
# 13. REGLAS DE ORO
# ============================================================
heading('13. REGLAS DE ORO', level=1)
rules = [
    'No borrar tablas de Supabase (ni las aparcadas)',
    'No regenerar claves API salvo emergencia (rompe la app hasta actualizar)',
    'No borrar el proyecto en Supabase ni en Vercel',
    'Push a master = produccion. Probar cambios en una branch antes',
    'Los SQL estan en sql/ por si hay que recrear tablas desde cero',
]
for r in rules:
    p = doc.add_paragraph()
    run = p.add_run(f'  {r}')
    run.bold = True
    run.font.color.rgb = RGBColor(0xCC, 0x00, 0x00)

# ============================================================
# 14. CHECKLIST DE TRASPASO
# ============================================================
heading('14. CHECKLIST DE TRASPASO')
checks = [
    'Informatico tiene cuenta en Supabase con rol Developer',
    'Informatico tiene cuenta en Vercel con rol Member',
    'Informatico tiene acceso al repositorio GitHub con permiso Write',
    'Informatico tiene copia del fichero .env con todas las variables',
    'Informatico ha clonado el repositorio y ejecutado npm run dev con exito',
    'Informatico ha verificado acceso al panel de Supabase (puede ver tablas)',
    'Informatico ha verificado acceso al panel de Vercel (puede ver deployments)',
    'Se ha explicado el flujo de deploy (push a master = deploy automatico)',
    'Se ha explicado como cargar datos (Excel BC, app, Supabase)',
    'Se ha acordado que NO se borran tablas/proyecto sin consultar',
]
for c in checks:
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(f'[ ]  {c}')
    run.font.size = Pt(10)

# ============================================================
# PIE
# ============================================================
doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Documento de traspaso v1.0 - 23/03/2026\nTOKENIA Automation SLU')
run.font.size = Pt(9)
run.font.color.rgb = GRAY

# -- Guardar --
output_path = os.path.join(os.path.dirname(__file__), 'DOSSIER-TECNICO-TRASPASO.docx')
doc.save(output_path)
print(f'Generado: {output_path}')
