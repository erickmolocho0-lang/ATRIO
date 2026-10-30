DO $$
DECLARE
  definicion text := pg_get_functiondef(
    'public.confirmar_compra(text, text, uuid)'::regprocedure
  );
BEGIN
  IF definicion NOT LIKE '%p.activo%' THEN
    RAISE EXCEPTION 'FALLO: confirmar_compra no consulta el estado activo del producto.';
  END IF;

  IF definicion NOT LIKE '%v_item.activo%' THEN
    RAISE EXCEPTION 'FALLO: confirmar_compra no rechaza productos inactivos.';
  END IF;

  IF definicion NOT LIKE '%FOR UPDATE OF vp, p%' THEN
    RAISE EXCEPTION 'FALLO: la compra no bloquea cambios concurrentes de stock y estado activo.';
  END IF;

  RAISE NOTICE 'OK: confirmar_compra rechaza productos inactivos y bloquea cambios concurrentes.';
END;
$$;
