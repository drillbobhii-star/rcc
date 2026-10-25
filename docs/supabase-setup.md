# Configuración de Supabase

La interfaz está integrada en `index.html`. Para activar la conexión:

1. Añade la clave pública anon de tu proyecto en `SUPABASE_CONFIG.anonKey` dentro de `index.html`. No uses una clave privada ni service_role. El valor se dejó vacío y no se almacenó la clave facilitada.
2. Ejecuta `docs/supabase-setup.sql` en el SQL Editor de tu proyecto Supabase. Crea `favorites` y `votes`, con `user_id` UUID y `script_id` de texto, claves únicas por usuario y script, y políticas RLS para acceder únicamente a los registros propios. Si las tablas ya existían, comprueba primero que tengan esta estructura y que no haya políticas anteriores que concedan acceso adicional.
3. Habilita el proveedor Email en Authentication y configura Site URL y Redirect URLs con la dirección HTTPS publicada. Si está activada la confirmación de correo, hay que confirmar el registro antes de iniciar sesión.
4. Comprueba el flujo real: registro, confirmación, entrada, recarga, favorito, eliminación, voto y cierre de sesión. Verifica también con una segunda cuenta que sus favoritos estén separados.

Los favoritos se consultan siempre en Supabase. El historial de scripts copiados conserva su funcionamiento local. Los votos permiten una fila por usuario y script; no activan por sí mismos ninguna funcionalidad Premium.

No se ejecutó el SQL ni se crearon usuarios durante la implementación. Las pruebas automatizadas usan un cliente simulado y no verifican la disponibilidad ni la configuración del proyecto remoto.
