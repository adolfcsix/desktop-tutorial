# Túttt v0.8.14 — Kiểm tra PK Voice chỉ một vị trí điểm

Ngày: 12/11/2026. Cơ sở: v0.8.13. Phạm vi: HTML/CSS/JS web, thành phần React Native PK, hồi quy PK Cam. Không có thử nghiệm hai điện thoại thật.

## Vấn đề và cách khắc phục

Ở Voice, tỷ số đã được đổi từ `%` sang **điểm thật** tại hai đầu thanh thế trận, nhưng từng ô chủ phòng vẫn hiển thị thêm một cặp điểm ngay bên trên WIN/LOSS. Cách đó làm lặp thông tin và thu nhỏ khu vực kết quả.

- **Voice web:** Không còn `pk-side-score` trong từng ô đối kháng. Mỗi ô có `pk-voice-outcome-slot` với chiều cao cố định; ở trạng thái đang đấu không có chữ số, ở trạng thái kết thúc hiển thị WIN/LOSS/DRAW. Màu thắng vàng kim, màu thua tím trắng theo theme hiện hành, chuỗi `xN` chỉ đi cùng bên thắng.
- **Thanh dưới Voice:** Hai đầu hiển thị điểm thật A/B (không có `%`), dữ liệu hiển thị cập nhật từ điểm đã xác nhận. Phần trăm chỉ được dùng nội bộ để tính tỷ lệ chiều dài thanh và thuộc tính accessibility `progressbar`.
- **Voice React Native:** Gỡ tỷ số trong hai thẻ chủ phòng, giữ một hàng kết quả ổn định, tăng typography WIN/LOSS cho dễ nhận biết; thanh điểm dưới là nguồn hiển thị số duy nhất.
- **Cam:** Giữ số điểm và nhãn WIN/LOSS/chuỗi dưới số điểm ở hai video theo thiết kế đã duyệt; không thay đổi camera, chat nổi hay điều khiển.

## Kết quả xác minh

- `npm test`: **246/246 pass**, gồm 4 trường hợp mới chống lặp điểm Voice/Cam/native và kiểm tra ô kết quả.
- `npm run check:web`: **đạt**.
- Chromium: **8/8 Voice** (320/360/390/430 px × sáng/tối), **2/2 Cam** (390 px × sáng/tối). Không có tràn ngang; WIN/LOSS nằm hoàn toàn trong mỗi ô và không che tên người tham gia, mic hoặc thanh điểm; vị trí ô nhập không dịch chuyển.
- `prefers-reduced-motion: reduce`: chữ vẫn có, avatar không chạy animation; kết quả tự tắt sau khoảng **3,2 giây**.
- HTML xuất độc lập: Voice sáng/tối và Cam sáng/tối được chạy trên Chromium; trường hợp Cam tối được xác minh riêng sau khi bài chạy chung bị giới hạn thời gian môi trường.
- React Native: **12/12 TS/TSX parse hợp lệ**, chưa chạy bản build, chưa xác nhận UI/âm thanh trên iPhone hoặc Android thật.
- Logo và favicon: giữ nguyên từng byte so với v0.8.13.

## Màu kết quả tính toán thực tế trên Chromium

| Chế độ | WIN | LOSS |
| --- | --- | --- |
| Voice sáng | `rgb(173,113,31)` – vàng hổ phách | `rgb(114,82,157)` – tím đậm |
| Voice tối | `rgb(248,217,134)` – vàng kim | `rgb(237,226,255)` – tím trắng |
| Cam sáng/tối | `rgb(248,215,126)` – vàng kim | `rgb(243,238,255)` – tím trắng |

Ảnh: `docs/qa-v0814/voice-light-320-finish.png`, `voice-light-390-finish.png`, `voice-dark-390-finish.png`, `cam-light-390-finish.png`, `cam-dark-390-finish.png`. Dữ liệu máy móc: `docs/qa-v0814/results.json`.

## Giới hạn và ưu tiên tiếp

Thử nghiệm Chromium xác minh bố cục web, không thay thế việc build React Native hoặc xác nhận media liên phòng, Wi-Fi/4G/5G, Bluetooth và âm thanh hai chiều trên hai thiết bị thật. Khi có thiết bị, thực hiện checklist Native v0.8.13 trước khi coi nghiệm thu âm thanh là đạt.
