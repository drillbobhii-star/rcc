// Refresh static reference artwork from Roblox's public place thumbnails.
// These are game icons, not screenshots of script execution.
const fs=require('node:fs');
const {readCatalog}=require('./catalog-store.cjs');
async function main(){
  const file='assets/game-images.json',original=fs.readFileSync(file,'utf8'),images=JSON.parse(original);
  const order=[...original.matchAll(/^  "(\d+)":/gm)].map(match=>match[1]);
  const ids=[...new Set(readCatalog().filter(s=>(s.tags||[]).includes('Nueva incorporación')).map(s=>s.game_id))].filter(id=>/^[1-9]\d*$/.test(id));
  let updated=0;const missing=[];
  for(let offset=0;offset<ids.length;offset+=50){
    const batch=ids.slice(offset,offset+50);
    const query=new URLSearchParams({placeIds:batch.join(','),size:'512x512',format:'Png',isCircular:'false'});
    const response=await fetch('https://thumbnails.roblox.com/v1/places/gameicons?'+query,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Roblox thumbnails: HTTP '+response.status);
    const data=await response.json();if(!Array.isArray(data.data))throw Error('Unexpected thumbnail response');
    for(const id of batch){
      const row=data.data.find(item=>String(item.targetId)===id);
      if(row?.state!=='Completed'||!/^https:\/\/(?:[\w-]+\.)?rbxcdn\.com\//.test(row.imageUrl||'')){missing.push(id);continue;}
      images[id]=row.imageUrl;updated++;
    }
  }
  const keys=[...order,...Object.keys(images).filter(id=>!order.includes(id))];
  fs.writeFileSync(file,'{\n'+keys.map(id=>'  '+JSON.stringify(id)+': '+JSON.stringify(images[id])).join(',\n')+'\n}\n');
  console.log(`Game references: ${updated}/${ids.length} assigned from Roblox; ${missing.length} unavailable.`);
  if(missing.length)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
