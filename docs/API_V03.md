# Túttt v0.3 — Demo API

`GET /api/health` trả về trạng thái và version. `POST /api/session` tạo phiên khách. Web sử dụng cookie HttpOnly SameSite=Lax; mobile demo có Bearer token trong bộ nhớ khi gửi header `X-Tuttt-Client: mobile`.

## Phòng và chat (từ v0.2)

- `GET /api/me`, `PATCH /api/me`
- `GET /api/rooms`, `POST /api/rooms`, `GET /api/rooms/:id`
- `POST /api/rooms/:id/join`, `POST /api/rooms/:id/leave`
- `GET /api/rooms/:id/messages`, `POST /api/rooms/:id/messages`
- `POST /api/reports`, `POST /api/users/:id/block`
- `GET /api/events`: SSE, có `rooms.changed`, `room.changed`, `voice.changed` và `voice.signal` (định tuyến đúng người nhận)

## Voice signalling (v0.3)

Trước tiên `POST /api/rooms/:id/join`, sau đó mới:

| Endpoint | Phương thức | JSON gửi lên | Kết quả |
|---|---|---|---|
| `/api/rooms/:id/voice/join` | POST | Không cần body | Roster và `selfId` |
| `/api/rooms/:id/voice` | GET | — | Roster hiện tại |
| `/api/rooms/:id/voice/heartbeat` | POST | Không cần body | Gia hạn kết nối + roster |
| `/api/rooms/:id/voice/seat` | POST | `{ "speaker": true }` hoặc false | Cập nhật ghế nói |
| `/api/rooms/:id/voice/mic` | POST | `{ "enabled": true }` hoặc false | Trạng thái mic công bố tới phòng |
| `/api/rooms/:id/voice/signal` | POST | `{ "to": "uuid", "type": "offer|answer|candidate", "payload": { ... } }` | `{ "delivered": true }` |
| `/api/rooms/:id/voice/leave` | POST | Không cần body | `{ "left": true }` |

Roster:

```json
{
  "roomId": "<room-id>",
  "selfId": "<user-id>",
  "participants": [{ "id": "<user-id>", "name": "Host", "role": "speaker", "mic": false }],
  "limits": { "participants": 6, "speakers": 4 },
  "kind": "browser-webrtc-mesh"
}
```

`voice.changed` có data `{ "roomId": "..." }`. `voice.signal` (chỉ gửi qua SSE cho phiên đích) chứa `{ "roomId", "from", "type", "payload" }`.

**Bảo mật và quyền:** máy chủ chặn signalling nếu không ở trong phòng voice, từ chối recipient ngoài roster, chặn tín hiệu giữa tài khoản đã block, giới hạn nội dung SDP/ICE và tần suất gọi API. Nhưng **luồng media P2P không đi qua server**, vì vậy backend *không thể thực thi nghiêm ngặt* quyền publish âm thanh trên đường truyền. Đây là lý do không dùng demo này trong môi trường production: cần SFU với token publish/subscribe, quyền host/moderator và cơ chế thu hồi quyền.

Mô hình presence ở RAM/JSON **không phân tán và không có durable sessions**. Không ghi dữ liệu nhận dạng cá nhân hoặc thông tin nhạy cảm vào demo.
