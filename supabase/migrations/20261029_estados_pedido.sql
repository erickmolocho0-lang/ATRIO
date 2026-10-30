-- 1. Nuevo estado "pendiente_pago": el pedido espera que se confirme el pago.
ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_estado_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_estado_check CHECK (
  estado IN ('pendiente_pago', 'preparado', 'en_camino', 'entregado', 'cancelado', 'devuelto')
);


-- 2. Historial: una fila por cada cambio de estado de un pedido.
CREATE TABLE public.historial_estados_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_anterior text NOT NULL,
  estado_nuevo text NOT NULL,
  cambiado_por uuid REFERENCES auth.users(id),
  creado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historial_estados_pedido ENABLE ROW LEVEL SECURITY;

-- El cliente ve el historial de sus pedidos; el administrador, el de todos.
CREATE POLICY historial_estados_pedido_select ON public.historial_estados_pedido
  FOR SELECT TO authenticated
  USING (
    public.es_administrador()
    OR pedido_id IN (SELECT id FROM public.pedidos WHERE usuario_id = auth.uid())
  );


-- 3. Cambios de estado permitidos.
CREATE FUNCTION public.es_cambio_de_estado_valido(p_estado_actual text, p_estado_nuevo text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_estado_actual, p_estado_nuevo) IN (
    ('pendiente_pago', 'preparado'),
    ('pendiente_pago', 'cancelado'),
    ('preparado',      'en_camino'),
    ('preparado',      'cancelado'),
    ('en_camino',      'entregado'),
    ('en_camino',      'cancelado'),
    ('entregado',      'devuelto')
  );
$$;


-- 4. Cambiar el estado de un pedido (solo administrador).
--    Si se cancela o se devuelve, las prendas vuelven al stock.
CREATE FUNCTION public.cambiar_estado_pedido(p_numero text, p_estado_nuevo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item public.items_pedido%ROWTYPE;
BEGIN
  IF NOT public.es_administrador() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el estado de un pedido.';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE numero = p_numero FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido % no existe.', p_numero;
  END IF;

  IF NOT public.es_cambio_de_estado_valido(v_pedido.estado, p_estado_nuevo) THEN
    RAISE EXCEPTION 'Un pedido "%" no puede pasar a "%".', v_pedido.estado, p_estado_nuevo;
  END IF;

  IF p_estado_nuevo IN ('cancelado', 'devuelto') THEN
    FOR v_item IN SELECT * FROM public.items_pedido WHERE pedido_id = v_pedido.id LOOP
      UPDATE public.variantes_producto
        SET stock = stock + v_item.cantidad
        WHERE id = v_item.variante_id;

      INSERT INTO public.movimientos_stock (variante_id, tipo, cantidad, pedido_id, motivo, creado_por)
        VALUES (v_item.variante_id, 'devolucion', v_item.cantidad, v_pedido.id, 'Pedido ' || p_estado_nuevo, auth.uid());
    END LOOP;
  END IF;

  UPDATE public.pedidos SET estado = p_estado_nuevo WHERE id = v_pedido.id;

  INSERT INTO public.historial_estados_pedido (pedido_id, estado_anterior, estado_nuevo, cambiado_por)
    VALUES (v_pedido.id, v_pedido.estado, p_estado_nuevo, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.cambiar_estado_pedido(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(text, text) TO authenticated;
