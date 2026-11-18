// Ensure every published RCC catalog record has the visible RCC label and a platform label.
const {readCatalog,writeCatalog}=require('./catalog-store.cjs');
const LABELS={roblox:'Roblox',fivem:'FiveM',gameguardian:'GameGuardian',autotouch:'AutoTouch',web:'JavaScript / Web',java:'Java · JDK 17+',universal:'Universal'};
const rows=readCatalog();let changed=0,tagged=0;
for(const row of rows){
  const before=Array.isArray(row.tags)?row.tags:[];
  const next=[...before];
  if(!next.some(tag=>String(tag).toLowerCase()==='rcc')){next.push('RCC');tagged++;}
  const platform=LABELS[String(row.platform||'').toLowerCase()];
  if(platform&&!next.some(tag=>String(tag).toLowerCase()===platform.toLowerCase()))next.push(platform);
  if(next.length!==before.length){row.tags=next.slice(0,20);changed++;}
}
if(changed)writeCatalog(rows);
console.log(JSON.stringify({total:rows.length,changed,tagged,labels:LABELS}));
