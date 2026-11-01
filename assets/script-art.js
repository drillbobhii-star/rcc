/* Original code-native reference artwork derived from catalog metadata. */
(() => {
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function profile(script) {
    const text=normalize([script.name,...(script.tags||[])].join(' '));
    const kinds=[
      ['math',/suma|resta|multiplica|divide|calculadora|promedio|porcentaje|temperatura/,'Cálculo y resultados'],
      ['inventory',/inventar|inventory|backpack|mochila/,'Organiza objetos'],
      ['interface',/button|boton|interfaz|\bui\b|menu|panel|hud/,'Interfaz e interacción'],
      ['motion',/teleport|speed|velocidad|movimiento|animaci|orbit|fly|vuelo/,'Movimiento y animación'],
      ['health',/health|salud|vida|damage|dano|godmode/,'Estado del personaje'],
      ['data',/datos|data|filter|filtro|sort|tabla|array|json|pipeline/,'Procesamiento de datos'],
      ['currency',/coin|moneda|dinero|cash|shop|tienda/,'Economía del proyecto']
    ];
    if(script.type==='loadstring')return {kind:'remote',label:'Loader externo',note:'Descarga código remoto. Funciones y compatibilidad sin comprobar.'};
    const match=kinds.find(([,pattern])=>pattern.test(text));
    return {kind:match?.[0]||'code',label:match?.[2]||'Código para tu proyecto',note:script.description||'Abre la ficha para consultar su función y los requisitos.'};
  }
  function create(script,compact=false) {
    const info=profile(script),art=document.createElement('div');art.className='script-art'+(compact?' script-art-detail':'');art.dataset.art=info.kind;
    art.setAttribute('role','img');art.setAttribute('aria-label',`Ilustración de referencia: ${script.name}. ${info.note}`);
    const heading=document.createElement('div');heading.className='script-art-heading';
    const category=document.createElement('span');category.textContent=info.label;
    const mark=document.createElement('span');mark.textContent='RCC / REF';heading.append(category,mark);
    const diagram=document.createElement('div');diagram.className='script-art-diagram';diagram.setAttribute('aria-hidden','true');
    diagram.innerHTML='<i></i><i></i><i></i><span></span><b></b>';
    diagram.querySelector('span').textContent=({math:'Σ',inventory:'▦',interface:'▣',motion:'↗',health:'+',data:'[ ]',currency:'$',remote:'↓'})[info.kind]||'{ }';
    const title=document.createElement('strong');title.className='script-art-title';title.textContent=script.name;
    const caption=document.createElement('span');caption.className='script-art-caption';caption.textContent=info.note;
    const label=document.createElement('small');label.className='script-art-label';label.textContent='ILUSTRACIÓN · NO ES UNA CAPTURA';
    art.append(heading,diagram,title,caption,label);return art;
  }
  window.RCCScriptArt={create,profile};
})();
