# Túttt — Bàn giao mã nguồn GitHub

Mã nguồn được đặt trực tiếp tại gốc repository; mở thư mục có `package.json`, chạy `npm ci` rồi `npm start` và truy cập http://localhost:8787. Hướng dẫn đầy đủ nằm ở README.

## Cải tiến trong lượt này

- Khi Voice không được trình duyệt hỗ trợ hoặc kết nối Voice bị lỗi, tiếp tục tải lịch sử chat phòng thay vì dừng toàn bộ luồng vào phòng.
- Chặn gửi biểu mẫu lặp trong lúc yêu cầu trước còn đang xử lý; áp dụng tạo phòng, hồ sơ, báo cáo và tin nhắn. Đây là chặn thao tác đồng thời ở giao diện, không bảo đảm chống trùng sau khi tải lại trang hoặc gửi lại yêu cầu đã hết hạn.
- Yêu cầu API web có thời hạn chờ 15 giây, hủy yêu cầu đang treo và trả thông báo thử lại. Hủy phía trình duyệt không hủy chắc chắn thao tác đã được máy chủ thực hiện.
- Thêm GitHub Actions để chạy kiểm thử, kiểm tra cú pháp và báo cáo cấu hình native; dependency được cài từ lockfile.
- Giữ giao diện, logo, chủ đề và bố cục Live đã chốt; không bổ sung điều khiển minh họa.

## Nghiệm thu local

- 468/468 kiểm thử Node.js/API/DOM đạt.
- Kiểm tra tích hợp tải HTML/script qua backend thật, lưu hồ sơ, tạo phòng, tải lịch sử khi không có Voice và gửi tin nhắn tiếng Việt đạt. Hai submit liên tiếp khi yêu cầu đang chờ chỉ tạo một tin nhắn.
- Kiểm thử request bị treo xác nhận hủy và không tạo phiên khách mới.
- `npm run check:web` đạt.
- `npm run qa:release -- --fast`: 4/4 nhóm đạt.

Các bài kiểm thử giao diện tích hợp chạy bằng DOM runtime, không xác nhận bố cục Chromium. Môi trường hiện tại chặn khởi động Chromium; kiểm tra SFU thật, hai thiết bị, APK/IPA chưa được thực hiện. Native dependency còn BLOCKED và cấu hình thiết bị NEEDS_CONFIGURATION. Chat riêng/cộng đồng và các phần minh họa chưa trở thành tính năng backend đầy đủ.

Workflow trên GitHub cần được xem theo commit thực tế sau khi push; kết quả local không thay thế trạng thái CI trên GitHub.
