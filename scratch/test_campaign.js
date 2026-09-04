const fs = require('fs');
const code = fs.readFileSync('src/Code.gs', 'utf8');

// Build test environment
const fnCode = code.slice(code.indexOf('const APP_CONFIG = {'), code.indexOf('function calculateAllScoresWithRules('));
const evalEnv = new Function(fnCode + `
return {
  isConditionAll,
  normalizeUnit,
  canonicalKhoangGia,
  matchRules,
  evaluateRowWithRules,
  parseDateSafe,
  cleanScore
};
`)();

// Mock context with campaign
const mockCampaignMap = new Map();
mockCampaignMap.set('mel', [
  { sanPham: 'Cao tầng', loaiCan: 'Tất cả', khoangGia: 'Tất cả', score: 5.5 }
]);
mockCampaignMap.set('vcg', [
  { sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: 'Tất cả', score: 10 }
]);

const mockCtx = {
  f2Map: new Map(),
  f2MonthsList: [],
  thMap: new Map([
    ['mel', [
      { sanPham: 'Cao tầng', loaiCan: 'Tất cả', khoangGia: 'Tất cả', monthScores: new Map([['2026-03', 3.0]]) }
    ]]
  ]),
  thMonthsList: [{ key: '2026-03' }],
  masVCGSet: new Set(),
  gianXayMap: new Map(),
  cbnvMap: new Map(),
  campaignConfig: {
    active: true,
    name: 'Chiến dịch Tháng 3/2026',
    startDate: new Date(2026, 2, 5, 0, 0, 0), // 05/03/2026
    endDate: new Date(2026, 2, 10, 23, 59, 59), // 10/03/2026
    map: mockCampaignMap
  }
};

// Row during campaign: 06/03/2026 (Row index 0 date, row[5] duAn = 'MEL', row[14] sanPham = 'Cao tầng', row[25] loaiQuy = 'Quỹ NW')
const rowInCampaign = [
  '06/03/2026', '6', '3', '2026', 'Miền Bắc', 'MEL', 'C2Z4-07-12', 'NW97', 'Trần Văn Thắng', 'Đã bán',
  '4589980837', '5135929278', 'The Vision', 'TPLand', 'Cao Tầng', 'Sơ cấp', '2PN+', 'KD1279',
  '', '', '', '', 'Masterise', '0', '', 'Quỹ NW'
];

const scoreIn = evalEnv.evaluateRowWithRules(rowInCampaign, mockCtx);
console.log('Score during campaign (expected 5.5):', scoreIn);

// Row outside campaign: 15/03/2026
const rowOutCampaign = [
  '15/03/2026', '15', '3', '2026', 'Miền Bắc', 'MEL', 'C2Z4-07-12', 'NW97', 'Trần Văn Thắng', 'Đã bán',
  '4589980837', '5135929278', 'The Vision', 'TPLand', 'Cao Tầng', 'Sơ cấp', '2PN+', 'KD1279',
  '', '', '', '', 'Masterise', '0', '', 'Quỹ NW'
];

const scoreOut = evalEnv.evaluateRowWithRules(rowOutCampaign, mockCtx);
console.log('Score outside campaign (expected 3.0):', scoreOut);

if (scoreIn === 5.5 && scoreOut === 3.0) {
  console.log('✅ ALL CAMPAIGN UNIT TESTS PASSED!');
} else {
  console.error('❌ CAMPAIGN UNIT TEST FAILED!');
  process.exit(1);
}
