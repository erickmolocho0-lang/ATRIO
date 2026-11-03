# ATRIO

Aplicación móvil de catálogo, compra y administración para una tienda de ropa del Centro Poblado Las Pirias (Chirinos, Cajamarca). Está hecha con React Native, Expo SDK 58 y TypeScript, con Supabase como backend.

Repositorio: https://github.com/yeiner1234/ATRIO

Versión presentada en la Unidad II: etiqueta `entrega-unidad-2`.

## Requisitos

- Node.js 20 o superior.
- Expo Go para SDK 58 en el celular, o un emulador Android o iOS.
- Las credenciales del proyecto de Supabase, que el equipo entrega por un canal privado.

## Cómo ejecutar la aplicación

```bash
git clone https://github.com/yeiner1234/ATRIO.git
cd ATRIO
npm install
```

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

En Windows (CMD):

```cmd
copy .env.example .env
```

Luego inicia el proyecto:

```bash
npx expo start
```

Escanea el código QR con Expo Go o abre el proyecto en un emulador.

## Variables de entorno

**De la app, en el archivo `.env`.** Nunca se suben al repositorio.

| Variable | Para qué sirve |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Dirección del proyecto de Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase. El acceso real lo limitan las políticas RLS. |
| `EXPO_PUBLIC_MP_PUBLIC_KEY` | Clave pública de Mercado Pago, para el pago con Yape |

**Secretos de las Edge Functions, en Supabase.** Se configuran con `supabase secrets set` y no van en la app.

| Secreto | Función que lo usa |
| --- | --- |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | `agente-atrio` (asistente Luna) |
| `MP_ACCESS_TOKEN`, `MP_ACCESS_TOKEN_YAPE` | `crear-pago` y `webhook-mercadopago` |
| `MP_WEBHOOK_SECRET` | `webhook-mercadopago` (verifica la firma de Mercado Pago) |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm start` | Inicia Expo |
| `npm run web` | Abre la versión web |
| `npm run typecheck` | Verifica los tipos de TypeScript |
| `npm run lint` | Ejecuta ESLint |
| `cd tests/delivery && npm test` | Ejecuta las pruebas automáticas del checkout y del delivery |

## Estructura

```
app/                  pantallas y rutas (Expo Router)
src/components/       componentes reutilizables
src/hooks/            lógica de cada pantalla
src/context/          estado global (sesión, carrito, favoritos, checkout, configuración)
src/services/         acceso a Supabase, a las Edge Functions y al almacenamiento local
src/types/            tipos de las entidades
supabase/functions/   Edge Functions: agente-atrio, crear-pago, webhook-mercadopago, eliminar-cuenta
supabase/migrations/  esquema de la base de datos versionado
```

## Acceso de prueba

Las cuentas de prueba (cliente y administrador) se comparten con el docente por un canal privado y no se publican en este repositorio. También se puede registrar una cuenta de cliente nueva desde la aplicación.

## Integrantes

| Integrante | Usuario de GitHub | Participación principal |
| --- | --- | --- |
| Carrión Lalangui, Yeiner Edinson | yeiner1234 | Productos con variantes, stock, catálogo, detalle, carrito, administración del catálogo y asistente Luna |
| Chasquero Castillo, Segundo Norberto | Segchas2004 | Checkout, direcciones, delivery por zonas, cupones y validaciones de la compra |
| Cullampe Mendoza, Alexander | AMCXR | Autenticación, registro, roles, protección del panel administrativo y eliminación de cuenta |
| Molocho Vásquez, Erick Dayan | erickmolocho0-lang | Perfil, configuración, modo oscuro, notificaciones, biometría y reportes |
| Reyes Rojas, Hans Rabbi | Hans-3xR | Pago con Mercado Pago, confirmación, pedidos, seguimiento y administración de pedidos |

La participación de cada integrante también se ve en el historial de commits, ramas y pull requests del repositorio.