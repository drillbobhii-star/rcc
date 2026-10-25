# Cuentas y comunidad

El catálogo utiliza Netlify Identity para las cuentas por correo y Google, y Netlify Database para comentarios, favoritos y me gusta. No necesita credenciales de Supabase. La integración anterior de Supabase dejó de utilizarse; sus datos remotos no se modificaron ni importaron.

El despliegue activa Identity y aplica automáticamente la nueva migración. Los registros por correo requieren confirmación; el enlace de confirmación inicia sesión. El mismo correo no puede registrar otra cuenta y la interfaz muestra el aviso recibido del servicio. La recuperación de contraseña se completa desde el enlace enviado por correo.

## Habilitar Google

En la configuración del proyecto, abre Identity y habilita Google entre los proveedores de acceso externos. Si solicita un cliente OAuth propio, créalo en Google Cloud y guarda sus credenciales únicamente en la configuración del proveedor. Usa como URI de redirección autorizada la dirección HTTPS del sitio seguida de `/.netlify/identity/callback`. Configura también la URL del sitio y las redirecciones permitidas para el dominio de producción y los dominios de prueba que utilices. No añadas credenciales al repositorio.

El botón comprueba si Google está habilitado antes de abrir el flujo OAuth con una solicitud de selección de cuenta. Google controla la pantalla final de selección y consentimiento. La primera entrada crea la cuenta; las siguientes reutilizan la cuenta del proveedor. Si ya existe una cuenta por correo y el proveedor rechaza su asociación, utiliza el acceso por correo; no se crea una cuenta duplicada.

## Datos y permisos

Las funciones verifican la sesión en el servidor. Los visitantes pueden leer comentarios y el total de me gusta. Solo las cuentas confirmadas pueden publicar comentarios, dar me gusta y guardar favoritos. Cada usuario tiene sus propios favoritos y un solo me gusta por script; puede retirar ambos. Los comentarios se publican con el nombre de la cuenta o la parte anterior a `@`, nunca con el correo completo. Solo su autor puede eliminarlos. El contenido se presenta como texto y se limita a 2000 caracteres. Los comentarios anteriores se cargan por páginas, y Actualizar permite ver nuevas publicaciones.

Los favoritos almacenan el identificador estable del script del catálogo en la base de datos; al volver a entrar desde otro dispositivo se recupera la colección y se accede al código del catálogo. No son copias privadas de código editado. El historial de copias permanece local.

El cliente oficial de Identity se carga desde esm.sh con una versión fijada, porque el proyecto sirve HTML estático sin compilación de frontend. La conexión al CDN y los correos de Identity deben estar disponibles.

## Comprobación después del despliegue

Registra una cuenta, confirma el correo y comprueba que se muestre a su lado. Intenta registrar el mismo correo otra vez. Cierra y vuelve a abrir sesión; recupera la contraseña. Con Google habilitado, prueba el primer acceso y un segundo acceso con la misma cuenta. Guarda un script y abre la cuenta en otro dispositivo. Publica un comentario, comprueba su visibilidad sin sesión y desde otra cuenta; verifica que solo el autor pueda eliminarlo. Comprueba que los me gusta se puedan retirar y que los favoritos de dos cuentas estén separados.

Las comprobaciones locales automatizadas usan servicios simulados. El envío real de correo, OAuth y la persistencia en el despliegue requieren esta comprobación posterior a la activación y a la aplicación automática de las migraciones.
