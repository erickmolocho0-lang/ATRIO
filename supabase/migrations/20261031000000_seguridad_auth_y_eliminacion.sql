CREATE OR REPLACE FUNCTION public.evitar_cambio_rol_no_autorizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol AND NOT public.es_administrador() THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol de una cuenta.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfiles_evitar_cambio_rol ON public.perfiles;
CREATE TRIGGER trg_perfiles_evitar_cambio_rol
  BEFORE UPDATE OF rol ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.evitar_cambio_rol_no_autorizado();

CREATE OR REPLACE FUNCTION public.crear_perfil_al_registrarse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, telefono, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'nombre'), ''), 'Cliente ATRIO'),
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'celular'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'telefono'), '')
    ),
    'cliente'
  );
  RETURN NEW;
END;
$$;

UPDATE public.perfiles AS perfil
SET telefono = COALESCE(
  NULLIF(BTRIM(usuario.raw_user_meta_data ->> 'celular'), ''),
  NULLIF(BTRIM(usuario.raw_user_meta_data ->> 'telefono'), '')
)
FROM auth.users AS usuario
WHERE usuario.id = perfil.id
  AND NULLIF(BTRIM(perfil.telefono), '') IS NULL
  AND COALESCE(
    NULLIF(BTRIM(usuario.raw_user_meta_data ->> 'celular'), ''),
    NULLIF(BTRIM(usuario.raw_user_meta_data ->> 'telefono'), '')
  ) IS NOT NULL;

DROP POLICY IF EXISTS perfiles_actualizacion_propia_o_admin ON public.perfiles;
CREATE POLICY perfiles_actualizacion_propia_o_admin
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.es_administrador())
  WITH CHECK (id = auth.uid() OR public.es_administrador());

DROP POLICY IF EXISTS productos_admin_write ON public.productos;
DROP POLICY IF EXISTS productos_escritura_admin ON public.productos;
CREATE POLICY productos_admin_write
  ON public.productos
  FOR ALL
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS variantes_admin_write ON public.variantes_producto;
DROP POLICY IF EXISTS variantes_escritura_admin ON public.variantes_producto;
CREATE POLICY variantes_admin_write
  ON public.variantes_producto
  FOR ALL
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS imagenes_admin_write ON public.imagenes_producto;
DROP POLICY IF EXISTS imagenes_escritura_admin ON public.imagenes_producto;
CREATE POLICY imagenes_admin_write
  ON public.imagenes_producto
  FOR ALL
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

DROP POLICY IF EXISTS movimientos_stock_admin_insert ON public.movimientos_stock;
DROP POLICY IF EXISTS movimientos_stock_insert_admin ON public.movimientos_stock;
DROP POLICY IF EXISTS movimientos_stock_admin_select ON public.movimientos_stock;
DROP POLICY IF EXISTS movimientos_stock_select_admin ON public.movimientos_stock;
CREATE POLICY movimientos_stock_admin_insert
  ON public.movimientos_stock
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_administrador());
CREATE POLICY movimientos_stock_admin_select
  ON public.movimientos_stock
  FOR SELECT
  TO authenticated
  USING (public.es_administrador());

DROP POLICY IF EXISTS pedidos_admin_select ON public.pedidos;
DROP POLICY IF EXISTS pedidos_propios_select ON public.pedidos;
DROP POLICY IF EXISTS pedidos_select ON public.pedidos;
DROP POLICY IF EXISTS pedidos_admin_update_estado ON public.pedidos;
DROP POLICY IF EXISTS pedidos_update_admin ON public.pedidos;
CREATE POLICY pedidos_select
  ON public.pedidos
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR public.es_administrador());
CREATE POLICY pedidos_admin_update_estado
  ON public.pedidos
  FOR UPDATE
  TO authenticated
  USING (public.es_administrador())
  WITH CHECK (public.es_administrador());

ALTER TABLE public.pedidos
  ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE public.pedidos
  DROP CONSTRAINT pedidos_check;
ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_check
  CHECK (
    (tipo_entrega = 'envio' AND direccion_id IS NOT NULL)
    OR (tipo_entrega = 'envio' AND usuario_id IS NULL AND direccion_id IS NULL)
    OR tipo_entrega = 'retiro'
  );
ALTER TABLE public.pedidos
  DROP CONSTRAINT pedidos_usuario_id_fkey;
ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_usuario_id_fkey
  FOREIGN KEY (usuario_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.pedidos.usuario_id IS
  'NULL cuando el cliente elimina su cuenta; se conserva el pedido sin vincularlo a datos personales.';

NOTIFY pgrst, 'reload schema';
