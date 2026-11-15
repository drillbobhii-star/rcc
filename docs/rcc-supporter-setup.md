# RCC Supporter: suscripción mensual y gestión VIP

## 1. Crear el producto en Ko-fi

1. En Ko-fi, abre **Memberships** y crea un tier llamado **RCC Supporter**.
2. Configura el precio en **USD $1.99 por mes** y añade los beneficios: acceso a la Zona VIP, insignia RCC Supporter y rol de Discord.
3. Enlaza tu servidor de Discord en la configuración de Ko-fi y selecciona el rol que corresponde a este tier.
4. Copia la URL de tu página de tiers. Normalmente tiene la forma `https://ko-fi.com/TU_USUARIO/tiers`.

El sitio ya incluye tu enlace exacto como valor predeterminado: `https://ko-fi.com/lubensdrill/tiers`. La función usa `RCC_KOFI_MONTHLY_URL` si está definida en el entorno de Cloudflare Pages; si no está definida o está vacía, utiliza ese enlace predeterminado. El botón de RCC se habilitará con esta URL.

## 2. Configurar Cloudflare Pages

Añade estas variables a **Settings → Environment variables** (producción y preview, según corresponda):

- `SUPABASE_URL`: `https://cbkrpyfkteomcukdisdw.supabase.co`
- `SUPABASE_ANON_KEY`: clave pública anon del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key del mismo proyecto (**secreto; nunca en el navegador**).
- `RCC_ADMIN_EMAIL`: correo exacto de la cuenta autorizada para activar o retirar VIP.
- `RCC_KOFI_MONTHLY_URL` (opcional): URL de tu página Ko-fi Membership Tiers. Valor predeterminado: `https://ko-fi.com/lubensdrill/tiers`.
- `DISCORD_WEBHOOK_URL`: webhook privado del canal donde quieres recibir los cambios manuales de VIP. El endpoint lo reutiliza para notificar activaciones y retiradas.

La función valida el JWT de Supabase y compara el correo del usuario con `RCC_ADMIN_EMAIL`. Solo el servidor usa `SUPABASE_SERVICE_ROLE_KEY` para leer y modificar membresías.

## 3. Crear la tabla VIP

Ejecuta una vez el SQL de `supabase/migrations/20261114190000_create_rcc_vip_memberships.sql` en el SQL Editor del proyecto Supabase. La tabla no concede permisos directos a usuarios autenticados; las modificaciones pasan por la función de servidor.

Después de desplegar, abre `/admin.html`, inicia sesión con la cuenta indicada en `RCC_ADMIN_EMAIL`, busca al miembro por su correo y activa o desactiva **Es VIP**. La acción se registra en la tabla y se envía un aviso al webhook de Discord cuando esté configurado.

## 4. Cobros, cancelaciones y permisos de Discord

El checkout mensual lo gestiona Ko-fi. La activación VIP del catálogo es manual: después de confirmar el pago, busca el correo del comprador en el panel admin y activa **Es VIP**. Cuando la persona cancele o termine su periodo de acceso, vuelve al panel y desactívalo. El repositorio no recibe ni verifica automáticamente los eventos de pago/cancelación de Ko-fi.

El rol de Discord se configura en Ko-fi para ese tier; la notificación webhook de RCC solo informa al equipo de que el acceso manual se activó o retiró. No sustituye la asignación del rol gestionada por Ko-fi.

## 5. Alcance del desenfoque

La selección de scripts VIP es estable y marca aproximadamente el 35 % del catálogo. La interfaz desenfoca las tarjetas y el código de esos scripts para cuentas sin acceso.

**Importante:** el catálogo actual se distribuye como JSON público. Por eso, el desenfoque es una barrera visual y no una protección fuerte del contenido: una persona con conocimientos técnicos podría descargar los datos públicos. Para ocultar realmente los códigos es necesario mover los scripts VIP a almacenamiento privado y servirlos únicamente después de validar el acceso en el servidor. Esta PR no finge implementar esa protección de almacenamiento que el repositorio todavía no tiene.
