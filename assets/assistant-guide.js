/* Bounded, on-demand question combinations. No remote code or generated AI answers. */
(() => {
  const answers={
    requirements:'loadstring convierte texto en código; HttpGet obtiene contenido remoto. El script puede depender de ambas funciones. Revisa el dispositivo, la versión y los requisitos del ejecutor. El aviso detecta esas palabras en el código; no garantiza compatibilidad ni seguridad.',
    downloads:'Abre Panel de ejecutores y elige una opción. Revisa el dominio y el aviso; espera diez segundos y pulsa «Sí, ir a la descarga» para continuar. Cancelar o cambiar de ejecutor reinicia la espera. RCC no aloja los ejecutables ni verifica esas descargas.',
    safety:'Las páginas externas pueden incluir anuncios, redirecciones y botones engañosos. Mantén el antivirus y las protecciones del navegador activos. Si aparece un bloqueo, detente y verifica el origen. Nunca compartas contraseñas, cookies ni tokens. Revisa el código remoto antes de usarlo; una imagen o una ficha no garantiza seguridad.',
    release:'RCC reúne catálogos de Roblox/Luau, FiveM, Java, JavaScript y recursos para otros juegos y herramientas. Durante el regalo comunitario, el contenido que antes estaba reservado a Supporter queda abierto sin suscripción. Solo necesitas iniciar sesión para abrir, copiar o descargar el código. También puedes personalizar el fondo del panel con una imagen o GIF, colocar un logo, editar tu perfil, usar el chat privado y consultar las herramientas de la comunidad. Verifica siempre la fuente externa y sus requisitos.',
    catalogs:'RCC reúne siete áreas principales: Roblox/Luau, FiveM, GameGuardian, AutoTouch, JavaScript/Web, Java JDK 17+ y Universal. También hay colecciones para otros juegos y herramientas. Las nuevas fichas de repositorios públicos enlazan el archivo original, conservan los datos de licencia y no implican que RCC haya descargado, copiado, ejecutado o auditado el código.',
    fivem:'El catálogo FiveM admite recursos Lua, JavaScript y C# para ESX, QBCore, Qbox y servidores standalone. Revisa fxmanifest.lua, framework, dependencias, versión de FXServer, licencia y precio en la ficha original. Los recursos enlazados externamente no se descargan ni ejecutan desde RCC.',
    gameguardian:'La sección GameGuardian de RCC se centra en plantillas de aprendizaje, documentación, ejemplos de Lua y utilidades de referencia. Revisa la versión de Android, la licencia y los permisos. No incorporamos herramientas para robar cuentas, evadir protecciones, hacer bypass, ocultar malware o distribuir trampas.',
    autotouch:'AutoTouch permite automatizar tareas en iOS con Lua. Revisa la versión de AutoTouch, los permisos y las condiciones de uso de la aplicación que automatizas. Los ejemplos enlazados son referencias externas; RCC no los ejecuta ni garantiza que funcionen en todos los dispositivos.',
    web:'El catálogo JavaScript / Web reúne ejemplos para navegador, HTML, CSS, extensiones y userscripts. Comprueba los permisos que solicita cada script, el dominio donde se ejecuta, las dependencias y su licencia. No instales código que capture contraseñas, cookies o tokens.',
    universal:'Universal reúne ejemplos reutilizables de Lua, Python, Shell y PowerShell que no pertenecen a un juego específico. Comprueba el sistema operativo, intérprete, versión, permisos y dependencias indicados por cada ficha.',
    java:'La sección Java contiene ejemplos educativos para JDK 17+. Java es diferente de JavaScript. Puedes explorar fundamentos, POO, colecciones, algoritmos, archivos y concurrencia; revisa cada ejemplo y compílalo en un entorno de prueba.',
    github:'Los descubrimientos de GitHub son metadatos y enlaces a repositorios públicos. Revisa licencia, actividad, issues, dependencias y código antes de reutilizar. Que un repositorio aparezca no significa que RCC lo haya auditado.',
    roblox:'Roblox utiliza Luau, derivado de Lua 5.1. Separa ejemplos para Roblox Studio de publicaciones de terceros para juegos. RCC puede mostrar fichas públicas de ScriptBlox y RobloxScripts.com; estas últimas requieren atribución a robloxscripts.com y permanecen sin verificar por RCC. Consulta Creator Hub y revisa la ubicación Script/LocalScript y permisos.',
    games:'RCC está ampliando descubrimientos para Minecraft, Godot, Unity, GameGuardian y AutoTouch. Comprueba la versión del juego, el lenguaje, las dependencias y la licencia en la fuente original.',
    apk:'El Buscador de mods APK está anunciado como Próximamente. Aún no permite buscar ni descargar APK. Cuando esté disponible, RCC deberá mostrar fuentes, permisos, firma y advertencias de seguridad.',
    profiles:'Puedes acceder a los perfiles de la comunidad, revisar la información pública de sus miembros y personalizar tu propio espacio. Para editar tu perfil, inicia sesión y abre el control de tu cuenta. Las opciones disponibles pueden depender de los datos que hayas completado.',
    banner:'Puedes personalizar tu perfil con una foto, un fondo de perfil y un banner. En el editor de perfil selecciona una imagen o GIF compatible, comprueba la vista previa y guarda los cambios. Ajusta la posición para evitar que la imagen se vea cortada o sobresalga.',
    admin:'El panel de administración reúne herramientas para gestionar miembros y moderar la comunidad. Las acciones sensibles deben ejecutarse únicamente con permisos de administrador y conservar sus confirmaciones. El acceso al panel administrativo sigue restringido a las cuentas autorizadas.',
    chat:'RCC incluye mensajería privada entre miembros y soporte, con avisos de nuevos mensajes y opción de activar notificaciones en el dispositivo cuando el navegador lo admite. Inicia sesión para abrir el chat. Si el creador pausa la mensajería global, el chat mostrará el aviso correspondiente.',
    vip:'¡Sorpresa! RCC está en modo regalo para la comunidad: por ahora no necesitas pagar ni tener una membresía Supporter para consultar los catálogos y acceder al contenido. La cuenta y los registros de Supporter se conservan para una posible reactivación futura. Solo es obligatorio iniciar sesión para ver, copiar o descargar scripts.',
    appearance:'En el panel principal puedes elegir una foto o GIF animado como fondo, ajustar cómo encaja, cambiar su posición e intensidad y superponer el logo RCC o uno propio. Pulsa «Fondo y logo» para abrir el editor. Inicia sesión para guardar la personalización en tu cuenta.',
    discord:'El bot RCC ayuda a gestionar y moderar la comunidad desde Discord. Sus acciones administrativas deben quedar limitadas al creador y a los administradores autorizados. Nunca compartas el token del bot ni concedas permisos de administrador innecesarios.'
  };

  const groups={
    updates:[['¿Qué cambió en esta actualización?','release'],['¿Qué catálogos y lenguajes tiene RCC?','catalogs'],['¿Dónde encuentro scripts de FiveM?','fivem'],['¿Dónde encuentro scripts GameGuardian?','gameguardian'],['¿Dónde encuentro automatizaciones AutoTouch?','autotouch'],['¿Dónde encuentro scripts JavaScript para web?','web'],['¿Dónde encuentro scripts universales?','universal'],['¿Dónde encuentro ejemplos Java?','java'],['¿Qué es el Buscador de mods APK?','apk'],['¿Ya está el buscador de perfiles?','profiles'],['¿Qué pasa con el banner animado?','banner'],['¿Qué novedades hay en el panel admin?','admin'],['¿Qué mejoras tendrá el chat?','chat'],['¿Cómo funciona RCC Supporter?','vip'],['¿Qué cambia en el bot de Discord?','discord'],['¿Dónde veo los scripts añadidos?','updates'],['¿Por qué ya no hay reproductor de música?','release'],['¿Dónde están los ocho ejecutores?','executors'],['¿Qué significa el aviso de compatibilidad?','requirements']],
    features:[['¿Cómo busco perfiles?','profiles'],['¿Cómo personalizo mi perfil?','profiles'],['¿Cómo cambio el fondo del panel?','appearance'],['¿Cómo cambio el banner?','banner'],['¿Qué puede hacer el panel de administración?','admin'],['¿Qué incluye el chat RCC?','chat'],['¿Cómo funciona Supporter?','vip'],['¿Qué permisos tiene el bot?','discord'],['¿Cómo personalizo el fondo del panel?','appearance'],['¿Cómo cambio mi foto o banner?','banner'],['¿Cómo funciona el regalo comunitario?','vip']],
    catalogs:[['¿Qué lenguajes incluye RCC?','release'],['¿Dónde busco Roblox y Luau?','roblox'],['¿Qué incluye GameGuardian?','gameguardian'],['¿Qué incluye AutoTouch?','autotouch'],['¿Qué scripts hay para JavaScript y Web?','web'],['¿Qué es el catálogo Universal?','universal'],['¿Qué es RobloxScripts.com?','roblox'],['¿Dónde encuentro recursos FiveM?','fivem'],['¿Dónde encuentro Java y JavaScript?','java'],['¿Dónde están los repositorios de GitHub?','github'],['¿Dónde veo Minecraft, Godot o Unity?','games'],['¿El código externo está probado por RCC?','safety']],
    safety:[['¿Qué hago si Windows bloquea la descarga?','safety'],['¿Es seguro desactivar el antivirus?','safety'],['¿Cómo evito botones de descarga engañosos?','safety'],['¿Qué riesgos tiene el código remoto?','safety'],['¿Los ejecutores están verificados?','executors'],['¿Por qué tengo que esperar diez segundos?','downloads'],['¿Cómo cancelo una descarga?','downloads'],['¿Qué son loadstring y HttpGet?','requirements'],['¿La foto del juego garantiza seguridad?','safety']],
    navigation:[['¿Cómo busco código?','search'],['¿Me recomiendas algo del catálogo?','recommend'],['¿Cómo filtro por plataforma?','filters'],['¿Dónde cambio el fondo y las animaciones?','appearance'],['¿Dónde comparo o analizo código?','tools'],['¿Dónde veo mis favoritos?','favorites'],['¿Qué copié recientemente?','recent'],['¿Dónde están las tendencias?','trending'],['¿Cómo limpio los filtros?','clear'],['¿Cómo vuelvo a ver la presentación?','guide'],['¿Dónde veo ejemplos animados?','motion']]
  };
  // 24 phrasings per published title; never allocate the full question bank.
  const templates=[
    '¿Dónde encuentro {s}?','¿Puedes buscar {s}?','¿Me muestras {s}?','¿Hay una ficha de {s}?','¿Cómo localizo {s}?','Quiero explorar {s}',
    'Busca en RCC: {s}','Muéstrame el código publicado de {s}','¿Dónde reviso los requisitos de {s}?','¿Dónde consulto las funciones de {s}?','¿Dónde leo el código de {s}?','Quiero revisar la ficha de {s}',
    '¿Dónde compruebo la plataforma de {s}?','¿Dónde veo las etiquetas de {s}?','¿Dónde reviso la descripción de {s}?','¿Cómo encuentro la publicación de {s}?','Busca la ficha llamada {s}','¿Qué muestra el catálogo sobre {s}?',
    '¿Dónde puedo revisar {s} antes de usarlo?','Quiero comprobar los detalles de {s}','¿Puedes localizar la entrada {s}?','Abre una búsqueda para {s}','¿Dónde verifico el entorno indicado para {s}?','Quiero consultar los avisos de {s}'
  ];
  const fixed=topic=>(topic==='all'?Object.values(groups).flat():groups[topic]||[]).map(([label,action])=>({label,action}));
  const count=(subjects,topic='all')=>fixed(topic).length+(['all','catalog'].includes(topic)?subjects.length*templates.length:0);
  function sample(subjects,topic='all',limit=4,random=Math.random) {
    const base=fixed(topic),total=count(subjects,topic),chosen=new Set(),result=[];
    const take=index=>{
      if(index<base.length)return base[index];
      const offset=index-base.length,subject=subjects[Math.floor(offset/templates.length)];
      return {label:templates[offset%templates.length].replace('{s}',subject),query:subject};
    };
    // At least one help prompt in the mixed set, including while the catalog loads.
    if(topic==='all'&&base.length){const i=Math.floor(random()*base.length);chosen.add(i);result.push(take(i));}
    while(result.length<Math.min(limit,total)) {
      let i=Math.floor(random()*total);
      while(chosen.has(i))i=(i+1)%total;
      chosen.add(i);result.push(take(i));
    }
    return result;
  }
  function resolve(key) {
    const text=key.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[¿?¡!]/g,'').trim().toLowerCase();
    for(const item of fixed('all')) {
      const label=item.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!]/g,'');
      if(text===label)return item;
    }
    if(/^(preguntas|sugerencias|otras preguntas|sorprendeme)$/.test(text))return {action:'questions'};
    for(const template of templates) {
      const normalized=template.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!]/g,'');
      const [start,end]=normalized.split('{s}');
      if(text.startsWith(start)&&text.endsWith(end)&&text.length>start.length+end.length) {
        return {query:text.slice(start.length,end?-end.length:undefined).trim()};
      }
    }
    if(/loadstring|httpget|compatibilidad|ejecutor.*compatible/.test(text))return {action:'requirements'};
    if(/antivirus|anuncios|advertencia|riesgo|segur[oa]|bloquea|contrasena|cookies|tokens/.test(text))return {action:'safety'};
    if(/descarg|temporizador|diez segundos|10 segundos/.test(text))return {action:'downloads'};
    if(/ejecutor|solara|wave|xeno|velocity|delta|arceus|codex|vega/.test(text))return {action:'executors'};
    if(/que cambio|actualizacion|musica|reproductor|novedades/.test(text))return {action:'release'};
    if(/five.?m|fivem|cfx|qbcore|esx/.test(text))return {action:'fivem'};
    if(/game.?guardian|gameguardian|game guardian|gg script|gg lua/.test(text))return {action:'gameguardian'};
    if(/auto.?touch|autotouch|automatizacion ios|ios lua/.test(text))return {action:'autotouch'};
    if(/javascript|user.?script|tampermonkey|greasemonkey|html|css|web script|navegador/.test(text))return {action:'web'};
    if(/universal|lua general|python|powershell|shell script/.test(text))return {action:'universal'};
    if(/java|jdk|javase/.test(text))return {action:'java'};
    if(/github|repositorio|codigo fuente/.test(text))return {action:'github'};
    if(/roblox|luau|studio/.test(text))return {action:'roblox'};
    if(/minecraft|godot|unity|gameguardian|autotouch/.test(text))return {action:'games'};
    if(/apk|mods? de android|mod apk/.test(text))return {action:'apk'};
    if(/perfil|buscar usuarios|buscador de usuarios|foto de perfil|mi cuenta/.test(text))return {action:'profiles'};
    if(/fondo|pantalla|personaliz|imagen de fondo|gif/.test(text))return {action:'appearance'};
    if(/banner|portada|foto de portada/.test(text))return {action:'banner'};
    if(/admin|administrador|mantener pulsado/.test(text))return {action:'admin'};
    if(/chat|mensaje|notificacion|web push/.test(text))return {action:'chat'};
    if(/vip|supporter|ko-fi|kofi|regalo|community gift/.test(text))return {action:'vip'};
    if(/discord|bot|jarvis/.test(text))return {action:'discord'};
    if(/novedades|scripts nuevos|scripts anadidos/.test(text))return {action:'updates'};
    return null;
  }
  window.RCCAssistantGuide={answers,sample,count,resolve};
})();
