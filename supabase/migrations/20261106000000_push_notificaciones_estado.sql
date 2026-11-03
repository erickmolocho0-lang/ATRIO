-- Notificaciones push cuando cambia el estado de un pedido.
--
-- Flujo: cambiar_estado_pedido() inserta una fila en historial_estados_pedido
-- -> el trigger de este archivo avisa a la Edge Function notificar-estado-pedido
-- -> la función busca los dispositivos del cliente y llama a la API de Expo Push.
--
-- Configuración fuera del repo (una sola vez, ver README de la función):
--   · Vault: secretos 'proyecto_url' y 'push_webhook_secret'.
--   · Secreto de la función: PUSH_WEBHOOK_SECRET (el mismo valor).
-- Mientras esos secretos no existan, el trigger no hace nada y los cambios de
-- estado funcionan igual que antes.

-- 1. Dispositivos donde cada usuario recibe avisos.
CREATE TABLE public.dispositivos_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  plataforma text NOT NULL CHECK (plataforma IN ('ios', 'android', 'web')),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dispositivos_push_usuario_idx ON public.dispositivos_push (usuario_id);

-- Sin políticas: ningún cliente lee ni escribe la tabla directamente (un token
-- ajeno permitiría espiar avisos). La app usa solo las dos funciones de abajo;
-- la Edge Function entra con la clave de servicio.
ALTER TABLE public.dispositivos_push ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispositivos_push FROM anon, authenticated;

-- 2. La app registra o quita el token de este dispositivo.
-- Si el token ya existía con otra cuenta (se cerró sesión y entró otra persona
-- en el mismo teléfono), pasa a la cuenta actual.
CREATE OR REPLACE FUNCTION public.registrar_dispositivo_push(p_token text, p_plataforma text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;
  IF p_token IS NULL OR length(p_token) < 10 OR length(p_token) > 300 THEN
    RAISE EXCEPTION 'Token de notificaciones inválido.';
  END IF;

  INSERT INTO public.dispositivos_push (usuario_id, token, plataforma)
    VALUES (auth.uid(), p_token, p_plataforma)
  ON CONFLICT (token) DO UPDATE
    SET usuario_id = auth.uid(),
        plataforma = EXCLUDED.plataforma,
        actualizado_en = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_dispositivo_push(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.dispositivos_push
    WHERE token = p_token AND usuario_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_dispositivo_push(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eliminar_dispositivo_push(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_dispositivo_push(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_dispositivo_push(text) TO authenticated;

-- 3. Aviso a la Edge Function cuando se registra un cambio de estado.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notificar_cambio_estado_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_secreto text;
  v_pedido record;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'proyecto_url';
  SELECT decrypted_secret INTO v_secreto FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
  IF v_url IS NULL OR v_secreto IS NULL THEN
    RETURN NEW; -- sin configurar: no se avisa, pero el cambio de estado sigue
  END IF;

  SELECT numero, usuario_id INTO v_pedido FROM public.pedidos WHERE id = NEW.pedido_id;
  IF v_pedido.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si el propio cliente hizo el cambio (por ejemplo, cancelar), no se le avisa
  -- de lo que acaba de hacer.
  IF NEW.cambiado_por IS NOT DISTINCT FROM v_pedido.usuario_id THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/notificar-estado-pedido',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secreto),
    body := jsonb_build_object(
      'usuario_id', v_pedido.usuario_id,
      'numero', v_pedido.numero,
      'estado_nuevo', NEW.estado_nuevo
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Un fallo al avisar nunca debe impedir el cambio de estado.
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historial_estados_notificar
  AFTER INSERT ON public.historial_estados_pedido
  FOR EACH ROW EXECUTE FUNCTION public.notificar_cambio_estado_pedido();
