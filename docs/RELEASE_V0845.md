# TÚTTT v0.8.45 — KIỂM THỬ HỒI QUY VÀ NÂNG CẤP ĐỘ AN TOÀN LIVE

Ngày: 13/11/2026. Nguồn: gói mã v0.8.44. Phạm vi: backend HTTP, quyền LiveKit/SFU ở chế độ mock, PK, Live/Cam, báo cáo, giao diện responsive, tài liệu và cổng build Native.

## Tóm tắt nghiệm thu

| Nhóm | Kết quả | Giới hạn |
|---|---:|---|
| Node.js/API/unit/regression | **428/428 PASS**, 0 FAIL | Một tiến trình máy chủ; SFU permission mock |
| QA phát hành `npm run qa:release -- --extended` | **16/16 nhóm PASS** | Trình duyệt Chromium; không phải điện thoại thật |
| Browser historical v0.5.6 / v0.5.7 sau chuyển đổi | **6/6 PASS** | Mic đang nói được mô phỏng ở cấp CSS |
| HTTP đồng thời 7 tài khoản | **3/3 PASS** | HTTP thực qua localhost; SFU media mock |
| Lỗi race SFU cấp quyền đến muộn | **4/4 PASS** | Deterministic mock, không xác minh phần cứng |
| Cú pháp web/backend | **PASS** | Không thay thế TypeScript semantic Native |
| Native lockfile + dependency | **BLOCKED** | DNS npm `EAI_AGAIN`, chưa có lockfile và `node_modules` |
| Native device config | **NEEDS_CONFIGURATION** | Android/iOS app ID & HTTPS/LAN API URL chưa cấu hình |
| `tsc --noEmit`, Expo Doctor, APK/IPA | **NOT_RUN** | Phụ thuộc bước cài thư viện |
| SFU thật, mic/camera hai điện thoại, Bluetooth, Wi-Fi/4G | **NOT_RUN** | Cần development build và thiết bị thật |

## Lỗi có bằng chứng trước/sau sửa

### 1. Race khi cấp quyền media

- **Trước sửa:** Mã gọi `bridge.setPermission` rồi đặt `speaker=true` ngay khi API SFU phản hồi. Nếu người được cấp quyền hết hạn hoặc chủ thể cấp quyền mất hiện diện trong thời gian chờ, phản hồi đến muộn vẫn ghi nhận ghế nói hợp lệ. Hai ca kiểm thử đối kháng đầu tiên được viết trước khi sửa và đã **FAIL** đúng lỗi này.
- **Sau sửa:** `Stage.assertGrantStillAuthorized()` kiểm tra lại trạng thái người cấp, người nhận, cấp bậc và phiên đang ngắt ngay **sau** phản hồi SFU. Nếu không còn hợp lệ, tạo fence bền vững trước khi yêu cầu `remove`, không ghi nhận ghế, làm mới UI và trả 409. Nếu `remove` thất bại, fence vẫn chặn cấp token mới, được hàng đợi thu hồi thử lại sau.
- **Hồi quy:** `server/test/media_race_v0845.test.js`: 4/4 PASS (user hết hạn, host hết hạn, lời mời chấp nhận đến muộn, SFU từ chối thu hồi). Kết quả cấp quyền mock **không chứng minh mic vật lý đã dừng**.

### 2. Kiểm thử trình duyệt v0.5.x bị lỗi do harness cũ

- **Trước sửa:** `browser_qa_v056.py` và `browser_qa_v057.py` chỉ ghép stylesheet/script v0.5.x vào HTML mới, nên không tạo được lớp chat nổi v0.8.x. Hai script chạy thực tế đã **FAIL** trước khi chuyển đổi.
- **Sau sửa:** `browser_legacy_live_v0845.py` dùng `browser_room_v075.setup`, nạp đầy đủ tệp theo `prototype/index.html`. Giữ lại kiểm tra Cam/chat nổi, nút xem danh sách thành viên, huy hiệu microphone tắt, chống nút giả, gửi tin nhắn, không tràn màn hình và trạng thái đang nói ở cấp mô phỏng CSS.
- **Hồi quy:** `python3 tests/browser_qa_v056.py` và `...v057.py`: **6/6 PASS** ở 320 / 390 / 430px. Hai nhóm này đã được đưa vào `qa:release -- --extended` thay vì để ngoài cổng nghiệm thu.

### 3. Đồng thời nhiều tài khoản trên backend

- **7 phiên đăng nhập HTTP thật** cùng vào phòng Cam và xin ghế: **5 yêu cầu cấp quyền thành công, 1 bị từ chối 409**, cộng host đúng 6 vị trí. Chỉ có 5 lệnh cấp quyền gửi đến SFU mock.
- **Phó phòng ngang cấp** gọi trực tiếp API kick, thu hồi ghế và gửi lời mời: đều bị từ chối (403/422 theo nhánh dữ liệu), không làm rơi phiên của phó phòng còn lại.
- **Bốn yêu cầu báo cáo đồng thời** của cùng một tài khoản: chỉ có **một report ID** trong storage và danh sách của người gửi.
- **Hồi quy:** `server/test/http_concurrency_v0845.test.js`: **3/3 PASS**. Đây là kiểm tra xử lý đồng thời *một tiến trình*, không chứng minh tính đúng đắn đa node, tải lớn hoặc stream SFU thực tế.

## Giao diện và phạm vi giữ nguyên

Không thay đổi bố cục Voice/Cam/PK, vị trí menu `•••`, chat nổi hoặc hai theme Ivory/Espresso. Không thêm nút quà tặng, thả tim giả hoặc animation liên tục. QA Chromium hiện có tiếp tục kiểm tra các màn responsive, menu và thao tác người dùng như trước; kiểm thử này không thể đại diện cho trải nghiệm thiết bị cấp thấp.

## Điều kiện chặn phát hành

- `npm ping --registry https://registry.npmjs.org --fetch-retries 0` trả `EAI_AGAIN` trong môi trường hiện tại. **Không tạo lockfile giả, không dùng `--legacy-peer-deps` để che xung đột.**
- Chưa có `mobile/package-lock.json` do npm phân giải, `mobile/node_modules/expo` và định danh Android/iOS sở hữu thật; `EXPO_PUBLIC_TUTTT_API_URL` chưa được thiết lập.
- Phải chạy `npm --prefix mobile install --strict-peer-deps`, `npm run verify:native -- --device`, `npm --prefix mobile run typecheck`, Expo Doctor, development build và kịch bản LiveKit SFU hai điện thoại trên máy có thể truy cập npm.
- Hệ thống hiện dùng guest sessions, Store JSON và presence/ghế in-memory, chỉ thích hợp trình diễn single-process. Production cần xác thực thật, cơ sở dữ liệu có transaction, đồng bộ đa node, giám sát và kiểm tra bảo mật vận hành.

## Lệnh kiểm thử tái lập

```bash
npm test
npm run check:web
npm run qa:release -- --extended
python3 tests/browser_qa_v056.py
python3 tests/browser_qa_v057.py
node scripts/verify_native.mjs --json
```

Bằng chứng tự động: `docs/qa-v0845/automation-results.json`, `docs/qa-v0845/AUTOMATED_QA.md`, `docs/qa-v0845/legacy-v056.json` và `legacy-v057.json`.

**Kết luận:** v0.8.45 là bản nâng cấp an toàn SFU ở cấp logic, hồi quy đa tài khoản và giao diện offline có kiểm chứng; **chưa được nghiệm thu Native, SFU thực hay điều kiện phát hành production**.
