/* Bounded, on-demand question combinations. No remote code or generated AI answers. */
(() => {
  const answers={
    requirements:'loadstring convierte texto en código; HttpGet obtiene contenido remoto. El script puede depender de ambas funciones. Revisa el dispositivo, la versión y los requisitos del ejecutor. El aviso detecta esas palabras en el código; no garantiza compatibilidad ni seguridad.',
    downloads:'Abre Panel de ejecutores y elige una opción. Revisa el dominio y el aviso; espera diez segundos y pulsa «Sí, ir a la descarga» para continuar. Cancelar o cambiar de ejecutor reinicia la espera. RCC no aloja los ejecutables ni verifica esas descargas.',
    safety:'Las páginas externas pueden incluir anuncios, redirecciones y botones engañosos. Mantén el antivirus y las protecciones del navegador activos. Si aparece un bloqueo, detente y verifica el origen. Nunca compartas contraseñas, cookies ni tokens. Revisa el código remoto antes de usarlo; una imagen o una ficha no garantiza seguridad.',
    release:'RCC amplió la biblioteca con secciones de Roblox/Luau, Java, JavaScript y descubrimientos comunitarios para FiveM, GameGuardian, AutoTouch, Minecraft, Godot, Unity y Python. Novedades reúne publicaciones recientes, repositorios públicos y cambios editoriales; cada enlace conserva su fuente original y no implica que RCC haya probado el código. La personalización del fondo permite usar imágenes y GIF. El Buscador de mods APK está anunciado como Próximamente y todavía no está disponible.',
    catalogs:'RCC reúne catálogos de Roblox/Luau, FiveM, Java, JavaScript, GameGuardian, AutoTouch y repositorios públicos de Minecraft, Godot, Unity y Python. Usa Novedades para explorar publicaciones recientes y abre siempre la fuente original.',
    fivem:'Los recursos FiveM pueden usar Lua, JavaScript o C#. Consulta la documentación Cfx.re y los repositorios enlazados. Revisa framework, dependencias, fxmanifest.lua y licencia antes de instalar. RCC no ejecuta recursos externos.',
    java:'La sección Java contiene ejemplos educativos para JDK 17+. Java es diferente de JavaScript. Puedes explorar fundamentos, POO, colecciones, algoritmos, archivos y concurrencia; revisa cada ejemplo y compílalo en un entorno de prueba.',
    github:'Los descubrimientos de GitHub son metadatos y enlaces a repositorios públicos. Revisa licencia, actividad, issues, dependencias y código antes de reutilizar. Que un repositorio aparezca no significa que RCC lo haya auditado.',
    roblox:'Roblox utiliza Luau, derivado de Lua 5.1. Separa ejemplos para Roblox Studio de publicaciones de terceros para juegos. Consulta Creator Hub y revisa la ubicación Script/LocalScript y permisos.',
    games:'RCC está ampliando descubrimientos para Minecraft, Godot, Unity, GameGuardian y AutoTouch. Comprueba la versión del juego, el lenguaje, las dependencias y la licencia en la fuente original.',
    apk:'El Buscador de mods APK está anunciado como Próximamente. Aún no permite buscar ni descargar APK. Cuando esté disponible, RCC deberá mostrar fuentes, permisos, firma y advertencias de seguridad.',
    profiles:'El buscador público de perfiles está en la propuesta PR #113. Hasta que se revise y fusione, no lo presentes como una función ya publicada. Consulta Novedades para conocer su estado.',
    banner:'La corrección del banner animado y su vista previa está en la propuesta PR #112. Si aún ves desbordamiento, la corrección no se ha desplegado hasta que se fusione y publique.',
    admin:'El panel rápido de administración al mantener pulsado un usuario está en la propuesta PR #99. Las acciones administrativas deben respetar permisos y confirmaciones; no asumas que una función en revisión ya está activa.',
    chat:'Las mejoras del chat RCC incluyen notificaciones Web Push, mensajería de texto y avisos globales; están descritas en la propuesta PR #91 y requieren revisión y despliegue.',
    vip:'RCC Supporter utiliza una suscripción mensual. Si el acceso VIP no se actualiza, revisa que uses el mismo correo en RCC y Ko-fi y contacta con soporte; la corrección de sesión y herramientas de Jarvis está en la propuesta PR #70.',
    discord:'La propuesta PR #103 refuerza los permisos del bot RCC para reservar acciones administrativas al creador y a administradores autorizados. No compartas tokens ni permisos de administrador innecesarios.'
  };

  const groups={
    updates:[['¿Qué cambió en esta actualización?','release'],['¿Qué catálogos y lenguajes tiene RCC?','catalogs'],['¿Dónde encuentro scripts de FiveM?','fivem'],['¿Dónde encuentro ejemplos Java?','java'],['¿Qué es el Buscador de mods APK?','apk'],['¿Ya está el buscador de perfiles?','profiles'],['¿Qué pasa con el banner animado?','banner'],['¿Qué novedades hay en el panel admin?','admin'],['¿Qué mejoras tendrá el chat?','chat'],['¿Cómo funciona RCC Supporter?','vip'],['¿Qué cambia en el bot de Discord?','discord'],['¿Dónde veo los scripts añadidos?','updates'],['¿Por qué ya no hay reproductor de música?','release'],['¿Dónde están los ocho ejecutores?','executors'],['¿Qué significa el aviso de compatibilidad?','requirements']],
    features:[['¿Cómo busco perfiles?','profiles'],['¿Cómo cambio el banner?','banner'],['¿Qué puede hacer el panel de administración?','admin'],['¿Qué incluye el chat RCC?','chat'],['¿Cómo funciona Supporter?','vip'],['¿Qué permisos tiene el bot?','discord']],
    catalogs:[['¿Qué lenguajes incluye RCC?','release'],['¿Dónde busco Roblox y Luau?','roblox'],['¿Dónde encuentro recursos FiveM?','fivem'],['¿Dónde encuentro Java y JavaScript?','java'],['¿Dónde están los repositorios de GitHub?','github'],['¿Dónde veo Minecraft, Godot o Unity?','games'],['¿El código externo está probado por RCC?','safety']],
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
    if(/java|jdk|javase|javascript/.test(text))return {action:'java'};
    if(/github|repositorio|codigo fuente/.test(text))return {action:'github'};
    if(/roblox|luau|studio/.test(text))return {action:'roblox'};
    if(/minecraft|godot|unity|gameguardian|autotouch/.test(text))return {action:'games'};
    if(/apk|mods? de android|mod apk/.test(text))return {action:'apk'};
    if(/perfil|buscar usuarios|buscador de usuarios/.test(text))return {action:'profiles'};
    if(/banner|portada|foto de portada/.test(text))return {action:'banner'};
    if(/admin|administrador|mantener pulsado/.test(text))return {action:'admin'};
    if(/chat|mensaje|notificacion|web push/.test(text))return {action:'chat'};
    if(/vip|supporter|ko-fi|kofi/.test(text))return {action:'vip'};
    if(/discord|bot|jarvis/.test(text))return {action:'discord'};
    if(/novedades|scripts nuevos|scripts anadidos/.test(text))return {action:'updates'};
    return null;
  }
  window.RCCAssistantGuide={answers,sample,count,resolve};
})();
