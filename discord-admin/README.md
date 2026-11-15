# RCC Admin — bot de Discord

Servicio independiente del sitio RCC. Mantiene una conexión Gateway con Discord y usa OpenAI Responses API con herramientas restringidas para administrar un único servidor.

## Funciones iniciales

- Comando /rcc instruccion para dar instrucciones en español.
- Consultar canales y roles; crear categorías, canales de texto y roles.
- Renombrar canales, actualizar temas y asignar roles por mención o ID.
- Preparar anuncios, eliminaciones, expulsiones, baneos, timeouts y borrado de mensajes para confirmación explícita.
- Solo acepta órdenes del usuario configurado como DISCORD_OWNER_ID y en DISCORD_GUILD_ID.
- No solicita el permiso Administrator.

Las confirmaciones se guardan en memoria. Si el bot se reinicia, desaparecen y deben solicitarse de nuevo. La instrucción y el resumen de canales/roles se envían a OpenAI para interpretar la orden; no se envía el historial de mensajes del servidor. Las peticiones usan store:false.

## Variables necesarias

DISCORD_BOT_TOKEN: token del bot en Developer Portal > Bot. Mantener secreto.
DISCORD_APPLICATION_ID: Application ID de General Information.
DISCORD_GUILD_ID: ID del servidor. Activa Developer Mode y copia el Server ID.
DISCORD_OWNER_ID: tu ID de usuario de Discord. Activa Developer Mode y copia tu User ID.
OPENAI_API_KEY: clave de OpenAI API. Mantener secreta.
OPENAI_MODEL: opcional; por defecto gpt-6-astra.

No subas .env, el token de Discord ni la API key a GitHub. Configura estos valores como variables secretas en el proveedor donde alojes el worker.

## Desarrollo local

En la carpeta discord-admin, copia .env.example como .env y completa las variables. Después ejecuta npm install, npm run check, npm run register y npm start.

El comando register publica /rcc en el servidor configurado. Hay que repetirlo cuando cambie la definición del comando.

## Despliegue

Despliega esta carpeta como servicio persistente o worker, no como función serverless. La imagen Docker usa Node 26 LTS. Configura el directorio raíz del servicio como discord-admin y utiliza el Dockerfile que contiene esa carpeta. Define todas las variables anteriores. Ejecuta npm run register una vez en un entorno que tenga esas variables antes de iniciar el worker.

No despliegues el bot en Netlify Functions: necesita una conexión Gateway persistente.

## Intents, permisos y privacidad

El bot usa únicamente el intent Guilds. No necesita Presence, Server Members ni Message Content para /rcc y no lee mensajes normales. Discord también exige que se concedan los permisos necesarios y que el rol del bot esté por encima de los roles que administra.

Aunque la aplicación tenga permisos amplios, el código limita las órdenes al dueño configurado y a un solo servidor. Anuncios, eliminaciones, expulsiones, baneos, timeouts y borrado de mensajes siempre requieren pulsar Confirmar. Los botones caducan en dos minutos. Las menciones automáticas están desactivadas en anuncios.

Esta integración usa la API de OpenAI por separado; no transfiere esta conversación de ChatGPT ni usa automáticamente una suscripción ChatGPT. La API puede generar cargos por uso.
