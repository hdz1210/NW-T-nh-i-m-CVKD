const fs = require('fs');
const code = fs.readFileSync('src/Code.gs', 'utf8');

let mrStr = code.slice(code.indexOf('function matchRules('), code.indexOf('function matchCondition('));
mrStr = mrStr.replace(/return false;/g, (m, offset) => `/* FALSE_${offset} */ { console.log('FALSE returned at offset ${offset}'); return false; }`);

const testCode = code.slice(0, code.indexOf('function matchRules(')) + mrStr + code.slice(code.indexOf('function matchCondition(')) + '\nreturn { matchRules, normalizeUnit, isConditionAll, canonicalKhoangGia, formatPriceRange };';

const exportsObj = new Function('SpreadsheetApp', 'Utilities', 'Logger', testCode)({}, {}, {});
const { matchRules, canonicalKhoangGia, formatPriceRange } = exportsObj;

const tests = [
  // New mathematical format
  { args: ['Tất cả', 'Tất cả', '10 - 20', 'Thấp tầng', 'Liền kề', 15], expected: true },
  { args: ['Tất cả', 'Tất cả', '10 - 20', 'Thấp tầng', 'Liền kề', 9.5], expected: false },
  { args: ['Tất cả', 'Tất cả', '10 - 20', 'Thấp tầng', 'Liền kề', 20.5], expected: false },
  { args: ['Tất cả', 'Tất cả', '< 10', 'Thấp tầng', 'Liền kề', 8.2], expected: true },
  { args: ['Tất cả', 'Tất cả', '< 10', 'Thấp tầng', 'Liền kề', 10.1], expected: false },
  { args: ['Tất cả', 'Tất cả', '>= 30', 'Thấp tầng', 'Liền kề', 35], expected: true },
  { args: ['Tất cả', 'Tất cả', '>= 30', 'Thấp tầng', 'Liền kề', 29.9], expected: false },
  { args: ['Tất cả', 'Tất cả', '= 10', 'Thấp tầng', 'Liền kề', 10.01], expected: true },
  { args: ['Tất cả', 'Tất cả', '= 10', 'Thấp tầng', 'Liền kề', 10.2], expected: false },
  // Backward compatibility with natural language
  { args: ['Tất cả', 'Tất cả', 'Dưới 10 tỷ', 'Thấp tầng', 'Liền kề', 8.2], expected: true },
  { args: ['Tất cả', 'Tất cả', 'Từ 10-20 tỷ', 'Thấp tầng', 'Liền kề', 15], expected: true },
  { args: ['Tất cả', 'Tất cả', 'Trên 30 tỷ', 'Thấp tầng', 'Liền kề', 35], expected: true },
  { args: ['Tất cả', 'Tất cả', 'Giá đất dưới 10 tỷ', 'Thấp tầng', 'Liền kề', 8], expected: true },
  { args: ['Tất cả', 'Tất cả', 'Giá đất trên 10 tỷ', 'Thấp tầng', 'Liền kề', 12], expected: true },
];

let failed = 0;
tests.forEach((t, i) => {
  const res = matchRules(...t.args);
  if (res !== t.expected) {
    console.error(`Test ${i+1} FAILED: expected ${t.expected}, got ${res}`, t.args);
    failed++;
  } else {
    console.log(`Test ${i+1} PASSED: rule "${t.args[2]}" vs price ${t.args[5]} -> ${res}`);
  }
});

console.log(`\nResult: ${tests.length - failed}/${tests.length} tests passed.`);
process.exit(failed > 0 ? 1 : 0);
