# Delivery: siguiente paso para Segundo

La primera parte ya está preparada en la rama local `segundo-checkout`: sección **Delivery** del panel administrativo, tablas por zona/localidad y guardado de tarifas en una sola operación.

La app compiló para web, TypeScript pasó y se completaron 26 comprobaciones locales de datos y permisos. Segundo confirmó la ejecución manual en Supabase y compartió la comprobación de 3 modalidades, 9 zonas y 0 tarifas. Falta probar el panel con una cuenta administradora real.

## Estado de la base y del esquema compartido

La creación inicial ya se ejecutó manualmente en la base compartida. La captura de Segundo confirma 3 filas en metodos_entrega, 9 en zonas_entrega y 0 en tarifas_entrega. No hay que repetir ese archivo para subir el código.

Alexander incorporó después el esquema base `20260901_esquema_base.sql`, cuyo dump ya contiene las tablas, funciones y políticas de delivery. Para evitar objetos duplicados, la migración `_configurar_delivery_por_zona.sql` ahora solo fija permisos y carga los datos iniciales faltantes: conserva modalidades existentes y solo carga las nueve zonas cuando la tabla está vacía.

Las pruebas ejecutan el esquema base real seguido de esta inicialización y verifican también su reaplicación sin duplicar ni sobrescribir la configuración. Las nueve zonas y las modalidades permanecen inicialmente inactivas, sin precios ni horarios inventados.

## Cómo lo usará la dueña

El jefe de grupo debe integrar esta rama en una versión de la app para que aparezca **Administración → Delivery**. Crear las tablas no actualiza por sí solo la app que ella ya tiene instalada.

La cuenta debe tener `perfiles.rol = administrador` dentro de ATRIO. Ser Owner o Developer de la plataforma Supabase es un permiso diferente y no cambia el rol de la cuenta en la app.

1. En **Modalidades y horarios**, abre una modalidad.
2. Completa su nombre, plazo o indicaciones de retiro, días y horario.
3. Actívala cuando esté lista. Express puede quedarse inactivo.
4. En **Zonas con cobertura**, abre una de las nueve localidades o agrega otra.
5. Revisa distrito, provincia y departamento. La Primavera y Los Rayos tienen esa clasificación pendiente y requieren completarla antes de activarse.
6. Revisa o edita el enlace de Maps.
7. Introduce las tarifas reales en soles. Puedes usar coma o punto para los decimales.
8. Un campo vacío significa que no se ofrece esa modalidad en la zona. El valor **0** significa envío gratuito.
9. Activa la zona y pulsa **Guardar zona**.

Puede editar precios o desactivar una zona posteriormente. Los horarios son informativos; no bloquean automáticamente pedidos fuera de una franja horaria. Los recorridos para moto, sus tiempos y los sectores realmente atendidos siguen sujetos a validación de la dueña y el repartidor.

## Qué queda después

La pantalla de configuración guarda tarifas y cobertura, pero el checkout actual todavía usa los importes provisionales anteriores. La siguiente entrega conectará las direcciones, la selección de zona y el cálculo del envío al servidor. Eso se coordina con Hans en `confirmar_compra`, y debe conservar los cambios de productos inactivos de la rama de Yeiner.

La entrega se sube únicamente a la rama segundo-checkout. No modifica pedidos, pagos, cuentas ni precios de ropa, y no incluye un pull request ni una actualización de main.

## Comprobación técnica

- `npm run typecheck`.
- `npm ci --prefix tests/delivery` y `npm test --prefix tests/delivery` (PGlite 0.5.13, 26 comprobaciones).
- Exportación web de Expo correcta, incluida la ruta `/admin/entregas`.
- Las pruebas usan una base PostgreSQL local desechable con roles de ejemplo. No usan ni modifican la base real.
- Nuevos permisos: solo una cuenta con el rol de aplicación `administrador` puede escribir. La lectura pública se limita a configuración activa.
- El guardado de una zona y sus tarifas es transaccional y usa `SECURITY INVOKER` para respetar RLS.
- Las pruebas usan el trigger de protección de perfiles.rol del esquema base de Alexander y verifican que un cliente no pueda convertirse en administrador. Las pruebas de sesión real de la app siguen pendientes; esta entrega no cambia políticas de perfiles.
- El único archivo existente modificado es `src/components/admin/NavegacionAdmin.tsx`, al que se añade el acceso Delivery. El resto son archivos nuevos.
- Se conserva sin modificaciones el esquema base incorporado por Alexander en main (3066713); la nueva migración lo complementa con permisos e inicialización de delivery.
