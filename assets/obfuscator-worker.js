import { obfuscate } from './code-engine.js';
self.onmessage = ({data}) => {
  try { self.postMessage({result: obfuscate(data.code, data.language, data.method, data.reinforce)}); }
  catch (error) { self.postMessage({error: error.message || 'No se pudo procesar el código. Reduce el tamaño si tu dispositivo no tiene suficiente memoria.'}); }
};
