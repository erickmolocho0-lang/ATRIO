// Devuelve el dinero de un pago "por_reembolsar" con la API de Mercado Pago.
// Solo la puede usar un administrador. Al terminar, el pago queda "reembolsado".
//
// Funciona con Yape en modo prueba, y con tarjeta y Yape en producción.
// En modo prueba Mercado Pago no permite devolver pagos con tarjeta por API
// ("Unauthorized use of live credentials"): se devuelven desde su panel y el
// admin usa "Devuelto en Mercado Pago" (marcar_pago_reembolsado).
// El efectivo de contra entrega se devuelve en persona (también con esa función).
//
// Secretos: MP_ACCESS_TOKEN (tarjeta) y MP_ACCESS_TOKEN_YAPE (Yape).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS } from '../_shared/cors.ts';

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const { numero } = (await req.json()) as { numero: string };

  // Con la sesión de quien llama: solo sigue si es administrador.
  const usuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const { data: esAdministrador } = await usuario.rpc('es_administrador');
  if (!esAdministrador) return respuesta({ error: 'Solo un administrador puede reembolsar.' }, 403);

  const servidor = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: pedido, error } = await servidor
    .from('pedidos')
    .select('id, pagos ( metodo, estado, referencia_externa )')
    .eq('numero', numero)
    .maybeSingle();
  if (error) return respuesta({ error: 'No se pudo leer el pedido.' }, 500);

  const pago = Array.isArray(pedido?.pagos) ? pedido.pagos[0] : pedido?.pagos;
  if (!pedido || !pago || pago.estado !== 'por_reembolsar' || !pago.referencia_externa) {
    return respuesta({ error: 'Este pedido no tiene un pago para reembolsar.' }, 409);
  }
  if (pago.metodo === 'contra_entrega') {
    return respuesta({ error: 'El efectivo se devuelve en persona.' }, 409);
  }

  const token = pago.metodo === 'yape' ? Deno.env.get('MP_ACCESS_TOKEN_YAPE') : Deno.env.get('MP_ACCESS_TOKEN');
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${pago.referencia_externa}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `reembolso-${pago.referencia_externa}`,
    },
    body: '{}', // vacío = devolver el monto completo
  });
  if (!res.ok) {
    console.error('Mercado Pago rechazó el reembolso', numero, await res.text());
    return respuesta({
      error: 'Mercado Pago no permitió el reembolso. Devuélvelo desde su panel y usa "Devuelto en Mercado Pago".',
    }, 502);
  }

  const { error: errorPago } = await servidor
    .from('pagos')
    .update({ estado: 'reembolsado' })
    .eq('pedido_id', pedido.id);
  if (errorPago) {
    console.error('Reembolso hecho, pero no se pudo guardar', numero, errorPago);
    return respuesta({ error: 'El dinero se devolvió, pero no se pudo actualizar el pago. Usa "Devuelto en Mercado Pago".' }, 500);
  }

  return respuesta({ reembolsado: true });
});
