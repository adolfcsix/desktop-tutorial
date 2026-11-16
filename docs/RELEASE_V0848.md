# Túttt v0.8.48 — SFU deadline / không phát hành quyền khi trạng thái chưa chắc chắn

**Nguồn:** v0.8.47. **Ngày:** 13/11/2026. **Phạm vi:** backend LiveKit bridge và quản trị phiên; thay đổi cấu hình, kiểm thử, phiên bản. Không thay đổi bố cục hay tương tác Voice/Cam/PK, logo, theme hoặc hệ thống nút.

## Lỗi được tái hiện trước khi sửa

1. `RoomServiceClient.updateParticipant()` không giải quyết lời hứa làm lệnh cấp/thu hồi quyền đứng chờ vô hạn; vì `Stage.speaker()` chờ bên trong khóa phòng, những yêu cầu token/ghế tiếp theo cũng có thể bị chặn.
2. `removeParticipant()` không phản hồi làm `kick` chờ vô hạn, không kết thúc đủ sớm để phản hồi trạng thái chưa được SFU xác nhận.
3. Khi **grant** quyền mic/camera bị timeout rồi một lời gọi ngắt phiên sau đó báo thành công, kết nối mới có thể được cấp quá sớm, trước khi lời gọi grant cũ thực sự kết thúc.
4. Người bị cách ly có thể gọi **rời Live** trước khi kết nối lại để xóa fence; lỗi xảy ra cả khi lần gọi remove tiếp theo thành công hoặc thất bại.

## Bản sửa

- `LiveKitBridge.withRpcDeadline()`: thời hạn chờ 8.000 ms mặc định (cấu hình `TUTTT_SFU_RPC_TIMEOUT_MS`, tối đa 30.000 ms). Timeout nêu trạng thái SFU **chưa xác định**, không phải xác nhận media ngắt.
- Các lỗi SFU được chuẩn hóa ở lớp bridge; backend không in chi tiết request/secret cho người dùng. `not_found` khi remove vẫn được coi là ngắt thành công/idempotent theo API.
- `Stage` giữ kết quả **không xác nhận ngắt** vào `livekitSessionFences` trên ổ đĩa. Khi không có trả lời từ SFU, gửi 502 có kiểm soát và thả khóa tác vụ phòng.
- Timeout khi **bật quyền phát** đặt `holdUntil` cách ly trong 100 giây nhằm giảm nguy cơ lời gọi cấp quyền đến muộn hoặc token join cũ bị sử dụng lại. Sau thời hạn này vẫn phải thực hiện một lần `removeParticipant` mới **thành công** mới được cấp token.
- `setFence`, `queueExpiredRevoke`, `reconcileDisconnect`, `exit` và `sweepExpired` được sửa để không xóa/sử dụng lại fence trong thời gian cách ly, kể cả khi backend khởi động lại hoặc người dùng cố tình rời-vào phòng.

## Bằng chứng kiểm thử

- `node --test server/test/sfu_rpc_deadline_v0848.test.js`: **6/6 PASS**, gồm 3 ca đỏ trước khi sửa, 1 ca fence đỏ bổ sung, 1 ca bypass rời-vào đỏ bổ sung và kiểm tra cấu hình.
- `node --test server/test/http_sfu_timeout_v0848.test.js`: **2/2 PASS** bằng HTTP thực tới backend, SFU giả lập treo/hồi phục.
- `npm test`: **446/446 PASS**. `npm run check:web`: PASS. `npm run qa:release -- --fast`: **4/4 nhóm PASS**.
- Chromium chạy riêng: **4/4** Voice/Cam sáng/tối, **12/12** menu Live/PK, **4/4** chat dồn dập và **6/6** hồ sơ/Live kết nối.
- `npm run qa:release -- --extended` chạy gộp bị timeout sau **7 nhóm đầu đạt** (4 nhóm kỹ thuật + 3 nhóm Chromium). Không ghi cả lượt là PASS; những kịch bản trọng điểm đã chạy lại riêng.

## Điều kiện chưa đạt

- Npm registry `EAI_AGAIN`; chưa có lockfile Native hợp lệ, `node_modules`, `expo-doctor` và semantic `tsc --noEmit`. Nên build Android/iOS, thử 2 thiết bị và SFU thật đều **NOT_RUN**.
- `Promise.race()` giới hạn thời gian chờ của backend, **không hủy chắc chắn RPC còn đang xử lý ở SFU**. Thời hạn cách ly 100 giây giảm cửa sổ rủi ro nhưng không chứng minh thu hồi JWT hoặc ngắt track vật lý trên LiveKit self-hosted.
- Vẫn là kiến trúc backend một tiến trình; không khẳng định nhiều node/Redis/PostgreSQL hay chịu tải production.

## Vận hành và bước kế tiếp

```bash
# Tại repo gốc
npm test
npm run check:web
npm run qa:release -- --fast
npm run verify:native -- --json

# Chỉ trên máy đã có kết nối mạng / cấu hình LiveKit hợp lệ
# TUTTT_SFU_RPC_TIMEOUT_MS=8000
# npm --prefix server ci
# npm run verify:livekit:sfu
# npm run verify:native -- --install --device
```

Sau khi các cổng Native đạt và có môi trường SFU thật, nghiệm thu cấp/thu hồi quyền, dùng lại JWT cũ, lỗi mạng khi kick/ban, hai điện thoại, route audio Bluetooth, chuyển Wi-Fi/4G và ứng dụng xuống nền.
