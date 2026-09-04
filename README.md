# NW - Hệ Thống Cấu Hình & Tính Điểm CVKD Tự Động

Hệ thống tính điểm Chuyên viên Kinh doanh (CVKD) bất động sản tự động tốc độ cao, tích hợp giao diện cấu hình trực quan (Enterprise Web App) trên nền tảng Google Sheets và Google Apps Script.

## 📚 Tài Liệu Hướng Dẫn & Đào Tạo

Toàn bộ thông tin chi tiết về chức năng, luồng nghiệp vụ, sơ đồ Flowchart (Mermaid) và hướng dẫn sử dụng từng bước đã được biên soạn đầy đủ tại:

👉 **[HUONG_DAN_SU_DUNG.md](HUONG_DAN_SU_DUNG.md)**

---

## 🌟 Các Tính Năng Chính

- **Bảng Tổng Hợp (Quỹ NW)**: Quản lý ma trận điểm đa tháng theo từng dự án; khớp 3 tiêu chí động (Sản phẩm: Cao tầng/Thấp tầng, Loại căn: Studio/1PN/2PN/Duplex..., Khoảng giá: Min-Max, Tiền đất).
- **Dự Án F2 (Quỹ Chéo)**: Quản lý điểm cho các dự án liên kết bán chéo, tự động chuẩn hóa chuỗi và nhận diện tên dự án.
- **Điểm Chiến Dịch (Multi-Campaign)**: Hỗ trợ chạy đồng thời nhiều chiến dịch bán hàng ngắn hạn với ngày bắt đầu, ngày kết thúc và trạng thái (Đang chạy, Tạm dừng, Kết thúc). Điểm chiến dịch tự động đè điểm tháng khi thỏa mãn điều kiện.
- **Tự Động Hóa 100%**: Tự động chèn cột tháng mới và sao chép điểm từ tháng trước; tự động tính điểm tức thì khi có giao dịch mới (Trigger On-Edit và Trigger Hàng Ngày lúc 1h sáng).
- **Trình Tạo Biểu Đồ & Báo Cáo (Chart Builder)**: Trực quan hóa dữ liệu bán hàng theo Dự án, CĐT, Vùng miền, Phòng ban, Nhân sự.

---

## 🚀 Triển Khai & Đồng Bộ (Apps Script / Clasp)

```bash
# Đẩy code lên Google Apps Script
npx @google/clasp push --force

# Kéo code từ Apps Script về local
npx @google/clasp pull
```
