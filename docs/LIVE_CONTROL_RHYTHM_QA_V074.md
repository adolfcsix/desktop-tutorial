# Túttt v0.7.4 — Live Control Rhythm & Short-Screen Fit

## Bản sửa từ v0.7.3

- Giữ logo, bộ màu Mocha Ivory/Espresso Night, cấu trúc PK Voice/Cam, camera hai nửa và chat nổi. Không phục hồi tab/chat-panel thường trực; danh sách người xem vẫn mở bằng nút đếm người.
- Cam: sáu tác vụ chia cột đều, `gap=8px` ở màn 390–430px, `6px` ở 320px; icon trực quan cùng kích thước 42px hoặc 40px. Vùng bấm cao tối thiểu 68px; nút **Tiếp sức** không còn nhỉnh hơn các nút khác.
- Voice: năm tác vụ chia cột đều với `gap=10px`, icon và nhãn cùng quy chuẩn; không thay thứ tự hay ý nghĩa của các tác vụ.
- Thanh nhập tin: ô nhập và nút gửi cao 46px, khoảng cách 11px. Các chip PK có chiều cao 44px, có khoảng hở rõ ràng; nút Kết quả giữ chữ dễ hiểu, rút gọn KQ khi 320px.
- Voice trên màn có chiều cao từ 760px trở xuống: giảm chiều cao phần trang trí sân khấu, giữ nguyên khu vực điều khiển cuối màn và vùng chạm tối thiểu. Dòng chú thích điểm minh họa chuyển thành hàng riêng, không cạnh tranh không gian với nút cổ vũ.
- React Native/Expo: thanh nút Live có cột co giãn, khoảng hở 6pt, icon 44pt; một số nhãn dài được rút gọn về mặt hiển thị, giữ `accessibilityLabel` đầy đủ. Nút quyết định lời mời PK dùng chiều cao tối thiểu 44pt và cách nhau 12pt.

## Tệp sửa chính

- `prototype/controls-v074.css`: quy chuẩn kích thước và khoảng cách, chỉ tập trung vào hệ nút Live/PK và responsive.
- `prototype/index.html`, `server/index.js`: nạp CSS mới và cập nhật phiên bản server 0.7.4.
- `mobile/src/screens/Screens.tsx`: thanh nút Live trong ứng dụng di động.
- `mobile/src/components/PKDuelBoard.tsx`, `PKPanel.tsx`: nút PK và quản trị PK.
- `tests/controls_v074.test.js`, `tests/browser_controls_v074.py`: hồi quy cấu trúc và hình học thực tế.

## Nghiệm thu

- Node.js: `npm test` — 174 bài test PASS.
- Cú pháp web/server: `npm run check:web` — PASS.
- Chromium: 320×740, 390×844, 430×932 × Voice/Cam × Light/Dark — 12/12 tình huống PASS; độ rộng icon trong từng thanh không lệch; khoảng cách giữa các nút >0; nút đủ chiều cao, không tràn ngang hay bị cắt dưới khung nhìn; điểm cổ vũ và màn kết quả demo thao tác được.
- Ảnh chụp 320/390px cùng kết quả định lượng trong `docs/qa-v074/`.

## Giới hạn nghiệm thu

UI web/Chromium và cú pháp TypeScript không chứng minh hiệu năng hoặc giao diện chính xác trên iOS/Android thật. Chưa có ghép video/âm thanh hai phòng PK thật hoặc quà tặng thu phí. Các lượt cổ vũ demo là số liệu minh họa; giữ nguyên cơ chế xác nhận của server khi kết nối.

## Chạy thử

Tại thư mục gốc chạy `npm start`, vào `http://localhost:8787`, chọn Live Cam/Voice rồi bật PK minh họa. Có thể dùng file `TUTTT_V0_7_4_PREVIEW.html` đi kèm gói bàn giao để xem nhanh không cần server.
