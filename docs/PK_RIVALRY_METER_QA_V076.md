# Túttt v0.7.6 — Kiểm tra thanh điểm PK

Ngày 12/11/2026. Đi từ v0.7.5 và không thay đổi backend/API.

## Vấn đề thực tế

- Thanh tiến độ cũ cao 7 px, nền màu trơn, vạch chia tối nhỏ; khó tạo cảm giác đối kháng và tỷ lệ 2 phe không hiển thị riêng.
- PK Cam để vạch chia gần sát nhãn phía dưới; nếu tăng chiều cao thanh mà không bố trí lại sẽ đè chữ.

## Thiết kế áp dụng

- Thanh 16 px Voice, 14 px Cam (13–14 px trên màn hình hẹp). Màu scarlet bên trái và champagne bên phải có đổ sắc nhẹ, vạch chia dịu, điểm nối hình thoi hai viền; không neon hay vòng lặp nhấp nháy.
- Voice hiện A%/B% và khoảng cách điểm; Cam giữ thanh điểm thuần với các tên/điểm đã có trên video. Tên và điểm Cam được đặt thấp hơn để tách hẳn khỏi marker.
- Bộ tính phần trăm và điểm dẫn chỉ dựa vào `TutttPKVisual.evaluate`. Cập nhật số điểm từ DOM và aria đồng bộ, không remount sân khấu; clamping marker 3–97% chỉ để tránh tràn viền khi đội có 0/100%, tỷ lệ thực vẫn chính xác.
- Native chia sẻ renderer `scoreRail(compact)` cho Voice/Cam; tiến độ cập nhật theo snapshot đã có, không làm lại entrance animation từng giây. Đây là thay đổi mã nguồn TSX, **chưa xác nhận build native**.

## Kết quả

- `npm test`: 183/183 bài test PASS, gồm 5 test riêng cho v0.7.6.
- `npm run check:web`: PASS.
- `python tests/browser_room_v075.py`: 16/16 PASS (hồi quy nút, composer, chat, modal, không tràn ngang).
- `python tests/browser_meter_v076.py`: 17/17 PASS (320×740, 390×844, 430×932, 768×1024; Voice/Cam; Light/Dark; score update, aria, không che nhãn, remount và reduced motion).
- Hình `docs/qa-v076/*initial-390.png` minh họa điểm 1240/980; các ảnh khác chụp sau một lần cổ vũ thử, 1280/980.

## Giới hạn

Web đã qua kiểm tra Chromium trong môi trường mô phỏng, chưa phải đo hiệu năng/khả năng đọc trên mọi điện thoại thật. Chưa build native, chưa ghép media hai phòng và không khẳng định thanh điểm ứng với giao dịch vật phẩm/coin thật.
