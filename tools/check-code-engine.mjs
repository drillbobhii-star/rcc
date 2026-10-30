import assert from 'node:assert/strict';
import { detect, obfuscate, tokenize, analyzeCode } from '../assets/code-engine.js';
assert.equal(detect('local player = game:GetService("Players").LocalPlayer'), 'lua');
assert.equal(detect('public class Main { public static void main(String[] args) {} }'), 'java');
assert.equal(detect('const x = () => console.log("hello")'), 'javascript');
assert.equal(detect('print("public class Test")'), 'lua');
assert.equal(detect(''), 'unknown');
assert.equal(obfuscate('local x = "hi" -- hello\nprint(x)', 'lua', 'combined', false), 'local x = "\\104\\105"         \nprint(x)');
assert.equal(obfuscate('local x = [==[--literal]==]\n--[=[long\ncomment]=]\nreturn x', 'lua', 'comments', false), 'local x = [==[--literal]==]\n         \n          \nreturn x');
assert.equal(obfuscate('local x="\\n\\123"', 'lua', 'strings', false), 'local x="\\n\\123"');
for (const language of ['java','lua']) {
  const source = 'local x = "https://example.test"; --[==[text]==]\n /* text */';
  assert.equal(tokenize(source, language).map(t => t.text).join(''), source);
}
const large = 'local x="hello"\n'.repeat(50000);
assert.ok(obfuscate(large, 'lua', 'strings', true).length > large.length);
console.log('Code engine OK: detection, literal preservation, comments, escapes and large inputs.');

assert.throws(() => obfuscate('public class Test {}', 'java', 'strings'), /solo admite/);
assert.throws(() => obfuscate('const x = 4', 'lua', 'strings'), /no parece Lua/);
assert.throws(() => obfuscate('local x = "unfinished', 'lua', 'strings'), /sin cerrar/);
assert.throws(() => obfuscate('--[=[unfinished', 'lua', 'comments'), /sin cerrar/);
const interpolation = 'local x = `hello {string.format("%s", name)} -- kept`';
assert.equal(obfuscate(interpolation, 'lua', 'combined'), interpolation);
const catalog = [{name:'Puerta de prueba',code:'local x = "door"',description:'Abre una puerta',game:'Mi obby'}, {name:'Marcador',code:'print(42)',description:'Escribe 42 en consola'}];
assert.match(analyzeCode(catalog[0].code,catalog), /Mi obby/);
assert.match(analyzeCode(catalog[1].code,catalog), /Escribe 42/);
assert.doesNotMatch(analyzeCode(catalog[1].code,catalog), /Mi obby/);
assert.match(analyzeCode('loadstring(game:HttpGet("https:\/\/example.test"))()'), /contenido descargado/);
assert.notEqual(analyzeCode('print(1)'),analyzeCode('local health = 12\nprint(health)'));

assert.equal(detect('local let = 1; print(let)'), 'lua');
assert.doesNotThrow(() => obfuscate('local let = 1; print(let)', 'lua', 'strings'));
