# Túttt v0.5.6 — Floating Live Chat & Audience Sheet

## Thiết kế đã chốt
- Live Cam không còn thanh tab `Chat / Thành viên / Quản lý`.
- Nút đếm người xem (ví dụ **84** trong dữ liệu minh họa) mở danh sách thành viên dạng bottom sheet.
- Chủ/phó phòng có biểu tượng khiên mở công cụ quản lý riêng, không ảnh hưởng chat; quyền được backend xác thực.
- Chat hiển thị thường trực, nền bán trong suốt và từng tin nhắn có bề mặt nhẹ để giữ độ tương phản.
- Tin mới neo về cuối vùng đọc gần thanh nhập. Khu vực chat có cuộn riêng và không che điều khiển mic/camera.
- Không sử dụng nhiều chế độ hiển thị. Ghim một người được giữ lại như thao tác có chủ đích.
- Nút công cụ dưới cùng không còn "Mọi người" trùng với nút đếm; được thay bằng quà tặng (hiện ở mức demo).
- Logo chính thức giữ nguyên; hai theme Warm Ivory và Espresso Night dùng cùng cấu trúc.
- Trên React Native, danh sách và quản trị chuyển thành Modal bottom sheet; chat luôn hiện và tin nhắn dùng nền alpha nhẹ.

## Phạm vi kiểm thử
- `npm test`: 72/72 passed gồm 5 bài regression mới về viewer sheet, chat floating, quản trị, React Native và CSS route.
- `npm run check:web`: passed.
- TypeScript syntax transpile: 7 files checked; không thay thế cho full `tsc --noEmit`.
- Chromium: 320×740, 390×844, 430×932; mở/đóng danh sách, gửi tin, xem chat, kiểm tra không tràn ngang, đọc chat không bị che bởi thanh điều khiển.
- Ảnh và dữ liệu trong `docs/qa-v056/`.

## Giới hạn
- Chưa build/kiểm thử React Native trên thiết bị iOS/Android thật.
- Chưa xác minh LiveKit SFU truyền hình/tiếng thực giữa các thiết bị.
- Top 3 trong offline preview vẫn minh họa; không có hệ thống giao dịch coin/quà tặng thật.
- Số người xem trên offline preview là dữ liệu giả lập; sheet có nhãn minh họa. Ứng dụng kết nối backend sẽ hiển thị thành viên theo roster trả về.
- Chưa đo độ tương phản đầy đủ, VoiceOver/TalkBack, bàn phím di động và hiệu năng khi có hàng nghìn tin nhắn.
