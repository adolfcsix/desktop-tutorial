# TÚTTT V0.8.43 — BIÊN BẢN KIỂM THỬ CHI TIẾT

Ngày: 13/11/2026 · Nguồn: TUTTT_V0_8_42.zip · Mục tiêu: kiểm thử đến lớp API/LiveKit mock, không ghi nhận giả kết quả thiết bị thật.

## 1. Tóm tắt có kiểm chứng

| Phạm vi | Kết quả | Cách xác minh |
|---|---|---|
| Unit, API HTTP và hồi quy | **408/408 PASS** | `npm test`, Node.js v22.16.0 |
| QA phát hành **đầy đủ**, không phải `--fast` | **11/11 nhóm PASS** | `npm run qa:release`; xem `automation-results.json` |
| Từng phòng Voice/Cam × Ivory/Espresso × 320, 390, 430, 768 px | **16/16 PASS** | `python3 tests/browser_room_v075.py` |
| Menu Live/PK × 320/390/430 px × Voice/Cam × hai chủ đề | **12/12 PASS** | `python3 tests/browser_live_options_v0832.py` |
| Chat dồn dập, cuộn, giữ bản nháp | **4/4 PASS** | `python3 tests/browser_chat_resilience_v089.py` |
| Người xem mất kết nối/reconnect | **2/2 PASS** | `python3 tests/browser_audience_reconnect_v0816.py` |
| Chuyển chủ đề, đổi phòng, trả lời mạng trễ | **5/5 PASS** | `python3 tests/browser_theme_session_v0820.py` |
| HTML độc lập Voice/Cam sáng/tối | **4/4 PASS** | `python3 tests/browser_standalone_theme_v0818.py` |
| CSS parse cấp cao nhất | **31 stylesheet, 0 lỗi** | `tinycss2` |
| Native dependency/typecheck/Expo Doctor | **BLOCKED / NOT_RUN** | `node scripts/verify_native.mjs --json` |
| Android/iOS APK/IPA, LiveKit SFU thật, âm thanh/camera hai máy | **NOT_RUN** | Cần dependency, cấu hình staging và thiết bị vật lý |

`QA PASS` của trình kiểm tra cấu hình Native chỉ có nghĩa nó **chạy xong và trả cảnh báo có cấu trúc**, không có nghĩa ứng dụng Native đã đủ điều kiện build.

## 2. Lỗi thực tế được tìm bằng kiểm thử đối kháng

### Lỗi A — Phó phòng vượt quyền trên ghế nói

**Trước khi sửa:** host cấp quyền phó phòng cho A và B, B được lên ghế. A gửi trực tiếp `POST /api/rooms/:id/live/seat` với `userId=B, enabled=false` và máy chủ chấp nhận; test tái hiện FAIL vì thiếu HTTP 403.

**Sau khi sửa:** `Stage.speaker()` kiểm tra cả vai trò **đích**; phó phòng chỉ cấp/thu hồi ghế của người xem. Thao tác vượt quyền bị từ chối `403` **trước khi gọi `updateParticipant` tới SFU**. Chủ phòng vẫn có quyền thu hồi ghế của phó phòng.

Bằng chứng: `server/test/live_seat_privilege_v0843.test.js` và ca HTTP trực tiếp trong `server/test/live.test.js`.

### Lỗi B — Thành viên hết heartbeat nhưng publication trên SFU chưa được thu hồi

**Trước khi sửa:** `Stage.clean()` chỉ xóa người hết hạn khỏi Map, không gọi LiveKit `removeParticipant`. Vì vậy thành viên có thể biến mất khỏi UI nhưng phiên phát cũ vẫn chưa được yêu cầu ngắt.

**Sau khi sửa:** trước khi gỡ thành viên hết hạn, lưu fence `pending` trong store, đánh dấu chưa xác nhận ngắt và chủ động gọi `remove`. Thành viên không được cấp token mới khi SFU chưa xác nhận ngắt. Nếu SFU từ chối, fence vẫn giữ, có cửa sổ thử lại; quét định kỳ 10 giây còn xử lý fence sót sau khi backend restart. Lỗi của vòng quét được ghi log, không làm tiến trình ngã vì một lần quét thất bại.

Bằng chứng: các ca kiểm thử `stale SFU participant`, `failed stale-member removal`, `pending revocation blocks re-entry`, `orphan token fence`, `presence TTL` và `idle sweeper retries` trong `server/test/live_seat_privilege_v0843.test.js`.

**Giới hạn quan trọng:** bài test mô phỏng `LiveKitBridge.remove`, không xác nhận driver/phần cứng của một thiết bị thực sự ngắt mic/camera. Đây là bản vá kiểm soát quyền **phía máy chủ**, không phải chứng chỉ an toàn media thực tế.

## 3. Kiểm thử web và UX đa thiết bị

- 16 tình huống sân khấu: room chat trong vùng nhìn, kích thước nút, khoảng cách, danh sách người xem, PK và kết quả trên màn 320–768px.
- 12 tình huống menu Live: chỉ một `•••`, xem báo cáo, mở kết quả PK, không có toolbar/quản trị trùng nhau.
- 4 tình huống chat dồn dập; 2 khôi phục danh sách người xem; 5 chuyển theme/đổi phòng cùng yêu cầu mạng trễ.
- 4 tình huống HTML độc lập: nền Ivory/Espresso, Voice/Cam, PK và không gặp lỗi JavaScript trong ca đã chạy.
- 11 nhóm QA phát hành gồm kiểm tra focus/keyboard, kích thước vùng chạm, `prefers-reduced-motion`, giao diện và chat.

**Bài kiểm thử cũ v0.7.5:** một assertion chỉ nhận chính xác `Bản xem trước` trong khi UI dùng `BẢN XEM TRƯỚC`. Đây là lỗi kỳ vọng của test, không phải hỏng thao tác: sửa so khớp không phân biệt hoa/thường và chạy lại **16/16 PASS**. Không sửa giao diện để che lỗi test.

## 4. Những phép thử không thể hoàn tất ở đây

1. `mobile/package-lock.json` và cây dependency cài bằng `npm ci --strict-peer-deps` chưa có; **Native dependencyGate=BLOCKED**.
2. Chưa có staging API HTTPS và application ID Android/iOS thuộc quyền sở hữu dự án; **deviceConfigGate=NEEDS_CONFIGURATION**.
3. Expo Doctor, TypeScript semantic check, APK/IPA, EAS development build, microphone/camera vật lý, Bluetooth, chuyển Wi-Fi/4G và SFU thực tế **NOT_RUN**.
4. Thử hai browser nối trực tiếp tới localhost bằng Chromium trong sandbox này gặp `net::ERR_BLOCKED_BY_ADMINISTRATOR`; không tính là lỗi Túttt cũng không ghi PASS. Các API HTTP vẫn được thử thực tế bằng bộ Node.js, còn luồng UI được kiểm thử riêng bằng browser fixture. Tệp `tests/browser_real_backend_v0843.py` dành để tái chạy trên môi trường trình duyệt cho phép localhost.
5. Backend hiện lưu stage và presence trong bộ nhớ tiến trình; chưa nghiệm thu triển khai đa process/multi-node hoặc sức chịu tải production. Xác thực khách là cơ chế demo, không thay thế tài khoản thực.

## 5. Mốc nghiệm thu tiếp theo

Cài thư viện với npm registry hoạt động → ghi lockfile do npm tạo, chạy `npm ci` nghiêm ngặt → `npm run verify:native -- --device` → development build Android/iOS → kiểm thử hai thiết bị có SFU thật với 4 kịch bản bắt buộc: rút quyền mic/camera giữa lúc đang phát, hết heartbeat, đổi Wi-Fi sang 4G rồi quay lại, và Bluetooth/headset trong lúc có người nghe.

Bản phát hành này **không thay đổi UI**, không thêm nút hoặc tăng chuyển động. Lưu lại các log/ảnh trong `docs/qa-v0843` cùng test tương ứng; không suy kết luận về thiết bị thật từ mock hoặc ảnh chụp.
