// Publish licensed source files from independent, commit-pinned repositories.
// Archives are inspected as data. Third-party code is never executed.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readCatalog,writeCatalog}=require('./catalog-store.cjs');
const {CATEGORIES,makeEntry,suspiciousCode}=require('./import-github-resources.cjs');
const SOURCES=[
 ['TheAlgorithms/Python','universal',2500],
 ['TheAlgorithms/Java','java',2000],
 ['trekhleb/javascript-algorithms','web',1200],

 ['Roblox/roact','roblox',500],
 ['Roblox/rodux','roblox',300],
 ['overextended/ox_lib','fivem',500],
 ['qbcore-framework/qb-core','fivem',400],
 ['qbox-project/qbx_core','fivem',400],
 ['eugenp/tutorials','java',14000]
];
const hash=code=>crypto.createHash('sha256').update(code.replace(/\r\n/g,'\n').trim()).digest('hex');
function sourceBody(code){const marker=code.indexOf('RCC source attribution');if(marker<0)return code;const start=code.lastIndexOf('\n',marker)+1,end=code.indexOf('\n\n',marker);return end<0?code:code.slice(0,start)+code.slice(end+2);}
function main(){
 const rows=readCatalog(),before=rows.length,ids=new Set(rows.map(r=>r.id)),urls=new Set(rows.map(r=>r.source_url).filter(Boolean));
 const hashes=new Set(rows.filter(r=>!r.source_only).map(r=>r.source_code_sha256||hash(sourceBody(r.code))));
 const reportPath=path.join(__dirname,'../assets/source-import-report.json');
 const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):null;
 const report={checkedAt:new Date().toISOString(),before:previous?.before??before,sources:[]};
 for(const [repo,key,max] of SOURCES){
  try{
   const payload=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-source-archive.py'),repo,key,String(max),'/tmp/rcc-source-archives'],{maxBuffer:128*1024*1024,timeout:240000,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
   const category=CATEGORIES.find(c=>c.key===key);let added=0,duplicates=0,rejected=0;
   for(const file of payload.files){
    const digest=hash(file.content),branchUrl='https://github.com/'+repo+'/blob/'+payload.repo.default_branch+'/'+file.path.split('/').map(encodeURIComponent).join('/');
    const originalUrl='https://github.com/'+repo+'/blob/'+payload.repo.default_branch+'/'+file.path;
    if(hashes.has(digest)||urls.has(branchUrl)||urls.has(originalUrl)){duplicates++;continue;}
    if(suspiciousCode(category,file.content)){rejected++;continue;}
    const entry=makeEntry(category,payload.repo,file,report.checkedAt,{content:file.content,licenseText:payload.licenseText,spdx:payload.spdx});
    if(ids.has(entry.id)){duplicates++;continue;}
    entry.source_code_sha256=digest;entry.source_commit=payload.commit;entry.license=payload.spdx;
    entry.description='Código real de '+repo+' · '+file.path+'. Licencia '+payload.spdx+'. Archivo de un proyecto: puede requerir otros módulos y dependencias. No ejecutado ni verificado por RCC.';
    entry.compatibility.context='Archivo original importado con su licencia y atribución. Puede formar parte de un proyecto y no ejecutarse por separado.';
    entry.compatibility.test_details='Se descargó el archivo desde una revisión fija y se comprobó su hash para evitar duplicados; no se compiló ni ejecutó.';
    entry.compatibility.verification='source-imported';entry.compatibility.sources=[entry.source_url,'https://github.com/'+repo];
    entry.review.provider='RCC Archive Import';entry.name=file.path.split('/').pop()+' · '+repo.split('/')[1];
    entry.tags=[...new Set([...entry.tags,'Sin verificar'])].slice(0,12);
    rows.push(entry);ids.add(entry.id);urls.add(entry.source_url);hashes.add(digest);added++;
   }
   const old=previous?.sources.find(s=>s.repository===repo&&s.commit===payload.commit);
   report.sources.push({repository:repo,category:key,commit:payload.commit,license:payload.spdx,archive:payload.archiveUrl,archiveSha256:payload.archiveSha256,reviewed:payload.files.length,added:added+(old?.added||0),duplicates:old?.duplicates??duplicates,rejected});
   console.log(repo+': '+added+' archivos nuevos, '+duplicates+' duplicados, '+rejected+' descartados');
  }catch(error){report.sources.push({repository:repo,category:key,error:'No se pudo importar: '+(error.status||error.message.split('\n')[0]).toString().slice(0,160)});console.log(repo+': fuente no disponible o licencia no admitida');}
 }
 report.added=rows.length-report.before;report.total=rows.length;
 if(report.added)writeCatalog(rows);
 fs.writeFileSync(path.join(__dirname,'../assets/source-import-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({added:report.added,total:report.total}));
}
if(require.main===module)main();
module.exports={hash,sourceBody,SOURCES};
