/* Loads the static catalog from root-relative, content-addressed JSON parts. */
(() => {
  const partPath=/^catalog\/part-\d{3,}-[a-f0-9]{16}\.json$/;
  async function load({onProgress=()=>{}}={}){
    const controller=new AbortController();
    const rootPath=file=>'/'+file.replace(/^\/+/, '');
    async function request(file,cache){
      const response=await fetch(rootPath(file),{cache,signal:controller.signal,credentials:'same-origin'});
      if(!response.ok)throw Error('HTTP '+response.status);
      return response.json();
    }
    async function json(file,{cache='no-cache',validate=()=>true}={}){
      let firstError;
      try{
        const data=await request(file,cache);
        if(validate(data))return data;
        firstError=Error('respuesta JSON con formato o cantidad inesperada');
      }catch(error){firstError=error;}
      // A cached response may be stale or corrupted. Retry once against the network.
      if(cache==='reload')throw firstError;
      try{
        const data=await request(file,'reload');
        if(validate(data))return data;
        throw Error('respuesta JSON con formato o cantidad inesperada');
      }catch(retryError){
        throw Error('No se pudo cargar una parte del catálogo: '+file+' ('+(retryError.message||firstError.message)+')');
      }
    }
    try{
      // The manifest changes between releases; always revalidate it.
      const manifest=await json('scripts.json',{cache:'no-cache',validate:data=>Array.isArray(data)||(data?.format==='rcc-catalog-v1'&&Number.isSafeInteger(data.total)&&data.total>=0&&Array.isArray(data.parts)&&data.parts.length<=1000)});
      if(Array.isArray(manifest))return manifest;
      const files=new Set();
      for(const part of manifest.parts){
        if(!part||typeof part.file!=='string'||!partPath.test(part.file)||files.has(part.file)||!Number.isSafeInteger(part.count)||part.count<1||!Number.isSafeInteger(part.bytes)||part.bytes<2||part.bytes>2*1024*1024)throw Error('Parte de catálogo inválida: '+(part?.file||'sin nombre'));
        files.add(part.file);
      }
      if(manifest.parts.reduce((sum,part)=>sum+part.count,0)!==manifest.total)throw Error('Recuento de catálogo inválido');
      const results=new Array(manifest.parts.length);
      let cursor=0,loaded=0;
      onProgress({loaded,total:manifest.total});
      async function worker(){
        while(cursor<manifest.parts.length){
          const index=cursor++,part=manifest.parts[index];
          const rows=await json(part.file,{cache:'force-cache',validate:data=>Array.isArray(data)&&data.length===part.count});
          if(rows.some(row=>!row||typeof row.id!=='string'||typeof row.code!=='string'))throw Error('Registros inválidos en '+part.file);
          results[index]=rows;loaded+=rows.length;onProgress({loaded,total:manifest.total});
        }
      }
      await Promise.all(Array.from({length:Math.min(3,manifest.parts.length)},worker));
      const rows=results.flat();
      if(rows.length!==manifest.total||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Catálogo incompleto o duplicado');
      return rows;
    }catch(error){controller.abort();throw error;}
  }
  window.RCCCatalogLoader={load};
})();
