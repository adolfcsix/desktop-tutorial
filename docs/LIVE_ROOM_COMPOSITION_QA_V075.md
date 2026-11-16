# Túttt v0.7.5 — Live Room Composition & Chat Legibility

Ngày nghiệm thu: 12/11/2026. Tiếp nối v0.7.4, không thay bảng màu Mocha Ivory/Espresso Night, logo TUT, hành vi micro, quy tắc PK hay dữ liệu thanh toán.

## Những vấn đề được sửa

1. **Phòng PK Voice 320–430 px:** sân khấu trước chiếm quá nhiều chiều cao, khiến câu chat trong bản minh họa bị cắt và đôi khi chỉ còn thấy phần cuối. Bố cục compact cho màn hình thấp giảm phần trang trí/avatar có chọn lọc, giữ điểm/đồng hồ/hai phe và nút tiếp sức dễ nhận biết. Câu mở đầu minh họa rút gọn, tin nhắn thật vẫn được hiển thị nguyên văn khi kết nối.
2. **Thanh tiêu đề hai chế độ Live:** nút quay lại và menu có vùng chạm 44 × 44 px; khoảng cách thống nhất; tiêu đề được cắt bằng dấu `…` khi quá dài thay vì đẩy nút. Nút Top 3 và bộ đếm người xem Voice có vùng chạm tối thiểu 44 px.
3. **Danh sách người trong phòng Voice:** trước đây bộ đếm trên cùng là một `span` không tương tác. Nay là `button` mở bảng danh sách. Khi Voice đã kết nối, sử dụng `state.voiceParticipants` đã có từ kết nối; khi chưa kết nối, hiển thị thông báo **chưa có dữ liệu** thay vì bịa thành viên theo số lượng mẫu. Không có bảng Thành viên thường trực, không có nút thừa ở thanh dưới.
4. **Thanh nhập và cụm thao tác:** trường nhập và nút gửi 46 px, đường viền ngăn nhẹ, điều khiển Voice/Cam vẫn theo hệ icon 40/42 px đã nghiệm thu v0.7.4. Tiếp sức nổi bật bằng màu, không bằng kích thước.
5. **React Native:** nút gửi 46 × 46 pt và có nhãn trợ năng, khoảng cách cột tùy 5/6 tác vụ; nhãn nút thống nhất cỡ chữ. Chưa can thiệp quyền mic/camera hay logic LiveKit.

## Kiểm thử

- `npm test`: **178/178 PASS**, gồm 4 trường hợp hồi quy mới cho v0.7.5.
- `npm run check:web`: **PASS**.
- 12 tệp TypeScript/TSX thuộc `mobile/src` không lỗi **cú pháp** (TypeScript parser). Đây **không** phải kết quả typecheck hay build native.
- Playwright/Chromium `python tests/browser_room_v075.py`: **16/16 PASS** cho 320×740, 390×844, 430×932, 768×1024; PK Voice/Cam × Light/Dark. Kiểm tra kích thước/gap nút, mức tràn ngang, chat đầu không bị cắt, nút đếm người mở/đóng bảng, tiến trình tiếp sức và xem kết quả minh họa, không lỗi JavaScript.
- Hình chụp và dữ liệu hình học: `docs/qa-v075/`.

## Giữ nguyên và giới hạn

- Chat vẫn là một lớp gọn, không thêm tab Chat/Thành viên/Quản lý cố định. Danh sách người tham gia chỉ mở theo thao tác của người dùng.
- Trong bản web, ghế camera và media PK ở chế độ minh họa **không phải luồng video đối phương thật**. Không có quà tặng thu phí, kết nối media PK liên phòng hoặc kiểm thử thiết bị vật lý thực tế.
- Phạm vi lần này là bố cục/nhãn tương tác và hiển thị danh sách Voice đã đồng bộ; backend PK, API và phân quyền không thay đổi.

## Cách xem

Tại thư mục gốc chạy `npm start`, mở `http://localhost:8787` → **Live** → phòng Voice hoặc Cam → **PK** → **Xem giao diện PK minh họa**. Có tệp `TUTTT_V0_7_5_PREVIEW.html` xem giao diện offline, không giả mạo trạng thái phòng thật.
