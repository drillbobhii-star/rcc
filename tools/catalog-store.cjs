// Static catalog packaging. No build step or server is required to serve these assets.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const defaultRoot=path.resolve(__dirname,'..');
const MAX_PART_BYTES=2*1024*1024;
const PART_PATTERN=/^catalog\/part-\d{3,}-[a-f0-9]{16}\.json$/;
function readCatalog(root=defaultRoot){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts.json'),'utf8'));
  if(Array.isArray(manifest))return manifest; // One-time import of the former format.
  if(manifest.format!=='rcc-catalog-v1'||!Array.isArray(manifest.parts))throw Error('Invalid catalog manifest');
  const rows=manifest.parts.flatMap(part=>{
    if(!PART_PATTERN.test(part.file))throw Error('Invalid catalog path');
    const content=fs.readFileSync(path.join(root,part.file));
    const hash=crypto.createHash('sha256').update(content).digest('hex').slice(0,16);
    if(content.length!==part.bytes||!part.file.endsWith(`-${hash}.json`))throw Error('Catalog part integrity failure');
    const data=JSON.parse(content);
    if(!Array.isArray(data)||data.length!==part.count)throw Error('Catalog part count mismatch');
    return data;
  });
  if(rows.length!==manifest.total||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Catalog total or IDs mismatch');
  return rows;
}
function writeCatalog(rows,root=defaultRoot){
  if(!Array.isArray(rows)||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Catalog must be an array with unique IDs');
  const dir=path.join(root,'catalog');fs.mkdirSync(dir,{recursive:true});
  const parts=[];let items=[],bytes=2;
  function flush(){
    if(!items.length)return;
    const content='['+items.join(',')+']';
    const hash=crypto.createHash('sha256').update(content).digest('hex').slice(0,16);
    const file=`catalog/part-${String(parts.length+1).padStart(3,'0')}-${hash}.json`;
    fs.writeFileSync(path.join(root,file),content);
    parts.push({file,count:items.length,bytes:Buffer.byteLength(content)});items=[];bytes=2;
  }
  for(const row of rows){
    const content=JSON.stringify(row),size=Buffer.byteLength(content);
    if(size+2>MAX_PART_BYTES)throw Error(`Catalog entry exceeds the part limit: ${row.id}`);
    if(bytes+size+(items.length?1:0)>MAX_PART_BYTES)flush();
    bytes+=size+(items.length?1:0);items.push(content);
  }
  flush();
  const manifest={format:'rcc-catalog-v1',total:rows.length,parts};
  fs.writeFileSync(path.join(root,'scripts.json'),JSON.stringify(manifest,null,2)+'\n');
  const keep=new Set(parts.map(part=>path.basename(part.file)));
  for(const file of fs.readdirSync(dir))if(/^part-\d{3,}-[a-f0-9]{16}\.json$/.test(file)&&!keep.has(file))fs.unlinkSync(path.join(dir,file));
  const idsFile=path.join(root,'netlify/functions/lib/catalog-ids.json');
  if(fs.existsSync(path.dirname(idsFile)))fs.writeFileSync(idsFile,JSON.stringify(rows.map(row=>row.id))+'\n');
  return manifest;
}
module.exports={readCatalog,writeCatalog,MAX_PART_BYTES};
