const fs = require('fs');
const code = fs.readFileSync('src/Code.gs', 'utf8');

// Extract isConditionAll and canonicalKhoangGia
const fnCode = code.slice(code.indexOf('function isConditionAll('), code.indexOf('function initMonthlyConfigSheets('));
const evalEnv = new Function(fnCode + '; return { isConditionAll, canonicalKhoangGia };')();

const rawInput = `Khoảng Giá
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Dưới 20 tỷ
Từ 20-30 tỷ
Trên 30 tỷ
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Dưới 10 tỷ
Trên 10 tỷ
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Dưới 10 tỷ
Từ 10-20 tỷ
Từ 20-30 tỷ
Trên 30 tỷ
Tất cả
Tất cả
Giá đất dưới 10 tỷ
Giá đất trên 10 tỷ
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả
Tất cả`;

const lines = rawInput.split('\n').map(l => l.trim());
const parsed = lines.map((line, idx) => {
  if (idx === 0) return line; // Header 'Khoảng Giá'
  return evalEnv.canonicalKhoangGia(line);
});

console.log('COUNT:', parsed.length);
console.log('OUTPUT_START');
console.log(parsed.join('\n'));
console.log('OUTPUT_END');
