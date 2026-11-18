// Ensure every published RCC catalog record has the visible RCC label and a platform label.
const {readCatalog,writeCatalog}=require('./catalog-store.cjs');
const LABELS={roblox:'Roblox',fivem:'FiveM',gameguardian:'GameGuardian',autotouch:'AutoTouch',web:'JavaScript / Web',java:'Java · JDK 17+',universal:'Universal'};
const rows=readCatalog();let changed=0,tagged=0;
for(const row of rows){
  const before=Array.isArray(row.tags)?row.tags:[];
  const next=['RCC',...before.filter(tag=>String(tag).toLowerCase()!=='rcc')];
  if(!before.some(tag=>String(tag).toLowerCase()==='rcc'))tagged++;
  const platform=LABELS[String(row.platform||'').toLowerCase()];
  if(platform&&!next.some(tag=>String(tag).toLowerCase()===platform.toLowerCase()))next.push(platform);
  const final=next.slice(0,20);
  if(JSON.stringify(final)!==JSON.stringify(before)){row.tags=final;changed++;}
}
if(changed)writeCatalog(rows);
console.log(JSON.stringify({total:rows.length,changed,tagged,labels:LABELS}));
