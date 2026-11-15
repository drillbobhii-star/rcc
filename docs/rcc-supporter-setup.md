# RCC Supporter: pagos Ko-fi, membresía VIP y Discord OAuth

## 1. Crear el tier en Ko-fi

1. En Ko-fi, abre **Memberships** y crea un tier llamado **RCC Supporter**.
2. Configura el precio en **USD $1.99 por mes**.
3. En Ko-fi abre **Settings → API / Webhooks** (el nombre puede variar) y crea un webhook para pagos de membresía.
4. Copia el **Verification Token** que muestra Ko-fi.
5. Configura la URL del webhook como `https://TU-DOMINIO-RCC/api/kofi-webhook`.
6. En el mensaje de agradecimiento del tier, añade el enlace `https://TU-DOMINIO-RCC/vip-success.html` para que el comprador complete la vinculación de Discord después del pago.

El botón de RCC ya usa `https://ko-fi.com/lubensdrill/tiers` como enlace predeterminado.

## 2. Aplicar la migración de Supabase

Ejecuta una vez `supabase/migrations/20261115100000_kofi_vip_and_discord_link.sql` en el SQL Editor del mismo proyecto Supabase que usa RCC.

La migración añade `profiles.is_supporter` y `profiles.discord_id`, impide vincular un mismo Discord a dos perfiles y crea `rcc_kofi_events` para que los reintentos de Ko-fi no dupliquen el procesamiento. La tabla `profiles` guarda `user_id`, no el correo; por eso el webhook localiza primero al usuario por su correo verificado en Supabase Auth y después actualiza el perfil asociado.

## 3. Configurar Cloudflare Pages

Añade estas variables como **Secrets / Environment variables** en producción:

- `SUPABASE_URL`: `https://cbkrpyfkteomcukdisdw.supabase.co`
- `SUPABASE_ANON_KEY`: clave pública anon de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key del mismo proyecto (**secreto; nunca en el navegador**).
- `RCC_ADMIN_EMAIL`: `drillbobhii@gmail.com` (mantiene los permisos de Creador/admin separados del estado Supporter).
- `KOFI_VERIFICATION_TOKEN`: token de verificación copiado desde Ko-fi.
- `RCC_VIP_API_URL`: URL HTTPS completa del endpoint Railway, por ejemplo `https://TU-SERVICIO.up.railway.app/vip/grant`.
- `RCC_VIP_WEBHOOK_SECRET`: secreto aleatorio largo compartido con Railway. Usa exactamente el mismo valor en ambos servicios.
- `RCC_KOFI_MONTHLY_URL` (opcional): URL de Ko-fi Membership Tiers.
- `DISCORD_WEBHOOK_URL` (opcional): webhook privado para avisos de cambios manuales desde el panel admin.

No publiques ni compartas la service-role key, el token de Ko-fi ni el secreto compartido.

## 4. Configurar Railway y el rol de Discord

En el servicio Railway de `discord-admin`, añade:

- `DISCORD_GUILD_ID`: ID del servidor RCC.
- `DISCORD_BOT_TOKEN`: token privado del bot ya existente.
- `DISCORD_VIP_ROLE_ID`: ID del rol RCC Supporter.
- `RCC_VIP_WEBHOOK_SECRET`: el mismo secreto configurado en Cloudflare Pages.

El bot y el comprador deben estar dentro del servidor; el bot necesita permiso **Gestionar roles** y su rol más alto debe estar por encima del rol RCC Supporter. El endpoint privado `POST /vip/grant` valida el secreto compartido antes de pedir a Discord que asigne el rol.

## 5. Activar Discord OAuth en Supabase

1. En Supabase abre **Authentication → Sign In / Providers** y activa **Discord**.
2. Introduce el Client ID y Client Secret de la aplicación OAuth de Discord.
3. En Discord Developer Portal, añade como OAuth2 Redirect URI la URL de callback que muestra Supabase, normalmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
4. En Supabase **Authentication → URL Configuration**, añade `https://TU-DOMINIO-RCC/vip-success.html` a las Redirect URLs permitidas.
5. Habilita el enlace manual de identidades si tu configuración de Supabase lo requiere.

El usuario debe iniciar sesión primero en su cuenta RCC y después pulsar **Vincular mi Discord**. Si todavía no tiene cuenta, puede crearla desde esta página con el mismo correo de Ko-fi y verificarlo. La página usa Supabase OAuth para enlazar la identidad Discord con esa misma cuenta; el servidor extrae el ID de la identidad verificada, no confía en un ID enviado libremente por el navegador.

## 6. Flujo automático y separación de permisos

- Ko-fi envía el evento de suscripción a `/api/kofi-webhook`.
- El webhook valida el Verification Token, comprueba que sea una suscripción de al menos USD $1.99 y obtiene el correo del comprador.
- Busca ese correo en Supabase Auth, encuentra su perfil y activa tanto `profiles.is_supporter = true` como `rcc_vip_memberships.is_vip = true`. Funciona para cualquier comprador, no exige que sea el creador. Si aún no tiene una cuenta RCC o no ha verificado el correo, el pago queda pendiente y puede reclamarlo después desde la página de éxito usando ese mismo correo.
- Si el perfil ya tiene `discord_id`, el webhook solicita a Railway que asigne el rol VIP.
- Si todavía no tiene Discord vinculado, el comprador abre `/vip-success.html`, inicia sesión o crea/verifica la cuenta RCC con el correo usado al comprar y completa Discord OAuth. La API reclama cualquier pago pendiente de ese correo, guarda el ID verificado y solicita el rol inmediatamente.
- El correo `drillbobhii@gmail.com` conserva sus poderes de Creador mediante `RCC_ADMIN_EMAIL`. Comprar el tier no convierte a ningún otro usuario en administrador.

El webhook procesa de forma idempotente los IDs de evento de Ko-fi. Esta implementación activa la membresía cuando llega un pago válido; la cancelación/fin de periodo debe retirarse desde el panel admin hasta que se integre un evento de cancelación fiable de Ko-fi.

## 7. Comprobación

1. Aplica la migración y configura todos los secretos.
2. Verifica que `https://TU-SERVICIO.up.railway.app/healthz` responde JSON con `{"ok":true}`.
3. Para comprobar la activación, usa un evento de suscripción USD de al menos $1.99 y revisa los logs de Cloudflare Pages. El evento genérico de prueba de Ko-fi puede ignorarse si no cumple ese importe.
4. Comprueba que el perfil comprador tiene `is_supporter = true` y la fila de `rcc_vip_memberships` tiene `is_vip = true`.
5. Abre `/vip-success.html`, inicia sesión con ese mismo correo y vincula Discord.
6. Comprueba que el rol RCC Supporter aparece en el usuario dentro del servidor.

**Nota:** el catálogo actual distribuye algunos datos de scripts como JSON público; el desenfoque VIP de la interfaz no es protección criptográfica del contenido. Esta integración automatiza el estado de membresía y el rol de Discord, pero no convierte los datos públicos del catálogo en almacenamiento privado.
