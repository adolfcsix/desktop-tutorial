# Túttt v0.6.5 · PK Theme Unification — QA

## Mục tiêu

Khắc phục phàn nàn rằng PK nền tối đồng nhất nhưng nền sáng có **kem ở đầu/đuôi và espresso tối ở giữa**, tạo đường cắt khó chịu. Không thay đổi luật PK/điểm; không sử dụng video giả.

## Triển khai

1. `brand/pk-color-system.json`: Light PK chuyển sang **Mocha Ivory `#E9D8CA` + chữ nâu `#30231F`**, phe A coral tối và phe B champagne/nâu đồng. Dark PK vẫn **Espresso Night `#271D1F`**.
2. `scripts/build-pk-colors.js`: tái sinh `prototype/pk-colors.generated.css` và `mobile/src/theme/pkColors.ts` từ một nguồn duy nhất.
3. `prototype/pk-v065.css`: trong lúc PK xuất hiện, **đầu phòng, sân khấu, chat, thanh nhập và controls** dùng cùng `--pk-stage`, cho cả Voice và Cam; không ảnh hưởng phòng Live thường.
4. Tin nhắn dùng nền phủ rất nhẹ, input khác biệt vừa đủ để nhập liệu nhưng không thành một mảng sáng/tối riêng.
5. `mobile/src/components/PKPanel.tsx` báo trạng thái active lên màn Live, để đồng bộ màu phòng và **tạm ẩn sân khấu ghế thường khi PK đang chạy**. Đây là việc sửa bố cục; chưa thay thế việc ghép media của đối thủ.
6. Máy chủ có đường dẫn công khai `/pk-v065.css`; HTML offline đóng gói đầy đủ stylesheet.

## Nghiệm thu

- Node.js: **125/125** kiểm thử đạt, có **6 bài v0.6.5** kiểm tra token, đồng bộ web/native, bề mặt phòng, chat và đường dẫn stylesheet.
- `npm run check:web`: PASS.
- `node scripts/build-pk-colors.js --check`: PASS.
- Parser TypeScript: **10/10 tệp TS/TSX mobile** không lỗi cú pháp; **không phải build/typecheck native hoàn chỉnh**.
- Chromium `tests/browser_pk_v065.py`: **12/12** kịch bản (320×740, 390×844, 430×932 × light/dark × Cam/Voice) PASS: không tràn ngang, không lỗi JavaScript quan sát được, cổ vũ minh họa cập nhật điểm; **màu nền tính toán bằng trình duyệt của tất cả khu vực quan trọng đều giống nhau** khi có PK.
- HTTP GET `/`, `/pk-v065.css`, `/pk-colors.generated.css`, `/app.js`: 200 khi chạy trên cổng 8913.
- Ảnh: `docs/qa-v065/PK_THEME_MATRIX.png` và `PK_LIGHT_BEFORE_AFTER.png`.

## Chưa nghiệm thu

- Âm thanh/video PK giữa hai phòng và stream thực trên thiết bị.
- Build Expo iOS/Android; accessibility cùng bàn phím vật lý/thay font trên thiết bị; hiệu năng 6 camera và sự cố mạng.
- Quà tặng/coin và Top supporter bằng giao dịch thật. Điểm trong demo offline là **điểm minh họa**, không có giao dịch.
