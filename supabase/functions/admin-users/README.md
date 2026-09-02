# admin-users (Edge Function)

Alta, reenvío de invitación y borrado de cuentas desde Dashboard → Usuarios. Ver cabecera de `index.ts`.

## Desplegar (lo hace Carlos)

Desde la raíz de `fmv-dashboard-v2`:

```
npx supabase login
npx supabase functions deploy admin-users --project-ref ryjavkyudanppnobbhkr
```

No hay secretos que configurar: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase en la función.

## Panel de Supabase (una vez)

- SQL Editor: ejecutar `sql/migracion_2026-09-02_usuarios_invitacion.sql` antes de desplegar el Dashboard.
- Authentication → Sign In / Providers → Email: **Allow new users to sign up = OFF**. Las altas pasan por la función, que usa la API de administración y no se ve afectada. "Confirm email" puede quedar como está.
- Authentication → URL Configuration → Redirect URLs: `https://fmv-dashboard-v2.vercel.app/**` y `https://fmv-produccion.vercel.app/**` (y la de cada app nueva).
- Authentication → Email Templates → **Invite user**: texto neutro, por ejemplo "Te han invitado a la aplicación de FMV. Pulsa el enlace para establecer tu contraseña". El enlace es `{{ .ConfirmationURL }}`.

## Probar la lógica pura

```
node --test supabase/functions/admin-users/logic.test.ts
```
