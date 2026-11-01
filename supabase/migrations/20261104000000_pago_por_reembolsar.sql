-- Nuevo estado de pago "por_reembolsar": Mercado Pago aprobó el pago de un
-- pedido que ya estaba cancelado, así que el admin debe devolver el dinero.
ALTER TABLE public.pagos DROP CONSTRAINT pagos_estado_check;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_estado_check CHECK (
  estado IN ('pendiente', 'pagado', 'fallido', 'por_reembolsar', 'reembolsado')
);
