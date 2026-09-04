const fs = require('fs');
const content = fs.readFileSync('src/ConfigUI.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
const code = scriptMatch[1];

// Find all onclick, onchange, oninput in HTML
const events = [];
const eventRegex = /\s(on\w+)="([^"]+)"/g;
let m;
while ((m = eventRegex.exec(content)) !== null) {
  events.push({ attr: m[1], handler: m[2] });
}
console.log('Total event handlers in HTML:', events.length);
events.forEach(e => {
  const fnName = e.handler.split('(')[0].trim();
  if (!code.includes('function ' + fnName) && !code.includes(fnName + ' =') && !code.includes('const ' + fnName) && !code.includes('let ' + fnName)) {
    console.log('POTENTIALLY MISSING FUNCTION:', fnName, 'in', e.handler);
  }
});
