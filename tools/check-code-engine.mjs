import assert from 'node:assert/strict';
import { detect, obfuscate, tokenize } from '../assets/code-engine.js';
assert.equal(detect('local player = game:GetService("Players").LocalPlayer'), 'lua');
assert.equal(detect('public class Main { public static void main(String[] args) {} }'), 'java');
assert.equal(detect('const x = () => console.log("hello")'), 'javascript');
assert.equal(detect('print("public class Test")'), 'unknown');
assert.equal(detect(''), 'unknown');
assert.equal(obfuscate('local x = "hi" -- hello\nprint(x)', 'lua', 'combined', false), 'local x = "\\104\\105"         \nprint(x)');
assert.equal(obfuscate('String s = "hi"; /* note */', 'java', 'strings', false), 'String s = "\\150\\151"; /* note */');
assert.equal(obfuscate('String s = "// not a comment"; // comment\n', 'java', 'comments', false), 'String s = "// not a comment";           \n');
assert.equal(obfuscate('local x = [==[--literal]==]\n--[=[long\ncomment]=]\nreturn x', 'lua', 'comments', false), 'local x = [==[--literal]==]\n         \n          \nreturn x');
assert.equal(obfuscate('char x = \'a\'; String s = """\nhello\n""";', 'java', 'strings', false), 'char x = \'a\'; String s = """\nhello\n""";');
assert.equal(obfuscate('local x="\\n\\123"', 'lua', 'strings', false), 'local x="\\n\\123"');
for (const language of ['java','lua']) {
  const source = 'local x = "https://example.test"; --[==[text]==]\n /* text */';
  assert.equal(tokenize(source, language).map(t => t.text).join(''), source);
}
const large = 'local x="hello"\n'.repeat(50000);
assert.ok(obfuscate(large, 'lua', 'strings', true).length > large.length);
console.log('Code engine OK: detection, literal preservation, comments, escapes and large inputs.');
