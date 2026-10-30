-- El webhook de Mercado Pago confirma o cancela pedidos con la clave de servicio,
-- así que cambiar_estado_pedido también debe aceptarlo. Solo cambia el primer IF.

CREATE OR REPLACE FUNCTION public.cambiar_estado_pedido(p_numero text, p_estado_nuevo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_item public.items_pedido%ROWTYPE;
BEGIN
  -- El servidor (webhook de Mercado Pago) también puede cambiar estados.
  IF NOT public.es_administrador() AND auth.role() IS DISTINCT FROM 'service_role' THEN
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

GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(text, text) TO service_role;
