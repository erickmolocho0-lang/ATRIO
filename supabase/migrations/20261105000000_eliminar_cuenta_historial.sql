-- Conserva el historial operativo del pedido sin retener la cuenta eliminada.
ALTER TABLE public.historial_estados_pedido
  DROP CONSTRAINT IF EXISTS historial_estados_pedido_cambiado_por_fkey;
ALTER TABLE public.historial_estados_pedido
  ADD CONSTRAINT historial_estados_pedido_cambiado_por_fkey
  FOREIGN KEY (cambiado_por)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

GRANT SELECT (cambiado_por)
  ON public.historial_estados_pedido TO service_role;
GRANT UPDATE (cambiado_por)
  ON public.historial_estados_pedido TO service_role;

-- La Edge Function usa service_role para anonimizar pedidos antes de borrar
-- al usuario; limita el permiso a las columnas que necesita actualizar.
GRANT SELECT (usuario_id)
  ON public.pedidos TO service_role;
GRANT UPDATE (usuario_id, direccion_id)
  ON public.pedidos TO service_role;
