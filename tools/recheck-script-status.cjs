// Editorial catalog refresh: metadata and aggregate comment signals, never remote code.
const fs=require('node:fs');
const {readCatalog,writeCatalog}=require('./catalog-store.cjs');
async function main(){
  await import('../assets/review-signals.js');
  const rows=readCatalog(),stamp=new Date().toISOString();
  const report={checkedAt:stamp,requested:0,reviewed:0,unavailable:0,commentThreads:0,commentsRead:0,partialThreads:0,rsPages:0};
  async function json(url){
    for(let attempt=0;attempt<2;attempt++)try{
      const r=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!r.ok){const e=Error('HTTP '+r.status);e.status=r.status;throw e;}
      return await r.json();
    }catch(error){if(attempt||[403,404,429].includes(error.status))throw error;}
  }
  const scripts=rows.filter(s=>s.id.startsWith('games_sb_'));let cursor=0,limited=false;
  async function worker(){while(cursor<scripts.length&&!limited){
    const script=scripts[cursor++],source=script.review?.source||script.compatibility?.sources?.find(u=>u.startsWith('https://scriptblox.com/script/'));
    if(!source?.startsWith('https://scriptblox.com/script/'))continue;
    report.requested++;
    try{
      const data=await json('https://scriptblox.com/api/script/'+encodeURIComponent(source.split('/').pop())),row=data.script;
      if(row?._id!==script.id.slice(9))throw Error('Mismatched publication');
      const review=script.review||{};
      review.status=row.isPatched===true?'patched':row.isPatched===false?'source-unpatched':'unknown';review.checkedAt=stamp;review.provider='ScriptBlox';review.source=source;
      const updated=row.contentUpdatedAt||(row.lastUpdateBy==='edit'?row.lastUpdate:null);
      if(updated&&Number.isFinite(Date.parse(updated))){review.sourceUpdatedAt=new Date(updated).toISOString();review.updateAvailable=Date.parse(updated)>Date.parse(script.created_at);}
      script.review=review;report.reviewed++;
      let comments=[],complete=false;
      try{
        for(let page=1;page<=20;page++){
          const d=await json('https://scriptblox.com/api/comment/'+row._id+'?page='+page);
          if(!Array.isArray(d.result?.comments))throw Error('Unexpected comments');
          comments.push(...d.result.comments);
          if(page>=d.result.totalPages||!d.result.comments.length){complete=true;break;}
        }
        // Store counts only: no account details or untrusted comment text.
        review.externalComments={...globalThis.RCCReviewSignals.summarize(comments),checkedAt:stamp,complete};
        review.commentsStatus=complete?'reviewed':'partial';report.commentThreads++;report.commentsRead+=comments.length;if(!complete)report.partialThreads++;
      }catch(error){review.commentsStatus='unavailable';if(error.status===429)limited=true;}
    }catch(error){report.unavailable++;if(error.status===429)limited=true;}
    if(cursor%500===0)console.log(`${cursor} publicaciones consultadas; ${report.commentThreads} hilos leídos`);
  }}
  await Promise.all(Array.from({length:5},worker));
  const rs=new Map(rows.filter(s=>s.id.startsWith('games_rs_')).map(s=>[s.id,s]));const matched=new Set();
  for(let page=1;page<=300;page++){
    let data;try{data=await json('https://rscripts.net/api/v2/scripts?page='+page+'&orderBy=date&sort=desc');}catch{report.unavailable++;break;}
    if(!Array.isArray(data.scripts)||!data.scripts.length)break;report.rsPages++;
    for(const row of data.scripts){const s=rs.get('games_rs_'+row._id);if(!s||matched.has(s.id))continue;matched.add(s.id);
      s.review={...s.review,status:row.isPatched===true?'patched':row.isPatched===false?'source-unpatched':'unknown',checkedAt:stamp};report.reviewed++;
    }
    if(matched.size===rs.size||page>=data.info?.maxPages)break;
  }
  writeCatalog(rows);
  const audit=JSON.parse(fs.readFileSync('assets/catalog-audit.json','utf8'));
  audit.latestReview=report;audit.patched=rows.filter(s=>s.review?.status==='patched').length;
  audit.comments='Se leyeron los comentarios públicos accesibles de ScriptBlox; RScripts no ofreció un endpoint de comentarios accesible en esta revisión. Los reportes son orientativos, no pruebas de ejecución.';
  fs.writeFileSync('assets/catalog-audit.json',JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify({...report,patched:audit.patched}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
