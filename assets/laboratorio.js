import { detect } from './code-engine.js';
const $ = id => document.getElementById(id);
let language = 'lua', detected = 'unknown', output = '', outputLanguage = 'lua', worker, controller, timer, revision = 0;
function invalidate() {
  revision++; controller?.abort(); worker?.terminate(); worker = null;
  $('analyze').disabled = false; $('generate').disabled = false;
  output = ''; $('copyResult').hidden = $('download').hidden = true;
  $('result').textContent = 'Tu resultado aparece aquí. Pega un script para comenzar.';
  $('status').textContent = ''; $('result').classList.remove('code');
}
function mode(value) {
  const obf = value === 'obfuscator';
  $('analysisPanel').hidden = obf; $('obfuscatorPanel').hidden = !obf;
  $('analysisTab').setAttribute('aria-pressed', String(!obf)); $('obfuscatorTab').setAttribute('aria-pressed', String(obf));
  history.replaceState(null, '', '#' + value);
}
function inspect() {
  detected = detect($('source').value);
  const names = {lua:'Lua / Luau',java:'Java',javascript:'JavaScript (distinto de Java)',unknown:'Lenguaje sin confirmar'};
  $('detection').textContent = $('source').value.trim() ? 'Detección orientativa: ' + names[detected] : 'Esperando código';
  const mismatch = detected !== 'unknown' && detected !== language;
  $('mismatch').hidden = !mismatch;
  $('switchLanguage').hidden = detected === 'javascript';
  $('mismatchText').textContent = detected === 'javascript' ? 'Este código parece JavaScript. Las pestañas Java y Lua no son compatibles con JavaScript.' : `El código parece ${names[detected]}. Cambia a la pestaña correspondiente para ofuscarlo.`;
}
function selectLanguage(value) {
  invalidate(); language = value;
  for (const name of ['java','lua']) $(name+'Tab').setAttribute('aria-pressed', String(name === language));
  $('confirmLanguage').checked = false; inspect();
}
$('analysisTab').onclick = () => mode('analysis'); $('obfuscatorTab').onclick = () => mode('obfuscator');
$('luaTab').onclick = () => selectLanguage('lua'); $('javaTab').onclick = () => selectLanguage('java');
$('switchLanguage').onclick = () => selectLanguage(detected);
$('source').addEventListener('input', () => {invalidate(); $('confirmLanguage').checked = false; $('counter').textContent = $('source').value.length.toLocaleString('es')+' caracteres'; clearTimeout(timer); timer = setTimeout(inspect, 250);});
for (const id of ['method','reinforce','environment','confirmLanguage']) $(id).addEventListener('change', invalidate);
$('clear').onclick = () => { $('source').value = ''; $('source').dispatchEvent(new Event('input')); $('source').focus(); };
$('analyze').onclick = async () => {
  const code = $('source').value;
  if (!code.trim()) { $('status').textContent = 'Pega un código primero.'; return; }
  invalidate(); const current = revision;
  $('analyze').disabled = true; $('status').textContent = 'Analizando funciones, entorno y posibles usos…';
  controller = new AbortController(); const requestController = controller;
  const timeout = setTimeout(() => requestController.abort(), 55000);
  try {
    const response = await fetch('/api/analyze-code', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,environment:$('environment').value}),signal:requestController.signal});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo analizar el código.');
    if (current !== revision) return;
    $('result').textContent = data.analysis; $('status').textContent = 'Análisis generado. No se ha ejecutado el código.';
  } catch (error) { if (current === revision) $('status').textContent = error.name === 'AbortError' ? 'El análisis tardó demasiado. Inténtalo de nuevo.' : error.message; }
  finally { clearTimeout(timeout); if (current === revision) $('analyze').disabled = false; }
};
$('generate').onclick = () => {
  inspect(); const code = $('source').value;
  if (!code.trim()) { $('status').textContent = 'Pega un código primero.'; return; }
  if (detected !== 'unknown' && detected !== language) { $('status').textContent = 'Revisa el lenguaje detectado antes de continuar.'; return; }
  if (detected === 'unknown' && !$('confirmLanguage').checked) { $('status').textContent = 'No hay señales suficientes. Confirma el lenguaje de tu código.'; return; }
  invalidate(); $('generate').disabled = true; $('status').textContent = 'Procesando en tu navegador…';
  try {
    worker = new Worker('assets/obfuscator-worker.js', {type:'module'});
    worker.onmessage = ({data}) => {
      $('generate').disabled = false; worker.terminate(); worker = null;
      if (data.error) { $('status').textContent = data.error; return; }
      output = data.result; outputLanguage = language;
      $('result').textContent = output; $('result').classList.add('code');
      $('copyResult').hidden = $('download').hidden = false;
      $('status').textContent = output === code ? 'No se encontraron elementos transformables con este método. El código se conserva.' : 'Ofuscación terminada. Prueba la salida en tu entorno antes de usarla.';
    };
    worker.onerror = () => { $('generate').disabled = false; $('status').textContent = 'No se pudo iniciar el procesador local.'; worker?.terminate(); worker = null; };
    worker.postMessage({code,language,method:$('method').value,reinforce:$('reinforce').checked});
  } catch { $('generate').disabled = false; $('status').textContent = 'Tu navegador no permite iniciar el procesador local.'; }
};
$('copyResult').onclick = async () => { try { await navigator.clipboard.writeText(output); $('status').textContent = 'Código copiado.'; } catch { $('status').textContent = 'No se pudo copiar. Selecciona el resultado manualmente.'; } };
$('download').onclick = () => { const url = URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href=url; a.download=outputLanguage === 'java' ? 'codigo-ofuscado.java' : 'codigo-ofuscado.lua'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
mode(location.hash === '#obfuscator' ? 'obfuscator' : 'analysis');
try { const code = sessionStorage.getItem('rcc_lab_code'); if (code) { $('source').value = code; sessionStorage.removeItem('rcc_lab_code'); $('source').dispatchEvent(new Event('input')); $('analyze').click(); } } catch {}
