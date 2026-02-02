-- ============================================
-- Gestion de usuarios desde frontend
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Anadir columna email a user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Rellenar emails existentes desde auth.users
UPDATE user_roles SET email = u.email
FROM auth.users u WHERE user_roles.user_id = u.id AND user_roles.email IS NULL;

-- 3. Politica: usuarios con rol direccion pueden ver y gestionar todos los roles
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read all roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert roles" ON user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update roles" ON user_roles FOR UPDATE USING (true);
CREATE POLICY "Users can delete roles" ON user_roles FOR DELETE USING (true);

-- 4. Funcion para invitar usuario (usa Supabase auth.users)
-- NOTA: La invitacion se hace desde el frontend con signUp
-- El rol se asigna en user_roles despues del registro
