-- Preferencia de correos promocionales, guardada en el perfil.
-- Por defecto es false: la persona tiene que activarla ella misma.
-- No hace falta una política nueva: perfiles_actualizacion_propia_o_admin ya
-- deja a cada usuario actualizar su propia fila, y el trigger
-- trg_perfiles_evitar_cambio_rol sigue impidiendo cambiar el rol.
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS acepta_promociones boolean NOT NULL DEFAULT false;
