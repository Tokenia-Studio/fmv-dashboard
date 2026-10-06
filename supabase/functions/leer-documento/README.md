# leer-documento (Edge Function)

Lector asistido de PDF del módulo de contratos (US-014, bloque 1.6). Lee un contrato, una factura sin contrato o un certificado de calibración con la API de Claude y devuelve una **propuesta** de campos. No escribe en ninguna tabla de negocio: la persona revisa y confirma en la app. Ver cabecera de `index.ts`.

Seguridad, en el orden en que se comprueba:

1. Origen: solo el Dashboard publicado, sus previsualizaciones de Vercel y `localhost:30xx`.
2. Sesión válida y rol `direccion` o `compras` en la app `dashboard`.
3. Interruptor `configuracion.ctr_lector_activo = true` (apagado por defecto).
4. Tope de 60 lecturas por persona y día (`LECTURAS_DIA` en `logic.ts`).
5. Solo lee PDF que la propia persona ha subido a `contratos/_lectura/<su uid>/`, y los descarga **con su sesión**: si la RLS no le deja verlo, no se lee.
6. Cada lectura queda en `ctr_lecturas` (tipo, modelo, resultado, tokens, usuario, fecha). Nunca el contenido.

La clave de la API solo vive como secreto de la función: nunca en el repositorio, en `.env` ni en el navegador.

## Poner en marcha (lo hace Carlos, una vez)

1. **Clave de la API.** En console.anthropic.com crea una clave dedicada, por ejemplo «FMV lector contratos». Ponle un **límite de gasto mensual** en Settings → Limits: con 20 € al mes sobra. Cada documento cuesta del orden de 5 a 20 céntimos con Claude Opus 5.
2. **Guardar la clave como secreto** (no se escribe en ningún fichero). Desde la raíz de `fmv-dashboard-v2`:
   ```
   npx supabase login
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref ryjavkyudanppnobbhkr
   ```
   También se puede hacer desde el panel: Edge Functions → Secrets.
3. **Desplegar la función:**
   ```
   npx supabase functions deploy leer-documento --project-ref ryjavkyudanppnobbhkr
   ```
4. **Encender el lector** (editor SQL de Supabase):
   ```sql
   update public.configuracion set value = 'true'::jsonb, updated_at = now() where key = 'ctr_lector_activo';
   ```
   Apagarlo es lo mismo con `'false'::jsonb`. Con el lector apagado, el módulo funciona entero con formularios manuales y los botones «Leer PDF» y «Certificados (IA)» no aparecen.

Opcional: `LECTOR_MODELO` (secreto) cambia el modelo sin tocar código. Por defecto es `claude-opus-5`.

## Probar la lógica pura

```
node --test supabase/functions/leer-documento/logic.test.ts
```

## Lecturas y gasto

```sql
select date_trunc('day', leido_en) as dia, tipo_lectura, resultado, count(*),
       sum(tokens_entrada) as entrada, sum(tokens_salida) as salida
from public.ctr_lecturas group by 1, 2, 3 order by 1 desc;
```

Si alguien cierra el navegador a mitad de una lectura, su PDF temporal queda en `_lectura/` (solo lo ve quien lo subió). Se pueden borrar de vez en cuando desde Storage → contratos → `_lectura`.
