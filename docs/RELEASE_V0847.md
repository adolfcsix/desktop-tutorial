# TÚTTT v0.8.47 — BÁO CÁO KIỂM THỬ VÀ AN TOÀN MEDIA

**Ngày:** 13/11/2026  
**Nguồn:** gói mã v0.8.46 đã lưu; nâng cấp trực tiếp lên v0.8.47.  
**Phạm vi thay đổi:** `server/livekit.js`, `server/stage.js`, `server/test/token_revocation_v0847.test.js`, đồng bộ metadata phiên bản và README.  
**Phạm vi giữ nguyên:** bố cục Voice/Cam/PK, menu `•••`, hai chủ đề Ivory/Espresso, hành vi chat nổi, React Native UI.

## A. Các lỗi tái hiện trước khi sửa

1. **JWT quá dài cho mô hình SFU self-hosted:** `LiveKitBridge.token()` phát JWT join với `exp - iat = 300` giây, trong khi LiveKit self-hosted không tự thu hồi JWT cũ sau update/removal. Ca kiểm thử mới đặt giới hạn token cấp ban đầu không quá 90 giây và **FAIL trước sửa: 300 giây**.
2. **Kick khi SFU ngoại tuyến:** `Stage.moderate()` gọi thẳng `bridge.remove()`. Nếu lệnh lỗi, endpoint có thể trả lỗi thô mà không ghi `pending` fence; backend không lưu trạng thái đang cần thu hồi. Ca kiểm thử **FAIL trước sửa**.
3. **Ban khi SFU ngoại tuyến:** lỗi `bridge.remove()` khiến ban chưa được ghi nhận trong application DB; người dùng có thể thử tham gia lại ứng dụng trong khi SFU chưa xác nhận ngắt. Ca kiểm thử **FAIL trước sửa**.

## B. Hành vi sau sửa

- Token **join ban đầu** được cấp với `exp - iat = 90` giây. Không thay đổi mã secret, chữ ký HMAC, role grant hoặc permission camera/mic.
- Kick/ban đặt `unconfirmedDisconnects` và ghi `livekitSessionFences[room:user] = revoking` **trước** khi yêu cầu SFU ngắt phiên.
- Với ban, `roomBans` được lưu trước lời gọi SFU để không phụ thuộc kết quả mạng; với kick, không tự thêm ban.
- Khi ngắt thành công: xóa fence và trạng thái chờ thu hồi, xóa ghế và hiện diện cục bộ.
- Khi ngắt không xác nhận được: đổi fence sang `pending`, lên lịch thử lại; ngừng cấp token mới cho danh tính đó, xóa hiển thị sân khấu và hiện diện cục bộ, trả **502** với mô tả giới hạn xác nhận. Không lộ thông tin lỗi mạng/SFU nội bộ.
- `Stage.sweepExpired()` có thể tiếp tục thu hồi khi SFU trở lại. Fence và ban được kiểm tra qua test khởi động lại backend từ dữ liệu đã lưu.

## C. Kiểm thử đã chạy trên gói v0.8.47

| Phép thử | Kết quả | Phương pháp |
|---|---|---|
| `node --test server/test/token_revocation_v0847.test.js` | **5/5 PASS** | Fake SFU có kiểm soát, kiểm tra red/green, restart/rollback | 
| `npm test` | **438/438 PASS** | Bộ Node test đầy đủ, backend, API, policy, LiveKit mock và UI invariants |
| `npm run check:web` | **PASS** | `node --check` các module web/backend được cấu hình |
| `npm run qa:release -- --fast` | **4/4 PASS** | API test, syntax, Native static audit, standalone export |
| `tests/browser_standalone_theme_v0818.py` | **4/4 PASS** | Voice/Cam, sáng/tối |
| `tests/browser_live_options_v0832.py` | **12/12 PASS** | Menu Live/PK, kích thước 320/390/430px |
| `tests/browser_profile_connected_v0844.py` | **6/6 PASS** | Hồ sơ kết nối, điều khiển Live |
| Native dependency gate | **BLOCKED** | Chưa có npm lockfile/resolved node_modules hợp lệ |
| Native device config gate | **NEEDS_CONFIGURATION** | Chưa khai báo ID và origin API thật |
| `tsc --noEmit` và Expo Doctor đầy đủ | **NOT_RUN** | Chưa cài dependency Native |
| Development build APK/IPA | **NOT_RUN** | Chưa có môi trường build/credential/thiết bị |
| LiveKit SFU thật, hai điện thoại, chuyển mạng/Bluetooth | **NOT_RUN** | Không có media SFU và phần cứng thực tế trong lượt này |

Lượt thử `npm view expo@58.0.19 version --fetch-retries=0 --fetch-timeout=4000` gặp `EAI_AGAIN` khi phân giải `registry.npmjs.org`; không tạo lockfile thủ công, không dùng `--force` hoặc `--legacy-peer-deps`.

## D. Rủi ro còn lại — không được suy diễn thành PASS

1. **Token tự làm mới:** LiveKit có thể cấp token gia hạn cho phiên đang hoạt động; giới hạn join 90 giây không bảo đảm mọi thông tin xác thực hết hạn trong 90 giây. LiveKit Cloud và self-hosted có hành vi thu hồi khác nhau; cần kiểm tra phiên bản triển khai. Nguồn: https://docs.livekit.io/frontends/reference/tokens-grants/
2. **Ngắt media vật lý:** Khi API quản trị SFU không phản hồi, backend chỉ có thể chặn token mới và yêu cầu thu hồi lại; không thể tuyên bố đã tắt micro/camera trên thiết bị ngoài mạng. Cần thử với hai máy và SFU thật.
3. **Môi trường một tiến trình:** Những kiểm thử hiện tại không chứng minh tính nhất quán khi chạy đa instance, cân bằng tải hoặc chuyển node. `Stage` lưu ghế và các khóa đồng thời trong RAM (fence được lưu xuống đĩa).
4. **Native chưa xác minh:** Chưa có `package-lock.json` của mobile từ npm, Expo Doctor, TypeScript semantic typecheck, hoặc binary development build; app Expo Go không thay thế development build dùng WebRTC.
5. **Bộ QA mở rộng gộp:** Trong v0.8.47 đã chạy ba nhóm Chromium trọng điểm độc lập. **Không tuyên bố** đã hoàn tất toàn bộ `qa:release -- --extended` ở lượt này.

## E. Tiêu chí bước sau

- Trên máy có npm registry hoạt động, tạo lockfile bằng npm strict-peer và chạy `npm ci`, `expo install --check`, `expo-doctor`, `tsc --noEmit`.
- Cấu hình `TUTTT_ANDROID_APPLICATION_ID`, `TUTTT_IOS_BUNDLE_ID` và `EXPO_PUBLIC_TUTTT_API_URL`; sau đó tạo EAS development build.
- Thử hai điện thoại với SFU thật: cấp token mới, dùng lại token cũ sau kick/ban, quyền mic/camera khi đổi role, disconnect/reconnect, mất Wi-Fi→4G, Bluetooth, foreground/background.
- Chỉ đánh dấu sẵn sàng phát hành khi kiểm thử xác nhận trên thiết bị và có nhật ký kết quả thực tế.
