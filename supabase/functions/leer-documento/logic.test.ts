import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validarPeticion,
  construirPropuesta,
  normalizarFecha,
  normalizarSerie,
  casarPorSerie,
  origenPermitido,
  ESQUEMAS,
  MAX_UNIONES,
} from "./logic.ts";

const UID = "6f1d3c2a-1111-4222-8333-944445555666";

test("petición: solo PDF subidos por la propia persona a _lectura/<uid>/", () => {
  assert.equal(validarPeticion({ tipo: "contrato", ruta: `_lectura/${UID}/a.pdf` }, UID).ok, true);
  assert.equal(validarPeticion({ tipo: "contrato", ruta: `_lectura/otro-uid/a.pdf` }, UID).ok, false);
  assert.equal(validarPeticion({ tipo: "contrato", ruta: `Chubb/2026-01-01_Chubb_Contrato_X.pdf` }, UID).ok, false);
  assert.equal(validarPeticion({ tipo: "contrato", ruta: `_lectura/${UID}/../x.pdf` }, UID).ok, false);
  assert.equal(validarPeticion({ tipo: "contrato", ruta: `_lectura/${UID}/a.exe` }, UID).ok, false);
  assert.equal(validarPeticion({ tipo: "nomina", ruta: `_lectura/${UID}/a.pdf` }, UID).ok, false);
  assert.equal(validarPeticion(null, UID).ok, false);
});

test("esquemas: todo objeto con additionalProperties false y todos los campos obligatorios", () => {
  const revisar = (s: Record<string, unknown>) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort());
      for (const p of Object.values(s.properties as Record<string, Record<string, unknown>>)) revisar(p);
    }
    if (s.type === "array") revisar(s.items as Record<string, unknown>);
    for (const alt of (s.anyOf as Record<string, unknown>[]) || []) revisar(alt);
  };
  for (const e of Object.values(ESQUEMAS)) revisar(e);
});

test("esquemas: dentro del límite de la API de campos con tipos unión (máx. 16)", () => {
  const contar = (s: Record<string, unknown>): number => {
    let n = s.anyOf || Array.isArray(s.type) ? 1 : 0;
    if (s.type === "object") for (const p of Object.values(s.properties as Record<string, Record<string, unknown>>)) n += contar(p);
    if (s.type === "array") n += contar(s.items as Record<string, unknown>);
    return n;
  };
  for (const [tipo, e] of Object.entries(ESQUEMAS)) assert.ok(contar(e) <= MAX_UNIONES, `${tipo}: ${contar(e)} uniones`);
});

test("un texto vacío cuenta como «no consta» (null), no como dato", () => {
  const p = construirPropuesta("certificado", {
    num_serie: "  ", modelo: "", fecha: "", resultado: null, entidad: "", referencia: "", proxima_fecha: "", observaciones: "", dudosos: [],
  });
  assert.equal(p.campos.num_serie.valor, null);
  assert.equal(p.campos.fecha.valor, null);
  assert.equal(p.campos.fecha.dudoso, false);
});

test("fechas: día, mes y año; descarta imposibles", () => {
  assert.deepEqual(normalizarFecha("2026-06-30"), { fecha: "2026-06-30", precision: "dia" });
  assert.deepEqual(normalizarFecha("2026-05"), { fecha: "2026-05-01", precision: "mes" });
  assert.deepEqual(normalizarFecha("2027"), { fecha: "2027-01-01", precision: "año" });
  assert.equal(normalizarFecha("2026-02-30"), null);
  assert.equal(normalizarFecha("30/06/2026"), null);
  assert.equal(normalizarFecha("1970-01-01"), null);
  assert.equal(normalizarFecha(null), null);
});

test("propuesta de contrato: normaliza, conserva dudosos y descarta valores imposibles", () => {
  const p = construirPropuesta("contrato", {
    fecha_documento: "2026-06-30",
    proveedor_nombre: " Gruaspuente Electrocranes S.L. ",
    referencia: "Oferta 20260630",
    objeto: "Mantenimiento anual de 4 puentes grúa",
    categoria: "Mantenimiento",
    importe: 400.004,
    periodicidad: "anual",
    inicio: "2026-06-30",
    fin: "2027-06",
    renovacion: "expresa",
    preaviso_dias: 5000,
    nave: "Gavilanes 21",
    equipos: [{ descripcion: "Puente grúa GH 5T", unidades: 2, num_serie: null, modelo: null }, { nada: 1 }],
    revision_periodicidad_meses: 12,
    observaciones: null,
    dudosos: ["referencia"],
  });
  assert.equal(p.campos.proveedor_nombre.valor, "Gruaspuente Electrocranes S.L.");
  assert.equal(p.campos.importe.valor, 400);
  assert.deepEqual(p.campos.fin, { valor: "2027-06-01", dudoso: false, precision: "mes" });
  assert.equal(p.campos.referencia.dudoso, true);
  assert.equal(p.campos.preaviso_dias.valor, null);
  assert.equal(p.campos.preaviso_dias.dudoso, true);
  assert.equal(p.equipos!.length, 1);
  assert.equal(p.campos.revision_periodicidad_meses.valor, 12);
  assert.deepEqual(p.campos.fecha_documento, { valor: "2026-06-30", dudoso: false, precision: "dia" });
});

test("propuesta: fin anterior al inicio → los dos dudosos", () => {
  const p = construirPropuesta("factura", {
    proveedor_nombre: "A", numero_factura: "1", fecha: "2026-01-10", concepto: "x",
    importe_sin_iva: -5, periodo_inicio: "2026-12-31", periodo_fin: "2026-01-01", observaciones: null, dudosos: [],
  });
  assert.equal(p.campos.periodo_inicio.dudoso, true);
  assert.equal(p.campos.periodo_fin.dudoso, true);
  assert.equal(p.campos.importe_sin_iva.valor, null);
  assert.ok(p.avisos.length >= 2);
});

test("propuesta de certificado: fecha inválida se deja vacía y dudosa", () => {
  const p = construirPropuesta("certificado", {
    num_serie: "SN-4471", modelo: null, fecha: "2026-13-01", resultado: "apto", entidad: "Castolin",
    referencia: "C-1", proxima_fecha: null, observaciones: null, dudosos: [],
  });
  assert.equal(p.campos.fecha.valor, null);
  assert.equal(p.campos.fecha.dudoso, true);
  assert.equal(p.campos.resultado.valor, "apto");
});

test("nº de serie: casa exacto tras normalizar; parciales solo si no hay exactos", () => {
  const equipos = [
    { id: 1, nombre: "Soldadura 072", num_serie: "14240130" },
    { id: 2, nombre: "Soldadura 073", num_serie: "SN 4471-A" },
    { id: 3, nombre: "Soldadura 074", num_serie: null },
    { id: 4, nombre: "Soldadura 075", num_serie: "1424" },
  ];
  assert.deepEqual(casarPorSerie("14-240-130", equipos).exactos.map((e) => e.id), [1]);
  assert.deepEqual(casarPorSerie("sn4471a", equipos).exactos.map((e) => e.id), [2]);
  const parcial = casarPorSerie("CAST14240130", equipos);
  assert.deepEqual(parcial.exactos, []);
  assert.deepEqual(parcial.parciales.map((e) => e.id).sort(), [1, 4]);
  assert.deepEqual(casarPorSerie("", equipos), { exactos: [], parciales: [] });
  assert.equal(normalizarSerie(" ab-12/3 "), "AB123");
});

test("origen: solo el Dashboard publicado, sus previsualizaciones y localhost", () => {
  assert.equal(origenPermitido("https://fmv-dashboard-v2.vercel.app"), true);
  assert.equal(origenPermitido("https://fmv-dashboard-v2-4p3u25nks-tokenia-studios-projects.vercel.app"), true);
  assert.equal(origenPermitido("http://localhost:3001"), true);
  assert.equal(origenPermitido("https://evil.example.com"), false);
  assert.equal(origenPermitido("https://fmv-dashboard-v2.vercel.app.evil.com"), false);
  assert.equal(origenPermitido(null), false);
});
