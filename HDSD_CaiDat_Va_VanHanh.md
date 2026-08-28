# HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH HỆ THỐNG CẤU HÌNH TÍNH ĐIỂM CVKD

Hệ thống này giúp bạn **loại bỏ hoàn toàn việc hardcode trong công thức**, cho phép bất kỳ ai (Quản lý, Kế toán, Admin) tự thêm/sửa chính sách tính điểm trực tiếp trên **Giao diện Web trực quan (UI)** hoặc qua **Sheet `CauHinh_Diem`**.

---

## 📁 1. Các file đã tạo trong thư mục
1. [Code.gs](file:///c:/Users/Admin/Desktop/Diem_CVKD/Code.gs): Toàn bộ mã nguồn backend xử lý lưu/sửa quy tắc và bộ máy tính điểm tốc độ cao (Batch Rule Engine).
2. [ConfigUI.html](file:///c:/Users/Admin/Desktop/Diem_CVKD/ConfigUI.html): Giao diện Web Form / Modal Dialog để quản lý quy tắc tính điểm.

---

## 🚀 2. Các bước cài đặt vào Google Sheets (Chỉ mất 2 phút)

### Bước 2.1: Mở trình soạn thảo Google Apps Script
1. Mở file Google Sheets chứa dữ liệu của bạn trên trình duyệt.
2. Trên thanh menu, chọn: **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.

### Bước 2.2: Dán mã nguồn vào Apps Script
1. **File `Code.gs`**:
   - Nhấp vào file `Code.gs` có sẵn, xóa toàn bộ nội dung cũ.
   - Sao chép toàn bộ mã trong file [Code.gs](file:///c:/Users/Admin/Desktop/Diem_CVKD/Code.gs) dán vào đây $\rightarrow$ Nhấn biểu tượng **Lưu (Ctrl + S)**.
2. **File `ConfigUI.html`**:
   - Nhấn vào biểu tượng **`+` (Thêm tệp)** bên cạnh chữ *Tệp (Files)* ở cột trái $\rightarrow$ Chọn **HTML**.
   - Đặt tên tệp chính xác là: `ConfigUI` *(Apps Script sẽ tự thêm đuôi `.html`)*.
   - Sao chép toàn bộ mã trong file [ConfigUI.html](file:///c:/Users/Admin/Desktop/Diem_CVKD/ConfigUI.html) dán vào $\rightarrow$ Nhấn **Lưu (Ctrl + S)**.

---

## 🎮 3. Hướng dẫn vận hành hệ thống

### Bước 3.1: Khởi động lần đầu
1. Quay lại tab Google Sheets $\rightarrow$ Nhấn **F5** (Tải lại trang).
2. Bạn sẽ thấy xuất hiện thêm 1 menu mới trên thanh công cụ: **`🎯 Cấu Hình Cơ Chế`**.
3. Bấm vào menu **`🎯 Cấu Hình Cơ Chế`** $\rightarrow$ Chọn **`🛠️ Khởi tạo Sheet Cấu hình mẫu`**.
   - *Hệ thống sẽ tự động tạo một sheet mới tên `CauHinh_Diem` và nạp sẵn 13 quy tắc mẫu đúng theo nghiệp vụ hiện tại của bạn.*

---

### Bước 3.2: Sử dụng Giao diện Web UI để Thêm / Sửa / Bật / Tắt chính sách
1. Vào menu **`🎯 Cấu Hình Cơ Chế`** $\rightarrow$ Chọn **`⚙️ Mở bảng cấu hình điểm (UI)`**.
2. Một cửa sổ giao diện hiện đại sẽ mở ra ngay trên màn hình:
   - **Thêm quy tắc mới**:
     - *Tên quy tắc*: Ví dụ `Dự án OCP3 Thấp tầng > 15 tỷ`.
     - *Dự án*: Nhập `OCP3` (hoặc nhập nhiều dự án cách nhau bằng dấu phẩy: `VCG, SCM`). Nếu áp dụng cho mọi dự án thì nhập `*`.
     - *Sản phẩm*: Chọn `Thấp Tầng` / `Cao Tầng` / `Tất cả (*)`.
     - *Khoảng giá*: Nhập từ `15` đến `9999` tỷ.
     - *Thời gian*: Chọn ngày bắt đầu và ngày kết thúc chiến dịch (hoặc để trống nếu áp dụng mọi lúc).
     - *Điểm cơ bản*: Nhập số điểm (ví dụ: `4` điểm).
     - *Độ ưu tiên*: Quy tắc nào đặc thù hơn thì đặt ưu tiên cao hơn (ví dụ: `80` so với mặc định `10`).
     - Nhấn **`💾 Lưu Quy Tắc`**.
   - **Sửa / Xóa / Tắt quy tắc**:
     - Trong bảng danh sách bên dưới, bấm nút **Sửa** hoặc **Xóa**.
     - Nếu tạm dừng một chính sách, chọn trạng thái **Tắt** rồi lưu lại.

---

### Bước 3.3: Chạy tính điểm tự động
1. Bấm nút xanh **`⚡ Áp Dụng & Tính Lại Điểm`** trực tiếp trên giao diện Web UI (hoặc chọn menu **`⚡ Tính lại toàn bộ điểm Data`** ngoài Google Sheets).
2. Hệ thống sẽ:
   - Tự động nạp toàn bộ quy tắc đang **Kích hoạt** và sắp xếp theo độ ưu tiên.
   - Duyệt và tính điểm cho toàn bộ hơn 5.000 dòng dữ liệu trong sheet `Data`.
   - Ghi kết quả vào **Cột X (Điểm tạm)** mà không làm đơ bảng tính.

---

## ⏰ 4. Cài đặt tự động chạy định kỳ (Tùy chọn)
Nếu bạn muốn hệ thống tự động tính lại điểm hàng đêm (ví dụ lúc 23:00) hoặc mỗi khi có dữ liệu mới đổ về từ Looker/Form:
1. Trong màn hình Apps Script $\rightarrow$ Nhấn vào biểu tượng **Đồng hồ (Kích hoạt - Triggers)** ở thanh công cụ bên trái.
2. Bấm nút **+ Thêm trình kích hoạt (Add Trigger)** ở góc dưới bên phải.
3. Cấu hình:
   - Chọn hàm muốn chạy: `calculateAllScoresWithRules`
   - Chọn nguồn sự kiện: `Theo thời gian (Time-driven)`
   - Bộ đếm thời gian: `Bộ hẹn giờ ngày (Day timer)`
   - Chọn khoảng thời gian: `23:00 đến 00:00`
4. Bấm **Lưu**. Hệ thống sẽ tự động cập nhật điểm chính xác mỗi đêm.
