# Túttt v0.4 · API phòng Live (LiveKit SFU)

Các API này yêu cầu phiên khách từ `POST /api/session` và đã gọi `POST /api/rooms/:id/join`. Cookie (trình duyệt cùng nguồn) hoặc `Authorization: Bearer ...` (mobile). Body JSON. `:id` là UUID phòng.

| Method | Path | Ý nghĩa | Quyền |
|---|---|---|---|
| GET | `/api/health` | Trạng thái `livekitConfigured` | Công khai |
| POST | `/api/rooms/:id/live/token` | Cấp LiveKit JWT 5 phút và roster | Thành viên phòng |
| GET | `/api/rooms/:id/live` | Danh sách vai trò/ghế và yêu cầu | Thành viên phòng |
| POST | `/api/rooms/:id/live/heartbeat` | Duy trì phiên stage demo | Đã cấp token |
| POST | `/api/rooms/:id/live/seat-request` | Xin lên ghế nói | Đã cấp token, chưa có ghế |
| POST | `/api/rooms/:id/live/seat` | `{ "userId":"uuid", "enabled":true/false }` | Host/moderator |
| POST | `/api/rooms/:id/live/seat-leave` | Tự rời ghế, không áp dụng host | Người đang có ghế |
| POST | `/api/rooms/:id/live/moderate` | `{ "userId":"uuid", "action":"promote/demote/kick" }` | Host; mod chỉ được kick |
| POST | `/api/rooms/:id/live/leave` | Thu hồi kết nối và xóa khỏi stage | Chính người dùng |

- `POST /rooms/:id/leave` cũng thu hồi LiveKit nếu phiên đã tham gia stage.
- Quyền publish của người nghe là `false`; JWT không cấp roomAdmin, camera, screen share, data publish.
- Stage chỉ cập nhật quyền sau khi `RoomServiceClient.updateParticipant()` thành công (ngoại lệ người chưa kết nối: LiveKit trả not found thì token mới cấp lại có quyền cập nhật). Không có server SDK, yêu cầu thay đổi quyền trả `503`.
- Kick yêu cầu backend gọi LiveKit `RemoveParticipant`, chặn phát token mới trong 10 phút. Với LiveKit tự host, cần token TTL ngắn/chiến lược revoke theo tài liệu LiveKit để tránh token cũ tái sử dụng trước khi hết hạn.
- Đây là HTTP API demo; chưa có JWT đăng nhập người dùng, chưa CSRF token chuyên dụng, quota phân tán, Webhook presence, PostgreSQL, audit moderation.
- WebRTC mesh cũ dùng `/api/rooms/:id/voice/*` và **không** đồng bộ ghế với LiveKit SFU mới.
