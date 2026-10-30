// Crea el pago de un pedido en Mercado Pago.
//
// El monto SIEMPRE sale de la base (pedidos.total), nunca de la app.
// · Tarjeta: crea una preferencia de Checkout Pro y devuelve la URL donde el
//   cliente paga. Al terminar, Mercado Pago vuelve a la app (urlRetorno).
// · Yape: recibe el token que la app obtuvo con el celular y el código de la
//   app Yape, y crea el pago. La respuesta llega aprobada o rechazada al
//   instante, así que aquí mismo se confirma (o se marca fallido) el pago.
// La tarjeta la confirma el webhook (webhook-mercadopago).
//
// Secretos: MP_ACCESS_TOKEN (tarjeta) y MP_ACCESS_TOKEN_YAPE (Yape).
// En modo prueba Mercado Pago exige credenciales distintas para cada uno:
// Checkout Pro solo cobra con un vendedor de prueba, y los pagos por API
// (Yape) solo con las credenciales TEST- de la cuenta real. En producción
// los dos secretos tendrían el mismo Access Token.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS } from '../_shared/cors.ts';

const MERCADO_PAGO = 'https://api.mercadopago.com';

interface Solicitud {
  numero: string;
  metodo: 'tarjeta' | 'yape';
  urlRetorno?: string;
  tokenYape?: string;
}

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function llamarMercadoPago(ruta: string, cuerpo: unknown, idempotencia: string, token: string) {
  const res = await fetch(`${MERCADO_PAGO}${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencia,
    },
    body: JSON.stringify(cuerpo),
  });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.message ?? 'Mercado Pago rechazó la solicitud.');
  return datos;
}

// Guarda el resultado de un pago con Yape. Usa la clave de servicio porque el
// cliente no puede cambiar pagos ni estados por su cuenta.
async function registrarPagoYape(pedido: { id: string; numero: string }, aprobado: boolean, idPago: string) {
  const servidor = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await servidor
    .from('pagos')
    .update({ estado: aprobado ? 'pagado' : 'fallido', referencia_externa: idPago })
    .eq('pedido_id', pedido.id);
  if (aprobado) {
    await servidor.rpc('cambiar_estado_pedido', { p_numero: pedido.numero, p_estado_nuevo: 'preparado' });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const { numero, metodo, urlRetorno, tokenYape } = (await req.json()) as Solicitud;

  // Se lee el pedido con la sesión del cliente: las reglas de la base (RLS)
  // solo le dejan ver los suyos.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const { data: usuario } = await supabase.auth.getUser();
  const { data: pedido } = await supabase.from('pedidos').select('id, numero, total').eq('numero', numero).maybeSingle();
  if (!usuario.user || !pedido) return respuesta({ error: 'El pedido no existe.' }, 404);

  const urlWebhook = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-mercadopago`;

  try {
    if (metodo === 'tarjeta') {
      const preferencia = await llamarMercadoPago(
        '/checkout/preferences',
        {
          items: [{ title: `Pedido ${pedido.numero}`, quantity: 1, unit_price: pedido.total, currency_id: 'PEN' }],
          external_reference: pedido.numero,
          notification_url: urlWebhook,
          back_urls: { success: urlRetorno, failure: urlRetorno, pending: urlRetorno },
          auto_return: 'approved',
        },
        `preferencia-${pedido.numero}`,
        Deno.env.get('MP_ACCESS_TOKEN')!,
      );
      return respuesta({ urlPago: preferencia.init_point });
    }

    if (metodo === 'yape') {
      const pago = await llamarMercadoPago(
        '/v1/payments',
        {
          token: tokenYape,
          payment_method_id: 'yape',
          transaction_amount: pedido.total,
          installments: 1,
          description: `Pedido ${pedido.numero}`,
          external_reference: pedido.numero,
          notification_url: urlWebhook,
          payer: { email: usuario.user.email },
        },
        `yape-${pedido.numero}-${tokenYape}`,
        Deno.env.get('MP_ACCESS_TOKEN_YAPE')!,
      );
      const aprobado = pago.status === 'approved';
      await registrarPagoYape(pedido, aprobado, String(pago.id));
      return respuesta({ aprobado });
    }

    return respuesta({ error: 'Método de pago inválido.' }, 400);
  } catch (error) {
    return respuesta({ error: (error as Error).message }, 502);
  }
});
