# Túttt — Rà soát chạy local

## Phạm vi

Ổn định bản mã nguồn hiện tại để chạy web/backend local. Giữ nguyên bố cục Live tối giản, logo, hai chủ đề và cơ chế phân quyền. Không thêm nút hoặc tính năng minh họa.

## Các lỗi đã sửa

1. Backend không cho tải `audience-presence.js` dù HTML có tham chiếu, làm ứng dụng không khởi tạo được qua HTTP. Bổ sung tệp vào danh sách được phục vụ. Kiểm thử HTTP mới tái hiện lỗi 404 trước khi sửa và đạt sau khi sửa; kiểm tra mọi tài nguyên trong HTML.
2. Bộ kiểm thử dùng TypeScript nhưng `package.json` gốc chưa khai báo dependency. Bổ sung TypeScript, khóa phiên bản và lockfile; kiểm chứng cài sạch bằng `npm ci`.
3. Mọi lỗi khi đọc phiên khách đều từng dẫn đến tạo phiên mới. Giờ chỉ tạo khi API trả 401; lỗi mạng, 503 và JSON lỗi không ghi đè danh tính khách.
4. Backend từng chuyển từng mảnh request sang chuỗi trước khi nối, có thể làm hỏng ký tự tiếng Việt bị tách giữa hai gói. Giờ đếm byte, nối Buffer rồi giải mã UTF-8; kiểm thử request chia ngay giữa ký tự có dấu và payload quá giới hạn.
5. Luồng tải tệp thiếu xử lý khi tệp mất hoặc lỗi đọc. Giờ kiểm tra tệp trước khi trả thành công và bắt lỗi stream, tránh sự kiện lỗi không được xử lý làm dừng tiến trình.
6. README cũ dài và có nhiều chỉ dẫn lịch sử trùng/lệch nhau. Viết lại hướng dẫn cài/chạy local, dữ liệu, cổng và giới hạn hiện tại; chuyển nguyên bản cũ vào `docs/HISTORY.md`.

## Kết quả

- Cài sạch `npm ci --ignore-scripts --no-audit --no-fund`: đạt.
- `npm test`: 467/467 bài đạt.
- `npm run check:web`: đạt; kiểm tra riêng cú pháp tệp network đã sửa cũng đạt.
- `npm run qa:release -- --fast`: 4/4 nhóm đạt, gồm xuất HTML độc lập.
- Kiểm tra tích hợp DOM qua HTTP thật: HTML và script được tải từ backend; tạo phiên khách, lưu tên/giới thiệu, tạo phòng và gửi tin nhắn vào dữ liệu backend đều đạt, không ghi nhận lỗi JavaScript. Đây là kiểm tra DOM bằng jsdom, không phải kiểm chứng bố cục bằng Chromium.
- Kiểm thử HTTP xác nhận tài nguyên đầy đủ, HEAD hoạt động, phương thức không hỗ trợ trả 405 và không lộ tệp backend/dữ liệu.

## Những phần chưa thể xác nhận

Bộ QA Chromium mở rộng đã được chạy nhưng bị môi trường chặn ngay lúc khởi động trình duyệt (`socket() failed: Operation not permitted`), nên chưa xác nhận giao diện/responsive bằng trình duyệt trong lượt này. Không thay đổi CSS/bố cục.

Native: dependency BLOCKED, cấu hình thiết bị NEEDS_CONFIGURATION, APK/IPA NOT_RUN. Chưa xác nhận LiveKit SFU thực, camera/mic hai điện thoại, Bluetooth hoặc chuyển Wi-Fi/4G. Các bài kiểm thử mock/DOM không thay cho các kiểm chứng này.

Chat riêng/cộng đồng và một số chức năng vẫn là minh họa; xem README. Kết quả đạt ở trên xác nhận phần web/backend được kiểm tra, không phải cam kết toàn bộ sản phẩm đã hoàn thành hay tuyệt đối không có lỗi.
