# Kế hoạch cấu hình lũy tiến

Tài liệu nghiệp vụ: [BA.md](BA.md).

## Trạng thái

Đã hoàn tất trong code local, chưa deploy Apps Script.

## Hạng mục triển khai

1. Giữ nguyên modal setting và thêm tab **Lũy tiến theo giá** cùng hai ô **Mỗi (tỷ VNĐ)** / **Cộng thêm (điểm)** cho Quỹ NW và Quỹ Chéo.
2. Đổi schema Sheet sang ba cột hiển thị ngay sau `Khoảng Giá`:
   - `Cách tính điểm`
   - `Mỗi (tỷ VNĐ)`
   - `Cộng thêm (điểm)`
3. Chuyển dữ liệu thử nghiệm từ `Rule_Config` sang ba cột mới và xóa `Rule_ID` / `Rule_Config`.
4. Dời điểm bắt đầu các cột tháng sang M với NW và G với Quỹ Chéo; cập nhật fetch, save, edit và rollover.
5. Dùng chung công thức đủ bậc cho hai quỹ: 55=5, 60=6, 70=7 với mốc 50, bước 10 và +1 điểm.
6. Khi sửa cấu hình riêng một tháng trên dòng có lịch sử, tạo dòng phiên bản mới để các tháng cũ giữ cấu hình cũ.
7. Chạy test backend, UI syntax, biên giá và hai nhánh quỹ trước khi deploy.

## Mockup đối chiếu

- `mockup-quy-nw.png`
- `mockup-quy-cheo.png`
- `mockup-quy-nw-co-dinh.png`
- `mockup-quy-cheo-co-dinh.png`

Các mockup giữ form hiện tại và không có phần xem trước/bảng giải thích trong UI.
