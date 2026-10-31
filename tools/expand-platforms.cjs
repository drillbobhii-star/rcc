// Re-run from the repository root after editing the authored platform library.
const fs = require('node:fs');
const library = require('./platform-library.cjs');
const catalog = require('./catalog-store.cjs').readCatalog().filter(s => !s.id.startsWith('rcc_platform_'));
const hosts = {
  fivem: {name:'FiveM', device:'pc', runtime:'FiveM · CfxLua (Lua 5.4)', sources:['https://docs.fivem.net/docs/scripting-manual/runtimes/lua/', 'https://docs.fivem.net/natives/'], requirements:'Servidor FiveM propio o con autorización para instalar recursos. Crea una carpeta de recurso y un fxmanifest.lua; guarda el código como client.lua o server.lua según la ficha y añade ensure nombre_del_recurso en server.cfg. Los comandos de servidor restringidos requieren permiso ACE command.nombre (la consola del servidor tiene acceso).'},
  gameguardian: {name:'GameGuardian', device:'mobile', runtime:'GameGuardian · Lua en Android', sources:['https://gameguardian.net/help/classgg.html'], requirements:'GameGuardian instalado y un proceso seleccionado al que tengas acceso. Guarda como .lua y ábrelo desde Ejecutar script. Las búsquedas y lecturas requieren acceso al proceso; los resultados dependen de sus regiones de memoria.'},
  autotouch: {name:'AutoTouch', device:'mobile', runtime:'AutoTouch · Lua en iOS', sources:['https://docs.autotouch.net/lua/'], requirements:'AutoTouch instalado en un dispositivo iOS compatible. Guarda como .lua y ejecútalo desde AutoTouch. Abre primero la app de destino; los gestos usan proporciones de la resolución y requieren comprobar orientación y controles.'}
};
for (const [platform, entries] of Object.entries(library)) {
  const host = hosts[platform];
  for (const [slug, title, context, description, code] of entries) {
    const file = context === 'cliente' ? 'client.lua' : 'server.lua';
    const setup = platform === 'fivem'
      ? `-- Instalación: guarda este archivo como ${file} en un recurso FiveM.\n-- fxmanifest.lua (archivo separado):\n-- fx_version 'cerulean'\n-- game 'gta5'\n-- ${context === 'cliente' ? 'client_script' : 'server_script'} '${file}'\n-- En server.cfg: ensure nombre_del_recurso\n`
      : '-- Guarda como .lua y ejecuta desde ' + host.name + '.\n';
    catalog.push({
      id:`rcc_platform_${platform}_${slug}`, name:`${host.name}: ${title}`, description,
      level:'free', device:host.device, platform, type:'source', executors:[platform === 'fivem' ? `FiveM (${context})` : host.name],
      tags:['Original RCC', 'Script independiente', host.name, context], version:'1.0', created_at:'2026-10-30', file_extension:'lua',
      code:`-- RCC | ${host.name}: ${title}\n${setup}\n${code}\n`,
      compatibility:{environment:platform === 'fivem' ? `fivem-${context === 'cliente' ? 'client' : 'server'}` : platform,
        runtime:host.runtime, context:platform === 'fivem' ? `Recurso FiveM: ${file}; salida de cliente en consola F8 y de servidor en su consola.` : `Archivo .lua en ${host.name} (${context}).`,
        requirements:host.requirements, verification:'syntax-only', executor_status:'not-applicable',
        test_details:'Sintaxis Lua revisada automáticamente. No ejecutado en un servidor FiveM ni en dispositivos Android/iOS reales.',
        mobile_status:platform === 'fivem' ? 'FiveM requiere PC; este ejemplo no es para móvil.' : `Requiere ${context} y ${host.name}; sin prueba en dispositivo físico.`, sources:host.sources}
    });
  }
}
require('./catalog-store.cjs').writeCatalog(catalog);
fs.writeFileSync('netlify/functions/lib/catalog-ids.json', JSON.stringify(catalog.map(s => s.id)) + '\n');
console.log(`Added ${Object.values(library).reduce((sum, entries) => sum + entries.length, 0)} independent scripts. Catalog: ${catalog.length}.`);
