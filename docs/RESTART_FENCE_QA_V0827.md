# Túttt v0.8.27 — LiveKit restart-safe session fence

## Lý do thay đổi

Trước v0.8.27, backend lưu trạng thái `unconfirmedDisconnects` trong RAM. Nếu tiến trình khởi động lại trong lúc SFU vẫn giữ kết nối của một danh tính, trạng thái cách ly bị mất và API có thể cấp thêm token trước khi xác minh ngắt phiên cũ.

## Cơ chế hiện hành (một tiến trình Node.js)

- **Trước khi cấp token:** `Stage.enter()` ghi một bản ghi `livekitSessionFences[roomId:userId]` trong file dữ liệu của `Store` bằng thao tác ghi tạm và đổi tên nguyên tử. Chỉ sau khi ghi xong mới tạo token. Bản ghi chứa **ID, bootId, trạng thái, thời điểm**, không chứa LiveKit API secret hay token.
- **Rời phòng thành công:** SFU xác nhận xóa danh tính (hoặc báo `not found`) thì xóa fence. Thành viên và ghế được dọn ở tầng ứng dụng.
- **SFU lỗi:** lưu fence `pending`, trả `mediaDisconnectPending: true`, dọn membership ứng dụng nhưng không khẳng định media đã ngắt.
- **Backend khởi động lại:** mọi fence còn lưu được xem là kết nối có thể tồn tại trên SFU. Khi yêu cầu token tiếp theo, backend yêu cầu đã tham gia phòng, gọi `removeParticipant` qua API có xác thực, xóa fence sau thành công, rồi mới cấp token mới.
- **Lỗi tiếp diễn:** trả `409`; client có thể thử lại sau. Không trả exception thô hay thông tin xác thực SFU.

## Kiểm thử trong dự án

```bash
npm test
npm run qa:release
```

Các tình huống mới trong `tests/livekit_restart_fence_v0827.test.js`: restart sau token, restart sau lỗi SFU, rời phòng thành công, từ chối người chưa vào phòng, tiến trình dừng trong lúc đang chờ SFU. `tests/staging_preflight_v0827.test.js` kiểm tra URL staging HTTPS, loại trừ URL cục bộ/đính kèm thông tin đăng nhập, xác nhận phiên bản API và nhận diện giao diện Túttt.

## Đọc trạng thái staging (khi đã triển khai riêng)

```bash
npm run preflight:staging -- --web https://staging.example.com --api https://api.example.com --version 0.8.27
```

Đây chỉ là kiểm tra **có thể truy cập web/API qua HTTPS**. Nó không tự triển khai, không xác thực SFU, không thay thế TinyFish duyệt giao diện và không thay thế hai điện thoại thử media. Không sử dụng địa chỉ mẫu ở trên như một môi trường đang hoạt động.

## Những giới hạn phải giữ rõ

1. **Không hỗ trợ nhiều tiến trình cùng ghi file dữ liệu**: nếu muốn chạy nhiều máy/chia tải phải chuyển fence và khóa đồng bộ sang kho chia sẻ có transaction/lease (ví dụ PostgreSQL hoặc Redis với cơ chế phù hợp), và xử lý cạnh tranh giữa tiến trình.
2. **Không phục hồi được token đã cấp trước khi cài v0.8.27**, vì trước đó chưa có fence trên đĩa. Cần dọn SFU bằng thủ tục quản trị nếu nghi ngờ còn phiên cũ.
3. **Không chứng minh media đã ngắt ở thiết bị thật.** Thành công của RoomService là xác nhận kết quả API tại thời điểm gọi; cần kiểm thử kết nối, đóng track, mất mạng và reconnect với SFU chạy thật.
4. File DB phải có quyền truy cập riêng, thư mục dữ liệu không được đưa vào bản ZIP hoặc website. Bản backup và phiên bản phần mềm cần được quản lý đồng bộ.
5. Hệ thống chưa tự dọn các fence của người dùng không quay lại. Cần bổ sung theo dõi SFU và chính sách cleanup an toàn trước khi vận hành lớn.
