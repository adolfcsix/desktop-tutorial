# Túttt v0.7.1 — Hệ nút Live/PK bớt máy móc

Phạm vi: PK Cam, PK Voice, màn kết quả, chat, các nút điều khiển; giữ nguyên palette Mocha Ivory/Espresso Night và API/logic cổ vũ.

- Hành động chính **Tiếp sức**: trái tim có nền tách nhẹ, cấu trúc không đối xứng, vùng chạm ≥ 48 px, có nhấn và phản hồi mềm. Nút chỉ thay đổi số điểm khi có sự kiện demo hoặc server xác nhận; không dùng coin giả.
- Thao tác thứ cấp **Xem kết quả**, PK lại: giảm trọng lượng thị giác; các nút kết quả phân biệt rõ hành động chính/phụ.
- Công cụ mic/cam/thoát: trạng thái bật/tắt rõ hơn; vùng chạm phù hợp; màu lấy từ token PK.
- Nút quản lý/khán giả: icon-chip thay vì ô vuông đồng dạng.
- `prefers-reduced-motion` tắt chuyển động không thiết yếu, `focus-visible` vẫn rõ; mobile dùng phản hồi press in-place, không thêm module Haptics.
- Không thay luật PK, truyền media, dữ liệu ví/quà tặng. Native chưa build trên thiết bị.

Kiểm tra: `npm test`, `npm run check:web`, `node scripts/build-pk-colors.js --check`, screenshot Chromium + test thao tác.
