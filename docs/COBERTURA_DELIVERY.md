# Cobertura propuesta de delivery de ATRIO

## Punto de salida

Ubicación facilitada por Segundo: [tienda frente al parque](https://maps.app.goo.gl/E5B9dw4HASPn7nbS7), en el sector de Las Pirias.

Los enlaces de recorrido usan como referencia inicial el centro de la vista de ese enlace (`-5.2420822, -78.9469243`). Esa coordenada de vista no se ha confirmado como la puerta de la tienda. Antes de aceptar un recorrido en Maps, ajustar el punto de salida al local real.

## Nueve destinos previstos

| Zona o localidad | Mapa facilitado | Recorrido para revisar | Tarifa |
|---|---|---|---|
| La Palma | [Ubicación indicada](https://maps.app.goo.gl/QocZVhRjxHf8Wfu86) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.2668142%2C-78.9586886) | Por definir por la dueña |
| El Corazón | [Ubicación indicada](https://maps.app.goo.gl/Kz9of341LDm5ZXG96) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.2465077%2C-78.9701683) | Por definir por la dueña |
| Indoamérica | [Ubicación indicada](https://maps.app.goo.gl/VEa4eA8TfFe9CN2TA) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.221978%2C-78.933766) | Por definir por la dueña |
| Los Cuyes | [Ubicación indicada](https://maps.app.goo.gl/PxZR1HrjjaNJrGxo7) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.2175352%2C-78.9481643) | Por definir por la dueña |
| La Primavera | [Ubicación indicada](https://maps.app.goo.gl/ahDTj5bMJSqYi8nh8) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.216682%2C-78.942185) | Por definir por la dueña |
| La Tranca | [Ubicación indicada](https://maps.app.goo.gl/mSLZqxvf2JcDfsbh9) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.227252%2C-78.927614) | Por definir por la dueña |
| Lambayeque | [Ubicación indicada](https://maps.app.goo.gl/8pSar94fcAFdRBoA6) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.22711%2C-78.903384) | Por definir por la dueña |
| Los Rayos | [Ubicación indicada](https://maps.app.goo.gl/t5nCw9xwHLtBkuQ18) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.250434%2C-78.937229) | Por definir por la dueña |
| Los Álamos | [Ubicación indicada](https://maps.app.goo.gl/yhcRwvD9KjU8ocsS9) | [Consultar recorrido](https://www.google.com/maps/dir/?api=1&origin=-5.2420822%2C-78.9469243&destination=-5.25484%2C-78.943085) | Por definir por la dueña |

Estos son destinos de cobertura esperada, no una cobertura ya activada. Las tarifas y los plazos están pendientes. Ningún enlace supone que se haya comprobado la transitabilidad, la distancia por carretera ni el tiempo real de reparto.

Los recorridos se abren en Google Maps para revisar alternativas y el medio de transporte. No se ha calculado un único circuito para visitar todos los destinos: cada enlace consulta una salida desde la tienda a una localidad.

## Criterio de configuración

La tarifa debe identificarse por **zona/localidad de entrega y modalidad**, conservando distrito, provincia y departamento como datos de ubicación. Un mismo distrito puede contener varias localidades con tarifas diferentes. La Tranca, Los Cuyes, Indoamérica y Lambayeque aparecen como localidades de Chirinos en fuentes oficiales; el Lambayeque del enlace es el punto rural compartido por Segundo, no la ciudad costera.

Las denominaciones locales La Primavera y Los Rayos se conservan tal como las indicó Segundo, vinculadas a sus coordenadas. Su categoría administrativa no está verificada.

La dueña gestionará las tarifas, la cobertura activa y los horarios desde el panel administrativo existente de la app. Supabase almacenará esos valores. La app del cliente consultará las opciones activas y el servidor deberá validar y recalcular el envío al confirmar la compra.

## Integración con el equipo

- Repositorio: `yeiner1234/ATRIO`.
- Rama local de preparación: `segundo-checkout`.
- `origin/main` incorporado como base de la rama propia: `3066713`, con el esquema base de Alexander. No se modifica main.
- La rama `origin/yeiner/correcciones` tiene cambios pendientes que afectan `src/hooks/useCheckout.ts`, `src/types/Checkout.ts` y `src/utils/checkout.ts`. Añade la validación de productos inactivos; esa lógica debe conservarse.
- La entrega se publica únicamente en segundo-checkout mediante un avance normal de la rama, conservando sus commits existentes.
- La función `confirmar_compra` requiere coordinación con Hans para los parámetros de entrega y cupón.
- Se agregó la sección Delivery al panel en el código local. El único archivo existente modificado es la navegación administrativa para añadir ese acceso. No se modificaron archivos de checkout. La publicación se limita a segundo-checkout. Segundo confirmó la ejecución manual del SQL y los conteos 3/9/0 en la base compartida.
- El borrador inicial por distrito fue reemplazado por una migración por zonas/localidades con permisos de administración y guardado transaccional. La configuración del panel pasó TypeScript, 26 comprobaciones locales y compilación web. La aplicación inicial en Supabase fue confirmada por Segundo. Segundo comprobó la lectura del panel y el guardado sin cambios de La Palma con una cuenta administradora real en la versión web local. Siguen pendientes las pruebas de precios y activación, la versión nativa y la conexión al checkout. Al incorporarse el dump de Alexander, la migración posterior se adaptó para inicializar y fijar permisos sin recrear objetos existentes.

## Datos que faltan para validar los recorridos

Medio de transporte confirmado por Segundo: **moto de reparto**. Falta identificar al responsable del reparto, los sectores concretos atendidos dentro de cada localidad, ajustar el punto de salida al local y revisar caminos, horarios y plazos con la dueña o repartidor. Los enlaces de Maps no presuponen que una ruta calculada para automóvil sea adecuada para moto.

## Fuentes

- [Gobierno Regional de Cajamarca: localidades de Chirinos](https://portal.regioncajamarca.gob.pe/noticias/54-localidades-de-chirinos-y-san-ignacio-beneficiadas-con-proyecto-de-electrificaci-n).
- [Municipalidad de Chirinos: carretera La Palma y El Corazón](https://munichirinos.gob.pe/2023/04/27/rehabilitacion-de-la-carretera-chirinos-cordiller-andina-la-palma-y-el-corazon/). Esta noticia histórica identifica el corredor; no prueba su estado vial actual.
- [Municipalidad Provincial de San Ignacio: centro poblado Las Pirias, distrito Chirinos](https://www.gob.pe/institucion/munisanignacio/normas-legales/3880978-024-2022-mpsi).
- [Google Maps: formato de enlaces para consultar recorridos](https://developers.google.com/maps/documentation/urls/get-started).
- Los nueve enlaces de ubicación fueron aportados por Segundo y se resolvieron para obtener sus puntos de destino.
