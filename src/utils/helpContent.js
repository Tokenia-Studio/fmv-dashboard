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

  contratosEquipos: {
    titulo: 'Equipos y mantenimiento',
    descripcion: 'Qué equipo está en regla, cuándo toca su próxima revisión o calibración y qué contrato la cubre. Sustituye a la carpeta del servidor, al Excel de soldadura y al correo.',
    secciones: [
      {
        titulo: 'Cómo está pensado',
        contenido: 'El eje es el equipo, no el contrato. De cada equipo cuelgan sus obligaciones (calibración, revisión, inspección, certificación) con su periodicidad. Cada obligación necesita un documento de origen (contrato, pedido PCP o factura si no hay contrato) y un documento de cierre (certificado, parte o informe que prueba que se hizo). Si falta alguno, la app crea una tarea. El calendario no se mantiene a mano: al registrar una realizada, la siguiente fecha se calcula sola.'
      },
      {
        titulo: 'Pantallas',
        tabla: {
          cabeceras: ['Pantalla', 'Para qué sirve'],
          filas: [
            ['Panel', 'Lo urgente de un vistazo. Cada cifra abre la lista de equipos que la componen.'],
            ['Equipos', 'Lista con filtros (tipo, nave, situación, no aptos, sin documento de cierre). Desde aquí se dan de alta equipos y grupos, se registran varias realizadas a la vez y se exporta a Excel.'],
            ['Contratos', 'Los contratos de esta vista, con su vencimiento y la fecha límite para avisar al proveedor.'],
            ['Calendario', 'Lo que toca en los próximos 12 meses, lo atrasado y lo que no tiene fecha. Solo se consulta: todo sale de contratos y obligaciones.'],
            ['Tareas', 'Lo que falta para cerrar el inventario. Las automáticas desaparecen solas al resolver la causa; se les puede poner responsable, nota y «posponer hasta».'],
            ['Documentos', 'Todos los PDF, que se abren con un enlace temporal (el almacenamiento es privado).'],
            ['Proveedores', 'Contratos e importe anual por proveedor, con su nº de proveedor de Business Central.']
          ]
        }
      },
      {
        titulo: 'Qué significa cada situación',
        tabla: {
          cabeceras: ['Situación', 'Cuándo sale'],
          filas: [
            ['Fuera de plazo', 'La próxima fecha ya ha pasado. Una fecha con precisión de mes («abril de 2027») no cuenta como fuera de plazo hasta que acaba el mes.'],
            ['Próximos 60 días', 'Toca en menos de 60 días: momento de pedirla.'],
            ['En plazo', 'La próxima fecha está a más de 60 días.'],
            ['Sin fecha fijada', 'Hay periodicidad, pero no consta ninguna realizada ni fecha prevista. La app no inventa fechas: indique la última realizada o la primera prevista.'],
            ['Sin plan de mantenimiento', 'Equipo marcado para decidir si se contrata una revisión (o si la cubre el arrendador).'],
            ['No apto', 'La última realizada dio resultado no apto. Sigue señalado hasta que se registre una nueva realizada apta o se dé de baja.'],
            ['De baja', 'No genera obligaciones ni aparece como pendiente. Se ve marcando «Incluir bajas».']
          ]
        }
      },
      {
        titulo: 'Registrar una revisión o calibración',
        contenido: 'En la ficha del equipo o del grupo, botón «Registrar realizada»: fecha (no se admite una fecha futura), resultado y, si lo tiene, el certificado en PDF. Si no lo tiene aún, se guarda igual y nace la tarea de reclamarlo. En los grupos (extintores, eslingas) el resultado se marca unidad a unidad. Para un pedido con varias calibraciones: en Equipos, filtre y pulse «Registrar varias». Un registro erróneo no se borra: se anula y queda en el historial.'
      },
      {
        titulo: 'Leer un PDF con IA',
        contenido: '«Leer PDF» (contratos y facturas) y «Certificados (IA)» (calibraciones, admite varios a la vez) proponen los campos a partir del documento. Los campos propuestos se distinguen de los tecleados y los dudosos van señalados; lo que el documento no dice queda vacío. Nada se guarda hasta que usted revisa y confirma. Si la lectura falla, el formulario se rellena a mano.'
      },
      {
        titulo: 'Quién ve qué',
        contenido: 'Compras y Dirección ven y editan esta vista, importes incluidos. Los contratos de Servicios y arrendamientos solo los ve Dirección, salvo los que cubren un equipo de esta vista (por ejemplo, un renting), que aparecen enlazados en la ficha del equipo. Estos permisos se aplican en la base de datos, no solo en la pantalla.'
      },
      {
        titulo: 'Exportar a Excel',
        contenido: 'El botón «Excel» de Equipos descarga lo que está filtrado en tres hojas: Equipos, Obligaciones (cada revisión o calibración con su última fecha, su resultado y el documento que la prueba: sirve como listado para la auditoría EN 15085) y Unidades de grupos. En Contratos, «Excel» descarga los contratos filtrados con el total anual. Las fechas conocidas solo por mes o año salen como texto.'
      }
    ]
  },

  contratosServicios: {
    titulo: 'Servicios y arrendamientos',
    descripcion: 'Qué servicios indirectos se pagan, hasta cuándo y cuándo hay que decidir: seguros, arrendamientos y renting, consultoría, licencias, telecomunicaciones, suministros, seguridad.',
    secciones: [
      {
        titulo: 'El objetivo',
        contenido: 'Que ningún contrato se renueve por silencio. Para cada contrato la app calcula cuándo vence y la fecha límite para avisar al proveedor (vencimiento menos días de preaviso), y lo pone en el Panel y en el Calendario con el importe anual al lado.'
      },
      {
        titulo: 'Estados del calendario de un contrato',
        tabla: {
          cabeceras: ['Estado', 'Cuándo sale'],
          filas: [
            ['Plazo de aviso abierto', 'Ya pasó la fecha límite de aviso y el contrato no ha vencido: si no se avisa, se renueva.'],
            ['Decidir en 90 días', 'La fecha límite de aviso (o el vencimiento, si no hay preaviso) llega en menos de 90 días.'],
            ['Vencido sin cerrar', 'Pasó la fecha de fin sin registrar ninguna decisión.'],
            ['En plazo', 'Hay margen de sobra.'],
            ['Sin vencimiento conocido', 'Falta la fecha de fin o no se puede deducir. La app no calcula nada: complete la ficha.'],
            ['Histórico', 'Contrato histórico, sustituido o puntual: se conserva, pero no avisa ni suma en los totales.']
          ]
        }
      },
      {
        titulo: 'Contratos sin fecha de fin',
        contenido: 'Con prórroga tácita y fecha de inicio, el contrato vence en el próximo aniversario del inicio. El periodo de renovación no es el del pago: un renting que se paga cada mes suele renovarse por años. Si el contrato no dice cada cuánto se renueva, se supone anual y, si se paga por meses, sale la tarea «Confirmar periodo de renovación»; el periodo real se indica en «Cada (meses)» al editar el contrato. Si falta el preaviso, no se inventa: sin fecha límite de aviso, el contrato avisa desde 90 días antes del vencimiento.'
      },
      {
        titulo: 'Cerrar un vencimiento',
        contenido: 'En la ficha del contrato, «Registrar decisión»: renovado hasta una fecha, renegociado o cancelado, y si procede el nuevo documento (renovación, carta de baja u oferta aceptada), que pasa a ser el documento de origen. El vencimiento se recalcula.'
      },
      {
        titulo: 'Vista de cada contrato',
        contenido: 'La carga inicial propuso la vista de cada contrato según su categoría y la marca como «propuesta». Solo Dirección puede cambiarla o confirmarla, desde «Editar» en la ficha del contrato. Un renting o alquiler se ve aquí como contrato y en Equipos y mantenimiento como equipo, enlazados y sin duplicar datos.'
      },
      {
        titulo: 'Importes',
        contenido: 'Los importes van sin IVA. El importe anual se normaliza a 12 meses a partir del importe y su periodicidad (o se teclea si no se puede calcular). Si compras declaró un importe distinto, la ficha muestra la discrepancia. «Excel» en Contratos descarga los contratos filtrados con el total anual de los que suman.'
      },
      {
        titulo: 'Quién ve esta pestaña',
        contenido: 'Solo Dirección. El rol Compras no ve estos contratos salvo los que cubren un equipo suyo. Los permisos se aplican en la base de datos.'
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
        contenido: 'Solo los usuarios con rol "Dirección" pueden gestionar otros usuarios. Las invitaciones se envían por email. Nota: el servicio de email tiene un límite de 3-4 envíos por hora. Para usuarios sin buzón de correo (taller), el botón "Contraseña" de su fila permite a Dirección fijar la contraseña y comunicársela en persona.'
      }
    ]
  }
}
