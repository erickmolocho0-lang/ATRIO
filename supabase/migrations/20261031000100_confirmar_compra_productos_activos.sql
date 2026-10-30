CREATE OR REPLACE FUNCTION public.confirmar_compra(
  p_metodo_pago text,
  p_tipo_entrega text,
  p_direccion_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(numero text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_carrito_id uuid;
  v_pedido_id uuid;
  v_numero text;
  v_subtotal numeric := 0;
  v_descuento numeric := 0;
  v_igv numeric := 0;
  v_total numeric := 0;
  v_item record;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para confirmar la compra.';
  END IF;

  IF p_tipo_entrega NOT IN ('envio', 'retiro') THEN
    RAISE EXCEPTION 'Tipo de entrega inválido.';
  END IF;

  IF p_tipo_entrega = 'envio' THEN
    IF p_direccion_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona una dirección para el envío.';
    END IF;
    PERFORM 1
    FROM public.direcciones
    WHERE id = p_direccion_id
      AND usuario_id = v_usuario_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La dirección no existe o no te pertenece.';
    END IF;
  END IF;

  SELECT id
  INTO v_carrito_id
  FROM public.carritos
  WHERE usuario_id = v_usuario_id;
  IF v_carrito_id IS NULL THEN
    RAISE EXCEPTION 'No tienes un carrito activo.';
  END IF;

  PERFORM 1
  FROM public.items_carrito
  WHERE carrito_id = v_carrito_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu carrito está vacío.';
  END IF;

  FOR v_item IN
    SELECT ic.variante_id, ic.cantidad, vp.stock, p.activo
    FROM public.items_carrito AS ic
    JOIN public.variantes_producto AS vp ON vp.id = ic.variante_id
    JOIN public.productos AS p ON p.id = vp.producto_id
    WHERE ic.carrito_id = v_carrito_id
    ORDER BY p.id, vp.id
    FOR UPDATE OF vp, p
  LOOP
    IF v_item.activo IS NOT TRUE THEN
      RAISE EXCEPTION 'Un producto del carrito ya no está disponible.';
    END IF;

    IF v_item.stock < v_item.cantidad THEN
      RAISE EXCEPTION 'Ya no hay stock suficiente para una de las prendas del carrito.';
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(p.precio * ic.cantidad), 0)
  INTO v_subtotal
  FROM public.items_carrito AS ic
  JOIN public.variantes_producto AS vp ON vp.id = ic.variante_id
  JOIN public.productos AS p ON p.id = vp.producto_id
  WHERE ic.carrito_id = v_carrito_id;

  v_total := v_subtotal - v_descuento;
  v_igv := round(v_total - (v_total / 1.18), 2);
  v_numero := 'ATR-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0');

  INSERT INTO public.pedidos (
    usuario_id, numero, estado, tipo_entrega, direccion_id,
    subtotal, descuento, igv, total
  )
  VALUES (
    v_usuario_id, v_numero, 'preparado', p_tipo_entrega, p_direccion_id,
    v_subtotal, v_descuento, v_igv, v_total
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN
    SELECT ic.variante_id, ic.cantidad, vp.talla,
           p.nombre AS nombre_producto, p.precio AS precio_unitario,
           c.nombre AS color_nombre
    FROM public.items_carrito AS ic
    JOIN public.variantes_producto AS vp ON vp.id = ic.variante_id
    JOIN public.productos AS p ON p.id = vp.producto_id
    LEFT JOIN public.colores AS c ON c.id = vp.color_id
    WHERE ic.carrito_id = v_carrito_id
  LOOP
    INSERT INTO public.items_pedido (
      pedido_id, variante_id, nombre_producto, talla, color_nombre,
      cantidad, precio_unitario
    )
    VALUES (
      v_pedido_id, v_item.variante_id, v_item.nombre_producto, v_item.talla,
      v_item.color_nombre, v_item.cantidad, v_item.precio_unitario
    );

    UPDATE public.variantes_producto
    SET stock = stock - v_item.cantidad
    WHERE id = v_item.variante_id;

    INSERT INTO public.movimientos_stock (
      variante_id, tipo, cantidad, pedido_id, creado_por
    )
    VALUES (
      v_item.variante_id, 'venta', -v_item.cantidad, v_pedido_id, v_usuario_id
    );
  END LOOP;

  INSERT INTO public.pagos (pedido_id, metodo, estado, monto)
  VALUES (v_pedido_id, p_metodo_pago, 'pagado', v_total);

  DELETE FROM public.items_carrito
  WHERE carrito_id = v_carrito_id;

  RETURN QUERY SELECT v_numero, v_total;
END;
$$;

NOTIFY pgrst, 'reload schema';
