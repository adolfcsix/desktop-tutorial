# Túttt v0.8.49 — Kiểm tra quyền quản trị SFU và dọn phòng kiểm thử an toàn

**Nguồn:** v0.8.48. **Ngày:** 13/11/2026. **Phạm vi thay đổi:** một công cụ kiểm chứng SFU opt-in, 11 bài thử mô phỏng, hướng dẫn vận hành, số phiên bản. Không thay đổi giao diện hoặc mã quyền Live/PK của người dùng.

## Vấn đề của quy trình cũ

`npm run verify:livekit:sfu` chỉ xác thực và gọi `listRooms()`. Nó không chứng minh tài khoản có thể tạo phòng, đọc thành viên, dọn phòng hoặc thực hiện việc quản trị. Đây là khoảng trống nghiệm thu quan trọng sau nhiều lần backend phải cách ly quyền do lỗi RPC.

## Thay đổi kỹ thuật

Thêm `scripts/verify_livekit_admin.mjs` và lệnh `npm run verify:livekit:admin` (lệnh này chủ động gọi với cờ `--run`). Bài kiểm chứng tạo một tên ngẫu nhiên `tuttt-qa-<16 ký tự hex>`; không cho nhập tên phòng thật. Quy trình dùng RoomServiceClient chính thức của server SDK:

1. `listRooms([name])`: xác nhận tên phòng tạm chưa tồn tại.
2. `createRoom({name, emptyTimeout:60})`: tạo riêng phòng QA.
3. `listRooms([name])`: xác minh thấy phòng vừa tạo.
4. `listParticipants(name)`: xác nhận phòng không có thành viên.
5. `deleteRoom(name)` rồi `listRooms([name])`: xác nhận phòng đã biến mất.

Mỗi RPC có deadline (mặc định 8 giây), nhưng deadline không hủy chắc chắn yêu cầu đã gửi đi. Khi `createRoom` timeout, công cụ cố gắng xác minh/dọn dẹp; nếu trạng thái không chắc chắn sẽ trả `UNCERTAIN` và giữ tên phòng để vận hành xử lý. Khi phòng có thành viên hoặc không xác nhận được nó trống, **không gọi deleteRoom**, tránh ngắt người dùng. Khi cleanup thất bại, toàn bài không PASS.

Output không in API key/secret, raw stack hoặc raw SDK error. Chạy script không có `--run` không gọi SFU.

## Kiểm thử tự động

- `node --test tests/livekit_admin_probe_v0849.test.js`: 11 tình huống bằng fake RoomServiceClient, bao gồm thành công, API 403, phát hiện thành viên bất thường, lỗi xóa, xóa trả thành công giả, lỗi xác minh sau xóa, create trả sai, create timeout, trùng tên, yêu cầu opt-in và deadline.
- `npm test`: kiểm thử Node.js/API hiện có cộng 11 bài mới.
- `npm run qa:release -- --fast`: backend/API, cú pháp web, khai báo Native, xuất HTML độc lập.

**Không suy diễn:** Fake RoomServiceClient không chứng minh SFU thật đã xử lý thành công. Phép kiểm tra tạo/xóa phòng cũng không chứng minh `updateParticipant`, `removeParticipant`, ICE/WebRTC hay quyền revoke token đúng. Chỉ xác nhận các API được gọi thực tế khi vận hành chủ động trong môi trường có server SDK và LiveKit.

## Lệnh sử dụng khi có SFU thật

```bash
# 1) Trên máy có npm registry: cài server SDK đúng phiên bản
npm --prefix server install
# 2) Cấu hình LIVEKIT_URL, LIVEKIT_API_KEY và LIVEKIT_API_SECRET
#    hoặc dùng .local/livekit.env đã được bảo vệ quyền đọc
# 3) Xem health/read-only
npm run verify:livekit:sfu
# 4) Chỉ khi được phép tạo/xóa phòng tạm:
npm run verify:livekit:admin
```

Nếu báo `SAFETY_HOLD`, `UNCERTAIN` hoặc `FAIL` ở cleanup, kiểm tra tên `tuttt-qa-*` được ghi trong báo cáo trực tiếp trên SFU trước khi dọn thủ công. Không chạy script này nhằm kiểm thử phòng đang sử dụng.

## Còn BLOCKED / NOT_RUN

- Expo/React Native: chưa có dependency/lockfile được cài hoàn chỉnh, nên chưa xác nhận `tsc --noEmit`, Expo Doctor và APK/IPA.
- Bài kiểm chứng quản trị SFU thật: **NOT_RUN** trong môi trường không có `livekit-server-sdk` và địa chỉ/khóa SFU hợp lệ.
- Kết nối media hai điện thoại, Bluetooth, chuyển Wi-Fi/4G, TURN/ICE, hiệu lực JWT cũ trên LiveKit self-hosted: **NOT_RUN**.
