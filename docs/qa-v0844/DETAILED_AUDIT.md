# TÚTTT v0.8.44 — BIÊN BẢN RÀ SOÁT TOÀN HỆ THỐNG VÀ NÂNG CẤP

Ngày: 13/11/2026  •  Nguồn: mã nguồn v0.8.43 (không xây lại từ bản mẫu)  •  Phạm vi: web/prototype, backend HTTP, quản lý phòng, Voice/Cam/PK, quyền truy cập, hồ sơ, LiveKit, Native, UI responsive, quy trình nghiệm thu.

## 1. Kết luận có điều kiện

Bản v0.8.44 **đạt các phép kiểm thử tự động được liệt kê** và khắc phục các lỗi nghiệp vụ đã tái hiện. **Chưa thể kết luận toàn bộ ứng dụng hoạt động ổn định trên điện thoại thật hoặc môi trường production**: cây dependency Native, build APK/IPA, media SFU thực, Bluetooth và chuyển mạng vẫn chưa nghiệm thu.

| Phép kiểm thử | Kết quả thực tế | Bằng chứng / phạm vi |
|---|---:|---|
| Hồi quy Node.js/API/unit | **421/421 PASS**, 0 skip | `npm test` (`server/test/*.test.js`, `tests/*.test.js`) |
| QA phát hành đầy đủ, gồm extended | **14/14 nhóm PASS** | `npm run qa:release -- --extended`, `docs/qa-v0844/AUTOMATED_QA.md`, `automation-results.json` |
| Kiểm thử mới đối kháng, viết trước khi sửa | **9 lỗi/nhánh tái hiện; 9/9 PASS sau sửa** | `server/test/system_integrity_v0844.test.js` |
| Kiểm thử API HTTP thật qua Node fetch | **4/4 PASS** | `server/test/http_system_e2e_v0844.test.js`; cookie + backend listener thật, không phải hai điện thoại |
| Hồ sơ thật + loại bỏ điều khiển giả trên Chromium | **6/6 PASS** | `tests/browser_profile_connected_v0844.py`, `docs/qa-v0844/profile-controls-v0844.json` |
| Voice/Cam × hai theme × 320–768 px | **16/16 PASS** | Nhóm trình duyệt `tests/browser_room_v075.py` và báo cáo phát hành |
| Menu Live/PK × 320–430 px | **12/12 PASS** | `tests/browser_live_options_v0832.py` |
| CSS | **31 stylesheet không có lỗi parse cấp cao nhất** | Quét `tinycss2`; không khẳng định CSS không còn sai lệch thị giác |
| TypeScript/TSX Native | **16 tệp qua kiểm tra cú pháp** | Không phải `tsc --noEmit` đầy đủ |
| npm Expo/LiveKit dependency | **BLOCKED** | Chưa có `mobile/package-lock.json`, thiếu cài đặt dependency, registry DNS `EAI_AGAIN` |
| Cấu hình để build trên thiết bị | **NEEDS_CONFIGURATION** | Chưa có app ID Android/iOS sở hữu thật và `EXPO_PUBLIC_TUTTT_API_URL` |
| TypeScript semantic / Expo Doctor / APK/IPA | **NOT_RUN** | Cần dependency hợp lệ và môi trường build |
| SFU media hai thiết bị, Bluetooth, Wi-Fi ↔ 4G | **NOT_RUN** | Chưa có development build + thiết bị + LiveKit SFU thật |

**Diễn giải:** Một nhóm QA “PASS” chỉ khẳng định script của nhóm đó hoàn tất theo phạm vi nó đo. Không suy diễn từ mock LiveKit, ảnh Chromium, cú pháp TS/TSX hoặc QA báo cáo Native sang chất lượng media thực tế.

## 2. Ma trận kiểm tra tính năng

| Phân hệ | Đã thực sự kiểm tra | Trạng thái và tồn tại |
|---|---|---|
| Phiên khách, xác thực | `POST /api/session`, cookie, `GET /api/me`, hạn chế origin, phân quyền endpoint | **Đạt kiểm thử API**; phiên khách hiện vẫn là cơ chế demo, chưa phải tài khoản production |
| Hồ sơ cá nhân | Đổi tên và giới thiệu → `PATCH /api/me` → dữ liệu lưu qua `Store`; tải lại và đồng bộ tên host | **Đã sửa và đạt HTTP + Chromium**; chưa phải hệ thống hồ sơ xã hội hoàn chỉnh |
| Danh sách phòng, tham gia/rời, khóa phòng | Room CRUD cơ bản, `join`, `leave`, khóa phòng, heartbeat | **Đạt**; thành viên đã vào không còn bị rớt heartbeat chỉ vì host khóa phòng |
| Chat & SSE | Gửi/đọc tin, chat dồn dập, đổi theme/room, SSE, rate limit/nguồn gửi | **Đạt phạm vi tự động**; chưa kiểm thử tải đồng thời lớn/đa server |
| Danh sách người xem | Đếm và mở bảng người trong phòng, reconnect, danh sách Native ảo hóa từ các bản trước | **Đạt UI**; chưa benchmark Native thiết bị yếu thật |
| Ghế Voice/Cam | Giới hạn 8 Voice / 6 Cam, giữ ghế host, xin ghế, duyệt, rời ghế, lời mời, thu hồi | **Đã sửa và đạt mock/API**; chưa kiểm chứng camera/mic phát vật lý |
| Host/phó phòng/người xem | Backend kiểm tra cấp bậc người thao tác và đối tượng; chống race khi người nhận đổi vai trò | **Đã sửa và đạt kiểm thử đối kháng**; không chỉ ẩn nút ở frontend |
| Media/LiveKit | Cấp token, heartbeat, fence thu hồi, loại stale, callback SFU mô phỏng | **Đạt mock**; teardown và driver phần cứng chưa nghiệm thu |
| PK | Lời mời, đồng ý, hủy, điểm tiếp sức miễn phí, kết thúc, menu/kết quả | **Đạt backend và UI mô phỏng**; chưa truyền media liên phòng thực |
| Báo cáo vi phạm | Gửi báo cáo, tránh trùng, đọc hàng đợi, khóa riêng người vận hành | **Đạt HTTP/quyền**; chưa có quy trình vận hành production đầy đủ |
| Chặn và kiểm soát chat | Endpoint block, moderation, khóa chat, chế độ chat chậm | **Có kiểm thử backend hiện hữu**; cần bổ sung E2E nhiều tài khoản thật |
| Chủ đề và responsive | Ivory/Espresso, 320/390/430/768, typography, focus, reduced motion, menu duy nhất | **Đạt Chromium** trong ma trận đã chạy |
| Các nút xã hội, thống kê | Không còn nút Quà tặng/Thả tim giả trong thanh Live; số follower/huy hiệu chỉ ở demo | **Đã chỉnh để tránh giả dữ liệu**; chức năng xã hội thật chưa phát triển |
| Native Expo/LiveKit | Tên SDK, cấu hình permission, mô phỏng bảo vệ media | **Chỉ kiểm tra tĩnh + mock**; dependency/build/typecheck semantic BLOCKED |

## 3. Lỗi tái hiện trước sửa, kết quả sau sửa

### Lỗi 1 — Vượt giới hạn ghế Voice
- **Trước:** Khi host tạm rời ghế, luồng duyệt/mời có thể lấp đủ 8 ghế; host quay lại làm vượt 8.
- **Sau:** Nhánh Voice/Cam luôn giữ chỗ cho host khi host đang vắng; kiểm tra giới hạn ở cả các nhánh `seat`, `invite`, `invite-respond`.
- **Bằng chứng:** `server/test/system_integrity_v0844.test.js` (reserved host seat).

### Lỗi 2 — Quyền tồn tại quá hạn hoặc vượt cấp
- **Trước:** Nhánh cấp ghế/mời có thể dùng role còn lưu trên Map cho thành viên đã hết hạn; phó phòng gửi lời mời cho phó phòng ngang cấp; đặc biệt người được mời có thể được nâng quyền sau lúc mời nhưng trước lúc chấp nhận.
- **Sau:** Dọn/đánh giá lại trạng thái trước hành động, kiểm tra vai trò **ngay lúc chấp nhận** lời mời, từ chối vượt quyền và không gọi SFU khi không đủ quyền.
- **Bằng chứng:** 4+ ca trong `system_integrity_v0844.test.js`, HTTP `http_system_e2e_v0844.test.js`.

### Lỗi 3 — Khóa phòng làm gián đoạn thành viên hợp lệ
- **Trước:** Room `locked` từ chối cả yêu cầu làm mới presence của thành viên đang ở bên trong.
- **Sau:** Cho phép thành viên hợp lệ làm mới heartbeat, vẫn từ chối người mới.
- **Bằng chứng:** Unit + HTTP kiểm tra hiện diện, outsider bị chặn.

### Lỗi 4 — Người nghe Voice WebRTC cũ mất hiện diện
- **Trước:** Heartbeat Voice chỉ cập nhật danh sách tạm nhưng không làm mới bản ghi presence trong store.
- **Sau:** Cập nhật cả presence và tên hiển thị, hạn chế người đang nghe tự biến mất khỏi danh sách.
- **Bằng chứng:** `system_integrity_v0844.test.js` (presence TTL).

### Lỗi 5 — Hồ sơ và nhãn host không đồng bộ
- **Trước:** Bio chỉ được lưu tại trạng thái giao diện, tên mới chưa đồng bộ sang một số nhãn và roster.
- **Sau:** Backend lưu `bio`, trả về trong phiên, tên host được cập nhật, Web/Native gọi PATCH thật; lỗi lưu không còn bị báo thành công giả.
- **Bằng chứng:** Unit persistence/reload, HTTP PATCH/GET, 6 ca Chromium kết nối giả lập API.

### Lỗi 6 — Điều khiển/đếm xã hội mô phỏng nhưng hiển thị như thật
- **Trước:** Nút Quà tặng/Thả tim trong Live chưa có đồng bộ sự kiện thật; hồ sơ kết nối server vẫn có follower/huy hiệu dạng mẫu.
- **Sau:** Loại nút không có tác dụng trên Web + Native; tách nhãn/đếm minh họa khỏi màn hình đang kết nối thật; **giữ PK Tiếp sức** bởi phía server có điểm cổ vũ miễn phí.
- **Bằng chứng:** `tests/browser_profile_connected_v0844.py`; kiểm tra nút Voice/Cam và profile.

## 4. Ma trận QA trình duyệt mở rộng

14 nhóm `qa:release -- --extended` đạt: backend + unit, Node cú pháp, Native static doctor có cảnh báo, xuất HTML một tệp, màn hình/độ tương phản, vùng chạm/keyboard, giảm chuyển động và điều hướng không thừa nút, menu Live/PK, sân khấu, HTML độc lập, hồ sơ kết nối + nút Live, chat tải dồn, reconnect người xem và chuyển theme không remount.

Tệp tự động: `docs/qa-v0844/AUTOMATED_QA.md`, `docs/qa-v0844/automation-results.json`. Kết quả 6 ca Chromium kết nối giả lập API: `docs/qa-v0844/profile-controls-v0844.json`.

**Kiểm thử hồi quy lịch sử ngoài bộ phát hành:** `tests/browser_qa_v056.py` và `tests/browser_qa_v057.py` hiện thất bại vì tự tải thủ công chỉ các stylesheet/script của giao diện v0.5.6/v0.5.7, rồi kiểm tra DOM v0.8.44. Đây là **nợ kiểm thử cũ**, không suy diễn thành lỗi sản phẩm mới; các ca hiện hành dùng toàn bộ tài nguyên thực tế và đạt. Hai kịch bản cũ chưa được chuyển đổi thành harness mới nên không tính là PASS.

## 5. Rủi ro còn mở và mức ưu tiên

**P0 — Điều kiện chặn phát hành Native:** npm registry trả `EAI_AGAIN`, `mobile/package-lock.json` chưa được tạo hợp lệ, `node_modules` thiếu. Chạy `npm ci --strict-peer-deps`, `expo install --check`, Expo Doctor, `tsc --noEmit`, build development Android/iOS trên máy có mạng; không sử dụng `--legacy-peer-deps` để che xung đột mà không kiểm chứng.

**P0 — Media thực tế chưa xác nhận:** thử hai điện thoại, mic/camera khi bị rút quyền, tắt camera khi background, headset Bluetooth, đổi mạng Wi-Fi/4G và SFU LiveKit thật. Mock không xác minh được driver hoặc âm thanh thực.

**P1 — Tài khoản/đồng bộ đa node:** xác thực guest, store JSON, presence và stage Map trong bộ nhớ, giới hạn SSE hiện thích hợp trình diễn local. Chưa thử scale nhiều tiến trình, phục hồi khi node bất ngờ chết, backup/migration dữ liệu.

**P1 — Chức năng xã hội thực:** follower, huy hiệu, quà tặng trả phí và dịch vụ thông báo/phương thức thanh toán chưa có backend đầy đủ; phải giữ ẩn hoặc nêu rõ ở chế độ demo, tránh số liệu giả trong giao diện thật.

**P2 — Nợ kiểm thử:** chuyển hai bài QA trình duyệt cũ v0.5.x sang harness mới hoặc loại bỏ có biên bản; bổ sung kiểm thử đa tài khoản trực tiếp giữa hai browser trên hạ tầng cho phép localhost, và đo stress test mạng.

## 6. Lệnh tái lập / nghiệm thu tiếp theo

```bash
npm test
npm run check:web
npm run qa:release -- --extended
node scripts/verify_native.mjs --json
# Chỉ khi dependency và Android/iOS config đã đủ:
# npm --prefix mobile ci --strict-peer-deps
# npm run verify:native -- --device
# Tạo development build, rồi thử với hai điện thoại và LiveKit SFU thực tế
```

Kết luận phiên bản: **v0.8.44 là bản sửa và tăng cường kiểm thử offline có bằng chứng**, chưa phải sản phẩm mobile đã nghiệm thu trên thiết bị thật. Không thêm animation/nút xã hội giả, giữ một nút `•••` và chat nổi theo định hướng tối giản.
