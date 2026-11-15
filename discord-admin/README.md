# RCC Admin

Servicio independiente para administrar un servidor Discord desde el proyecto RCC. Está dentro de `discord-admin/` para no interferir con el catálogo RCC.

## Funciones de esta primera versión

- Comando slash `/rcc` para instrucciones administrativas, restringido al creador configurado y miembros con permiso Administrator.\n- Comando slash `/hablar` para conversación con RCC sin herramientas ni acciones administrativas.\n- Crear/eliminar roles, asignar roles, crear canales de voz y texto, enviar mensajes, aplicar timeout y expulsar miembros; todas las mutaciones requieren aprobación del solicitante.
- Google Gemini mediante el endpoint compatible con OpenAI.
- Crear categorías y canales de texto.
- Renombrar canales y consultar la estructura del servidor.
- Publicar anuncios solo después de aprobación manual.
- Borrar canales solo después de aprobación manual.
- Verificación de firmas Ed25519 de Discord y restricción a un servidor.
- No requiere Gateway ni Privileged Gateway Intents.

No se implementan baneos ni funciones de voz avanzadas. Discord sigue aplicando jerarquía de roles y permisos del bot.

## Requisitos

- Node.js 20.11 o superior.
- Aplicación y bot de Discord.
- Clave de Gemini API de Google AI Studio.
- Servicio Node.js persistente con HTTPS, por ejemplo Railway.

## Variables privadas

Configura estas variables en Railway > servicio > Variables:

- `DISCORD_APPLICATION_ID`: Application ID de Discord.
- `DISCORD_PUBLIC_KEY`: Public Key de Discord, no es el token.
- `DISCORD_BOT_TOKEN`: token regenerado del bot.
- `GEMINI_API_KEY`: clave regenerada de Gemini.
- `GEMINI_MODEL`: por defecto `gemini-3.8-flash`.
- `DISCORD_GUILD_ID`: ID del servidor autorizado.\n- `DISCORD_OWNER_ID`: ID de usuario Discord del creador; es el ID personal, no el ID del servidor.
- `REGISTER_COMMANDS_ON_START`: `true`.
- `PORT`: Railway lo proporciona automáticamente; localmente se usa 3000.

No guardes secretos en GitHub, no los incluyas en commits y no los compartas por Discord o chat. Si se exponen, revócalos y genera otros nuevos.

## Cómo funciona Gemini

Se utiliza la librería cliente OpenAI solo como cliente HTTP compatible. El tráfico va al endpoint oficial de compatibilidad de Gemini:

`https://generativelanguage.googleapis.com/v1beta/openai/`

El servidor usa Chat Completions y llamadas a herramientas (function calling). La clave es `GEMINI_API_KEY`, no se requiere una clave de OpenAI.

## Despliegue en Railway

No hace falta Dockerfile ni Procfile para este servicio. Railway detecta Node.js mediante `package.json` y ejecuta el script `start`.

1. Crea un proyecto o servicio en Railway y conecta el repositorio GitHub.
2. Selecciona la rama `feat/rcc-discord-admin` mientras el PR siga sin fusionar.
3. En Settings, establece Root Directory en `/discord-admin`.
4. Build Command: déjalo automático o usa `npm install`.
5. Start Command: `npm start`.
6. En Variables, añade todas las variables indicadas arriba. No añadas comillas a los valores.
7. Despliega el servicio. Revisa Deployments > Logs.
8. En Settings > Networking, genera un dominio público HTTPS.
9. Abre `https://TU-DOMINIO/healthz`; debe responder JSON con `"ok":true`.
10. En Discord Developer Portal > General Information, configura Interactions Endpoint URL como `https://TU-DOMINIO/interactions`. Discord validará el endpoint mediante un PING.
11. Con `REGISTER_COMMANDS_ON_START=true` y el ID del servidor definido, el proceso registra `/rcc` en ese servidor al arrancar.

Railway mantiene el servicio como un despliegue persistente, sujeto al estado y límites del plan de Railway. No uses un Cron Job para el bot.

## Prueba segura

1. Ejecuta `/rcc solicitud: muéstrame los canales`.
2. Prueba crear una categoría o canal de prueba.
3. Prueba preparar un anuncio y confirma que no se publique hasta pulsar Confirmar.
4. Prueba borrar solo un canal de prueba y confirma el diálogo antes de ejecutar.

## Límites y seguridad

- `/rcc` solo admite al usuario configurado en `DISCORD_OWNER_ID` o miembros con permiso `ADMINISTRATOR` real. Los permisos `Manage Server` por sí solos no bastan.\n- `/hablar` es conversacional y no tiene herramientas administrativas.
- El servidor se limita mediante `DISCORD_GUILD_ID`.
- Todas las acciones que modifican el servidor requieren confirmación de la misma persona que solicitó la acción.\n- La asignación de roles, creación/eliminación de roles, envío de mensajes, timeout y expulsión también requieren confirmación.
- Las menciones masivas están desactivadas en los mensajes enviados.
- La IA solo puede llamar herramientas permitidas por el código; no ejecuta código arbitrario.
- Discord aplica igualmente los permisos efectivos y la jerarquía del rol del bot.
- El mapa de confirmaciones está en memoria; mantén una sola réplica mientras se usa esta versión inicial.
