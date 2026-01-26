# Email Templates - FMV Dashboard

Plantillas de email para Supabase Authentication.

**Configurar en:** Supabase > Authentication > Email Templates

---

## 1. Confirm Signup (Confirmacion de registro)

### Subject
```
Confirma tu cuenta - FMV Dashboard
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#334155); padding:30px; text-align:center;">
              <div style="display:inline-block; background:#ffffff; padding:12px 24px; border-radius:12px;">
                <span style="font-size:24px; font-weight:bold; color:#1e293b;">FMV</span>
              </div>
              <p style="color:#94a3b8; margin:15px 0 0; font-size:14px;">Dashboard Financiero</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1e293b; margin:0 0 20px; font-size:24px;">Bienvenido a FMV Dashboard</h1>
              <p style="color:#64748b; font-size:16px; line-height:1.6; margin:0 0 25px;">
                Gracias por registrarte. Para activar tu cuenta y acceder al dashboard financiero, confirma tu direccion de email haciendo click en el siguiente boton:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:8px; font-weight:bold; font-size:16px;">
                      Confirmar cuenta
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8; font-size:14px; margin:25px 0 0;">
                Si no has solicitado esta cuenta, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8; font-size:12px; margin:0;">
                Fabricaciones Metalicas Valdepinto<br>
                Dashboard desarrollado por TOKENIA Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Invite User (Invitacion)

### Subject
```
Has sido invitado a FMV Dashboard
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#334155); padding:30px; text-align:center;">
              <div style="display:inline-block; background:#ffffff; padding:12px 24px; border-radius:12px;">
                <span style="font-size:24px; font-weight:bold; color:#1e293b;">FMV</span>
              </div>
              <p style="color:#94a3b8; margin:15px 0 0; font-size:14px;">Dashboard Financiero</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1e293b; margin:0 0 20px; font-size:24px;">Has sido invitado</h1>
              <p style="color:#64748b; font-size:16px; line-height:1.6; margin:0 0 25px;">
                Se te ha invitado a acceder al dashboard financiero de FMV. Haz click en el boton para aceptar la invitacion y configurar tu contrasena:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:linear-gradient(135deg,#10b981,#059669); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:8px; font-weight:bold; font-size:16px;">
                      Aceptar invitacion
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8; font-size:14px; margin:25px 0 0;">
                Este enlace expirara en 24 horas.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8; font-size:12px; margin:0;">
                Fabricaciones Metalicas Valdepinto<br>
                Dashboard desarrollado por TOKENIA Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password (Recuperar contrasena)

### Subject
```
Restablecer contrasena - FMV Dashboard
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#334155); padding:30px; text-align:center;">
              <div style="display:inline-block; background:#ffffff; padding:12px 24px; border-radius:12px;">
                <span style="font-size:24px; font-weight:bold; color:#1e293b;">FMV</span>
              </div>
              <p style="color:#94a3b8; margin:15px 0 0; font-size:14px;">Dashboard Financiero</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1e293b; margin:0 0 20px; font-size:24px;">Restablecer contrasena</h1>
              <p style="color:#64748b; font-size:16px; line-height:1.6; margin:0 0 25px;">
                Hemos recibido una solicitud para restablecer la contrasena de tu cuenta. Si no has sido tu, puedes ignorar este mensaje.
              </p>
              <p style="color:#64748b; font-size:16px; line-height:1.6; margin:0 0 25px;">
                Para crear una nueva contrasena, haz click en el siguiente boton:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:linear-gradient(135deg,#f59e0b,#d97706); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:8px; font-weight:bold; font-size:16px;">
                      Restablecer contrasena
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8; font-size:14px; margin:25px 0 0;">
                Este enlace expirara en 1 hora por seguridad.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8; font-size:12px; margin:0;">
                Fabricaciones Metalicas Valdepinto<br>
                Dashboard desarrollado por TOKENIA Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Change Email Address (Cambio de email)

### Subject
```
Confirma tu nuevo email - FMV Dashboard
```

### Body (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#334155); padding:30px; text-align:center;">
              <div style="display:inline-block; background:#ffffff; padding:12px 24px; border-radius:12px;">
                <span style="font-size:24px; font-weight:bold; color:#1e293b;">FMV</span>
              </div>
              <p style="color:#94a3b8; margin:15px 0 0; font-size:14px;">Dashboard Financiero</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              <h1 style="color:#1e293b; margin:0 0 20px; font-size:24px;">Confirma tu nuevo email</h1>
              <p style="color:#64748b; font-size:16px; line-height:1.6; margin:0 0 25px;">
                Has solicitado cambiar tu direccion de email. Para confirmar este cambio, haz click en el siguiente boton:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:8px; font-weight:bold; font-size:16px;">
                      Confirmar nuevo email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8; font-size:14px; margin:25px 0 0;">
                Si no has solicitado este cambio, contacta con el administrador inmediatamente.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:20px 30px; text-align:center; border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8; font-size:12px; margin:0;">
                Fabricaciones Metalicas Valdepinto<br>
                Dashboard desarrollado por TOKENIA Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Variables disponibles

| Variable | Descripcion |
|----------|-------------|
| `{{ .ConfirmationURL }}` | URL de confirmacion/accion |
| `{{ .Email }}` | Email del usuario |
| `{{ .SiteURL }}` | URL del sitio |
| `{{ .Token }}` | Token de verificacion |
| `{{ .TokenHash }}` | Hash del token |

---

## Notas

- Los emails usan tablas HTML para compatibilidad con clientes de correo
- Colores basados en el tema del dashboard (slate, blue)
- Sin emojis para mejor compatibilidad
- Footer con branding de FMV y TOKENIA Studio
