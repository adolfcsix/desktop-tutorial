# Túttt v0.6.3 — Nghiệm thu màu PK (web/native)

## Thay đổi thực hiện
- Sửa trực tiếp màu sân khấu PK v0.6.2, không làm lại logo hoặc giao diện Live thường.
- Loại bỏ bảng màu đối thủ xanh ngọc: đội A **đỏ san hô**, đội B **vàng champagne**, trên nền espresso chung.
- Chuẩn hóa màu avatar, vòng avatar, điểm số, thanh tỷ lệ, đồng hồ, nút PK, nút cổ vũ và bảng kết quả.
- Giữ xanh ngọc riêng cho trạng thái *đang nói* / hoạt động microphone, không dùng trong hai phe PK.
- Cập nhật mã React Native để sử dụng đúng hai bộ màu sáng/tối từ nguồn JSON chung với web.
- Giữ nguyên ảnh logo đã được duyệt: SHA-256 của `brand/approved/tuttt-approved-master.png` không đổi so với v0.6.2.

## Nguồn màu
`brand/pk-color-system.json` → `scripts/build-pk-colors.js` → `prototype/pk-colors.generated.css` + `mobile/src/theme/pkColors.ts`.
Chạy `node scripts/build-pk-colors.js --check` để kiểm tra các tệp sinh ra không lệch nguồn.

## Kiểm thử thực hiện trong môi trường hiện tại
- Bộ kiểm thử Node.js: **114/114 bài đạt**.
- `npm run check:web`: đạt.
- TypeScript transpile/parse: 11 tệp `.ts`/`.tsx` được kiểm tra không có lỗi cú pháp (không tương đương typecheck/build native).
- Chromium: **12 kịch bản** = 3 chiều rộng × 2 theme × 2 kiểu Live (Voice/Cam), không lỗi JS hay tràn ngang quan sát được.
- Kiểm tra màu đã tính toán (computed style): giá trị PK cho phe B đúng #E5C49E ở theme sáng và #E8C79F ở theme tối; nền avatar/điểm/thanh tỷ số khác biệt hai phe.
- Kiểm thử tương phản các cặp chữ chính, nhãn đội, avatar, nút PK/cổ vũ: mục tiêu ≥ 4,5:1 (đo bằng công thức độ chói tương đối WCAG).
- HTTP static local: stylesheet mới và trang index trả 200 trên cổng thử riêng.
- Demo offline: tương tác UI nhưng điểm PK là minh họa, không có giao dịch coin.

## Bằng chứng hình ảnh
- `docs/qa-v063/PK_COLOR_COMPARISON.png`: đối chiếu 4 màn hình Cam/Voice sáng/tối.
- `docs/qa-v063/pk-cam-light-390.png`
- `docs/qa-v063/pk-cam-dark-390.png`
- `docs/qa-v063/pk-voice-light-390.png`
- `docs/qa-v063/pk-voice-dark-390.png`
- `docs/qa-v063/browser-results.json`: màu computed và trạng thái từng kịch bản.

## Chưa nghiệm thu
- Màu sắc trên màn hình iOS/Android thật và cài đặt trợ năng hệ thống (Dynamic Type, TalkBack, VoiceOver).
- Build mobile native; truyền âm thanh/video PK hai phòng bằng LiveKit thực tế.
- Tải và hiệu năng khi nhiều camera, hiệu ứng quà thật và xếp hạng supporter theo giao dịch.

## Quy tắc không hồi quy
- Không thêm màu đội mới nếu không có trong JSON và kiểm tra tương phản.
- Không áp màu xanh dành cho speaking/mic vào bảng đối đầu PK.
- Không coi thay màu CSS là nghiệm thu hệ thống PK thực tế.
