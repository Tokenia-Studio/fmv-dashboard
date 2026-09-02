// Detecta si la app se ha abierto desde un enlace de acceso de Supabase
// (invitación creada desde Usuarios, confirmación de alta o recuperación de
// contraseña). El enlace trae la sesión en el hash de la URL, pero el usuario
// aún no tiene contraseña (invitación) o quiere una nueva (recovery): la app
// debe forzar la pantalla de contraseña antes de dejar pasar. Se lee al
// arrancar, antes de que supabase-js consuma el hash.
export function esEnlaceDeAcceso(hash) {
  if (!hash || typeof hash !== 'string') return false
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.get('access_token')) return false
  const type = params.get('type')
  return type === 'invite' || type === 'signup' || type === 'recovery'
}
