# Túttt v0.4.2 — SSE reliability

- Giới hạn 3 kết nối SSE đồng thời cho mỗi phiên người dùng, bên cạnh giới hạn 100 kết nối toàn server demo.
- Giữ nguyên xác thực trước khi mở SSE; trả 429 nếu vượt giới hạn người dùng.
- Dọn các mục rate-limit hết hạn theo chu kỳ heartbeat để tránh Map tăng không giới hạn khi chạy lâu.
- Thêm bài kiểm thử giới hạn SSE theo người dùng, kiểm tra phiên thứ hai vẫn kết nối được.

## Phạm vi
Đây là hardening cho prototype; không phải hệ thống realtime production. Chưa nghiệm thu âm thanh LiveKit trên thiết bị thật.
