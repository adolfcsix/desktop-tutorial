# QA Túttt v0.7.9 — White Heart & PK Clarity

Ngày: 12/11/2026. Nền: v0.7.8; phong cách PK Voice/Cam không bị đổi mới ngoài phạm vi tương tác trái tim.

## Hành vi

1. **Trước khi chạm:** chỉ có trái tim vector nét trắng, hoàn toàn không có nền, viền hoặc đổ bóng dạng button. Vùng nhấn >=44 px, hỗ trợ focus-visible; label bằng mực nền Ivory/Espresso.
2. **Khi tiếp sức:** glyph đầy trắng trong ~540 ms và một tim trắng bay trong ~700 ms. Không có coin, không tự cộng điểm khi chỉ chạy hiệu ứng.
3. **Điểm mẫu:** demo 1.240 + 40 = 1.280, tỷ lệ 56% → 57%, cập nhật trong DOM hiện tại. Real API chỉ tính điểm máy chủ xác nhận. Giữ aria-valuenow/aria-label cho meter.
4. **PK Voice:** không thêm menu chat/thành viên cố định; không còn nút Thả tim trùng ở toolbar, chỉ một Tiếp sức. PK Cam có đúng một Tiếp sức ở thanh dưới.
5. **Motion accessibility:** trong `prefers-reduced-motion: reduce`, không tạo tim bay; điểm vẫn cập nhật. Trên native không xác nhận runtime do chưa build thiết bị.

## Kết quả

- `npm test`: **192/192** PASS.
- `npm run check:web`: PASS.
- `python tests/browser_room_v075.py`: **16/16** PASS (320/390/430/768 px × light/dark × Cam/Voice).
- `python tests/browser_heart_v079.py`: **13/13** PASS (320/390/430 × light/dark × Cam/Voice + reduced motion).
- Kiểm tra TypeScript parser: 12 TS/TSX, 0 syntax diagnostics. Chưa kiểm tra type-check đầy đủ của React Native do không cài dependency và chưa build native trên điện thoại.

## Tệp liên quan

- `prototype/pk-heart-v079.css`: quy chuẩn tim trắng, focus, chuyển động, responsive, ưu tiên CSS cuối cùng.
- `prototype/app.js`: một vector tim, hiệu ứng hạn chế, tránh render lại sân khấu, ẩn nút trùng.
- `mobile/src/components/PKDuelBoard.tsx`, `mobile/src/screens/Screens.tsx`: đồng bộ tương tác Native.
- Ảnh `docs/qa-v079/*-active.png` ghi lại sau bấm Tiếp sức; `docs/qa-v075` có ảnh bố cục tĩnh của bản v0.7.9.

## Giới hạn

Các ảnh demo không phải phát trực tiếp liên phòng, không xác nhận âm thanh/video PK đối thủ. Không tuyên bố nghiệm thu iOS/Android thật.
