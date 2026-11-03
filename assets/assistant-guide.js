/* Bounded, on-demand question combinations. No remote code or generated AI answers. */
(() => {
  const answers={
    requirements:'loadstring convierte texto en código; HttpGet obtiene contenido remoto. El script puede depender de ambas funciones. Revisa el dispositivo, la versión y los requisitos del ejecutor. El aviso detecta esas palabras en el código; no garantiza compatibilidad ni seguridad.',
    downloads:'Abre Panel de ejecutores y elige una opción. Revisa el dominio y el aviso; espera diez segundos y pulsa «Sí, ir a la descarga» para continuar. Cancelar o cambiar de ejecutor reinicia la espera. RCC no aloja los ejecutables ni verifica esas descargas.',
    safety:'Las páginas externas pueden incluir anuncios, redirecciones y botones engañosos. Mantén el antivirus y las protecciones del navegador activos. Si aparece un bloqueo, detente y verifica el origen. Nunca compartas contraseñas, cookies ni tokens. Revisa el código remoto antes de usarlo; una imagen o una ficha no garantiza seguridad.',
    release:'Esta actualización incorpora avisos en fichas y modales para loadstring/HttpGet, un panel de ocho ejecutores con confirmación y espera de diez segundos, y nuevas animaciones de fondo. El catálogo también incluye publicaciones recientes con imágenes de referencia y fuentes sin verificar. Se retiraron el audio de fondo y el reproductor. Usa Novedades para consultar las fichas añadidas.'
  };
  const groups={
    updates:[['¿Qué cambió en esta actualización?','release'],['¿Dónde veo los scripts añadidos?','updates'],['¿Por qué ya no hay reproductor de música?','release'],['¿Dónde están los ocho ejecutores?','executors'],['¿Qué significa el aviso de compatibilidad?','requirements']],
    safety:[['¿Qué hago si Windows bloquea la descarga?','safety'],['¿Es seguro desactivar el antivirus?','safety'],['¿Cómo evito botones de descarga engañosos?','safety'],['¿Qué riesgos tiene el código remoto?','safety'],['¿Los ejecutores están verificados?','executors'],['¿Por qué tengo que esperar diez segundos?','downloads'],['¿Cómo cancelo una descarga?','downloads'],['¿Qué son loadstring y HttpGet?','requirements'],['¿La foto del juego garantiza seguridad?','safety']],
    navigation:[['¿Cómo busco código?','search'],['¿Me recomiendas algo del catálogo?','recommend'],['¿Cómo filtro por plataforma?','filters'],['¿Dónde cambio el fondo y las animaciones?','appearance'],['¿Dónde comparo o analizo código?','tools'],['¿Dónde veo mis favoritos?','favorites'],['¿Qué copié recientemente?','recent'],['¿Dónde están las tendencias?','trending'],['¿Cómo limpio los filtros?','clear'],['¿Cómo vuelvo a ver la presentación?','guide'],['¿Dónde veo ejemplos animados?','motion']]
  };
  // 24 phrasings per published title; never allocate the full question bank.
  const templates=[
    '¿Dónde encuentro {s}?','¿Puedes buscar {s}?','¿Me muestras {s}?','¿Hay una ficha de {s}?','¿Cómo localizo {s}?','Quiero explorar {s}',
    'Busca en RCC: {s}','Muéstrame el código publicado de {s}','¿Dónde reviso los requisitos de {s}?','¿Dónde consulto la fuente de {s}?','¿Dónde leo el código de {s}?','Quiero revisar la ficha de {s}',
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
    const text=key.replace(/[¿?¡!]/g,'').trim();
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
    if(/que cambio|actualizacion|musica|reproductor/.test(text))return {action:'release'};
    if(/novedades|scripts nuevos|scripts anadidos/.test(text))return {action:'updates'};
    return null;
  }
  window.RCCAssistantGuide={answers,sample,count,resolve};
})();
