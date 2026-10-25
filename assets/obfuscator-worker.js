import { obfuscate } from './code-engine.js';
self.onmessage = ({data}) => {
  try { self.postMessage({result: obfuscate(data.code, data.language, data.method, data.reinforce)}); }
  catch { self.postMessage({error: 'No se pudo procesar el código. Reduce el tamaño si tu dispositivo no tiene suficiente memoria.'}); }
};
