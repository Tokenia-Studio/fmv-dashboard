// ============================================
// HELP CONTENT - Contenido de ayuda por pestaña
// ============================================

export const HELP_CONTENT = {
  pyg: {
    titulo: 'PyG Analítico',
    descripcion: 'Muestra la Cuenta de Pérdidas y Ganancias desglosada por grupos contables, con vista mensual y acumulada.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Ingresos, gastos, márgenes y resultado del ejercicio agrupados por categorías contables (grupos 6 y 7). Permite analizar la evolución mensual y el acumulado anual.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Los datos se cargan desde la pestaña "Cargar Datos". El cuadre contable (Activo = Pasivo + Patrimonio Neto) se verifica automáticamente y se muestra en la cabecera.'
      }
    ]
  },

  servicios: {
    titulo: 'Servicios Exteriores',
    descripcion: 'Desglose detallado del grupo contable 62 (Servicios Exteriores): alquileres, reparaciones, profesionales independientes, seguros, etc.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Detalle de todas las cuentas del grupo 62 con importes mensuales y acumulados. Permite identificar los principales gastos en servicios externos.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Se alimenta del mismo diario contable que el PyG. No requiere carga adicional.'
      }
    ]
  },

  financiacion: {
    titulo: 'Financiación',
    descripcion: 'Análisis de la estructura financiera: ratios de endeudamiento, solvencia, liquidez y detalle de saldos de balance.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Ratios financieros clave (endeudamiento, solvencia, liquidez corriente), composición de la deuda financiera, y evolución de los saldos de balance relacionados.'
      },
      {
        titulo: 'Préstamos: lo que entra vs lo que se devuelve',
        contenido: 'Gráfico y tabla mensual que separan la financiación nueva recibida (verde) de las cuotas devueltas al banco (rojo), calculado desde los movimientos de las cuentas 17x y 52x. Los traspasos internos de deuda de largo a corto plazo se excluyen porque no son entradas ni salidas reales de dinero; el neteo se hace préstamo a préstamo (pareja 17x↔52x). Los KPIs "Financiación Nueva YTD" y "Amortizado YTD" acumulan el año en curso.'
      },
      {
        titulo: 'Deuda viva por préstamo',
        contenido: 'Resumen de todos los préstamos con su deuda pendiente: el tramo a largo plazo (cuenta 17x) y su tramo a corto plazo (cuenta 52x) se muestran en la misma línea, emparejados mediante los asientos de traspaso L/P→C/P. Las líneas solo de corto plazo (pólizas, confirming) aparecen sin cuenta de largo. Incluye lo amortizado y lo recibido en el año por cada préstamo.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Los ratios se calculan automáticamente a partir de los saldos del balance. Se recomienda revisar que las cuentas de grupo 1 y 5 estén correctamente contabilizadas.'
      }
    ]
  },

  proveedores: {
    titulo: 'Proveedores',
    descripcion: 'Ranking de proveedores por volumen de pagos y detalle de movimientos. Muestra los principales proveedores y su peso relativo.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Top proveedores por importe, porcentaje sobre el total, evolución de pagos mensuales y detalle de movimientos por proveedor.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda'],
            ['Maestro Proveedores (.xlsx)', 'BUSINESS CENTRAL → pagos → proveedores → exportar nº y Nombre', 'Cuando haya cambios']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Sin el maestro de proveedores, se mostrarán los códigos de cuenta en lugar de los nombres. Se recomienda cargar el maestro para una visualización más clara.'
      }
    ]
  },

  cashflow: {
    titulo: 'Cash Flow',
    descripcion: 'Estado de flujos de tesorería: puente beneficio → caja ("¿Dónde va el dinero?"), variación mensual y saldo de bancos.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Evolución mensual de los saldos de tesorería (grupo 57), cobros de clientes, pagos a proveedores y otros movimientos de caja.'
      },
      {
        titulo: '¿Dónde va el dinero? (puente beneficio → caja)',
        contenido: 'Explica por qué el beneficio del PyG no coincide con lo que varía el banco. El gráfico cascada reparte la variación de tesorería en 9 conceptos: beneficio, amortizaciones (gasto que no sale del banco), clientes (vendido sin cobrar), existencias, proveedores (comprado sin pagar), Hacienda y Seg. Social, inversiones en maquinaria (CAPEX), financiación bancaria y otros. La tabla mensual incluye una fila de verificación: "Δ Tesorería (puente)" debe coincidir al céntimo con "Δ Bancos real (57)". Se puede ver el año completo o un mes concreto, y hacer click en cualquier celda para exportar el detalle a Excel.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'El cash flow se construye a partir de los movimientos contables del grupo 57. Para un análisis preciso, es importante que las fechas de los apuntes reflejen las fechas reales de cobro/pago.'
      }
    ]
  },

  presupuesto: {
    titulo: 'Presupuesto vs Real',
    descripcion: 'Compara el presupuesto del ejercicio con los datos reales de contabilidad, con estructura de PyG analítico y análisis de desviaciones mes a mes y acumulado.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Para cada línea del PyG (Ventas, Compras, Margen Bruto, Personal, EBITDA, Resultado…): presupuesto del mes, real del mes, desviación %, y las mismas columnas en acumulado desde enero. Permite ver de un vistazo dónde se cumple el presupuesto y dónde hay desviaciones.',
        imagenes: [
          { src: '/ayuda/ppto/img05.png', pie: 'Pantalla Presupuesto vs Real en el Dashboard.' }
        ]
      },
      {
        titulo: 'Requisito previo',
        contenido: 'Hay que cargar PRIMERO el diario contable (los datos reales). Si no, verás el mensaje "Sin datos contables" y el módulo no puede comparar nada.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda'],
            ['Presupuesto GL PPT (.xlsx)', 'BUSINESS CENTRAL → Contabilidad → Presupuestos contables → pinchas ppto → ppto → exportar', 'Anual (1 vez/año)']
          ]
        }
      },
      {
        titulo: 'Cómo obtener el fichero en Business Central',
        contenido: '1) Contabilidad → Presupuestos contables: localiza el presupuesto del ejercicio (p. ej. "GL PPT 26", descripción "Presupuesto gastos e ingresos"). 2) Ábrelo para ver la matriz por meses. 3) Acciones → Exportar a Excel. 4) Ese Excel es el que se carga en el Dashboard.',
        imagenes: [
          { src: '/ayuda/ppto/img01.png', pie: '1. Presupuestos contables: elige el presupuesto del año (GL PPT).' },
          { src: '/ayuda/ppto/img02.png', pie: '2. El presupuesto abierto, con los importes por mes.' },
          { src: '/ayuda/ppto/img03.png', pie: '3. Acciones → Exportar a Excel.' },
          { src: '/ayuda/ppto/img04.png', pie: '4. Aspecto del Excel exportado (GL PPT) que se carga en el Dashboard.' }
        ]
      },
      {
        titulo: 'Cómo cargar el presupuesto',
        contenido: '1) Abre el bloque "Cargar Presupuesto" (o pulsa "Recargar presupuesto"). 2) Elige el ejercicio en el desplegable "Año". 3) Pulsa "Seleccionar archivo" o "Reemplazar" y elige el Excel. 4) Confirma el ejercicio en el aviso. 5) Espera al mensaje verde "Presupuesto [año] cargado". Importante: el año lo fija el DESPLEGABLE, no el nombre del fichero; y cargar reemplaza por completo el presupuesto anterior de ese año.'
      },
      {
        titulo: 'Protección frente al ejercicio incorrecto',
        contenido: 'Dos avisos evitan volcar, por ejemplo, 2027 dentro de 2026. (1) Antes de cargar, una confirmación te obliga a aceptar el año. (2) Como el GL PPT lleva el año en las fechas de cabecera, el sistema lo lee y, si no coincide con el desplegable, BLOQUEA la carga y te pide corregir el año. Así el dato del fichero manda y te frena antes de mezclar ejercicios.'
      },
      {
        titulo: 'Columnas de la tabla',
        tabla: {
          cabeceras: ['Columna', 'Significado'],
          filas: [
            ['Ppto. Mes', 'Presupuesto del mes seleccionado'],
            ['Real Mes', 'Real (contabilidad) del mes seleccionado'],
            ['Var.', 'Desviación del mes en % (real vs presupuesto)'],
            ['Ppto. / Real Acum', 'Acumulado de enero al mes seleccionado'],
            ['Var. (acum.)', 'Desviación acumulada en %']
          ]
        }
      },
      {
        titulo: 'Lectura de las desviaciones (colores)',
        tabla: {
          cabeceras: ['Tipo de línea', 'Verde (favorable)', 'Rojo (desfavorable)'],
          filas: [
            ['Ingresos', 'Real por encima del presupuesto', 'Real por debajo'],
            ['Gastos', 'Real por debajo del presupuesto', 'Real por encima']
          ]
        }
      },
      {
        titulo: 'Bajar al detalle',
        contenido: 'Clic en una categoría (▶) despliega sus cuentas de 3 dígitos; clic en una cuenta de 3 dígitos despliega sus subcuentas de 9 dígitos. Además, al pulsar cualquier importe de la columna REAL (aparece subrayado) se descarga un Excel con los movimientos contables que componen esa cifra. El botón "Exportar" descarga toda la tabla.'
      },
      {
        titulo: 'Problemas frecuentes',
        tabla: {
          cabeceras: ['Síntoma', 'Solución'],
          filas: [
            ['"Sin datos contables"', 'Carga primero el diario contable'],
            ['"El fichero parece ser del año X…"', 'Ajusta el desplegable al año del fichero y recarga'],
            ['"No se encontraron datos válidos"', 'Verifica que es el informe GL PPT con cuentas 6XX/7XX']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'El fichero de presupuesto se carga una vez al año. Solo se procesan cuentas 6XX (gastos) y 7XX (ingresos); los ingresos vienen en negativo y el sistema ajusta el signo automáticamente. Si revisas el presupuesto, basta con volver a cargarlo.'
      }
    ]
  },

  presupuestoCompras: {
    titulo: 'Presupuesto de Compras',
    descripcion: 'Control presupuestario de compras: albaranes recibidos vs pedidos realizados, con seguimiento del consumo presupuestario.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Comparativa entre pedidos de compra y albaranes/facturas recibidos. Permite controlar el grado de ejecución del presupuesto de compras por proveedor y categoría.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Albaranes y Facturas (.xlsx)', 'BUSINESS CENTRAL → Compras → Histórico', 'Mensual'],
            ['Pedidos de Compra (.xlsx)', 'BUSINESS CENTRAL → Compras → Pedidos', 'Mensual']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Ambos ficheros deben cargarse con periodicidad mensual desde la pestaña "Cargar Datos" para mantener actualizado el seguimiento.'
      }
    ]
  },

  seguimientoEstructuras: {
    titulo: 'Seguimiento de Estructuras',
    descripcion: 'Control de producción: planning de fabricación vs horas reales fichadas por los operarios en cada estructura/proyecto.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Horas planificadas vs horas reales por estructura, desviaciones de producción, rendimiento por operario y estado de avance de cada proyecto.'
      },
      {
        titulo: 'Ficheros necesarios',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad'],
          filas: [
            ['Planning Producción (.xlsx)', 'Excel externo (planning manual)', 'Según necesidad'],
            ['Fichajes Producción (.xlsx)', 'BUSINESS CENTRAL → tiempo captura datos', 'Según necesidad']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Estos ficheros se cargan directamente en esta pestaña (no en "Cargar Datos"). Los fichajes pueden tener columnas en inglés o español; el sistema los detecta automáticamente.'
      }
    ]
  },

  inversiones: {
    titulo: 'Presupuesto de Inversiones (CAPEX)',
    descripcion: 'Seguimiento de las inversiones en inmovilizado (grupo 2) frente a un presupuesto anual editable a mano, con desviaciones mes a mes y acumulado.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Para cada familia de inmovilizado (intangible, material, en curso…): presupuesto del mes, real del mes (altas de inmovilizado según contabilidad), desviación %, y las mismas columnas en acumulado desde enero. Se excluyen amortización acumulada (28x) y deterioros (29x) porque no son inversión.'
      },
      {
        titulo: 'Cómo introducir el presupuesto',
        contenido: 'El presupuesto se teclea directamente en la tabla: haz clic en una celda de la columna de presupuesto, escribe el importe (formato español, p. ej. "12.500" o "12500,50") y confirma con Enter o saliendo de la celda. Se guarda automáticamente.'
      },
      {
        titulo: 'De dónde sale el real',
        contenido: 'Del diario contable cargado en "Cargar Datos": altas de cuentas del grupo 2 (debe − haber). No requiere cargar ningún fichero adicional.'
      },
      {
        titulo: 'Bajar al detalle',
        contenido: 'Clic en una familia despliega sus cuentas de 3 dígitos. Al pulsar un importe de la columna REAL se descarga un Excel con los movimientos contables que componen esa cifra. El botón "Exportar" descarga toda la tabla.'
      }
    ]
  },

  cargar: {
    titulo: 'Cargar Datos',
    descripcion: 'Punto central de carga de ficheros Excel. Desde aquí se suben todos los ficheros necesarios para alimentar el dashboard.',
    secciones: [
      {
        titulo: 'Guía de ficheros',
        contenido: 'A continuación se detallan todos los ficheros que acepta el sistema, su origen y con qué frecuencia deben actualizarse.'
      },
      {
        titulo: 'Ficheros del módulo financiero',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad', 'Pestañas que alimenta'],
          filas: [
            ['Diario Contable (.xlsx)', 'BUSINESS CENTRAL → movimientos 01-01-202N..31-12-202N', 'A demanda', 'PyG, Servicios, Financiación, Proveedores, Cash Flow, Presupuesto vs Real'],
            ['Maestro Proveedores (.xlsx)', 'BUSINESS CENTRAL → pagos → proveedores → exportar nº y Nombre', 'Cuando haya cambios', 'Proveedores'],
            ['Presupuesto GL PPT (.xlsx)', 'BUSINESS CENTRAL → Contabilidad → Presupuestos contables → pinchas ppto → ppto → exportar', 'Anual (1 vez/año)', 'Presupuesto vs Real']
          ]
        }
      },
      {
        titulo: 'Ficheros del módulo de compras',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad', 'Pestañas que alimenta'],
          filas: [
            ['Albaranes y Facturas (.xlsx)', 'BUSINESS CENTRAL → Compras → Histórico', 'Mensual', 'Ppto Compras'],
            ['Pedidos de Compra (.xlsx)', 'BUSINESS CENTRAL → Compras → Pedidos', 'Mensual', 'Ppto Compras']
          ]
        }
      },
      {
        titulo: 'Ficheros de producción (se cargan en Seg. Estructuras)',
        tabla: {
          cabeceras: ['Fichero', 'Origen ERP', 'Periodicidad', 'Pestañas que alimenta'],
          filas: [
            ['Planning Producción (.xlsx)', 'Excel externo (planning manual)', 'Según necesidad', 'Seg. Estructuras'],
            ['Fichajes Producción (.xlsx)', 'BUSINESS CENTRAL → tiempo captura datos', 'Según necesidad', 'Seg. Estructuras']
          ]
        }
      },
      {
        titulo: 'Formato de los ficheros',
        contenido: 'Todos los ficheros deben ser formato Excel (.xlsx). El sistema detecta automáticamente las columnas y el contenido. Si un fichero no es reconocido, revise que contenga las columnas esperadas en la primera fila.'
      },
      {
        titulo: 'Consejos',
        contenido: 'El diario contable debe exportarse como acumulado anual (enero a mes actual). Al cargar un nuevo fichero del mismo tipo, se reemplaza el anterior. Los datos quedan almacenados en la nube y disponibles para todos los usuarios.'
      }
    ]
  },

  usuarios: {
    titulo: 'Gestión de Usuarios',
    descripcion: 'Administración de usuarios del dashboard: alta, baja y asignación de roles.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Listado de usuarios registrados, su rol asignado y opciones de gestión (invitar, cambiar rol, desactivar).'
      },
      {
        titulo: 'Roles disponibles',
        tabla: {
          cabeceras: ['Rol', 'Acceso', 'Navegación'],
          filas: [
            ['Dirección', 'Todas las pestañas', 'Sidebar lateral con secciones'],
            ['Compras', 'Ppto Compras + Cargar Datos', 'Pestañas horizontales en cabecera']
          ]
        }
      },
      {
        titulo: 'Notas',
        contenido: 'Solo los usuarios con rol "Dirección" pueden gestionar otros usuarios. Las invitaciones se envían por email. Nota: el servicio de email tiene un límite de 3-4 envíos por hora.'
      }
    ]
  }
}
