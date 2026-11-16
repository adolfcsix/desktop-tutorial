# Túttt v0.4 · Báo cáo kiểm thử & tiêu chí nghiệm thu

## A. Tự động (đã chạy trong môi trường xây dựng)

- `npm test`: **14/14 PASS** (3 test API v0.2 + 4 test mesh v0.3 + 7 test SFU API v0.4).
- `npm run check:web`: **PASS** (kiểm tra cú pháp JS).
- TS / TSX mobile: **PASS syntactic transpile check**, không tương đương `tsc --noEmit` với dependency typings.
- Test signed JWT HS256 HMAC bằng khóa test, host publish audio-only, audience subscribe-only.
- Test không vào được Live trước khi join; listener không thể tự duyệt; moderator không tự phong quyền; kick cấm tham gia lại; kiểm tra Origin; thất bại remote permission không cấp quyền nội bộ.

## B. Chưa có kết quả nghiệm thu

- [ ] `npm install --prefix server` trên máy có mạng và `npm install` trong `mobile`.
- [ ] `npx expo-doctor` và `npm run typecheck` với SDK đã cài.
- [ ] Build dev client Android thật, rồi iOS thật.
- [ ] LiveKit Cloud/SFU tự host nhận JWT và mở room.
- [ ] Mic Android ↔ Android, Android ↔ iOS, iOS ↔ iOS nghe được, không vọng/echo.
- [ ] On/off microphone trong khi phòng có 3+ người.
- [ ] Audience không có quyền publish; host duyệt audience thành speaker; thu hồi quyền giữa phiên.
- [ ] Moderator không thể bổ nhiệm moderator khác; kick cắt được media SFU, không chỉ xóa roster.
- [ ] Thử mạng yếu, chuyển Wi-Fi/LTE, rớt mạng, reconnect, khóa màn hình, Bluetooth, gián đoạn cuộc gọi.
- [ ] Room participant presence chính xác sau crash và restart backend.
- [ ] Kiểm tra iOS privacy usage message và Android RECORD_AUDIO permission chỉ xin đúng lúc.
- [ ] Test bảo mật với người dùng thật, CSRF, chống spam, chống lạm dụng, tải phòng lớn.

## C. Rủi ro phải xử lý trước public beta

**P0:** Guest sessions; JSON single-process; trạng thái ghế nói nằm RAM, không đối soát SFU webhook; trình duyệt web vẫn dùng mesh; chưa E2E thiết bị; không có moderation 24/7; chưa hoàn thiện cơ chế bảo mật, phụ huynh, xử lý nội dung.

**P1:** Token refresh/reconnect sau thay đổi quyền; lỗi chuyển cuộc gọi Bluetooth; observability/metrics; chống tấn công và sự cố mất kết nối; tài liệu triển khai và backup.

**Kết luận:** Backend/giao thức được kiểm thử, nhưng **không đạt tiêu chí phát hành public beta** cho tới khi các mục P0 và thử âm thanh thực đạt.
