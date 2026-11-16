# Ghi chú kiến trúc SFU v0.4

## Đường truyền

1. Ứng dụng mobile → Túttt API: tạo/đăng nhập phiên demo, chọn phòng, POST `/rooms/:id/join`.
2. Mobile → Túttt API: POST `/rooms/:id/live/token`; API kiểm tra thành viên/khóa phòng, trả URL LiveKit và JWT có quyền cho từng người.
3. Mobile → SFU LiveKit (WSS/UDP/TURN): kết nối và subscribe audio. Microphone ban đầu luôn **off**; chỉ bật sau khi được duyệt và người dùng chủ động cho phép.
4. Listener bấm `Xin lên mic`; moderator/host duyệt qua Túttt API → `RoomServiceClient.updateParticipant()` (quyền canPublish microphone).
5. LiveKit SDK tự quản lý kết nối truyền âm thanh; backend Túttt không xử lý PCM hoặc ghi âm.
6. Khi host kick user → API gọi `RemoveParticipant`, chặn cấp token mới. Room moderation role **không** tương đương `roomAdmin` trong LiveKit; chỉ backend có quyền quản trị.

## Các quyết định an toàn

- Secret và quyền admin hoàn toàn phía server; không gửi `LIVEKIT_API_SECRET` cho app.
- JWT 5 phút, `roomJoin=true`, `canSubscribe=true`, `canPublishData=false`, `roomAdmin=false`, `canPublishSources=['microphone']` khi được duyệt.
- Đổi quyền bằng API máy chủ. Nếu LiveKit admin API lỗi, ghi nhận lỗi thay vì báo thành công.
- Mời rời phòng giữ ban 10 phút trong JSON demo; chưa hỗ trợ xử lý khi nhiều Node process và chưa có chính sách vĩnh viễn.
- Chặn truy cập cross-origin cho POST/PATCH/DELETE có header `Origin` không trùng với host backend; chưa thay thế cơ chế CSRF chuẩn cho production.

## Vì sao chưa thay web mesh

V0.3 web là prototype JavaScript không bundler, dùng P2P. LiveKit JS client cần bundle/thư viện. Gộp P2P và LiveKit vào một chế độ không rõ ràng sẽ tạo sai lệch nghiệm thu; vì vậy **web giữ nhãn “Web mesh lab”**, còn kết nối SFU được triển khai trong mã React Native v0.4. Thay web mesh bằng LiveKit sẽ là hạng mục riêng sau khi có toolchain build và server SFU hoạt động.

## Giới hạn tồn tại

Backend stage lưu Map RAM; không có LiveKit webhook để xác minh subscriber/track thực tế hoặc xóa ghế chết khi phiên mất mạng; stage heartbeat chỉ ước lượng. Cần Redis/PostgreSQL + webhook có ký xác thực và idempotency. Cần thêm feature gating/timeout cho room capacity và đo tải thực tế thay vì coi 80 participants là số người chạy audio đã benchmark.
