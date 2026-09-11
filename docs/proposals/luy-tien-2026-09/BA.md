# BA — Cấu hình lũy tiến theo giá cho Quỹ NW và Quỹ Chéo

| Thông tin | Nội dung |
|---|---|
| Phiên bản | 2.0 — 11/09/2026 |
| Trạng thái | Đã triển khai trong code local, chưa deploy Apps Script |
| Phạm vi | Form cấu hình, schema hai sheet rule, lưu/sửa/đồng bộ tháng và engine tính điểm |
| Quy tắc đã chốt | Đủ mỗi 10 tỷ trên mốc 50 tỷ mới cộng 1 điểm: 55 tỷ = 5; 60 tỷ = 6 |
| Quyết định schema | Không dùng `Rule_ID`, không lưu JSON `Rule_Config`; dùng ba cột hiển thị ngay sau `Khoảng Giá` |

## 1. Mục tiêu

Người quản trị chọn một trong hai cách tính trên form hiện tại:

- **Điểm cố định**: giao dịch khớp rule nhận đúng điểm cơ sở của tháng.
- **Lũy tiến theo giá**: giao dịch khớp rule nhận điểm cơ sở và chỉ được cộng khi đủ trọn từng bước giá.

Áp dụng cùng một cách cho **Quỹ NW** và **Quỹ Chéo**. UI chỉ thêm tab chọn cách tính và hai trường `Mỗi (tỷ VNĐ)` / `Cộng thêm (điểm)` trong khối cấu hình điểm hiện có.

## 2. UI

### 2.1. Phần giữ nguyên

Giữ nguyên modal, bộ chọn loại quỹ, dự án, CĐT, miền, sản phẩm, loại căn, khoảng giá, tháng áp dụng, điểm cơ sở và nút thao tác hiện tại.

Không có khung xem trước, bảng giá thử hoặc phần giải thích dài trong form.

### 2.2. Phần bổ sung

Trong khối **Cấu hình điểm & thời gian áp dụng**, thêm hai tab:

| Tab | Trường nhập |
|---|---|
| Điểm cố định | Tháng áp dụng + Điểm cơ sở |
| Lũy tiến theo giá | Tháng áp dụng + Điểm cơ sở + Mỗi (tỷ VNĐ) + Cộng thêm (điểm) |

Khi chọn lũy tiến:

1. `Từ (Min)` là mốc bắt đầu tính bậc và không thuộc dòng lũy tiến.
2. `Đến (Max)` phải để `999`, theo quy ước UI hiện tại là không giới hạn trên.
3. Khoảng giá được lưu dạng `> Min`, ví dụ `> 50`.
4. Chỉ chọn một tháng cụ thể. Không cho lưu lũy tiến với `Tất cả các tháng`.
5. `Mỗi` và `Cộng thêm` phải lớn hơn 0.

## 3. Schema Sheet sau khi lưu

Dòng header là hàng 3; dữ liệu bắt đầu từ hàng 4.

### 3.1. Sheet `Rule quỹ NW`

| Cột | Header | Kiểu dữ liệu | Quy định |
|---|---|---|---|
| A | Trạng thái | Chuỗi | Giữ nguyên |
| B | CĐT | Chuỗi | Giữ nguyên |
| C | Mã dự án | Chuỗi | Giữ nguyên |
| D | Dự án | Chuỗi | Giữ nguyên |
| E | Miền | Chuỗi | Giữ nguyên |
| F | Loại Quỹ | Chuỗi | Giữ nguyên |
| G | Sản Phẩm | Chuỗi | Giữ nguyên |
| H | Loại Căn | Chuỗi | Giữ nguyên |
| I | Khoảng Giá | Chuỗi | Ví dụ `30 - 50`, `> 50` |
| J | Cách tính điểm | Chuỗi | `Cố định` hoặc `Lũy tiến theo giá` |
| K | Mỗi (tỷ VNĐ) | Số | Để trống với cố định; >0 với lũy tiến |
| L | Cộng thêm (điểm) | Số | Để trống với cố định; >0 với lũy tiến |
| M trở đi | Các tháng | Ngày ở header; số trong ô | Điểm cơ sở của từng tháng |

### 3.2. Sheet `Rule quỹ chéo`

| Cột | Header | Kiểu dữ liệu | Quy định |
|---|---|---|---|
| A | Dự án | Chuỗi | Giữ nguyên |
| B | Loại Quỹ | Chuỗi | Giữ nguyên |
| C | Khoảng Giá | Chuỗi | Ví dụ `30 - 50`, `> 50` |
| D | Cách tính điểm | Chuỗi | `Cố định` hoặc `Lũy tiến theo giá` |
| E | Mỗi (tỷ VNĐ) | Số | Để trống với cố định; >0 với lũy tiến |
| F | Cộng thêm (điểm) | Số | Để trống với cố định; >0 với lũy tiến |
| G trở đi | Các tháng | Ngày ở header; số trong ô | Điểm cơ sở của từng tháng |

### 3.3. Ví dụ dữ liệu

`Rule quỹ NW`:

| Phạm vi | Khoảng Giá | Cách tính điểm | Mỗi | Cộng thêm | 09/2026 |
|---|---:|---|---:|---:|---:|
| Dòng cũ tương ứng rule 115 | 30 - 50 | Cố định |  |  | 5 |
| Dòng mới, cùng điều kiện dự án | > 50 | Lũy tiến theo giá | 10 | 1 | 5 |

`Rule quỹ chéo` dùng đúng ba cột cấu hình trên, đặt sau `Khoảng Giá`.

## 4. Công thức tính điểm

```text
P = giá giao dịch dùng để tính điểm, đơn vị VND
T = mốc lấy từ cận dưới của Khoảng Giá, đơn vị VND
B = điểm cơ sở trong ô tháng giao dịch
S = Mỗi (tỷ VNĐ), quy đổi sang VND
D = Cộng thêm (điểm)

Số bậc đủ = max(0, floor((P - T) / S))
Điểm rule = B + Số bậc đủ × D
```

Ví dụ `Khoảng Giá = > 50`, `B = 5`, `S = 10`, `D = 1`:

| Giá | Rule khớp | Điểm |
|---:|---|---:|
| 50 tỷ | Dòng cố định 30–50 | 5 |
| 55 tỷ | Dòng lũy tiến >50 | 5 |
| 59,9 tỷ | Dòng lũy tiến >50 | 5 |
| 60 tỷ | Dòng lũy tiến >50 | 6 |
| 69,9 tỷ | Dòng lũy tiến >50 | 6 |
| 70 tỷ | Dòng lũy tiến >50 | 7 |
| 80 tỷ | Dòng lũy tiến >50 | 8 |

Phần lẻ chưa đủ một bước được giữ nguyên điểm. Phép tính dùng số VND nguyên để hạn chế sai số số thực ở đúng mốc.

## 5. Quy tắc chọn dòng

1. Xác định tháng giao dịch và loại quỹ.
2. Tìm danh sách rule theo dự án/phạm vi hiện hành.
3. Chỉ xét dòng khớp sản phẩm, loại căn, khoảng giá và có điểm ở đúng tháng.
4. Biên giá được giữ đúng ký hiệu: `30 - 50` có giá 50; `> 50` không có giá 50; `>= 50` có giá 50.
5. Dòng `30 - 50` không còn được tự mở rộng để bắt mọi giá trên 50.
6. Sau khi chọn đúng dòng, đọc `Cách tính điểm`. Với cố định trả điểm cơ sở; với lũy tiến áp dụng công thức ở mục 4.
7. Quỹ NW cụ thể, Quỹ NW chung, Quỹ Chéo cụ thể và Quỹ Chéo chung dùng cùng hàm tính lũy tiến.
8. Nếu không có dòng nào khớp đầy đủ, kết quả để trống. Không tự gán điểm mặc định cho Quỹ NW hoặc Quỹ Chéo và không dùng rule của quỹ còn lại.
9. Giá dùng để đối chiếu rule là `Giá gồm VAT + KPBT`; nếu cột này trống hoặc bằng 0 thì dùng `Giá chưa VAT`.

### 5.1. Nguồn rule và rule ẩn được phép

Điểm cơ sở chỉ được lấy từ `Rule quỹ NW`, `Rule quỹ chéo` hoặc cấu hình chiến dịch đang hiển thị trong ứng dụng. Ngoài các dòng cấu hình này, engine chỉ giữ ba nhóm xử lý ẩn:

- Căn hủy: 0 điểm.
- Căn do `CTV`, `ĐỐI TÁC`, `BLĐ` hoặc `BO` bán: 0 điểm.
- Căn do PTĐT bán: áp dụng hệ số PTĐT hiện hành; giữ nguyên điểm khi CVKD chính là PTĐT đứng tên hoặc thỏa điều kiện nội bộ đã có.

Không còn điểm mặc định `Quỹ NW = 2`, `Quỹ Chéo = 1`, điểm riêng MAS VCG, thưởng giá trên 30 tỷ hoặc hệ số thời gian viết cứng trong engine.

## 6. Lưu, sửa và bảo toàn lịch sử

Ba cột cấu hình là thuộc tính của cả dòng. Mọi ô tháng có điểm trên cùng dòng dùng cùng cách tính, bước giá và điểm cộng.

- **Thêm rule lũy tiến**: tạo dòng mới; chỉ ghi điểm vào tháng đã chọn; các tháng khác để trống.
- **Sửa điểm của một tháng**: cập nhật ô tháng trên dòng hiện tại.
- **Sửa điều kiện hoặc cách tính cho một tháng khi dòng đã có điểm ở tháng khác**: tạo dòng phiên bản mới, chỉ ghi tháng đang sửa và xóa điểm tháng đó khỏi dòng cũ. Các tháng lịch sử vẫn nằm trên dòng cũ với cấu hình cũ.
- **Sửa đồng loạt tất cả tháng ở chế độ cố định**: cập nhật dòng hiện tại.
- **Sang tháng mới**: chèn cột tháng mới tại M của NW hoặc G của Quỹ Chéo và sao chép điểm cơ sở tháng trước. Ba cột cấu hình giữ nguyên trên dòng nên không cần sao chép JSON.

Không dùng `Rule_ID`. UI tải lại dữ liệu sau mỗi thao tác thêm/sửa/xóa để nhận lại `rowIdx` hiện tại.

## 7. Chuyển đổi dữ liệu đang có

Khi mở màn hình cấu hình hoặc chạy đồng bộ tháng, backend tự kiểm tra schema:

1. Chèn ba cột mới ngay sau `Khoảng Giá` nếu chưa có.
2. Dòng cũ không có cấu hình được gán `Cố định`; hai cột bước để trống.
3. Nếu đang tồn tại `Rule_Config` JSON từ bản thử trước, đọc cấu hình của tháng hiện tại; nếu không có thì đọc entry tháng đầu tiên và chuyển thành ba giá trị hiển thị.
4. Sau khi chuyển, xóa cả cột `Rule_ID` và `Rule_Config`.
5. Các cột tháng tự dịch sang vị trí mới; giá trị điểm cũ được giữ nguyên.

Việc đọc JSON chỉ phục vụ di trú một lần. Sau di trú, JSON không còn là schema vận hành.

## 8. Validation và lỗi dữ liệu

- `Cách tính điểm` ngoài hai giá trị hợp lệ được chuẩn hóa về `Cố định`.
- Lũy tiến thiếu bước hoặc điểm cộng dương bị từ chối khi lưu.
- Lũy tiến phải có cận dưới đọc được từ `Khoảng Giá`; dữ liệu sai không được tự cộng điểm.
- Ô điểm tháng tiếp tục là số hoặc trống; số 0 là điểm hợp lệ.
- Khi nhiều dòng cùng khớp, engine chỉ lấy dòng có điểm ở đúng tháng. Với dữ liệu được tạo từ UI, cặp `30 - 50` và `> 50` không chồng biên.
- Các rule 0 điểm, chiến dịch và hệ số/điều chỉnh đặc biệt tiếp tục theo thứ tự xử lý hiện hành.

## 9. Tiêu chí nghiệm thu

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| UI-01 | Mở form thêm/sửa NW | Có hai tab; tab cố định giữ layout cũ |
| UI-02 | Mở form thêm/sửa Quỹ Chéo | Có cùng hai tab và hai trường lũy tiến |
| DATA-01 | Lưu cố định | Cột cách tính = `Cố định`; Mỗi/Cộng thêm trống |
| DATA-02 | Lưu lũy tiến 10/+1 | Ba cột hiện `Lũy tiến theo giá`, `10`, `1` |
| DATA-03 | Sheet còn ID/JSON | Tự chuyển dữ liệu rồi xóa hai cột kỹ thuật |
| RULE-01 | 50 tỷ | Dòng 30–50 = 5 |
| RULE-02 | 55 và 59,9 tỷ | Dòng >50 = 5 |
| RULE-03 | 60 và 69,9 tỷ | Lần lượt = 6 và 6 |
| RULE-04 | 70 và 80 tỷ | Lần lượt = 7 và 8 |
| HIST-01 | Đổi cấu hình riêng 09 khi dòng có 08 | 08 giữ dòng/cấu hình cũ; 09 nằm ở dòng phiên bản mới |
| ROLL-01 | Tạo tháng mới | Cột tháng nằm sau ba cột cấu hình và kế thừa điểm cơ sở |

## 10. File triển khai

- Backend và rule engine: `src/Code.gs` và bản mirror `Code.gs`.
- UI: `src/ConfigUI.html` và bản mirror `ConfigUI.html`.
- Test rule: `tests/progressive-rule.test.cjs`.
- Test tính điểm tự động: `tests/auto-score.test.cjs`.
- Mockup/ảnh đối chiếu: cùng thư mục với tài liệu này.
