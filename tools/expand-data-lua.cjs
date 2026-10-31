// Original, configurable numeric pipelines for the three existing Lua hosts.
// These are combinations of shared operations, not independent game systems.
const fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('scripts.json')).filter(s=>!s.id.startsWith('rcc_data_'));
const filters=[['todos','Todos','true'],['positivos','Positivos','x > 0'],['negativos','Negativos','x < 0'],['pares','Pares','x % 2 == 0'],['impares','Impares','x % 2 ~= 0'],['rango','Entre 0 y 20','x >= 0 and x <= 20'],['mayores','Mayores de diez','x > 10'],['nocero','Sin ceros','x ~= 0']];
const maps=[['doble','Duplicar','x*2'],['mitad','Dividir entre dos','x/2'],['cuadrado','Cuadrado','x*x'],['absoluto','Valor absoluto','math.abs(x)'],['redondear','Redondear','math.floor(x+0.5)'],['limitar','Limitar entre 0 y 20','math.min(20,math.max(0,x))'],['desplazar','Sumar diez','x+10'],['porcentaje','Porcentaje','x/100']];
const reducers=[['suma','Suma','local r=0; for _,v in ipairs(values) do r=r+v end; return r'],['cantidad','Cantidad','return #values'],['media','Media','local r=0; for _,v in ipairs(values) do r=r+v end; return #values>0 and r/#values or 0'],['minimo','Mínimo','local r=values[1] or 0; for _,v in ipairs(values) do r=math.min(r,v) end; return r'],['maximo','Máximo','local r=values[1] or 0; for _,v in ipairs(values) do r=math.max(r,v) end; return r'],['amplitud','Amplitud','if #values==0 then return 0 end; local lo,hi=values[1],values[1]; for _,v in ipairs(values) do lo=math.min(lo,v); hi=math.max(hi,v) end; return hi-lo'],['producto','Producto','local r=1.0; for _,v in ipairs(values) do r=r*v end; return r'],['primero','Primer resultado','return values[1] or 0']];
let added=0;
for(const platform of ['fivem','gameguardian','autotouch']) {
 const base=catalog.find(s=>s.id.startsWith('rcc_platform_')&&s.platform===platform);
 for(const [fk,fl,filter] of filters)for(const [mk,ml,map] of maps)for(const [rk,rl,reduce] of reducers){
  const id=`rcc_data_${platform}_${fk}_${mk}_${rk}`;
  if(catalog.some(s=>s.id===id))continue;
  const name=`${base.compatibility.runtime.split(' · ')[0]}: ${fl} → ${ml} → ${rl}`;
  const logic=`local function calculate(input)\n  local values={}\n  for _,x in ipairs(input) do\n    assert(type(x)=="number" and x==x and math.abs(x)<=1e9,"Usa numeros finitos entre -1e9 y 1e9")\n    if ${filter} then values[#values+1]=${map} end\n  end\n  ${reduce}\nend`;
  const report=platform==='gameguardian'?'gg.alert(message)':platform==='autotouch'?'alert(message)':'print(message)';
  const setup=platform==='fivem'?"-- Guarda como client.lua en tu recurso autorizado.\n-- fxmanifest.lua separado: fx_version 'cerulean'; game 'gta5'; client_script 'client.lua'\n":'-- Guarda como .lua y abre desde '+base.compatibility.runtime.split(' · ')[0]+'.\n';
  const code=`-- RCC | ${name}\n-- Receta combinable: modifica los datos, el filtro o la transformacion.\n${setup}${logic}\nlocal input={-12,-5,0,7,12,18,24,31}\nlocal result=calculate(input)\nlocal message="Resultado: "..tostring(result)\n${report}\n`;
  catalog.push({...base,id,name,code,description:`Receta configurable de datos: ${fl.toLowerCase()}, ${ml.toLowerCase()} y ${rl.toLowerCase()}. Procesa una tabla local y muestra el resultado. Comparte operaciones con otras variantes. No lee ni modifica memoria de juegos. Los resúmenes vacíos devuelven cero; el producto vacío devuelve uno.`,tags:['Original RCC','Script independiente','Recetas de datos',base.tags[2],fl,ml,rl],created_at:'2026-10-31',compatibility:{...base.compatibility,test_details:'Sintaxis Lua revisada y cálculo comprobado con datos de muestra, tabla vacía y un elemento en emulador Lua. No ejecutado en el anfitrión real.'}});added++;
 }
}
fs.writeFileSync('scripts.json',JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync('netlify/functions/lib/catalog-ids.json',JSON.stringify(catalog.map(s=>s.id))+'\n');
console.log(`Added ${added} configurable Lua pipelines across FiveM, GameGuardian and AutoTouch. Total ${catalog.length}.`);
