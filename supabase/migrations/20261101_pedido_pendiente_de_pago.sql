-- Pago con Mercado Pago + costo de envío por zona + tiempo límite de pago.

-- 1. Datos nuevos (no cambian nada de lo que ya existe).
--    · La dirección indica su zona de entrega (las de Delivery de Segundo).
--    · El pedido guarda el método de entrega exacto y lo que costó el envío.
ALTER TABLE public.direcciones
  ADD COLUMN zona_id uuid REFERENCES public.zonas_entrega(id);

ALTER TABLE public.pedidos
  ADD COLUMN metodo_entrega_id text REFERENCES public.metodos_entrega(id),
  ADD COLUMN costo_envio numeric(10,2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0);


-- 2. confirmar_compra. Hace lo mismo que antes, más (marcado con "NUEVO"):
--    · Tarjeta y Yape: el pedido nace "pendiente_pago" y el pago "pendiente";
--      el webhook de Mercado Pago lo confirma. Contra entrega: "preparado".
--    · No se puede comprar un producto inactivo.
--    · p_metodo_entrega_id ('estandar', 'express' o 'retiro'): si llega, el
--      envío se cobra con la tarifa de la zona de la dirección.
--      Es opcional SOLO mientras el checkout de Segundo no esté en main, para
--      no romper las apps que aún llaman con 3 datos. Al integrarlo, quitar
--      "DEFAULT NULL" de p_metodo_entrega_id para que sea obligatorio.
--    Cupones: se agregan cuando exista la tabla (ver auditoría).
DROP FUNCTION public.confirmar_compra(text, text, uuid);

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

REVOKE ALL ON FUNCTION public.confirmar_compra(text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, uuid, text) TO authenticated;


-- 3. Tiempo límite: un pedido que lleva más de 30 minutos sin pagarse se
--    cancela (el stock vuelve) y su pago queda "fallido".
--    La ejecuta Supabase cada 5 minutos; nadie más puede llamarla.
CREATE FUNCTION public.cancelar_pedidos_sin_pagar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pedido record;
BEGIN
  -- La tarea programada no tiene usuario: se identifica como el servidor,
  -- igual que el webhook, para que cambiar_estado_pedido la acepte.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  FOR v_pedido IN
    SELECT id, numero FROM public.pedidos
    WHERE estado = 'pendiente_pago' AND creado_en < now() - interval '30 minutes'
  LOOP
    PERFORM public.cambiar_estado_pedido(v_pedido.numero, 'cancelado');
    UPDATE public.pagos SET estado = 'fallido' WHERE pedido_id = v_pedido.id AND estado = 'pendiente';
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_pedidos_sin_pagar() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cancelar-pedidos-sin-pagar', '*/5 * * * *', 'SELECT public.cancelar_pedidos_sin_pagar()');


-- 4. El servidor (webhook y crear-pago) lee el pedido y actualiza su pago.
--    En este proyecto las tablas no dan permisos automáticamente al rol de servicio.
GRANT SELECT ON public.pedidos TO service_role;
GRANT SELECT, UPDATE ON public.pagos TO service_role;
