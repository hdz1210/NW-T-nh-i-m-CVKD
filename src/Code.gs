/**
 * =========================================================================
 * HỆ THỐNG QUẢN LÝ CƠ CHẾ VÀ TÍNH ĐIỂM KPI THEO THÁNG (MONTHLY BI ENGINE)
 * =========================================================================
 * Tự động đồng bộ điểm theo từng tháng (Bảng Tổng Hợp và Dự Án F2)
 * Tự động tạo cột tháng mới và kế thừa điểm khi bước sang tháng mới
 */

const APP_VERSION = {
  COMMIT: '8d88c66',
  BUILD_TIME: '2026-09-09 15:23:01',
};

const APP_CONFIG = {
  AUTO_SCORE_INTERVAL_MINUTES: 1,
  SHEET_DATA: 'Data',
  SHEET_TONG_HOP: 'Tổng hợp',
  SHEET_DU_AN_F2: 'Dự án F2',
  SHEET_CONFIG_LEGACY: 'CauHinh_Diem',
  SHEET_MAS_VCG: 'Danh sách căn MAS VCG',
  SHEET_GIAN_XAY: 'Giãn xây HVB',
  SHEET_CBNV: 'CBNV',
  SHEET_CHIEN_DICH: 'Điểm Chiến Dịch',
  COL_OUTPUT_SCORE: 24, // Cột X: Điểm tạm (Index 24)
  COL_VERIFY_SCORE: 25, // Cột Y: Điểm Verify (Index 25)
  COL_CAN_XIN_CO_CHE: 28, // Cột AB: Căn xin cơ chế (Index 28)
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
 * Kiểm tra xem một dòng giao dịch có thuộc về tháng cũ (Tháng 8/2026 trở về trước) hay không.
 * Các đơn hàng tháng cũ được đóng băng điểm Cột X, tuyệt đối không bị tính lại hay sửa đổi
 * khi bất kỳ trigger hoặc chức năng tính điểm nào chạy.
 */
function isPastMonthRow(row) {
  if (!row) return false;
  // 1. Kiểm tra Cột C (Tháng: index 2) & Cột D (Năm: index 3)
  if (row[2] !== undefined && row[2] !== null && String(row[2]).trim() !== '' &&
      row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== '') {
    const rawY = String(row[3]).replace(/\D/g, '');
    const rawM = String(row[2]).replace(/\D/g, '');
    const y = parseInt(rawY, 10);
    const m = parseInt(rawM, 10);
    if (!isNaN(y) && !isNaN(m)) {
      if (y < 2026) return true;
      if (y === 2026 && m < 9) return true;
      return false;
    }
  }
  // 2. Phân tích Cột A (Ngày báo cáo: index 0)
  const dateBC = parseDateSafe(row[0], row);
  if (dateBC && dateBC instanceof Date && !isNaN(dateBC.getTime())) {
    const y = dateBC.getFullYear();
    const m = dateBC.getMonth() + 1; // 1-12
    if (y < 2026) return true;
    if (y === 2026 && m < 9) return true;
    return false;
  }
  return false;
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
    .createMenu('Cấu Hình Điểm')
    .addItem('Bảng Cấu Hình Điểm', 'openConfigUI')
    .addItem('Trình Tạo Biểu Đồ & Báo Cáo', 'openChartBuilderUI')
    .addSeparator()
    .addItem('Tính điểm dòng chọn / mới', 'calculateSelectedRows')
    .addItem('Tính lại toàn bộ điểm Data', 'calculateAllScoresWithRules')
    .addItem('Quét & tính dòng chưa có điểm', 'autoTriggerOnDataChange')
    .addItem('Kiểm tra căn xin cơ chế (Cột AB & Y)', 'checkAndFormatCanXinCoChe')
    .addSeparator()
    .addItem('Đồng bộ / Thêm cột tháng', 'manualSyncCurrentMonth')
    .addItem('Cài đặt Trigger tự động', 'setupAutoTrigger')
    .addSeparator()
    .addItem(`Commit: ${APP_VERSION.COMMIT}`, 'showVersionInfo')
    .addToUi();
}

/**
 * Hiển thị thông tin phiên bản commit build hiện tại
 */
function showVersionInfo() {
  SpreadsheetApp.getUi().alert(
    'Thông Tin Phiên Bản (Build Version)',
    `📌 Commit Hash: ${APP_VERSION.COMMIT}\n` +
    `🕒 Thời gian Build: ${APP_VERSION.BUILD_TIME}\n\n` +
    `Mã nguồn Google Apps Script đã được build và triển khai thành công từ commit ${APP_VERSION.COMMIT}.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Trả về thông tin phiên bản ứng dụng cho client UI
 */
function getAppVersion() {
  return APP_VERSION;
}

/**
 * Mở giao diện Web UI cấu hình đa tháng
 */
function openConfigUI() {
  const html = HtmlService.createHtmlOutputFromFile('ConfigUI')
    .setWidth(1400)
    .setHeight(840)
    .setTitle('Bảng Cấu Hình Điểm');
  SpreadsheetApp.getUi().showModalDialog(html, 'Bảng Cấu Hình Điểm');
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

/**
 * Đảm bảo sheet 'Dự án F2' có cột C (cột 3) là 'Khoảng Giá'.
 * Nếu chưa có (cột 3 đang là ngày tháng hoặc chưa có), chèn cột 'Khoảng Giá' vào cột 3 và điền 'Tất cả' cho các dòng hiện tại.
 */
function ensureF2KhoangGiaColumn(ss) {
  try {
    ss = ss || SpreadsheetApp.getActiveSpreadsheet();
    const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
    if (!f2Sheet) return 4;

    const lastCol = f2Sheet.getLastColumn();
    if (lastCol < 2) return 4;

    const col3Val = (lastCol >= 3) ? String(f2Sheet.getRange(3, 3).getValue() || '').trim().toLowerCase() : '';
    const isAlreadyGia = col3Val.includes('giá') || col3Val.includes('khoảng giá') || col3Val === 'khoang gia';

    if (!isAlreadyGia) {
      f2Sheet.insertColumnBefore(3);
      f2Sheet.getRange(2, 3).setValue('');
      f2Sheet.getRange(3, 3).setValue('Khoảng Giá')
        .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff').setHorizontalAlignment('center');
      
      const lastRow = f2Sheet.getLastRow();
      if (lastRow >= 4) {
        const numRows = lastRow - 3;
        const defaultVals = Array(numRows).fill(['Tất cả']);
        f2Sheet.getRange(4, 3, numRows, 1).setValues(defaultVals).setHorizontalAlignment('center');
      }
      f2Sheet.setFrozenColumns(3);
      f2Sheet.autoResizeColumns(1, 3);
      Logger.log('[Schema F2] Đã bổ sung cột "Khoảng Giá" vào cột C sheet Dự án F2.');
    }
    return 4;
  } catch (e) {
    Logger.log('Lỗi ensureF2KhoangGiaColumn: ' + e.toString());
    return 4;
  }
}

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
    ensureF2KhoangGiaColumn(ss);
    const f2FirstMonthCol = 4;
    const firstMonthVal = f2Sheet.getRange(3, f2FirstMonthCol).getValue();
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

          f2Sheet.insertColumnBefore(f2FirstMonthCol);

          f2Sheet.getRange(2, f2FirstMonthCol).setValue('');
          f2Sheet.getRange(3, f2FirstMonthCol).setValue(targetDate).setNumberFormat('mm/yyyy');

          const lastRow = f2Sheet.getLastRow();
          if (lastRow >= 4) {
            const prevScores = f2Sheet.getRange(4, f2FirstMonthCol + 1, lastRow - 3, 1).getValues();
            const cleanedScores = prevScores.map(r => [cleanScore(r[0])]);
            f2Sheet.getRange(4, f2FirstMonthCol, lastRow - 3, 1).setValues(cleanedScores);
            f2Sheet.getRange(4, f2FirstMonthCol, lastRow - 3, 1).setNumberFormat('0.##').setHorizontalAlignment('center');
          }

          f2Sheet.getRange(3, f2FirstMonthCol).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

          updated = true;
          Logger.log(`[Auto-Rollover] Đã thêm cột tháng ${formatMonthDisplay(targetDate, ss)} vào sheet Dự án F2.`);
        }
      }
    }

    const f2LastRow = f2Sheet.getLastRow();
    const f2LastCol = f2Sheet.getLastColumn();
    if (f2LastRow >= 4 && f2LastCol >= f2FirstMonthCol) {
      f2Sheet.getRange(4, f2FirstMonthCol, f2LastRow - 3, f2LastCol - f2FirstMonthCol + 1).setNumberFormat('0.##').setHorizontalAlignment('center');
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
  const f2FirstMonthCol = 4;
  if (f2Sheet && f2Sheet.getLastColumn() >= f2FirstMonthCol && f2Sheet.getLastRow() >= 4) {
    const numRows = f2Sheet.getLastRow() - 3;
    const numCols = f2Sheet.getLastColumn() - f2FirstMonthCol + 1;
    const scoreRange = f2Sheet.getRange(4, f2FirstMonthCol, numRows, numCols);
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
      'Đồng Bộ Tháng Thành Công',
      `Đã tự động tạo cột tháng mới ${res.monthDisplay}, sao chép điểm và chuẩn hóa số điểm (.0 bỏ thập phân, .5 giữ nguyên)!`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Đã chuẩn hóa định dạng điểm (.0 bỏ thập phân, .5 giữ nguyên) cho tất cả các tháng!`, 'Đã chuẩn hóa', 4);
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
  f2Sheet.getRange(2, 4).setValue('Tháng')
    .setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff').setHorizontalAlignment('center');

  // Row 3: Column headers (Bao gồm Khoảng Giá ở cột 3)
  const f2HeadersRow3 = ['Dự án', 'Loại Quỹ', 'Khoảng Giá', curMonthDate];
  f2Sheet.getRange(3, 1, 1, f2HeadersRow3.length).setValues([f2HeadersRow3])
    .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff').setHorizontalAlignment('center');
  
  f2Sheet.getRange(3, 4).setNumberFormat('mm/yyyy');

  f2Sheet.setFrozenRows(3);
  f2Sheet.setFrozenColumns(3);
  f2Sheet.autoResizeColumns(1, 3);

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã tạo cấu trúc khung cho 2 sheet "Tổng hợp" và "Dự án F2"!', 'Khởi tạo hoàn tất', 5);
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
      if (r[2] || r[1]) {
        currentProj = {
          status: String(r[0] || currentProj.status || 'Đang bán').trim(),
          cdt: String(r[1] || currentProj.cdt || '').trim(),
          code: String(r[2] || currentProj.code || 'Tất cả').trim(),
          name: String(r[3] || currentProj.name || '').trim(),
          region: String(r[4] || currentProj.region || 'Tất cả').trim(),
          fund: String(r[5] || currentProj.fund || 'Quỹ NW').trim()
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
    ensureF2KhoangGiaColumn(ss);
    const f2LastRow = f2Sheet.getLastRow();
    const f2LastCol = Math.max(4, f2Sheet.getLastColumn());
    const f2HeaderRow3 = f2Sheet.getRange(3, 1, 1, f2LastCol).getValues()[0];

    let f2FirstMonthCol = 4;
    for (let c = 0; c < f2LastCol; c++) {
      if (normalizeToMonthDate(f2HeaderRow3[c], ss)) {
        f2FirstMonthCol = c + 1;
        break;
      }
    }

    const f2Months = [];
    for (let c = f2FirstMonthCol - 1; c < f2LastCol; c++) {
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

      const rawKhoangGia = (f2FirstMonthCol >= 4) ? r[2] : 'Tất cả';
      const khoangGia = isConditionAll(rawKhoangGia) ? 'Tất cả' : canonicalKhoangGia(rawKhoangGia);

      f2Rows.push({
        rowIdx: rowNumber,
        name: String(r[0] || '').trim(),
        fund: String(r[1] || 'Quỹ chéo').trim(),
        khoangGia: khoangGia,
        scores: scores
      });
    }

    const campaign = fetchCampaignDataInternal(ss);
    const campaignsList = (campaign && campaign.campaignsList) ? campaign.campaignsList : [];

    return {
      success: true,
      thMonths,
      thRows,
      f2Months,
      f2Rows,
      campaign,
      campaignsList,
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
    const f2FirstMonthCol = (String(f2Sheet.getRange(3, 3).getValue() || '').trim().toLowerCase().includes('giá')) ? 4 : 3;
    if (payload.f2CellUpdates && payload.f2CellUpdates.length > 0) {
      payload.f2CellUpdates.forEach(u => {
        if (u.rowIdx >= 4 && u.colIdx >= f2FirstMonthCol) {
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
      ensureF2KhoangGiaColumn(ss);
      payload.newRowsF2.forEach(nr => {
        const nextRow = Math.max(4, f2Sheet.getLastRow() + 1);
        const kg = canonicalKhoangGia(nr.khoangGia || 'Tất cả');
        const rowVals = [nr.name, nr.fund || 'Quỹ chéo', kg];
        payload.f2Months.forEach(m => {
          const s = nr.scores && nr.scores[m.dateStr];
          rowVals.push(s !== undefined && s !== '' ? cleanScore(s) : '');
        });
        f2Sheet.getRange(nextRow, 1, 1, rowVals.length).setValues([rowVals]);
        f2Sheet.getRange(nextRow, 4, 1, payload.f2Months.length).setNumberFormat('0.##').setHorizontalAlignment('center');
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

    if (!rowIdx || rowIdx < 4) {
      return { success: false, error: 'Chỉ số dòng không hợp lệ: ' + rowIdx };
    }

    const lastRow = sheet.getLastRow();
    if (rowIdx <= lastRow) {
      sheet.deleteRow(rowIdx);
    }
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

    if (!rowIdx || rowIdx < 4) {
      return { success: false, error: 'Chỉ số dòng không hợp lệ: ' + rowIdx };
    }

    const lastRow = sheet.getLastRow();
    const targetRow = (rowIdx > lastRow) ? (lastRow + 1) : rowIdx;

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
      sheet.getRange(targetRow, 1, 1, 9).setValues([rowVals]);

      if (data.monthUpdates && data.monthUpdates.length > 0) {
        data.monthUpdates.forEach(u => {
          if (u.colIdx >= 10) {
            sheet.getRange(targetRow, u.colIdx).setValue(u.score !== '' ? cleanScore(u.score) : '').setNumberFormat('0.##').setHorizontalAlignment('center');
          }
        });
      }
    } else {
      ensureF2KhoangGiaColumn(ss);
      sheet.getRange(targetRow, 1).setValue(data.name || '');
      sheet.getRange(targetRow, 2).setValue(data.fund || 'Quỹ chéo');
      if (data.khoangGia !== undefined) {
        sheet.getRange(targetRow, 3).setValue(canonicalKhoangGia(data.khoangGia || 'Tất cả'));
      }
      if (data.monthUpdates && data.monthUpdates.length > 0) {
        data.monthUpdates.forEach(u => {
          if (u.colIdx >= 4) {
            sheet.getRange(targetRow, u.colIdx).setValue(u.score !== '' ? cleanScore(u.score) : '').setNumberFormat('0.##').setHorizontalAlignment('center');
          }
        });
      }
    }

    return { success: true, targetRow: targetRow };
  } catch (err) {
    Logger.log('Lỗi updateMonthlyConfigRow: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * Đọc dữ liệu cấu hình chiến dịch từ sheet 'Điểm Chiến Dịch'
 * Hỗ trợ cả định dạng mới 15 cột (Multi-Campaign) và tự động tương thích ngược định dạng cũ 11 cột
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
        campaignsList: [],
        rows: []
      };
    }

    const lastRow = cdSheet.getLastRow();
    const lastCol = Math.max(cdSheet.getLastColumn(), 15);
    const headerRow = cdSheet.getRange(3, 1, 1, Math.min(lastCol, 15)).getValues()[0];
    const isNew15ColFormat = String(headerRow[1] || '').trim().toLowerCase().includes('chiến dịch');

    const rows = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNew15ColFormat) {
      // Đọc theo định dạng 15 cột
      const dataRows = cdSheet.getRange(4, 1, lastRow - 3, 15).getValues();
      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i];
        const rowNumber = i + 4;
        const campName = String(r[1] || '').trim();
        const rawStart = r[2];
        const rawEnd = r[3];
        let campStatus = String(r[4] || 'Đang chạy').trim();

        let startDateStr = '';
        const dStart = parseDateSafe(rawStart);
        if (dStart) startDateStr = formatDateSafe(dStart, ss);

        let endDateStr = '';
        const dEnd = parseDateSafe(rawEnd);
        if (dEnd) {
          endDateStr = formatDateSafe(dEnd, ss);
          const endCmp = new Date(dEnd);
          endCmp.setHours(23, 59, 59, 999);
          if (today > endCmp && campStatus !== 'Tạm dừng') {
            campStatus = 'Kết thúc';
          }
        }

        const cdt = String(r[5] || '').trim();
        const code = String(r[6] || '').trim();
        const projName = String(r[7] || '').trim();
        const region = String(r[8] || '').trim();
        const rowStatus = String(r[9] || 'Đang bán').trim();
        const sanPham = isConditionAll(r[10]) ? 'Tất cả' : String(r[10]).trim();
        const loaiCan = isConditionAll(r[11]) ? 'Tất cả' : String(r[11]).trim();
        const khoangGia = isConditionAll(r[12]) ? 'Tất cả' : canonicalKhoangGia(r[12]);
        const scoreVal = r[13];
        const score = (scoreVal !== '' && scoreVal !== null && !isNaN(scoreVal)) ? Number(scoreVal) : '';
        const note = String(r[14] || '').trim();

        rows.push({
          rowIdx: rowNumber,
          stt: i + 1,
          campaignName: campName,
          startDate: startDateStr,
          endDate: endDateStr,
          campaignStatus: campStatus,
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
    } else {
      // Đọc theo định dạng cũ 11 cột (Dòng 1 là metadata, Dòng 4+ là data)
      const metaVals = cdSheet.getRange(1, 1, 1, Math.max(8, cdSheet.getLastColumn())).getValues()[0];
      const campName = String(metaVals[1] || '').trim();
      const rawStart = metaVals[3];
      const rawEnd = metaVals[5];
      let campStatus = String(metaVals[7] || 'Đang chạy').trim();

      let startDateStr = '';
      const dStart = parseDateSafe(rawStart);
      if (dStart) startDateStr = formatDateSafe(dStart, ss);

      let endDateStr = '';
      const dEnd = parseDateSafe(rawEnd);
      if (dEnd) {
        endDateStr = formatDateSafe(dEnd, ss);
        const endCmp = new Date(dEnd);
        endCmp.setHours(23, 59, 59, 999);
        if (today > endCmp && campStatus !== 'Tạm dừng') {
          campStatus = 'Kết thúc';
        }
      }

      const dataRows = cdSheet.getRange(4, 1, lastRow - 3, 11).getValues();
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
          stt: i + 1,
          campaignName: campName,
          startDate: startDateStr,
          endDate: endDateStr,
          campaignStatus: campStatus,
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
    }

    // Tổng hợp danh sách chiến dịch duy nhất từ các dòng
    const campMap = new Map();
    rows.forEach(r => {
      const cName = (r.campaignName || '').trim();
      if (!cName) return;
      const key = cName.toLowerCase();
      if (!campMap.has(key)) {
        campMap.set(key, {
          name: cName,
          startDate: r.startDate || '',
          endDate: r.endDate || '',
          status: r.campaignStatus || 'Đang chạy',
          rowCount: 0
        });
      }
      campMap.get(key).rowCount++;
    });

    // Đồng bộ lại cache trong PropertiesService theo đúng các dòng đang có trên sheet
    const campaignsList = Array.from(campMap.values());
    try {
      const props = PropertiesService.getDocumentProperties();
      props.setProperty('CONFIGURED_CAMPAIGNS_LIST', JSON.stringify(campaignsList));
    } catch (e) {
      Logger.log('Lỗi cập nhật CONFIGURED_CAMPAIGNS_LIST: ' + e.toString());
    }

    const firstCamp = campaignsList.length > 0 ? campaignsList[0] : null;

    return {
      exists: rows.length > 0,
      name: firstCamp ? firstCamp.name : '',
      startDate: firstCamp ? firstCamp.startDate : '',
      endDate: firstCamp ? firstCamp.endDate : '',
      status: firstCamp ? firstCamp.status : 'Tạm dừng',
      campaignsList: campaignsList,
      rows: rows
    };
  } catch (err) {
    Logger.log('Lỗi fetchCampaignDataInternal: ' + err.toString());
    return {
      exists: false,
      name: '',
      startDate: '',
      endDate: '',
      status: 'Tạm dừng',
      campaignsList: [],
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
 * Lưu toàn bộ cấu hình chiến dịch vào sheet 'Điểm Chiến Dịch' (15 cột chuẩn hóa)
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

    const rows = payload.rows || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Ghi Banner dòng 1: Tiêu đề lớn
    cdSheet.getRange(1, 1, 1, 15).merge();
    cdSheet.getRange(1, 1)
      .setValue('BẢNG QUẢN LÝ ĐIỂM CÁC CHIẾN DỊCH BÁN HÀNG')
      .setFontFamily('Arial')
      .setFontSize(13)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff');
    cdSheet.setRowHeight(1, 36);

    // Dòng 2: Phụ đề hướng dẫn
    cdSheet.getRange(2, 1, 1, 15).merge();
    cdSheet.getRange(2, 1)
      .setValue('Điểm chiến dịch được tự động áp dụng cho các giao dịch trong khoảng thời gian diễn ra chiến dịch (Ưu tiên thay thế điểm tháng).')
      .setFontFamily('Arial')
      .setFontStyle('italic')
      .setFontSize(9)
      .setFontColor('#475569')
      .setBackground('#f1f5f9')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    cdSheet.setRowHeight(2, 24);

    // 2. Ghi Header bảng ở dòng 3 (15 cột)
    const headers = [
      ['STT', 'Tên Chiến Dịch', 'Từ Ngày', 'Đến Ngày', 'Trạng Thái Chiến Dịch', 'Chủ đầu tư', 'Mã Dự Án', 'Tên Dự Án', 'Miền', 'Trạng Thái Dự Án', 'Sản Phẩm', 'Loại Căn', 'Khoảng Giá', 'Điểm Chiến Dịch', 'Ghi Chú']
    ];
    cdSheet.getRange(3, 1, 1, 15).setValues(headers)
      .setFontFamily('Arial')
      .setFontWeight('bold')
      .setBackground('#e2e8f0')
      .setFontColor('#0f172a')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontSize(10)
      .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
    cdSheet.setRowHeight(3, 28);

    // 3. Ghi các dòng cấu hình từ dòng 4
    if (rows.length > 0) {
      const dataRows = rows.map((r, idx) => {
        let campStatus = String(r.campaignStatus || r.status || 'Đang chạy').trim();
        const rawEnd = r.endDate;
        if (rawEnd && campStatus !== 'Tạm dừng') {
          const dEnd = parseDateSafe(rawEnd);
          if (dEnd) {
            dEnd.setHours(23, 59, 59, 999);
            if (today > dEnd) {
              campStatus = 'Kết thúc';
            }
          }
        }

        return [
          idx + 1,
          r.campaignName || payload.name || '',
          r.startDate || payload.startDate || '',
          r.endDate || payload.endDate || '',
          campStatus,
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

      const dataRange = cdSheet.getRange(4, 1, dataRows.length, 15);
      dataRange.setValues(dataRows);
      dataRange.setFontFamily('Arial').setFontSize(10);
      dataRange.setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);

      cdSheet.getRange(4, 1, dataRows.length, 1).setHorizontalAlignment('center'); // STT
      cdSheet.getRange(4, 2, dataRows.length, 1).setFontWeight('bold').setFontColor('#9a3412'); // Tên CĐ
      cdSheet.getRange(4, 3, dataRows.length, 3).setHorizontalAlignment('center'); // Từ Ngày, Đến Ngày, Trạng Thái CĐ
      cdSheet.getRange(4, 7, dataRows.length, 1).setHorizontalAlignment('center'); // Mã DA
      cdSheet.getRange(4, 9, dataRows.length, 2).setHorizontalAlignment('center'); // Miền, Trạng thái DA
      cdSheet.getRange(4, 11, dataRows.length, 3).setHorizontalAlignment('center'); // SP, LC, KG
      cdSheet.getRange(4, 14, dataRows.length, 1).setNumberFormat('0.##').setHorizontalAlignment('center').setFontWeight('bold').setFontColor('#ea580c'); // Điểm CĐ
    }

    // Tự động căn chỉnh độ rộng cột
    for (let col = 1; col <= 15; col++) {
      cdSheet.autoResizeColumn(col);
      const w = cdSheet.getColumnWidth(col);
      if (w < 70) cdSheet.setColumnWidth(col, 70);
      if (w > 260) cdSheet.setColumnWidth(col, 260);
    }

    // Cập nhật danh sách chiến dịch vào PropertiesService
    try {
      const campMap = new Map();
      rows.forEach(r => {
        const cName = String(r.campaignName || payload.name || '').trim();
        if (!cName) return;
        const key = cName.toLowerCase();
        let cStatus = r.campaignStatus || payload.status || 'Đang chạy';
        const rawEnd = r.endDate || payload.endDate;
        if (rawEnd && cStatus !== 'Tạm dừng') {
          const dEnd = parseDateSafe(rawEnd);
          if (dEnd) {
            dEnd.setHours(23, 59, 59, 999);
            if (today > dEnd) cStatus = 'Kết thúc';
          }
        }
        campMap.set(key, {
          name: cName,
          startDate: r.startDate || payload.startDate || '',
          endDate: r.endDate || payload.endDate || '',
          status: cStatus
        });
      });

      // Nếu payload có name cụ thể mà chưa có trong rows:
      if (payload.name && payload.name.trim()) {
        const pKey = payload.name.trim().toLowerCase();
        if (!campMap.has(pKey)) {
          campMap.set(pKey, {
            name: payload.name.trim(),
            startDate: payload.startDate || '',
            endDate: payload.endDate || '',
            status: payload.status || 'Đang chạy'
          });
        }
      }

      const props = PropertiesService.getDocumentProperties();
      const campaignsList = Array.from(campMap.values());
      props.setProperty('CONFIGURED_CAMPAIGNS_LIST', JSON.stringify(campaignsList));
    } catch (propErr) {
      Logger.log('Lỗi lưu CONFIGURED_CAMPAIGNS_LIST: ' + propErr.toString());
    }

    return { success: true, count: rows.length, rowCount: rows.length };
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
  const f2Map = new Map(); // key: du_an_lower -> list of rule objects [{ name, fund, khoangGia, monthScores }]
  const f2GeneralRules = []; // list of rules where name is 'tất cả' or '*'
  const allF2RulesList = [];
  const f2Sheet = ss.getSheetByName(APP_CONFIG.SHEET_DU_AN_F2);
  let f2MonthsList = [];

  if (f2Sheet && f2Sheet.getLastRow() >= 4 && f2Sheet.getLastColumn() >= 3) {
    ensureF2KhoangGiaColumn(ss);
    const f2LastCol = f2Sheet.getLastColumn();
    const f2HeaderRow = f2Sheet.getRange(3, 1, 1, f2LastCol).getValues()[0];

    let f2FirstMonthCol = 4;
    for (let c = 0; c < f2LastCol; c++) {
      if (normalizeToMonthDate(f2HeaderRow[c], ss)) {
        f2FirstMonthCol = c + 1;
        break;
      }
    }

    for (let c = f2FirstMonthCol - 1; c < f2LastCol; c++) {
      const d = normalizeToMonthDate(f2HeaderRow[c], ss);
      if (d) {
        const key = formatDateSafe(d, ss).substring(0, 7);
        f2MonthsList.push({ colIdx: c + 1, date: d, key });
      }
    }

    const f2RowsData = f2Sheet.getRange(4, 1, f2Sheet.getLastRow() - 3, f2LastCol).getValues();
    f2RowsData.forEach(r => {
      const rawName = String(r[0] || '').trim();
      if (!rawName) return;
      const fund = String(r[1] || 'Quỹ chéo').trim();
      const rawKhoangGia = (f2FirstMonthCol >= 4) ? r[2] : 'Tất cả';
      const khoangGia = isConditionAll(rawKhoangGia) ? 'Tất cả' : canonicalKhoangGia(rawKhoangGia);

      const monthScores = new Map();
      f2MonthsList.forEach((m) => {
        const s = r[m.colIdx - 1];
        if (s !== '' && s !== null && !isNaN(s)) monthScores.set(m.key, Number(s));
      });

      const ruleObj = {
        name: rawName,
        fund: fund,
        khoangGia: khoangGia,
        monthScores: monthScores
      };
      allF2RulesList.push(ruleObj);

      const isGeneral = isConditionAll(rawName) || rawName.toLowerCase() === 'tất cả' || rawName.toLowerCase() === 'all' || rawName === '*';
      if (isGeneral) {
        f2GeneralRules.push(ruleObj);
      }

      rawName.split(/[,;\n]/).forEach(p => {
        const duAnName = p.trim().toLowerCase();
        if (duAnName) {
          if (!f2Map.has(duAnName)) f2Map.set(duAnName, []);
          f2Map.get(duAnName).push(ruleObj);
        }
      });
    });
  }

  // 2. Tải bảng Tổng hợp (Quỹ NW)
  // 2. Tải bảng Tổng hợp (Quỹ NW & Quỹ Chéo)
  const thMap = new Map(); // key: proj_code_lower -> list of rule objects
  const generalRules = []; // list of rules where code is 'Tất cả' or '*'
  const allRulesList = []; // flat list of all rules
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
    let currentCdt = '';
    let currentCode = '';
    let currentName = '';
    let currentRegion = '';
    let currentFund = 'Quỹ NW';

    thRowsData.forEach(r => {
      if (r[1]) currentCdt = String(r[1]).trim();
      if (r[2]) currentCode = String(r[2]).trim();
      if (r[3]) currentName = String(r[3]).trim();
      if (r[4]) currentRegion = String(r[4]).trim();
      if (r[5]) currentFund = String(r[5]).trim();

      if (!currentCode && !currentCdt) return;

      const sanPham = String(r[6] || '*').trim();
      const loaiCan = String(r[7] || '*').trim();
      const khoangGia = String(r[8] || '*').trim();

      const monthScores = new Map();
      thMonthsList.forEach((m) => {
        const s = r[m.colIdx - 1];
        if (s !== '' && s !== null && !isNaN(s)) monthScores.set(m.key, Number(s));
      });

      const ruleObj = {
        cdt: currentCdt,
        code: currentCode,
        name: currentName,
        region: currentRegion,
        fund: currentFund || 'Quỹ NW',
        sanPham: sanPham,
        loaiCan: loaiCan,
        khoangGia: khoangGia,
        monthScores: monthScores
      };

      allRulesList.push(ruleObj);

      const codeLower = currentCode.toLowerCase();
      if (isConditionAll(currentCode) || codeLower === 'tất cả' || codeLower === 'all') {
        generalRules.push(ruleObj);
      } else {
        if (!thMap.has(codeLower)) thMap.set(codeLower, []);
        thMap.get(codeLower).push(ruleObj);
      }
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

  // 4. Tải cấu hình Điểm Chiến Dịch (hỗ trợ nhiều chiến dịch đồng thời)
  const activeCampaigns = [];
  const cdSheet = ss.getSheetByName(APP_CONFIG.SHEET_CHIEN_DICH);
  if (cdSheet && cdSheet.getLastRow() >= 4) {
    const lastRow = cdSheet.getLastRow();
    const lastCol = Math.max(cdSheet.getLastColumn(), 15);
    const headerRow = cdSheet.getRange(3, 1, 1, Math.min(lastCol, 15)).getValues()[0];
    const isNew15Col = String(headerRow[1] || '').trim().toLowerCase().includes('chiến dịch');

    const campGroupMap = new Map();

    if (isNew15Col) {
      const dataRows = cdSheet.getRange(4, 1, lastRow - 3, 15).getValues();
      dataRows.forEach(r => {
        const campName = String(r[1] || '').trim();
        const rawStart = r[2];
        const rawEnd = r[3];
        const campStatus = String(r[4] || 'Đang chạy').trim();

        if (campStatus === 'Tạm dừng' || !campName) return;

        const startDate = parseDateSafe(rawStart);
        const endDate = parseDateSafe(rawEnd);
        if (!startDate || !endDate) return;

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const key = campName.toLowerCase();
        if (!campGroupMap.has(key)) {
          campGroupMap.set(key, {
            name: campName,
            startDate: startDate,
            endDate: endDate,
            map: new Map()
          });
        }

        const currentCode = String(r[6] || '').trim().toLowerCase();
        if (!currentCode) return;

        const sanPham = String(r[10] || '*').trim();
        const loaiCan = String(r[11] || '*').trim();
        const khoangGia = String(r[12] || '*').trim();
        const rawScore = r[13];
        const score = (rawScore !== '' && rawScore !== null && !isNaN(rawScore)) ? Number(rawScore) : 0;

        const cGroup = campGroupMap.get(key);
        if (!cGroup.map.has(currentCode)) cGroup.map.set(currentCode, []);
        cGroup.map.get(currentCode).push({ sanPham, loaiCan, khoangGia, score });
      });
    } else {
      // Định dạng cũ 11 cột
      const metaVals = cdSheet.getRange(1, 1, 1, Math.max(8, cdSheet.getLastColumn())).getValues()[0];
      const cdName = String(metaVals[1] || '').trim();
      const rawStart = metaVals[3];
      const rawEnd = metaVals[5];
      const cdStatus = String(metaVals[7] || '').trim();

      const startDate = parseDateSafe(rawStart);
      const endDate = parseDateSafe(rawEnd);

      if (cdStatus !== 'Tạm dừng' && startDate && endDate && cdName) {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const cdMap = new Map();
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

        campGroupMap.set(cdName.toLowerCase(), {
          name: cdName,
          startDate: startDate,
          endDate: endDate,
          map: cdMap
        });
      }
    }

    campGroupMap.forEach(c => activeCampaigns.push(c));
  }

  const campaignConfig = activeCampaigns.length > 0 ? {
    active: true,
    name: activeCampaigns[0].name,
    startDate: activeCampaigns[0].startDate,
    endDate: activeCampaigns[0].endDate,
    map: activeCampaigns[0].map
  } : null;

  return { 
    f2Map, 
    f2GeneralRules,
    f2MonthsList, 
    allF2RulesList,
    thMap, 
    generalRules, 
    allRulesList, 
    thMonthsList, 
    masVCGSet, 
    gianXayMap, 
    cbnvMap, 
    campaignConfig, 
    activeCampaigns 
  };
}

/**
 * Hàm khớp Chủ đầu tư (hỗ trợ Tất cả, Các CĐT Khác, danh sách nhiều CĐT phân tách bằng dấu phẩy)
 */
function matchCdt(ruleCdt, txCdt) {
  if (!ruleCdt || isConditionAll(ruleCdt)) return true;
  const rc = String(ruleCdt).trim().toLowerCase();
  const tc = String(txCdt || '').trim().toLowerCase();
  if (!tc) return true;
  if (rc.includes('khác') || rc.includes('khac')) {
    return !tc.includes('masterise');
  }
  const tokens = String(ruleCdt).split(/[,;]/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  return tokens.some(t => tc.includes(t) || t.includes(tc));
}

/**
 * Hàm khớp Miền (hỗ trợ Tất cả, danh sách nhiều miền phân tách bằng dấu phẩy)
 */
function matchRegion(ruleRegion, txRegion) {
  if (!ruleRegion || isConditionAll(ruleRegion)) return true;
  const rr = String(ruleRegion).trim().toLowerCase();
  const tr = String(txRegion || '').trim().toLowerCase();
  if (!tr) return true;
  const tokens = String(ruleRegion).split(/[,;]/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  return tokens.some(t => tr.includes(t) || t.includes(tr));
}

/**
 * Hàm tính điểm lũy tiến cho các căn trên 50 tỷ từ Tháng 9/2026 (+1 điểm mỗi 10 tỷ tiếp theo)
 */
function calculateProgressiveScore(valInBillion, baseScore, khoangGia, monthKey) {
  if (monthKey >= '2026-09' && valInBillion > 50) {
    const kg = String(khoangGia || '').toLowerCase();
    if (kg.includes('50') || kg.includes('> 50') || kg.includes('trên 50') || isConditionAll(khoangGia)) {
      const extra = Math.floor((valInBillion - 50.0001) / 10) + 1;
      return baseScore + extra;
    }
  }
  return baseScore;
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
      if (maxP === 50 && p > 50) {
        // Khớp thang trên cùng 50 tỷ để áp dụng lũy tiến
      } else if (p < minP || p > maxP) {
        return false;
      }
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
 * Hàm kiểm tra khớp Khoảng Giá (tỷ VNĐ)
 */
function matchKhoangGia(candGia, priceBill) {
  return matchRules('Tất cả', 'Tất cả', candGia, '', '', priceBill);
}

/**
 * Hàm loại bỏ dấu tiếng Việt để so khớp tên không dấu
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  str = String(str);
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str;
}

/**
 * Kiểm tra xem CVKD có phải chính là chuyên viên PTĐT đứng tên hay không.
 * ví dụ: PKD là "PTĐT  Hà", CVKD là "Nguyễn Thu Hà" -> cùng người (true)
 * ví dụ: PKD là "PTĐT  Trang", CVKD là "Hà Thu Hằng" -> khác người (false)
 * ví dụ: PKD là "PTĐT Đỗ Trang", CVKD là "Đỗ Thùy Trang" -> cùng người (true)
 */
function isSamePtdtPerson(pkd, cvkd) {
  if (!pkd || !cvkd) return false;

  const ptdtRawName = String(pkd).replace(/PTĐT|PTDT/gi, '').trim();
  if (!ptdtRawName) return false;

  const matchTokens = (pStr, cStr) => {
    const pTokens = pStr.toLowerCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const cTokens = cStr.toLowerCase().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

    if (pTokens.length === 0 || cTokens.length === 0) return false;

    // 1 từ (tên gọi: Hà, Huế, Nhài, Trang, Minh, Sang,...)
    if (pTokens.length === 1) {
      return cTokens[cTokens.length - 1] === pTokens[0];
    }

    // 2 từ (ví dụ: Huyền Trang, Phương Anh, Đỗ Trang)
    if (pTokens.length === 2) {
      // Đệm + Tên ở cuối họ tên (ví dụ CVKD kết thúc bằng "Huyền Trang")
      if (cTokens.length >= 2 && cTokens[cTokens.length - 2] === pTokens[0] && cTokens[cTokens.length - 1] === pTokens[1]) {
        return true;
      }
      // Họ + Tên (ví dụ "Đỗ Trang" khớp với "Đỗ Thùy Trang")
      if (cTokens.length >= 2 && cTokens[0] === pTokens[0] && cTokens[cTokens.length - 1] === pTokens[1]) {
        return true;
      }
      return false;
    }

    // Nhiều hơn 2 từ: chuỗi CVKD chứa trọn vẹn tên PTĐT
    return cTokens.join(' ').includes(pTokens.join(' '));
  };

  // 1. So khớp có dấu
  if (matchTokens(ptdtRawName, cvkd)) return true;

  // 2. Dự phòng so khớp không dấu
  const pClean = removeVietnameseTones(ptdtRawName);
  const cClean = removeVietnameseTones(cvkd);
  return matchTokens(pClean, cClean);
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

  // Xác định monthKey của giao dịch (YYYY-MM)
  const monthKey = `${dateBC.getFullYear()}-${String(dateBC.getMonth() + 1).padStart(2, '0')}`;

  // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
  // Không cho phép tính điểm cho bất kỳ đơn hàng nào trước tháng 9/2026.
  // Giữ nguyên điểm cũ tại cột X (nếu có), hoặc trả về rỗng '', tuyệt đối không tính điểm mới!
  if (monthKey < '2026-09' || isPastMonthRow(row)) {
    const existing = row[APP_CONFIG.COL_OUTPUT_SCORE - 1];
    return (existing !== undefined && existing !== null) ? existing : '';
  }

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

  // Các quy tắc mới chỉ áp dụng từ Tháng 9/2026 trở đi (đơn hàng tháng cũ không áp dụng)
  if (monthKey >= '2026-09') {
    // Rule: Căn hủy auto 0 điểm (cột trạng thái - index 9)
    const ttLower = trangThai.toLowerCase();
    if (ttLower.includes('hủy') || ttLower.includes('huy')) return 0;

    // Rule: Ở cột PKD (index 7): BLĐ/BO và CTV/ĐỐI TÁC là 0 điểm
    const pkdClean = pkd.toUpperCase();
    const isBldBo = /^(BLĐ|BLD|BO)($|[\s\/\-])/i.test(pkd) || /BLĐ\/BO|BLD\/BO/i.test(pkd) || /^BLĐ$|^BLD$|^BO$/i.test(pkdClean) || /BLĐ|BLD/i.test(pkdClean);
    const isCtvDoiTac = /CTV/i.test(pkd) || /ĐỐI TÁC|DOI TAC/i.test(pkd);
    if (isBldBo || isCtvDoiTac) return 0;
  }

  // 2. BẮT BUỘC: Kiểm tra Cột Z (Loại Quỹ - index 25). Nếu chưa điền Cột Z -> KHÔNG TÍNH, trả về rỗng ''
  const rawLoaiQuy = String(row[25] || '').trim();
  if (!rawLoaiQuy) return '';

  const loaiQuy = /NW/i.test(rawLoaiQuy) ? 'Quỹ NW' : 'Quỹ Chéo';

  // Lấy context từ đối số
  const ctx = (rulesOrCtx && rulesOrCtx.thMap) ? rulesOrCtx : getRuleEngineContext();

  let rawVal = giaGomVat > 0 ? giaGomVat : giaChuaVat;
  if (duAn === 'VHHVB' && ctx.gianXayMap.has(maCan)) {
    rawVal = ctx.gianXayMap.get(maCan);
  }
  const valInBillion = rawVal / 1e9;

  let baseScore = 0;

  // 3. ƯU TIÊN HÀNG ĐẦU: Khớp điểm theo Chiến Dịch (duyệt qua tất cả các chiến dịch đang hoạt động)
  let isCampaignMatched = false;
  const campaignsToCheck = (ctx.activeCampaigns && ctx.activeCampaigns.length > 0)
    ? ctx.activeCampaigns
    : (ctx.campaignConfig && ctx.campaignConfig.active ? [ctx.campaignConfig] : []);

  if (campaignsToCheck.length > 0) {
    for (const camp of campaignsToCheck) {
      if (dateBC >= camp.startDate && dateBC <= camp.endDate) {
        const duAnKey = duAn.toLowerCase();
        let candidates = camp.map.get(duAnKey) || [];
        if (candidates.length === 0) {
          for (const [code, list] of camp.map.entries()) {
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
            break;
          }
        }
      }
    }
  }

  // 4. Nếu không thuộc chiến dịch, tính theo bảng điểm tháng thông thường
  if (!isCampaignMatched) {
    if (loaiQuy === 'Quỹ Chéo') {
      // 4.1 Tra cứu trong bảng Dự án F2
      const duAnKey = duAn.toLowerCase();
      const tenDuAnKey = (String(row[28] || row[12] || '').trim()).toLowerCase(); // Cột AC (Tên dự án) hoặc M (Phân khu/Tòa)
      let matchedScore = null;
      let matchedRule = null;

      if (ctx.f2Map) {
        // Tìm candidates khớp dự án cụ thể
        let candidates = ctx.f2Map.get(duAnKey) || [];
        if (candidates.length === 0 && tenDuAnKey) {
          candidates = ctx.f2Map.get(tenDuAnKey) || [];
        }
        if (candidates.length === 0) {
          for (const [code, list] of ctx.f2Map.entries()) {
            if (code !== 'tất cả' && code !== '*' && (duAnKey.includes(code) || code.includes(duAnKey) || (tenDuAnKey && (tenDuAnKey.includes(code) || code.includes(tenDuAnKey))))) {
              candidates = list;
              break;
            }
          }
        }

        // Khớp quy tắc theo khoảng giá
        if (candidates.length > 0) {
          let matchedRow = null;
          for (const cand of candidates) {
            if (matchKhoangGia(cand.khoangGia, valInBillion)) {
              matchedRow = cand;
              break;
            }
          }
          if (!matchedRow) {
            matchedRow = candidates.find(c => isConditionAll(c.khoangGia)) || candidates[0];
          }

          if (matchedRow && matchedRow.monthScores) {
            if (matchedRow.monthScores.has(monthKey) && matchedRow.monthScores.get(monthKey) !== '' && matchedRow.monthScores.get(monthKey) !== null) {
              matchedScore = matchedRow.monthScores.get(monthKey);
              matchedRule = matchedRow;
            } else if (monthKey < '2026-09') {
              for (const m of ctx.f2MonthsList) {
                if (m.key <= monthKey && matchedRow.monthScores.has(m.key) && matchedRow.monthScores.get(m.key) !== '' && matchedRow.monthScores.get(m.key) !== null) {
                  matchedScore = matchedRow.monthScores.get(m.key);
                  matchedRule = matchedRow;
                  break;
                }
              }
              if (matchedScore === null) {
                for (const m of ctx.f2MonthsList) {
                  if (matchedRow.monthScores.has(m.key) && matchedRow.monthScores.get(m.key) !== '' && matchedRow.monthScores.get(m.key) !== null) {
                    matchedScore = matchedRow.monthScores.get(m.key);
                    matchedRule = matchedRow;
                    break;
                  }
                }
              }
            }
          }
        }

        // 2. Nếu không khớp dự án cụ thể, kiểm tra rule 'Tất cả' hoặc '*' trong F2 (f2GeneralRules)
        if (matchedScore === null && ctx.f2GeneralRules && ctx.f2GeneralRules.length > 0) {
          let genRow = null;
          for (const cand of ctx.f2GeneralRules) {
            if (matchKhoangGia(cand.khoangGia, valInBillion)) {
              genRow = cand;
              break;
            }
          }
          if (!genRow) {
            genRow = ctx.f2GeneralRules.find(c => isConditionAll(c.khoangGia)) || ctx.f2GeneralRules[0];
          }
          if (genRow && genRow.monthScores) {
            if (genRow.monthScores.has(monthKey) && genRow.monthScores.get(monthKey) !== '' && genRow.monthScores.get(monthKey) !== null) {
              matchedScore = genRow.monthScores.get(monthKey);
              matchedRule = genRow;
            } else if (monthKey < '2026-09') {
              for (const m of ctx.f2MonthsList) {
                if (m.key <= monthKey && genRow.monthScores.has(m.key) && genRow.monthScores.get(m.key) !== '' && genRow.monthScores.get(m.key) !== null) {
                  matchedScore = genRow.monthScores.get(m.key);
                  matchedRule = genRow;
                  break;
                }
              }
              if (matchedScore === null) {
                for (const m of ctx.f2MonthsList) {
                  if (genRow.monthScores.has(m.key) && genRow.monthScores.get(m.key) !== '' && genRow.monthScores.get(m.key) !== null) {
                    matchedScore = genRow.monthScores.get(m.key);
                    matchedRule = genRow;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (matchedScore !== null && matchedScore !== '' && !isNaN(matchedScore)) {
        const kg = (matchedRule && matchedRule.khoangGia) ? matchedRule.khoangGia : 'Tất cả';
        baseScore = calculateProgressiveScore(valInBillion, Number(matchedScore), kg, monthKey);
      } else {
        baseScore = 1; // Mặc định Quỹ chéo không thuộc danh sách F2 là 1 điểm
      }
    } else {
      // 4.2 Quỹ NW: Tra cứu trong bảng Tổng Hợp
      const duAnKey = duAn.toLowerCase();
      let candidates = (ctx.thMap && ctx.thMap.has(duAnKey)) ? ctx.thMap.get(duAnKey) : [];

      if (candidates.length === 0 && ctx.thMap) {
        for (const [code, list] of ctx.thMap.entries()) {
          if (duAnKey.includes(code) || code.includes(duAnKey)) {
            candidates = list;
            break;
          }
        }
      }

      let matchedRow = null;
      if (candidates.length > 0) {
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
          } else if (monthKey < '2026-09') {
            // Đối với các đơn hàng tháng cũ (< tháng 9/2026): chỉ kế thừa từ các tháng <= monthKey
            let foundScore = null;
            for (const m of ctx.thMonthsList) {
              if (m.key <= monthKey && matchedRow.monthScores.has(m.key) && matchedRow.monthScores.get(m.key) !== '' && matchedRow.monthScores.get(m.key) !== null) {
                foundScore = matchedRow.monthScores.get(m.key);
                break;
              }
            }
            if (foundScore === null) {
              for (const m of ctx.thMonthsList) {
                if (matchedRow.monthScores.has(m.key) && matchedRow.monthScores.get(m.key) !== '' && matchedRow.monthScores.get(m.key) !== null) {
                  foundScore = matchedRow.monthScores.get(m.key);
                  break;
                }
              }
            }
            baseScore = foundScore !== null ? foundScore : 2;
          } else {
            // Với đơn hàng tháng >= 9/2026, nếu dự án cụ thể chưa cấu hình điểm tháng này,
            // cho phép khớp xuống bảng quy tắc chung toàn quốc (generalRules)
            matchedRow = null;
          }
        }
      }

      // Nếu chưa tìm thấy dòng khớp theo dự án cụ thể, xét bảng quy tắc chung (CĐT, Miền, Khoảng giá)
      if (!matchedRow && ctx.generalRules && ctx.generalRules.length > 0) {
        const genCandidates = [];
        let txCdt = String(row[22] || '').trim();
        // Nếu Cột CĐT trong sheet Data không phải tên CĐT thực (ví dụ: "Check", rỗng),
        // tự động lấy CĐT từ bảng Tổng Hợp dựa trên mã dự án đã tra ở trên
        if (!txCdt || /^check$/i.test(txCdt)) {
          if (candidates.length > 0 && candidates[0].cdt) {
            txCdt = candidates[0].cdt;
          }
        }
        const txMien = String(row[4] || '').trim();

        for (const r of ctx.generalRules) {
          if (r.fund === 'Quỹ Chéo') continue;
          if (!r.monthScores.has(monthKey)) continue;
          if (!matchCdt(r.cdt, txCdt)) continue;
          if (!matchRegion(r.region, txMien)) continue;
          if (!matchRules(r.sanPham, r.loaiCan, r.khoangGia, sanPham, loaiCan, valInBillion)) continue;

          let spec = 0;
          if (!isConditionAll(r.cdt)) {
            const isKhac = /khác|khac/i.test(r.cdt);
            spec += isKhac ? 30 : 50;
          }
          if (!isConditionAll(r.region)) spec += 20;
          if (!isConditionAll(r.sanPham)) spec += 10;
          if (!isConditionAll(r.loaiCan)) spec += 10;
          if (!isConditionAll(r.khoangGia)) spec += 10;

          genCandidates.push({ spec, rule: r, score: r.monthScores.get(monthKey) });
        }

        if (genCandidates.length > 0) {
          genCandidates.sort((a, b) => b.spec - a.spec);
          const best = genCandidates[0];
          baseScore = calculateProgressiveScore(valInBillion, best.score, best.rule.khoangGia, monthKey);
          matchedRow = best.rule;
        }
      }

      if (!matchedRow && baseScore === 0) {
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
  // Chỉ áp dụng cho đơn hàng cũ trước tháng 9/2026 (tháng 9 đã có bảng quy đổi điểm lũy tiến riêng)
  const cotN_Quy = String(row[13] || '').trim();
  if (dateBC >= new Date(2025, 4, 1) && dateBC < new Date(2026, 8, 1) && valInBillion >= 30 && cotN_Quy !== 'Check D' && duAn.trim().toUpperCase() !== 'VCG') {
    bonusScore += 1;
  }

  const baseVal = baseScore + bonusScore;

  // Hệ số chiến dịch thời gian (chỉ áp dụng dự phòng nếu chưa có điểm chiến dịch riêng)
  let timeMultiplier = 1;
  if (!isCampaignMatched && dateBC >= new Date(2026, 1, 14) && dateBC <= new Date(2026, 1, 28)) {
    timeMultiplier = 2;
  }

  // Hệ số phòng PTĐT: chỉ áp dụng từ Tháng 9/2026 trở đi (PTĐT bán chia đôi x0.5, giữ nguyên nếu CVKD là PTĐT đứng tên)
  let ptdtMultiplier = 1;
  if (monthKey >= '2026-09' && /PTĐT|PTDT/i.test(pkd)) {
    const samePerson = isSamePtdtPerson(pkd, cvkdName);
    const verifiedName = (ctx && ctx.cbnvMap) ? ctx.cbnvMap.get(maNV) : null;
    const isInternalPolicy = /Cơ chế nội bộ/i.test(ghiChu);
    if (samePerson || (verifiedName && verifiedName.toLowerCase() === cvkdName.toLowerCase()) || isInternalPolicy) {
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
      const existingScore = row[APP_CONFIG.COL_OUTPUT_SCORE - 1];
      // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
      // Giữ nguyên điểm cũ sẵn có ở Cột X (hoặc rỗng nếu chưa có), tuyệt đối không tính lại!
      if (isPastMonthRow(row)) {
        outputScores.push([existingScore !== undefined && existingScore !== null ? existingScore : '']);
        continue;
      }
      const score = evaluateRowWithRules(row, ctx);
      outputScores.push([cleanScore(score)]);
    }

    dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, outputScores.length, 1)
      .setValues(outputScores)
      .setNumberFormat('0.##')
      .setHorizontalAlignment('center');

    // Cập nhật trạng thái Căn xin cơ chế (Cột AB & Cột Y)
    processCanXinCoCheRule(dataSheet, 2, rows.length, rows);
    ensureCanXinCoCheConditionalFormatting(dataSheet);

    SpreadsheetApp.getActiveSpreadsheet().toast(`[Option 1] Đã tính lại toàn bộ ${rows.length} dòng!`, 'Thành công', 3);
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
      ss.toast(`[Option 2] Đã tính điểm cho ${res.count} dòng được chọn (Dòng ${startRow} -> ${endRow})!`, 'Thành công', 3);
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
          const rowData = rangeData[i];
          const existingScore = scoreData[i][0];
          // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
          // Tuyệt đối không tính điểm cho các đơn hàng trước tháng 9
          if (isPastMonthRow(rowData)) {
            continue;
          }
          const score = evaluateRowWithRules(rowData, ctx);
          scoreData[i][0] = cleanScore(score);
        }
      }

      dataSheet.getRange(minRow, APP_CONFIG.COL_OUTPUT_SCORE, span, 1)
        .setValues(scoreData)
        .setNumberFormat('0.##')
        .setHorizontalAlignment('center');

      // Cập nhật Căn xin cơ chế cho dải dòng
      processCanXinCoCheRule(dataSheet, minRow, span, rangeData);
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
            const rowData = cData[j];
            const existingScore = cScores[j][0];
            // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
            if (isPastMonthRow(rowData)) {
              continue;
            }
            const score = evaluateRowWithRules(rowData, ctx);
            cScores[j][0] = cleanScore(score);
          }
        }

        dataSheet.getRange(cStart, APP_CONFIG.COL_OUTPUT_SCORE, cSpan, 1)
          .setValues(cScores)
          .setNumberFormat('0.##')
          .setHorizontalAlignment('center');

        // Cập nhật Căn xin cơ chế cho chunk
        processCanXinCoCheRule(dataSheet, cStart, cSpan, cData);
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
 * QUY TẮC CĂN XIN CƠ CHẾ (CỘT AB & CỘT Y)
 * =========================================================================
 * - Cột AB nếu có "Căn xin cơ chế":
 *   + Cột Y là nơi nhập điểm manual.
 *   + Nếu Cột Y chưa có điểm (trống hoặc đang là 'chưa có điểm'):
 *     -> Đánh dấu chữ "chưa có điểm" màu đỏ (#dc2626), in đậm.
 *   + Nếu Cột Y đã được nhập điểm manual:
 *     -> Giữ nguyên điểm manual đó, font màu đen (#000000), chữ thường.
 * - Cột AB nếu không có "Căn xin cơ chế":
 *   + Nếu Cột Y đang có chữ "chưa có điểm", tự động xóa trắng ('') và reset định dạng.
 * Lưu ý: Quy tắc này độc lập, hoàn toàn không làm thay đổi việc tính điểm Cột X.
 */

function isCanXinCoChe(val) {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return s.includes('căn xin cơ chế') || s.includes('can xin co che') || s.includes('xin cơ chế') || s.includes('xin co che') || s === 'cơ chế' || s === 'co che';
}

function processCanXinCoCheRule(dataSheet, startRow, rowCount, dataRange) {
  if (!dataSheet || rowCount <= 0) return;
  startRow = startRow || 2;

  try {
    const rangeValues = dataRange || dataSheet.getRange(startRow, 1, rowCount, Math.max(28, dataSheet.getLastColumn())).getValues();
    const rangeY = dataSheet.getRange(startRow, APP_CONFIG.COL_VERIFY_SCORE, rowCount, 1);
    const currentYVals = rangeY.getValues();
    const currentColors = rangeY.getFontColors();
    const currentWeights = rangeY.getFontWeights();

    let hasChange = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rangeValues[i];
      const rawValAB = row.length >= 28 ? row[27] : ''; // Cột AB: index 27 (1-based: 28)
      const rawValY = currentYVals[i][0];

      const isCoChe = isCanXinCoChe(rawValAB);
      const strY = String(rawValY !== null && rawValY !== undefined ? rawValY : '').trim();
      const isPlaceholder = strY.toLowerCase() === 'chưa có điểm' || strY.toLowerCase() === 'chua co diem';
      const hasManualScore = strY !== '' && !isPlaceholder;

      if (isCoChe) {
        if (!hasManualScore) {
          if (rawValY !== 'chưa có điểm' || currentColors[i][0] !== '#dc2626' || currentWeights[i][0] !== 'bold') {
            currentYVals[i][0] = 'chưa có điểm';
            currentColors[i][0] = '#dc2626';
            currentWeights[i][0] = 'bold';
            hasChange = true;
          }
        } else {
          if (currentColors[i][0] === '#dc2626' || currentWeights[i][0] === 'bold') {
            currentColors[i][0] = '#000000';
            currentWeights[i][0] = 'normal';
            hasChange = true;
          }
        }
      } else {
        if (isPlaceholder) {
          currentYVals[i][0] = '';
          currentColors[i][0] = '#000000';
          currentWeights[i][0] = 'normal';
          hasChange = true;
        }
      }
    }

    if (hasChange) {
      rangeY.setValues(currentYVals)
        .setFontColors(currentColors)
        .setFontWeights(currentWeights)
        .setHorizontalAlignment('center');
    }
  } catch (err) {
    Logger.log('Lỗi processCanXinCoCheRule: ' + err.toString());
  }
}

function ensureCanXinCoCheConditionalFormatting(sheet) {
  if (!sheet) return;
  try {
    const rules = sheet.getConditionalFormatRules() || [];
    const exists = rules.some(r => {
      const ranges = r.getRanges();
      return ranges.some(rg => rg.getColumn() === APP_CONFIG.COL_VERIFY_SCORE) &&
        r.getBooleanCondition() &&
        r.getBooleanCondition().getCriteriaType() === SpreadsheetApp.BooleanCriteria.TEXT_EQUAL_TO &&
        String(r.getBooleanCondition().getCriteriaValues()[0]).toLowerCase() === 'chưa có điểm';
    });
    if (!exists) {
      const maxRows = Math.max(10, sheet.getMaxRows());
      const rangeY = sheet.getRange(2, APP_CONFIG.COL_VERIFY_SCORE, maxRows - 1, 1);
      const rule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('chưa có điểm')
        .setFontColor('#dc2626')
        .setBold(true)
        .setBackground('#fef2f2')
        .setRanges([rangeY])
        .build();
      rules.push(rule);
      sheet.setConditionalFormatRules(rules);
    }
  } catch (e) {
    Logger.log('ensureCanXinCoCheConditionalFormatting error: ' + e);
  }
}

function checkAndFormatCanXinCoChe() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() < 2) {
      SpreadsheetApp.getUi().alert('Sheet Data không tồn tại hoặc chưa có dữ liệu.');
      return;
    }

    const lastRow = dataSheet.getLastRow();
    const numRows = lastRow - 1;
    const dataRange = dataSheet.getRange(2, 1, numRows, 33).getValues();

    processCanXinCoCheRule(dataSheet, 2, numRows, dataRange);
    ensureCanXinCoCheConditionalFormatting(dataSheet);

    SpreadsheetApp.getActiveSpreadsheet().toast('Đã kiểm tra & cập nhật trạng thái Căn xin cơ chế (Cột AB & Y)!', 'Thành công', 3);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi kiểm tra Căn xin cơ chế: ' + err.toString());
  }
}

/**
 * IMPORTRANGE/công thức cập nhật không phát sinh sự kiện On-Edit ở file đích.
 * Quét định kỳ, tính lại từ dữ liệu hiện tại và chỉ ghi các điểm khác kết quả cũ.
 * Không lưu dấu vết theo số dòng: xử lý được cả đổi thứ tự hoặc xóa dòng ở file nguồn.
 */
function autoRecalculateImportedScores() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { success: false, skipped: true, count: 0, reason: 'busy' };

  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('AUTO_SCORE_SPREADSHEET_ID');
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Hãy chạy Cài đặt Trigger tự động trong file nhận dữ liệu trước.');
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!sheet) throw new Error('Không tìm thấy sheet ' + APP_CONFIG.SHEET_DATA);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, count: 0 };

    // Đọc cả dòng tiêu đề để phát hiện lỗi ở ô chứa công thức IMPORTRANGE.
    const values = sheet.getRange(1, 1, lastRow, 33).getValues();
    if (values.some(hasAutoScoreInputError)) {
      Logger.log('[Import Score] Dữ liệu đang tải hoặc có lỗi công thức; sẽ thử lại ở lượt sau.');
      return { success: false, skipped: true, count: 0, reason: 'input-error' };
    }

    const rows = values.slice(1);
    let ctx = null;
    const changedIndices = [];
    const outputScores = rows.map((row, index) => {
      const existingScore = row[APP_CONFIG.COL_OUTPUT_SCORE - 1];
      // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
      // Trigger định kỳ tuyệt đối không tính hay sửa điểm của tháng cũ
      if (isPastMonthRow(row)) {
        return [existingScore !== undefined && existingScore !== null ? existingScore : ''];
      }

      let score = '';
      if (canAutoScoreRow(row)) {
        if (!ctx) ctx = getRuleEngineContext(ss);
        score = cleanScore(evaluateRowWithRules(row, ctx));
      }
      if (existingScore !== score) changedIndices.push(index);
      return [score];
    });

    if (changedIndices.length === 0) return { success: true, count: 0 };

    // Gom các dòng liền nhau để hạn chế số lần gọi Sheets.
    const groups = [];
    changedIndices.forEach(index => {
      const group = groups[groups.length - 1];
      if (group && index === group.end + 1) group.end = index;
      else groups.push({ start: index, end: index });
    });
    // Nếu thay đổi rải rác quá nhiều, chỉ ghi dải từ dòng đầu thay đổi đến dòng cuối thay đổi (không ghi đè tháng cũ)
    const writeGroups = groups.length > 20 
      ? [{ start: changedIndices[0], end: changedIndices[changedIndices.length - 1] }] 
      : groups;
    writeGroups.forEach(group => {
      sheet.getRange(group.start + 2, APP_CONFIG.COL_OUTPUT_SCORE, group.end - group.start + 1, 1)
        .setValues(outputScores.slice(group.start, group.end + 1))
        .setNumberFormat('0.##')
        .setHorizontalAlignment('center');
    });

    processCanXinCoCheRule(sheet, 2, rows.length, rows);
    SpreadsheetApp.flush();
    if (changedIndices.length > 0) Logger.log('[Import Score] Đã cập nhật ' + changedIndices.length + ' dòng.');
    return { success: true, count: changedIndices.length };
  } catch (error) {
    Logger.log('Lỗi autoRecalculateImportedScores: ' + (error.message || error));
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function canAutoScoreRow(row) {
  if (isPastMonthRow(row)) return false;
  return String(row[25] || '').trim() !== '' && (
    String(row[5] || '').trim() !== '' ||
    String(row[6] || '').trim() !== '' ||
    parseDateSafe(row[0], row) !== null ||
    String(row[8] || '').trim() !== ''
  );
}

function hasAutoScoreInputError(row) {
  // X/Y là cột kết quả/điểm nhập tay; không dùng làm dữ liệu đầu vào tính X.
  return row.some((value, index) => index !== 23 && index !== 24 && typeof value === 'string' &&
    /^(?:#(?:REF!|N\/A|VALUE!|ERROR!|NAME\?|NUM!|DIV\/0!|SPILL!|CALC!)|Loading(?:\.{3}|…)?|Đang tải(?:\.{3}|…)?)$/i.test(value.trim()));
}

/**
 * Cài lại các trigger On-Edit, kiểm tra IMPORTRANGE mỗi 1 phút và đồng bộ tháng hàng ngày.
 * Lưu ID file nhận dữ liệu để trigger định kỳ mở đúng file khi không có bảng tính đang mở.
 * Lượt kiểm tra đầu tiên cũng cập nhật các dòng đã có điểm cũ.
 */
function setupAutoTrigger() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    PropertiesService.getScriptProperties().setProperty('AUTO_SCORE_SPREADSHEET_ID', ss.getId());

    // 1. TỰ ĐỘNG CHẠY KIỂM TRA & BÙ CỘT THÁNG MỚI NGAY LẬP TỨC
    const syncRes = ensureCurrentMonthConfigured(ss);

    // 2. XÓA CÁC TRIGGER CŨ LIÊN QUAN ĐỂ TRÁNH TRÙNG LẶP
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      const fn = t.getHandlerFunction();
      if (fn === 'onEditAutoScore' || fn === 'autoTriggerOnDataChange' || fn === 'autoDailyCheckAndSyncMonth' || fn === 'autoRecalculateImportedScores') {
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

    // 5. IMPORTRANGE: kiểm tra định kỳ cả những dòng đã có điểm.
    ScriptApp.newTrigger('autoRecalculateImportedScores')
      .timeBased()
      .everyMinutes(APP_CONFIG.AUTO_SCORE_INTERVAL_MINUTES)
      .create();

    // Sửa ngay các điểm cũ bị lệch khi cài đặt; các lượt sau tiếp tục kiểm tra định kỳ.
    const initialSync = autoRecalculateImportedScores();
    const scoredCount = initialSync.count || 0;

    const curMonthStr = formatMonthDisplay(getCurrentMonthDate(ss), ss);
    let msg = '';
    if (syncRes && syncRes.updated) {
      msg += `ĐÃ TỰ ĐỘNG TẠO CỘT THÁNG MỚI (${syncRes.monthDisplay}) VÀ SAO CHÉP ĐIỂM TỪ THÁNG TRƯỚC SANG!\n\n`;
    } else {
      msg += `Cột tháng hiện tại (${curMonthStr}) đã sẵn sàng trong bảng cấu hình.\n\n`;
    }

    if (scoredCount > 0) {
      msg += `ĐÃ TỰ ĐỘNG TÍNH ĐIỂM SIÊU TỐC CHO ${scoredCount} DÒNG TRONG SHEET "${APP_CONFIG.SHEET_DATA}"!\n\n`;
    }

    msg += `Hệ thống đã thiết lập 3 Trigger tự động chạy ngầm:\n` +
      `1. [On-Edit]: Tính lại điểm cột X khi nhập, sửa hoặc dán dữ liệu trực tiếp trong sheet "${APP_CONFIG.SHEET_DATA}".\n` +
      `2. [IMPORTRANGE - mỗi ${APP_CONFIG.AUTO_SCORE_INTERVAL_MINUTES} phút]: Tính lại điểm theo dữ liệu nhận từ file nguồn, kể cả khi cột X đã có điểm.\n` +
      `3. [Hàng ngày - 1h sáng]: Kiểm tra và chèn cột tháng mới, sao chép điểm tháng trước.\n\n` +
      `Thay đổi ở file nguồn được xử lý sau khi IMPORTRANGE cập nhật dữ liệu tại file này và đến lượt kiểm tra định kỳ.`;
    if (initialSync.skipped) {
      msg += '\n\nLượt kiểm tra đầu chưa hoàn tất do hệ thống bận hoặc dữ liệu đang lỗi/đang tải. Trigger sẽ thử lại ở lượt sau.';
    }

    SpreadsheetApp.getUi().alert('Cài Đặt Trigger Tự Động Hoàn Tất', msg, SpreadsheetApp.getUi().ButtonSet.OK);
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
      const dataRows = dataSheet.getRange(2, 1, numRows, 33).getValues();
      const scoreVals = dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).getValues();
      const unscored = [];
      for (let i = 0; i < numRows; i++) {
        // Đóng băng tuyệt đối tháng cũ: chỉ tính các dòng từ tháng 9/2026 trở đi
        if (isPastMonthRow(dataRows[i])) continue;

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

    // Chờ lượt tính trước hoàn tất rồi mới đọc dữ liệu mới nhất của các dòng vừa sửa.
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
      const rowCount = lastDataRow - firstDataRow + 1;
      const rangeData = sheet.getRange(firstDataRow, 1, rowCount, 33).getValues();
      let ctx = null;
      const outputScores = rangeData.map(rowData => {
        const existingScore = rowData[APP_CONFIG.COL_OUTPUT_SCORE - 1];

        // ĐÓNG BĂNG TUYỆT ĐỐI ĐIỂM TRƯỚC THÁNG 9/2026:
        // Đơn hàng trước tháng 9 tuyệt đối không tính điểm. Giữ nguyên điểm cũ sẵn có (hoặc rỗng nếu chưa có).
        if (isPastMonthRow(rowData)) {
          return [existingScore !== undefined && existingScore !== null ? existingScore : ''];
        }

        // Xóa điểm cũ nếu dữ liệu giao dịch không còn đủ điều kiện.
        if (!canAutoScoreRow(rowData)) return [''];

        // Luôn tính lại dòng vừa sửa, kể cả khi cột X đã có điểm (bao gồm 0).
        if (!ctx) ctx = getRuleEngineContext(sheet.getParent());
        return [cleanScore(evaluateRowWithRules(rowData, ctx))];
      });

      // Ghi một lần cho toàn bộ các dòng vừa sửa/dán, không quét các dòng khác.
      sheet.getRange(firstDataRow, APP_CONFIG.COL_OUTPUT_SCORE, rowCount, 1)
        .setValues(outputScores)
        .setNumberFormat('0.##')
        .setHorizontalAlignment('center');

      // Giữ quy tắc Căn xin cơ chế và điểm nhập tay ở cột Y.
      processCanXinCoCheRule(sheet, firstDataRow, rowCount, rangeData);

      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log('Lỗi onEditAutoScore: ' + (error.message || error));
    throw error;
  }
}

/**
 * =========================================================================
 * [QUÉT THỦ CÔNG]: TÌM & TÍNH TẤT CẢ DÒNG CHƯA CÓ ĐIỂM TRÊN SHEET
 * =========================================================================
 */
function autoTriggerOnDataChange(e) {
  // Tương thích trigger On-Edit cũ: xử lý dòng vừa sửa kể cả khi đã có điểm.
  if (e && e.range) return onEditAutoScore(e);

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

      // Đóng băng tuyệt đối tháng cũ: không tính điểm cho đơn hàng trước tháng 9/2026
      if (isPastMonthRow(row)) continue;

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

    // Quét & cập nhật trạng thái Căn xin cơ chế (Cột AB & Y)
    processCanXinCoCheRule(dataSheet, 2, numRows, dataRange);
    ensureCanXinCoCheConditionalFormatting(dataSheet);

    if (unscoredRowNumbers.length === 0) {
      let msg = 'Không có dòng nào cần tính điểm.';
      if (missingFundRows.length > 0) {
        msg += '\n\nCác dòng sau CHƯA ĐIỀN Loại Quỹ (Cột Z) nên chưa được tính:\n-> Dòng: ' + missingFundRows.join(', ');
      }
      SpreadsheetApp.getUi().alert(msg);
      return;
    }

    const res = calculateSpecificRows(unscoredRowNumbers);
    if (!res.success) {
      SpreadsheetApp.getUi().alert('Lỗi khi tính điểm: ' + res.error);
      return;
    }

    SpreadsheetApp.getUi().alert(`Thành công! Đã tính điểm cho ${unscoredRowNumbers.length} dòng:\n(Dòng: ${unscoredRowNumbers.slice(0, 15).join(', ')}${unscoredRowNumbers.length > 15 ? '...' : ''})`);
  } catch (error) {
    Logger.log('Lỗi: ' + (error.message || error));
    SpreadsheetApp.getUi().alert('Đã xảy ra lỗi: ' + (error.message || error));
  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================================
 * CÔNG CỤ KIỂM TRA THỬ RULE TÍNH ĐIỂM (RULE SIMULATOR / TESTER)
 * =========================================================================
 * Cho phép người dùng test nhanh bất kỳ giao dịch nào (Tháng 9 hay tháng cũ)
 * để kiểm tra rule có áp dụng đúng hay không trực tiếp từ giao diện Modal UI.
 */
function testEvaluateTransaction(txData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ctx = getRuleEngineContext(ss);

    // Chuẩn bị mảng row giả lập đúng 35 cột của sheet Data
    const row = new Array(35).fill('');
    row[0] = txData.dateBC || new Date();
    row[4] = txData.region || 'Miền Bắc';
    row[5] = txData.code || '';
    row[6] = txData.maCan || '';
    row[7] = txData.pkd || '';
    row[8] = txData.cvkd || '';
    row[9] = txData.trangThai || 'Đã bán';
    row[10] = Number(txData.gia) || 0;
    row[11] = Number(txData.gia) || 0;
    row[13] = txData.cotN_Quy || '';
    row[14] = txData.sanPham || 'Tất cả';
    row[16] = txData.loaiCan || 'Tất cả';
    row[17] = txData.maNV || '';
    row[22] = txData.cdt || '';
    row[25] = txData.loaiQuy || 'Quỹ NW';
    row[28] = txData.name || txData.code || '';
    row[32] = txData.ghiChu || '';

    const parsedDate = parseDateSafe(row[0], row);
    const monthKey = parsedDate ? formatDateSafe(parsedDate, ss).substring(0, 7) : '';
    const score = evaluateRowWithRules(row, ctx);

    const pkdVal = String(row[7] || '').trim();
    const cvkdVal = String(row[8] || '').trim();
    const ttVal = String(row[9] || '').trim().toLowerCase();
    const pkdClean = pkdVal.toUpperCase();
    const isBldBo = /^(BLĐ|BLD|BO)($|[\s\/\-])/i.test(pkdVal) || /BLĐ\/BO|BLD\/BO/i.test(pkdVal) || /^BLĐ$|^BLD$|^BO$/i.test(pkdClean) || /BLĐ|BLD/i.test(pkdClean);
    const isCtvDoiTac = /CTV/i.test(pkdVal) || /ĐỐI TÁC|DOI TAC/i.test(pkdVal);
    const isHuy = ttVal.includes('hủy') || ttVal.includes('huy');
    const isPtdt = /PTĐT|PTDT/i.test(pkdVal);
    const samePerson = isPtdt ? isSamePtdtPerson(pkdVal, cvkdVal) : false;

    return {
      success: true,
      score: score,
      monthKey: monthKey,
      loaiQuy: row[25],
      duAn: row[5],
      cdt: row[22],
      region: row[4],
      sanPham: row[14],
      loaiCan: row[16],
      pkd: pkdVal,
      cvkd: cvkdVal,
      trangThai: row[9],
      isHuy: isHuy,
      isBldBo: isBldBo,
      isCtvDoiTac: isCtvDoiTac,
      isPtdt: isPtdt,
      samePerson: samePerson,
      giaTy: (Number(txData.gia) / 1e9).toFixed(2),
      valInBillion: Number(txData.gia) / 1e9
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

