// Mercado Pago llama a esta función cada vez que cambia un pago.
//
// 1. Verifica la firma (x-signature): si no coincide, no viene de Mercado Pago.
// 2. Consulta el pago real en Mercado Pago (no se confía en lo que trae el aviso).
// 3. Aprobado y con el monto exacto del pedido → pago "pagado" y pedido "preparado".
//    Si el pedido ya estaba cancelado → pago "por_reembolsar" (el admin devuelve el dinero).
//    Rechazado o cancelado → pago "fallido"; el pedido espera un reintento.
//
// Secretos necesarios: MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET (clave secreta que
// Mercado Pago muestra al configurar el webhook).
// En modo prueba los avisos llegan solo con el vendedor de prueba (ver crear-pago);
// también se puede probar con "Simular" en el panel de Mercado Pago.
 
import { createClient } from 'npm:@supabase/supabase-js@2';
 
async function firmaValida(req: Request, idPago: string): Promise<boolean> {
  // x-signature llega como "ts=1700000000,v1=abc123..."
  const partes = Object.fromEntries(
    (req.headers.get('x-signature') ?? '').split(',').map((parte) => parte.trim().split('=')),
  );
  const mensaje = `id:${idPago};request-id:${req.headers.get('x-request-id')};ts:${partes.ts};`;
 
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(Deno.env.get('MP_WEBHOOK_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(mensaje));
  const firmaHex = [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return firmaHex === partes.v1;
}
 
Deno.serve(async (req) => {
  const aviso = await req.json();
  if (aviso.type !== 'payment') return new Response('ignorado');
 
  const idPago = String(new URL(req.url).searchParams.get('data.id') ?? aviso.data.id).toLowerCase();
  if (!(await firmaValida(req, idPago))) return new Response('firma inválida', { status: 401 });
 
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${idPago}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
  });
  const pago = await res.json();
 
  // Con la clave de servicio: el webhook no tiene sesión de usuario.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, numero, estado, total')
    .eq('numero', pago.external_reference)
    .maybeSingle();
  if (!pedido) return new Response('pedido no encontrado');
 
  const aprobado = pago.status === 'approved' && Number(pago.transaction_amount) === Number(pedido.total);
  const rechazado = pago.status === 'rejected' || pago.status === 'cancelled';
 
  if (aprobado) {
    // Pagó tarde: el pedido ya se canceló (por tiempo o por el cliente).
    const estadoPago = pedido.estado === 'cancelado' ? 'por_reembolsar' : 'pagado';
    await supabase.from('pagos').update({ estado: estadoPago, referencia_externa: idPago }).eq('pedido_id', pedido.id);
    if (pedido.estado === 'pendiente_pago') {
      await supabase.rpc('cambiar_estado_pedido', { p_numero: pedido.numero, p_estado_nuevo: 'preparado' });
    }
  }
 
  // El pedido no se cancela aquí: con tarjeta el cliente puede reintentar en
  // la misma página. Si nunca paga, cancelar_pedidos_sin_pagar lo cancela a
  // los 30 minutos y repone el stock.
  if (rechazado) {
    await supabase.from('pagos').update({ estado: 'fallido', referencia_externa: idPago }).eq('pedido_id', pedido.id);
  }
 
  return new Response('ok');
});