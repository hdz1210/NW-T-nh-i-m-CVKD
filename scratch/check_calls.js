const fs = require('fs');
const content = fs.readFileSync('src/ConfigUI.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
const code = scriptMatch[1];

// Let's check undefined symbols using acorn or regex
const calls = code.match(/([a-zA-Z0-9_$]+)\s*\(/g) || [];
const declared = new Set();
const defRegex = /function\s+([a-zA-Z0-9_$]+)/g;
let m;
while ((m = defRegex.exec(code)) !== null) {
  declared.add(m[1]);
}
const varRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g;
while ((m = varRegex.exec(code)) !== null) {
  declared.add(m[1]);
}

const standardGlobals = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Date', 'RegExp', 'Math', 'JSON', 'Set', 'Map',
  'console', 'document', 'window', 'alert', 'confirm', 'prompt', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'fetch', 'addEventListener', 'removeEventListener', 'requestAnimationFrame', 'escapeHtml', 'new', 'typeof'
]);

const missing = new Set();
calls.forEach(c => {
  const name = c.replace(/\s*\(/, '');
  if (!declared.has(name) && !standardGlobals.has(name)) {
    missing.add(name);
  }
});
console.log('Unrecognized function calls:', Array.from(missing));
