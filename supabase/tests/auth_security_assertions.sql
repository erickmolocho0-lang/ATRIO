DO $$
DECLARE
  tabla text;
  politica pg_policies;
  tablas_solo_admin text[] := ARRAY[
    'productos',
    'variantes_producto',
    'imagenes_producto',
    'movimientos_stock',
    'pedidos'
  ];
  tablas_datos_propios text[] := ARRAY[
    'pedidos',
    'direcciones',
    'carritos',
    'items_carrito',
    'favoritos',
    'items_pedido',
    'pagos'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_perfiles_evitar_cambio_rol'
      AND tgrelid = 'public.perfiles'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FALLO: falta el trigger que impide cambiar roles.';
  END IF;

  IF pg_get_functiondef('public.evitar_cambio_rol_no_autorizado()'::regprocedure)
      NOT LIKE '%ERRCODE = ''42501''%' THEN
    RAISE EXCEPTION 'FALLO: cambiar el rol no rechaza la operación.';
  END IF;

  IF pg_get_functiondef('public.crear_perfil_al_registrarse()'::regprocedure)
      NOT LIKE '%raw_user_meta_data ->> ''celular''%' THEN
    RAISE EXCEPTION 'FALLO: el trigger de registro no copia el celular.';
  END IF;

  FOREACH tabla IN ARRAY tablas_solo_admin LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class
      WHERE oid = format('public.%I', tabla)::regclass
        AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'FALLO: RLS no está habilitado para %.', tabla;
    END IF;

    FOR politica IN
      SELECT *
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tabla
        AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    LOOP
      IF COALESCE(politica.qual, '') NOT LIKE '%es_administrador()%'
        AND COALESCE(politica.with_check, '') NOT LIKE '%es_administrador()%' THEN
        RAISE EXCEPTION 'FALLO: la política % de % permite escritura sin comprobar administrador.',
          politica.policyname, tabla;
      END IF;
      IF NOT ('authenticated' = ANY(politica.roles)) THEN
        RAISE EXCEPTION 'FALLO: la política % de % no está limitada a usuarios autenticados.',
          politica.policyname, tabla;
      END IF;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tabla
        AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    ) THEN
      RAISE EXCEPTION 'FALLO: falta una política de escritura para %.', tabla;
    END IF;
  END LOOP;

  FOREACH tabla IN ARRAY tablas_datos_propios LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class
      WHERE oid = format('public.%I', tabla)::regclass
        AND relrowsecurity
    ) THEN
      RAISE EXCEPTION 'FALLO: RLS no está habilitado para %.', tabla;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tabla
        AND cmd = 'SELECT'
        AND COALESCE(qual, '') LIKE '%auth.uid()%'
    ) THEN
      RAISE EXCEPTION 'FALLO: no se encontró aislamiento por usuario para la lectura de %.', tabla;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pedidos'
      AND column_name = 'usuario_id'
      AND is_nullable <> 'YES'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pedidos'::regclass
      AND conname = 'pedidos_usuario_id_fkey'
      AND confdeltype = 'n'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pedidos'::regclass
      AND conname = 'pedidos_check'
      AND pg_get_constraintdef(oid) LIKE '%usuario_id IS NULL%'
      AND pg_get_constraintdef(oid) LIKE '%direccion_id IS NULL%'
  ) THEN
    RAISE EXCEPTION 'FALLO: los pedidos anonimizados con envío no se conservan al eliminar una cuenta.';
  END IF;

  RAISE NOTICE 'OK: proteccion de roles, escrituras administrativas, aislamiento de datos, trigger de celular y retencion anonimizada de pedidos.';
END;
$$;
