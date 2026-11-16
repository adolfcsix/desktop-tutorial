# Túttt v0.8.7 — Biên bản nghiệm thu PK Voice & UI/UX

**Ngày:** 12/11/2026  
**Nguồn:** v0.8.6  
**Phạm vi:** nâng cấp bề mặt PK Voice, phản hồi mic tại chỗ, đồng bộ React Native; giữ nguyên bố cục PK Cam và luật điểm trên server.

## Hạng mục thực hiện

| Hạng mục | Tinh chỉnh | Ràng buộc |
| --- | --- | --- |
| Voice Ivory | Chất liệu Ivory đào/kem và nhấn Scarlet/Champagne dịu, làm mềm viền sân khấu và bóng avatar | Không thêm thành phần lớn hoặc kéo dài sân khấu |
| Voice Espresso | Dải nền espresso tím-nâu trầm, hai phe phân biệt bằng sắc độ, không dùng neon gắt | WIN vàng kim, LOSS tím trắng vẫn dễ đọc |
| Avatar/VS/tỷ số | Giảm nhiễu ở vòng avatar, VS và thanh điểm; ưu tiên tên và tổng điểm thật | Không thay công thức điểm, không hiện % |
| Voice mic | Huy hiệu mic tắt được tạo/gỡ tại chỗ theo `mic===false`; aria trạng thái mic không xác định không bị nói là bật | Không tạo sự kiện đang nói giả, không rerender chat |
| Viền đang nói | Hiệu ứng xanh dịu chỉ gắn `.pk-host-speaking` khi nhận sự kiện audio thực; tắt khi người dùng chọn giảm chuyển động | Không phát âm thanh hoặc video mô phỏng |
| Điều khiển | Nút Viết lời cổ vũ là link chữ, có vùng tương tác/focus; hàng dưới giữ 4 tác vụ | Không thêm nút trùng |
| Mobile | Đồng bộ nền, đường viền và nhịp khoảng trắng Voice | Chưa build iOS/Android thật |

## Kết quả kiểm tra

| Công việc | Kết quả | Công cụ |
| --- | --- | --- |
| Node tests | **209/209 đạt** | `npm test` |
| Cú pháp web/backend | **Đạt** | `npm run check:web` |
| Voice responsive (320×740, 360×780, 390×844, 430×932; sáng/tối) | **8/8 đạt** | Chromium + Playwright |
| Voice mic tắt → bật → đang nói → tắt; giữ bản nháp chat | **Đạt** | Chromium, fixture gắn trạng thái chỉ trong bài kiểm thử |
| Giảm chuyển động | **Đạt** | Chromium `reduced_motion='reduce'` |
| HTML xuất độc lập, kết quả PK Voice/Cam ở sáng/tối | **4/4 đạt** | Chromium nạp đúng HTML xuất |
| React Native parse cú pháp | **12/12 tệp, 0 lỗi** | TypeScript AST parser |
| ZIP | Kiểm tra CRC và tổng số mục | Python `zipfile` |

Kiểm tra giao diện dựa trên **nội dung thật của mã nguồn v0.8.7**, không phải hình dựng sẵn. Dữ liệu mock WebRTC/mic chỉ có trong fixture Playwright. `tests/browser_voice_lux_v087.py` và `tests/browser_standalone_v087.py` có thể chạy lại trong môi trường có Chromium/Playwright. Ảnh tại `docs/qa-v087/`.

## Giới hạn chưa nghiệm thu

- Chưa xác minh truyền video/audio giữa **hai phòng PK khác nhau** hoặc TURN/WebRTC trong mạng di động thực tế.
- Chưa có hệ thống quà/coin thanh toán thật; điểm demo không đại diện giao dịch.
- Chưa build ứng dụng React Native hoặc kiểm tra iPhone/Android thật; phân tích cú pháp **không** thay thế typecheck/build.
- Chưa có thống kê hiệu năng thực (FPS, mức tiêu thụ RAM/pin).

## Cách chạy

Tại thư mục gốc, chạy `npm start`, truy cập `http://localhost:8787`. Vào Live → Voice hoặc Cam → mở PK → xem bản minh họa. Tệp `TUTTT_V0_8_7_PREVIEW.html` bên cạnh ZIP được xuất từ toàn bộ HTML/CSS/JS và logo nhúng trong mã (không cần server để thử giao diện). Mọi số liệu điểm trong bản độc lập chỉ là minh họa offline.
