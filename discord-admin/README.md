# RCC Admin · Jarvis

Jarvis administra el servidor autorizado mediante `/rcc instruccion` y genera borradores con `/rcc anuncio`. Las interacciones reciben inmediatamente la respuesta diferida de Discord y el canal muestra el indicador de escritura mientras se procesa la IA. El indicador se renueva cada ocho segundos y se detiene al terminar, incluso si hay errores.

## Herramientas

Puede consultar, crear y renombrar canales y categorías, borrar canales y preparar anuncios. El borrado de canales y la publicación de anuncios conservan sus botones de confirmación, restringidos al solicitante y con caducidad de cinco minutos.

También incluye:

- `purge_messages`: borra entre 1 y 100 mensajes recientes de un canal de texto. Omite los que tengan 14 días o más e informa del número realmente borrado. Ejemplo: «Borra los últimos 20 mensajes de #general».
- `lock_channel` y `unlock_channel`: deniega o permite escribir a `@everyone`, incluyendo los hilos, sin modificar los demás permisos del canal. Los administradores y los permisos explícitos de otros roles o miembros siguen aplicándose. Desbloquear concede escritura; no restaura una configuración histórica de permisos.
- `server_info`: muestra miembros aproximados, usuarios conectados, número de canales, boosts, nivel de boosts y fecha de creación.
- `user_info`: consulta por ID la cuenta, fecha de creación, ingreso, apodo, roles y estado de baneo. Si no puede consultar baneos por falta de permisos, comunica el error en vez de afirmar que no está baneado.

Solo acepta administradores o miembros con Gestionar servidor dentro de `DISCORD_GUILD_ID`. Discord aplica además los permisos efectivos del bot. Necesita Ver canal, Leer historial y Gestionar mensajes para purgar, Gestionar canales y Gestionar roles para editar sobrescrituras, Banear miembros para consultar baneos y Enviar mensajes para el indicador de escritura. Las operaciones usan exclusivamente los canales del servidor autorizado.

## Gemini y latencia

Se usa el SDK oficial `@google/genai`, con el cliente reutilizado entre solicitudes. El modelo predeterminado es `gemini-3.1-flash-lite`, con razonamiento desactivado, salida limitada, plazo de 20 segundos y un solo intento. `GEMINI_MODEL` permite elegir otro modelo compatible; una configuración antigua de esa variable prevalece sobre el valor predeterminado. Las herramientas reutilizan la lista de canales que ya se consultó para interpretar la solicitud. La respuesta final sigue dependiendo de la latencia de Gemini y Discord.

## Ejecución en Netlify

El punto de entrada `netlify/server/index.mjs` sirve `/interactions`, `/vip/grant` y `/healthz`. El resto del sitio conserva sus rutas existentes. Los trabajos posteriores a la confirmación inmediata se registran con `waitUntil`. Las confirmaciones pendientes se almacenan en Netlify Database y se consumen atómicamente para evitar ejecuciones duplicadas; una migración nueva añade la tabla sin modificar las migraciones anteriores.

Configura Interactions Endpoint URL de la aplicación Discord con `https://TU-DOMINIO-NETLIFY/interactions`. La comprobación inicial utiliza la firma Ed25519 de Discord. El registro de comandos existente sirve también para estas herramientas; sus nombres no cambian el comando slash.

Variables que utiliza el servicio:

- `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`: identificación y autenticación de la aplicación.
- `DISCORD_GUILD_ID`: servidor autorizado, obligatorio.
- `GEMINI_MODEL`: opcional; por defecto `gemini-3.1-flash-lite`. Netlify AI Gateway suministra las credenciales de Gemini en ejecución.
- `DISCORD_ANNOUNCEMENT_CHANNEL_ID`: opcional; si falta busca un canal llamado anuncios o announcements.
- `DISCORD_VIP_ROLE_ID` y `RCC_VIP_WEBHOOK_SECRET`: rol Supporter y autenticación del endpoint privado `/vip/grant`.
- `REGISTER_COMMANDS_ON_START`: registro opcional al iniciar el proceso independiente. En Netlify, registra los comandos mediante el script `scripts/register-commands.js` en un entorno privado configurado.

No se guardan tokens de interacción ni credenciales en la tabla de confirmaciones. El endpoint privado VIP valida su secreto y solo asigna el rol configurado del servidor autorizado.

## Verificación

Desde la raíz: `npm run test:vip` y `npm run test:discord`. Comprueban el desbloqueo del modal, los eventos de sesión, respuestas obsoletas, los límites del borrado y los permisos conservados al bloquear/desbloquear. No realizan llamadas reales a Gemini o Discord.
