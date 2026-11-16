# Túttt v0.8.6 — PK Score Takeover & Voice Finishing Polish

**Ngày:** 12/11/2026. **Nguồn:** v0.8.5. **Mục tiêu:** Hoàn thiện WIN vàng kim/LOSS tím trắng, PK Voice cân hơn với Cam, thanh thế trận theo điểm (không hiển thị phần trăm), phản hồi đúng thời điểm đổi phe dẫn.

## Thay đổi thực tế

1. `prototype/app.js`: Khởi tạo và cập nhật `data-pk-leading` cùng `data-pk-last-decided-leader`. Khi dữ liệu điểm cập nhật thực sự đổi người dẫn, chỉ thêm trạng thái `pk-lead-switch` trên **cùng DOM hiện có**. Giữ người dẫn cuối cùng qua trường hợp hòa (`B -> hòa -> A`) để phát hiện cuộc vượt điểm. Không có nút riêng, không giả lập lượt đấu trong môi trường production.
2. `prototype/pk-meter-v076.css`: Một nhịp sáng rất ngắn (540 ms) trên marker và thanh khi đổi phe dẫn; không lặp liên tục; tắt hoàn toàn trong `prefers-reduced-motion:reduce`.
3. `prototype/pk-voice-v077.css` và `prototype/pk-finish-v080.css`: Cân lại độ đậm chữ số, nhãn phe và không gian hai cột, giữ tên/biểu tượng mic. Khi hiện WIN/LOSS, dòng chú thích thế trận phía dưới thanh được **ẩn mà giữ chỗ** để nhãn kết quả nổi hơn, không làm chat/ô nhập dịch chuyển. WIN vàng kim và LOSS tím trắng giữ palette khác nhau cho nền Ivory/Espresso; Cam không đổi cấu trúc và vẫn đặt kết quả ngay dưới điểm.
4. Hoạt động mic thực: khi nhận sự kiện trạng thái nói trên web, cập nhật viền xanh, biểu tượng mic và nhãn trạng thái **tại chỗ**, không dựng lại chat. Đối thủ chưa ghép audio vẫn gắn nhãn chưa kết nối; không mô phỏng tín hiệu giọng nói.
5. React Native `PKDuelBoard.tsx`: marker phản hồi scale một nhịp theo snapshot đã xác nhận, không phản hồi khi hòa hoặc khi kết quả đã kết thúc. Giữ giảm chuyển động. **Mới parse cú pháp; chưa build iOS/Android**.
6. Cập nhật `package.json`, health endpoint, title/footer HTML lên v0.8.6; sửa test còn đòi phần trăm dù UI đã chuyển sang điểm từ v0.8.5. Bổ sung bộ test cho số điểm hiển thị, màu WIN/LOSS và cuộc vượt qua mốc hòa.

## Nghiệm thu

| Lớp kiểm tra | Kết quả |
| --- | --- |
| `npm test` | **205/205** PASS |
| `npm run check:web` | PASS |
| Chromium — kết thúc trận 320/390/430/768 × Voice/Cam × light/dark | **16/16** PASS; bao gồm giảm chuyển động và tự tắt sau 3,2 giây |
| Chromium — vượt điểm B → hòa → A | **4/4** PASS (Voice 320/390, Cam 390, Voice reduced-motion) |
| Chromium — bản HTML độc lập, kết thúc trận | **4/4** PASS (Voice/Cam × light/dark) |
| React Native TS/TSX parse | **11/11** tệp hợp lệ, 0 parse error (không phải typecheck hoặc build) |

### Dữ liệu thử và giới hạn

- Trong kịch bản QA để chứng minh vượt điểm, **chỉ fixture kiểm thử** đặt B dẫn `1.240 : 1.280`, sau đó hai lần bấm Tiếp sức tạo `1.280 : 1.280` rồi `1.320 : 1.280`. Không chỉnh dữ liệu điểm mặc định hoặc công thức tính điểm trong sản phẩm.
- Số điểm hiển thị ở hai đầu thanh là tổng điểm thật theo snapshot, còn vị trí thanh vẫn tính tỷ lệ nội bộ từ hai điểm đó. `aria-valuenow` 0–100 được giữ cho trình đọc màn hình; **không có phần trăm hiển thị**.
- Điểm/chuỗi thắng khi chạy máy chủ chỉ được cập nhật từ máy chủ; bản HTML độc lập là minh họa offline. Chưa chứng minh media bridge PK giữa hai phòng, quà/coin/thanh toán, hiệu năng thiết bị hoặc độ ổn định mạng thực.

## Trải nghiệm

Chạy từ gốc `npm start` rồi mở `http://localhost:8787`, vào Live → Voice/Cam → PK minh họa. Mở `TUTTT_V0_8_6_PREVIEW.html` từ file bàn giao để xem thử offline. Để xuất bản HTML tương tác mới từ mã nguồn: `python scripts/build_standalone_preview.py` (môi trường cần Python 3).

Ảnh tại `docs/qa-v086/`: các trường hợp WIN/LOSS Voice/Cam sáng/tối và thời điểm vượt điểm. JSON kiểm tra: `results-takeover.json`, `results-standalone.json`. Kiểm tra bố cục 16 trường hợp được ghi trong `docs/qa-v082/results.json` (đã chạy lại trên mã v0.8.6).
