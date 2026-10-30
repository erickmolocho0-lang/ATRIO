> Actualización del 30 de octubre de 2026: instalador ejecutado por Segundo y estructura reconocida en la API remota. Las secciones de activación describen el procedimiento; no debe repetirse el instalador. Falta la prueba funcional con sesión.

# Checkout de Segundo: implementación y activación

El código de las cinco tareas de Segundo está implementado en segundo-checkout. Segundo ejecutó el instalador completo en Supabase y compartió el resultado Success. La API ya reconoce las tablas, columnas y funciones nuevas; la comprobación de escritura con sesión y la prueba de cobro siguen pendientes.

## Comportamiento implementado

- El checkout consulta modalidades y cobertura activas de Supabase. Muestra estándar y express según la tarifa de la zona elegida; retiro cuesta cero y no exige dirección. Se retiraron las tarifas y cupones fijos de ejemplo.
- Las direcciones incluyen localidad seleccionada de la cobertura, destinatario y celular peruano. El distrito se obtiene de la zona. Las direcciones anteriores se conservan y deben completarse antes de un envío.
- guardar_direccion_checkout guarda la dirección y cambia la predeterminada en una transacción, serializada por usuario, y un índice único parcial impide dos predeterminadas incluso mediante escrituras directas. Un error revierte toda la operación; no modifica direcciones de otros usuarios.
- cotizar_checkout calcula productos, cupón, envío, IGV y total en servidor. confirmar_compra recalcula bajo bloqueos y compara el total esperado: si cambia un precio, tarifa o cupón, rechaza la compra antes de crear pedido o consumir stock.
- confirmar_compra recibe método exacto, código de cupón y total esperado; guarda costo de envío y una copia de la modalidad y dirección para el historial. Los pedidos antiguos sin modalidad exacta se muestran como envío sin modalidad registrada.
- Administración → Cupones permite crear y editar porcentaje, mínimo, activación, fecha final y usos máximos (hora de Perú). No se cargan promociones reales de ejemplo. El cliente solo valida un código conocido; no puede listar ni modificar cupones. La confirmación vuelve a validar vigencia, mínimo, activación y cupo disponible. El consumo se registra dentro de la transacción de compra; cotizar y los intentos fallidos no consumen usos. Cada pedido creado consume un uso, aunque quede pendiente de pago o se cancele. El panel muestra el contador y no puede reiniciarlo.
- Se conserva el flujo de Hans: contra entrega nace preparado; tarjeta/Yape, pendiente_pago y pago pendiente. Si el proveedor falla después de crear el pedido, se conserva su número y se abre el detalle. La confirmación no afirma que el pago esté aprobado cuando sigue pendiente.
- El checkout espera las escrituras del carrito y puede volver a sincronizarlo tras un fallo. Tras la compra limpia el estado local, sin enviar otra orden de borrado al servidor.
- Los datos históricos del destinatario se anonimizan si se elimina la cuenta, conservando la integración de Alexander.
- Las pantallas nuevas usan useTema y funcionan con la paleta clara u oscura. La prueba visual con sesión y la prueba nativa siguen pendientes.

## Verificación realizada

- npm run typecheck correcto.
- ESLint correcto en los archivos de checkout modificados, incluido CarritoContext. Persisten los dos errores anteriores de main en el listado/detalle de pedidos; no se han modificado en esta entrega.
- npm test --prefix tests/delivery: 26 comprobaciones de delivery, 39 de checkout y 11 de compatibilidad de lectura (76 en total). Además, test:instalador ejecuta 38 comprobaciones sobre el mismo archivo SQL que se entrega para pegar en Supabase. Las once nuevas usan Supabase simulado y verifican el caso de migracion pendiente, filtros conservados, lecturas posteriores a la migracion y ausencia de fallback para cobros.
- Las pruebas aplican el esquema real y las migraciones de seguridad y pedidos de Hans/Alexander antes de la nuestra. Comprueban precios, cupones, stock, rechazo de importes manipulados, propiedad de direcciones, rollback posterior al cambio de predeterminada, historial, cancelación con reposición de stock y anonimización.
- Solo pg_cron está sustituido por un stub en PGlite. No se ha probado su ejecución programada real, ni la firma del webhook, ni una transacción de Mercado Pago.
- Exportación web correcta: 41 rutas, incluidas /admin/cupones, /admin/entregas, /checkout y /pago.

## Comprobación remota de Hans

Se realizaron solicitudes con la clave anónima pública, sin sesión de cliente, sin leer registros ni crear pedidos:

- Una columna de control inexistente devuelve 42703; direcciones.zona_id y pedidos.metodo_entrega_id/costo_envio se reconocen y devuelven únicamente denegación de permiso 42501.
- confirmar_compra con los cuatro parámetros de Hans se reconoce y deniega ejecución al anónimo (42501).
- crear-pago responde con su mensaje de negocio «El pedido no existe» para un identificador de diagnóstico inexistente: la función está desplegada. No se ha verificado su configuración secreta ni se ha solicitado un cobro.
- cotizar_checkout no aparece en la caché (PGRST202); cupones tampoco (PGRST205). Nuestra actualización aún no está aplicada.

## Activación pendiente

1. Revisar supabase/tests/verificar_checkout_remoto.sql en el SQL Editor; es solo lectura. Confirmar que la migración de Hans ya está aplicada y que su cron está activo. En Edge Functions, comprobar que crear-pago y webhook-mercadopago estén desplegadas; los valores de secretos no deben compartirse.
2. Si public.cupones aún no existe y Hans ya está aplicado, ejecutar una sola vez supabase/manual/activar_checkout_segundo.sql: combina 20261102000000 y 20261103000000 en una transacción. Si ya se aplicó la primera, usar solo 20261103000000. No repetir las migraciones antiguas ni recrear delivery. Si ya existen predeterminadas duplicadas, la activación aborta y conserva las preferencias para revisarlas antes.
3. Al finalizar se conserva sin cambios el cuerpo de la función anterior de Hans (tres/cuatro argumentos) y se agrega la función con cupón y total esperado (seis argumentos obligatorios). La app nueva envía los seis; las versiones anteriores conservan su comportamiento mientras el coordinador integra el nuevo checkout. Tras integrar y actualizar los clientes, el equipo deberá retirar la ruta antigua. La llamada SQL de tres argumentos y los seis requeridos se verificaron localmente; la resolución HTTP de ambas firmas debe verificarse después de aplicar el SQL remoto.
4. La propietaria define las modalidades, horarios, zonas, tarifas y promociones que realmente ofrecerá. Esta entrega no activa ni asigna valores de negocio en la base compartida.
5. Probar con una cuenta de prueba autorizada: dirección con zona, estándar/express/retiro, cupón válido e inválido, cambio de tarifa antes de pagar, historial y cancelación. Comprobar que resumen, pedidos.total y pagos.monto coincidan.
6. Probar tarjeta/Yape en el entorno de prueba de Hans y verificar el estado final desde Supabase. No basta con volver de la página de pago para asumir aprobación.
7. El coordinador autorizó integrar segundo-checkout a main. Se publica conservando la rama de Segundo y la integración de Hans que ya contiene main.

La revisión del código y las pruebas locales están completas. La ejecución de la migración y la validación remota con sesión no se sustituyen por suposiciones sobre lo que haya desplegado otro integrante.

## Compatibilidad mientras falta la migracion

Se corrigio la lectura del panel: si faltan exclusivamente cupon_codigo/datos_entrega o destinatario/telefono (42703/PGRST204), se repite la consulta con las columnas anteriores. Se conservan los filtros por usuario y numero de pedido. Los errores de permisos, red u otras columnas no activan este reintento. Cada lectura vuelve a intentar el esquema nuevo para adoptar la migracion cuando este disponible.

La pantalla de cupones explica que falta habilitar la actualizacion. Cotizar, confirmar y guardar direcciones conservan las funciones nuevas y no usan escrituras antiguas como alternativa. Esta compatibilidad permite consultar los pedidos existentes y no equivale a activar el nuevo checkout. No se modifico Supabase remoto para resolver el error.

## Requisitos exactos del reparto de tareas

- ATRIO10 se usa en la prueba local: pedidos.descuento y pagos.monto coinciden con la cotización. No se crea una promoción real automáticamente.
- Cupones: código, porcentaje, vigente_hasta, usos_maximos y activo; se agregan usos_actuales y mínimo de compra para control y gestión. La fila del cupón se bloquea antes de reservar el uso. Un fallo posterior revierte también el contador.
- Predeterminada: CREATE UNIQUE INDEX direcciones_predeterminada_unica ON direcciones(usuario_id) WHERE predeterminada, además de la función transaccional. No se corrigen duplicados existentes de forma automática.
- La función de compra de Hans se conserva para la transición. La integración a main fue autorizada por el coordinador; los controles automáticos no sustituyen la conciliación de pagos reales. Los costos y horarios reales los confirma la propietaria.
- En Cupones, si falla la carga, se muestra el error y Reintentar; no se muestra el formulario para crear ni se afirma que la tabla esté vacía.

Referencia técnica para la selección de funciones por argumentos: [PostgREST, funciones RPC](https://docs.postgrest.org/en/stable/references/api/functions.html). Las firmas difieren en los nombres y cantidad de argumentos, sin valores por defecto en la versión nueva.

## Activación remota comprobada después del instalador

Segundo compartió la captura Success. No rows returned. Se verificaron sin sesión las columnas de cupones (incluidos usos máximos/actuales), destinatario y datos del pedido, y las funciones cotizar_checkout, validar_cupon y guardar_direccion_checkout. La API reconoce tanto la llamada anterior de Hans de tres parámetros como la nueva de seis, sin errores de caché ni ambigüedad. Todas rechazan correctamente al rol anónimo con 42501; no se crearon pedidos ni se consultaron registros. Esto comprueba la disponibilidad de la estructura y no sustituye una prueba con una sesión autenticada ni un pago. La creación del índice queda respaldada por la ejecución correcta del instalador transaccional facilitado; no se inspeccionó directamente el catálogo remoto desde la API.

## Integración autorizada a main

El 30 de octubre de 2026 Segundo trasladó la autorización del jefe de grupo para publicar su parte en main. La revisión parte de origin/main 1460927 (PR #20 de Hans), cuyo árbol coincide con origin/hans-pedidos. No hay cambios de código nuevos en main pendientes de incorporar y la integración permite avanzar sin reescribir historial.

Antes de publicar se repitieron TypeScript, las 76 comprobaciones de delivery/checkout/compatibilidad, las 38 del instalador completo y ESLint de los archivos cambiados salvo los dos archivos de pedidos con errores preexistentes documentados. Todos esos controles pasaron. La API remota reconoce columnas y funciones nuevas y las firmas anterior y nueva de compra, y rechaza correctamente el acceso anónimo. La confirmación de pagos de la pasarela no se fuerza desde la app ni desde estas comprobaciones.

La estructura de Supabase ya fue aplicada manualmente por Segundo: el equipo no debe repetir el instalador por el hecho de actualizar main. Si posteriormente utiliza migraciones automáticas, debe reconciliar su historial con las versiones ya aplicadas antes de intentar ejecutarlas de nuevo.
