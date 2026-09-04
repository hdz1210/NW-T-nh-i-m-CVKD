const fs = require('fs');
let code = fs.readFileSync('src/Code.gs', 'utf8');

// Find matchRules function body
const start = code.indexOf('function matchRules(');
const end = code.indexOf('function matchCondition(');
const mrCode = code.slice(start, end);

console.log(mrCode);
