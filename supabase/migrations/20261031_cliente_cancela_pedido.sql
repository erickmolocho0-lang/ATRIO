-- El cliente puede cancelar su propio pedido mientras no haya salido
-- (pendiente de pago o preparado). Solo cambia la parte de permisos.

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
  SELECT * INTO v_pedido FROM public.pedidos WHERE numero = p_numero FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido % no existe.', p_numero;
  END IF;

  -- Quién puede cambiar el estado.
  IF public.es_administrador() OR auth.role() = 'service_role' THEN
    NULL; -- administrador o servidor (webhook): cualquier cambio válido
  ELSIF v_pedido.usuario_id = auth.uid()
    AND p_estado_nuevo = 'cancelado'
    AND v_pedido.estado IN ('pendiente_pago', 'preparado') THEN
    NULL; -- el cliente cancela su pedido antes de que salga
  ELSE
    RAISE EXCEPTION 'No tienes permiso para hacer este cambio.';
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

-- La app lee el historial (seguimiento del pedido). Las filas que ve cada
-- uno las sigue decidiendo la política de la tabla (paso 3).
GRANT SELECT ON public.historial_estados_pedido TO authenticated;
