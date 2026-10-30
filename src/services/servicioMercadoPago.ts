import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

function requerirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

// El cobro lo hace la Edge Function crear-pago (servidor). La app solo abre la
// página de pago; quien confirma el pedido es el webhook de Mercado Pago.
export const servicioMercadoPago = {
  // Abre la página de pago de Mercado Pago (Checkout Pro) dentro de la app.
  // Termina cuando el cliente vuelve a ATRIO, haya pagado o no.
  async pagarConTarjeta(numero: string): Promise<void> {
    const urlRetorno = Linking.createURL('confirmacion');
    const { data, error } = await requerirSupabase().functions.invoke('crear-pago', {
      body: { numero, metodo: 'tarjeta', urlRetorno },
    });
    if (error || !data?.urlPago) throw new Error('No se pudo abrir el pago con tarjeta.');

    await WebBrowser.openAuthSessionAsync(data.urlPago, urlRetorno);
  },

  // Con el celular y el código de 6 dígitos de la app Yape, Mercado Pago da un
  // token de un solo uso. Con ese token el servidor hace el cobro.
  async pagarConYape(numero: string, celular: string, codigo: string): Promise<void> {
    const respuesta = await fetch(
      `https://api.mercadopago.com/platforms/pci/yape/v1/payment?public_key=${process.env.EXPO_PUBLIC_MP_PUBLIC_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: celular, otp: codigo, requestId: String(Date.now()) }),
      },
    );
    const token = await respuesta.json();
    if (!respuesta.ok || !token.id) throw new Error('El celular o el código de Yape no son válidos.');

    const { data, error } = await requerirSupabase().functions.invoke('crear-pago', {
      body: { numero, metodo: 'yape', tokenYape: token.id },
    });
    if (error || !data?.aprobado) throw new Error('Yape rechazó el pago.');
  },
};
