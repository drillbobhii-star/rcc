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
    } else if (source[i] === '"' || source[i] === "'") {
      type = 'string'; const quote = source[i++];
      while (i < source.length) { if (source[i] === '\\') i += 2; else if (source[i++] === quote) break; }
    } else {
      i++;
      while (i < source.length && !/["'\/[\-]/.test(source[i])) i++;
    }
    tokens.push({ type, text: source.slice(start, i) });
  }
  return tokens;
}
export function detect(source) {
  // Ignore literals and comments to avoid guessing from example strings.
  const clean = tokenize(source, 'lua').filter(t => t.type === 'code').map(t => t.text).join(' ');
  const java = /\b(public|private|protected|package|import)\s+|\b(class|interface|System\s*\.\s*out|String\s*\[)/.test(clean);
  const lua = /\b(local|function|then|elseif|end|require|loadstring)\b|\b(game|workspace|script)\s*[:.]/.test(clean);
  const js = /\b(const|let|var)\s+|=>|\bconsole\s*\./.test(clean);
  return js ? 'javascript' : java && !lua ? 'java' : lua && !java ? 'lua' : 'unknown';
}
export function obfuscate(source, language, method, reinforce) {
  return tokenize(source, language).map(({type, text}) => {
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
