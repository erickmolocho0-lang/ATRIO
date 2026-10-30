-- Permisos de tabla para que el panel admin pueda crear, editar y borrar
-- categorías, colores y campañas.
--
-- Las políticas RLS de escritura ya existían (categorias_escritura_admin,
-- colores_escritura_admin y "Administradores gestionan campañas"), pero el rol
-- authenticated solo tenía SELECT en estas tablas. Postgres revisa el GRANT
-- antes que la RLS, así que el admin recibía "permission denied for table".
--
-- Esto NO abre la escritura a los clientes: la RLS sigue exigiendo
-- es_administrador() en cada insert, update y delete. GRANT es idempotente, así
-- que la migración se puede volver a correr.

grant insert, update, delete on public.categorias to authenticated;
grant insert, update, delete on public.colores    to authenticated;
grant insert, update, delete on public.campanas   to authenticated;

notify pgrst, 'reload schema';
