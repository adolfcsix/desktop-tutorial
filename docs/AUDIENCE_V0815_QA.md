# Túttt v0.8.15 — Nút số người xem và bảng thành viên

Ngày: 12/11/2026. Bản kế thừa v0.8.14.

## Nghiệp vụ

- Trong Voice và Cam có một nút đếm người có thể nhấn, tối thiểu 44 px. Khi PK Cam hoạt động, bỏ nút đếm ở hàng sân khấu thông thường và giữ nút đếm trong thanh đầu PK, không hiển thị hai nơi cùng lúc.
- Nhấn nút mở bảng trượt **Người trong phòng**. Bảng có tên, avatar chữ cái và vai trò, chia **Trên sân khấu** và **Đang xem**. Có nút đóng, không hiển thị tab Người xem thường trực.
- Dữ liệu thật do `GET /api/rooms/:id/audience` trả về từ presence đã tham gia phòng, bao gồm người chỉ xem không bật microphone. Nếu không có server, bản demo hiện 4 tên ví dụ có nhãn *minh họa*, không tự nhận chúng là người đang xem thật.
- Kiểm tra quyền: tài khoản ngoài phòng bị từ chối 403; không xuất token/cookie/IP. Tên/role có thể trễ tối đa theo TTL presence 90 giây và nhịp tải lại; không phải đo chính xác kết nối âm thanh/video thực.
- Mở/đóng bảng không xoá bản nháp chat và không thay vị trí thanh điều khiển hoặc điểm PK. Không đổi màu WIN vàng kim, LOSS tím trắng hay chuỗi thắng.

## Kết quả tự động

- `npm test`: 250/250.
- `npm run check:web`: đạt.
- `python3 tests/browser_audience_v0815.py`: 16/16 tổ hợp kích thước 320, 390, 430, 768 px × Voice/Cam × sáng/tối. Kiểm tra một nút thấy được cả trong/ngoài PK, mở bảng, nút đóng, giữ bản nháp, không tràn ngang; ảnh lưu tại `docs/qa-v0815/`.
- Kiểm tra cấu trúc TypeScript/TSX: 13 tệp không lỗi cú pháp phân tích.
- Tự động kiểm thử API: có người xem không bật voice/LiveKit vẫn hiển thị; rời phòng biến mất, đổi tên được đồng bộ, người ngoài bị từ chối.

## Chưa kiểm tra

- Chưa build iOS/Android hoặc nghiệm thu bảng người xem trên thiết bị thật.
- Chưa đo tải lớn hoặc đa server. Presence và danh sách lưu trong bộ nhớ một tiến trình; chưa triển khai cho hệ thống production phân tán.
