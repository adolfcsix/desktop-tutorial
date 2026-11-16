# Túttt v0.6.7 — PK Result Flow QA

## Thay đổi

- Giữ giao diện PK sân khấu chung và màu Mocha Ivory/Espresso Night của v0.6.6.
- Web: kết quả thắng/thua/hòa nằm ngay trên sân khấu, không mở một card nổi che chat.
- Demo offline: đồng hồ 03:00 đếm theo thời gian từ lúc mở demo; nút **Kết quả** kết thúc trận thử; **PK lại (minh họa)** và **Về phòng Live** có tác dụng thực. Kết quả được ghi rõ là minh họa.
- Backend connected: chỉ hiển thị màn kết quả khi snapshot `recent` có bản ghi `status=finished` với đúng `id` của trận vừa quan sát đang active. Nếu đồng hồ máy khách về 00:00 trước khi backend phản hồi, hiển thị trạng thái chờ xác nhận, không tự suy diễn người thắng.
- Native React Native: màn kết quả từ snapshot đã xác nhận, nút đóng, nhãn vào trận 3 giây.
- Bỏ nút PK launcher trùng khi PK/kết quả đang hiện.

## Nghiệm thu

- `npm test`: 137/137 (Node), gồm 6 kiểm thử v0.6.7.
- `npm run check:web`: đạt.
- Parse TypeScript/TSX: 11 tệp, không có lỗi cú pháp (không thay thế typecheck).
- Chromium 390×844: 4/4 tình huống Cam/Voice × Light/Dark — không phát hiện JS exception, tràn ngang; kiểm tra 03:00→02:58, 1.240→1.280 sau khi cổ vũ demo, kết quả, PK lại và rời màn kết quả.
- Ảnh bằng chứng: `docs/qa-v067/pk-result-{cam,voice}-{light,dark}-390.png`.

## Giới hạn chưa nghiệm thu

- Chưa build chạy iOS/Android hoặc kiểm thử LiveKit thật trên hai thiết bị.
- Chưa ghép video/âm thanh giữa hai host trong PK.
- Chưa có thanh toán/quà tặng/coin thật: PK dùng lượt cổ vũ miễn phí.
- Không có khẳng định PK media production-ready.
