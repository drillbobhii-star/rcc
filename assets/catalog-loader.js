/* Loads the complete static catalog in small, versioned parts (three requests at a time). */
(() => {
  const partPath=/^catalog\/part-\d{3,}-[a-f0-9]{16}\.json$/;
  async function load({onProgress=()=>{}}={}){
    const controller=new AbortController();
    async function json(file){
      const response=await fetch(file,{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw Error('No se pudo cargar una parte del catálogo');
      return response.json();
    }
    try{
      const manifest=await json('scripts.json');
      if(Array.isArray(manifest))return manifest;
      if(manifest?.format!=='rcc-catalog-v1'||!Number.isSafeInteger(manifest.total)||manifest.total<0||!Array.isArray(manifest.parts)||manifest.parts.length>1000)throw Error('Índice de catálogo inválido');
      const files=new Set();
      for(const part of manifest.parts){
        if(!partPath.test(part.file)||files.has(part.file)||!Number.isSafeInteger(part.count)||part.count<1||!Number.isSafeInteger(part.bytes)||part.bytes<2||part.bytes>2*1024*1024)throw Error('Parte de catálogo inválida');
        files.add(part.file);
      }
      if(manifest.parts.reduce((sum,part)=>sum+part.count,0)!==manifest.total)throw Error('Recuento de catálogo inválido');
      const results=new Array(manifest.parts.length);
      let cursor=0,loaded=0;
      onProgress({loaded,total:manifest.total});
      async function worker(){
        while(cursor<manifest.parts.length){
          const index=cursor++,part=manifest.parts[index];
          const rows=await json(part.file);
          if(!Array.isArray(rows)||rows.length!==part.count)throw Error('Parte incompleta del catálogo');
          results[index]=rows;loaded+=rows.length;onProgress({loaded,total:manifest.total});
        }
      }
      await Promise.all(Array.from({length:Math.min(3,manifest.parts.length)},worker));
      const rows=results.flat();
      if(rows.length!==manifest.total||rows.some(row=>!row||typeof row.id!=='string'||typeof row.code!=='string')||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Catálogo incompleto o duplicado');
      return rows;
    }catch(error){controller.abort();throw error;}
  }
  window.RCCCatalogLoader={load};
})();
