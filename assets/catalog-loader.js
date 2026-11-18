// Show the first part before fetching the rest; keep work between batches interruptible.
(() => {
  const partPath=/^catalog\/part-\d{3,}-[a-f0-9]{16}\.json$/;
  const rootPath=file=>'/'+file.replace(/^\/+/, '');
  async function request(file,cache){
    const response=await fetch(rootPath(file),{cache,signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`Error ${response.status}: ${file}`);
    return response.json();
  }
  async function json(file){return request(file,'no-cache');}
  async function part(file){
    try{return await request(file,'force-cache');}
    catch{return request(file,'reload');}
  }
  const pause=()=>new Promise(resolve=>{
    if(window.requestIdleCallback)window.requestIdleCallback(resolve,{timeout:300});
    else setTimeout(resolve,32);
  });
  window.RCCCatalogLoader={
    async load({onProgress,onBatch}={}){
      const manifest=await json('scripts.json');
      if(manifest.format!=='rcc-catalog-v1'||!Array.isArray(manifest.parts)||!Number.isInteger(manifest.total))throw Error('Manifiesto inválido');
      for(const entry of manifest.parts){
        if(!partPath.test(entry.file)||!Number.isInteger(entry.count)||entry.count<1)throw Error('Parte de catálogo inválida');
      }
      if(manifest.parts.reduce((n,p)=>n+p.count,0)!==manifest.total)throw Error('Total de catálogo inválido');
      const all=[],ids=new Set();
      let offset=0;
      let unlock;
      const demand=new Promise(resolve=>{unlock=resolve;});
      const more=typeof document!=='undefined'?document.createElement('button'):{addEventListener(){},remove(){}};more.type='button';more.className='btn btn-ghost';more.textContent='Cargar catálogo completo';
      const start=()=>{unlock();globalThis.document?.removeEventListener('rcc:catalog-demand',start);more.remove();globalThis.document?.getElementById('search')?.removeEventListener('input',start);};
      more.addEventListener('click',start);
      if(typeof location!=='undefined'&&new URLSearchParams(location.hash.slice(1)).has('script'))start();
      globalThis.document?.addEventListener('rcc:catalog-demand',start,{once:true});
      globalThis.document?.getElementById('search')?.addEventListener('input',start,{once:true});
      globalThis.document?.querySelector('.catalog-tools')?.append(more);

      while(offset<manifest.parts.length){
        // The first part unlocks the interface; later requests have bounded parallelism.
        if(offset===1&&typeof document!=='undefined')await demand;
        const batch=manifest.parts.slice(offset,offset+(offset===0?1:2));
        const results=await Promise.all(batch.map(async entry=>{
          try{
            const rows=await part(entry.file);
            if(!Array.isArray(rows)||rows.length!==entry.count)throw Error('Recuento inválido');
            return rows;
          }catch(error){throw Error('No se pudo cargar una parte del catálogo',{cause:error});}
        }));
        for(const rows of results)for(const row of rows){
          if(!row||typeof row.id!=='string'||ids.has(row.id))throw Error('Identificador de catálogo inválido');
          ids.add(row.id);all.push(row);
        }
        offset+=batch.length;
        onBatch?.({scripts:all.slice(),total:manifest.total,complete:offset===manifest.parts.length});
        onProgress?.({loaded:all.length,total:manifest.total});
        if(onBatch&&offset<manifest.parts.length)await pause();
      }
      return all;
    }
  };
})();
