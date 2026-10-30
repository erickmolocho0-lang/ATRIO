# Resultados de seguridad de autenticación

## Alcance

La migración `20261031000000_seguridad_auth_y_eliminacion.sql` protege cambios de rol,
normaliza políticas de escritura administrativas, copia el celular del registro y
permite borrar una cuenta conservando los pedidos sin identificar al cliente.

## Comprobaciones

| Comprobación | Resultado actual | Cómo completar la prueba |
| --- | --- | --- |
| Cliente intenta cambiar su propio `perfiles.rol` a `administrador` | El trigger está implementado para rechazarlo con `42501`; la prueba real no se ejecutó contra Supabase. | Aplicar migraciones y ejecutar la prueba con un usuario cliente. |
| Solo administradores escriben productos, variantes e imágenes | Inspección estática: las políticas de escritura requieren `es_administrador()`. | Ejecutar `auth_security_assertions.sql`; probar INSERT/UPDATE con cliente y administrador. |
| Solo administradores escriben movimientos de stock y estados de pedidos | Inspección estática: INSERT de movimientos y UPDATE de pedidos requieren `es_administrador()`. | Probar las operaciones con ambos roles en el proyecto desplegado. |
| Cliente solo lee sus pedidos, direcciones, carrito y favoritos | Las políticas existentes filtran por `auth.uid()` o por sus relaciones. | Consultar datos de dos clientes distintos con cada sesión. |
| El registro copia el celular a `perfiles.telefono` | El trigger lee `celular` y `telefono`; además completa teléfonos vacíos desde metadata. | Registrar una cuenta de prueba y revisar su fila de perfil. |
| Cambio, renovación y cierre de sesión actualizan el contexto | `AuthContext` está suscrito a `onAuthStateChange`; no se ejecutó una prueba interactiva de sesión. | Iniciar sesión, cerrar desde otra sesión y observar la app. |
| Eliminación de cuenta | La Edge Function exige JWT válido, usa `service_role` solo en servidor y anonimiza pedidos antes de borrar la cuenta. No se ejecutó contra Supabase. | Desplegar la función y probarla con una cuenta descartable que tenga un pedido de envío. |

## Estado de validación

`auth_security_assertions.sql` verifica la presencia y las expresiones de políticas,
triggers y la FK de anonimización cuando se ejecute en Supabase SQL Editor. No
comprueba una solicitud real con cuentas cliente/admin. Las migraciones ni la
función Edge se han desplegado desde este cambio.

La eliminación conserva importes, artículos y el historial operativo del pedido,
pero establece `pedidos.usuario_id` y `pedidos.direccion_id` en `NULL`. La
restricción de `pedidos` permite esa combinación únicamente para pedidos de envío
anonimizados; los pedidos nuevos de envío siguen necesitando dirección.
