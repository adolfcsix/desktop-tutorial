# Túttt v0.6.3 — PK Color System

## Nguyên tắc thiết kế
- **Logo gốc đã duyệt giữ nguyên**, không đổi hình vẽ.
- Light: Warm Ivory, nền ngoài kem; sân khấu PK espresso. Dark: Espresso Night, sân khấu PK nâng nhẹ so với nền ngoài.
- Phe A dùng đỏ san hô, phe B dùng vàng champagne. Cả hai là màu ấm từ bản sắc logo; không gán màu đội theo trạng thái thắng/thua.
- Xanh ngọc chỉ dùng cho **người đang nói** trên mic, không còn là màu đội PK.
- Điểm, đường chia, avatar, thanh tỷ lệ, nút cổ vũ và kết quả PK đều lấy cùng semantic token.
- Tên phe A/B và trạng thái dẫn trước vẫn ở dạng chữ, không phụ thuộc chỉ vào màu.

## Nguồn màu duy nhất
- `brand/pk-color-system.json`: bảng màu canonical cho hai chế độ.
- `scripts/build-pk-colors.js`: tạo `prototype/pk-colors.generated.css` và `mobile/src/theme/pkColors.ts` từ JSON.
- Chạy `node scripts/build-pk-colors.js --check` trước khi bàn giao để chống sai lệch giữa web/native.

## Nghiệm thu phải thực hiện
- Chromium: 320/390/430px, sáng/tối, phòng Voice/Cam, trạng thái PK và thanh chat nổi.
- Kiểm tra tương phản chữ chính >=4.5:1, kiểm tra màu phe với sân khấu và nhãn text.
- Accessibility: không dùng màu để biểu thị duy nhất thắng/thua, keyboard focus hiển thị rõ.
- iOS/Android: chưa có build native và chưa có âm thanh/video PK giữa hai phòng.
- Demo offline: số điểm và avatar minh họa, không phải coin hay quà thật.
