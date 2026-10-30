# Checkout y entregas

## Configuración

- Administración → Delivery: modalidades, horarios informativos, localidades y tarifas por modalidad. La propietaria define los valores y activa las opciones disponibles.
- Administración → Cupones: código, porcentaje, compra mínima, vigencia y usos máximos. El contador se incrementa al crear un pedido, incluso si queda pendiente de pago o se cancela; una cotización o transacción fallida no consume usos.
- Direcciones: zona de cobertura, destinatario y celular. El distrito se obtiene de la zona. Las direcciones anteriores necesitan completar esos datos antes de utilizarse para un envío.
- El checkout consulta el total al servidor. Al confirmar se recalculan descuento y envío, y se comprueba que el total coincida con el mostrado. El pedido conserva modalidad, costo y datos de entrega.

Las ubicaciones propuestas están en [COBERTURA_DELIVERY.md](COBERTURA_DELIVERY.md). Tarifas, horarios, cobertura comercial y recorridos se validan con la propietaria y el repartidor.

## Base de datos

Las migraciones de checkout dependen del esquema y las migraciones de pedidos de Hans:

- [Checkout, cupones y direcciones](../supabase/migrations/20261102000000_checkout_segundo.sql).
- [Usos de cupones e índice único de predeterminada](../supabase/migrations/20261103000000_limites_cupones_y_direccion_unica.sql).

El [instalador manual](../supabase/manual/activar_checkout_segundo.sql) combina ambas en una transacción. Ya se ejecutó en la base compartida según el resultado facilitado por Segundo; no debe repetirse allí. El responsable de futuras migraciones automáticas debe conciliar el historial con lo ya aplicado.

Se conserva la firma anterior de confirmar_compra de Hans y se añade la versión de seis argumentos utilizada por el nuevo checkout. El cambio de predeterminada usa una función transaccional y un índice único parcial.

La [consulta de verificación](../supabase/tests/verificar_checkout_remoto.sql) permite revisar columnas, firmas e índice sin modificar datos.

## Comprobaciones realizadas

```sh
npm run typecheck
npm test --prefix tests/delivery
npm run test:instalador --prefix tests/delivery
```

Se ejecutaron 76 comprobaciones de delivery, checkout y compatibilidad, y 38 sobre el instalador completo. La exportación web también compiló. Las pruebas de datos usan PostgreSQL local con PGlite; las de compatibilidad simulan Supabase. El programador pg_cron está simulado.

La API remota reconoce las columnas y funciones nuevas y rechaza su uso anónimo. Eso comprueba su disponibilidad, no una compra autenticada ni un cobro. Las capturas aportadas muestran pantallas web y la ejecución del SQL.

Quedan fuera de esas comprobaciones los cobros reales de tarjeta/Yape, la validación del webhook con la pasarela, la ejecución del cron remoto, la app nativa y los recorridos de reparto. Su resultado no puede deducirse de las pruebas locales.
