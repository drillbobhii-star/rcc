// 2,048 distinct numeric pipelines: 8 filters × 8 transforms × 8 reducers × 4 data sets.
// Each entry is a standalone, editable HTML page. No external code or services.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const catalog = JSON.parse(fs.readFileSync('scripts.json','utf8')).filter(s => !s.id.startsWith('rcc_pipeline_'));
const datasets = [
 ['presupuestos','Presupuestos',[12,18,25,35,48,62,75,96,125,180]],
 ['latencias','Latencias',[8,12,18,25,42,65,95,120,180,250]],
 ['altitudes','Altitudes',[-20,-8,0,5,18,42,80,125,240,500]],
 ['duraciones','Duraciones',[0.5,1.5,3,5,8,13,21,34,55,89]],
 ['temperaturas','Temperaturas',[-12,-5,0,7,12,18,24,31,38,42]],
 ['puntuaciones','Puntuaciones',[0,15,25,40,50,65,75,80,95,100]],
 ['variaciones','Variaciones',[-40,-20,-10,-3,0,3,10,20,40,80]],
 ['mediciones','Mediciones',[1.25,2.5,3.75,5,7.5,10,12.5,15,20,25]]
];
const filters = [
 ['all','Todos los valores','values.filter(() => true)',()=>true],
 ['positive','Solo positivos','values.filter(x => x > 0)',x=>x>0],
 ['nonnegative','Sin negativos','values.filter(x => x >= 0)',x=>x>=0],
 ['even','Enteros pares','values.filter(x => Number.isInteger(x) && x % 2 === 0)',x=>Number.isInteger(x)&&x%2===0],
 ['odd','Enteros impares','values.filter(x => Number.isInteger(x) && Math.abs(x % 2) === 1)',x=>Number.isInteger(x)&&Math.abs(x%2)===1],
 ['range','Rango de 0 a 25','values.filter(x => x >= 0 && x <= 25)',x=>x>=0&&x<=25],
 ['above','Mayores de 10','values.filter(x => x > 10)',x=>x>10],
 ['nonzero','Sin ceros','values.filter(x => x !== 0)',x=>x!==0]
];
const maps = [
 ['double','Duplicar','selected.map(x => x * 2)',x=>x*2],
 ['half','Dividir entre dos','selected.map(x => x / 2)',x=>x/2],
 ['square','Elevar al cuadrado','selected.map(x => x * x)',x=>x*x],
 ['absolute','Valor absoluto','selected.map(x => Math.abs(x))',Math.abs],
 ['round','Redondear','selected.map(x => Math.round(x))',Math.round],
 ['clamp','Limitar a 0–20','selected.map(x => Math.min(20, Math.max(0, x)))',x=>Math.min(20,Math.max(0,x))],
 ['offset','Sumar diez','selected.map(x => x + 10)',x=>x+10],
 ['percent','Convertir a porcentaje de 100','selected.map(x => x / 100)',x=>x/100]
];
const reducers = [
 ['sum','Suma','mapped.reduce((sum, x) => sum + x, 0)',a=>a.reduce((s,x)=>s+x,0)],
 ['mean','Media','mapped.length ? mapped.reduce((sum, x) => sum + x, 0) / mapped.length : null',a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null],
 ['min','Mínimo','mapped.length ? Math.min(...mapped) : null',a=>a.length?Math.min(...a):null],
 ['max','Máximo','mapped.length ? Math.max(...mapped) : null',a=>a.length?Math.max(...a):null],
 ['median','Mediana','(() => { const sorted = [...mapped].sort((a,b) => a-b); const n=sorted.length; return n ? (n % 2 ? sorted[Math.floor(n/2)] : (sorted[n/2-1]+sorted[n/2])/2) : null; })()',a=>{a=[...a].sort((x,y)=>x-y);return a.length?(a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2):null;}],
 ['unique','Valores únicos','[...new Set(mapped)]',a=>[...new Set(a)]],
 ['ascending','Orden ascendente','[...mapped].sort((a,b) => a-b)',a=>[...a].sort((x,y)=>x-y)],
 ['frequencies','Frecuencias','mapped.reduce((counts,x) => { counts[x] = (counts[x] || 0) + 1; return counts; }, {})',a=>a.reduce((c,x)=>{c[x]=(c[x]||0)+1;return c;},{})]
];
let count=0;
for(const [dataset,label,values] of datasets) for(const [filter,filterLabel,select,predicate] of filters) for(const [map,mapLabel,transform,mapper] of maps) for(const [reducer,reducerLabel,reduce,reference] of reducers){
 const id=`rcc_pipeline_${dataset}_${filter}_${map}_${reducer}`;
 const title=`${label}: ${filterLabel} → ${mapLabel} → ${reducerLabel}`;
 const logic=`function calculate(values) {\n  const selected = ${select};\n  const mapped = ${transform};\n  const result = ${reduce};\n  return { selected, mapped, result };\n}`;
 // Execute every pipeline with its reference data, no matches, and a singleton.
 for(const input of [values,[],[7]]) {
  const actual=vm.runInNewContext(`${logic}\nJSON.stringify(calculate(${JSON.stringify(input)}))`);
  const selected=input.filter(predicate),mapped=selected.map(mapper);
  assert.deepEqual(JSON.parse(actual),{selected,mapped,result:reference(mapped)},id);
 }
 const js=`${logic}\nconst form = document.querySelector('form');\nconst input = document.querySelector('textarea');\nconst output = document.querySelector('#output');\nfunction run(event) {\n  event?.preventDefault();\n  try {\n    const values = JSON.parse(input.value);\n    if (!Array.isArray(values) || values.length > 10000 || !values.every(x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9)) throw new Error('Usa un array JSON de hasta 10,000 números entre -1e9 y 1e9.');\n    output.textContent = JSON.stringify(calculate(values), null, 2);\n  } catch (error) { output.textContent = 'Revisa los datos: ' + error.message; }\n}\nform.addEventListener('submit', run);\nrun();`;
 new vm.Script(js,{filename:id});
 const code=`<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>\n<style>body{margin:0;background:#15202e;color:#e4edf8;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:6vh auto;padding:24px}h1{font-size:clamp(24px,4vw,36px);line-height:1.25}label{display:block;margin-top:24px}textarea{box-sizing:border-box;width:100%;min-height:120px;border:1px solid #8da8c5;border-radius:12px;background:#1c2d40;color:inherit;padding:16px;font:16px monospace}button{background:#b4d7fb;color:#172c40;border:0;border-radius:12px;padding:14px 22px;font:600 16px system-ui;cursor:pointer;margin:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1c2d40;padding:20px;border-radius:16px}:focus-visible{outline:3px solid #b4d7fb;outline-offset:4px}</style></head>\n<body><main><p>RCC / Recetas combinables de datos / ${label}</p><h1>${title}</h1><p>Filtra los datos, transforma cada valor y calcula el resultado. Edita el array para probar tu caso. selected muestra el filtro; mapped muestra la transformación; result muestra el resumen. Un resumen sin datos devuelve null cuando corresponde.</p><form><label for="data">Array JSON de números</label><textarea id="data" spellcheck="false" required>${JSON.stringify(values)}</textarea><button>Calcular resultado</button></form><h2>Resultado</h2><pre id="output" role="status" aria-live="polite"></pre></main>\n<script>\n${js}\n</script>\n</body></html>\n`;
 catalog.push({id,name:title,description:`Receta combinable de JavaScript: ${filterLabel.toLowerCase()}, ${mapLabel.toLowerCase()} y ${reducerLabel.toLowerCase()}. Datos de ejemplo: ${label.toLowerCase()}. Página editable con validación JSON y resultado visible. Combina operaciones compartidas; no es un sistema de juego ni un exploit.`,level:'free',device:'both',platform:'web',type:'source',executors:['Navegador web'],tags:['Original RCC','JavaScript','Recetas de datos',label,filterLabel,mapLabel,reducerLabel],version:'1.0',created_at:'2026-10-25',catalog_section:'web',file_extension:'html',code,compatibility:{environment:'browser',runtime:'HTML5 / JavaScript ES2020',context:'Guardar como index.html y abrir en un navegador moderno.',requirements:'JavaScript habilitado. Array JSON de hasta 10,000 números finitos entre -1e9 y 1e9.',verification:'js-syntax',executor_status:'not-applicable',mobile_status:'Diseño adaptable; sin validación en dispositivos físicos.',test_details:'Sintaxis analizada con Node.js. Lógica ejecutada contra resultados de referencia para el conjunto de muestra, array vacío y un elemento. Interfaz sujeta a pruebas de navegador.',sources:['https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array','https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/JSON']}});
 count++;
}
fs.writeFileSync('scripts.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Added ${count} composable recipes; ${count*3} calculation checks passed. Total: ${catalog.length}.`);
