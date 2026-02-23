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
    descripcion: 'Estado de flujos de tesorería: movimientos de cobros, pagos y saldo de caja/bancos.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Evolución mensual de los saldos de tesorería (grupo 57), cobros de clientes, pagos a proveedores y otros movimientos de caja.'
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
    descripcion: 'Comparativa entre el presupuesto aprobado y los datos reales del ejercicio, con análisis de desviaciones.',
    secciones: [
      {
        titulo: 'Qué muestra',
        contenido: 'Para cada partida de PyG: importe presupuestado, importe real, desviación absoluta y porcentual. Permite detectar rápidamente dónde se producen las mayores desviaciones.'
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
        titulo: 'Notas',
        contenido: 'El fichero de presupuesto se carga una vez al año. Si se revisa el presupuesto, basta con volver a cargarlo para actualizar las comparativas.'
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
