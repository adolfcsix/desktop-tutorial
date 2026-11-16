# Túttt v0.4.4 — UX Reliability & Readability

## Phạm vi
Đây là bản **sửa giao diện có thể kiểm tra bằng mã nguồn** của web prototype và bộ UI React Native. Không tuyên bố âm thanh native, đăng nhập và chat riêng đã hoạt động thật.

## Những lỗi thực tế được xử lý
1. Thẻ phòng nổi bật lồng nút bấm (HTML tương tác lồng nhau) -> dùng một vùng bấm duy nhất, bổ sung thao tác Enter/Space.
2. Phần đề xuất phòng từng bỏ qua phòng đầu dù không có `featured` -> chọn đúng phòng gợi ý.
3. Dữ liệu phòng từ backend không nhất thiết có `speakers` -> phòng không còn bị lỗi `.slice` trên undefined.
4. Chuỗi chat offline sai interpolation tên chủ phòng -> sửa hiển thị.
5. Re-render trên sự kiện SSE trước đây đánh mất focus, vị trí con trỏ, scroll và nội dung bản nháp trong modal -> duy trì trạng thái khi cùng view; đổi view thì reset có chủ đích.
6. Bộ lọc Live hiển thị tổng số phòng chứ không phải kết quả hiện tại -> sửa lại; có nút xóa bộ lọc và tìm kiếm không dấu.
7. Chat cá nhân có backend chưa có thực -> nút tạo mới không còn giả vờ hoạt động, có trạng thái rỗng rõ ràng.
8. Thả tim/quà tặng ở demo không còn báo như giao dịch đã gửi thật.
9. Light Mode bị kế thừa các màu tối hard-coded -> ghi đè có hệ thống ở phòng Live, thanh nhập, modal và nút.
10. Giao diện mobile native và web nâng kích thước chữ, vùng bấm, trạng thái selected, nhãn mic.

## Kiểm chứng có thể thực hiện tại đây
- `npm test` cho toàn bộ backend hiện có và logic tìm kiếm.
- `npm run check:web` kiểm tra cú pháp JavaScript.
- Kiểm tra cấu trúc và các trường hợp boundary bằng bài test tự động.

## Các điểm CHƯA nghiệm thu
- **Đã render thực tế trong Chromium headless bằng HTML/CSS/JS nạp vào bộ nhớ** ở 320×720, 390×844 và 430×932. Có 8 ảnh tại `docs/qa-screens/`. Trên bản demo offline, đã kiểm tra chuyển tab, tìm phòng, mở phòng Live, giữ bản nháp khi re-render, chế độ sáng, modal Tab/Escape; không có lỗi JavaScript runtime quan sát được.
- Chromium trong môi trường này vẫn chặn điều hướng tới localhost/file, nên **chưa thực hiện browser E2E qua server thực** hoặc mô phỏng SSE qua network thật.
- Chưa kiểm tra bằng screen reader trên thiết bị, zoom 200%, touch target thực tế trên màn hình vật lý.
- Chưa chạy typecheck hoặc build native vì chưa có node_modules.
- Không xác nhận chất lượng âm thanh WebRTC/LiveKit.
- Chưa thực hiện audit WCAG 2.2 AA hoặc kiểm thử người dùng thực.

## Checklist nghiệm thu trên thiết bị
- iPhone màn 320/375/390/430, Android 360/393; font scale mặc định và 150%.
- Light/Dark tại Live, Chat, modal, bàn phím mở, quyền microphone bị từ chối.
- Trên web dùng bàn phím Tab/Shift+Tab/Escape để kiểm tra focus dialog.
- Đang nhập tin nhắn: người khác gửi SSE, kiểm tra con trỏ và bản nháp không mất.
- Tìm phòng bằng `chuyen`, `tam su`, `hoc tieng`; lọc chủ đề; xóa bộ lọc.
- Tạo phòng / rời phòng / từ chối quyền mic; xác nhận không có giao dịch hoặc chat giả bị báo thành công.

## Rà soát hậu tích hợp
- Đã thêm `ux-core.js` vào danh sách static cho phép từ Node server; nếu không có sửa này trang sẽ lỗi khi chạy `npm start`.
- Tự reset ô nhập sau khi gửi thành công, giữ nguyên bản nháp khi gửi thất bại.
- Khôi phục focus cho `input[name=message]`; cuộn tới tin nhắn cuối nếu người dùng đã ở sát cuối.
- Dữ liệu phòng backend thiếu avatar/art hoặc `speakers` có fallback thay vì làm hỏng giao diện.

## Browser QA thực tế (v0.4.4)
- 3 viewport 320/390/430 px: chiều rộng tài liệu và `#app` bằng viewport, không phát hiện cuộn ngang trang.
- 3 viewport: nút thông báo/tìm kiếm 44×44px; tab điều hướng rộng ít nhất 61px, cao ít nhất 52px.
- 3 viewport: lọc `english` trên dữ liệu mẫu thu về 1 phòng; tìm không dấu có kiểm thử Node riêng.
- 390px: modal nhận focus, Tab đưa focus vào nút đóng, Escape đóng modal.
- 390px: sau thao tác thả tim (re-render), ô nhập giữ bản nháp.
- Sửa thực tế sau nhìn ảnh: biểu tượng SVG đen và nền xám do mặc định của nút ghế mic; đã chụp lại.

Các kết quả trên là **kiểm thử browser cho prototype demo offline**, không phải nghiệm thu voice/audio, kiểm tra WCAG AA hoàn chỉnh, kiểm thử native hoặc hiệu năng production.
