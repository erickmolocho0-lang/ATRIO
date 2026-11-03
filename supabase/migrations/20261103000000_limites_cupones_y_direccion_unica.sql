-- Complementa 20261102000000 sin reescribir la migracion ya publicada.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT usuario_id FROM public.direcciones WHERE predeterminada GROUP BY usuario_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Hay direcciones predeterminadas duplicadas. Corrigelas antes de aplicar esta migracion.';
  END IF;
END $$;
CREATE UNIQUE INDEX direcciones_predeterminada_unica ON public.direcciones(usuario_id) WHERE predeterminada;

ALTER TABLE public.cupones
  ADD COLUMN usos_maximos integer CHECK (usos_maximos>0),
  ADD COLUMN usos_actuales integer NOT NULL DEFAULT 0 CHECK (usos_actuales>=0);

-- Recuperar consumos si hubo pedidos antes de aplicar esta ampliacion.
UPDATE public.cupones c SET usos_actuales=(SELECT count(*) FROM public.pedidos p WHERE p.cupon_codigo=c.codigo);

-- El panel administra la promocion; el contador solo lo modifica confirmar_compra.
REVOKE INSERT, UPDATE ON public.cupones FROM authenticated;
GRANT INSERT(codigo,porcentaje,activo,minimo_compra,vigente_desde,vigente_hasta,usos_maximos),
  UPDATE(codigo,porcentaje,activo,minimo_compra,vigente_desde,vigente_hasta,usos_maximos)
  ON public.cupones TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_cupon(p_codigo text)
RETURNS TABLE(codigo text,porcentaje numeric,subtotal numeric,descuento numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cupon public.cupones%ROWTYPE; v_subtotal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesion para aplicar un cupon.'; END IF;
  SELECT * INTO v_cupon FROM public.cupones c WHERE c.codigo=upper(btrim(p_codigo)) AND c.activo
    AND (c.vigente_desde IS NULL OR c.vigente_desde<=now())
    AND (c.vigente_hasta IS NULL OR c.vigente_hasta>now()) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cupon no existe, esta inactivo o vencio.'; END IF;
  IF v_cupon.usos_maximos IS NOT NULL AND v_cupon.usos_actuales >= v_cupon.usos_maximos THEN
    RAISE EXCEPTION 'El cupon alcanzo su limite de usos.';
  END IF;
  SELECT coalesce(sum(ic.cantidad*p.precio),0) INTO v_subtotal FROM public.carritos ca
    JOIN public.items_carrito ic ON ic.carrito_id=ca.id JOIN public.variantes_producto vp ON vp.id=ic.variante_id
    JOIN public.productos p ON p.id=vp.producto_id WHERE ca.usuario_id=auth.uid();
  IF v_subtotal<=0 OR v_subtotal<v_cupon.minimo_compra THEN
    RAISE EXCEPTION 'El carrito no alcanza el minimo de compra del cupon.';
  END IF;
  RETURN QUERY SELECT v_cupon.codigo,v_cupon.porcentaje,v_subtotal,round(v_subtotal*v_cupon.porcentaje/100,2);
END $$;

-- Mantener el contrato de Hans para las apps que aun envian tres/cuatro datos.
-- La version con cupon requiere seis argumentos: PostgREST puede distinguir ambas.
DROP FUNCTION public.confirmar_compra(text,text,uuid,text,text,numeric);
CREATE FUNCTION public.confirmar_compra(
  p_metodo_pago text,
  p_tipo_entrega text,
  p_direccion_id uuid DEFAULT NULL,
  p_metodo_entrega_id text DEFAULT NULL
)
RETURNS TABLE(numero text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_metodo_entrega public.metodos_entrega%ROWTYPE;
  v_zona_id uuid;
  v_carrito_id uuid;
  v_pedido_id uuid;
  v_numero text;
  v_subtotal numeric := 0;
  v_descuento numeric := 0;
  v_costo_envio numeric := 0;
  v_igv numeric := 0;
  v_total numeric := 0;
  v_estado_inicial text;
  v_item record;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para confirmar la compra.';
  END IF;

  -- NUEVO: solo los métodos de pago que existen.
  IF p_metodo_pago NOT IN ('tarjeta', 'yape', 'contra_entrega') THEN
    RAISE EXCEPTION 'Método de pago inválido.';
  END IF;

  IF p_tipo_entrega NOT IN ('envio', 'retiro') THEN
    RAISE EXCEPTION 'Tipo de entrega inválido.';
  END IF;

  IF p_tipo_entrega = 'envio' THEN
    IF p_direccion_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona una dirección para el envío.';
    END IF;
    SELECT zona_id INTO v_zona_id
      FROM public.direcciones
      WHERE id = p_direccion_id AND usuario_id = v_usuario_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La dirección no existe o no te pertenece.';
    END IF;
  END IF;

  -- NUEVO: método de entrega exacto y costo de envío.
  IF p_metodo_entrega_id IS NOT NULL THEN
    SELECT * INTO v_metodo_entrega
      FROM public.metodos_entrega
      WHERE id = p_metodo_entrega_id AND activo;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese método de entrega no está disponible.';
    END IF;
    IF v_metodo_entrega.tipo <> p_tipo_entrega THEN
      RAISE EXCEPTION 'El método de entrega no coincide con el tipo de entrega.';
    END IF;

    IF p_tipo_entrega = 'envio' THEN
      IF v_zona_id IS NULL THEN
        RAISE EXCEPTION 'Tu dirección no tiene una zona de entrega.';
      END IF;
      SELECT t.costo INTO v_costo_envio
        FROM public.tarifas_entrega t
        JOIN public.zonas_entrega z ON z.id = t.zona_id
        WHERE t.zona_id = v_zona_id AND t.metodo_id = p_metodo_entrega_id AND z.activo;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay envío disponible a esa zona.';
      END IF;
    END IF;
  END IF;

  SELECT id INTO v_carrito_id FROM public.carritos WHERE usuario_id = v_usuario_id;
  IF v_carrito_id IS NULL THEN
    RAISE EXCEPTION 'No tienes un carrito activo.';
  END IF;

  PERFORM 1 FROM public.items_carrito WHERE carrito_id = v_carrito_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu carrito está vacío.';
  END IF;

  FOR v_item IN
    SELECT ic.cantidad, vp.stock, p.activo
    FROM public.items_carrito ic
    JOIN public.variantes_producto vp ON vp.id = ic.variante_id
    JOIN public.productos p ON p.id = vp.producto_id
    WHERE ic.carrito_id = v_carrito_id
    FOR UPDATE OF vp
  LOOP
    -- NUEVO: un producto desactivado por el admin ya no se vende.
    IF NOT v_item.activo THEN
      RAISE EXCEPTION 'Una de las prendas del carrito ya no está disponible.';
    END IF;
    IF v_item.stock < v_item.cantidad THEN
      RAISE EXCEPTION 'Ya no hay stock suficiente para una de las prendas del carrito.';
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(p.precio * ic.cantidad), 0) INTO v_subtotal
  FROM public.items_carrito ic
  JOIN public.variantes_producto vp ON vp.id = ic.variante_id
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE ic.carrito_id = v_carrito_id;

  -- NUEVO: el total incluye el envío.
  v_total := v_subtotal - v_descuento + v_costo_envio;
  v_igv := round(v_total - (v_total / 1.18), 2);
  v_numero := 'ATR-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0');

  -- NUEVO: tarjeta y Yape esperan la confirmación de Mercado Pago.
  IF p_metodo_pago = 'contra_entrega' THEN
    v_estado_inicial := 'preparado';
  ELSE
    v_estado_inicial := 'pendiente_pago';
  END IF;

  INSERT INTO public.pedidos (
    usuario_id, numero, estado, tipo_entrega, metodo_entrega_id, direccion_id,
    subtotal, descuento, costo_envio, igv, total
  )
  VALUES (
    v_usuario_id, v_numero, v_estado_inicial, p_tipo_entrega, p_metodo_entrega_id,
    CASE WHEN p_tipo_entrega = 'envio' THEN p_direccion_id END,
    v_subtotal, v_descuento, v_costo_envio, v_igv, v_total
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN
    SELECT ic.variante_id, ic.cantidad, vp.talla,
           p.nombre AS nombre_producto, p.precio AS precio_unitario,
           c.nombre AS color_nombre
    FROM public.items_carrito ic
    JOIN public.variantes_producto vp ON vp.id = ic.variante_id
    JOIN public.productos p ON p.id = vp.producto_id
    LEFT JOIN public.colores c ON c.id = vp.color_id
    WHERE ic.carrito_id = v_carrito_id
  LOOP
    INSERT INTO public.items_pedido (pedido_id, variante_id, nombre_producto, talla, color_nombre, cantidad, precio_unitario)
    VALUES (v_pedido_id, v_item.variante_id, v_item.nombre_producto, v_item.talla, v_item.color_nombre, v_item.cantidad, v_item.precio_unitario);

    UPDATE public.variantes_producto SET stock = stock - v_item.cantidad WHERE id = v_item.variante_id;

    INSERT INTO public.movimientos_stock (variante_id, tipo, cantidad, pedido_id, creado_por)
    VALUES (v_item.variante_id, 'venta', -v_item.cantidad, v_pedido_id, v_usuario_id);
  END LOOP;

  -- NUEVO: el pago nace pendiente (antes nacía "pagado").
  INSERT INTO public.pagos (pedido_id, metodo, estado, monto)
  VALUES (v_pedido_id, p_metodo_pago, 'pendiente', v_total);

  DELETE FROM public.items_carrito WHERE carrito_id = v_carrito_id;

  RETURN QUERY SELECT v_numero, v_total;
END;
$$;

CREATE FUNCTION public.confirmar_compra(
  p_metodo_pago text,
  p_tipo_entrega text,
  p_direccion_id uuid,
  p_metodo_entrega_id text,
  p_codigo_cupon text,
  p_total_esperado numeric
)
RETURNS TABLE(numero text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_metodo_entrega public.metodos_entrega%ROWTYPE;
  v_zona_id uuid;
  v_carrito_id uuid;
  v_pedido_id uuid;
  v_numero text;
  v_subtotal numeric := 0;
  v_descuento numeric := 0;
  v_costo_envio numeric := 0;
  v_igv numeric := 0;
  v_total numeric := 0;
  v_estado_inicial text;
  v_item record;
  v_cotizacion record;
BEGIN
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para confirmar la compra.';
  END IF;

  -- NUEVO: solo los métodos de pago que existen.
  IF p_metodo_entrega_id IS NULL THEN RAISE EXCEPTION 'Actualiza la app y selecciona el metodo exacto de entrega.'; END IF;

  IF p_metodo_pago IS NULL OR p_metodo_pago NOT IN ('tarjeta', 'yape', 'contra_entrega') THEN
    RAISE EXCEPTION 'Método de pago inválido.';
  END IF;

  IF p_tipo_entrega IS NULL OR p_tipo_entrega NOT IN ('envio', 'retiro') THEN
    RAISE EXCEPTION 'Tipo de entrega inválido.';
  END IF;

  IF p_tipo_entrega = 'envio' THEN
    IF p_direccion_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona una dirección para el envío.';
    END IF;
    SELECT zona_id INTO v_zona_id
      FROM public.direcciones
      WHERE id = p_direccion_id AND usuario_id = v_usuario_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La dirección no existe o no te pertenece.';
    END IF;
  END IF;

  -- NUEVO: método de entrega exacto y costo de envío.
  IF p_metodo_entrega_id IS NOT NULL THEN
    SELECT * INTO v_metodo_entrega
      FROM public.metodos_entrega
      WHERE id = p_metodo_entrega_id AND activo;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese método de entrega no está disponible.';
    END IF;
    IF v_metodo_entrega.tipo <> p_tipo_entrega THEN
      RAISE EXCEPTION 'El método de entrega no coincide con el tipo de entrega.';
    END IF;

    IF p_tipo_entrega = 'envio' THEN
      IF v_zona_id IS NULL THEN
        RAISE EXCEPTION 'Tu dirección no tiene una zona de entrega.';
      END IF;
      SELECT t.costo INTO v_costo_envio
        FROM public.tarifas_entrega t
        JOIN public.zonas_entrega z ON z.id = t.zona_id
        WHERE t.zona_id = v_zona_id AND t.metodo_id = p_metodo_entrega_id AND z.activo;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay envío disponible a esa zona.';
      END IF;
    END IF;
  END IF;

  SELECT id INTO v_carrito_id FROM public.carritos WHERE usuario_id = v_usuario_id FOR UPDATE;
  IF v_carrito_id IS NULL THEN
    RAISE EXCEPTION 'No tienes un carrito activo.';
  END IF;

  PERFORM 1 FROM public.items_carrito WHERE carrito_id = v_carrito_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu carrito está vacío.';
  END IF;

  FOR v_item IN
    SELECT ic.cantidad, vp.stock, p.activo
    FROM public.items_carrito ic
    JOIN public.variantes_producto vp ON vp.id = ic.variante_id
    JOIN public.productos p ON p.id = vp.producto_id
    WHERE ic.carrito_id = v_carrito_id
    ORDER BY vp.id
    FOR UPDATE OF vp, p, ic
  LOOP
    -- NUEVO: un producto desactivado por el admin ya no se vende.
    IF NOT v_item.activo THEN
      RAISE EXCEPTION 'Una de las prendas del carrito ya no está disponible.';
    END IF;
    IF v_item.stock < v_item.cantidad THEN
      RAISE EXCEPTION 'Ya no hay stock suficiente para una de las prendas del carrito.';
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(p.precio * ic.cantidad), 0) INTO v_subtotal
  FROM public.items_carrito ic
  JOIN public.variantes_producto vp ON vp.id = ic.variante_id
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE ic.carrito_id = v_carrito_id;

  -- Serializar compradores del mismo cupon antes de cotizar evita exceder el cupo.
  IF nullif(btrim(p_codigo_cupon),'') IS NOT NULL THEN
    PERFORM 1 FROM public.cupones WHERE codigo=upper(btrim(p_codigo_cupon)) FOR UPDATE;
  END IF;
  -- NUEVO: el total incluye el envío.
  SELECT * INTO v_cotizacion FROM public.cotizar_checkout(p_metodo_entrega_id,p_direccion_id,p_codigo_cupon);
  v_subtotal := v_cotizacion.subtotal;
  v_descuento := v_cotizacion.descuento;
  v_costo_envio := v_cotizacion.costo_envio;
  v_total := v_cotizacion.total;
  IF p_total_esperado IS NOT NULL AND p_total_esperado IS DISTINCT FROM v_total THEN
    RAISE EXCEPTION 'El total cambio. Vuelve al checkout para revisar los precios actualizados.';
  END IF;
  v_igv := round(v_total - (v_total / 1.18), 2);
  IF v_cotizacion.cupon_codigo IS NOT NULL THEN
    UPDATE public.cupones SET usos_actuales=usos_actuales+1
      WHERE codigo=v_cotizacion.cupon_codigo AND (usos_maximos IS NULL OR usos_actuales<usos_maximos);
    IF NOT FOUND THEN RAISE EXCEPTION 'El cupon alcanzo su limite de usos.'; END IF;
  END IF;
  v_numero := 'ATR-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0');

  -- NUEVO: tarjeta y Yape esperan la confirmación de Mercado Pago.
  IF p_metodo_pago = 'contra_entrega' THEN
    v_estado_inicial := 'preparado';
  ELSE
    v_estado_inicial := 'pendiente_pago';
  END IF;

  INSERT INTO public.pedidos (
    usuario_id, numero, estado, tipo_entrega, metodo_entrega_id, direccion_id,
    subtotal, descuento, costo_envio, igv, total, cupon_codigo, datos_entrega
  )
  VALUES (
    v_usuario_id, v_numero, v_estado_inicial, p_tipo_entrega, p_metodo_entrega_id,
    CASE WHEN p_tipo_entrega = 'envio' THEN p_direccion_id END,
    v_subtotal, v_descuento, v_costo_envio, v_igv, v_total, v_cotizacion.cupon_codigo, v_cotizacion.datos_entrega
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN
    SELECT ic.variante_id, ic.cantidad, vp.talla,
           p.nombre AS nombre_producto, p.precio AS precio_unitario,
           c.nombre AS color_nombre
    FROM public.items_carrito ic
    JOIN public.variantes_producto vp ON vp.id = ic.variante_id
    JOIN public.productos p ON p.id = vp.producto_id
    LEFT JOIN public.colores c ON c.id = vp.color_id
    WHERE ic.carrito_id = v_carrito_id
  LOOP
    INSERT INTO public.items_pedido (pedido_id, variante_id, nombre_producto, talla, color_nombre, cantidad, precio_unitario)
    VALUES (v_pedido_id, v_item.variante_id, v_item.nombre_producto, v_item.talla, v_item.color_nombre, v_item.cantidad, v_item.precio_unitario);

    UPDATE public.variantes_producto SET stock = stock - v_item.cantidad WHERE id = v_item.variante_id;

    INSERT INTO public.movimientos_stock (variante_id, tipo, cantidad, pedido_id, creado_por)
    VALUES (v_item.variante_id, 'venta', -v_item.cantidad, v_pedido_id, v_usuario_id);
  END LOOP;

  -- NUEVO: el pago nace pendiente (antes nacía "pagado").
  INSERT INTO public.pagos (pedido_id, metodo, estado, monto)
  VALUES (v_pedido_id, p_metodo_pago, 'pendiente', v_total);

  DELETE FROM public.items_carrito WHERE carrito_id = v_carrito_id;

  RETURN QUERY SELECT v_numero, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_compra(text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text,text,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.validar_cupon(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validar_cupon(text) TO authenticated;
REVOKE ALL ON FUNCTION public.confirmar_compra(text,text,uuid,text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text,text,uuid,text,text,numeric) TO authenticated;
COMMENT ON COLUMN public.cupones.usos_maximos IS 'NULL: sin limite. Cada pedido creado consume un uso, aunque el pago quede pendiente o el pedido se cancele.';
COMMENT ON COLUMN public.cupones.usos_actuales IS 'Consumos de pedidos creados: solo confirmar_compra puede incrementarlos desde la API.';
NOTIFY pgrst, 'reload schema';
COMMIT;
