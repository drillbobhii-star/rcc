// Conservative lexical transforms: never rename public APIs or execute pasted code.
export function tokenize(source, language) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    let type = 'code';
    const rest = source.slice(i);
    const long = language === 'lua' && /^(--)?\[(=*)\[/.exec(rest);
    if (long) {
      type = long[1] ? 'comment' : 'string';
      const end = source.indexOf(']' + long[2] + ']', i + long[0].length);
      i = end < 0 ? source.length : end + long[2].length + 2;
    } else if ((language === 'lua' && rest.startsWith('--')) || (language === 'java' && rest.startsWith('//'))) {
      type = 'comment'; const end = source.indexOf('\n', i); i = end < 0 ? source.length : end;
    } else if (language === 'java' && rest.startsWith('/*')) {
      type = 'comment'; const end = source.indexOf('*/', i + 2); i = end < 0 ? source.length : end + 2;
    } else if (language === 'java' && rest.startsWith('"""')) {
      type = 'string'; i += 3;
      while (i < source.length) { if (source[i] === '\\') i += 2; else if (source.startsWith('"""', i)) { i += 3; break; } else i++; }
    } else if (language === 'lua' && source[i] === '`') {
      type = 'interpolation'; i++;
      while (i < source.length) { if (source[i] === '\\') i += 2; else if (source[i++] === '`') break; }
    } else if (source[i] === '"' || source[i] === "'") {
      type = 'string'; const quote = source[i++];
      while (i < source.length) { if (source[i] === '\\') i += 2; else if (source[i++] === quote) break; }
    } else {
      i++;
      while (i < source.length && !/[`"'\/[\-]/.test(source[i])) i++;
    }
    tokens.push({ type, text: source.slice(start, i) });
  }
  return tokens;
}
export function detect(source) {
  // Ignore literals and comments to avoid guessing from example strings.
  const clean = tokenize(source, 'lua').filter(t => t.type === 'code').map(t => t.text).join(' ');
  const java = /\b(public|private|protected|package|import)\s+|\b(class|interface|System\s*\.\s*out|String\s*\[)/.test(clean);
  const lua = /\b(local|function|then|elseif|end|require|loadstring|return|repeat|until)\b|\b(game|workspace|script|math|table|string|io)\s*[:.]|\b(?:print|warn|pairs|ipairs|assert|tonumber|tostring)\s*\(/.test(clean);
  const js = /\b(const|let|var)\s+[A-Za-z_$][\w$]*\s*(?:=|;|,)|=>|\bconsole\s*\.|\bfunction\b[^{}]*\)\s*\{/.test(clean);
  return js ? 'javascript' : java && !lua ? 'java' : lua && !java ? 'lua' : 'unknown';
}
export function obfuscate(source, language, method, reinforce) {
  if (language !== 'lua') throw new Error('El ofuscador solo admite Lua / Luau.');
  if (!['strings','comments','combined'].includes(method)) throw new Error('Selecciona un método válido.');
  if (['java','javascript'].includes(detect(source))) throw new Error('El código no parece Lua / Luau.');
  const lexical = tokenize(source, language);
  for (const token of lexical) {
    if (token.type === 'string' && /^["']/.test(token.text) && (token.text.length < 2 || token.text.at(-1) !== token.text[0] || (token.text.slice(0,-1).match(/\\+$/)?.[0].length || 0) % 2 === 1)) throw new Error('Cadena sin cerrar. Revisa las comillas del original.');
    const long = /^(?:--)?\[(=*)\[/.exec(token.text);
    if (long && !token.text.endsWith(']' + long[1] + ']')) throw new Error('Bloque largo sin cerrar.');
    if (token.type === 'interpolation' && (token.text.length < 2 || token.text.at(-1) !== '`')) throw new Error('Interpolación sin cerrar.');
  }
  return lexical.map(({type, text}) => {
    if (type === 'comment' && (method === 'comments' || method === 'combined' || reinforce)) return text.replace(/[^\r\n]/g, ' ');
    if (type !== 'string' || method === 'comments' || text.startsWith('"""') || !/^["']/.test(text) || text.at(-1) !== text[0]) return text;
    if (language === 'java' && text[0] === "'") return text;
    // Leave escaped literals intact: numeric and whitespace escapes can span several characters.
    if (text.includes('\\')) return text;
    // Preserve all original escape sequences; only encode raw safe ASCII characters.
    let output = text[0];
    for (let i = 1; i < text.length - 1; i++) {
      const char = text[i];
      if (char === '\\') { output += char + (text[++i] || ''); continue; }
      const n = char.charCodeAt(0);
      output += n >= 32 && n < 127 ? '\\' + n.toString(language === 'java' ? 8 : 10).padStart(3, '0') : char;
    }
    return output + text.at(-1);
  }).join('');
}

// Describes the selected catalog entry first; unknown inputs use observable code facts.
export function analyzeCode(source, catalog = []) {
  const normalize = value => value.replace(/\r\n/g, '\n').trim();
  const entry = catalog.find(item => normalize(item.code) === normalize(source));
  const language = detect(source);
  const tokens = tokenize(source, language === 'java' ? 'java' : 'lua');
  const clean = tokens.filter(t => t.type === 'code').map(t => t.text).join(' ');
  const lines = [];
  if (entry) {
    lines.push(entry.name, entry.game ? `Juego / contexto: ${entry.game}` : 'Origen: biblioteca RCC', entry.description || 'Sin descripción publicada.');
    if (entry.compatibility?.context) lines.push('Dónde usarlo: ' + entry.compatibility.context);
    if (entry.compatibility?.requirements) lines.push('Requisitos: ' + entry.compatibility.requirements);
  } else lines.push('Análisis del fragmento · ' + ({lua:'Lua / Luau',java:'Java',javascript:'JavaScript',unknown:'lenguaje sin confirmar'}[language]));
  const facts = [
    [/\bloadstring\s*\(/, 'Compila una cadena como código. El contenido descargado puede cambiar; su función real no se puede deducir del loader.'],
    [/\b(?:HttpGet|GetAsync|fetch)\s*\(/, 'Realiza una petición de red a una fuente externa.'],
    [/\bInstance\s*\.\s*new\s*\(/, 'Crea objetos de Roblox; revisa sus clases y Parent para saber dónde aparecen.'],
    [/\b(?:ScreenGui|TextLabel|TextButton|SurfaceGui)\b/, 'Contiene elementos de interfaz o texto para Roblox.'],
    [/\bTweenService\b/, 'Configura transiciones o animaciones mediante TweenService.'],
    [/\bWalkSpeed\s*=/, 'Asigna la velocidad de movimiento de un personaje.'],
    [/\bHealth\s*=/, 'Modifica la salud; su efecto depende del contexto de servidor o cliente.'],
    [/\b(?:DataStoreService|GetDataStore)\b/, 'Accede al almacenamiento persistente de Roblox.'],
    [/\b(?:Touched|Triggered|PlayerAdded|MouseButton1Click)\s*:/, 'Conecta eventos: el comportamiento se activa al interactuar o entrar un jugador.'],
    [/\btable\s*\.\s*sort\s*\(/, 'Ordena una tabla con la comparación indicada.'],
    [/\bmath\s*\.\s*random\s*\(/, 'Genera valores aleatorios.'],
    [/\b(?:for|while|repeat)\b/, 'Repite operaciones mediante un bucle.'],
    [/\b(?:print|warn)\s*\(/, 'Escribe mensajes en la consola.'],
    [/\b(?:addEventListener|querySelector|getElementById)\s*\(/, 'Consulta elementos o conecta interacciones de una página web.']
  ];
  const observations = facts.filter(([pattern]) => pattern.test(clean)).map(([,description]) => description);
  const functions = [...clean.matchAll(/\bfunction\s+([\w.:]+)\s*\(/g)].map(match => match[1]);
  const urls = [...new Set(source.match(/https?:\/\/[^\s"'<>`)]+/g) || [])].slice(0,6);
  if (observations.length) lines.push('\nOperaciones observadas:', ...observations.map(text => '• ' + text));
  if (functions.length) lines.push('Funciones declaradas: ' + functions.slice(0,20).join(', '));
  if (urls.length) lines.push('Direcciones incluidas:\n' + urls.join('\n'));
  lines.push(`${source.split('\n').length} líneas · ${source.length} caracteres.`);
  if (!entry && !observations.length) lines.push('No hay señales suficientes para explicar su propósito. No se inventa una función ni un juego.');
  lines.push('Lectura estática orientativa: no ejecuta el código ni inspecciona dependencias remotas.');
  return lines.join('\n\n');
}
