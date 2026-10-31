/* Longest common subsequence, bounded to keep comparisons responsive. */
(() => {
  function compare(before, after) {
    if (before.length > 60000 || after.length > 60000) throw Error('Cada versión admite hasta 60.000 caracteres.');
    const lines = text => text === '' ? [] : text.replace(/\r\n?/g, '\n').split('\n');
    const a = lines(before), b = lines(after);
    if (a.length > 400 || b.length > 400) throw Error('Cada versión admite hasta 400 líneas. Reduce el fragmento para comparar.');
    const table = Array.from({length:a.length + 1}, () => new Uint16Array(b.length + 1));
    for (let i=a.length-1;i>=0;i--) for (let j=b.length-1;j>=0;j--) table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
    const result=[];let i=0,j=0;
    while(i<a.length || j<b.length) {
      if(i<a.length && j<b.length && a[i]===b[j]) {result.push({kind:'same',text:a[i++]});j++;}
      else if(j<b.length && (i===a.length || table[i][j+1]>table[i+1][j])) result.push({kind:'added',text:b[j++]});
      else result.push({kind:'removed',text:a[i++]});
    }
    return result;
  }
  window.RCCCompare = compare;
  const before=document.getElementById('compareBefore'),after=document.getElementById('compareAfter'),output=document.getElementById('compareResult'),status=document.getElementById('compareStatus');
  document.getElementById('compareRun').onclick=()=>{
    output.replaceChildren();output.hidden=true;
    try {
      const rows=compare(before.value,after.value);
      const added=rows.filter(r=>r.kind==='added').length,removed=rows.filter(r=>r.kind==='removed').length;
      status.textContent=added||removed?`${added} líneas añadidas; ${removed} eliminadas. + indica adición; − indica eliminación.`:'Las versiones son iguales.';
      const fragment=document.createDocumentFragment();
      for(const row of rows){const line=document.createElement('span');line.className='compare-'+row.kind;line.textContent=({added:'+ ',removed:'− ',same:'  '})[row.kind]+row.text+'\n';fragment.append(line);}
      output.append(fragment);output.hidden=!rows.length;
    } catch(error) {status.textContent=error.message;}
  };
  document.getElementById('compareClear').onclick=()=>{before.value='';after.value='';output.replaceChildren();output.hidden=true;status.textContent='Comparación vaciada.';before.focus();};
  // Modal content is created on demand; delegate to keep the tool available for every entry.
  const observer=new MutationObserver(()=>{
    const actions=document.querySelector('#modalBody .actions');
    if(!actions || actions.querySelector('[data-compare]'))return;
    const button=document.createElement('button');button.type='button';button.className='btn btn-ghost';button.dataset.compare='';button.textContent='Comparar con otra versión';
    button.onclick=()=>{before.value=document.getElementById('modalCode').textContent;after.value='';output.replaceChildren();output.hidden=true;status.textContent='Código cargado como versión anterior. Pega la nueva versión.';closeModal();const panel=document.getElementById('codeCompare');panel.open=true;panel.scrollIntoView({block:'start'});after.focus({preventScroll:true});};actions.append(button);
  });
  observer.observe(document.getElementById('modalBody'),{childList:true});
})();
