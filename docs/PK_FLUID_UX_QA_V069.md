# Túttt v0.6.9 — PK Fluid Interactions · kiểm thử thực tế

Ngày: 11/11/2026. Từ Túttt v0.6.8; không đổi màu thương hiệu, bố cục căn bản, luật PK, coin hay trạng thái kết nối media.

## Vấn đề đã phát hiện

Ở bản v0.6.8, thao tác cổ vũ demo làm `render()` dựng lại toàn bộ ứng dụng. Điều này tái khởi động animation mở sân khấu và tạo cảm giác khựng, dù giao diện đúng về hình thức. Khi tải snapshot PK thật, logic cũ cũng render lại cả trang mà không cần thiết.

## Thay đổi kỹ thuật

1. Bản web đã thêm `updatePkArenaNumbers()` cập nhật đúng các số điểm trùng lặp, lời dẫn phe và thanh tỷ lệ, `aria-label`, không tháo sân khấu, ô chat hoặc điều khiển khỏi DOM. Hiệu ứng cổ vũ mới được gắn vào sân khấu hiện có và tự xóa.
2. Chuyển động số 410 ms qua `requestAnimationFrame`, dùng ease-out cubic; thanh tỉ lệ 480 ms qua CSS transition; không kéo layout ngoài sân khấu. Khi bấm liên tục, lượt animation trước bị hủy, số bắt đầu từ giá trị đang hiển thị để tránh nhảy.
3. Snapshot backend chỉ dùng đường cập nhật tối thiểu khi cùng ID trận và không mở modal; đổi trận, chuyển sang kết quả hoặc thay đổi trạng thái khác vẫn render đầy đủ. Máy chủ tiếp tục là nơi quyết định thắng/thua, thời gian kết thúc và điểm thật.
4. Style motion v0.6.9 dùng transform/opacity cho đoạn vào sân khấu, rút nhịp xuất hiện để tăng cảm giác tự nhiên. Không có animation trang trí lặp vô hạn và không sử dụng blur mới.
5. React Native dùng `Animated.Value` cho tỷ lệ điểm khi `share` đổi, không khởi chạy lại theo clock; tôn trọng giảm chuyển động của hệ điều hành. `useNativeDriver:false` được dùng có chủ đích cho animation `width`, không phải tuyên bố đã đạt FPS thực tế.

## Kiểm thử

- `npm test`: **148/148 đạt** (6 bài mới cho v0.6.9).
- `npm run check:web`: **đạt**.
- Chromium: **12/12 trường hợp** 320×740/390×844/430×932 × Voice/Cam × light/dark. Kiểm tra thao tác cổ vũ, điểm tăng, kết quả, PK lại, về phòng Live, nháp chat không mất, sân khấu và ô chat giữ nguyên DOM, không tràn ngang, không phát hiện pageerror. Nhóm 320 nằm trong log test hoàn thành trước một lệnh quá thời gian, hai nhóm 390/430 có kết quả PASS riêng.
- `prefers-reduced-motion:reduce`: kiểm tra đoạn vào sân khấu không animate và điểm đổi tức thì.
- Mobile: transpile-only **11 tệp TS/TSX**, không lỗi cú pháp; đây **không** phải TypeScript typecheck/build Expo.
- Video `docs/qa-v069/PK_FLUID_DEMO_V069.mp4` là ghi màn hình web Chromium minh họa, **không** phải ứng dụng native.

## Giới hạn cần xử lý

- Chưa build và đo độ mượt (FPS/frame pacing) trên iOS/Android thật; không thể khẳng định đạt 60 FPS.
- Chưa triển khai cross-room LiveKit media video/voice thật. Avatar trong PK vẫn là placeholder; không có hiệu ứng nói giả.
- Lượt cổ vũ mẫu không phải coin hay quà tặng thật. Kết quả trận kết nối backend chỉ hiện khi server xác nhận.
