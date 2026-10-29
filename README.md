# ATRIO

Repositorio público del proyecto:

https://github.com/yeiner1234/ATRIO

El repositorio contiene el código fuente completo de la aplicación ATRIO, desarrollada con React Native, Expo y TypeScript.

## Cómo ejecutar la aplicación

### 1. Clonar el repositorio

```bash
git clone https://github.com/yeiner1234/ATRIO.git
cd ATRIO
```

### 2. Instalar dependencias

```bash
npm install
npx expo install --fix
```

### 3. Configurar Supabase

Crear un archivo `.env` en la raíz del proyecto y colocar las credenciales del proyecto de Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://vkmmtswnfkznacrfzzpd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbW10c3duZmt6bmFjcmZ6enBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjczMjksImV4cCI6MjEwNjAwMzMyOX0.5Un2d9SSb5TY5QRHAgEXmEdW9kfdNpyYapMzpxCF1Pw


```

> Estas credenciales deben ser proporcionadas al docente para que pueda ejecutar correctamente la aplicación.

### 4. Ejecutar el proyecto

```bash
npm start
```

También se puede ejecutar con:

```bash
npx expo start
```

Luego abrir la aplicación mediante Expo Go, un emulador Android/iOS o el navegador.

## Acceso de prueba

Las credenciales de prueba se comparten por un canal privado con el docente y no se publican en este repositorio.

También se puede registrar una nueva cuenta de cliente desde la aplicación.

## Participación de los integrantes

| Integrante | Participación principal |
| --- | --- |
| Yeiner Carrión Lalangui | Productos, variantes por talla y color, stock, catálogo, detalle de producto, carrito y administración de productos/stock. |
| Erick Molocho | Perfil, configuración, modo oscuro, notificaciones, correos, biometría y reportes. |
| Segundo Chasquero | Checkout, direcciones, métodos de entrega y validaciones del proceso de compra. |
| Alexander | Autenticación, registro, inicio de sesión, roles y protección del panel administrativo. |
| Hans | Pago, confirmación de compra, historial y detalle de pedidos, administración de pedidos/ventas y métodos de pago. |

La participación de los integrantes también puede identificarse mediante el historial de commits, ramas y Pull Requests del repositorio.
