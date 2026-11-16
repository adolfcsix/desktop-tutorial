# TÚTTT v0.8.46 — KIỂM THỬ VÀ NÂNG CẤP AN TOÀN TOKEN/MEDIA

**Ngày:** 13/11/2026  
**Nâng cấp từ:** v0.8.45  
**Phạm vi:** backend LiveKit, quyền cấp token/ghế, lỗi SFU bất đồng bộ, kiểm thử hồi quy.  
**Giao diện:** Giữ nguyên Ivory/Espresso, chat nổi, một menu `•••`, Voice/Cam/PK, không thêm nút/hoạt ảnh.

## 1. Lỗi tái hiện trước khi sửa

### Lỗi A — JWT được phát hành với quyền cũ trong lúc thu hồi ghế

- Trong mã cũ, `/live/token` gọi `stage.reconcileDisconnect(...)` rồi `stage.enter(...)` bên ngoài khóa quản trị phòng.
- Có thể gửi `/live/token` của người nói trong lúc `/live/seat` đang đợi SFU cập nhật `canPublish=false`.
- **Trước sửa:** bài thử HTTP cấp JWT ngay với `video.canPublish=true` mặc dù lệnh thu hồi vẫn đang chạy.
- **Sau sửa:** thêm `Stage.issueToken()` để thao tác reconciliation và cấp token cùng dùng khóa phòng với `seat`, `invite-respond`, `moderate` và `exit`. Bài thử xác nhận token không được trả trước khi SFU phản hồi; JWT mới có `canPublish=false`.
- Có thêm thử nghiệm kick khi `removeParticipant` chưa trả kết quả; yêu cầu token chờ và sau kick bị từ chối 403.

### Lỗi B — SFU setPermission thất bại nhưng trạng thái media từ xa không xác định

- SDK có thể báo lỗi sau khi yêu cầu thay đổi quyền đã đến SFU. Không thể suy ra quyền vẫn chưa đổi hoặc track đã tắt.
- **Trước sửa:** backend giữ thành viên/ghế cũ; API có thể cấp JWT mới trong tình huống kết quả quyền không xác định.
- **Sau sửa:** thêm `quarantineUncertainPermission()` cho ba đường `speaker`, `respondInvite` và `leaveSeat`. Trước tiên ghi reconnect fence `pending`, yêu cầu SFU `removeParticipant` và dọn ghế/lời mời. Nếu remove thất bại, fence được giữ và `enter` từ chối cấp token tới khi đối soát thành công. Nếu remove xác nhận thành công, lần vào lại là listener (không tự bật mic/cam).
- Bài thử đối kháng xác minh cả hai nhánh ngắt SFU thành công/thất bại và việc tắt ghế tự phục vụ bị lỗi.

## 2. Kết quả đã chạy

| Kiểm tra | Trạng thái | Ghi chú |
|---|---|---|
| `npm test` | **433/433 PASS** | Gồm 5 ca mới; 2 bài thử cũ được cập nhật theo trạng thái cách ly an toàn mới |
| Lặp lại nhóm HTTP race + SFU race | **5 lượt PASS** | Mỗi lượt chạy riêng, xác minh không phụ thuộc may rủi thứ tự |
| `npm run check:web` | **PASS** | Kiểm tra cú pháp các mô-đun web/backend đã khai báo trong lệnh |
| `npm run qa:release -- --fast` | **4/4 PASS** | Node tests, web syntax, Native config audit, xuất HTML |
| Browser audit giao diện đa màn hình | **PASS** | Chạy trong lượt QA gộp đầu |
| Browser vùng chạm, typography, keyboard | **PASS** | Chạy trong lượt QA gộp đầu |
| Browser giảm chuyển động và điều hướng | **PASS** | Chạy trong lượt QA gộp đầu |
| Menu Live/PK | **12/12 PASS** | Chạy lại riêng tại 320/390/430 px |
| PK Voice/Cam × Ivory/Espresso | **4/4 PASS** | Chạy riêng |
| HTML độc lập Voice/Cam × Ivory/Espresso | **4/4 PASS** | Chạy riêng |
| Hồ sơ kết nối và điều khiển Live | **6/6 PASS** | Chạy riêng |
| Chat dồn dập | **4/4 PASS** | Chạy riêng |
| Viewer reconnect | **2/2 PASS** | Chạy riêng |
| Theme/room transition | **5 kịch bản PASS** | Chạy riêng |
| Bộ lịch sử v0.5.6 và v0.5.7 | **3/3 và 3/3 PASS** | Chạy riêng với bộ assets hiện hành |
| Native dependency gate | **BLOCKED** | Thiếu `mobile/package-lock.json` và `mobile/node_modules` đã xác minh |
| Native device config gate | **NEEDS_CONFIGURATION** | Chưa cấu hình ID Android/iOS và URL API staging |
| `tsc --noEmit` Native, Expo Doctor | **NOT_RUN** | Không được coi việc parse TypeScript là semantic typecheck |
| Development build Android/iOS và LiveKit SFU thực | **NOT_RUN** | Không có môi trường build, thiết bị hay máy chủ SFU để thử |

**Lưu ý QA:** Lệnh `qa:release -- --extended` chạy liên tục bị timeout của môi trường sau khi ghi nhận 7 nhóm PASS. Các nhóm còn lại đã được chạy lại từng script riêng và đều PASS; không ghi nhận lệnh QA gộp là hoàn tất. Đây là hai loại kết quả khác nhau.

## 3. Độ bao phủ và giới hạn

- HTTP integration dùng máy chủ Node thật **trong một tiến trình**, còn SFU permission/remove được mock có điều khiển để tái hiện thứ tự bất đồng bộ. Không thay thế thử nghiệm truyền media qua LiveKit SFU thật.
- JWT đã phát hành trước khi thu hồi quyền vẫn có thể còn hạn tối đa khoảng **5 phút**. Reconnect fence ngăn API cấp JWT mới, không tự nó vô hiệu hóa bản JWT cũ; cần kiểm tra hành vi remove/kick trên SFU thật và cân nhắc rút ngắn TTL sau khi xác minh khả năng kết nối mobile.
- Khi SFU ngoại tuyến, backend không thể chứng minh driver vật lý đã dừng mic/camera. Cơ chế fence ưu tiên không cấp thêm phiên mới; không tuyên bố đã bảo đảm tắt media trên thiết bị.
- Chưa kiểm thử sự bền vững đa tiến trình/máy chủ, Bluetooth, chuyển Wi-Fi/4G hoặc iOS/Android nền/tiền cảnh.
- `npm view` trong môi trường này không truy cập được registry (ghi nhận `EAI_AGAIN` trong npm debug log), vì vậy không tạo lockfile nhân tạo, không dùng `--force`/`--legacy-peer-deps` để ép cài.

## 4. Ưu tiên bước kế tiếp

1. Trên máy có npm registry hoạt động: `cd mobile`, `npm install --package-lock-only --strict-peer-deps`, `npm ci --strict-peer-deps`, sau đó chạy `npm run sdk:check`, `npm run doctor`, `npm run typecheck` và sửa lỗi thật nếu có.
2. Cấu hình định danh ứng dụng hợp lệ, HTTPS API staging và LiveKit SFU. Tạo development build theo hướng dẫn trong `docs/NATIVE_DEVELOPMENT_BUILD_V0839.md`.
3. Nghiệm thu hai thiết bị: phát/nghe hai chiều, mic/camera, mất quyền khi đang phát, kill/kick, token cũ, Bluetooth, foreground/background, Wi-Fi/4G và reconnect.
4. Chỉ sau khi có log thiết bị thật mới xem xét giảm thời hạn JWT, tinh chỉnh phục hồi và phát hành chính thức.
