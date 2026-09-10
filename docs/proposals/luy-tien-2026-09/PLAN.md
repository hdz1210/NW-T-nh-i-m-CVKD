# Kế hoạch cấu hình lũy tiến

Tài liệu BA hiện hành: [BA.md](BA.md).

Yêu cầu UI mới nhất: bám sát setting hiện tại, chỉ thêm tab **Lũy tiến theo giá** trong khối cấu hình điểm và hai ô **Mỗi (tỷ VNĐ)** / **Cộng thêm (điểm)**. Giữ Min/Max, Điểm Cơ Sở, tháng áp dụng và Hủy/Thêm Ngay. Không có phần xem trước hoặc khung giải thích/ví dụ.

- Mockup hiện hành dựng từ DOM/CSS của `src/ConfigUI.html`: `mockup-quy-nw.png`, `mockup-quy-cheo.png`.
- Tab cố định để đối chiếu: `mockup-quy-nw-co-dinh.png`, `mockup-quy-cheo-co-dinh.png`.
- Bản mô phỏng: `mockup.html`, `mockup-f2.html`.
- `mockup-bang-rule.png` là phương án cũ, không còn nằm trong phạm vi UI đề xuất mới nhất.

BA mô tả đầy đủ schema trước/sau, hai cột metadata Rule_ID/Rule_Config, dữ liệu JSON mẫu, công thức đủ bậc, bảo toàn tháng, lưu/sửa/rollover, chuyển đổi legacy và tiêu chí nghiệm thu.

Cách tính đã chốt: giá >50 tỷ, điểm cơ sở 5, mỗi 10 tỷ tăng đủ cộng 1 điểm; 55 tỷ=5, 60 tỷ=6. Schema và phương án triển khai vẫn là đề xuất. Chưa sửa ứng dụng, dữ liệu thật hoặc triển khai Apps Script.
