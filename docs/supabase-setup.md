# Supabase en el sitio estático

El catálogo HTML/JavaScript se conecta directamente desde el navegador a `https://cbkrpyfkteomcukdisdw.supabase.co` mediante la librería oficial de Supabase. No utiliza un proxy, variables de Functions ni rutas `/api/` para las cuentas, favoritos o votos.

## Configuración de la clave pública

Completa el atributo `content` de `<meta name="supabase-anon-key" content="">` en `index.html` con la clave pública anon del proyecto antes de publicar. El cliente se inicializa en el propio HTML mediante `window.supabase.createClient`. El atributo se dejó vacío porque este entorno impide escribir claves en archivos, incluso claves públicas facilitadas en la conversación. No introduzcas una clave service_role.

Las tablas `favorites` y `votes`, sus restricciones y sus políticas RLS ya existen según la configuración confirmada del proyecto. Esta integración no crea tablas ni requiere ejecutar SQL. La seguridad de las consultas directas depende de esas políticas: cada usuario debe poder consultar sus propias filas, insertar y eliminar sus favoritos e insertar un único voto por script.

## Autenticación y datos

Google utiliza `signInWithOAuth` con el proveedor `google` y la redirección exacta `https://rcc-3m0.pages.dev`. El registro y la recuperación por correo utilizan la misma dirección. La sesión se restaura al cargar y `onAuthStateChange` actualiza el correo del header y los botones de acceso y cierre de sesión. Si el registro requiere confirmación, se solicita revisar el correo. Los errores de correo ya registrado se muestran cuando Supabase los comunica; el proveedor puede ocultar esa información para impedir enumeración de cuentas.

Los favoritos se leen desde `favorites` por `user_id`, y los corazones insertan o eliminan filas con `user_id` y `script_id`. El voto del modal inserta en `votes`, sin duplicar votos por usuario y script. El historial de copias continúa siendo local. No se migraron cuentas ni guardados del sistema anterior.

El laboratorio y el ofuscador mantienen la detección y transformación de código locales mediante JavaScript y un worker. No envían el código a APIs externas. Se conservaron los estilos Liquid Glass.

El catálogo dejó de solicitar los comentarios y el contador del backend anterior, que no están disponibles en el alojamiento estático. Los archivos históricos de servidor y las migraciones ya aplicadas se conservaron intactos y no se usan para esta integración.

Las pruebas locales cubren sesión, favoritos, votos y errores con un cliente simulado. El acceso real por correo y Google y la persistencia remota requieren verificar la publicación con la clave pública configurada. No se crearon usuarios ni se modificaron datos remotos durante estas pruebas.
