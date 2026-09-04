/**
 * =========================================================================
 * HỆ THỐNG QUẢN LÝ CƠ CHẾ VÀ TÍNH ĐIỂM KPI THEO THÁNG (MONTHLY BI ENGINE)
 * =========================================================================
 * Tự động đồng bộ điểm theo từng tháng (Bảng Tổng Hợp và Dự Án F2)
 * Tự động tạo cột tháng mới và kế thừa điểm khi bước sang tháng mới
 */

const APP_CONFIG = {
  SHEET_DATA: 'Data',
  SHEET_TONG_HOP: 'Tổng hợp',
  SHEET_DU_AN_F2: 'Dự án F2',
  SHEET_CONFIG_LEGACY: 'CauHinh_Diem',
  SHEET_MAS_VCG: 'Danh sách căn MAS VCG',
  SHEET_GIAN_XAY: 'Giãn xây HVB',
  SHEET_CBNV: 'CBNV',
  SHEET_CHIEN_DICH: 'Điểm Chiến Dịch',
  COL_OUTPUT_SCORE: 24, // Cột X: Điểm tạm (Index 24)
};

/**
 * Hàm lấy Date đầu tháng an toàn (sử dụng 12:00:00 UTC để triệt tiêu hoàn toàn độ lệch múi giờ)
 */
function createSafeMonthDate(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0, 1, 12, 0, 0));
}

/**
 * Lấy Date đầu tháng hiện tại theo đúng múi giờ của Spreadsheet
 */
function getCurrentMonthDate(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const ssTz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  const now = new Date();
  const y = parseInt(Utilities.formatDate(now, ssTz, 'yyyy'), 10);
  const m = parseInt(Utilities.formatDate(now, ssTz, 'MM'), 10) - 1; // 0-11
  return createSafeMonthDate(y, m);
}

/**
 * Hàm định dạng ngày an toàn YYYY-MM-DD (theo múi giờ Spreadsheet)
 */
function formatDateSafe(val, ss) {
  if (!val) return '';
  const ssTz = (ss && ss.getSpreadsheetTimeZone) ? ss.getSpreadsheetTimeZone() : 'Asia/Ho_Chi_Minh';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, ssTz, 'yyyy-MM-dd');
  }
  return String(val).trim();
}

/**
 * Hàm định dạng tháng hiển thị MM/YYYY (theo múi giờ Spreadsheet)
 */
function formatMonthDisplay(val, ss) {
  if (!val) return '';
  const ssTz = (ss && ss.getSpreadsheetTimeZone) ? ss.getSpreadsheetTimeZone() : 'Asia/Ho_Chi_Minh';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, ssTz, 'MM/yyyy');
  }
  const str = String(val).trim();
  const dMatch = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (dMatch) {
    return `${String(dMatch[2]).padStart(2, '0')}/${dMatch[1]}`;
  }
  const myMatch = str.match(/^(\d{1,2})[\/\-](\d{4})/);
  if (myMatch) {
    return `${String(myMatch[1]).padStart(2, '0')}/${myMatch[2]}`;
  }
  return str;
}

/**
 * Hàm chuẩn hóa tháng thành Date đầu tháng an toàn
 */
function normalizeToMonthDate(val, ss) {
  if (!val) return null;
  const ssTz = (ss && ss.getSpreadsheetTimeZone) ? ss.getSpreadsheetTimeZone() : 'Asia/Ho_Chi_Minh';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = parseInt(Utilities.formatDate(val, ssTz, 'yyyy'), 10);
    const m = parseInt(Utilities.formatDate(val, ssTz, 'MM'), 10) - 1;
    return createSafeMonthDate(y, m);
  }
  if (typeof val === 'number' && val > 30000 && val < 80000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const y = parseInt(Utilities.formatDate(d, ssTz, 'yyyy'), 10);
      const m = parseInt(Utilities.formatDate(d, ssTz, 'MM'), 10) - 1;
      return createSafeMonthDate(y, m);
    }
  }
  const str = String(val).trim();
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    return createSafeMonthDate(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1);
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return createSafeMonthDate(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1);
  }
  const myMatch = str.match(/^(\d{1,2})[\/\-](\d{4})/);
  if (myMatch) {
    return createSafeMonthDate(parseInt(myMatch[2], 10), parseInt(myMatch[1], 10) - 1);
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parseInt(Utilities.formatDate(parsed, ssTz, 'yyyy'), 10);
    const m = parseInt(Utilities.formatDate(parsed, ssTz, 'MM'), 10) - 1;
    return createSafeMonthDate(y, m);
  }
  return null;
}

/**
 * Hàm phân tích ngày an toàn
 * Ưu tiên Cột C (Tháng) và Cột D (Năm) từ dòng dữ liệu giao dịch khi có sẵn,
 * tránh triệt để lỗi Google Sheets/Excel tự ý đảo Ngày/Tháng (locale US MM/DD/YYYY).
 */
function parseDateSafe(val, row) {
  // 1. Nếu có mảng row từ sheet Data, ưu tiên tuyệt đối Cột C (row[2]: Tháng) & Cột D (row[3]: Năm)
  if (row && row[2] !== undefined && row[2] !== null && row[2] !== '' &&
      row[3] !== undefined && row[3] !== null && row[3] !== '') {
    const y = parseInt(row[3], 10);
    const m = parseInt(row[2], 10) - 1;
    let d = 1;
    if (row[1] !== undefined && row[1] !== null && row[1] !== '') {
      const parsedD = parseInt(row[1], 10);
      if (!isNaN(parsedD) && parsedD >= 1 && parsedD <= 31) d = parsedD;
    } else if (val instanceof Date && !isNaN(val.getTime())) {
      d = val.getDate();
    }
    if (!isNaN(y) && y >= 2000 && !isNaN(m) && m >= 0 && m <= 11) {
      return new Date(y, m, d);
    }
  }

  // 2. Không có row hoặc Cột C/D trống -> phân tích val
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number' && val > 30000 && val < 80000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Format DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Hàm phân tích số an toàn
 * Hỗ trợ mọi định dạng tiền tệ: chuỗi phân cách hàng nghìn bằng dấu chấm kiểu VN (vd: 58.331.990.507)
 * hoặc dấu phẩy kiểu quốc tế (vd: 58,331,990,507), có hoặc không có số thập phân.
 */
function parseNumberSafe(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim().replace(/\s+/g, '');
  if (!str) return 0;

  // Chuỗi nhiều dấu chấm (vd: 58.331.990.507 hoặc 58.331.990.507,50)
  if ((str.match(/\./g) || []).length > 1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if ((str.match(/,/g) || []).length > 1) {
    str = str.replace(/,/g, '');
  } else if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Chuẩn hóa số điểm: nếu .0 thì bỏ phần thập phân (trở thành số nguyên), .5 hoặc các số lẻ khác thì giữ nguyên
 */
function cleanScore(val) {
  if (val === '' || val === null || val === undefined) return '';
  const num = Number(val);
  if (isNaN(num)) return val;
  return (num % 1 === 0) ? parseInt(num, 10) : Math.round(num * 100) / 100;
}

/**
 * =========================================================================
 * TẠO MENU TIỆN ÍCH TRÊN GOOGLE SHEETS
 * =========================================================================
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎯 Cấu Hình')
    .addItem('⚙️ Bảng Cấu Hình Điểm', 'openConfigUI')
    .addItem('📊 Trình Tạo Biểu Đồ & Báo Cáo', 'openChartBuilderUI')
    .addSeparator()
    .addItem('📌 Tính điểm dòng chọn / mới', 'calculateSelectedRows')
    .addItem('⚡ Tính lại toàn bộ điểm Data', 'calculateAllScoresWithRules')
    .addItem('🔍 Quét & tính dòng chưa có điểm', 'autoTriggerOnDataChange')
    .addSeparator()
    .addItem('📅 Đồng bộ / Thêm cột tháng', 'manualSyncCurrentMonth')
    .addItem('🛠️ Khởi tạo cấu hình', 'initMonthlyConfigSheets')
    .addItem('🔧 Cài đặt Trigger tự động', 'setupAutoTrigger')
    .addToUi();
}

/**
 * Mở giao diện Web UI cấu hình đa tháng
 */
function openConfigUI() {
  const html = HtmlService.createHtmlOutputFromFile('ConfigUI')
    .setWidth(1400)
    .setHeight(840)
    .setTitle('⚙️ Bảng Cấu Hình Điểm');
  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ Bảng Cấu Hình Điểm');
}

/**
 * Kiểm tra xem một giá trị điều kiện có phải là áp dụng cho "Tất cả" hay không
 */
function isConditionAll(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return s === '' || s === '*' || s === 'tất cả' || s === 'tat ca' || s === 'all' || s === 'none';
}

/**
 * Chuẩn hóa tên loại căn
 */
function normalizeUnit(u) {
  if (!u) return '';
  let s = String(u).trim().toLowerCase().replace(/\s+/g, ' ');
  if (s === 'penhouse') return 'penthouse';
  if (s === 'penhouse duplex') return 'penthouse duplex';
  if (s === 'shophouses') return 'shophouse';
  return s;
}

/**
 * Chuẩn hóa khoảng giá thành định dạng toán học: >= 10, < 10, = 10, 10 - 20, Tất cả...
 * Không sử dụng định dạng ngôn ngữ tự nhiên.
 */
function formatPriceRange(min, max, isDat) {
  const prefix = isDat ? 'Giá đất ' : '';
  const minVal = (min !== '' && min !== null && min !== undefined) ? Number(min) : 0;
  const maxVal = (max !== '' && max !== null && max !== undefined) ? Number(max) : 999;

  const cleanMin = isNaN(minVal) ? 0 : minVal;
  const cleanMax = isNaN(maxVal) ? 999 : maxVal;

  if (cleanMin <= 0 && cleanMax >= 999) {
    return 'Tất cả';
  }
  if (cleanMin === cleanMax) {
    return `${prefix}= ${cleanMin}`;
  }
  if (cleanMin <= 0 && cleanMax < 999) {
    return `${prefix}< ${cleanMax}`;
  }
  if (cleanMin > 0 && cleanMax >= 999) {
    return `${prefix}>= ${cleanMin}`;
  }
  return `${prefix}${cleanMin} - ${cleanMax}`;
}

/**
 * Hàm chuyển đổi mọi chuỗi khoảng giá (cũ tự nhiên hoặc mới toán học) sang chuẩn toán học:
 * >= 10, < 10, = 10, 10 - 20, Tất cả...
 */
function canonicalKhoangGia(val) {
  if (isConditionAll(val)) return 'Tất cả';
  const s = String(val).trim();
  const sLow = s.toLowerCase();
  const isDat = sLow.includes('giá đất');
  const prefix = isDat ? 'Giá đất ' : '';

  // 1. Dạng khoảng: 10 - 20 hoặc Từ 10 - 20 tỷ hoặc 10-20
  const mRange = sLow.match(/(?:từ\s*)?(\d+(?:[.,]\d+)?)\s*(?:-|đến)\s*(\d+(?:[.,]\d+)?)/i);
  if (mRange) {
    const minP = parseFloat(mRange[1].replace(',', '.'));
    const maxP = parseFloat(mRange[2].replace(',', '.'));
    return `${prefix}${minP} - ${maxP}`;
  }

  // 2. Dạng lớn hơn / trên / từ X trở lên: >= 10, > 10, trên 10, từ 10 tỷ trở lên
  const mAbove = sLow.match(/(?:\>=\s*(\d+(?:[.,]\d+)?))|(?:\>\s*(\d+(?:[.,]\d+)?))|(?:trên\s*(\d+(?:[.,]\d+)?))|(?:từ\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]\s*trở\s*lên)/i);
  if (mAbove) {
    const minP = parseFloat((mAbove[1] || mAbove[2] || mAbove[3] || mAbove[4]).replace(',', '.'));
    return `${prefix}>= ${minP}`;
  }

  // 3. Dạng nhỏ hơn / dưới: <= 10, < 10, dưới 10
  const mBelow = sLow.match(/(?:\<=\s*(\d+(?:[.,]\d+)?))|(?:\<\s*(\d+(?:[.,]\d+)?))|(?:dưới\s*(\d+(?:[.,]\d+)?))/i);
  if (mBelow) {
    const maxP = parseFloat((mBelow[1] || mBelow[2] || mBelow[3]).replace(',', '.'));
    return `${prefix}< ${maxP}`;
  }

  // 4. Dạng bằng: = 10 (chắc chắn không phải >= hay <=)
  const mEq = sLow.match(/(?:^|[^<>!])=\s*(\d+(?:[.,]\d+)?)/);
  if (mEq) {
    const p = parseFloat(mEq[1].replace(',', '.'));
    return `${prefix}= ${p}`;
  }

  return s;
}

/**
 * Hàm phân tích chuỗi điều kiện cũ thành 3 giá trị chuẩn { sanPham, loaiCan, khoangGia }
 * Trong đó khoangGia luôn được chuẩn hóa sang dạng toán học (>= 10, < 10, = 10, 10 - 20, Tất cả)
 */
function parseConditionToThreeFields(cStr) {
  if (isConditionAll(cStr)) {
    return { sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: 'Tất cả' };
  }
  const c = String(cStr).trim();
  const cLower = c.toLowerCase();

  // 1. Sản Phẩm
  let sp = 'Tất cả';
  if (cLower.includes('thấp tầng')) {
    sp = 'Thấp tầng';
  } else if (cLower.includes('cao tầng')) {
    sp = 'Cao tầng';
  }

  // 2. Khoảng Giá
  let gia = 'Tất cả';
  let rawGiaMatch = null;
  const pricePatterns = [
    /giá đất\s*(?:<=|<|>=|>|=)\s*(\d+(?:[.,]\d+)?)/i,
    /giá đất\s*(\d+(?:[.,]\d+)?)\s*(?:-|đến)\s*(\d+(?:[.,]\d+)?)/i,
    /giá đất\s*(?:dưới|trên)\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]/i,
    /(?:<=|<|>=|>|=)\s*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:-|đến)\s*(\d+(?:[.,]\d+)?)\s*(?:t[ỷỉ])?/i,
    /dưới\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]/i,
    /trên\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]/i,
    /từ\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]\s*trở\s*lên/i
  ];
  for (const pat of pricePatterns) {
    const m = c.match(pat);
    if (m) {
      rawGiaMatch = m[0];
      gia = canonicalKhoangGia(m[0]);
      break;
    }
  }

  // 3. Loại Căn
  let lc = 'Tất cả';
  let temp = c;
  if (sp !== 'Tất cả') {
    temp = temp.replace(/thấp tầng|cao tầng/gi, '');
  }
  if (rawGiaMatch) {
    const escGia = rawGiaMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    temp = temp.replace(new RegExp(escGia, 'gi'), '');
    temp = temp.replace(/giá đất/gi, '');
  }
  temp = temp.replace(/^\s*(và|,)\s*|\s*(và|,)\s*$/gi, '').trim();
  temp = temp.replace(/\s*và\s*/gi, ', ').trim();
  temp = temp.replace(/\s*,\s*/g, ', ');
  if (temp.toLowerCase() === 'penhouse') temp = 'Penthouse';
  if (temp.toLowerCase() === 'penhouse duplex') temp = 'Penthouse Duplex';
  if (temp.toLowerCase() === 'shophouses') temp = 'Shophouse';

  if (temp && !isConditionAll(temp)) {
    lc = temp;
  }

  return { sanPham: sp, loaiCan: lc, khoangGia: gia };
}

/**
 * =========================================================================
 * CƠ CHẾ TỰ ĐỘNG THÊM CỘT THÁNG MỚI VÀ KẾ THỪA ĐIỂM (MONTHLY AUTO-ROLLOVER)
 * =========================================================================
 * Nếu bước sang tháng mới mà chưa có cột tháng hiện tại:
 * -> Tự động chèn cột mới ở vị trí đầu tiên của các tháng và copy điểm từ tháng trước sang!
 * -> Định dạng số 0.##: nếu là .0 thì ẩn thập phân (hiện số nguyên), .5 hoặc lẻ thì giữ lại.
 */
function ensureCurrentMonthConfigured(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const curMonthDate = getCurrentMonthDate(ss);
  const curMonthDisplay = formatMonthDisplay(curMonthDate, ss);

  let updated = false;

  // 1. Kiểm tra sheet Tổng hợp (9 cột cố định: Trạng thái, CĐT, Mã dự án, Dự án, Miền, Loại Quỹ, Sản Phẩm, Loại Căn, Khoảng Giá)
  const thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
  const firstMonthCol = 10;
  if (thSheet && thSheet.getLastColumn() >= firstMonthCol) {
    const firstMonthVal = thSheet.getRange(3, firstMonthCol).getValue();
    const firstMonthDate = normalizeToMonthDate(firstMonthVal, ss);

    if (firstMonthDate && curMonthDate.getTime() > firstMonthDate.getTime()) {
      const yDiff = curMonthDate.getUTCFullYear() - firstMonthDate.getUTCFullYear();
      const mDiff = curMonthDate.getUTCMonth() - firstMonthDate.getUTCMonth();
      const monthDiff = yDiff * 12 + mDiff;

      if (monthDiff > 0) {
        // Lặp bù các tháng còn thiếu từ quá khứ đến tháng hiện tại
        for (let step = monthDiff - 1; step >= 0; step--) {
          const targetM = curMonthDate.getUTCMonth() - step;
          const targetY = curMonthDate.getUTCFullYear();
          const targetDate = createSafeMonthDate(targetY, targetM);

          // Chèn 1 cột mới tại firstMonthCol (cột 10)
          thSheet.insertColumnBefore(firstMonthCol);
          
          // Tiêu đề
          thSheet.getRange(2, firstMonthCol).setValue('');
          thSheet.getRange(3, firstMonthCol).setValue(targetDate).setNumberFormat('mm/yyyy');

          // Copy giá trị từ cột tháng trước đó (firstMonthCol + 1) sang cột mới (firstMonthCol)
          const lastRow = thSheet.getLastRow();
          if (lastRow >= 4) {
            const prevScores = thSheet.getRange(4, firstMonthCol + 1, lastRow - 3, 1).getValues();
            const cleanedScores = prevScores.map(r => [cleanScore(r[0])]);
            thSheet.getRange(4, firstMonthCol, lastRow - 3, 1).setValues(cleanedScores);
            thSheet.getRange(4, firstMonthCol, lastRow - 3, 1).setNumberFormat('0.##').setHorizontalAlignment('center');
          }

          // Định dạng header cột mới
          thSheet.getRange(3, firstMonthCol).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

          updated = true;
          Logger.log(`[Auto-Rollover] Đã thêm cột tháng ${formatMonthDisplay(targetDate, ss)} vào sheet Tổng hợp.`);
        }
      }
    }

    // Chuẩn hóa định dạng số cho toàn bộ các cột tháng: .0 bỏ thập phân, .5 giữ lại
    const thLastRow = thSheet.getLastRow();
    const thLastCol = thSheet.getLastColumn();
    if (thLastRow >= 4 && thLastCol >= firstMonthCol) {
      thSheet.getRange(4, firstMonthCol, thLastRow - 3, thLastCol - firstMonthCol + 1).setNumberFormat('0.##').setHorizontalAlignment('center');
    }
  }

  // 2. Kiểm tra sheet Dự án F2
  const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
  if (f2Sheet && f2Sheet.getLastColumn() >= 3) {
    const firstMonthVal = f2Sheet.getRange(3, 3).getValue();
    const firstMonthDate = normalizeToMonthDate(firstMonthVal, ss);

    if (firstMonthDate && curMonthDate.getTime() > firstMonthDate.getTime()) {
      const yDiff = curMonthDate.getUTCFullYear() - firstMonthDate.getUTCFullYear();
      const mDiff = curMonthDate.getUTCMonth() - firstMonthDate.getUTCMonth();
      const monthDiff = yDiff * 12 + mDiff;

      if (monthDiff > 0) {
        for (let step = monthDiff - 1; step >= 0; step--) {
          const targetM = curMonthDate.getUTCMonth() - step;
          const targetY = curMonthDate.getUTCFullYear();
          const targetDate = createSafeMonthDate(targetY, targetM);

          f2Sheet.insertColumnBefore(3);

          f2Sheet.getRange(2, 3).setValue('');
          f2Sheet.getRange(3, 3).setValue(targetDate).setNumberFormat('mm/yyyy');

          const lastRow = f2Sheet.getLastRow();
          if (lastRow >= 4) {
            const prevScores = f2Sheet.getRange(4, 4, lastRow - 3, 1).getValues();
            const cleanedScores = prevScores.map(r => [cleanScore(r[0])]);
            f2Sheet.getRange(4, 3, lastRow - 3, 1).setValues(cleanedScores);
            f2Sheet.getRange(4, 3, lastRow - 3, 1).setNumberFormat('0.##').setHorizontalAlignment('center');
          }

          f2Sheet.getRange(3, 3).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

          updated = true;
          Logger.log(`[Auto-Rollover] Đã thêm cột tháng ${formatMonthDisplay(targetDate, ss)} vào sheet Dự án F2.`);
        }
      }
    }

    const f2LastRow = f2Sheet.getLastRow();
    const f2LastCol = f2Sheet.getLastColumn();
    if (f2LastRow >= 4 && f2LastCol >= 3) {
      f2Sheet.getRange(4, 3, f2LastRow - 3, f2LastCol - 2).setNumberFormat('0.##').setHorizontalAlignment('center');
    }
  }

  return { updated, monthDisplay: curMonthDisplay };
}

/**
 * Menu chạy thủ công đồng bộ cột tháng & chuẩn hóa định dạng số (.0 -> số nguyên, .5 -> giữ nguyên)
 */
function manualSyncCurrentMonth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = ensureCurrentMonthConfigured(ss);

  // Quét làm sạch dữ liệu hiện có trên cả 2 sheet để loại bỏ triệt để .0
  const thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
  const firstMonthCol = 10;
  if (thSheet && thSheet.getLastColumn() >= firstMonthCol && thSheet.getLastRow() >= 4) {
    const numRows = thSheet.getLastRow() - 3;
    const numCols = thSheet.getLastColumn() - firstMonthCol + 1;
    const scoreRange = thSheet.getRange(4, firstMonthCol, numRows, numCols);
    const vals = scoreRange.getValues();
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (vals[r][c] !== '' && vals[r][c] !== null && !isNaN(vals[r][c])) {
          vals[r][c] = cleanScore(vals[r][c]);
        }
      }
    }
    scoreRange.setValues(vals).setNumberFormat('0.##').setHorizontalAlignment('center');
  }

  const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
  if (f2Sheet && f2Sheet.getLastColumn() >= 3 && f2Sheet.getLastRow() >= 4) {
    const numRows = f2Sheet.getLastRow() - 3;
    const numCols = f2Sheet.getLastColumn() - 2;
    const scoreRange = f2Sheet.getRange(4, 3, numRows, numCols);
    const vals = scoreRange.getValues();
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (vals[r][c] !== '' && vals[r][c] !== null && !isNaN(vals[r][c])) {
          vals[r][c] = cleanScore(vals[r][c]);
        }
      }
    }
    scoreRange.setValues(vals).setNumberFormat('0.##').setHorizontalAlignment('center');
  }

  if (res.updated) {
    SpreadsheetApp.getUi().alert(
      '🎉 Đồng Bộ Tháng Thành Công',
      `Đã tự động tạo cột tháng mới ${res.monthDisplay}, sao chép điểm và chuẩn hóa số điểm (.0 bỏ thập phân, .5 giữ nguyên)!`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ Đã chuẩn hóa định dạng điểm (.0 bỏ thập phân, .5 giữ nguyên) cho tất cả các tháng!`, 'Đã chuẩn hóa', 4);
  }
}

/**
 * =========================================================================
 * KHỞI TẠO KHUNG 2 SHEET CẤU HÌNH (TRỐNG, CHUẨN BỊ ĐỂ USER NHẬP TỪ ĐẦU)
 * =========================================================================
 */
function initMonthlyConfigSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const curMonthDate = getCurrentMonthDate(ss);

  // 1. Tạo sheet Tổng hợp (9 cột cố định + các cột tháng)
  let thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
  if (!thSheet) {
    thSheet = ss.insertSheet(APP_CONFIG.SHEET_TONG_HOP);
  } else {
    thSheet.clear();
  }

  // Row 1: Header banner
  thSheet.getRange('A1:I1').merge().setValue('THÔNG TIN ĐIỂM THEO DỰ ÁN')
    .setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff').setFontSize(11).setHorizontalAlignment('left');

  // Row 2: Header Tháng
  thSheet.getRange(2, 10).setValue('Tháng')
    .setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

  // Row 3: Column headers (Tách thành 3 cột Sản Phẩm, Loại Căn, Khoảng Giá)
  const thHeadersRow3 = ['Trạng thái', 'CĐT', 'Mã dự án', 'Dự án', 'Miền', 'Loại Quỹ', 'Sản Phẩm', 'Loại Căn', 'Khoảng Giá', curMonthDate];
  thSheet.getRange(3, 1, 1, thHeadersRow3.length).setValues([thHeadersRow3])
    .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff').setHorizontalAlignment('center');
  
  thSheet.getRange(3, 10).setNumberFormat('mm/yyyy');

  thSheet.setFrozenRows(3);
  thSheet.setFrozenColumns(9);
  thSheet.autoResizeColumns(1, 9);

  // 2. Tạo sheet Dự án F2
  let f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
  if (!f2Sheet) {
    f2Sheet = ss.insertSheet(APP_CONFIG.SHEET_DU_AN_F2);
  } else {
    f2Sheet.clear();
  }

  // Row 2: Header Tháng
  f2Sheet.getRange(2, 3).setValue('Tháng')
    .setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

  // Row 3: Column headers
  const f2HeadersRow3 = ['Dự án', 'Loại Quỹ', curMonthDate];
  f2Sheet.getRange(3, 1, 1, f2HeadersRow3.length).setValues([f2HeadersRow3])
    .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff').setHorizontalAlignment('center');
  
  f2Sheet.getRange(3, 3).setNumberFormat('mm/yyyy');

  f2Sheet.setFrozenRows(3);
  f2Sheet.setFrozenColumns(2);
  f2Sheet.autoResizeColumns(1, 2);

  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Đã tạo cấu trúc khung cho 2 sheet "Tổng hợp" và "Dự án F2"!', 'Khởi tạo hoàn tất', 5);
}

/**
 * =========================================================================
 * API BACKEND CHO CONFIG WEB UI (FETCH & SAVE)
 * =========================================================================
 */
function fetchMonthlyConfigData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureCurrentMonthConfigured(ss);

    let thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
    let f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);

    if (!thSheet || !f2Sheet) {
      initMonthlyConfigSheets();
      thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
      f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
    }

    // 1. Đọc sheet Tổng hợp
    const thLastRow = thSheet.getLastRow();
    const thLastCol = Math.max(10, thSheet.getLastColumn());
    const thHeaderRow3 = thSheet.getRange(3, 1, 1, thLastCol).getValues()[0];
    const firstMonthCol = 10;
    
    const thMonths = [];
    for (let c = firstMonthCol - 1; c < thLastCol; c++) {
      const rawD = thHeaderRow3[c];
      const mDate = normalizeToMonthDate(rawD, ss);
      if (mDate) {
        thMonths.push({
          colIdx: c + 1,
          dateStr: formatDateSafe(mDate, ss),
          display: formatMonthDisplay(mDate, ss)
        });
      }
    }

    const thDataRows = thLastRow >= 4 ? thSheet.getRange(4, 1, thLastRow - 3, thLastCol).getValues() : [];
    const thRows = [];
    let currentProj = {};

    for (let i = 0; i < thDataRows.length; i++) {
      const r = thDataRows[i];
      const rowNumber = i + 4;
      if (r[2]) {
        currentProj = {
          status: String(r[0] || 'Đang bán').trim(),
          cdt: String(r[1] || '').trim(),
          code: String(r[2] || '').trim(),
          name: String(r[3] || '').trim(),
          region: String(r[4] || '').trim(),
          fund: String(r[5] || 'Quỹ NW').trim()
        };
      }

      const scores = {};
      thMonths.forEach((m) => {
        const val = r[m.colIdx - 1];
        scores[m.dateStr] = (val !== '' && val !== null && !isNaN(val)) ? Number(val) : '';
      });

      const sanPham = isConditionAll(r[6]) ? 'Tất cả' : String(r[6]).trim();
      const loaiCan = isConditionAll(r[7]) ? 'Tất cả' : String(r[7]).trim();
      const khoangGia = isConditionAll(r[8]) ? 'Tất cả' : canonicalKhoangGia(r[8]);

      thRows.push({
        rowIdx: rowNumber,
        status: currentProj.status || 'Đang bán',
        cdt: currentProj.cdt || '',
        code: currentProj.code || '',
        name: currentProj.name || '',
        region: currentProj.region || '',
        fund: currentProj.fund || 'Quỹ NW',
        sanPham: sanPham,
        loaiCan: loaiCan,
        khoangGia: khoangGia,
        condition: loaiCan !== 'Tất cả' ? loaiCan : (sanPham !== 'Tất cả' ? sanPham : (khoangGia !== 'Tất cả' ? khoangGia : '')),
        scores: scores
      });
    }

    // 2. Đọc sheet Dự án F2
    const f2LastRow = f2Sheet.getLastRow();
    const f2LastCol = Math.max(3, f2Sheet.getLastColumn());
    const f2HeaderRow3 = f2Sheet.getRange(3, 1, 1, f2LastCol).getValues()[0];

    const f2Months = [];
    for (let c = 2; c < f2LastCol; c++) {
      const rawD = f2HeaderRow3[c];
      const mDate = normalizeToMonthDate(rawD, ss);
      if (mDate) {
        f2Months.push({
          colIdx: c + 1,
          dateStr: formatDateSafe(mDate, ss),
          display: formatMonthDisplay(mDate, ss)
        });
      }
    }

    const f2DataRows = f2LastRow >= 4 ? f2Sheet.getRange(4, 1, f2LastRow - 3, f2LastCol).getValues() : [];
    const f2Rows = [];

    for (let i = 0; i < f2DataRows.length; i++) {
      const r = f2DataRows[i];
      const rowNumber = i + 4;
      const scores = {};
      f2Months.forEach((m) => {
        const val = r[m.colIdx - 1];
        scores[m.dateStr] = (val !== '' && val !== null && !isNaN(val)) ? Number(val) : '';
      });

      f2Rows.push({
        rowIdx: rowNumber,
        name: String(r[0] || '').trim(),
        fund: String(r[1] || 'Quỹ chéo').trim(),
        scores: scores
      });
    }

    const campaign = fetchCampaignDataInternal(ss);

    return {
      success: true,
      thMonths,
      thRows,
      f2Months,
      f2Rows,
      campaign,
      latestMonth: thMonths[0] ? thMonths[0].display : (f2Months[0] ? f2Months[0].display : '')
    };
  } catch (err) {
    Logger.log('Lỗi fetchMonthlyConfigData: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Lưu các thay đổi từ Web UI vào 2 sheet
 */
function saveMonthlyConfigData(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
    const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);

    if (!thSheet || !f2Sheet) return { success: false, error: 'Không tìm thấy sheet cấu hình' };

    // 1. Lưu các cập nhật ô trong sheet Tổng hợp
    const thFirstMonthCol = (String(thSheet.getRange(3, 7).getValue() || '').trim().toLowerCase() === 'sản phẩm') ? 10 : 8;
    if (payload.thCellUpdates && payload.thCellUpdates.length > 0) {
      payload.thCellUpdates.forEach(u => {
        if (u.rowIdx >= 4 && u.colIdx >= thFirstMonthCol) {
          thSheet.getRange(u.rowIdx, u.colIdx).setValue(u.score !== '' ? cleanScore(u.score) : '').setNumberFormat('0.##').setHorizontalAlignment('center');
        }
      });
    }

    // 2. Lưu các cập nhật ô trong sheet Dự án F2
    if (payload.f2CellUpdates && payload.f2CellUpdates.length > 0) {
      payload.f2CellUpdates.forEach(u => {
        if (u.rowIdx >= 4 && u.colIdx >= 3) {
          f2Sheet.getRange(u.rowIdx, u.colIdx).setValue(u.score !== '' ? cleanScore(u.score) : '').setNumberFormat('0.##').setHorizontalAlignment('center');
        }
      });
    }

    // 3. Thêm dòng mới nếu có
    if (payload.newRowsTH && payload.newRowsTH.length > 0) {
      payload.newRowsTH.forEach(nr => {
        const nextRow = Math.max(4, thSheet.getLastRow() + 1);
        const rowVals = [
          nr.status, nr.cdt, nr.code, nr.name, nr.region, nr.fund,
          isConditionAll(nr.sanPham) ? 'Tất cả' : nr.sanPham,
          isConditionAll(nr.loaiCan) ? 'Tất cả' : nr.loaiCan,
          canonicalKhoangGia(nr.khoangGia)
        ];
        payload.thMonths.forEach(m => {
          const s = nr.scores && nr.scores[m.dateStr];
          rowVals.push(s !== undefined && s !== '' ? cleanScore(s) : '');
        });
        thSheet.getRange(nextRow, 1, 1, rowVals.length).setValues([rowVals]);
        thSheet.getRange(nextRow, 10, 1, payload.thMonths.length).setNumberFormat('0.##').setHorizontalAlignment('center');
      });
    }

    if (payload.newRowsF2 && payload.newRowsF2.length > 0) {
      payload.newRowsF2.forEach(nr => {
        const nextRow = Math.max(4, f2Sheet.getLastRow() + 1);
        const rowVals = [nr.name, nr.fund];
        payload.f2Months.forEach(m => {
          const s = nr.scores && nr.scores[m.dateStr];
          rowVals.push(s !== undefined && s !== '' ? cleanScore(s) : '');
        });
        f2Sheet.getRange(nextRow, 1, 1, rowVals.length).setValues([rowVals]);
        f2Sheet.getRange(nextRow, 3, 1, payload.f2Months.length).setNumberFormat('0.##').setHorizontalAlignment('center');
      });
    }

    return { success: true };
  } catch (err) {
    Logger.log('Lỗi saveMonthlyConfigData: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Xóa 1 dòng cấu hình trong sheet Tổng hợp hoặc Dự án F2
 */
function deleteMonthlyConfigRow(tab, rowIdx) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = (tab === 'th') ? APP_CONFIG.SHEET_TONG_HOP : APP_CONFIG.SHEET_DU_AN_F2;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: 'Không tìm thấy sheet ' + sheetName };

    if (rowIdx < 4 || rowIdx > sheet.getLastRow()) {
      return { success: false, error: 'Chỉ số dòng không hợp lệ: ' + rowIdx };
    }

    sheet.deleteRow(rowIdx);
    return { success: true };
  } catch (err) {
    Logger.log('Lỗi deleteMonthlyConfigRow: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Cập nhật thông tin 1 dòng cấu hình trong sheet Tổng hợp hoặc Dự án F2
 */
function updateMonthlyConfigRow(tab, rowIdx, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = (tab === 'th') ? APP_CONFIG.SHEET_TONG_HOP : APP_CONFIG.SHEET_DU_AN_F2;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, error: 'Không tìm thấy sheet ' + sheetName };

    if (rowIdx < 4 || rowIdx > sheet.getLastRow()) {
      return { success: false, error: 'Chỉ số dòng không hợp lệ: ' + rowIdx };
    }

    if (tab === 'th') {
      const rowVals = [
        data.status || 'Đang bán',
        data.cdt || '',
        data.code || '',
        data.name || '',
        data.region || 'Miền Bắc',
        data.fund || 'Quỹ NW',
        isConditionAll(data.sanPham) ? 'Tất cả' : data.sanPham,
        isConditionAll(data.loaiCan) ? 'Tất cả' : data.loaiCan,
        canonicalKhoangGia(data.khoangGia)
      ];
      sheet.getRange(rowIdx, 1, 1, 9).setValues([rowVals]);
    } else {
      sheet.getRange(rowIdx, 1).setValue(data.name || '');
    }

    return { success: true };
  } catch (err) {
    Logger.log('Lỗi updateMonthlyConfigRow: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Đọc dữ liệu cấu hình chiến dịch từ sheet 'Điểm Chiến Dịch'
 */
function fetchCampaignDataInternal(ss) {
  try {
    ss = ss || SpreadsheetApp.getActiveSpreadsheet();
    const cdSheet = ss.getSheetByName(APP_CONFIG.SHEET_CHIEN_DICH);
    if (!cdSheet || cdSheet.getLastRow() < 4) {
      return {
        exists: false,
        name: '',
        startDate: '',
        endDate: '',
        status: 'Tạm dừng',
        rows: []
      };
    }

    // Đọc metadata dòng 1
    const metaVals = cdSheet.getRange(1, 1, 1, Math.max(8, cdSheet.getLastColumn())).getValues()[0];
    const name = String(metaVals[1] || '').trim();
    const rawStart = metaVals[3];
    const rawEnd = metaVals[5];
    let status = String(metaVals[7] || 'Đang chạy').trim();

    let startDateStr = '';
    const dStart = parseDateSafe(rawStart);
    if (dStart) startDateStr = formatDateSafe(dStart, ss);

    let endDateStr = '';
    const dEnd = parseDateSafe(rawEnd);
    if (dEnd) endDateStr = formatDateSafe(dEnd, ss);

    // Tự động kiểm tra ngày: Nếu ngày hiện tại vượt quá ngày kết thúc -> Tự động chuyển trạng thái thành Kết thúc!
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dEnd) {
      const endCmp = new Date(dEnd);
      endCmp.setHours(23, 59, 59, 999);
      if (today > endCmp && status !== 'Tạm dừng') {
        status = 'Kết thúc';
      }
    }

    const lastRow = cdSheet.getLastRow();
    const dataRows = cdSheet.getRange(4, 1, lastRow - 3, 11).getValues();
    const rows = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const rowNumber = i + 4;
      const cdt = String(r[1] || '').trim();
      const code = String(r[2] || '').trim();
      const projName = String(r[3] || '').trim();
      const region = String(r[4] || '').trim();
      const rowStatus = String(r[5] || 'Đang bán').trim();
      const sanPham = isConditionAll(r[6]) ? 'Tất cả' : String(r[6]).trim();
      const loaiCan = isConditionAll(r[7]) ? 'Tất cả' : String(r[7]).trim();
      const khoangGia = isConditionAll(r[8]) ? 'Tất cả' : canonicalKhoangGia(r[8]);
      const scoreVal = r[9];
      const score = (scoreVal !== '' && scoreVal !== null && !isNaN(scoreVal)) ? Number(scoreVal) : '';
      const note = String(r[10] || '').trim();

      rows.push({
        rowIdx: rowNumber,
        cdt,
        code,
        name: projName,
        region,
        status: rowStatus,
        sanPham,
        loaiCan,
        khoangGia,
        score,
        note
      });
    }

    return {
      exists: true,
      name,
      startDate: startDateStr,
      endDate: endDateStr,
      status,
      rows
    };
  } catch (err) {
    Logger.log('Lỗi fetchCampaignDataInternal: ' + err.toString());
    return {
      exists: false,
      name: '',
      startDate: '',
      endDate: '',
      status: 'Tạm dừng',
      rows: [],
      error: err.toString()
    };
  }
}

/**
 * Public API tải dữ liệu chiến dịch cho client
 */
function fetchCampaignData() {
  return fetchCampaignDataInternal();
}

/**
 * Lưu toàn bộ cấu hình chiến dịch vào sheet 'Điểm Chiến Dịch'
 */
function saveCampaignData(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let cdSheet = ss.getSheetByName(APP_CONFIG.SHEET_CHIEN_DICH);

    if (!cdSheet) {
      cdSheet = ss.insertSheet(APP_CONFIG.SHEET_CHIEN_DICH);
    }

    // Xóa sạch dữ liệu cũ
    cdSheet.clear();

    const name = String(payload.name || '').trim();
    const startDate = String(payload.startDate || '').trim();
    const endDate = String(payload.endDate || '').trim();
    let status = String(payload.status || 'Đang chạy').trim();
    if (status !== 'Tạm dừng' && endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dEnd = parseDateSafe(endDate);
      if (dEnd) {
        dEnd.setHours(23, 59, 59, 999);
        if (today > dEnd) {
          status = 'Kết thúc';
        }
      }
    }
    const rows = payload.rows || [];

    // 1. Ghi Metadata dòng 1
    const metaHeaders = [
      ['TÊN CHIẾN DỊCH:', name, 'TỪ NGÀY:', startDate, 'ĐẾN NGÀY:', endDate, 'TRẠNG THÁI:', status]
    ];
    cdSheet.getRange(1, 1, 1, 8).setValues(metaHeaders);

    const metaRange = cdSheet.getRange(1, 1, 1, 8);
    metaRange.setFontFamily('Arial').setFontSize(10);
    [1, 3, 5, 7].forEach(col => {
      cdSheet.getRange(1, col).setFontWeight('bold').setBackground('#eff6ff').setFontColor('#1d4ed8');
    });
    [2, 4, 6, 8].forEach(col => {
      cdSheet.getRange(1, col).setFontWeight('bold').setHorizontalAlignment('center');
    });

    // Dòng 2: Phụ đề ghi chú
    cdSheet.getRange(2, 1, 1, 11).merge();
    cdSheet.getRange(2, 1).setValue('💡 Bảng Điểm Chiến Dịch áp dụng tự động cho các giao dịch trong khoảng thời gian trên (Ưu tiên thay thế điểm tháng).')
      .setFontStyle('italic').setFontSize(9).setFontColor('#64748b').setBackground('#f8fafc');

    // 2. Ghi Header bảng ở dòng 3
    const headers = [
      ['STT', 'Chủ đầu tư', 'Mã DA', 'Tên Dự Án', 'Miền', 'Trạng Thái', 'Sản Phẩm', 'Loại Căn', 'Khoảng Giá', 'Điểm Chiến Dịch', 'Ghi Chú']
    ];
    cdSheet.getRange(3, 1, 1, 11).setValues(headers)
      .setFontWeight('bold')
      .setBackground('#f1f5f9')
      .setHorizontalAlignment('center')
      .setFontSize(10)
      .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // 3. Ghi các dòng cấu hình từ dòng 4
    if (rows.length > 0) {
      const dataRows = rows.map((r, idx) => {
        return [
          idx + 1,
          r.cdt || '',
          r.code || '',
          r.name || '',
          r.region || '',
          r.status || 'Đang bán',
          isConditionAll(r.sanPham) ? 'Tất cả' : r.sanPham,
          isConditionAll(r.loaiCan) ? 'Tất cả' : r.loaiCan,
          canonicalKhoangGia(r.khoangGia),
          (r.score !== '' && r.score !== null && !isNaN(r.score)) ? cleanScore(r.score) : '',
          r.note || ''
        ];
      });

      const dataRange = cdSheet.getRange(4, 1, dataRows.length, 11);
      dataRange.setValues(dataRows);
      dataRange.setFontFamily('Arial').setFontSize(10);
      dataRange.setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);

      cdSheet.getRange(4, 1, dataRows.length, 1).setHorizontalAlignment('center'); // STT
      cdSheet.getRange(4, 3, dataRows.length, 1).setHorizontalAlignment('center'); // Mã DA
      cdSheet.getRange(4, 5, dataRows.length, 2).setHorizontalAlignment('center'); // Miền, Trạng thái
      cdSheet.getRange(4, 7, dataRows.length, 3).setHorizontalAlignment('center'); // SP, LC, KG
      cdSheet.getRange(4, 10, dataRows.length, 1).setNumberFormat('0.##').setHorizontalAlignment('center').setFontWeight('bold'); // Điểm
    }

    // Tự động căn chỉnh độ rộng cột
    for (let col = 1; col <= 11; col++) {
      cdSheet.autoResizeColumn(col);
      const w = cdSheet.getColumnWidth(col);
      if (w < 80) cdSheet.setColumnWidth(col, 80);
      if (w > 260) cdSheet.setColumnWidth(col, 260);
    }

    return { success: true, count: rows.length };
  } catch (err) {
    Logger.log('Lỗi saveCampaignData: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Alias lưu dữ liệu cho client gọi
 */
function saveCampaignConfig(payload) {
  return saveCampaignData(payload);
}

/**
 * =========================================================================
 * BỘ TẢI CONTEXT ENGINE TÍNH ĐIỂM (RULE ENGINE CONTEXT)
 * =========================================================================
 */
function getRuleEngineContext(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();

  // Đảm bảo cột tháng mới nhất đã được đồng bộ
  ensureCurrentMonthConfigured(ss);

  // 1. Tải bảng Dự án F2 (Quỹ Chéo)
  const f2Map = new Map(); // key: du_an_lower -> Map(monthKey -> score)
  const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
  let f2MonthsList = [];

  if (f2Sheet && f2Sheet.getLastRow() >= 4 && f2Sheet.getLastColumn() >= 3) {
    const f2LastCol = f2Sheet.getLastColumn();
    const f2HeaderRow = f2Sheet.getRange(3, 1, 1, f2LastCol).getValues()[0];
    for (let c = 2; c < f2LastCol; c++) {
      const d = normalizeToMonthDate(f2HeaderRow[c], ss);
      if (d) {
        const key = formatDateSafe(d, ss).substring(0, 7);
        f2MonthsList.push({ colIdx: c + 1, date: d, key });
      }
    }

    const f2RowsData = f2Sheet.getRange(4, 1, f2Sheet.getLastRow() - 3, f2LastCol).getValues();
    f2RowsData.forEach(r => {
      const duAnName = String(r[0] || '').trim().toLowerCase();
      if (!duAnName) return;
      const monthScores = new Map();
      f2MonthsList.forEach((m) => {
        const s = r[m.colIdx - 1];
        if (s !== '' && s !== null && !isNaN(s)) monthScores.set(m.key, Number(s));
      });
      f2Map.set(duAnName, monthScores);
    });
  }

  // 2. Tải bảng Tổng hợp (Quỹ NW)
  const thMap = new Map(); // key: proj_code_lower -> list of { sanPham, loaiCan, khoangGia, monthScores }
  const thSheet = ss.getSheetByName(APP_CONFIG.SHEET_TONG_HOP);
  let thMonthsList = [];

  if (thSheet && thSheet.getLastRow() >= 4 && thSheet.getLastColumn() >= 10) {
    const firstMonthCol = 10;
    const thLastCol = thSheet.getLastColumn();
    const thHeaderRow = thSheet.getRange(3, 1, 1, thLastCol).getValues()[0];
    for (let c = firstMonthCol - 1; c < thLastCol; c++) {
      const d = normalizeToMonthDate(thHeaderRow[c], ss);
      if (d) {
        const key = formatDateSafe(d, ss).substring(0, 7);
        thMonthsList.push({ colIdx: c + 1, date: d, key });
      }
    }

    const thRowsData = thSheet.getRange(4, 1, thSheet.getLastRow() - 3, thLastCol).getValues();
    let currentCode = '';

    thRowsData.forEach(r => {
      if (r[2]) currentCode = String(r[2]).trim().toLowerCase();
      if (!currentCode) return;

      const sanPham = String(r[6] || '*').trim();
      const loaiCan = String(r[7] || '*').trim();
      const khoangGia = String(r[8] || '*').trim();

      const monthScores = new Map();
      thMonthsList.forEach((m) => {
        const s = r[m.colIdx - 1];
        if (s !== '' && s !== null && !isNaN(s)) monthScores.set(m.key, Number(s));
      });

      if (!thMap.has(currentCode)) thMap.set(currentCode, []);
      thMap.get(currentCode).push({ sanPham, loaiCan, khoangGia, monthScores });
    });
  }

  // 3. Danh mục tra cứu khác
  const masVCGSet = new Set();
  const masSheet = ss.getSheetByName(APP_CONFIG.SHEET_MAS_VCG);
  if (masSheet && masSheet.getLastRow() > 1) {
    const lastCol = Math.min(masSheet.getLastColumn(), 5);
    const vals = masSheet.getRange(2, 1, masSheet.getLastRow() - 1, Math.max(1, lastCol)).getValues();
    vals.forEach(r => {
      if (r[0]) masVCGSet.add(String(r[0]).trim().toUpperCase());
      if (r.length >= 3 && r[2]) masVCGSet.add(String(r[2]).trim().toUpperCase());
    });
  }

  const gianXayMap = new Map();
  const gxSheet = ss.getSheetByName(APP_CONFIG.SHEET_GIAN_XAY);
  if (gxSheet && gxSheet.getLastRow() > 1) {
    gxSheet.getRange(2, 1, gxSheet.getLastRow() - 1, 2).getValues()
      .forEach(r => { if (r[0]) gianXayMap.set(String(r[0]).trim().toUpperCase(), Number(r[1]) || 0); });
  }

  const cbnvMap = new Map();
  const cbnvSheet = ss.getSheetByName(APP_CONFIG.SHEET_CBNV);
  if (cbnvSheet && cbnvSheet.getLastRow() > 1) {
    cbnvSheet.getRange(2, 2, cbnvSheet.getLastRow() - 1, 2).getValues()
      .forEach(r => { if (r[0]) cbnvMap.set(String(r[0]).trim().toUpperCase(), String(r[1]).trim().toUpperCase()); });
  }

  // 4. Tải cấu hình Điểm Chiến Dịch (nếu có và đang chạy)
  let campaignConfig = null;
  const cdSheet = ss.getSheetByName(APP_CONFIG.SHEET_CHIEN_DICH);
  if (cdSheet && cdSheet.getLastRow() >= 4) {
    const metaVals = cdSheet.getRange(1, 1, 1, Math.max(8, cdSheet.getLastColumn())).getValues()[0];
    const cdName = String(metaVals[1] || '').trim();
    const rawStart = metaVals[3];
    const rawEnd = metaVals[5];
    const cdStatus = String(metaVals[7] || '').trim();

    const startDate = parseDateSafe(rawStart);
    const endDate = parseDateSafe(rawEnd);

    if (cdStatus !== 'Tạm dừng' && startDate && endDate) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const cdMap = new Map();
      const lastRow = cdSheet.getLastRow();
      const cdDataRows = cdSheet.getRange(4, 1, lastRow - 3, 11).getValues();

      let currentCode = '';
      cdDataRows.forEach(r => {
        if (r[2]) currentCode = String(r[2]).trim().toLowerCase();
        if (!currentCode) return;

        const sanPham = String(r[6] || '*').trim();
        const loaiCan = String(r[7] || '*').trim();
        const khoangGia = String(r[8] || '*').trim();
        const rawScore = r[9];
        const score = (rawScore !== '' && rawScore !== null && !isNaN(rawScore)) ? Number(rawScore) : 0;

        if (!cdMap.has(currentCode)) cdMap.set(currentCode, []);
        cdMap.get(currentCode).push({ sanPham, loaiCan, khoangGia, score });
      });

      campaignConfig = {
        active: true,
        name: cdName,
        startDate: startDate,
        endDate: endDate,
        map: cdMap
      };
    }
  }

  return { f2Map, f2MonthsList, thMap, thMonthsList, masVCGSet, gianXayMap, cbnvMap, campaignConfig };
}

/**
 * Hàm khớp 3 tiêu chí cấu hình (Sản phẩm, Loại căn, Khoảng giá) của bảng Tổng Hợp
 */
function matchRules(candSp, candLc, candGia, txSp, txLc, txPrice) {
  const tsp = (txSp || '').trim().toLowerCase();
  const tlc = normalizeUnit(txLc);
  const p = txPrice || 0;

  // 1. Khớp theo Sản Phẩm (Bỏ qua nếu là 'Tất cả' hoặc rỗng)
  if (!isConditionAll(candSp)) {
    const sp = String(candSp).trim().toLowerCase();
    if (sp.includes('thấp tầng') && tsp.includes('cao tầng')) return false;
    if (sp.includes('cao tầng') && tsp.includes('thấp tầng')) return false;
  }

  // 2. Khớp theo Khoảng Giá (Bỏ qua nếu là 'Tất cả' hoặc rỗng)
  if (!isConditionAll(candGia)) {
    const gia = String(candGia).trim().toLowerCase();

    // 2.1 Dạng khoảng: 10 - 20 hoặc Từ 10 - 20 tỷ hoặc 10-20
    const rangeMatch = gia.match(/(?:từ\s*)?(\d+(?:[.,]\d+)?)\s*(?:-|đến)\s*(\d+(?:[.,]\d+)?)/i);
    if (rangeMatch) {
      const minP = parseFloat(rangeMatch[1].replace(',', '.'));
      const maxP = parseFloat(rangeMatch[2].replace(',', '.'));
      if (p < minP || p > maxP) return false;
    } else {
      // 2.2 Dạng lớn hơn / trên / từ X trở lên: >= 10, > 10, trên 10, từ 10 tỷ trở lên
      const fromMatch = gia.match(/(?:\>=\s*(\d+(?:[.,]\d+)?))|(?:\>\s*(\d+(?:[.,]\d+)?))|(?:trên\s*(\d+(?:[.,]\d+)?))|(?:từ\s*(\d+(?:[.,]\d+)?)\s*t[ỷỉ]\s*trở\s*lên)/i);
      if (fromMatch) {
        const minP = parseFloat((fromMatch[1] || fromMatch[2] || fromMatch[3] || fromMatch[4]).replace(',', '.'));
        if (p < minP) return false;
      } else {
        // 2.3 Dạng nhỏ hơn / dưới: <= 10, < 10, dưới 10
        const toMatch = gia.match(/(?:\<=\s*(\d+(?:[.,]\d+)?))|(?:\<\s*(\d+(?:[.,]\d+)?))|(?:dưới\s*(\d+(?:[.,]\d+)?))/i);
        if (toMatch) {
          const maxP = parseFloat((toMatch[1] || toMatch[2] || toMatch[3]).replace(',', '.'));
          if (p >= maxP) return false;
        } else {
          // 2.4 Dạng bằng: = 10
          const eqMatch = gia.match(/(?:^|[^<>!])=\s*(\d+(?:[.,]\d+)?)/);
          if (eqMatch) {
            const targetP = parseFloat(eqMatch[1].replace(',', '.'));
            if (Math.abs(p - targetP) > 0.05) return false;
          }
        }
      }
    }
  }

  // 3. Khớp theo Loại Căn (Bỏ qua nếu là 'Tất cả' hoặc rỗng)
  if (!isConditionAll(candLc)) {
    const rawLc = String(candLc).trim();
    const lc = rawLc.toLowerCase();

    // 3.1 Dải so sánh theo ngữ nghĩa
    if (lc.includes('từ 1pn trở lên')) {
      if (tlc.includes('studio')) return false;
      return true;
    }
    if (lc.includes('từ 1pn trở xuống')) {
      if (tlc.includes('2pn') || tlc.includes('3pn') || tlc.includes('4pn') || tlc.includes('7pn')) return false;
      return true;
    }
    if (lc.includes('từ 2pn trở lên')) {
      if (tlc.includes('studio') || (tlc.includes('1pn') && !tlc.includes('2pn'))) return false;
      return true;
    }
    if (lc.includes('2pn trở xuống')) {
      if (tlc.includes('3pn') || tlc.includes('4pn') || tlc.includes('7pn')) return false;
      return true;
    }

    // 3.2 Tách danh sách loại căn theo dấu phẩy hoặc chữ 'và'
    const unitTokens = rawLc.split(/[,;\n]|(?:\s+và\s+)/i)
      .map(t => normalizeUnit(t))
      .filter(t => t.length > 0);

    if (unitTokens.length > 0) {
      const matched = unitTokens.some(tok => {
        if (tlc === tok) return true;
        // Penthouse Duplex vs Penthouse / Duplex độc lập
        if (tok === 'penthouse duplex' || tok === 'penhouse duplex') {
          return tlc === 'penthouse duplex' || tlc === 'penhouse duplex';
        }
        if (tok === 'penthouse' || tok === 'penhouse') {
          return tlc === 'penthouse' || tlc === 'penhouse'; // Không match penthouse duplex
        }
        if (tok === 'duplex') {
          return tlc === 'duplex' || tlc.startsWith('duplex '); // Không match penthouse duplex
        }
        // Shophouse & Shop đế
        if (tok === 'shophouse' || tok === 'shophouses') {
          return tlc.includes('shophouse') || tlc === 'shop đế' || tlc === 'tmdv';
        }
        // Các loại căn phòng ngủ
        if (tok === '1pn') return tlc === '1pn' || tlc === '1pn+';
        if (tok === '1pn+') return tlc === '1pn+' || tlc === '1pn+1đn';
        if (tok === '2pn') return tlc === '2pn';
        if (tok === '2pn+') return tlc === '2pn+' || tlc === '2pn+1đn';
        if (tok === '3pn') return tlc === '3pn' || tlc === '3br-l' || tlc === '3br-m' || tlc === '3brl' || tlc === '3pn+1đn' || tlc.includes('3pn+');
        if (tok === '3pn+') return tlc === '3pn+' || tlc === '3pn+1đn' || tlc.includes('3pn+');
        if (tok === '4pn') return tlc === '4pn' || tlc.includes('4br');
        if (tok === 'simplex') return tlc === 'simplex';
        if (tok === 'triplex') return tlc === 'triplex';
        if (tok === 'liền kề') return tlc === 'liền kề' || tlc === 'liền ke';
        if (tok === 'song lập') return tlc === 'song lập';
        if (tok === 'đơn lập') return tlc === 'đơn lập';
        if (tok === 'tứ lập') return tlc === 'tứ lập';
        return false;
      });
      if (!matched) return false;
    }
  }

  return true;
}

/**
 * Hàm backward compatibility cho matchCondition
 */
function matchCondition(conditionStr, sanPham, loaiCan, priceBill) {
  const parsed = parseConditionToThreeFields(conditionStr);
  return matchRules(parsed.sanPham, parsed.loaiCan, parsed.khoangGia, sanPham, loaiCan, priceBill);
}

/**
 * =========================================================================
 * ĐÁNH GIÁ 1 DÒNG DỮ LIỆU GIAO DỊCH VỚI MA TRẬN ĐIỂM THEO THÁNG
 * =========================================================================
 */
function evaluateRowWithRules(row, rulesOrCtx, masVCGSet, gianXayMap, cbnvMap) {
  // 1. Kiểm tra Ngày báo cáo
  const dateBC = parseDateSafe(row[0], row);
  if (!dateBC) return '';

  // 2. BẮT BUỘC: Kiểm tra Cột Z (Loại Quỹ - index 25). Nếu chưa điền Cột Z -> KHÔNG TÍNH, trả về rỗng ''
  const rawLoaiQuy = String(row[25] || '').trim();
  if (!rawLoaiQuy) return '';

  const loaiQuy = /NW/i.test(rawLoaiQuy) ? 'Quỹ NW' : 'Quỹ Chéo';

  const duAn = String(row[5] || '').trim();
  const maCan = String(row[6] || '').trim().toUpperCase();
  const pkd = String(row[7] || '').trim();
  const cvkdName = String(row[8] || '').trim().toUpperCase();
  const trangThai = String(row[9] || '').trim();
  const giaChuaVat = parseNumberSafe(row[10]);
  const giaGomVat = parseNumberSafe(row[11]);
  const sanPham = String(row[14] || '').trim();
  const loaiCan = String(row[16] || '').trim();
  const maNV = String(row[17] || '').trim().toUpperCase();
  const ghiChu = String(row[32] || '').trim();

  if (trangThai === 'Hủy') return 0;
  if (pkd === 'CTV/ĐỐI TÁC' || /BLĐ/i.test(pkd) || /BO/i.test(pkd)) return 0;

  // Lấy context từ đối số
  const ctx = (rulesOrCtx && rulesOrCtx.thMap) ? rulesOrCtx : getRuleEngineContext();

  // Xác định monthKey của giao dịch (YYYY-MM)
  const monthKey = `${dateBC.getFullYear()}-${String(dateBC.getMonth() + 1).padStart(2, '0')}`;

  let rawVal = giaGomVat > 0 ? giaGomVat : giaChuaVat;
  if (duAn === 'VHHVB' && ctx.gianXayMap.has(maCan)) {
    rawVal = ctx.gianXayMap.get(maCan);
  }
  const valInBillion = rawVal / 1e9;

  let baseScore = 0;

  // 3. ƯU TIÊN HÀNG ĐẦU: Khớp điểm theo Chiến Dịch (nếu ngày báo cáo nằm trong thời gian chiến dịch)
  let isCampaignMatched = false;
  if (ctx.campaignConfig && ctx.campaignConfig.active) {
    if (dateBC >= ctx.campaignConfig.startDate && dateBC <= ctx.campaignConfig.endDate) {
      const duAnKey = duAn.toLowerCase();
      let candidates = ctx.campaignConfig.map.get(duAnKey) || [];
      if (candidates.length === 0) {
        for (const [code, list] of ctx.campaignConfig.map.entries()) {
          if (duAnKey.includes(code) || code.includes(duAnKey)) {
            candidates = list;
            break;
          }
        }
      }

      if (candidates.length > 0) {
        let matchedRow = null;
        for (const cand of candidates) {
          if (matchRules(cand.sanPham, cand.loaiCan, cand.khoangGia, sanPham, loaiCan, valInBillion)) {
            matchedRow = cand;
            break;
          }
        }
        if (!matchedRow) {
          matchedRow = candidates.find(c => 
            isConditionAll(c.sanPham) && 
            isConditionAll(c.loaiCan) && 
            isConditionAll(c.khoangGia)
          ) || candidates[0];
        }

        if (matchedRow && matchedRow.score !== '' && matchedRow.score !== null && !isNaN(matchedRow.score) && Number(matchedRow.score) > 0) {
          baseScore = Number(matchedRow.score);
          isCampaignMatched = true;
        }
      }
    }
  }

  // 4. Nếu không thuộc chiến dịch, tính theo bảng điểm tháng thông thường
  if (!isCampaignMatched) {
    if (loaiQuy === 'Quỹ Chéo') {
      // Tra cứu trong bảng Dự án F2
      const duAnKey = duAn.toLowerCase();
      if (ctx.f2Map.has(duAnKey)) {
        const monthScores = ctx.f2Map.get(duAnKey);
        if (monthScores.has(monthKey)) {
          baseScore = monthScores.get(monthKey);
        } else {
          // Lấy tháng gần nhất
          const latestKey = ctx.f2MonthsList[0] ? ctx.f2MonthsList[0].key : null;
          baseScore = (latestKey && monthScores.has(latestKey)) ? monthScores.get(latestKey) : 1;
        }
      } else {
        baseScore = 1; // Mặc định Quỹ chéo không thuộc danh sách F2 là 1 điểm
      }
    } else {
      // Quỹ NW: Tra cứu trong bảng Tổng Hợp
      const duAnKey = duAn.toLowerCase();
      let candidates = ctx.thMap.get(duAnKey) || [];

      // Nếu không tìm thấy bằng tên dự án, thử tìm bằng mã căn hoặc từ khóa
      if (candidates.length === 0) {
        for (const [code, list] of ctx.thMap.entries()) {
          if (duAnKey.includes(code) || code.includes(duAnKey)) {
            candidates = list;
            break;
          }
        }
      }

      if (candidates.length > 0) {
        let matchedRow = null;

        // Ưu tiên dòng khớp cả 3 tiêu chí Sản phẩm, Loại căn, Khoảng giá trước
        for (const cand of candidates) {
          if (matchRules(cand.sanPham, cand.loaiCan, cand.khoangGia, sanPham, loaiCan, valInBillion)) {
            matchedRow = cand;
            break;
          }
        }

        // Nếu không có dòng khớp cụ thể, lấy dòng mặc định ('Tất cả', 'Tất cả', 'Tất cả')
        if (!matchedRow) {
          matchedRow = candidates.find(c => 
            isConditionAll(c.sanPham) && 
            isConditionAll(c.loaiCan) && 
            isConditionAll(c.khoangGia)
          ) || candidates[0];
        }

        if (matchedRow) {
          if (matchedRow.monthScores.has(monthKey) && matchedRow.monthScores.get(monthKey) !== '' && matchedRow.monthScores.get(monthKey) !== null) {
            baseScore = matchedRow.monthScores.get(monthKey);
          } else {
            // Nếu tháng giao dịch chưa có điểm trên bảng Tổng hợp: ưu tiên kế thừa điểm của tháng đã cấu hình gần nhất
            let foundScore = null;
            for (const m of ctx.thMonthsList) {
              if (matchedRow.monthScores.has(m.key) && matchedRow.monthScores.get(m.key) !== '' && matchedRow.monthScores.get(m.key) !== null) {
                foundScore = matchedRow.monthScores.get(m.key);
                break;
              }
            }
            baseScore = foundScore !== null ? foundScore : 2;
          }
        }
      } else {
        // Dự án Quỹ NW chưa có cấu hình riêng trong bảng Tổng hợp (vd: TPV, S-Light,...):
        // Áp dụng điểm mặc định 2 điểm cho Quỹ NW (theo cơ chế R035)
        baseScore = 2;
      }
    }
  }

  // 5. Các điểm thưởng & hệ số đặc thù
  let bonusScore = 0;

  // Căn đặc biệt MAS VCG (8 điểm)
  if (duAn.trim().toUpperCase() === 'VCG' && ctx.masVCGSet.has(maCan)) {
    baseScore = 8;
  }

  // Thưởng thêm căn > 30 tỷ từ tháng 5/2025 (loại trừ VCG và căn Quỹ 'Check D' tại Cột N - index 13)
  const cotN_Quy = String(row[13] || '').trim();
  if (dateBC >= new Date(2025, 4, 1) && valInBillion >= 30 && cotN_Quy !== 'Check D' && duAn.trim().toUpperCase() !== 'VCG') {
    bonusScore += 1;
  }

  const baseVal = baseScore + bonusScore;

  // Hệ số chiến dịch thời gian (chỉ áp dụng dự phòng nếu chưa có điểm chiến dịch riêng)
  let timeMultiplier = 1;
  if (!isCampaignMatched && dateBC >= new Date(2026, 1, 14) && dateBC <= new Date(2026, 1, 28)) {
    timeMultiplier = 2;
  }

  // Hệ số phòng PTĐT
  let ptdtMultiplier = 1;
  if (/PTĐT/i.test(pkd)) {
    const verifiedName = ctx.cbnvMap.get(maNV);
    const isInternalPolicy = /Cơ chế nội bộ/i.test(ghiChu);
    if ((verifiedName && verifiedName === cvkdName) || isInternalPolicy) {
      ptdtMultiplier = 1;
    } else {
      ptdtMultiplier = 0.5;
    }
  }

  return baseVal * timeMultiplier * ptdtMultiplier;
}

/**
 * =========================================================================
 * [OPTION 1]: TÍNH LẠI TOÀN BỘ ĐIỂM TRONG SHEET DATA (CHẠY THỦ CÔNG)
 * =========================================================================
 */
function calculateAllScoresWithRules() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() < 2) return { success: false, error: 'Không có dữ liệu trong sheet Data' };

    const ctx = getRuleEngineContext(ss);
    const lastRow = dataSheet.getLastRow();
    const rows = dataSheet.getRange(2, 1, lastRow - 1, 33).getValues();
    const outputScores = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const score = evaluateRowWithRules(row, ctx);
      outputScores.push([cleanScore(score)]);
    }

    dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, outputScores.length, 1)
      .setValues(outputScores)
      .setNumberFormat('0.##')
      .setHorizontalAlignment('center');
    SpreadsheetApp.getActiveSpreadsheet().toast(`⚡ [Option 1] Đã tính lại toàn bộ ${rows.length} dòng!`, 'Thành công', 3);
    return { success: true, count: rows.length };
  } catch (err) {
    Logger.log('Lỗi calculateAllScoresWithRules: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * [OPTION 2 - THỦ CÔNG]: TÍNH ĐIỂM CHO CÁC DÒNG ĐANG ĐƯỢC CHỌN (SELECTION)
 * =========================================================================
 */
function calculateSelectedRows() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    
    if (activeSheet.getName() !== APP_CONFIG.SHEET_DATA) {
      SpreadsheetApp.getUi().alert(`Vui lòng chọn các dòng bên sheet "${APP_CONFIG.SHEET_DATA}" để tính điểm!`);
      return;
    }

    const range = activeSheet.getActiveRange();
    if (!range) return;

    const startRow = Math.max(2, range.getRow());
    const numRows = range.getNumRows();
    const endRow = Math.min(activeSheet.getLastRow(), startRow + numRows - 1);

    if (endRow < startRow) {
      SpreadsheetApp.getUi().alert('Không có dòng dữ liệu nào được chọn!');
      return;
    }

    const rowNumbers = [];
    for (let r = startRow; r <= endRow; r++) {
      rowNumbers.push(r);
    }

    const res = calculateSpecificRows(rowNumbers);
    if (res.success) {
      ss.toast(`📌 [Option 2] Đã tính điểm cho ${res.count} dòng được chọn (Dòng ${startRow} -> ${endRow})!`, 'Thành công', 3);
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi tính dòng được chọn: ' + err.toString());
  }
}

/**
 * =========================================================================
 * [OPTION 2 - CORE]: HÀM TÍNH ĐIỂM BATCH HÀNG LOẠT SIÊU TỐC (CHỐNG NGHẼN RPC)
 * =========================================================================
 * Đọc/ghi 1 lần duy nhất bằng mảng 2 chiều thay vì gọi getRange/setValue từng dòng.
 * Tốc độ tăng hơn 100 lần, tính 1.000 dòng chỉ mất chưa tới 1 giây!
 */
function calculateSpecificRows(rowNumbers) {
  try {
    if (!rowNumbers || rowNumbers.length === 0) return { success: true, count: 0 };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet) return { success: false, error: 'Sheet Data không tồn tại' };

    const validRows = Array.from(new Set(rowNumbers.filter(r => r >= 2))).sort((a, b) => a - b);
    if (validRows.length === 0) return { success: true, count: 0 };

    const ctx = getRuleEngineContext(ss);
    const minRow = validRows[0];
    const maxRow = validRows[validRows.length - 1];
    const span = maxRow - minRow + 1;

    // CHIẾN LƯỢC BATCH SIÊU TỐC:
    // Nếu dải dòng <= 3000 hoặc mật độ dòng cần tính cao (> 30%):
    // Đọc 1 lần toàn bộ dải, tính toán trong RAM và GHI 1 LẦN DUY NHẤT!
    if (span <= 3000 || (validRows.length / span) > 0.3) {
      const rangeData = dataSheet.getRange(minRow, 1, span, 33).getValues();
      const scoreData = dataSheet.getRange(minRow, APP_CONFIG.COL_OUTPUT_SCORE, span, 1).getValues();
      const targetSet = new Set(validRows);

      for (let i = 0; i < span; i++) {
        const actualRow = minRow + i;
        if (targetSet.has(actualRow)) {
          const score = evaluateRowWithRules(rangeData[i], ctx);
          scoreData[i][0] = cleanScore(score);
        }
      }

      dataSheet.getRange(minRow, APP_CONFIG.COL_OUTPUT_SCORE, span, 1)
        .setValues(scoreData)
        .setNumberFormat('0.##')
        .setHorizontalAlignment('center');
    } else {
      // Nếu các dòng nằm rải rác rất xa nhau, gom thành các cụm (chunk) gần nhau
      const chunks = [];
      let curChunk = [validRows[0]];

      for (let i = 1; i < validRows.length; i++) {
        if (validRows[i] - validRows[i - 1] <= 10) {
          curChunk.push(validRows[i]);
        } else {
          chunks.push(curChunk);
          curChunk = [validRows[i]];
        }
      }
      chunks.push(curChunk);

      chunks.forEach(chunk => {
        const cStart = chunk[0];
        const cEnd = chunk[chunk.length - 1];
        const cSpan = cEnd - cStart + 1;
        const cData = dataSheet.getRange(cStart, 1, cSpan, 33).getValues();
        const cScores = dataSheet.getRange(cStart, APP_CONFIG.COL_OUTPUT_SCORE, cSpan, 1).getValues();
        const cSet = new Set(chunk);

        for (let j = 0; j < cSpan; j++) {
          if (cSet.has(cStart + j)) {
            const score = evaluateRowWithRules(cData[j], ctx);
            cScores[j][0] = cleanScore(score);
          }
        }

        dataSheet.getRange(cStart, APP_CONFIG.COL_OUTPUT_SCORE, cSpan, 1)
          .setValues(cScores)
          .setNumberFormat('0.##')
          .setHorizontalAlignment('center');
      });
    }

    return { success: true, count: validRows.length };
  } catch (err) {
    Logger.log('Lỗi calculateSpecificRows: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * [CÀI ĐẶT TRIGGER TỰ ĐỘNG] - CHẠY HÀM NÀY 1 LẦN DUY NHẤT
 * =========================================================================
 * Tự động kích hoạt:
 * 1. Chạy ngay lập tức: Kiểm tra và tạo cột tháng mới (ví dụ 09/2026) nếu chưa có, copy điểm từ tháng trước sang!
 * 2. Cài đặt Trigger On-Edit: Tự động tính điểm ngay khi chỉnh sửa/dán dữ liệu vào sheet Data.
 * 3. Cài đặt Trigger Hàng Ngày (Time-driven): Tự động kiểm tra và chèn cột tháng mới lúc 1h sáng mỗi ngày khi bước sang tháng mới.
 * 4. Tự động tính điểm siêu tốc cho toàn bộ các dòng chưa có điểm trong sheet Data!
 */
function setupAutoTrigger() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. TỰ ĐỘNG CHẠY KIỂM TRA & BÙ CỘT THÁNG MỚI NGAY LẬP TỨC
    const syncRes = ensureCurrentMonthConfigured(ss);

    // 2. XÓA CÁC TRIGGER CŨ LIÊN QUAN ĐỂ TRÁNH TRÙNG LẶP
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      const fn = t.getHandlerFunction();
      if (fn === 'onEditAutoScore' || fn === 'autoTriggerOnDataChange' || fn === 'autoDailyCheckAndSyncMonth') {
        ScriptApp.deleteTrigger(t);
      }
    });

    // 3. CÀI ĐẶT TRIGGER ON-EDIT: TỰ ĐỘNG TÍNH ĐIỂM KHI NHẬP/DÁN DỮ LIỆU
    ScriptApp.newTrigger('onEditAutoScore')
      .forSpreadsheet(ss)
      .onEdit()
      .create();

    // 4. CÀI ĐẶT TRIGGER THEO THỜI GIAN: CHẠY HÀNG NGÀY LÚC 1H SÁNG (TỰ ĐỘNG TẠO CỘT THÁNG MỚI)
    ScriptApp.newTrigger('autoDailyCheckAndSyncMonth')
      .timeBased()
      .everyDays(1)
      .atHour(1)
      .create();

    // 5. TỰ ĐỘNG QUÉT & TÍNH ĐIỂM SIÊU TỐC HÀNG LOẠT CHO CÁC DÒNG CHƯA CÓ ĐIỂM
    let scoredCount = 0;
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (dataSheet && dataSheet.getLastRow() >= 2) {
      const numRows = dataSheet.getLastRow() - 1;
      const scoreVals = dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).getValues();
      const unscored = [];
      for (let i = 0; i < numRows; i++) {
        const val = scoreVals[i][0];
        if (val === '' || val === null || val === undefined || val === 'Check' || String(val).trim() === '') {
          unscored.push(i + 2);
        }
      }
      if (unscored.length > 0) {
        const cRes = calculateSpecificRows(unscored);
        if (cRes.success) scoredCount = cRes.count;
      }
    }

    const curMonthStr = formatMonthDisplay(getCurrentMonthDate(ss), ss);
    let msg = '';
    if (syncRes && syncRes.updated) {
      msg += `🎉 ĐÃ TỰ ĐỘNG TẠO CỘT THÁNG MỚI (${syncRes.monthDisplay}) VÀ SAO CHÉP ĐIỂM TỪ THÁNG TRƯỚC SANG!\n\n`;
    } else {
      msg += `ℹ️ Cột tháng hiện tại (${curMonthStr}) đã sẵn sàng trong bảng cấu hình.\n\n`;
    }

    if (scoredCount > 0) {
      msg += `⚡ ĐÃ TỰ ĐỘNG TÍNH ĐIỂM SIÊU TỐC CHO ${scoredCount} DÒNG TRONG SHEET "${APP_CONFIG.SHEET_DATA}"!\n\n`;
    }

    msg += `Hệ thống đã thiết lập 2 Trigger tự động chạy ngầm:\n` +
      `1. [Trigger On-Edit]: Tự động tính điểm ngay lập tức khi bạn nhập hoặc dán dòng dữ liệu mới vào sheet "${APP_CONFIG.SHEET_DATA}".\n` +
      `2. [Trigger Hàng Ngày (1h sáng)]: Tự động kiểm tra và chèn cột tháng mới mỗi khi sang tháng mới (kèm copy điểm từ tháng trước sang) mà không cần phải mở bảng cấu hình!`;

    SpreadsheetApp.getUi().alert('✅ Cài Đặt Trigger Tự Động Hoàn Tất', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi khi cài đặt trigger: ' + err.toString());
  }
}

/**
 * =========================================================================
 * TRIGGER CHẠY HÀNG NGÀY (TIME-DRIVEN): TỰ ĐỘNG TẠO CỘT THÁNG MỚI
 * =========================================================================
 * Tự động chạy mỗi ngày lúc 1h - 2h sáng.
 * Khi vừa bước sang ngày đầu tiên của tháng mới (hoặc đã qua tháng mới mà chưa có cột),
 * hàm này tự động chèn cột tháng hiện tại vào sheet "Tổng hợp" và "Dự án F2",
 * sao chép toàn bộ điểm của tháng liền kề trước đó sang!
 */
function autoDailyCheckAndSyncMonth() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const res = ensureCurrentMonthConfigured(ss);
    if (res && res.updated) {
      Logger.log(`[Daily Trigger] Đã tự động tạo cột tháng mới: ${res.monthDisplay}`);
    } else {
      Logger.log(`[Daily Trigger] Cột tháng hiện tại (${res ? res.monthDisplay : ''}) đã tồn tại đầy đủ.`);
    }

    // Tự động quét và tính điểm bổ sung cho các dòng Data chưa có điểm (nếu có)
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (dataSheet && dataSheet.getLastRow() >= 2) {
      const numRows = dataSheet.getLastRow() - 1;
      const scoreVals = dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).getValues();
      const unscored = [];
      for (let i = 0; i < numRows; i++) {
        if (scoreVals[i][0] === '' || scoreVals[i][0] === null || scoreVals[i][0] === undefined) {
          unscored.push(i + 2);
        }
      }
      if (unscored.length > 0) {
        calculateSpecificRows(unscored);
        Logger.log(`[Daily Trigger] Đã tự động tính điểm cho ${unscored.length} dòng chưa có điểm.`);
      }
    }
  } catch (err) {
    Logger.log(`[Daily Trigger Error] Lỗi kiểm tra cột tháng: ${err.toString()}`);
  }
}

/**
 * =========================================================================
 * [OPTION 2 - TỰ ĐỘNG]: TRIGGER ON EDIT - TÍNH ĐIỂM NGAY KHI CHỈNH SỬA / DÁN
 * =========================================================================
 */
function onEditAutoScore(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== APP_CONFIG.SHEET_DATA) return;

    const startRow = e.range.getRow();
    const numRows = e.range.getNumRows();
    const firstDataRow = Math.max(2, startRow);
    const lastDataRow = startRow + numRows - 1;
    if (lastDataRow < firstDataRow) return;

    const rowCount = lastDataRow - firstDataRow + 1;
    const rangeData = sheet.getRange(firstDataRow, 1, rowCount, 33).getValues();
    const scoreData = sheet.getRange(firstDataRow, APP_CONFIG.COL_OUTPUT_SCORE, rowCount, 1).getValues();

    const toProcess = [];
    const toBlankIndices = [];
    for (let i = 0; i < rowCount; i++) {
      const rowData = rangeData[i];
      const currentScore = scoreData[i][0];
      const actualRowNum = firstDataRow + i;

      // BẮT BUỘC: Cột Z (Loại Quỹ - index 25) PHẢI CÓ GIÁ TRỊ!
      const hasFundType = String(rowData[25] || '').trim() !== '';

      // Nếu Cột Z chưa điền mà Cột X đang có điểm cũ -> Gom vào để xóa trắng hàng loạt
      if (!hasFundType) {
        if (currentScore !== '' && currentScore !== null && currentScore !== undefined) {
          toBlankIndices.push(i);
        }
        continue;
      }

      const hasIdentity = (
        String(rowData[5] || '').trim() !== '' || 
        String(rowData[6] || '').trim() !== '' || 
        parseDateSafe(rowData[0], rowData) !== null ||
        String(rowData[8] || '').trim() !== ''
      );

      if (hasIdentity && hasFundType) {
        toProcess.push(actualRowNum);
      }
    }

    if (toBlankIndices.length > 0) {
      toBlankIndices.forEach(idx => { scoreData[idx][0] = ''; });
      sheet.getRange(firstDataRow, APP_CONFIG.COL_OUTPUT_SCORE, rowCount, 1).setValues(scoreData);
    }

    if (toProcess.length === 0) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return;

    try {
      calculateSpecificRows(toProcess);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log('Lỗi onEditAutoScore: ' + (error.message || error));
  }
}

/**
 * =========================================================================
 * [QUÉT THỦ CÔNG]: TÌM & TÍNH TẤT CẢ DÒNG CHƯA CÓ ĐIỂM TRÊN SHEET
 * =========================================================================
 */
function autoTriggerOnDataChange(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    ss.toast('Đang có tiến trình khác chạy, vui lòng thử lại sau vài giây.', 'Bận', 3);
    return;
  }

  try {
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() < 2) {
      SpreadsheetApp.getUi().alert('Không tìm thấy sheet "' + APP_CONFIG.SHEET_DATA + '" hoặc sheet chưa có dữ liệu.');
      return;
    }

    const numRows = dataSheet.getLastRow() - 1;
    const dataRange = dataSheet.getRange(2, 1, numRows, 33).getValues();
    const scoreRange = dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).getValues();
    const unscoredRowNumbers = [];
    const missingFundRows = [];
    let hasBlankUpdated = false;

    for (let i = 0; i < numRows; i++) {
      const row = dataRange[i];
      const currentScore = scoreRange[i][0];
      const actualRowNum = i + 2;

      const hasFundType = String(row[25] || '').trim() !== '';
      const hasIdentity = (
        String(row[5] || '').trim() !== '' || 
        String(row[6] || '').trim() !== '' || 
        parseDateSafe(row[0], row) !== null ||
        String(row[8] || '').trim() !== ''
      );

      if (!hasIdentity) continue;

      if (!hasFundType) {
        if (currentScore !== '' && currentScore !== null && currentScore !== undefined) {
          scoreRange[i][0] = '';
          hasBlankUpdated = true;
        }
        if (missingFundRows.length < 10) missingFundRows.push(actualRowNum);
        continue;
      }

      const isScoreEmpty = (
        currentScore === '' || 
        currentScore === null || 
        currentScore === undefined || 
        currentScore === 'Check' || 
        String(currentScore).trim() === ''
      );

      if (isScoreEmpty) {
        unscoredRowNumbers.push(actualRowNum);
      }
    }

    if (hasBlankUpdated) {
      dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).setValues(scoreRange);
    }

    if (unscoredRowNumbers.length === 0) {
      let msg = 'ℹ️ Không có dòng nào cần tính điểm.';
      if (missingFundRows.length > 0) {
        msg += '\n\n📌 Các dòng sau CHƯA ĐIỀN Loại Quỹ (Cột Z) nên chưa được tính:\n-> Dòng: ' + missingFundRows.join(', ');
      }
      SpreadsheetApp.getUi().alert(msg);
      return;
    }

    const res = calculateSpecificRows(unscoredRowNumbers);
    if (!res.success) {
      SpreadsheetApp.getUi().alert('Lỗi khi tính điểm: ' + res.error);
      return;
    }

    SpreadsheetApp.getUi().alert(`✅ Thành công! Đã tính điểm cho ${unscoredRowNumbers.length} dòng:\n(Dòng: ${unscoredRowNumbers.slice(0, 15).join(', ')}${unscoredRowNumbers.length > 15 ? '...' : ''})`);
  } catch (error) {
    Logger.log('Lỗi: ' + (error.message || error));
    SpreadsheetApp.getUi().alert('Đã xảy ra lỗi: ' + (error.message || error));
  } finally {
    lock.releaseLock();
  }
}
