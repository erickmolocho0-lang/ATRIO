--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: confirmar_compra(text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirmar_compra(p_metodo_pago text, p_tipo_entrega text, p_direccion_id uuid DEFAULT NULL::uuid) RETURNS TABLE(numero text, total numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_carrito_id uuid;
  v_pedido_id uuid;
  v_numero text;
  v_subtotal numeric := 0;
  v_descuento numeric := 0; -- los cupones no están conectados todavía (ver auditoría)
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
    PERFORM 1 FROM public.direcciones WHERE id = p_direccion_id AND usuario_id = v_usuario_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La dirección no existe o no te pertenece.';
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
    SELECT ic.variante_id, ic.cantidad, vp.stock
    FROM public.items_carrito ic
    JOIN public.variantes_producto vp ON vp.id = ic.variante_id
    WHERE ic.carrito_id = v_carrito_id
    FOR UPDATE OF vp
  LOOP
    IF v_item.stock < v_item.cantidad THEN
      RAISE EXCEPTION 'Ya no hay stock suficiente para una de las prendas del carrito.';
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(p.precio * ic.cantidad), 0) INTO v_subtotal
  FROM public.items_carrito ic
  JOIN public.variantes_producto vp ON vp.id = ic.variante_id
  JOIN public.productos p ON p.id = vp.producto_id
  WHERE ic.carrito_id = v_carrito_id;

  v_total := v_subtotal - v_descuento;
  v_igv := round(v_total - (v_total / 1.18), 2);
  v_numero := 'ATR-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0');

  INSERT INTO public.pedidos (usuario_id, numero, estado, tipo_entrega, direccion_id, subtotal, descuento, igv, total)
  VALUES (v_usuario_id, v_numero, 'preparado', p_tipo_entrega, p_direccion_id, v_subtotal, v_descuento, v_igv, v_total)
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

  -- FIX: 'pagado' en vez de 'confirmado' (ese valor no existe en el CHECK real).
  INSERT INTO public.pagos (pedido_id, metodo, estado, monto)
  VALUES (v_pedido_id, p_metodo_pago, 'pagado', v_total);

  DELETE FROM public.items_carrito WHERE carrito_id = v_carrito_id;

  RETURN QUERY SELECT v_numero, v_total;
END;
$$;


--
-- Name: crear_perfil_al_registrarse(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_perfil_al_registrarse() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', 'Cliente ATRIO'),
    'cliente'
  );
  return new;
end;
$$;


--
-- Name: es_administrador(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_administrador() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'administrador'
  );
$$;


--
-- Name: evitar_cambio_rol_no_autorizado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.evitar_cambio_rol_no_autorizado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.rol is distinct from old.rol and not public.es_administrador() then
    new.rol := old.rol;
  end if;
  return new;
end;
$$;


--
-- Name: guardar_zona_entrega(text, text, text, text, text, boolean, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guardar_zona_entrega(p_nombre text, p_distrito text, p_provincia text, p_departamento text, p_maps_url text, p_activo boolean, p_tarifas jsonb, p_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador de la tienda puede guardar estos cambios.' USING ERRCODE = '42501';
  END IF;
  IF p_tarifas IS NULL OR jsonb_typeof(p_tarifas) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Las tarifas deben ser una lista.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_tarifas) > 2 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_tarifas) e
    WHERE jsonb_typeof(e) IS DISTINCT FROM 'object'
       OR jsonb_typeof(e->'metodo_id') IS DISTINCT FROM 'string'
       OR e->>'metodo_id' NOT IN ('estandar', 'express')
       OR jsonb_typeof(e->'costo') IS DISTINCT FROM 'number'
  ) THEN
    RAISE EXCEPTION 'Revisa las modalidades y sus importes.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) <> count(DISTINCT e->>'metodo_id') FROM jsonb_array_elements(p_tarifas) e) THEN
    RAISE EXCEPTION 'No repitas una modalidad en la misma zona.' USING ERRCODE = '22023';
  END IF;
  IF p_activo AND jsonb_array_length(p_tarifas) = 0 THEN
    RAISE EXCEPTION 'Configura al menos una tarifa antes de activar la zona.' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.zonas_entrega(nombre, distrito, provincia, departamento, maps_url, activo)
    VALUES (btrim(p_nombre), btrim(p_distrito), btrim(p_provincia), btrim(p_departamento), btrim(p_maps_url), p_activo)
    RETURNING id INTO v_id;
  ELSE
    -- El UPDATE serializa ediciones simultaneas de una misma zona.
    UPDATE public.zonas_entrega
    SET nombre = btrim(p_nombre), distrito = btrim(p_distrito), provincia = btrim(p_provincia),
        departamento = btrim(p_departamento), maps_url = btrim(p_maps_url), activo = p_activo
    WHERE id = p_id RETURNING id INTO v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La zona no existe o no tienes acceso a ella.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.tarifas_entrega WHERE zona_id = v_id;
  INSERT INTO public.tarifas_entrega(zona_id, metodo_id, costo)
  SELECT v_id, e->>'metodo_id', (e->>'costo')::numeric
  FROM jsonb_array_elements(p_tarifas) e;
  RETURN v_id;
END;
$$;


--
-- Name: obtener_cobertura_entrega(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_cobertura_entrega() RETURNS TABLE(zona_id uuid, zona text, distrito text, provincia text, departamento text, maps_url text, metodo_id text, metodo_nombre text, costo numeric, plazo text, horario text)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  SELECT z.id, z.nombre, z.distrito, z.provincia, z.departamento, z.maps_url,
         m.id, m.nombre, t.costo, m.descripcion, m.horario
  FROM public.tarifas_entrega t
  JOIN public.zonas_entrega z ON z.id = t.zona_id
  JOIN public.metodos_entrega m ON m.id = t.metodo_id
  WHERE z.activo AND m.activo AND m.tipo = 'envio'
  ORDER BY z.departamento, z.provincia, z.distrito, z.nombre, m.id;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: campanas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campanas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etiqueta text NOT NULL,
    titulo text NOT NULL,
    texto_boton text NOT NULL,
    categoria_destino text NOT NULL,
    imagen_url text,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: carritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carritos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id text NOT NULL,
    nombre text NOT NULL,
    subcategorias text[] DEFAULT '{}'::text[] NOT NULL,
    imagen_url text
);


--
-- Name: colores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colores (
    id text NOT NULL,
    nombre text NOT NULL,
    hex text NOT NULL
);


--
-- Name: direcciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direcciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    etiqueta text,
    direccion text NOT NULL,
    distrito text,
    referencia text,
    predeterminada boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favoritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favoritos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    producto_id text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: imagenes_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imagenes_producto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id text NOT NULL,
    url text NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: items_carrito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items_carrito (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrito_id uuid NOT NULL,
    variante_id uuid NOT NULL,
    cantidad integer NOT NULL,
    CONSTRAINT items_carrito_cantidad_check CHECK ((cantidad > 0))
);


--
-- Name: items_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items_pedido (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    variante_id uuid NOT NULL,
    nombre_producto text NOT NULL,
    talla text NOT NULL,
    color_nombre text NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) GENERATED ALWAYS AS ((precio_unitario * (cantidad)::numeric)) STORED,
    CONSTRAINT items_pedido_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT items_pedido_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: metodos_entrega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_entrega (
    id text NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    horario text DEFAULT ''::text NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT metodos_entrega_check CHECK (((id = 'retiro'::text) = (tipo = 'retiro'::text))),
    CONSTRAINT metodos_entrega_check1 CHECK (((NOT activo) OR ((length(btrim(descripcion)) > 0) AND (length(btrim(horario)) > 0)))),
    CONSTRAINT metodos_entrega_descripcion_check CHECK ((length(descripcion) <= 300)),
    CONSTRAINT metodos_entrega_horario_check CHECK ((length(horario) <= 300)),
    CONSTRAINT metodos_entrega_id_check CHECK ((id = ANY (ARRAY['estandar'::text, 'express'::text, 'retiro'::text]))),
    CONSTRAINT metodos_entrega_nombre_check CHECK (((length(btrim(nombre)) >= 1) AND (length(btrim(nombre)) <= 80))),
    CONSTRAINT metodos_entrega_tipo_check CHECK ((tipo = ANY (ARRAY['envio'::text, 'retiro'::text])))
);


--
-- Name: COLUMN metodos_entrega.horario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.metodos_entrega.horario IS 'Horario informativo: no bloquea automaticamente pedidos por dia u hora.';


--
-- Name: movimientos_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variante_id uuid NOT NULL,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    pedido_id uuid,
    motivo text,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_stock_check CHECK ((((tipo = ANY (ARRAY['venta'::text, 'devolucion'::text])) AND (pedido_id IS NOT NULL)) OR (tipo = ANY (ARRAY['ingreso'::text, 'ajuste'::text])))),
    CONSTRAINT movimientos_stock_check1 CHECK ((((tipo = 'venta'::text) AND (cantidad < 0)) OR ((tipo = ANY (ARRAY['ingreso'::text, 'devolucion'::text])) AND (cantidad > 0)) OR (tipo = 'ajuste'::text))),
    CONSTRAINT movimientos_stock_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'venta'::text, 'ajuste'::text, 'devolucion'::text])))
);


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    metodo text NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    monto numeric(10,2) NOT NULL,
    referencia_externa text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pagos_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'fallido'::text, 'reembolsado'::text]))),
    CONSTRAINT pagos_metodo_check CHECK ((metodo = ANY (ARRAY['tarjeta'::text, 'yape'::text, 'plin'::text, 'paypal'::text, 'contra_entrega'::text]))),
    CONSTRAINT pagos_monto_check CHECK ((monto >= (0)::numeric))
);


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    numero text NOT NULL,
    estado text DEFAULT 'preparado'::text NOT NULL,
    tipo_entrega text NOT NULL,
    direccion_id uuid,
    subtotal numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    igv numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pedidos_check CHECK ((((tipo_entrega = 'envio'::text) AND (direccion_id IS NOT NULL)) OR (tipo_entrega = 'retiro'::text))),
    CONSTRAINT pedidos_descuento_check CHECK ((descuento >= (0)::numeric)),
    CONSTRAINT pedidos_estado_check CHECK ((estado = ANY (ARRAY['preparado'::text, 'en_camino'::text, 'entregado'::text, 'cancelado'::text, 'devuelto'::text]))),
    CONSTRAINT pedidos_igv_check CHECK ((igv >= (0)::numeric)),
    CONSTRAINT pedidos_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT pedidos_tipo_entrega_check CHECK ((tipo_entrega = ANY (ARRAY['envio'::text, 'retiro'::text]))),
    CONSTRAINT pedidos_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: pedidos_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: perfiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfiles (
    id uuid NOT NULL,
    nombre text NOT NULL,
    telefono text,
    rol text DEFAULT 'cliente'::text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT perfiles_rol_check CHECK ((rol = ANY (ARRAY['cliente'::text, 'administrador'::text])))
);


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id text NOT NULL,
    sku text NOT NULL,
    nombre text NOT NULL,
    categoria_id text NOT NULL,
    precio numeric(10,2) NOT NULL,
    precio_anterior numeric(10,2),
    descripcion text NOT NULL,
    composicion text,
    confeccion text,
    origen text,
    etiquetas text[] DEFAULT '{}'::text[] NOT NULL,
    es_novedad boolean DEFAULT false NOT NULL,
    popularidad_30d integer DEFAULT 0 NOT NULL,
    fecha_alta date DEFAULT CURRENT_DATE NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT productos_precio_anterior_check CHECK ((precio_anterior >= (0)::numeric)),
    CONSTRAINT productos_precio_check CHECK ((precio >= (0)::numeric))
);


--
-- Name: tarifas_entrega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarifas_entrega (
    zona_id uuid NOT NULL,
    metodo_id text NOT NULL,
    costo numeric NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tarifas_entrega_costo_check CHECK (((costo >= (0)::numeric) AND (costo <= 99999999.99) AND (costo = round(costo, 2)))),
    CONSTRAINT tarifas_entrega_metodo_id_check CHECK ((metodo_id = ANY (ARRAY['estandar'::text, 'express'::text])))
);


--
-- Name: COLUMN tarifas_entrega.costo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tarifas_entrega.costo IS 'Importe en soles. Cero es envio gratuito; sin fila no se ofrece la modalidad en la zona.';


--
-- Name: variantes_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variantes_producto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id text NOT NULL,
    talla text NOT NULL,
    color_id text NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    CONSTRAINT variantes_producto_stock_check CHECK ((stock >= 0))
);


--
-- Name: zonas_entrega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zonas_entrega (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    distrito text DEFAULT ''::text NOT NULL,
    provincia text DEFAULT ''::text NOT NULL,
    departamento text DEFAULT ''::text NOT NULL,
    maps_url text DEFAULT ''::text NOT NULL,
    activo boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT zonas_entrega_check CHECK (((NOT activo) OR ((length(btrim(distrito)) > 0) AND (length(btrim(provincia)) > 0) AND (length(btrim(departamento)) > 0)))),
    CONSTRAINT zonas_entrega_departamento_check CHECK ((length(departamento) <= 100)),
    CONSTRAINT zonas_entrega_distrito_check CHECK ((length(distrito) <= 100)),
    CONSTRAINT zonas_entrega_maps_url_check CHECK (((length(maps_url) <= 2000) AND ((maps_url = ''::text) OR (maps_url ~* '^https://(maps[.]app[.]goo[.]gl/|www[.]google[.]com/maps/|maps[.]google[.]com/)'::text)))),
    CONSTRAINT zonas_entrega_nombre_check CHECK (((length(btrim(nombre)) >= 1) AND (length(btrim(nombre)) <= 100))),
    CONSTRAINT zonas_entrega_provincia_check CHECK ((length(provincia) <= 100))
);


--
-- Name: TABLE zonas_entrega; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zonas_entrega IS 'Localidades o sectores de reparto; varias zonas pueden pertenecer al mismo distrito.';


--
-- Name: campanas campanas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campanas
    ADD CONSTRAINT campanas_pkey PRIMARY KEY (id);


--
-- Name: carritos carritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_pkey PRIMARY KEY (id);


--
-- Name: carritos carritos_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_usuario_id_key UNIQUE (usuario_id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: colores colores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colores
    ADD CONSTRAINT colores_pkey PRIMARY KEY (id);


--
-- Name: direcciones direcciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT direcciones_pkey PRIMARY KEY (id);


--
-- Name: favoritos favoritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_pkey PRIMARY KEY (id);


--
-- Name: favoritos favoritos_usuario_id_producto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_usuario_id_producto_id_key UNIQUE (usuario_id, producto_id);


--
-- Name: imagenes_producto imagenes_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes_producto
    ADD CONSTRAINT imagenes_producto_pkey PRIMARY KEY (id);


--
-- Name: items_carrito items_carrito_carrito_id_variante_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_carrito
    ADD CONSTRAINT items_carrito_carrito_id_variante_id_key UNIQUE (carrito_id, variante_id);


--
-- Name: items_carrito items_carrito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_carrito
    ADD CONSTRAINT items_carrito_pkey PRIMARY KEY (id);


--
-- Name: items_pedido items_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_pedido
    ADD CONSTRAINT items_pedido_pkey PRIMARY KEY (id);


--
-- Name: metodos_entrega metodos_entrega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_entrega
    ADD CONSTRAINT metodos_entrega_pkey PRIMARY KEY (id);


--
-- Name: movimientos_stock movimientos_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pedido_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pedido_id_key UNIQUE (pedido_id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_numero_key UNIQUE (numero);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: perfiles perfiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_sku_key UNIQUE (sku);


--
-- Name: tarifas_entrega tarifas_entrega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifas_entrega
    ADD CONSTRAINT tarifas_entrega_pkey PRIMARY KEY (zona_id, metodo_id);


--
-- Name: variantes_producto variantes_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_pkey PRIMARY KEY (id);


--
-- Name: variantes_producto variantes_producto_producto_id_talla_color_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_producto_id_talla_color_id_key UNIQUE (producto_id, talla, color_id);


--
-- Name: zonas_entrega zonas_entrega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas_entrega
    ADD CONSTRAINT zonas_entrega_pkey PRIMARY KEY (id);


--
-- Name: idx_items_pedido_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_pedido_pedido_id ON public.items_pedido USING btree (pedido_id);


--
-- Name: idx_movimientos_stock_variante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_stock_variante_id ON public.movimientos_stock USING btree (variante_id);


--
-- Name: idx_pedidos_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_usuario_id ON public.pedidos USING btree (usuario_id);


--
-- Name: idx_productos_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_categoria_id ON public.productos USING btree (categoria_id);


--
-- Name: idx_variantes_producto_color_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variantes_producto_color_id ON public.variantes_producto USING btree (color_id);


--
-- Name: tarifas_entrega_metodo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tarifas_entrega_metodo_idx ON public.tarifas_entrega USING btree (metodo_id);


--
-- Name: zonas_entrega_ubicacion_unica; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX zonas_entrega_ubicacion_unica ON public.zonas_entrega USING btree (lower(btrim(departamento)), lower(btrim(provincia)), lower(btrim(distrito)), lower(btrim(nombre)));


--
-- Name: perfiles trg_perfiles_evitar_cambio_rol; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_perfiles_evitar_cambio_rol BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.evitar_cambio_rol_no_autorizado();


--
-- Name: carritos carritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: direcciones direcciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT direcciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: favoritos favoritos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: favoritos favoritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: imagenes_producto imagenes_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes_producto
    ADD CONSTRAINT imagenes_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: items_carrito items_carrito_carrito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_carrito
    ADD CONSTRAINT items_carrito_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carritos(id) ON DELETE CASCADE;


--
-- Name: items_carrito items_carrito_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_carrito
    ADD CONSTRAINT items_carrito_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id) ON DELETE CASCADE;


--
-- Name: items_pedido items_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_pedido
    ADD CONSTRAINT items_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: items_pedido items_pedido_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items_pedido
    ADD CONSTRAINT items_pedido_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id) ON DELETE RESTRICT;


--
-- Name: movimientos_stock movimientos_stock_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT movimientos_stock_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: movimientos_stock movimientos_stock_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT movimientos_stock_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE SET NULL;


--
-- Name: movimientos_stock movimientos_stock_variante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_stock
    ADD CONSTRAINT movimientos_stock_variante_id_fkey FOREIGN KEY (variante_id) REFERENCES public.variantes_producto(id) ON DELETE RESTRICT;


--
-- Name: pagos pagos_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_direccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_direccion_id_fkey FOREIGN KEY (direccion_id) REFERENCES public.direcciones(id) ON DELETE SET NULL;


--
-- Name: pedidos pedidos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: perfiles perfiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfiles
    ADD CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE RESTRICT;


--
-- Name: tarifas_entrega tarifas_entrega_metodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifas_entrega
    ADD CONSTRAINT tarifas_entrega_metodo_id_fkey FOREIGN KEY (metodo_id) REFERENCES public.metodos_entrega(id) ON DELETE RESTRICT;


--
-- Name: tarifas_entrega tarifas_entrega_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifas_entrega
    ADD CONSTRAINT tarifas_entrega_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas_entrega(id) ON DELETE RESTRICT;


--
-- Name: variantes_producto variantes_producto_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colores(id) ON DELETE RESTRICT;


--
-- Name: variantes_producto variantes_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variantes_producto
    ADD CONSTRAINT variantes_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: campanas Administradores gestionan campañas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Administradores gestionan campañas" ON public.campanas TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'administrador'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = auth.uid()) AND (perfiles.rol = 'administrador'::text)))));


--
-- Name: campanas Cualquiera puede leer campañas activas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cualquiera puede leer campañas activas" ON public.campanas FOR SELECT TO authenticated, anon USING ((activa = true));


--
-- Name: metodos_entrega admin_metodos_entrega; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_metodos_entrega ON public.metodos_entrega TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text)))));


--
-- Name: tarifas_entrega admin_tarifas_entrega; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_tarifas_entrega ON public.tarifas_entrega TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text)))));


--
-- Name: zonas_entrega admin_zonas_entrega; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_zonas_entrega ON public.zonas_entrega TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.perfiles
  WHERE ((perfiles.id = ( SELECT auth.uid() AS uid)) AND (perfiles.rol = 'administrador'::text)))));


--
-- Name: campanas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campanas ENABLE ROW LEVEL SECURITY;

--
-- Name: carritos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carritos ENABLE ROW LEVEL SECURITY;

--
-- Name: carritos carritos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carritos_delete ON public.carritos FOR DELETE USING ((usuario_id = auth.uid()));


--
-- Name: carritos carritos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carritos_insert ON public.carritos FOR INSERT WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: carritos carritos_propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carritos_propios ON public.carritos TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: carritos carritos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carritos_select ON public.carritos FOR SELECT USING ((usuario_id = auth.uid()));


--
-- Name: carritos carritos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY carritos_update ON public.carritos FOR UPDATE USING ((usuario_id = auth.uid()));


--
-- Name: categorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias categorias_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_escritura_admin ON public.categorias USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: categorias categorias_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_lectura_publica ON public.categorias FOR SELECT USING (true);


--
-- Name: colores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.colores ENABLE ROW LEVEL SECURITY;

--
-- Name: colores colores_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY colores_escritura_admin ON public.colores USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: colores colores_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY colores_lectura_publica ON public.colores FOR SELECT USING (true);


--
-- Name: direcciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direcciones ENABLE ROW LEVEL SECURITY;

--
-- Name: direcciones direcciones_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_admin_select ON public.direcciones FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: direcciones direcciones_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_delete ON public.direcciones FOR DELETE USING ((usuario_id = auth.uid()));


--
-- Name: direcciones direcciones_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_insert ON public.direcciones FOR INSERT WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: direcciones direcciones_propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_propias ON public.direcciones TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: direcciones direcciones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_select ON public.direcciones FOR SELECT USING ((usuario_id = auth.uid()));


--
-- Name: direcciones direcciones_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY direcciones_update ON public.direcciones FOR UPDATE USING ((usuario_id = auth.uid()));


--
-- Name: favoritos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

--
-- Name: favoritos favoritos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_delete ON public.favoritos FOR DELETE USING ((usuario_id = auth.uid()));


--
-- Name: favoritos favoritos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_insert ON public.favoritos FOR INSERT WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: favoritos favoritos_propios_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_propios_delete ON public.favoritos FOR DELETE TO authenticated USING ((usuario_id = auth.uid()));


--
-- Name: favoritos favoritos_propios_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_propios_insert ON public.favoritos FOR INSERT TO authenticated WITH CHECK ((usuario_id = auth.uid()));


--
-- Name: favoritos favoritos_propios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_propios_select ON public.favoritos FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));


--
-- Name: favoritos favoritos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favoritos_select ON public.favoritos FOR SELECT USING ((usuario_id = auth.uid()));


--
-- Name: imagenes_producto imagenes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imagenes_admin_write ON public.imagenes_producto TO authenticated USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: imagenes_producto imagenes_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imagenes_escritura_admin ON public.imagenes_producto USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: imagenes_producto imagenes_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imagenes_lectura_publica ON public.imagenes_producto FOR SELECT USING (true);


--
-- Name: imagenes_producto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.imagenes_producto ENABLE ROW LEVEL SECURITY;

--
-- Name: items_carrito; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items_carrito ENABLE ROW LEVEL SECURITY;

--
-- Name: items_carrito items_carrito_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_carrito_delete ON public.items_carrito FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.carritos c
  WHERE ((c.id = items_carrito.carrito_id) AND (c.usuario_id = auth.uid())))));


--
-- Name: items_carrito items_carrito_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_carrito_insert ON public.items_carrito FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carritos c
  WHERE ((c.id = items_carrito.carrito_id) AND (c.usuario_id = auth.uid())))));


--
-- Name: items_carrito items_carrito_propios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_carrito_propios ON public.items_carrito TO authenticated USING ((carrito_id IN ( SELECT carritos.id
   FROM public.carritos
  WHERE (carritos.usuario_id = auth.uid())))) WITH CHECK ((carrito_id IN ( SELECT carritos.id
   FROM public.carritos
  WHERE (carritos.usuario_id = auth.uid()))));


--
-- Name: items_carrito items_carrito_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_carrito_select ON public.items_carrito FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.carritos c
  WHERE ((c.id = items_carrito.carrito_id) AND (c.usuario_id = auth.uid())))));


--
-- Name: items_carrito items_carrito_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_carrito_update ON public.items_carrito FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.carritos c
  WHERE ((c.id = items_carrito.carrito_id) AND (c.usuario_id = auth.uid())))));


--
-- Name: items_pedido; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.items_pedido ENABLE ROW LEVEL SECURITY;

--
-- Name: items_pedido items_pedido_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_pedido_admin_select ON public.items_pedido FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: items_pedido items_pedido_propios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_pedido_propios_select ON public.items_pedido FOR SELECT TO authenticated USING ((pedido_id IN ( SELECT pedidos.id
   FROM public.pedidos
  WHERE (pedidos.usuario_id = auth.uid()))));


--
-- Name: items_pedido items_pedido_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY items_pedido_select ON public.items_pedido FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = items_pedido.pedido_id) AND ((p.usuario_id = auth.uid()) OR public.es_administrador())))));


--
-- Name: categorias lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lectura_publica ON public.categorias FOR SELECT TO authenticated, anon USING (true);


--
-- Name: colores lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lectura_publica ON public.colores FOR SELECT TO authenticated, anon USING (true);


--
-- Name: imagenes_producto lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lectura_publica ON public.imagenes_producto FOR SELECT TO authenticated, anon USING (true);


--
-- Name: productos lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lectura_publica ON public.productos FOR SELECT TO authenticated, anon USING (true);


--
-- Name: variantes_producto lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lectura_publica ON public.variantes_producto FOR SELECT TO authenticated, anon USING (true);


--
-- Name: metodos_entrega; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.metodos_entrega ENABLE ROW LEVEL SECURITY;

--
-- Name: metodos_entrega metodos_entrega_lectura_activos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY metodos_entrega_lectura_activos ON public.metodos_entrega FOR SELECT TO authenticated, anon USING (activo);


--
-- Name: movimientos_stock; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

--
-- Name: movimientos_stock movimientos_stock_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_stock_admin_insert ON public.movimientos_stock FOR INSERT TO authenticated WITH CHECK (public.es_administrador());


--
-- Name: movimientos_stock movimientos_stock_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_stock_admin_select ON public.movimientos_stock FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: movimientos_stock movimientos_stock_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_stock_insert_admin ON public.movimientos_stock FOR INSERT WITH CHECK (public.es_administrador());


--
-- Name: movimientos_stock movimientos_stock_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY movimientos_stock_select_admin ON public.movimientos_stock FOR SELECT USING (public.es_administrador());


--
-- Name: pagos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

--
-- Name: pagos pagos_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pagos_admin_select ON public.pagos FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: pagos pagos_propios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pagos_propios_select ON public.pagos FOR SELECT TO authenticated USING ((pedido_id IN ( SELECT pedidos.id
   FROM public.pedidos
  WHERE (pedidos.usuario_id = auth.uid()))));


--
-- Name: pagos pagos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pagos_select ON public.pagos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pagos.pedido_id) AND ((p.usuario_id = auth.uid()) OR public.es_administrador())))));


--
-- Name: pedidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos pedidos_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_admin_select ON public.pedidos FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: pedidos pedidos_admin_update_estado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_admin_update_estado ON public.pedidos FOR UPDATE TO authenticated USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: pedidos pedidos_propios_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_propios_select ON public.pedidos FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));


--
-- Name: pedidos pedidos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_select ON public.pedidos FOR SELECT USING (((usuario_id = auth.uid()) OR public.es_administrador()));


--
-- Name: pedidos pedidos_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pedidos_update_admin ON public.pedidos FOR UPDATE USING (public.es_administrador());


--
-- Name: perfiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

--
-- Name: perfiles perfiles_actualizacion_propia_o_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_actualizacion_propia_o_admin ON public.perfiles FOR UPDATE USING (((id = auth.uid()) OR public.es_administrador()));


--
-- Name: perfiles perfiles_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_admin_select ON public.perfiles FOR SELECT TO authenticated USING (public.es_administrador());


--
-- Name: perfiles perfiles_lectura_propia_o_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_lectura_propia_o_admin ON public.perfiles FOR SELECT USING (((id = auth.uid()) OR public.es_administrador()));


--
-- Name: perfiles perfiles_propio_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perfiles_propio_select ON public.perfiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: productos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

--
-- Name: productos productos_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_admin_write ON public.productos TO authenticated USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: productos productos_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_escritura_admin ON public.productos USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: productos productos_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY productos_lectura_publica ON public.productos FOR SELECT USING (true);


--
-- Name: tarifas_entrega; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tarifas_entrega ENABLE ROW LEVEL SECURITY;

--
-- Name: tarifas_entrega tarifas_entrega_lectura_activas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tarifas_entrega_lectura_activas ON public.tarifas_entrega FOR SELECT TO authenticated, anon USING (((EXISTS ( SELECT 1
   FROM public.zonas_entrega z
  WHERE ((z.id = tarifas_entrega.zona_id) AND z.activo))) AND (EXISTS ( SELECT 1
   FROM public.metodos_entrega m
  WHERE ((m.id = tarifas_entrega.metodo_id) AND m.activo)))));


--
-- Name: variantes_producto variantes_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_admin_write ON public.variantes_producto TO authenticated USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: variantes_producto variantes_escritura_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_escritura_admin ON public.variantes_producto USING (public.es_administrador()) WITH CHECK (public.es_administrador());


--
-- Name: variantes_producto variantes_lectura_publica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variantes_lectura_publica ON public.variantes_producto FOR SELECT USING (true);


--
-- Name: variantes_producto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.variantes_producto ENABLE ROW LEVEL SECURITY;

--
-- Name: zonas_entrega; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zonas_entrega ENABLE ROW LEVEL SECURITY;

--
-- Name: zonas_entrega zonas_entrega_lectura_activas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zonas_entrega_lectura_activas ON public.zonas_entrega FOR SELECT TO authenticated, anon USING (activo);


--
-- PostgreSQL database dump complete
--

CREATE TRIGGER trg_crear_perfil_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_perfil_al_registrarse();
