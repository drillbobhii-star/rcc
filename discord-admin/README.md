# RCC Admin

Servicio independiente para administrar tu servidor Discord desde el proyecto RCC. Se añade en esta carpeta para no modificar ni interferir con el catálogo RCC existente.

## Qué incluye esta primera versión

- Comando slash /rcc para dar instrucciones en español.
- IA mediante la API de OpenAI.
- Crear categorías y canales de texto.
- Cambiar el nombre de canales.
- Consultar los canales existentes.
- Preparar anuncios y pedir aprobación antes de publicarlos.
- Pedir aprobación antes de borrar un canal.
- Verificación de firmas Ed25519 de Discord, límite de tamaño del cuerpo y restricción opcional a un servidor.
- No necesita Gateway ni Privileged Gateway Intents.

Las acciones de roles, miembros, moderación y voz todavía no están implementadas. Los permisos concedidos en Discord no crean funciones automáticamente; esas capacidades se añadirán de forma explícita y probada.

## Requisitos

- Node.js 20.11 o superior.
- Una aplicación/bot creado en Discord Developer Portal.
- Una clave de API de OpenAI. La API se factura por separado de una suscripción de ChatGPT.
- Un servicio Node.js público con HTTPS. Render, Railway u otro hosting compatible sirven.

## Variables de entorno

Copia .env.example a .env para desarrollo local y completa:

- DISCORD_APPLICATION_ID: Application ID de General Information.
- DISCORD_PUBLIC_KEY: Public Key de General Information.
- DISCORD_BOT_TOKEN: token privado de la pestaña Bot.
- OPENAI_API_KEY: clave de OpenAI API.
- OPENAI_MODEL: modelo de API habilitado en tu cuenta; por defecto gpt-5.5.
- DISCORD_GUILD_ID: ID del único servidor autorizado. Muy recomendado.
- REGISTER_COMMANDS_ON_START: pon true para registrar /rcc al iniciar.
- PORT: puerto HTTP; el hosting normalmente lo asigna.

Nunca subas .env a GitHub, no publiques el token y no lo pegues en el chat. Si el token se expone, restablécelo inmediatamente en Discord Developer Portal.

## Ejecución local

Desde esta carpeta:

    npm install
    node --env-file=.env src/server.js

En Windows PowerShell también puedes usar:

    node --env-file=.env src/server.js

El endpoint de comprobación será /healthz y el endpoint de interacciones será /interactions.

## Despliegue

Crea un servicio web Node.js en tu proveedor de hosting, usando esta carpeta como raíz del servicio:

- Root directory: discord-admin
- Build command: npm install
- Start command: npm start
- Node: 20.11 o superior
- Añade todas las variables de entorno anteriores en el panel privado del hosting.

Activa REGISTER_COMMANDS_ON_START=true. Si DISCORD_GUILD_ID está definido, /rcc se registra solo en ese servidor y aparece rápidamente. Si no está definido, el registro será global y puede tardar en propagarse.

Cuando el hosting entregue una URL HTTPS, abre Discord Developer Portal > General Information y configura la URL del punto de conexión de interacciones como:

    https://TU-SERVICIO.example.com/interactions

Discord enviará un PING para validar el endpoint. El servicio responde al PING y verifica la firma de cada solicitud.

## Prueba

1. Abre la URL /healthz del servicio y comprueba que devuelve ok: true.
2. Comprueba que Discord acepta la URL de interacciones en General Information.
3. En el servidor autorizado, ejecuta /rcc.
4. Prueba primero una petición inocua, por ejemplo: "muéstrame los canales".
5. Prueba crear una categoría o canal.
6. Prueba un anuncio: no se publica hasta pulsar Confirmar.
7. Prueba borrar un canal solo con un canal de prueba: exige Confirmar o Cancelar.

## Seguridad y límites

- Solo usuarios con permiso Gestionar servidor o Administrador pueden invocar las acciones.
- DISCORD_GUILD_ID limita el servicio a un servidor concreto.
- Los anuncios y borrados requieren aprobación de la misma persona que pidió la acción.
- Las menciones masivas están desactivadas en los mensajes que publica el bot.
- El bot no recibe el contenido general de todos los mensajes: recibe comandos slash e interacciones.
- Las acciones están en una lista permitida; no ejecuta código arbitrario ni acepta instrucciones para saltarse permisos de Discord.
- Discord sigue aplicando la jerarquía de roles y los permisos efectivos del bot.
- Para ejecutar acciones, el bot necesita los permisos concretos correspondientes en el servidor.
