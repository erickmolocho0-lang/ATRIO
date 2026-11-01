-- ACTIVACION COMPLETA DEL CHECKOUT DE SEGUNDO.
-- Para el proyecto que YA tiene la migracion de Hans y TODAVIA NO tiene public.cupones.
-- Ejecutar todo el archivo una sola vez. No ejecutar de nuevo las migraciones historicas.
-- Una unica transaccion: si falla un paso, no se aplica ningun cambio del archivo.
-- Conserva al finalizar la funcion anterior de Hans y agrega la version con cupones.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.cupones') IS NOT NULL THEN
    RAISE EXCEPTION 'La tabla cupones ya existe. No repitas este instalador; revisa primero verificar_checkout_remoto.sql.';
  END IF;
END $$;
-- Migracion 20261102000000_checkout_segundo.sql
-- Requiere las migraciones de Hans, incluida 20261101_pedido_pendiente_de_pago.sql.
-- Definicion intermedia; la segunda parte conserva el contrato anterior de Hans antes del COMMIT.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='pedidos' AND column_name='costo_envio') THEN
    RAISE EXCEPTION 'Aplica primero la migracion de pedidos pendientes de pago de Hans.';
  END IF;
END $$;

ALTER TABLE public.direcciones
  ADD COLUMN destinatario text,
  ADD COLUMN telefono text;
ALTER TABLE public.pedidos
  ADD COLUMN cupon_codigo text,
  ADD COLUMN datos_entrega jsonb;

CREATE TABLE public.cupones (
  codigo text PRIMARY KEY CHECK (codigo ~ '^[A-Z0-9_-]{3,30}$'),
  porcentaje numeric(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  activo boolean NOT NULL DEFAULT false,
  minimo_compra numeric(10,2) NOT NULL DEFAULT 0 CHECK (minimo_compra >= 0),
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  CHECK (vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta > vigente_desde)
);
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
CREATE POLICY cupones_admin ON public.cupones TO authenticated
  USING (public.es_administrador()) WITH CHECK (public.es_administrador());
REVOKE ALL ON public.cupones FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cupones TO authenticated;

-- Bloquear el perfil serializa cambios de direcciones del mismo usuario.
-- Un error en el insert/update revierte tambien el cambio de predeterminada.
CREATE FUNCTION public.guardar_direccion_checkout(
  p_direccion text, p_zona_id uuid, p_destinatario text, p_telefono text,
  p_etiqueta text DEFAULT NULL, p_referencia text DEFAULT NULL,
  p_predeterminada boolean DEFAULT false, p_id uuid DEFAULT NULL
)
RETURNS SETOF public.direcciones LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_usuario uuid := auth.uid(); v_id uuid; v_predeterminada boolean; v_distrito text;
BEGIN
  IF v_usuario IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesion.'; END IF;
  PERFORM 1 FROM public.perfiles WHERE id=v_usuario FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontro tu perfil.'; END IF;
  IF length(btrim(coalesce(p_direccion,''))) NOT BETWEEN 5 AND 300
    OR length(btrim(coalesce(p_destinatario,''))) NOT BETWEEN 2 AND 100
    OR coalesce(p_telefono,'') !~ '^9[0-9]{8}$' THEN
    RAISE EXCEPTION 'Revisa la direccion, el destinatario y el celular peruano de 9 digitos.';
  END IF;
  SELECT distrito INTO v_distrito FROM public.zonas_entrega z
    WHERE z.id=p_zona_id AND z.activo AND EXISTS (
      SELECT 1 FROM public.tarifas_entrega t JOIN public.metodos_entrega m ON m.id=t.metodo_id
      WHERE t.zona_id=z.id AND m.activo AND m.tipo='envio');
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona una zona con cobertura disponible.'; END IF;
  IF p_id IS NOT NULL THEN
    SELECT predeterminada INTO v_predeterminada FROM public.direcciones
      WHERE id=p_id AND usuario_id=v_usuario FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La direccion no existe o no te pertenece.'; END IF;
  END IF;
  v_predeterminada := coalesce(p_predeterminada,false) OR coalesce(v_predeterminada,false)
    OR NOT EXISTS (SELECT 1 FROM public.direcciones WHERE usuario_id=v_usuario AND predeterminada);
  IF v_predeterminada THEN
    UPDATE public.direcciones SET predeterminada=false WHERE usuario_id=v_usuario AND id IS DISTINCT FROM p_id;
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.direcciones(usuario_id,etiqueta,direccion,distrito,referencia,predeterminada,zona_id,destinatario,telefono)
    VALUES(v_usuario,nullif(btrim(p_etiqueta),''),btrim(p_direccion),v_distrito,nullif(btrim(p_referencia),''),v_predeterminada,p_zona_id,btrim(p_destinatario),p_telefono)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.direcciones SET etiqueta=nullif(btrim(p_etiqueta),''),direccion=btrim(p_direccion),distrito=v_distrito,
      referencia=nullif(btrim(p_referencia),''),predeterminada=v_predeterminada,zona_id=p_zona_id,
      destinatario=btrim(p_destinatario),telefono=p_telefono WHERE id=p_id AND usuario_id=v_usuario
      RETURNING id INTO v_id;
  END IF;
  RETURN QUERY SELECT * FROM public.direcciones WHERE id=v_id;
END $$;
REVOKE ALL ON FUNCTION public.guardar_direccion_checkout(text,uuid,text,text,text,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guardar_direccion_checkout(text,uuid,text,text,text,text,boolean,uuid) TO authenticated;

CREATE FUNCTION public.validar_cupon(p_codigo text)
RETURNS TABLE(codigo text,porcentaje numeric,subtotal numeric,descuento numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cupon public.cupones%ROWTYPE; v_subtotal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesion para aplicar un cupon.'; END IF;
  SELECT * INTO v_cupon FROM public.cupones c WHERE c.codigo=upper(btrim(p_codigo)) AND c.activo
    AND (c.vigente_desde IS NULL OR c.vigente_desde<=now())
    AND (c.vigente_hasta IS NULL OR c.vigente_hasta>now()) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cupon no existe, esta inactivo o vencio.'; END IF;
  SELECT coalesce(sum(ic.cantidad*p.precio),0) INTO v_subtotal FROM public.carritos ca
    JOIN public.items_carrito ic ON ic.carrito_id=ca.id JOIN public.variantes_producto vp ON vp.id=ic.variante_id
    JOIN public.productos p ON p.id=vp.producto_id WHERE ca.usuario_id=auth.uid();
  IF v_subtotal<=0 OR v_subtotal<v_cupon.minimo_compra THEN
    RAISE EXCEPTION 'El carrito no alcanza el minimo de compra del cupon.';
  END IF;
  RETURN QUERY SELECT v_cupon.codigo,v_cupon.porcentaje,v_subtotal,round(v_subtotal*v_cupon.porcentaje/100,2);
END $$;
REVOKE ALL ON FUNCTION public.validar_cupon(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validar_cupon(text) TO authenticated;

CREATE FUNCTION public.cotizar_checkout(p_metodo_entrega_id text,p_direccion_id uuid DEFAULT NULL,p_codigo_cupon text DEFAULT NULL)
RETURNS TABLE(subtotal numeric,descuento numeric,costo_envio numeric,igv numeric,total numeric,cupon_codigo text,datos_entrega jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_metodo public.metodos_entrega%ROWTYPE; v_direccion public.direcciones%ROWTYPE;
  v_subtotal numeric; v_descuento numeric:=0; v_envio numeric:=0; v_total numeric; v_codigo text; v_zona text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesion para comprar.'; END IF;
  SELECT * INTO v_metodo FROM public.metodos_entrega WHERE id=p_metodo_entrega_id AND activo FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona un metodo de entrega disponible.'; END IF;
  IF v_metodo.tipo='envio' THEN
    SELECT * INTO v_direccion FROM public.direcciones WHERE id=p_direccion_id AND usuario_id=auth.uid() FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La direccion no existe o no te pertenece.'; END IF;
    IF length(btrim(coalesce(v_direccion.destinatario,'')))<2 OR coalesce(v_direccion.telefono,'') !~ '^9[0-9]{8}$' THEN
      RAISE EXCEPTION 'Completa el destinatario y celular de la direccion de envio.';
    END IF;
    SELECT t.costo,z.nombre INTO v_envio,v_zona FROM public.tarifas_entrega t
      JOIN public.zonas_entrega z ON z.id=t.zona_id
      WHERE t.zona_id=v_direccion.zona_id AND t.metodo_id=v_metodo.id AND z.activo FOR SHARE OF t,z;
    IF NOT FOUND THEN RAISE EXCEPTION 'No hay envio disponible a esa zona con este metodo.'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.carritos ca JOIN public.items_carrito ic ON ic.carrito_id=ca.id
    JOIN public.variantes_producto vp ON vp.id=ic.variante_id JOIN public.productos p ON p.id=vp.producto_id
    WHERE ca.usuario_id=auth.uid() AND (NOT p.activo OR ic.cantidad>vp.stock OR ic.cantidad NOT BETWEEN 1 AND 20)) THEN
    RAISE EXCEPTION 'Hay productos inactivos, cantidades invalidas o stock insuficiente en tu carrito.';
  END IF;
  SELECT coalesce(sum(ic.cantidad*p.precio),0) INTO v_subtotal FROM public.carritos ca
    JOIN public.items_carrito ic ON ic.carrito_id=ca.id JOIN public.variantes_producto vp ON vp.id=ic.variante_id
    JOIN public.productos p ON p.id=vp.producto_id WHERE ca.usuario_id=auth.uid();
  IF NOT EXISTS(SELECT 1 FROM public.items_carrito ic JOIN public.carritos ca ON ca.id=ic.carrito_id WHERE ca.usuario_id=auth.uid()) THEN
    RAISE EXCEPTION 'Tu carrito esta vacio.';
  END IF;
  IF nullif(btrim(p_codigo_cupon),'') IS NOT NULL THEN
    SELECT c.descuento,c.codigo INTO v_descuento,v_codigo FROM public.validar_cupon(p_codigo_cupon) c;
  END IF;
  v_total:=v_subtotal-v_descuento+v_envio;
  RETURN QUERY SELECT v_subtotal,v_descuento,v_envio,round(v_total-v_total/1.18,2),v_total,v_codigo,
    jsonb_build_object('metodo',jsonb_build_object('id',v_metodo.id,'nombre',v_metodo.nombre,'tipo',v_metodo.tipo,
      'descripcion',v_metodo.descripcion,'horario',v_metodo.horario,'costo',v_envio),
      'direccion',CASE WHEN v_metodo.tipo='envio' THEN to_jsonb(v_direccion)||jsonb_build_object('zonaNombre',v_zona) ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.cotizar_checkout(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cotizar_checkout(text,uuid,text) TO authenticated;

DROP FUNCTION public.confirmar_compra(text,text,uuid,text);
CREATE FUNCTION public.confirmar_compra(
  p_metodo_pago text,
  p_tipo_entrega text,
  p_direccion_id uuid DEFAULT NULL,
  p_metodo_entrega_id text DEFAULT NULL,
  p_codigo_cupon text DEFAULT NULL,
  p_total_esperado numeric DEFAULT NULL
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
REVOKE ALL ON FUNCTION public.confirmar_compra(text,text,uuid,text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text,text,uuid,text,text,numeric) TO authenticated;
-- Conservar la eliminacion de cuenta de Alexander: no retener el destinatario historico al anonimizar.
CREATE FUNCTION public.anonimizar_entrega_al_eliminar_cuenta()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.usuario_id IS NULL AND OLD.usuario_id IS NOT NULL THEN
    NEW.datos_entrega := jsonb_set(NEW.datos_entrega,'{direccion}','null'::jsonb);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER anonimizar_entrega_checkout BEFORE UPDATE OF usuario_id ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.anonimizar_entrega_al_eliminar_cuenta();
NOTIFY pgrst, 'reload schema';

-- Migracion 20261103000000_limites_cupones_y_direccion_unica.sql
-- Complementa 20261102000000 sin reescribir la migracion ya publicada.

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
