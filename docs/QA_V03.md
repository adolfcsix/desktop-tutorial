# Túttt v0.3 — Báo cáo kiểm thử (11/11/2026)

## Đã kiểm tra trong môi trường tạo gói

- Node.js 22.x; `npm test` **7/7 đạt**:
  1. Health, static whitelist.
  2. Phiên người dùng độc lập, phòng, chat, báo cáo, chặn, JSON persistence.
  3. SSE cập nhật phòng.
  4. Phòng voice chỉ cho thành viên, 6 người, 4 ghế; host luôn có ghế, quyền mic.
  5. SSE định tuyến tín hiệu WebRTC tới người nhận đã xác thực.
  6. Validation SDP/ICE, thu hồi quyền khi rời voice/phòng.
  7. Chỉ phục vụ source client voice.js, không lộ backend source.
- `npm run check:web`: tất cả JS frontend/server chạy qua `node --check`.

## Chưa nghiệm thu / giới hạn

- **Chưa kiểm thử thành công media WebRTC end-to-end bằng hai browser**. Chromium tự động không truy cập được `http://127.0.0.1` trong môi trường này (`ERR_BLOCKED_BY_ADMINISTRATOR`); một nỗ lực render `about:blank` cũng bị giới hạn. Vì vậy không có bằng chứng audio thật hoặc ảnh chụp v0.3 chạy server.
- Chưa kiểm thử smartphone Android/iOS; chưa cài Expo SDK (npm registry lỗi `EAI_AGAIN`), chưa `typecheck`/build native.
- Chưa chứng minh voice hoạt động qua NAT, LAN HTTPS và mạng di động; chưa tích hợp TURN, SFU.
- Chưa có pentest, CSRF robust, moderation hoàn chỉnh, quy trình dữ liệu cá nhân, account recovery, chống spam production, bản build App Store/Google Play.

## Checklist thử bằng tay trên PC và điện thoại

- [ ] Mở hai browser profile khác nhau, tạo phòng ở profile 1, vào phòng profile 2.
- [ ] Cả hai hiển thị `Voice đã vào phòng`, thấy roster đúng 2 thành viên.
- [ ] Profile 1 bật mic, profile 2 nghe thấy tiếng thật (tai nghe để tránh vọng).
- [ ] Profile 2 lên ghế, bật mic, profile 1 nghe thấy; kiểm tra âm lượng/độ trễ.
- [ ] Tắt mic làm âm thanh dừng, browser track có trạng thái stopped.
- [ ] Host không bị tự thu hồi ghế; ghế tối đa 4; voice tối đa 6.
- [ ] Rời phòng dừng mic và đóng peer connection; reconnect sau mất mạng.
- [ ] Thử không cấp quyền mic, HTTP LAN, HTTPS LAN hợp lệ, Safari iOS/Chrome Android.
- [ ] Kiểm tra network yếu, speaker/headphones/Bluetooth, app background và cuộc gọi hệ thống.
- [ ] Kiểm tra accessibility, contrast, thao tác bàn phím, dark/light, tiếng Việt và layout 320–430px.

**Nghiệm thu hiện tại: backend và signalling được xác nhận; truyền âm thanh chưa được nghiệm thu.**
