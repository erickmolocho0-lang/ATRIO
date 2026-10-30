> Actualización del 30 de octubre de 2026: este documento conserva el plan y la evolución inicial. Para el estado actual tras integrar Hans y adaptar el modo oscuro, consulta [la revisión de integración](REVISION_INTEGRACION_2026-10-30.md).

# Delivery de ATRIO: avance de Segundo

## Alcance confirmado

- La tarifa se guardara en Supabase. Con los destinos facilitados, debe distinguir zonas/localidades dentro del distrito para permitir precios diferentes.
- La propietaria define los precios, los horarios y la cobertura; Segundo implementa el soporte tecnico.
- Segundo aun no tiene acceso a la app. El jefe de grupo tiene acceso y la propietaria dispone de un panel administrativo.
- Las rutas por revisar son los recorridos del reparto, no las rutas de navegacion de la app.
- El medio de transporte confirmado por Segundo es una moto de reparto.
- Destinos previstos: La Palma, El Corazon, Indoamerica, Los Cuyes, La Primavera, La Tranca, Lambayeque, Los Rayos y Los Alamos.
- La propietaria gestionara tarifas y horarios desde su panel administrativo de la app; no se considera completada esa integracion con una tabla editable solo en Supabase.

## Orden de trabajo

1. Punto de despacho facilitado por Segundo: enlace de Google Maps y referencia frente al parque. Falta confirmar la cobertura inicial.
2. Revisar los recorridos, el acceso por carretera y las zonas que realmente cubrira cada distrito.
3. La propietaria confirma precios, dias, horarios y plazos de entrega. No se inventan importes ni promesas de entrega.
4. Completar la configuracion en la base y su gestion desde el panel administrativo existente.
5. Conectar las direcciones y el checkout a la cobertura configurada.
6. Coordinar con Hans el parametro de entrega y el calculo del total en confirmar_compra.
7. Probar con el jefe de grupo y con una cuenta administradora autorizada de la app.

## Datos operativos pendientes

- Cobertura completa del distrito o solo sectores/casco urbano.
- Responsable del reparto en moto y sectores realmente atendidos de cada localidad.
- Dias de reparto, horario y plazo prometido.
- Si se ofrecera express y en que zonas.

## Punto de despacho facilitado

- Enlace compartido por Segundo: https://maps.app.goo.gl/E5B9dw4HASPn7nbS7
- Referencia indicada por Segundo: "al frente del parque".
- La vista del enlace parece corresponder al sector de Las Pirias. La municipalidad confirma que el centro poblado Las Pirias pertenece a Chirinos, San Ignacio, Cajamarca.
- Fuente administrativa: https://www.gob.pe/institucion/munisanignacio/normas-legales/3880978-024-2022-mpsi
- El enlace abre una vista panoramica y tambien contiene una ficha general de Chirinos. No se han convertido sus coordenadas de camara o de la ficha en coordenadas exactas de la puerta de la tienda.
- Falta la lista de destinos para calcular recorridos. No se ha inferido cobertura, distancias por carretera ni tiempos de entrega a partir del punto de salida.

En los datos de cobertura se distinguira el centro poblado Las Pirias de su distrito Chirinos. La cobertura de un centro poblado no implica automaticamente cobertura de todo el distrito.

## Revision del flujo actual

El flujo observado en el codigo es: carrito -> checkout -> direcciones (cuando se cambia o agrega una) -> pago -> confirmacion -> detalle del pedido.

- `src/data/metodosEntrega.ts` mantiene precios provisionales de envio dentro de la app.
- `src/hooks/useCheckout.ts` calcula el resumen con esos precios.
- `src/components/checkout/FormularioDireccion.tsx` acepta distrito como texto libre.
- `src/services/servicioPedidos.ts` envia a confirmar_compra solo metodo de pago, tipo envio/retiro y direccion.
- La definicion de confirmar_compra exportada de Supabase calcula el total sin sumar envio y fija descuento en cero.
- El panel del repositorio tiene dashboard, productos, pedidos y reportes. No aparece una seccion de configuracion de delivery en esa version.

## Configuracion preparada en codigo local

La migracion por zonas agrega metodos_entrega, zonas_entrega y tarifas_entrega; nueve destinos inactivos, sin tarifas inventadas; lectura de cobertura y guardado administrativo transaccional. Reemplaza el borrador inicial por distrito, que no se aplico a Supabase.

La ruta nueva /admin/entregas se integra en el panel existente con un acceso Delivery. Permite editar modalidades y horarios informativos, registrar zonas y sus ubicaciones de Maps, y guardar las tarifas estandar o express por zona. Solo el rol de aplicacion administrador puede escribir.

Segundo confirmo la aplicacion manual en Supabase mediante resultado correcto y captura con 3 modalidades, 9 zonas y 0 tarifas. La app instalada de la propietaria aun requiere integrar esta rama. La conexion de estas tarifas al checkout y al cobro sigue pendiente y requiere conservar los cambios de Yeiner y coordinar confirmar_compra con Hans.

## Validacion realizada

TypeScript correcto, 26 comprobaciones locales en PostgreSQL mediante PGlite 0.5.13 y exportacion web correcta, incluida /admin/entregas. Las pruebas cubren administracion autorizada, lecturas publicas, rechazo de escrituras por clientes, validaciones monetarias y guardado atomico.

Segundo comprobo mediante capturas la lectura de Delivery y el guardado de La Palma desde la version web local con una cuenta administradora real, conservando zona inactiva y tarifas vacias. La app mostro la confirmacion de guardado. Siguen pendientes las pruebas de precios, activacion, alta de zonas, version nativa y checkout. Los pasos estan en docs/DELIVERY.md.

## Coordinacion con las ramas del equipo

La rama propia se actualizo con origin/main (3066713), que incorpora el esquema base de Alexander. El dump ya contiene los objetos de delivery; nuestra migracion posterior solo fija permisos e inicializa datos faltantes sin duplicar la estructura. La rama origin/yeiner/correcciones contiene trabajo pendiente sobre src/hooks/useCheckout.ts, src/types/Checkout.ts y src/utils/checkout.ts, incluyendo validacion de productos inactivos. Se debe conservar esa logica al integrar cobertura y tarifas. La funcion confirmar_compra se coordina con Hans. La entrega se sube solo a segundo-checkout, sin pull request ni actualizacion de main. No se modificaron archivos de checkout.

El catalogo de los nueve destinos y sus enlaces de recorrido esta en docs/COBERTURA_DELIVERY.md. Las consultas de Maps son material para revisar con el repartidor en moto, no distancias ni plazos de reparto ya comprobados.
