# Túttt v0.7.3 — Ivory Unification & Action Rail QA

## Phạm vi
- Từ v0.7.2; giữ logo graffiti đã duyệt, bố cục hai camera dọc, Night và logic PK.
- Light Cam: phối nền liên tục Mocha Ivory ở thanh tiêu đề, sân khấu chờ camera, chat, ô nhập và thanh điều khiển. Vùng camera sử dụng sắc độ đậm hơn có chủ đích để giữ tương phản cho phụ đề/video.
- **Tiếp sức** thay thế vị trí **Thả tim** ở hàng điều khiển Cam khi PK diễn ra, không bị ghim nổi lên luồng video. Trong PK Voice hành vi cũ vẫn giữ nguyên để tránh mất chức năng.
- **Kết quả** của PK minh họa chuyển vào hàng trạng thái PK, có aria-label, chữ rút gọn KQ ở màn 320 px. Kết quả PK thật vẫn do server quyết định.

## Nghiệm thu
- `npm test`: **170/170 PASS**, bao gồm 5 test hồi quy v0.7.3.
- `npm run check:web`: PASS.
- Chromium: 320/390/430 px × Voice/Cam × Light/Dark: **12 kịch bản thao tác đạt**, kiểm tra cổ vũ, đồng hồ, màn kết quả, PK lại, trở về Live và tràn ngang.
- Kiểm tra CSS giảm chuyển động: PASS trên môi trường Chromium ở 320 và 390 px. Nhóm 430 px chạy tách để tránh ngắt khi đóng trình duyệt; đã đạt 4/4 thao tác.
- HTML preview độc lập: các CSS/JS được nhúng vào một tệp; logo giữ nguyên từ asset có sẵn.
- Chỉ kiểm tra cú pháp TS/TSX; **chưa build và đo hiệu năng trên iOS/Android thật**.

## Giới hạn
Chưa có ghép media liên phòng, quà tặng trả phí và camera di động thật được nghiệm thu. Camera xem trước web cần sự đồng ý, chỉ dùng trong thiết bị. Bản PK minh họa sử dụng dữ liệu giả có nhãn; không coi là lượt tặng quà thật.
