-- Guarda un producto completo (datos generales, variantes con su stock e
-- imágenes) en una sola transacción. Antes la app hacía hasta 8 llamadas
-- separadas (crearProducto / actualizarProducto + actualizarVariantesEImagenes)
-- y si una fallaba a la mitad el producto quedaba incompleto.
--
-- SECURITY INVOKER a propósito: corre con los permisos de quien llama, así
-- que se siguen aplicando las políticas RLS de productos, variantes_producto,
-- imagenes_producto, movimientos_stock e items_pedido (todas tienen su
-- política de administrador en el esquema base). La verificación explícita
-- de es_administrador() al inicio es una segunda barrera con un mensaje claro.
--
-- Parámetros (JSON en snake_case, igual que las columnas):
--   p_producto  { id, sku, nombre, categoria_id, precio, precio_anterior,
--                 descripcion, composicion, confeccion, origen, etiquetas[],
--                 es_novedad }
--   p_variantes [{ talla, color_id, stock }]
--   p_imagenes  ["url1", "url2", ...]  (el orden del arreglo es el orden final)
--
-- Devuelve { id, variantes_retiradas: [{ talla, color_id, color_nombre }] }.
-- "variantes_retiradas" son las que se quitaron en el formulario pero no se
-- pudieron borrar porque tienen historial (movimientos o pedidos): quedan con
-- stock 0 en vez de borrarse.

create or replace function public.guardar_producto(
  p_producto jsonb,
  p_variantes jsonb,
  p_imagenes jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := nullif(btrim(p_producto->>'id'), '');
  v_usuario uuid := auth.uid();
  v_existe boolean;
  v_variantes jsonb := coalesce(p_variantes, '[]'::jsonb);
  v_imagenes jsonb := coalesce(p_imagenes, '[]'::jsonb);
  v_variante jsonb;
  v_stock integer;
  v_actual record;
  v_nueva_id uuid;
  v_retiradas jsonb := '[]'::jsonb;
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede guardar productos.'
      using errcode = '42501';
  end if;

  if v_id is null then
    raise exception 'Falta el id del producto.';
  end if;
  if jsonb_typeof(v_variantes) <> 'array' or jsonb_typeof(v_imagenes) <> 'array' then
    raise exception 'Las variantes y las imágenes deben enviarse como listas.';
  end if;

  -- Una talla + color repetidos harían que la segunda fila "actualice" a la
  -- primera en silencio: se rechaza todo el guardado.
  if exists (
    select 1
    from jsonb_array_elements(v_variantes) e
    group by e->>'talla', e->>'color_id'
    having count(*) > 1
  ) then
    raise exception 'Hay variantes repetidas (misma talla y color).';
  end if;

  select exists (select 1 from public.productos where id = v_id) into v_existe;

  -- 1. Datos generales. Al editar no se tocan sku, popularidad, fecha de alta
  --    ni activo, igual que hacía actualizarProducto.
  if v_existe then
    update public.productos
    set nombre          = p_producto->>'nombre',
        categoria_id    = p_producto->>'categoria_id',
        precio          = (p_producto->>'precio')::numeric,
        precio_anterior = (p_producto->>'precio_anterior')::numeric,
        descripcion     = p_producto->>'descripcion',
        composicion     = p_producto->>'composicion',
        confeccion      = p_producto->>'confeccion',
        origen          = p_producto->>'origen',
        etiquetas       = coalesce(
                            array(select jsonb_array_elements_text(coalesce(p_producto->'etiquetas', '[]'::jsonb))),
                            '{}'::text[]),
        es_novedad      = coalesce((p_producto->>'es_novedad')::boolean, false)
    where id = v_id;
  else
    insert into public.productos (
      id, sku, nombre, categoria_id, precio, precio_anterior, descripcion,
      composicion, confeccion, origen, etiquetas, es_novedad,
      popularidad_30d, fecha_alta, activo
    ) values (
      v_id,
      p_producto->>'sku',
      p_producto->>'nombre',
      p_producto->>'categoria_id',
      (p_producto->>'precio')::numeric,
      (p_producto->>'precio_anterior')::numeric,
      p_producto->>'descripcion',
      p_producto->>'composicion',
      p_producto->>'confeccion',
      p_producto->>'origen',
      coalesce(
        array(select jsonb_array_elements_text(coalesce(p_producto->'etiquetas', '[]'::jsonb))),
        '{}'::text[]),
      coalesce((p_producto->>'es_novedad')::boolean, false),
      0,
      current_date,
      true
    );
  end if;

  -- 2. Variantes que llegan en el formulario: se crean o se ajusta su stock,
  --    con la misma lógica de movimientos que actualizarVariantesEImagenes:
  --    variante nueva con stock > 0 -> 'ingreso'; cambio de stock -> 'ajuste'
  --    por la diferencia.
  for v_variante in select value from jsonb_array_elements(v_variantes) loop
    v_stock := coalesce((v_variante->>'stock')::integer, 0);

    select vp.id, vp.stock
    into v_actual
    from public.variantes_producto vp
    where vp.producto_id = v_id
      and vp.talla = v_variante->>'talla'
      and vp.color_id = v_variante->>'color_id'
    for update;

    if not found then
      insert into public.variantes_producto (producto_id, talla, color_id, stock)
      values (v_id, v_variante->>'talla', v_variante->>'color_id', v_stock)
      returning id into v_nueva_id;

      if v_stock > 0 then
        insert into public.movimientos_stock (variante_id, tipo, cantidad, motivo, creado_por)
        values (
          v_nueva_id,
          'ingreso',
          v_stock,
          case when v_existe then null else 'Stock inicial' end,
          v_usuario
        );
      end if;
    elsif v_actual.stock <> v_stock then
      update public.variantes_producto set stock = v_stock where id = v_actual.id;

      insert into public.movimientos_stock (variante_id, tipo, cantidad, creado_por)
      values (v_actual.id, 'ajuste', v_stock - v_actual.stock, v_usuario);
    end if;
  end loop;

  -- 3. Variantes que ya no están en el formulario. movimientos_stock.variante_id
  --    e items_pedido.variante_id son FK ON DELETE RESTRICT: una variante con
  --    historial no se puede borrar. En ese caso se deja con stock 0 (y su
  --    ajuste) y se informa a la app. Sin historial, se borra (items_carrito
  --    tiene ON DELETE CASCADE, así que también sale de los carritos).
  for v_actual in
    select vp.id, vp.talla, vp.color_id, vp.stock, c.nombre as color_nombre
    from public.variantes_producto vp
    left join public.colores c on c.id = vp.color_id
    where vp.producto_id = v_id
      and not exists (
        select 1
        from jsonb_array_elements(v_variantes) e
        where e->>'talla' = vp.talla
          and e->>'color_id' = vp.color_id
      )
  loop
    if exists (select 1 from public.movimientos_stock m where m.variante_id = v_actual.id)
       or exists (select 1 from public.items_pedido ip where ip.variante_id = v_actual.id) then
      if v_actual.stock > 0 then
        update public.variantes_producto set stock = 0 where id = v_actual.id;

        insert into public.movimientos_stock (variante_id, tipo, cantidad, motivo, creado_por)
        values (v_actual.id, 'ajuste', -v_actual.stock, 'Variante retirada', v_usuario);
      end if;

      v_retiradas := v_retiradas || jsonb_build_object(
        'talla', v_actual.talla,
        'color_id', v_actual.color_id,
        'color_nombre', coalesce(v_actual.color_nombre, v_actual.color_id)
      );
    else
      delete from public.variantes_producto where id = v_actual.id;
    end if;
  end loop;

  -- 4. Imágenes: se reemplazan todas, respetando el orden del arreglo.
  delete from public.imagenes_producto where producto_id = v_id;

  insert into public.imagenes_producto (producto_id, url, orden)
  select v_id, url, (posicion - 1)::integer
  from jsonb_array_elements_text(v_imagenes) with ordinality as i(url, posicion);

  return jsonb_build_object('id', v_id, 'variantes_retiradas', v_retiradas);
end;
$$;

-- Solo usuarios con sesión pueden llamarla (la función además exige rol
-- administrador). anon no la necesita.
revoke all on function public.guardar_producto(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_producto(jsonb, jsonb, jsonb) to authenticated;
