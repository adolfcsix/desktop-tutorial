# Túttt v0.7.1 — Nghiệm thu hệ nút Live/PK

## Mục tiêu

Giảm cảm giác giao diện bị máy móc bằng cách tạo cấp bậc tương tác (hành động chính, chip điều khiển, thao tác phụ) trên sân khấu PK, khung chat và màn kết quả. Không đổi palette Mocha Ivory/Espresso Night, nhận diện logo, luật PK và quyền riêng tư mic/camera.

## Đã triển khai

- Web: lớp `prototype/pk-v071.css` kết hợp thay đổi markup `prototype/app.js`. **Tiếp sức** có icon tim nằm trong vòng tròn nhỏ, dáng pill không đối xứng, phản hồi nhấn và focus rõ. Số điểm demo vẫn chỉ thay đổi qua hành động thử, backend thực chỉ cập nhật khi nhận dữ liệu.
- Nút **Xem kết quả** là thao tác chữ có gạch nhấn, khác hẳn nút cổ vũ. Nút **PK lại** và **Về Live** được phân biệt thứ bậc; có nhãn trợ năng đầy đủ cho “PK lại (minh họa)” và “Về phòng Live”.
- Chip menu, người xem, mic/cam/thoát và nút gửi chat được chuẩn hóa hình khối, vùng chạm và trạng thái. Giữ nguyên hành vi thao tác cũ.
- React Native: cập nhật `PKPanel`, `PKDuelBoard`, `PKResultBoard` và dãy điều khiển `Screens` theo cùng cấp bậc thị giác. Đổi hình thái và phản hồi nhấn; không thêm SDK/haptics.

## Xác minh

- Node.js: **160/160** bài kiểm thử tự động đạt. (Bốn kiểm thử phiên bản cũ được cập nhật để chấp nhận phiên bản bản vá mới; các kiểm tra hành vi được giữ.)
- `npm run check:web`: đạt.
- `node scripts/build-pk-colors.js --check`: đạt, không đổi token màu.
- Kiểm thử Chromium: **12 trường hợp** 320/390/430 × Cam/Voice × sáng/tối. Các trạng thái PK, tiếp sức, PK lại, về Live, không tràn ngang được thao tác qua trình duyệt. Các lệnh chạy bị chia hai lượt vì vòng duyệt dài; không tuyên bố đo FPS.
- `prefers-reduced-motion`: đã sửa độ ưu tiên rule của nút Tiếp sức; trình duyệt xác nhận `transitionDuration: 0s`.
- **12 tệp TS/TSX** kiểm tra cú pháp qua TypeScript transpilation. Chưa chạy full `tsc --noEmit`, chưa build IPA/APK hoặc test mobile trên máy thật.
- Camera/âm thanh giữa hai phòng PK **chưa có bridge thật**; bản offline vẫn dùng avatar và điểm minh họa. Không có thanh toán hay quà/coin thật.

## Tệp nghiệm thu

- `docs/qa-v071/pk-buttons-cam-light-390.png`
- `docs/qa-v071/pk-buttons-voice-dark-390.png`
- `docs/qa-v071/pk-buttons-result-cam-light-390.png`
- `docs/qa-v071/PK_BUTTON_BEFORE_AFTER.png`
- `tests/browser_buttons_v071.py` và `tests/pk_touch_v071.test.js`
