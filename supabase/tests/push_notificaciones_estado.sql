DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispositivos_push') THEN
    RAISE EXCEPTION 'FALLO: falta la tabla dispositivos_push.';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.dispositivos_push'::regclass) THEN
    RAISE EXCEPTION 'FALLO: dispositivos_push debe tener RLS activado.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dispositivos_push') THEN
    RAISE EXCEPTION 'FALLO: dispositivos_push no debe tener políticas (solo se usa por funciones).';
  END IF;

  IF has_table_privilege('authenticated', 'public.dispositivos_push', 'SELECT') THEN
    RAISE EXCEPTION 'FALLO: authenticated no debe poder leer dispositivos_push directamente.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.registrar_dispositivo_push(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALLO: authenticated debe poder registrar su dispositivo.';
  END IF;

  IF has_function_privilege('anon', 'public.registrar_dispositivo_push(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALLO: anon no debe poder registrar dispositivos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_historial_estados_notificar'
      AND tgrelid = 'public.historial_estados_pedido'::regclass
  ) THEN
    RAISE EXCEPTION 'FALLO: falta el trigger que avisa los cambios de estado.';
  END IF;
END $$;
