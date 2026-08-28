"""
Kiểm thử Rule Engine tính điểm trực tiếp trên file Copy of NW_RawData.xlsx
"""
import sys, datetime
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

def test_engine():
    print("Đang nạp file Excel Copy of NW_RawData.xlsx...")
    wb = openpyxl.load_workbook('Copy of NW_RawData.xlsx', data_only=True, read_only=True)
    ws = wb['Data']
    
    count = 0
    calculated_samples = []
    
    for idx, row in enumerate(ws.iter_rows(min_row=2, max_row=20, values_only=True)):
        date_bc = row[0]
        du_an = row[5]
        ma_can = row[6]
        pkd = row[7]
        gia_vat = row[11] or row[10] or 0
        current_score_in_sheet = row[23] # Cột X (index 23 trong 0-indexed)
        
        calculated_samples.append({
            'row': idx + 2,
            'date': str(date_bc)[:10] if date_bc else '',
            'du_an': du_an,
            'ma_can': ma_can,
            'pkd': pkd,
            'gia': f"{gia_vat / 1e9:.2f} tỷ" if isinstance(gia_vat, (int, float)) else str(gia_vat),
            'sheet_score': current_score_in_sheet
        })
        count += 1

    print(f"Đã đọc mẫu {count} dòng đầu tiên thành công!")
    for s in calculated_samples[:5]:
        print(f"Dòng {s['row']}: Dự án={s['du_an']} | Căn={s['ma_can']} | PKD={s['pkd']} | Giá={s['gia']} | Điểm hiện tại={s['sheet_score']}")

if __name__ == '__main__':
    test_engine()
