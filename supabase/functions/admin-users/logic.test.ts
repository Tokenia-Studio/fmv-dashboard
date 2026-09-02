import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPeticion, decidirEnvio, filaRol } from "./logic.ts";

const base = {
  action: "invite",
  email: " Nuevo@FMV.com.es ",
  app: "produccion",
  role: "seccion",
  redirectTo: "https://fmv-produccion.vercel.app",
};

test("invite: normaliza email y centros; descarta duplicados", () => {
  const v = validarPeticion({ ...base, centros: ["015", "015", " 054 "] });
  assert.equal(v.ok, true);
  if (!v.ok || v.peticion.action !== "invite") throw new Error("esperaba invite");
  assert.equal(v.peticion.email, "nuevo@fmv.com.es");
  assert.deepEqual(v.peticion.centros, ["015", "054"]);
  assert.equal(v.peticion.taller, null);
});

test("invite: centros solo cuentan para rol seccion; taller solo para rol taller", () => {
  const a = validarPeticion({ ...base, role: "planificacion", centros: ["015"], taller: 1 });
  assert.equal(a.ok, true);
  if (a.ok && a.peticion.action === "invite") {
    assert.equal(a.peticion.centros, null);
    assert.equal(a.peticion.taller, null);
  }
  const b = validarPeticion({ ...base, role: "taller", taller: "2" });
  assert.equal(b.ok, true);
  if (b.ok && b.peticion.action === "invite") assert.equal(b.peticion.taller, 2);
  const c = validarPeticion({ ...base, role: "taller", taller: 3 });
  assert.equal(c.ok, false);
});

test("invite: rechaza email, app, rol, redirect y centros mal formados", () => {
  assert.equal(validarPeticion({ ...base, email: "sin-arroba" }).ok, false);
  assert.equal(validarPeticion({ ...base, app: "Producción" }).ok, false);
  assert.equal(validarPeticion({ ...base, role: "direccion; drop" }).ok, false);
  assert.equal(validarPeticion({ ...base, redirectTo: "http://malo.com" }).ok, false);
  assert.equal(validarPeticion({ ...base, centros: ["015", "0 1"] }).ok, false);
  assert.equal(validarPeticion({ ...base, redirectTo: "http://localhost:5173" }).ok, true);
});

test("resend y delete exigen uuid; acción desconocida falla", () => {
  const id = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";
  assert.equal(validarPeticion({ action: "resend", user_id: id, redirectTo: "https://x.es" }).ok, true);
  assert.equal(validarPeticion({ action: "resend", user_id: "1", redirectTo: "https://x.es" }).ok, false);
  assert.equal(validarPeticion({ action: "delete", user_id: id }).ok, true);
  assert.equal(validarPeticion({ action: "delete", user_id: "x" }).ok, false);
  assert.equal(validarPeticion({ action: "borrar_todo" }).ok, false);
  assert.equal(validarPeticion(null).ok, false);
});

test("decidirEnvio según estado de la cuenta", () => {
  assert.equal(decidirEnvio(null), "invitar");
  assert.equal(decidirEnvio({ email_confirmed_at: null, last_sign_in_at: null }), "reinvitar");
  assert.equal(decidirEnvio({ email_confirmed_at: "2026-09-02", last_sign_in_at: null }), "recuperar");
  assert.equal(decidirEnvio({ email_confirmed_at: "2026-09-02", last_sign_in_at: "2026-09-02" }), "nada");
});

test("filaRol limpia centros/taller según rol", () => {
  const v = validarPeticion({ ...base, centros: ["015"] });
  if (!v.ok || v.peticion.action !== "invite") throw new Error("esperaba invite");
  const fila = filaRol(v.peticion, "uid");
  assert.deepEqual(fila, {
    user_id: "uid",
    app: "produccion",
    role: "seccion",
    email: "nuevo@fmv.com.es",
    taller_asignado: null,
    centros_asignados: ["015"],
  });
});
