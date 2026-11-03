-- ATRIO: inicializar delivery despues del esquema base de Alexander.
-- El esquema base 20260901 ya incluye tablas, funciones, indices y politicas
-- capturados de la base compartida despues de la ejecucion manual de Segundo.
-- Esta migracion solo fija permisos y carga configuracion inicial faltante.
-- No reemplaza precios, horarios, zonas ni tarifas ya configurados.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.metodos_entrega') IS NULL
     OR to_regclass('public.zonas_entrega') IS NULL
     OR to_regclass('public.tarifas_entrega') IS NULL
     OR to_regprocedure('public.guardar_zona_entrega(text,text,text,text,text,boolean,jsonb,uuid)') IS NULL
     OR to_regprocedure('public.obtener_cobertura_entrega()') IS NULL THEN
    RAISE EXCEPTION 'Aplica primero el esquema base 20260901 de ATRIO.';
  END IF;
END;
$$;

INSERT INTO public.metodos_entrega(id, nombre, tipo) VALUES
  ('estandar', 'Envío estándar', 'envio'),
  ('express', 'Envío express', 'envio'),
  ('retiro', 'Retiro en tienda', 'retiro')
ON CONFLICT (id) DO NOTHING;

-- Solo carga las nueve zonas si la tabla esta vacia. Conserva cualquier
-- configuracion previamente creada o modificada por la propietaria.
INSERT INTO public.zonas_entrega(nombre, distrito, provincia, departamento, maps_url)
SELECT s.nombre, s.distrito, s.provincia, s.departamento, s.maps_url
FROM (VALUES
  ('La Palma', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/QocZVhRjxHf8Wfu86'),
  ('El Corazón', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/Kz9of341LDm5ZXG96'),
  ('Indoamérica', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/VEa4eA8TfFe9CN2TA'),
  ('Los Cuyes', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/PxZR1HrjjaNJrGxo7'),
  ('La Primavera', '', '', '', 'https://maps.app.goo.gl/ahDTj5bMJSqYi8nh8'),
  ('La Tranca', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/mSLZqxvf2JcDfsbh9'),
  ('Lambayeque', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/8pSar94fcAFdRBoA6'),
  ('Los Rayos', '', '', '', 'https://maps.app.goo.gl/t5nCw9xwHLtBkuQ18'),
  ('Los Álamos', 'Chirinos', 'San Ignacio', 'Cajamarca', 'https://maps.app.goo.gl/yhcRwvD9KjU8ocsS9')) AS s(nombre, distrito, provincia, departamento, maps_url)
WHERE NOT EXISTS (SELECT 1 FROM public.zonas_entrega)
ON CONFLICT DO NOTHING;

REVOKE ALL ON public.metodos_entrega, public.zonas_entrega, public.tarifas_entrega
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.metodos_entrega, public.zonas_entrega, public.tarifas_entrega TO anon, authenticated;
GRANT UPDATE ON public.metodos_entrega TO authenticated;
GRANT INSERT, UPDATE ON public.zonas_entrega TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tarifas_entrega TO authenticated;

REVOKE ALL ON FUNCTION public.guardar_zona_entrega(text, text, text, text, text, boolean, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_zona_entrega(text, text, text, text, text, boolean, jsonb, uuid)
  TO authenticated;

REVOKE ALL ON FUNCTION public.obtener_cobertura_entrega() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_cobertura_entrega() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
