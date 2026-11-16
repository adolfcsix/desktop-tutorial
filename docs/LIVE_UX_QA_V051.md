# Túttt v0.5.1 — Báo cáo nghiệm thu Live UI/UX và quản trị
Ngày: 11/11/2026. Phạm vi: mã nguồn v0.5.1 phát triển từ v0.5.0; giao diện web prototype, màn hình React Native, API phòng trên Node.js. Đây **không phải nghiệm thu production**.

## 1. Nguyên tắc và nhận diện
- Logo đã duyệt (ống nghe điện thoại làm thanh ngang chữ T) giữ nguyên ở `brand/approved/tuttt-approved-master.png`; tài sản đã cắt khoảng trống chỉ phục vụ render.
- Giao diện Warm Ivory (#F4EAE0) và Espresso Night (#1F1819) dùng màu đỏ-đất sét/đỏ san hô, chữ dễ đọc; không tạo hình logo khác.
- Các tab dùng tên thông dụng: Khám phá, Live, Chat, Cộng đồng, Cá nhân.

## 2. Các luồng đã thực hiện
| Luồng | Kết quả trong bản thử nghiệm |
|---|---|
| Chọn phòng Voice/Cam | Có UI và API tạo phòng thật (server demo) |
| Live Cam tối đa 6 vị trí | Backend thực thi giới hạn; ghế host được giữ khi mất kết nối |
| Chat / Thành viên / Quản lý | UI web/native phân tab, màn hình giảm cuộn thừa |
| Host duyệt người lên cam | API logic đã test; UI mock đã kiểm tra thao tác |
| Host phong phó, thu hồi | Có kiểm tra quyền server; web sheet xác nhận, mobile Alert xác nhận |
| Phó kick/ban/khóa chat listener | Có API + kiểm tra phân quyền; không thể xử lý host hoặc phó khác |
| Rời phòng | UI có bước xác nhận, chống bấm nhầm |
| Lưu log quản trị | Backend JSON demo ghi actor/target/action/thời gian, giới hạn 2.000 dòng |
| Thu hồi track/camera thật qua LiveKit | Chưa nghiệm thu trên thiết bị thật |
| Đăng nhập chính thức, PostgreSQL, room state nhiều process | Chưa có |

## 3. Kết quả kiểm thử có thể tái chạy
- `npm test`: **42/42 đạt**, 0 fail. Bao gồm logic giới hạn 6 cam, host seat, phân quyền, mute-chat, kick/ban, event, audit và static assets.
- `npm run check:web`: đạt kiểm tra cú pháp JS.
- React Native: **8/8 TS/TSX** thông qua transpilation syntax diagnostics; không thay thế `tsc --noEmit`, Metro bundling hoặc native build.
- `python tests/browser_qa_v051.py`: 320 × 740, 390 × 844, 430 × 932, 6 ô cam; không có tràn ngang/pageerror, tab Thành viên và hội thoại xác nhận Rời.
- `python tests/moderator_ui_qa_v051.py`: môi trường roster **mock**, kiểm tra duyệt ghế, cancel việc bổ nhiệm không thay đổi role, xác nhận mới áp dụng thay đổi.
- `python tests/voice_ui_qa_v051.py`: Voice web preview 4 ghế P2P, thao tác rời hiện hộp thoại, không lỗi JS quan sát được.

## 4. Bằng chứng ảnh
- `qa-v051/cam-light-390.png` và `qa-v051/cam-dark-390.png`: Live Cam trên Chromium với 2 theme.
- `qa-v051/audience-light-390.png`: tab Thành viên.
- `qa-v051/moderation-light-390.png`: UI quản trị qua roster mock, không khẳng định có khách thật.
- `qa-v051/voice-light-390.png`: Voice web legacy.
- `qa-v051/browser-results.json`: số đo viewport và kết quả tự động.

## 5. Các bước nghiệm thu thực tế chưa hoàn tất
1. Cài `npm install` cho `server` và `mobile` với bộ phụ thuộc tương thích; kiểm tra `expo-doctor`, TypeScript, build development iOS/Android.
2. Cấu hình LiveKit SFU/TURN HTTPS phù hợp; token được cấp phía server, không hardcode secret trong mobile.
3. Trên hai điện thoại khác nhau: chủ phòng + khách cùng vào phòng; kiểm tra mic 2 chiều, loa ngoài/tai nghe Bluetooth, delay và chống vọng.
4. Bật camera lần lượt 1 tới 6; kiểm tra 7th không được duyệt, thay đổi camera trước/sau, mất quyền camera, khóa điện thoại, quay lại khi rớt mạng.
5. Dùng tài khoản thứ ba có vai trò phó phòng; kiểm tra không thể kick host/phó khác, mute chat người dùng bị cấm, reconnect sau kick/ban.
6. Accessibility: VoiceOver/TalkBack, Dynamic Type, bàn phím và giảm chuyển động. Nghiệm thu thực tế tại 320/390/430 và tablet.
7. Thay kho JSON và phiên khách bằng PostgreSQL/session production trước khi phát hành.

## 6. Giới hạn rõ ràng
Không có bằng chứng truyền hình/âm thanh thực qua 2 thiết bị từ môi trường hiện tại. Web Cam là giao diện preview, không phát video thật; React Native có mã tích hợp SDK nhưng chưa build và nghiệm thu. UI manager mock chỉ xác nhận hành trình nút và state, không chứng minh bảo mật SFU. Không đánh dấu v0.5.1 là phát hành công khai.
