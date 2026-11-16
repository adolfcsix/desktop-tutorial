# Túttt v0.6.8 — PK Live Motion & Youthful Flow

Ngày: 11/11/2026. Nâng cấp từ v0.6.7; tập trung cải thiện giao diện PK hiện còn tĩnh, thiếu nhịp và thiếu điểm nhấn thị giác. Không sửa luật PK hay khả năng media.

## Thay đổi đã triển khai

1. **Sân khấu PK Cam/Voice**: nhãn trạng thái gọn, đồng hồ không chen chữ, hai phe chung nền Mocha Ivory/Espresso Night. Hai avatar monogram nổi hơn, hiệu ứng xuất hiện ngắn và các chi tiết trang trí nhẹ (không giả trạng thái mic/speaking). Hai màu phe không thay đổi.
2. **Tỷ số/điểm**: cỡ chữ và tỷ lệ thị giác nhấn hơn; thanh tỷ số chuyển động khi giá trị thực sự thay đổi. Đồng hồ chuyển sang cảnh báo nhẹ trong 10 giây cuối nhưng không suy diễn kết quả.
3. **Cổ vũ demo**: bấm cổ vũ tăng 40 điểm minh họa và xuất hiện '+40 ♥' ngắn; giữ nguyên giới hạn phí và kiểm soát điểm trong backend khi kết nối. Không tạo coin/giao dịch.
4. **Kết thúc PK**: giao diện thay bảng thông báo bằng mảng typography, dấu sao, avatar hai host, tỷ số và hai CTA rõ. Thông báo 'Thắng rồi!', 'Hòa rồi!' hoặc 'Hẹn trận sau nhé!' theo kết quả; chỉ công bố thực khi server xác nhận đúng trận, giữ bản demo gắn nhãn rõ.
5. **Chat khởi đầu**: khi phòng PK chưa có tin nhắn, 'Viết lời cổ vũ' chỉ điền gợi ý vào ô chat, không tự gửi. Sau đó người dùng có thể sửa và gửi hoặc xóa.
6. **Mobile React Native**: bố cục màn đấu và kết quả cập nhật tương ứng; hiệu ứng nhập dùng Animated built-in, và dùng AccessibilityInfo.isReduceMotionEnabled() để bỏ chuyển động nếu hệ thống yêu cầu. Không thêm dependency.
7. **Thiết bị 320 px**: phiên bản Voice kết quả được nén bố cục vừa đủ để hai CTA không bị chat chặn, với chiều cao vùng bấm vẫn tối thiểu 44 px.

## Kiểm thử

- `npm test`: 142/142 bài đạt, bao gồm 5 bài v0.6.8.
- `npm run check:web`: đạt.
- Browser Chromium: 12/12 kịch bản tương tác, tại 320×740, 390×844, 430×932 × Voice/Cam × light/dark. Kiểm tra: không tràn ngang, hiển thị stage và chat, không lỗi JavaScript, dự thảo chat không mất khi cổ vũ, +40 demo, kết quả, PK lại, về phòng Live.
- Chromium `prefers-reduced-motion:reduce`: kiểm tra animation scene = none.
- TypeScript/TSX mobile: phân tích cú pháp bằng TypeScript transpile, không phải typecheck/build ứng dụng.
- Server thực qua HTTP 200 cho `/` và `/pk-v068.css`.
- Hình: `docs/qa-v068/pk-active-*` và `pk-result-*`; bộ so sánh `PK_LIVE_MOTION_MATRIX.png`. Kết quả đầy đủ `results-320.json`, `results-390.json`, `results-430.json`.

## Giới hạn chưa nghiệm thu

- Chưa build Expo iOS/Android, chưa thử điều khiển mic/camera/LiveKit trên 2 thiết bị.
- Chưa truyền hình ảnh/âm thanh qua hai phòng PK. Avatar chữ trong demo là placeholder, không phải video.
- Chưa tích hợp ví, coin hay quà tặng thật; điểm demo được ghi nhãn minh họa.
- Motion chỉ chuyển cảnh/nhấn thao tác; không diễn tả microphone đang nói nếu không có track/signal thực.
