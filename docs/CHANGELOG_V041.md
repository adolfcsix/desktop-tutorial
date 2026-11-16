# Túttt v0.4.1 — Security & Stability

## Thay đổi
- Chặn yêu cầu tạo phiên khách từ Origin khác nguồn; trước đó endpoint /api/session chưa được bảo vệ bởi bộ lọc Origin.
- Áp dụng xác minh Origin thống nhất cho các API ghi dữ liệu.
- Heartbeat SSE 25 giây để giảm nguy cơ kết nối nhàn rỗi bị proxy ngắt.
- Bổ sung ba bài kiểm thử: cross-origin, same-origin, Origin sai định dạng và giới hạn JSON.

## Nghiệm thu
- 17/17 bài kiểm thử backend đạt (`npm test`).
- Chưa nghiệm thu âm thanh thực tế trên hai điện thoại, build native hoặc LiveKit SFU production.
- Bản thử nghiệm không thay thế bảo mật production (CSRF, đăng nhập thực, DB, giám sát, kiểm thử tải).

## Chạy
`npm start` và `npm test`.
