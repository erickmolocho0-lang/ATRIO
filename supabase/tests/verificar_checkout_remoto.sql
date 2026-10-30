-- SOLO LECTURA. No muestra claves, clientes, direcciones ni pedidos.
SELECT table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public' AND (
  (table_name='direcciones' AND column_name IN ('zona_id','destinatario','telefono')) OR
  (table_name='pedidos' AND column_name IN ('metodo_entrega_id','costo_envio','cupon_codigo','datos_entrega')) OR
  table_name='cupones') ORDER BY table_name,ordinal_position;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS parametros
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('confirmar_compra','cotizar_checkout','validar_cupon',
  'guardar_direccion_checkout','cancelar_pedidos_sin_pagar') ORDER BY p.proname;

SELECT to_regprocedure('public.confirmar_compra(text,text,uuid,text)') AS firma_hans,
  to_regprocedure('public.confirmar_compra(text,text,uuid,text,text,numeric)') AS firma_nueva,
  to_regprocedure('public.cotizar_checkout(text,uuid,text)') AS cotizacion,
  to_regprocedure('public.guardar_direccion_checkout(text,uuid,text,text,text,text,boolean,uuid)') AS guardar_direccion;

-- Si pg_cron esta instalado, comprobar por separado:
-- SELECT jobname,schedule,active FROM cron.job WHERE jobname='cancelar-pedidos-sin-pagar';

-- El total debe ser cero antes de crear el indice unico. No modifica preferencias.
SELECT count(*) AS usuarios_con_predeterminadas_duplicadas FROM (
  SELECT usuario_id FROM public.direcciones WHERE predeterminada GROUP BY usuario_id HAVING count(*)>1
) duplicados;
SELECT indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='direcciones' AND indexname='direcciones_predeterminada_unica';
