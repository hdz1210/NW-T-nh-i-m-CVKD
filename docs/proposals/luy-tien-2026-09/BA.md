# BA — Cấu hình lũy tiến theo giá cho Quỹ NW và Quỹ Chéo

| Thông tin | Nội dung |
|---|---|
| Phiên bản | 1.0 — 09/09/2026 |
| Trạng thái | Đề xuất nghiệp vụ và thiết kế, chờ duyệt triển khai |
| Nguồn đối chiếu | `src/ConfigUI.html`, `src/Code.gs`, ảnh setting và dòng 115 do người dùng cung cấp |
| Quy tắc đã xác nhận | Đủ mỗi 10 tỷ trên mốc 50 tỷ mới cộng 1 điểm: 55 tỷ = 5; 60 tỷ = 6 |
| Yêu cầu UI mới nhất | Bám sát setting hiện tại, chỉ thêm tab lũy tiến và các ô cấu hình cần thiết |
| Đã loại khỏi form | Khung xem trước điểm, ô giá thử, bảng kết quả thử và khung giải thích/ví dụ |

Tài liệu này thay thế phương án UI ở các bản mockup trước. Chỉ các quy tắc đã xác nhận ở trên là quyết định của người dùng; schema, cách chuyển đổi và các chi tiết vận hành dưới đây là phương án đề xuất. Lượt công việc này chưa sửa ứng dụng, chưa sửa schema thật, chưa ghi Google Sheets và chưa triển khai Apps Script.

## 1. Mục tiêu và phạm vi

Người quản trị cấu hình điểm được chọn cách tính cố định hoặc lũy tiến trên từng dòng rule, áp dụng theo tháng, ở cả:

- **Quỹ NW**: khớp dự án và các điều kiện NW hiện có.
- **Quỹ Chéo**: khớp tên dự án F2 và khoảng giá hiện có.

Lũy tiến tính theo giá của **một giao dịch/căn**. Không cộng dồn doanh số nhiều căn, không lũy tiến theo số điểm đã đạt và không cộng điểm của hai dòng cùng khớp.

Giữ quy trình Thêm Ngay → danh sách tạm → Lưu Thay Đổi. Không bổ sung thao tác “Tạo từ dòng 115”, không thêm bước xác nhận, không đổi layout bảng/danh mục trong phạm vi UI lần này. Việc sửa bộ máy khớp và lưu cấu hình là cần thiết dù thay đổi nhìn thấy trên form nhỏ.

## 2. Thiết kế UI bám sát setting hiện tại

### 2.1. Những thành phần giữ nguyên

Mockup được dựng từ DOM và CSS sinh bởi `openAddRowModal()` / `renderFundSpecificFields()` trong mã nguồn hiện tại, dùng font Manrope và chiều rộng modal 660 px.

Giữ tiêu đề, thứ tự nhóm, bộ chọn quỹ, mã/tên dự án, CĐT, miền, sản phẩm, loại căn, Min/Max, checkbox tiền đất, badge khoảng giá, tháng áp dụng, badge bảo toàn tháng cũ, nhãn Điểm Cơ Sở, màu sắc và nút **Hủy / Thêm Ngay**. Không có banner sao chép, sidebar, dropdown toán tử mới hoặc checkbox “không giới hạn trên” mới.

### 2.2. Phần bổ sung duy nhất trong khối điểm

Trong **CẤU HÌNH ĐIỂM & THỜI GIAN ÁP DỤNG**, ngay dưới tiêu đề/badge, thêm hai tab:

| Tab | Trường hiển thị |
|---|---|
| Điểm cố định | Tháng Áp Dụng Rule + Điểm Cơ Sở như hiện tại |
| Lũy tiến theo giá | Giữ hai trường trên; thêm một hàng gồm **Mỗi (tỷ VNĐ)** và **Cộng thêm (điểm)** |

Không thêm trường “mốc gốc” riêng: **Từ (Min)** chính là mốc tính phần tăng giá. **Điểm Cơ Sở** là điểm gốc, không phải phần thưởng cộng vào điểm ở một dòng khác.

Ví dụ form lũy tiến: Min = 50, Max = 999, Điểm Cơ Sở = 5, Mỗi = 10, Cộng thêm = 1, tháng = 09/2026. Badge khoảng giá hiện **`> 50`**. Các bộ chọn dự án/CĐT/miền trong ảnh mockup là giá trị minh họa của form; để áp dụng đúng dòng 115 phải nhập lại đúng phạm vi của dòng 115, trong đó miền là **Tất cả**, không phải mặc định Miền Bắc.

### 2.3. Hành vi tab và Min/Max

1. Khi mở form thêm mới thông thường, chọn mặc định **Điểm cố định**; dữ liệu mới chỉ đi theo lũy tiến nếu người dùng chọn tab đó.
2. Chuyển tab không xóa dự án, điều kiện, tháng hoặc điểm cơ sở đã nhập. Giá trị bước/điểm cộng được giữ trong phiên form; chỉ lưu khi tab lũy tiến được chọn.
3. Khi tạo một dòng lũy tiến mới, Min là cận dưới **không bao gồm**, Max hữu hạn là cận trên **có bao gồm**. Với Min 50 / Max 100, điều kiện là `50 < Giá ≤ 100`. Với Max 999, điều kiện là `Giá > 50` và không có giới hạn trên.
4. Giữ số **999** làm quy ước UI cũ cho “không giới hạn trên”. Khi lưu dữ liệu cấu trúc, chuyển 999 thành `null`; không coi 999 là trần giá thực. Min phải nhỏ hơn 999. Đây là giới hạn cấu hình kế thừa UI hiện có; nhu cầu đặt mốc/trần đúng 999 tỷ cần thiết kế riêng.
5. Với form cố định mới, cách diễn giải Min/Max giữ hành vi hiện có: 0/999 là tất cả, Min dương/999 là ≥ Min, 0/Max hữu hạn là < Max, Min=Max là bằng, khoảng dương hữu hạn bao gồm hai đầu.
6. Phải cập nhật badge khoảng giá theo biên thực. Không đổi nhãn “Từ (Min)”, không thêm khung giải thích. Backend lưu rõ cờ bao gồm/loại trừ biên để không phải suy đoán từ nhãn nhập liệu.
7. Form sửa tải kiểu tính và tham số của đúng tháng được chọn. Khoảng giá đã lưu là điều kiện độc lập; đổi riêng kiểu tính ở một tháng không được âm thầm đổi biên giá của dòng. Nếu người dùng sửa Min/Max hoặc cần đổi biên, áp dụng quy tắc tạo phiên bản dòng tại mục 6.4.
8. Lũy tiến yêu cầu một tháng cụ thể. Tùy chọn **Tất cả các tháng** hiện tại không áp dụng cho lũy tiến; disable trong tab này và kiểm tra lại trên server. Nếu đang chọn ALL rồi chuyển tab, yêu cầu chọn tháng cụ thể, không âm thầm ghi hàng loạt.

### 2.4. Mockup bàn giao

| File | Nội dung |
|---|---|
| `mockup-quy-nw.png` | Quỹ NW, tab lũy tiến, ví dụ 50 / 999 / 5 / 10 / 1 |
| `mockup-quy-cheo.png` | Quỹ Chéo, tab lũy tiến, cùng ví dụ |
| `mockup-quy-nw-co-dinh.png` | Quỹ NW, tab cố định; phần thêm vào chỉ là hàng tab |
| `mockup-quy-cheo-co-dinh.png` | Quỹ Chéo, tab cố định |
| `mockup.html`, `mockup-f2.html` | Bản mô phỏng độc lập; đổi tab và tham số số, không ghi Sheet |

Các danh mục trong bản mô phỏng là dữ liệu tĩnh; các ảnh mô tả thiết kế, không phải ảnh ứng dụng đã được triển khai. `mockup-bang-rule.png` từ vòng trước là tư liệu phương án cũ, không phải yêu cầu thay đổi bảng trong BA này.

## 3. Quy tắc nghiệp vụ tính điểm

### 3.1. Công thức

Sau khi giao dịch khớp phạm vi và tháng của **một** rule lũy tiến:

```text
P = giá được dùng để tính điểm của giao dịch, đơn vị VND
T = mốc giá Min, đơn vị VND
B = điểm cơ sở trong ô của tháng giao dịch
S = bước tăng giá, đơn vị VND, S > 0
D = điểm cộng mỗi bước, D > 0

Số bậc = floor((P - T) / S)
Điểm theo rule = B + Số bậc × D
```

Chỉ gọi công thức sau khi đã kiểm tra khoảng giá. Rule mẫu yêu cầu P > T; tại P=T, dòng mới không khớp. Phần giá chưa đủ một bước không được làm tròn lên. Không trừ hằng số 50.0001 và không cộng thêm 1 bậc trước khi đủ bước.

Mốc T lấy từ `price.minVnd`; không lưu thêm `threshold` có thể khác Min. Điểm B chỉ lấy từ ô tháng; không sao chép thêm `baseScore` trong JSON.

### 3.2. Dòng 115 và dòng mới

| Dòng | Phạm vi điều kiện | Khoảng giá | 09/2026 | Kiểu tính |
|---|---|---|---:|---|
| 115 | Các điều kiện gốc trong ảnh | 30 ≤ P ≤ 50 tỷ | 5 | Cố định |
| Mới | Cùng phạm vi dự án/CĐT/miền/sản phẩm/loại căn | P > 50 tỷ | 5 | Lũy tiến: 10 tỷ / +1 điểm |

“115” là số đang nhìn thấy trên UI, không phải khóa dữ liệu. Dòng mới có ID riêng. Nếu sau này điểm của dòng 115 thay đổi, điểm gốc 5 của dòng mới không tự thay đổi theo.

| Giá giao dịch | Dòng khớp trong ví dụ | Số bậc | Điểm theo rule |
|---:|---|---:|---:|
| 50.000.000.000 VND | 115 | — | 5 |
| 50.000.000.001 VND | Mới | 0 | 5 |
| 55 tỷ | Mới | 0 | 5 |
| 59.999.999.999 VND | Mới | 0 | 5 |
| 60 tỷ | Mới | 1 | 6 |
| 60.000.000.001 VND | Mới | 1 | 6 |
| 69,9 tỷ | Mới | 1 | 6 |
| 70 tỷ | Mới | 2 | 7 |
| 80 tỷ | Mới | 3 | 8 |

Đây là bảng trong tài liệu BA để xác nhận nghiệp vụ; không đưa bảng hoặc ví dụ này vào form.

### 3.3. Giá tính điểm và thứ tự xử lý

- Loại giá `transaction`: dùng giá có VAT nếu hợp lệ và >0, nếu không thì giá chưa VAT hợp lệ và >0, theo thứ tự chọn giá giao dịch hiện có.
- Loại giá `land`: dùng tiền đất theo dữ liệu tra cứu VHHVB hiện có. Chỉ cho chọn khi phạm vi dự án xác định VHHVB; nếu phạm vi gồm dự án khác, báo cần tách dòng. Thiếu tiền đất là lỗi thiếu dữ liệu, không tự lấy tổng giá căn thay thế.
- Dùng **cùng P** để khớp khoảng giá và tính số bậc. Chuỗi “Giá đất” chỉ là nhãn, không phải logic chọn giá.
- Giữ thứ tự hiện có của quy tắc 0 điểm, chiến dịch, điểm đặc biệt VCG và các hệ số. Quy tắc 0 điểm được xử lý trước; nếu đã lấy điểm chiến dịch thì không cộng lũy tiến tháng lên trên điểm chiến dịch. Trong nhánh điểm tháng, NW cụ thể, NW chung, F2 cụ thể, F2 chung đều dùng chung hàm tính điểm của rule đã chọn.
- Sau điểm theo rule mới áp dụng các điều chỉnh đặc biệt/hệ số theo chính sách hiện có. Không cộng thêm hàm thưởng trên 50 tỷ cũ lần nữa.

Hiện code thay giá VHHVB bằng giá tra cứu trước khi xét rule. Vì vậy khi chuyển các dòng cũ phải đối chiếu căn cứ giá đang có và lưu đúng `basis` tương ứng; không coi việc bỏ chọn checkbox ở UI là quyền tự đổi căn cứ giá của mọi rule cũ.

### 3.4. Chọn rule và xử lý chồng điều kiện

1. Chuẩn hóa tháng giao dịch thành `YYYY-MM`, đúng loại quỹ.
2. Thu thập các ứng viên theo chính sách ưu tiên dự án cụ thể rồi đến nhóm Tất cả hiện hành.
3. Trong nhóm ứng viên, chỉ giữ rule có điểm tháng hợp lệ, có cấu hình tháng bật, đủ dữ liệu giá và khớp tất cả các điều kiện mà nhánh hiện có sử dụng.
4. Với NW rule chung, giữ mức ưu tiên CĐT/miền/sản phẩm/loại căn/khoảng giá hiện có. Không mở rộng thêm bộ điều kiện cho Quỹ Chéo.
5. Chọn một rule có độ ưu tiên cao nhất. Các rule cùng mức ưu tiên bị chồng điều kiện phải được phát hiện khi lưu; báo dòng xung đột và chặn cấu hình mới. Hai rule khác mức ưu tiên có thể là ngoại lệ có chủ đích, không mặc định chặn tất cả overlap.
6. Không chọn `candidates[0]` nếu không khớp; không để thứ tự hàng quyết định thắng thua ở các rule v2 cùng mức ưu tiên. Dòng 30–50 không được bắt giá >50 trong nhóm đã chuyển sang v2.
7. Giá trị điểm **0** là cấu hình hợp lệ; ô trống không phải 0. Rule không có điểm tháng không được dùng để che rule khác có cấu hình tháng phù hợp.

Nếu dữ liệu Sheet bị sửa trực tiếp tạo ra xung đột hoặc metadata lỗi: công cụ kiểm tra trả trạng thái lỗi cấu hình; các luồng tự tính giữ điểm X trước đó cho giao dịch bị lỗi và ghi nhận lỗi, không biến lỗi thành điểm mặc định hoặc ghi chuỗi lỗi vào cột điểm. Trường hợp không có rule bình thường tiếp tục dùng chính sách mặc định NW/F2 hiện hành, không trộn với trường hợp cấu hình hỏng.

## 4. Schema Sheet hiện tại

Dòng tiêu đề cột là **hàng 3**, dữ liệu bắt đầu từ **hàng 4**. Phần mô tả dưới đây lấy từ code local, chưa đọc dữ liệu Sheet đang chạy.

### 4.1. `Rule quỹ NW` (tên cũ: `Tổng hợp`)

| Cột | Tên/ý nghĩa hiện tại |
|---|---|
| A | Trạng thái |
| B | CĐT |
| C | Mã dự án |
| D | Dự án |
| E | Miền |
| F | Loại Quỹ |
| G | Sản Phẩm |
| H | Loại Căn |
| I | Khoảng Giá — chuỗi |
| J trở đi | Các cột tháng — ô điểm là số hoặc trống |

### 4.2. `Rule quỹ chéo` (tên cũ: `Dự án F2`)

| Cột | Tên/ý nghĩa hiện tại |
|---|---|
| A | Dự án |
| B | Loại Quỹ |
| C | Khoảng Giá — chuỗi |
| D trở đi | Các cột tháng — ô điểm là số hoặc trống |

Hiện Sheet chưa có trường lưu rõ kiểu tính, bước tăng và điểm cộng theo tháng. Các giá trị này đang được ngầm suy ra/gắn cứng trong code nên chỉ thêm input UI là chưa đủ.

## 5. Schema đề xuất sau khi lưu

### 5.1. Quyết định đề xuất: thêm hai cột ở cuối mỗi sheet

```text
NW: A…I thông tin hiện tại | các cột tháng từ J | Rule_ID | Rule_Config
F2: A…C thông tin hiện tại | các cột tháng từ D | Rule_ID | Rule_Config
```

- Giữ nguyên các cột nghiệp vụ và các ô điểm số hiện tại.
- Không chèn tham số lũy tiến trước các tháng; J của NW và D của F2 vẫn là vị trí đầu tháng mới nhất.
- Hai header metadata nằm ở hàng 3, sau cột tháng cuối cùng; tìm theo tên header, không gắn cứng chữ cái cột.
- Có thể ẩn/bảo vệ hai cột metadata khỏi chỉnh sửa thường ngày. Quản trị viên vẫn có thể mở để kiểm tra. Người dùng cấu hình bằng form, không phải tự nhập JSON.
- Không tạo thêm sheet và không nhét chuỗi `5 + ...` hay công thức Spreadsheet vào ô tháng. Ô tháng tiếp tục là **điểm gốc dạng số**.

| Cột mới | Kiểu | Ý nghĩa và ràng buộc |
|---|---|---|
| `Rule_ID` | Chuỗi ID ổn định, duy nhất | Server sinh UUID; giữ nguyên khi sửa/sắp xếp/chèn dòng. Sao chép thành rule mới phải có ID mới. Không dùng rowIdx hoặc STT 115 làm khóa. |
| `Rule_Config` | Chuỗi JSON hợp lệ | Điều kiện giá cấu trúc và cấu hình kiểu tính theo tháng; có phiên bản schema và revision chống ghi đè cấu hình cũ. |

Lý do lưu các bước theo tháng trong JSON: nếu chỉ thêm ba cột chung “Kiểu tính / Mỗi tỷ / Điểm cộng”, sửa bước của tháng 10 sẽ làm tháng 9 dùng bước mới. JSON cho phép bảo toàn riêng từng tháng với ít thay đổi cấu trúc Sheet. Đổi lại, các thao tác đọc/ghi phải qua bộ chuẩn hóa và validation; sửa Sheet thủ công chỉ còn phù hợp với các ô điểm, không dùng để tự chỉnh JSON.

### 5.2. Ví dụ vị trí cột sau lưu

Giả sử đang có **hai tháng** 09/2026 và 08/2026; đây là ví dụ, không khẳng định Sheet thật chỉ có hai tháng.

| Sheet | Các cột hiện có | Cột mới |
|---|---|---|
| NW | A…I; J = 09/2026; K = 08/2026 | L = Rule_ID; M = Rule_Config |
| F2 | A…C; D = 09/2026; E = 08/2026 | F = Rule_ID; G = Rule_Config |

Các cột A…I của NW không thay đổi về thứ tự. Ví dụ hai dòng sau lưu, rút gọn cột để dễ đọc:

| Dòng hiển thị | CĐT / dự án / miền | Khoảng Giá | 09/2026 | 08/2026 | Rule_ID | Rule_Config |
|---|---|---|---:|---|---|---|
| 115 | Phạm vi gốc của dòng 115 | 30 - 50 | 5 | Giữ nguyên giá trị cũ | `nw-base-demo` | JSON cố định ở mục 5.4 |
| Mới | Cùng phạm vi gốc | > 50 | 5 | Trống | `nw-progressive-demo` | JSON lũy tiến ở mục 5.3 |

Quỹ Chéo lưu tương tự:

| Dự án | Loại Quỹ | Khoảng Giá | 09/2026 | 08/2026 | Rule_ID | Rule_Config |
|---|---|---|---:|---|---|---|
| Tất cả | Quỹ Chéo | > 50 | 5 | Trống | `f2-progressive-demo` | Cùng schema lũy tiến |

Các ID trên chỉ để minh họa; khi triển khai dùng UUID thật. Không sao chép `nw-progressive-demo` làm ID ở cả hai quỹ.

### 5.3. Nội dung `Rule_Config` của dòng lũy tiến mới

```json
{
  "schemaVersion": 2,
  "revision": 1,
  "legacyMonths": [],
  "price": {
    "basis": "transaction",
    "minVnd": 50000000000,
    "minInclusive": false,
    "maxVnd": null,
    "maxInclusive": false
  },
  "months": {
    "2026-09": {
      "enabled": true,
      "mode": "progressive",
      "stepVnd": 10000000000,
      "stepPoints": 1,
      "rounding": "floor_complete_steps"
    }
  }
}
```

Trong Sheet, JSON trên nằm gọn trong **một ô**. Có thể ghi dạng một dòng không có khoảng trắng. Không chứa `baseScore: 5`: số 5 đã nằm trong ô 09/2026.

| Thuộc tính | Quy định |
|---|---|
| schemaVersion | `2` cho cấu trúc BA này; phiên bản không hỗ trợ phải báo lỗi, không tự đoán |
| revision | Số nguyên tăng khi lưu sửa cấu hình; server dùng để phát hiện dữ liệu đã thay đổi từ lần mở form |
| legacyMonths | Danh sách tháng còn dùng cơ chế cũ trên dòng đã chuyển một phần; dòng mới luôn là `[]`. Không suy đoán legacy chỉ vì thiếu entry trong months. |
| price.basis | `transaction` hoặc `land` |
| price.minVnd | Giá Min quy đổi VND; chính là mốc lũy tiến |
| price.minInclusive | false ở dòng lũy tiến mới mẫu; true/false lưu đúng điều kiện của dòng |
| price.maxVnd | Số VND nếu có cận trên; `null` khi UI Max = 999 |
| price.maxInclusive | Có bao gồm cận trên không; false khi không có cận trên |
| months | Map theo khóa `YYYY-MM`, độc lập với vị trí vật lý của cột tháng |
| enabled | true để xét rule ở tháng này; false để ngừng hiệu lực có chủ đích |
| mode | `fixed` hoặc `progressive` |
| stepVnd | Số VND >0 trong chế độ progressive; `null` trong fixed |
| stepPoints | Điểm cộng >0 trong progressive; `null` trong fixed |
| rounding | `floor_complete_steps` trong progressive; `null` trong fixed |

`price` áp dụng cho cả dòng vì khoảng giá hiện là một cột dùng chung. Vì vậy sửa khoảng giá/căn cứ giá của một dòng đã có lịch sử phải tạo phiên bản dòng, không thay `price` toàn cục rồi áp ngược vào tháng cũ.

### 5.4. JSON cố định của dòng 115 sau khi chuyển đổi tháng 09

Ví dụ này giả sử dòng 115 đã có cấu hình tháng 08/2026 và cần bảo toàn theo cơ chế cũ. Nếu thực tế không có tháng đó, không tự thêm vào legacyMonths.

```json
{
  "schemaVersion": 2,
  "revision": 1,
  "legacyMonths": ["2026-08"],
  "price": {
    "basis": "transaction",
    "minVnd": 30000000000,
    "minInclusive": true,
    "maxVnd": 50000000000,
    "maxInclusive": true
  },
  "months": {
    "2026-09": {
      "enabled": true,
      "mode": "fixed",
      "stepVnd": null,
      "stepPoints": null,
      "rounding": null
    }
  }
}
```

Các tháng cũ chưa chuyển đổi không tự được gán fixed chỉ vì thiếu cấu hình trong map. Những ô tháng cũ sẵn có được giữ nguyên; legacyMonths ghi nhận rõ tháng nào còn theo logic cũ. Tháng legacy dùng nguyên đường tính cũ, không dùng price/mode v2. Một tháng không được đồng thời nằm trong legacyMonths và months.

### 5.5. Nguồn dữ liệu có thẩm quyền

| Dữ liệu | Nguồn đọc cho v2 |
|---|---|
| Dự án, CĐT, miền, sản phẩm, loại căn và thông tin dòng | Các cột nghiệp vụ hiện có, theo nhánh khớp hiện hành |
| Điều kiện biên giá và căn cứ giá | `Rule_Config.price` |
| Nhãn Khoảng Giá trong cột I/C | Sinh từ price; để hiển thị và đối chiếu, không parse lại làm nguồn chính |
| Điểm gốc tháng | Ô số ở cột có header đúng tháng |
| Bước tăng, điểm cộng và kiểu tính tháng | `Rule_Config.months[monthKey]` |
| Rule đang được sửa | `Rule_ID`; rowIdx chỉ là vị trí được server tra lại tại thời điểm ghi |

Nếu nhãn Khoảng Giá khác metadata, cần báo lệch cấu hình; không để một nơi tính theo nhãn, nơi khác tính theo JSON. Chỉnh điều kiện của rule v2 thực hiện qua UI. Khi sort hoặc copy trong Sheet phải bao gồm cả metadata của dòng; chỉ sort riêng vài cột khiến mất liên kết và là dữ liệu không hợp lệ.

## 6. Luồng lưu, sửa và kế thừa tháng

### 6.1. Thêm mới

1. **Thêm Ngay** kiểm tra input và thêm vào danh sách tạm như hiện tại; chưa tạo ID/schema trên Sheet thật.
2. **Lưu Thay Đổi** gửi điều kiện, monthKey, điểm gốc, mode, bước tăng, điểm cộng và request ID của lượt lưu.
3. Server kiểm tra lại toàn bộ payload, tháng được phép sửa, xung đột rule; tạo đủ header metadata nếu chưa có và sinh Rule_ID cho dòng mới.
4. Ghi dòng nghiệp vụ, điểm gốc ở đúng tháng và JSON; các tháng khác của dòng mới để trống. Việc thêm cột metadata không tự chuyển tất cả dòng cũ sang fixed.
5. Server trả Rule_ID và revision đã lưu; UI chỉ xóa trạng thái thay đổi chưa lưu khi toàn bộ thao tác thành công. Retry cùng request không được tạo dòng trùng.

### 6.2. Sửa điểm/cấu hình một tháng

Tra dòng bằng Rule_ID và tháng bằng header ngày. Chỉ sửa ô điểm tháng đó và entry `months[monthKey]`; giữ nguyên các tháng khác. Server từ chối nếu revision không còn khớp và yêu cầu tải lại cấu hình. Cập nhật ô điểm trực tiếp từ UI vẫn phải đi qua cùng cơ chế khóa/kiểm tra đồng thời.

Nếu đổi mode sang fixed mà vẫn giữ đúng khoảng giá của dòng, xóa các tham số lũy tiến của **tháng đang sửa** bằng null. Nếu tháng khác vẫn progressive, các tham số của tháng đó tiếp tục tồn tại.

### 6.3. Khi mở tháng 10/2026

Ví dụ trước: NW `J=09, K=08, L=ID, M=Config`. Khi thêm tháng 10 tại J: `J=10, K=09, L=08, M=ID, N=Config`. F2 tương tự: `D=10, E=09, F=08, G=ID, H=Config`. Không cố định ID ở L/F trong code.

- Sao chép ô điểm gốc tháng trước sang cột mới theo quy trình hiện có.
- Sao chép sâu entry 09 sang entry 10: enabled, mode, stepVnd, stepPoints, rounding. Không tham chiếu chung object.
- Sau khi sửa bước 10/2026 thành 20 tỷ, 09/2026 vẫn bước 10 tỷ. Ví dụ cùng giá 70 tỷ và điểm gốc 5: tháng 09 là 7 điểm, tháng 10 là 6 điểm.
- Entry đã có ở tháng mới không bị đè bởi lượt rollover chạy lại. Tính nhất quán và tính lặp an toàn phải bao gồm cả điểm số và metadata.
- Entry tháng trước disabled được kế thừa disabled. Không hồi sinh rule đã ngừng; không lấp tháng trống bằng một kiểu tính tự đoán. Nếu tháng trước thuộc legacyMonths và chưa chuyển đổi, tháng mới được ghi nhận legacy tương ứng khi kế thừa; không tự chuyển sang fixed/progressive v2.

### 6.4. Sửa điều kiện dùng chung hoặc xóa rule

Khi đổi dự án/CĐT/miền/sản phẩm/loại căn/khoảng giá/căn cứ giá cho một tháng của dòng đã có lịch sử: tạo dòng phiên bản mới với Rule_ID mới, chỉ bật tháng đang sửa; giữ dòng cũ và tắt entry tương ứng tháng đó. Giữ nguyên các ô tháng cũ của dòng cũ. Dòng mới tự kế thừa sang các tháng tương lai theo rollover hiện hành; không ghi lại các tháng quá khứ ngoài tháng đã chọn.

Rule đã có lịch sử nên ngừng hiệu lực theo tháng thay vì xóa vật lý; xóa vật lý chỉ dùng cho dòng chưa từng áp dụng hoặc trong quy trình bảo trì đã được cho phép. Đây là bảo vệ dữ liệu cần có khi triển khai, không phải thêm một nút mới vào mockup hiện tại.

### 6.5. Ghi dữ liệu nhất quán

Lưu cấu hình và tự tính điểm phải phối hợp cùng cơ chế khóa. Validate toàn bộ trước ghi; đọc/ghi theo lô. Nếu nhiều range phải ghi mà một phần thất bại, khôi phục dữ liệu đã đọc hoặc đánh dấu lượt lưu chưa hoàn tất và chặn engine dùng phiên bản đó. Không công bố thành công khi mới ghi ô điểm mà chưa ghi JSON. Giữ điểm X cũ ở lượt tính thất bại; không thay đổi điểm Y thủ công.

Schema mới yêu cầu cập nhật **tất cả** nơi lấy range từ cột đầu tháng đến `getLastColumn()`: chỉ nhận header tháng hợp lệ, không coi hai cột metadata là điểm. Những chỗ chỉ định dạng toàn bộ dải cũng phải loại metadata. Các thao tác thêm dòng không thể tiếp tục chỉ nối `[thông tin, ...scores]` mà bỏ quên ID/Config.

## 7. Validation

| Đối tượng | Quy tắc |
|---|---|
| Tháng | Một tháng cụ thể có trong schema; tuân thủ khóa lịch sử; progressive không nhận ALL |
| Điểm cơ sở | Bắt buộc, số hữu hạn ≥0; 0 hợp lệ; tối đa 2 chữ số thập phân theo `cleanScore` hiện tại |
| Min | Bắt buộc trong progressive; số hữu hạn ≥0 và <999 theo UI hiện có |
| Max | Số hữu hạn từ 0 đến 999; progressive có Max hữu hạn phải >Min; 999 được chuẩn hóa null |
| Mỗi | Bắt buộc khi progressive; số hữu hạn >0; quy đổi VND phải là số nguyên an toàn |
| Cộng thêm | Bắt buộc khi progressive; số hữu hạn >0, tối đa 2 chữ số thập phân |
| Giá giao dịch | Đủ căn cứ giá đã chọn, số hữu hạn >0; giá thiếu/sai không được coi là giá 0 hoặc rule không khớp thông thường |
| ID/JSON | Rule_ID duy nhất; schemaVersion được hỗ trợ; đúng enum và kiểu dữ liệu; không tự fallback khi JSON lỗi |
| Khớp rule | Không có hai ứng viên cùng ưu tiên chồng điều kiện cho cùng tháng |

Chấp nhận nhập số thập phân theo locale, nhưng server chuẩn hóa rõ dấu thập phân. Đổi tỷ sang VND một lần rồi tính đủ bậc bằng VND. Không dùng epsilon để dịch ngưỡng. Phần điểm có thể tính theo đơn vị 0,01 điểm để tránh sai số tích lũy; chỉ làm tròn hiển thị theo quy ước hiện có.

## 8. Tương thích với cơ chế đang chạy

Các vấn đề đã xác minh trong code local:

| Vị trí | Hiện trạng |
|---|---|
| `calculateProgressiveScore` | Gắn cứng mốc 50, bước 10 và tháng 09/2026; 55 tỷ đang cho 6 điểm, 61 tỷ cho 7 |
| `matchRules` | Khoảng kết thúc ở 50 được cho khớp cả giá trên 50 |
| `canonicalKhoangGia` / parser UI | `>50` có thể bị đổi thành `>=50`; mất phân biệt biên |
| `evaluateRowWithRules` | Nhánh NW dự án cụ thể chưa tính lũy tiến giống NW chung và F2 |
| Công cụ kiểm tra giao dịch | Frontend có phần giải thích thưởng gắn cứng riêng với engine |

Phương án chuyển đổi:

1. Phân biệt **legacy** và **v2** theo rule/tháng. Metadata trống không đồng nghĩa fixed; dữ liệu cũ có thể đang dựa vào lũy tiến ngầm. JSON đã có nhưng hỏng là lỗi, không phải legacy.
2. Lập danh sách phạm vi đang bị hàm lũy tiến cũ tác động và bảng điểm trước/sau trước khi áp dụng chuyển đổi. Không xác định scope chỉ bằng việc chuỗi có chữ `50`.
3. Với nhóm mẫu, chuyển tháng 09 của dòng 115 sang fixed đúng 30–50 và thêm dòng >50 progressive. Chuẩn hóa/ghi nhận đầy đủ các điều kiện thực của dòng nguồn; không dùng dữ liệu mặc định trong mockup làm dữ liệu thật.
4. Trong nhóm đã chuyển, đường v2 ưu tiên trong đúng phạm vi và mức ưu tiên của nhóm; không để fallback legacy bắt giá >50 hoặc cộng thưởng lần hai. Các nhóm chưa chuyển tiếp tục dùng cơ chế legacy trong giai đoạn chuyển đổi.
5. Dòng v2 mới không có điểm tháng hoặc entry bị disabled thì không xét ở tháng đó. Với dòng đã chuyển một phần, chỉ tháng có tên trong legacyMonths mới được dùng legacy; không tự suy diễn từ cấu hình tháng khác. Nếu có điểm số nhưng không có entry months và cũng không thuộc legacyMonths, báo cấu hình thiếu; không tự đoán kiểu tính. Khi chuyển một tháng sang v2, xóa tháng đó khỏi legacyMonths và ghi entry months trong cùng lượt lưu.
6. Giữ khóa điểm cũ trước 09/2026 theo code hiện hành, không tự tính lại hoặc điền cột X ở các tháng đã đóng băng. Bảo toàn Y thủ công. Đối chiếu ảnh hưởng điểm của tháng được chuyển trước khi bật tính lại.
7. Chỉ bỏ hoàn toàn hàm lũy tiến legacy sau khi đã chuyển đủ phạm vi và kiểm tra hồi quy. Schema migration chỉ thêm cấu trúc; không tự tạo rule cho mọi dòng có giá 50/150/Tất cả.

## 9. Tiêu chí nghiệm thu

| ID | Tình huống | Kết quả cần đạt |
|---|---|---|
| UI-01 | Mở form NW/F2 | Bố cục hiện có; thêm hàng tab trong khối điểm, không có khung xem trước/ví dụ |
| UI-02 | Chọn tab progressive | Chỉ thêm hai input Mỗi và Cộng thêm; dùng lại Min và Điểm Cơ Sở |
| UI-03 | Chuyển tab trong form | Giữ dữ liệu đã nhập; không đổi tháng hoặc tự lưu |
| UI-04 | Thêm Ngay | Chỉ vào danh sách tạm; Lưu Thay Đổi mới ghi Sheet |
| UI-05 | Sửa tháng có progressive | Đọc lại đúng kiểu tính, 10 tỷ, +1 và điểm cơ sở |
| BR-01 | P=50 và P=50+1 VND | 50 khớp dòng 115; 50+1 khớp dòng mới, 5 điểm |
| BR-02 | 55; 59.999.999.999 VND | 5 điểm |
| BR-03 | 60 tỷ; 60 tỷ+1 VND; 69,9 tỷ | 6 điểm |
| BR-04 | 70 tỷ; 80 tỷ | 7; 8 điểm |
| BR-05 | Mốc 40, bước 5, B=3, D=0,5 | 44 tỷ=3; 45 tỷ=3,5; 50 tỷ=4 |
| BR-06 | NW cụ thể/chung; F2 cụ thể/chung | Cùng cấu hình và giá thì cùng phần tính lũy tiến |
| BR-07 | Đảo vị trí dòng 115 và dòng mới | Điểm không đổi; không cộng hai dòng |
| BR-08 | Hai rule cùng ưu tiên, chồng khoảng | Báo xung đột; không âm thầm chọn dòng đầu |
| BR-09 | Điểm gốc 0 và ô tháng trống | 0 được dùng; trống thì không coi là cấu hình điểm 0 |
| BR-10 | Max=999, P>999 tỷ | Vẫn xét là không giới hạn trên nếu P hợp lệ |
| BR-11 | Max hữu hạn 100 | 100 thuộc dòng; trên 100 không khớp dòng đó |
| BR-12 | Giá đất hợp lệ/thiếu | Dùng cùng giá đất để match/tính; thiếu thì báo thiếu dữ liệu |
| BR-13 | Giao dịch chiến dịch/VCG/PTĐT/hủy | Giữ chính sách hiện có, không cộng thưởng ngầm lần hai |
| DATA-01 | Lưu dòng mới ở 09 | Ô 09=5 là số; ô 08 trống; có ID riêng và JSON hợp lệ |
| DATA-02 | Sửa bước tháng 10 | Cấu hình và điểm cơ sở tháng 09 giữ nguyên |
| DATA-03 | Rollover chạy hai lần | Không thêm cột/entry trùng, không đè tháng đã có cấu hình |
| DATA-04 | Chèn dòng hoặc sort toàn bộ hàng | ID và cấu hình vẫn đi cùng đúng rule |
| DATA-05 | Retry lưu/ghi đồng thời | Không tạo trùng ID/dòng; báo revision xung đột đúng |
| DATA-06 | JSON hỏng, giá thiếu, lưu lỗi một phần | Không ghi điểm sai hoặc công bố lưu thành công |
| DATA-07 | Metadata sau cột tháng | Fetch/save/format/rollover chỉ xử lý các cột tháng thực |
| HIST-01 | Tính lại tháng hiện hành | Các tháng đóng băng và Y thủ công không thay đổi |

## 10. Phạm vi code cần xử lý sau khi duyệt

- **UI**: form thêm/sửa NW/F2, tab lũy tiến, thu thập/khôi phục dữ liệu tháng, validation. Giữ bố cục/table hiện tại; khi mở ô điểm lũy tiến phải giữ metadata, không reset thành fixed.
- **Schema/API**: `fetchMonthlyConfigData`, `saveMonthlyConfigData`, `updateMonthlyConfigRow`, thao tác xóa, `initMonthlyConfigSheets` ở mức khai báo schema; migration không gọi hàm init có xóa sheet hiện hữu.
- **Tháng**: `ensureCurrentMonthConfigured`, định dạng/copy dải điểm và các hàm tháng liên quan, bao gồm rollover metadata.
- **Engine**: `getRuleEngineContext`, parser/formatter khoảng giá, `matchRules`, `matchKhoangGia`, bộ tính điểm chung và `evaluateRowWithRules`.
- **Kiểm tra/hồi quy**: test giao dịch hiện có lấy phần giải thích từ engine; bổ sung test v2 và giữ test legacy cho phạm vi chưa chuyển. Cập nhật các kỳ vọng cũ chỉ khi có phạm vi chuyển đổi tương ứng.
- **Nguồn triển khai**: Clasp đọc `./src`. Repo có bản gốc và bản `src`; cần đồng bộ theo quy trình repo khi thực sự triển khai.

Mã nguồn tham chiếu: [ConfigUI.html](C:/Users/Admin/Desktop/Diem_CVKD/src/ConfigUI.html:4140), [Code.gs](C:/Users/Admin/Desktop/Diem_CVKD/src/Code.gs:1496). Việc triển khai, migration dữ liệu thật và tính lại điểm không nằm trong lượt bàn giao BA/mockup này.
