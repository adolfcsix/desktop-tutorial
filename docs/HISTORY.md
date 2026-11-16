# Túttt v0.8.50 — Unified Room Capacity & Native Readiness (13/11/2026)
> **v0.8.50:** Phòng chờ hiện thực thi sức chứa 80 người đồng nhất với Live Stage, giữ một vị trí cho host khi chưa vào; không tính lại lượt gia hạn hay phiên đã hết hạn. Đã kiểm thử API đồng thời và giữ nguyên giao diện. Xem [RELEASE_V0850.md](docs/RELEASE_V0850.md). Native/LiveKit SFU thật vẫn chưa nghiệm thu vì thiếu dependency, khóa và thiết bị.


## Lịch sử v0.8.49 — Kiểm chứng quyền quản trị SFU

Bản v0.8.49 tiếp tục từ v0.8.48 và không thay đổi Voice/Cam/PK, CSS, chuyển động hay bố cục màn hình.

- Bổ sung lệnh **chủ động** `npm run verify:livekit:admin`: xác minh chuỗi API quản trị SFU thực (`createRoom` → `listRooms` → `listParticipants` → `deleteRoom` → `listRooms`) trong phòng thử nghiệm ngẫu nhiên `tuttt-qa-*`.
- Việc ghi lên SFU chỉ xảy ra khi dùng `--run` trong script; chạy trực tiếp file không có `--run` sẽ **không** gọi mạng hay thay đổi phòng.
- Khi không xác nhận được phòng thử nghiệm trống, hệ thống **không tự xóa** vì `deleteRoom` có thể ngắt người đang tham gia. Nếu xóa thất bại hoặc không xác minh được phòng đã biến mất, trả FAIL/SAFETY_HOLD chứ không báo PASS.
- Có timeout cho RPC và cảnh báo nếu `createRoom` có thể hoàn tất muộn dù phía client đã hết hạn; trường hợp này cần quản trị viên kiểm tra phòng tạm bằng tên được ghi trong báo cáo.
- Bổ sung 11 bài kiểm thử sử dụng SFU giả lập để kiểm tra thứ tự gọi, xử lý timeout và bảo vệ dữ liệu. Những ca này **không** thay thế kiểm thử SFU thật, âm thanh hai chiều, thiết bị Android/iOS.

```bash
npm test
npm run check:web
npm run qa:release -- --fast
npm run verify:native -- --json

# CHỈ khi đã cấu hình LiveKit API key/secret thật, server SDK đã cài,
# và được phép tạo/xóa 1 phòng tạm trên SFU đích:
npm run verify:livekit:admin
```

Chi tiết: `docs/RELEASE_V0849.md`. Vẫn cần môi trường npm hoạt động để cài dependency Expo/React Native, chạy TypeScript, Expo Doctor và build thiết bị thật.

---

# Túttt v0.8.48 — SFU RPC deadlines & durable replay quarantine (13/11/2026)

Tiếp tục từ v0.8.47, không thay đổi Voice/Cam/PK UI, logo, menu hoặc chuyển động.

- Bổ sung thời hạn chờ quản trị SFU (`TUTTT_SFU_RPC_TIMEOUT_MS`, mặc định **8000 ms**, tối đa **30000 ms**) cho `updateParticipant` và `removeParticipant`. Timeout được xem là **trạng thái SFU chưa xác định**, không phải ngắt thành công.
- Nếu kick không được SFU xác nhận, backend vẫn ghi fence bền vững và trả 502 có kiểm soát. Khóa tác vụ phòng được giải phóng sau timeout để người khác tiếp tục sử dụng.
- Nếu **grant quyền phát** bị timeout, giữ fence cách ly **100 giây** và yêu cầu một lượt ngắt SFU mới sau khoảng này trước khi cấp token lại. Không cho `leave` rồi `join`, quét định kỳ hoặc khởi động lại backend xóa cách ly sớm.
- Kiểm thử đỏ-trước-sửa cho SFU không phản hồi và bypass cách ly; thêm bài HTTP thật với SFU mock. Xem `docs/RELEASE_V0848.md`.
- Đây là timeout ở ứng dụng, **không hủy chắc chắn RPC đang chạy ở LiveKit**. Không chứng nhận trạng thái media vật lý; Native build/2 thiết bị vẫn cần kiểm chứng riêng.

```bash
npm test
npm run check:web
npm run qa:release -- --fast
npm run verify:native -- --json
```

---

# Túttt v0.8.47 — Short-lived LiveKit joins & fail-closed moderation (13/11/2026)

## v0.8.47 — LiveKit token TTL and failed-kick/ban safety

- The initial LiveKit JWT now expires after **90 seconds** (previously 300s) to reduce its reuse window on self-hosted SFU. **This is not an upper bound for SFU-refreshed credentials**, and token expiry does not stop an already-active publisher. Validate old-token behavior on the chosen LiveKit version and hosting mode before production.
- Kick and ban persist a **revoking** fence *before* calling the LiveKit management API. If removal cannot be confirmed, the backend records a **pending** fence, blocks further token issuance, removes local stage/presence, retries revocation on the idle sweep, and returns 502 without pretending the publisher was physically cut off.
- A ban is enforced by the application even when the SFU management API is temporarily unreachable; a kick alone does not create a ban.
- New adversarial tests first reproduced the previous failures, then verified failed kick, failed ban, restart persistence, normal kick and initial-join TTL. See `docs/RELEASE_V0847.md` and `docs/qa-v0847/AUTOMATED_QA.md`.
- No Live/PK UI additions. Android/iOS development builds and physical-device media are not certified by offline tests.


Tiếp tục v0.8.45, không thay đổi bố cục Live Voice/Cam/PK hoặc thêm điều khiển.

- **Khóa cấp JWT cùng thao tác quản lý phòng:** `/live/token` sử dụng `Stage.issueToken()` để chờ thao tác thu hồi ghế, hủy lời mời, kick/ban và rời phòng đang chạy. Ngăn JWT mới giữ `canPublish=true` trong lúc SFU đang xử lý thu hồi quyền.
- **Fail-closed khi SFU trả lỗi không xác định:** nếu `setPermission` thất bại hoặc không có xác nhận, đánh dấu participant cần ngắt media, yêu cầu SFU remove; nếu remove thất bại thì lưu reconnect fence và khóa cấp JWT mới tới khi đối soát thành công.
- Kiểm thử đỏ-trước-sửa: token refresh trong lúc revoke, API kick trong lúc token refresh, cập nhật quyền SFU thất bại, ngắt SFU thành công/thất bại, người dùng rời ghế. Dùng HTTP thật trong một tiến trình + SFU giả lập, **không phải nghiệm thu SFU/media thật**.
- Môi trường hiện tại vẫn không có cây dependency Native và lockfile có thể dùng để chạy Expo Doctor/tsc/build. Báo cáo tách PASS offline và BLOCKED/NOT_RUN.

Chi tiết: `docs/RELEASE_V0846.md`.

```bash
npm test
npm run check:web
npm run qa:release -- --extended
npm run verify:native -- --json
```

---

# Túttt v0.8.45 — An toàn cấp quyền media & hồi quy đa tài khoản (13/11/2026)

Tiếp tục từ v0.8.44. Không đổi UI, không thêm nút hoặc hiệu ứng. Tập trung vào:

- Ngăn kết quả cấp quyền SFU **đến muộn** bật mic/camera của thành viên hoặc người cấp quyền đã hết hạn; xác nhận lại trạng thái sau phản hồi, thu hồi participant và dùng fence bền vững nếu SFU lỗi.
- Chuyển kiểm thử Chromium v0.5.6/v0.5.7 sang bộ tải đầy đủ asset v0.8.x: 6 ca giao diện kiểm tra chat nổi, nút người xem, mic mute, trạng thái đang nói mô phỏng và responsive.
- Bổ sung HTTP đồng thời 7 tài khoản: giới hạn 6 ghế Cam bao gồm host, ngăn phó phòng vượt cấp và chống báo cáo trùng.
- QA `--extended` giờ bao gồm cả hai bộ kiểm thử lịch sử đã chuyển đổi. Báo cáo chi tiết: `docs/RELEASE_V0845.md`.
- **Giới hạn:** Chưa thể nghiệm thu npm/Expo dependency, `tsc --noEmit` đầy đủ, build APK/IPA, SFU thật, Bluetooth hoặc hai điện thoại do registry không phân giải DNS và môi trường không có thiết bị.

```bash
npm test
npm run check:web
npm run qa:release -- --extended
node scripts/verify_native.mjs --json
```

---

# Túttt v0.8.44 — Rà soát toàn hệ thống, sửa nghiệp vụ và tinh gọn Live (13/11/2026)

Tiếp tục từ v0.8.43. Bản này sửa những trường hợp đã **tái hiện bằng kiểm thử đỏ trước khi sửa**: giữ đúng giới hạn 8 ghế Voice khi host tạm rời sân khấu; loại tác động từ thành viên hết hạn; kiểm tra lại cấp bậc phó phòng lúc chấp nhận lời mời; giữ heartbeat khi khóa phòng; gia hạn hiện diện cho WebRTC cũ; lưu tên/bio hồ sơ lên máy chủ và đồng bộ tên host.

Giao diện giữ hai chủ đề Ivory/Espresso, chat nổi, bảng người xem mở từ nút đếm, menu Live/PK chung `•••`. Bỏ các nút **Quà tặng/Thả tim** minh họa trong Voice/Cam ở Web/Native, giữ **Tiếp sức PK** có điểm server. Ở chế độ kết nối thật, không hiện số follower/huy hiệu mẫu như số liệu thật.

- **421/421** bài Node.js/API/regression đạt; gồm 9 ca đối kháng và 4 ca HTTP tích hợp mới.
- **14/14** nhóm QA phát hành đầy đủ (`npm run qa:release -- --extended`); thêm 6 ca Chromium hồ sơ kết nối và điều khiển Live.
- **Native vẫn BLOCKED**: chưa có dependency Expo/LiveKit cài hợp lệ, lockfile Android/iOS/staging chưa đủ. TypeScript semantic, Expo Doctor, APK/IPA, âm thanh/video/SFU hai điện thoại thật chưa được nghiệm thu.
- Báo cáo đầy đủ: `docs/qa-v0844/DETAILED_AUDIT.md`; số liệu máy kiểm thử: `docs/qa-v0844/AUTOMATED_QA.md`.

```bash
npm test
npm run check:web
npm run qa:release -- --extended
npm run verify:native -- --json
```

---

# Túttt v0.8.43 — Nghiệm thu phân quyền và vòng đời SFU (13/11/2026)

Bản này nâng cấp từ v0.8.42, không thay đổi cấu trúc giao diện Voice/Cam/PK. Các lỗi được tái hiện bằng bài kiểm thử **thất bại trước khi sửa, đạt sau khi sửa**:

- Phó phòng gọi trực tiếp API để thu hồi ghế của phó phòng khác: backend hiện trả **403** trước khi tác động LiveKit; host vẫn được quản lý ghế, phó phòng vẫn quản lý người xem.
- Thành viên hết hạn heartbeat trước đây biến mất khỏi danh sách nhưng SFU không bị yêu cầu ngắt: giờ đánh dấu fence **pending**, chủ động gọi removeParticipant, khóa tái kết nối đến khi xác nhận, đồng thời tự quét mỗi 10 giây và thử lại khi SFU tạm lỗi. Fence còn sót sau khởi động lại cũng được quét.
- Bài kiểm thử Live cũ được cập nhật để kiểm tra nội dung "Bản xem trước" không phụ thuộc kiểu chữ hoa/thường; toàn bộ hành vi/nút vẫn giữ nguyên.

**Nghiệm thu:** `docs/qa-v0843/DETAILED_QA.md`. Kiểm thử SFU trong bản này sử dụng mock API; chưa có xác nhận từ hai điện thoại vật lý. Không được xem các bài PASS offline là chứng nhận tương thích driver, Bluetooth hoặc chuyển Wi-Fi/4G.

## Cách tự chạy kiểm thử

```bash
npm test
npm run check:web
npm run qa:release -- --fast
python3 tests/browser_room_v075.py
python3 tests/browser_live_options_v0832.py
npm run verify:native -- --device
```

---

## Túttt v0.8.42 — Cổng thiết bị độc lập và nghiệm thu minh bạch (13/11/2026)

Bản này sửa lỗi hai cổng xác minh Native tuy được đặt tên riêng nhưng trạng thái cấu hình thiết bị lại phụ thuộc vào `node_modules` và `package-lock.json`. `deviceConfigGate` giờ chỉ kiểm tra ID Android/iOS, HTTPS API, khai báo quyền media, EAS và dev client. Vì vậy khi đã cấu hình đủ, `deviceConfigGate=PASS` vẫn được ghi nhận trung thực dù `dependencyGate=BLOCKED`. Đây **không** phải bằng chứng rằng APK/IPA đã build hoặc LiveKit đã hoạt động trên điện thoại.

- `npm run verify:native -- --json` xuất các nhóm `dependencyGate`, `deviceConfigGate`, `configAuditGate` riêng và trả JSON khi ID Expo không hợp lệ; `--device` vẫn bắt buộc cả dependency lẫn cấu hình đạt.
- `npm run qa:release -- --fast` ghi trạng thái cổng Native độc lập vào báo cáo QA (không đổi PASS của các bài kiểm thử offline thành khẳng định build đã thành công).
- Kiểm tra thư viện không còn chấp nhận bản prerelease khi khai báo semver ổn định.
- Không sửa UI Voice/Cam/PK, logo hoặc bảng màu. Không thêm nút hay chuyển động.
- npm registry hiện vẫn không truy cập được (DNS `EAI_AGAIN`); **TypeScript semantic, Expo Doctor, native development build, media trên điện thoại chưa nghiệm thu**. Xem `docs/NATIVE_GATE_INDEPENDENCE_V0842.md` và `docs/V0842_QA.md`.

---

## Túttt v0.8.41 — Hai cổng nghiệm thu Native: dependency và thiết bị (12/11/2026)

Tiếp tục v0.8.40. Công cụ `npm run verify:native` phân tách `dependencyGate` (lockfile thật, npm ci, Expo SDK, prebuild config, Expo Doctor, TypeScript) với `deviceConfigGate` (định danh ứng dụng, API staging, quyền và môi trường). `technicalGate` giữ vai trò alias của dependencyGate để tương thích báo cáo cũ. Không đồng nhất nghiệm thu mã nguồn với APK/IPA hoặc hoạt động media thực. Không thay đổi bố cục Live/PK hay nút điều khiển.

Chi tiết: `docs/NATIVE_TWO_GATES_V0841.md`.

## Túttt v0.8.40 — Xác minh tắt media và chặn tái kết nối không an toàn (12/11/2026)

- Khi tắt mic/camera, xác nhận lại trạng thái publication của LiveKit, thay vì coi Promise resolve là track đã tắt. SDK xác nhận thành công nhưng track vẫn còn phát sẽ bị xử lý theo nhánh lỗi an toàn.
- Không cho phiên LiveKit mới bắt đầu trước khi quá trình teardown phiên cũ hoàn tất; nếu camera/mic chưa xác nhận dừng hoặc tín hiệu ngắt máy chủ chưa hoàn tất, giữ phòng ở trạng thái lỗi thay vì tự mở lại.
- Bổ sung 9 ca hồi quy Native cho lệnh OFF bị bỏ qua, lỗi thu hồi quyền và cuộc đua đóng/mở phòng. Không thêm nút hay hiệu ứng mới.
- `npm` registry vẫn trả `EAI_AGAIN` trong môi trường thực thi. Do đó chỉ kiểm tra mô phỏng/offline được đánh dấu PASS, còn typecheck Expo, APK/IPA và truyền media thực vẫn BLOCKED/NOT_RUN. Xem `docs/V0840_QA.md`.

## Túttt v0.8.39 — Native build identity & Expo SDK audit (12/11/2026)

- Bổ sung `mobile/app.config.js`: nhận `TUTTT_ANDROID_APPLICATION_ID` và `TUTTT_IOS_BUNDLE_ID` khi tạo development build. Nếu chưa cung cấp, vẫn dùng ID demo trong `app.json` và preflight tiếp tục cảnh báo; không tự tạo định danh giả hoặc secrets.
- `doctor:native` kiểm tra **effective Expo configuration** (bao gồm ID môi trường), quét toàn bộ `mobile/src/**/*.ts(x)` để phát hiện API RN 0.88 không còn hỗ trợ, và không crash khi gặp lockfile không hợp lệ.
- Xác minh 6 tình huống bằng kiểm thử hồi quy `tests/native_app_config_v0839.test.js`. Không chỉnh UI Live/PK; không thêm nút/hiệu ứng.
- Do npm registry trả **EAI_AGAIN**, typecheck Expo/TypeScript và build APK/IPA vẫn **BLOCKED/NOT_RUN**. Xem `docs/NATIVE_DEVELOPMENT_BUILD_V0839.md` và `docs/V0839_QA.md`.

## Túttt v0.8.38 — Strict native dependency gate (12/11/2026)

Tiếp tục từ v0.8.37, **không thay đổi giao diện Live/PK, không thêm nút và không tăng chuyển động**. Siết quy trình nghiệm thu npm/Expo/LiveKit: kiểm tra lockfile v3 đã phân giải, phiên bản dependency thực sự có trong `node_modules`, npm ci strict peer, `npm ls`, Expo Doctor và TypeScript. Lỗi cài đặt không được phép báo PASS nhờ thư viện cũ còn lại.

Môi trường chạy kiểm thử này **không phân giải được DNS npm registry (EAI_AGAIN), cache thiếu gói (ENOTCACHED)**. Do đó chưa có lockfile và node_modules đầy đủ, chưa typecheck Native hoặc build APK/IPA; `verify:native` trả **BLOCKED** đúng điều kiện. Xem [báo cáo v0.8.38](docs/V0838_QA.md) và [hướng dẫn cài đặt/kiểm tra](docs/NATIVE_DEPENDENCY_GATE_V0838.md).

## Túttt v0.8.37 — Native dependency/build verification (12/11/2026)

Tiếp tục từ v0.8.36, **không thêm nút hoặc hoạt ảnh**. Sửa prop `StatusBar.backgroundColor` không còn được React Native 0.88 hỗ trợ; ghim `expo-doctor` và kiểm tra bộ React/React DOM/RSC, thêm lệnh `npm run verify:native -- --install` (strict npm peers, không `--force` hay `--legacy-peer-deps`), kiểm tra lockfile/npm, Expo Doctor và semantic TypeScript. **Không gọi đây là Native-ready** khi thiếu thư viện, lockfile, môi trường ký build và phép thử trên thiết bị.

**Kết quả v0.8.37:** 366/366 unit/API/mock PASS; QA nhanh 4/4; browser 16/16; parse TS/TSX 16/16. `verify:native` vẫn **BLOCKED** (npm registry không phản hồi, thiếu `node_modules`/lockfile/API staging/ID ứng dụng thật). Chưa hoàn tất TypeScript semantic, expo-doctor, APK/IPA hoặc SFU/âm thanh hai điện thoại.

Tài liệu: [QA v0.8.37](docs/V0837_QA.md) · [Hướng dẫn Native verification v0.8.37](docs/NATIVE_BUILD_VERIFICATION_V0837.md).

## Túttt v0.8.36 — SDK matrix & fail-safe seat leave (12/11/2026)

**Nghiệm thu:** [Báo cáo QA v0.8.36](docs/V0836_QA.md) · [Quy trình device build & media](docs/NATIVE_DEVICE_READINESS_V0836.md). Chưa có APK/IPA hoặc typecheck đã đạt.

- Rà Expo SDK 58 / React 19.3 / React Native 0.88 / Node >=22.13.0 trước build.
- Dừng mic/camera tường minh khi rời ghế, kể cả sau khi quyền phát bị thu hồi; không dùng toggle để tắt.
- Thiếu lockfile/dependencies/API staging và ID ứng dụng thật được cảnh báo, không tuyên bố đã build thành công.



- Giữ nguyên UI/UX Live Voice/Cam, PK, menu `•••` thống nhất và Ivory/Espresso; không thêm nút trang trí.
- Native LiveKit kiểm tra `canPublishSources` riêng cho microphone/camera ngoài quyền ghế từ máy chủ; thu hồi từng nguồn phát không tự cấp lại quyền còn thiếu.
- Chặn bật camera trên foreground cho đến khi thao tác tắt camera khi app vào nền đã hoàn tất. Nếu native driver không xác nhận việc tắt, khóa bật lại cho đến phiên mới và nêu lỗi rõ ràng.
- Bổ sung `mobile/eas.json`, `mobile/.env.example` và `npm run doctor:native` để chuẩn bị development build. Không đặt API key/secret LiveKit vào client.
- Chi tiết quy trình build và **ma trận nghiệm thu hai điện thoại chưa thực hiện**: [`docs/NATIVE_DEVICE_READINESS_V0835.md`](docs/NATIVE_DEVICE_READINESS_V0835.md).
- Chưa gọi bản này là Native-ready khi chưa có build, typecheck đầy đủ, logs thiết bị và kết quả SFU hai chiều thật.

## v0.8.34 — Native Live lifecycle, đồng bộ quyền media và tối ưu người xem (12/11/2026)

- **Mic/camera:** roster từ server và quyền publish LiveKit được kiểm tra chung; khi host/phó phòng thu hồi ghế hoặc quyền camera, ứng dụng yêu cầu tắt track. Lệnh bật media hoàn tất muộn sau khi quyền bị thu hồi cũng phải tắt lại, không tự khôi phục.
- **AppState:** khi vào nền camera được tắt và khi mở lại không tự bật; mic giữ lựa chọn ban đầu nhưng việc chạy nền còn tùy quyền và cấu hình từng OS. Không tuyên bố đã kiểm chứng audio nền hoặc kết nối hai thiết bị thật.
- **Người xem:** danh sách mở từ nút đếm duy nhất; `SectionList` ảo hóa hai nhóm sân khấu/người xem, không dựng toàn bộ hàng cùng lúc. Số người chỉ hiển thị là đã xác nhận khi API presence hợp lệ.
- **Giao diện:** giữ Ivory/Espresso, PK, chat nổi và `•••` duy nhất; không thêm nút hoặc stylesheet mới.
- **Kiểm thử và giới hạn:** `docs/QA_V0834.md`; Node.js/API/mock LiveKit 343/343; Chromium bản xem trước Voice/Cam 4/4 và menu Live/PK 2/2. Chưa build Native, typecheck đầy đủ hoặc đo kiểm trên thiết bị thật.

## v0.8.33 — Khôi phục LiveKit an toàn, phân quyền Live và xử lý báo cáo (12/11/2026)

- **Native:** khi mất kết nối hẳn, bấm *Thử kết nối lại* tại dòng trạng thái (không thêm nút toolbar). Không tạo phiên mới nếu máy chủ chưa xác nhận ngắt phiên cũ; mic/camera không tự bật khi vào lại.
- **Quyền:** quản lý thành viên được lọc theo role và trạng thái kết nối; server vẫn xác thực tất cả thao tác. Kick thành công dọn SFU media fence.
- **Báo cáo:** mã tiếp nhận + chống gửi trùng; hàng đợi review riêng cho người vận hành qua API/CLI có khóa bí mật, ghi nhận audit và trạng thái. Không mở bảng quản trị công khai trong Live.
- **QA và chạy thử trên thiết bị:** xem `docs/QA_V0833.md`. Không tuyên bố kiểm thử thực trên 2 thiết bị hoặc SFU khi chưa có thiết bị/dịch vụ.

## v0.8.32 — Một menu Live, không trùng nút PK (12/11/2026)

- **Duy nhất một nút `•••` tại header phòng Live Voice/Cam**, giữ nguyên vị trí khi bước vào PK. Xóa nút `•••` thứ hai trên sân khấu PK và nút tắt quản lý phòng trùng ở Cam/web, React Native.
- Menu dùng chung có **Quản lý phòng** chỉ khi có quyền và dữ liệu quản lý hợp lệ; **PK & kết quả** khi đang đấu/kết thúc; **Báo cáo phòng** cho mọi người. Nút **PK** ngoài sân khấu vẫn là lối mở cho lời mời và bắt đầu trận lúc chưa PK.
- Mobile đã liên kết **Báo cáo phòng** tới endpoint `/api/reports`, giới hạn 8–250 ký tự, báo trạng thái đang gửi và kết quả thực tế. Không hiện báo cáo thành công khi chưa có máy chủ.
- Xóa selector CSS của các nút đã bỏ (không tạo thêm stylesheet), không thay đổi logo, màu nền Ivory/Espresso, điểm PK xác nhận bởi backend, quyền quản lý tại server, chat nổi, trạng thái mic/camera.
- Kiểm thử: `npm test`, `npm run check:web`, `npm run qa:release -- --fast`, kiểm tra JSX/TS syntax và `tests/browser_live_options_v0832.py`. Kết quả và giới hạn trong `docs/qa-v0832/QA_V0832.md`.

## v0.8.31 — Bớt nút, bớt chuyển động (12/11/2026)

- Bỏ **Top 3** ở Voice/Cam cả web và Native khi chưa có bảng xếp hạng từ giao dịch thật; xóa sheet dữ liệu giả và CSS liên quan. Không thay đổi mô hình quà tặng hay API.
- Không đếm chạy điểm PK qua nhiều giá trị trung gian: điểm hiển thị ngay khi có trạng thái được xác nhận; thanh thế trận vẫn cập nhật theo tỷ lệ. Bỏ nhịp pulse trang trí ở đầu PK, đồng hồ và hiệu ứng bay vào sân khấu; giữ trạng thái mic đang nói và phản hồi nút.
- Trong Native, bỏ lối vào **Quyền riêng tư** trùng với **Cài đặt**; nội dung quyền riêng tư vẫn ở trang Cài đặt.
- Không bổ sung nút cài đặt chuyển động. `prefers-reduced-motion` và `AccessibilityInfo.isReduceMotionEnabled` vẫn áp dụng.

# Túttt v0.8.30 — Clean Controls & Accessible Motion (12/11/2026)

Nâng cấp trực tiếp từ **v0.8.29**, ưu tiên **bỏ nút trùng, nút giả và tùy chọn không có giá trị sử dụng**. Giữ nguyên logo chính thức (SHA-256 `9212c3eaa8f83bbd095f07be93ee8c695977c869bf8c410971f1bb0090082647`), giao diện Ivory/Espresso, PK Voice/Cam, nút người xem và chat nổi.

- **Chỉ một nút Tạo:** bỏ dấu cộng trùng trong tiêu đề trang Live trên web và React Native; giữ nút **Tạo** nằm chính giữa thanh điều hướng.
- **Bỏ thông báo minh họa:** xóa chuông kèm chấm đỏ giả và công tắc nhận thông báo chưa kết nối backend; không mô phỏng thông báo chưa đọc thành trạng thái thật. Ở Live, ô tìm kiếm đã có nên không cần thêm nút kính lúp trên header.
- **Cài đặt gọn:** chỉ giữ lựa chọn hai chủ đề Ivory/Espresso thực sự hoạt động. Quyền riêng tư được giải thích bằng nội dung thông tin chứ không giả làm một nút mở trang chưa triển khai.
- **Không có nút Giảm chuyển động:** tự tôn trọng lựa chọn **Reduce Motion của hệ điều hành** qua CSS `prefers-reduced-motion` và `AccessibilityInfo` của React Native, không làm thêm công tắc trong ứng dụng.
- **Dọn code dư:** bỏ nhánh modal thông báo mẫu, handler công tắc, SVG chuông và CSS chỉ dùng cho chúng. Không thêm thư viện hay stylesheet.
- **Kiểm thử:** `npm test` **317/317 PASS**, `npm run check:web` PASS; Chromium **4/4** ca nút/tương tác, **6/6** trường hợp bố cục/typography và **6/6** ma trận 8 khu vực; PK Voice/Cam **4/4**, HTML độc lập **4/4**, chat dồn dập **4/4** ở lượt chạy riêng. TypeScript/TSX **13/13 parse**. Tài liệu: [`docs/qa-v0830/QA_V0830.md`](docs/qa-v0830/QA_V0830.md).
- **Giới hạn:** Chưa typecheck/build React Native cùng Expo dependencies và chưa nghiệm thu âm thanh LiveKit/Bluetooth/Wi-Fi/4G trên hai điện thoại thật. Bản HTML là demo UI offline.

---

# Túttt v0.8.28 — 2026 Youth Aesthetic & Full-App UI Audit (12/11/2026)

Nâng cấp từ v0.8.27, tập trung **tổng duyệt thẩm mỹ và độ nhất quán giao diện** của Khám phá, Live, Chat, Cá nhân, Cài đặt, cộng đồng, hội thoại, sheet và PK. Tham khảo xu hướng của Pinterest, Canva, Adobe, Material 3 Expressive nhưng giữ bản sắc Túttt, **không đổi logo**.

- **Ivory sáng / Espresso tối:** thống nhất nền, màu chữ, thẻ, đường viền, search, nút, tab và thanh trình duyệt; bảng màu tương ứng với React Native. Điểm nhấn Scarlet/Coral được dùng có chọn lọc, Jade chỉ dành cho trạng thái tích cực có bằng chứng.
- **UI/UX:** khắc phục banner hồ sơ sáng nhưng quá tối, cải thiện thẻ Khám phá/Live, hộp thoại, bố cục Chat và điều hướng; duy trì vùng chạm tối thiểu 44 px ở các điều khiển chính. Tôn trọng Reduce Motion.
- **Không ảnh hưởng nghiệp vụ PK:** giữ nguyên điểm PK Voice không lặp, WIN vàng kim – LOSS tím trắng, streak, nút người xem và thanh điều khiển đã chốt. Không thêm stylesheet hoặc thư viện mới.
- **QA:** `npm test` **310/310**, `npm run qa:release` **7/7 nhóm**, Chromium kiểm tra 8 khu vực × 320/390/430 px × Ivory/Espresso, các kịch bản chat dồn dập, Voice/Cam, viewer reconnect, chuyển theme; 13/13 tệp TS/TSX parse sạch. Xem [QA v0.8.28](docs/qa-v0828/QA_V0828.md) và [nguồn tham khảo + palette](docs/qa-v0828/DESIGN_RESEARCH_2026.md).
- **Giới hạn:** Bản React Native mới chỉ chỉnh mã và parse cú pháp, chưa build trên máy thật; LiveKit SFU/âm thanh/Bluetooth chưa nghiệm thu. Giao diện HTML độc lập chỉ mô phỏng nội dung demo, không tạo người dùng online thật.

---

# Túttt v0.8.27 — Durable Live Session Fence & Staging Preflight (12/11/2026)

Nâng cấp từ v0.8.26, **không thay đổi giao diện và logo đã duyệt**. Trọng tâm là xử lý tình huống backend khởi động lại trong lúc SFU vẫn có thể giữ kết nối media cũ.

- **Chống cấp token sau restart khi media cũ chưa được dọn:** `server/stage.js` lưu dấu phiên theo danh tính/phòng vào file DB **trước khi ký token**. Khi tiến trình khởi động lại, các dấu vết còn lại bị cách ly và chỉ được giải phóng sau khi LiveKit RoomService xác nhận đã ngắt danh tính cũ. SFU không phản hồi → `409`, không tiết lộ chi tiết nội bộ.
- **Rời phòng có xác nhận:** Sau khi SFU dọn thành công, dấu vết được xóa; nếu thất bại thì đánh dấu `pending` bền vững, vẫn cho người dùng rời phòng ở tầng ứng dụng. Không coi lỗi SFU là đã ngắt âm thanh thực tế.
- **Kiểm tra staging an toàn:** `npm run preflight:staging -- --web https://staging.example.com --api https://api.example.com --version 0.8.27` chỉ kiểm tra URL HTTPS công khai, trả về HTML Túttt, API hợp lệ và phiên bản; không tự đưa sản phẩm lên mạng, không chấp nhận URL chứa mật khẩu/token. Tên miền chỉ là ví dụ, không có staging thực tế ở địa chỉ này.
- **QA:** `npm run qa:release` hoàn tất **8/8 nhóm**, `npm test` **306/306 PASS**, 13/13 TS/TSX parse, logo gốc giữ nguyên. Kết quả tại [`docs/qa-v0827/QA_V0827.md`](docs/qa-v0827/QA_V0827.md).
- **Giới hạn:** Chưa có SFU đang chạy, chưa nghiệm thu âm thanh/video trên hai máy, chưa build Expo. File DB + fence chỉ phù hợp **một tiến trình**, chưa hỗ trợ nhiều node và **không thể hồi tố token cấp trước v0.8.27**. Xem [`docs/RESTART_FENCE_QA_V0827.md`](docs/RESTART_FENCE_QA_V0827.md).

---

# Túttt v0.8.26 — TinyFish Readiness & Media Rejoin Safety (12/11/2026)

Nâng cấp trực tiếp từ v0.8.25. Mục tiêu: tự động hóa kiểm định các luồng web có thể xác minh được và không cấp token LiveKit mới khi SFU **chưa xác nhận** đã ngắt phiên âm thanh cũ.

- **TinyFish đã kết nối và chạy thật** trên tài liệu LiveKit chính thức: [lịch sử trình duyệt](https://agent.tinyfish.ai/runs/33bce2ea-c61e-49d8-8bbc-d7ca60598d98). Đã xác minh hướng cấu hình SDK React Native/Expo và yêu cầu development build. **Không** gọi đó là kết quả test Túttt: bản hiện tại chưa có URL staging truy cập được từ trình duyệt cloud.
- **Chặn rejoin không an toàn:** Backend ghi nhớ phiên media chưa xác nhận ngắt trong bộ nhớ tiến trình. Khi yêu cầu token mới cùng danh tính/phòng, backend thử ngắt qua API SFU trước; chỉ cấp token nếu SFU phản hồi thành công. Lỗi SFU trả 409 không chứa thông tin nội bộ, vẫn cho rời phòng ở tầng ứng dụng. Các yêu cầu dọn đồng thời được hợp nhất để không gọi ngắt trùng.
- **Tự động kiểm thử** bằng `npm run qa:release`: chạy Node.js/unit/API, kiểm tra cú pháp, xuất HTML, Chromium PK Voice/Cam, Ivory/Espresso, chat dồn dập, audience reconnect và đổi chủ đề tại chỗ. Bản rút gọn `npm run qa:release -- --fast`. Báo cáo trong `docs/qa-v0826/`.
- **Không đổi giao diện đã duyệt:** giữ nguyên logo chính thức, PK Voice không lặp điểm, WIN vàng kim/LOSS tím trắng, nút người xem, chat nổi và hai chủ đề.
- **Giới hạn an toàn:** Trạng thái cách ly của server hiện nằm trong RAM, không bền qua restart hoặc hỗ trợ nhiều tiến trình. JWT LiveKit đã phát hành có thời hạn riêng nên chỉ cơ chế tại SFU mới xác minh ngắt media thực. Chưa chạy SFU trên thiết bị thật, chưa build iOS/Android và chưa thử âm thanh hai chiều, Bluetooth, Wi-Fi/4G. Xem [`docs/qa-v0826/QA_V0826.md`](docs/qa-v0826/QA_V0826.md) và [`docs/TINYFISH_BROWSER_QA_V0826.md`](docs/TINYFISH_BROWSER_QA_V0826.md).

---

# Túttt v0.8.25 — Live Exit Resilience & Stability Audit (12/11/2026)

Bản kiểm định và sửa lỗi **trực tiếp từ v0.8.24**, ưu tiên độ ổn định khi SFU không phản hồi đúng thay vì bổ sung tính năng hoặc hiệu ứng mới.

- **Lỗi đã xác nhận và xử lý:** Trước đây nếu LiveKit `removeParticipant()` báo lỗi, `Stage.exit()` dừng trước khi xóa người dùng khỏi danh sách của ứng dụng; API rời phòng có thể trả `502`. Giờ backend luôn dọn membership, ghế, hàng chờ và lời mời cục bộ, đồng thời trả `mediaDisconnectPending: true` nếu SFU **chưa xác nhận** ngắt media. Không tuyên bố remote track đã dừng.
- **Chống thao tác chồng nhau:** Nhiều yêu cầu rời cùng phòng/cùng người được hợp nhất. Trong khi đang dọn một kết nối, backend không cấp token kết nối lại cùng danh tính để lệnh xóa cũ không thể đá nhầm phiên mới (trả `409` để client thử lại sau).
- **Web:** Sau thao tác rời phòng, nếu API trả cảnh báo chưa ngắt SFU, hiển thị lời nhắc kiểm tra mic/camera. Không thêm nút, stylesheet hoặc thay đổi giao diện PK. Mobile API bổ sung kiểu dữ liệu cảnh báo; việc hiển thị cảnh báo native cần nghiệm thu trên thiết bị.
- **Hồi quy:** `npm test` **294/294 PASS** (4 trường hợp mới), `npm run check:web` PASS, parser TS/TSX **13/13**, Chromium **4/4 PK**, **4/4 chat dồn dập**, **2/2 audience reconnect**, **4/4 chuyển theme**, **4/4 bản HTML độc lập**, API chạy thật (health/create/join/leave và kiểm tra quyền) PASS. Logo và favicon được giữ nguyên.
- **Giới hạn rõ ràng:** Docker SFU và dependencies Expo chưa có trong môi trường; chưa thể chứng nhận nghe hai chiều, ngắt media tại SFU khi mạng mất, chuyển Bluetooth/Wi-Fi/4G, hay native build. Cấu hình LiveKit LAN vẫn là bản thử nghiệm không TLS, không triển khai Internet.

Chi tiết tại [`docs/qa-v0825/QA_V0825.md`](docs/qa-v0825/QA_V0825.md). Lệnh chuẩn bị SFU và nghiệm thu thiết bị vẫn ở [`docs/LIVEKIT_LOCAL_SFU_V0824.md`](docs/LIVEKIT_LOCAL_SFU_V0824.md).

---

# Túttt v0.8.23 — Native Roster Ordering & LiveKit Readiness (12/11/2026)

Nâng từ **v0.8.22**, ưu tiên chất lượng kết nối và nhất quán sáng/tối trước khi mở rộng tính năng.

- **Native Live:** Sửa roster trả về sai thứ tự; hàng đợi thao tác ghế/quản lý theo phiên; heartbeat không chồng request hoặc làm mới dữ liệu sai thời điểm; phòng mới không chờ request phòng cũ.
- **Hiệu năng:** Xóa lệnh gia nhập phòng bị gọi lặp khi mobile kiểm tra chat mỗi 3,5 giây; tránh cập nhật state khi danh sách tin nhắn không đổi.
- **Ivory / Espresso:** Sân khấu Cam trống ngoài PK trên mobile dùng nền sáng + chữ tối khi Ivory, nền Espresso trầm khi tối; không thay sân khấu PK đã chốt.
- **Kiểm tra triển khai:** `npm run preflight:live -- --url http://IP_MAY_CHU:8787 --require-livekit` xác minh đúng API Túttt và cấu hình LiveKit. Kiểm tra kết nối âm thanh thật vẫn cần build và hai thiết bị.
- **QA:** 285/285 Node.js PASS, kiểm tra cú pháp web/backend, 13/13 parser Native, 4/4 standalone PK, 4/4 visual PK, 4/4 chat dồn dập. Backend local trả 200 nhưng **LiveKit SFU chưa được cấu hình**. Typecheck native chưa chạy đầy đủ do thiếu dependencies Expo/React Native. Chi tiết tại [QA v0.8.23](docs/qa-v0823/QA_V0823.md).

---

# Túttt v0.8.22 — Live Control Safety & Theme Integrity (12/11/2026)

Nâng trực tiếp từ **v0.8.21**. Ưu tiên thao tác Live an toàn khi bấm nhanh và khi chuyển phòng, đồng thời giữ UI Ivory/Espresso nhất quán và sân khấu PK không bị dựng lại không cần thiết.

- **Voice:** Lên/rời ghế single-flight, khóa nút ghế/mic khi đang cập nhật và thông báo tại vị trí cũ. Phản hồi muộn sau khi rời/vào lại phòng không thay đổi trạng thái ghế mới.
- **Cam và PK:** Yêu cầu lên/rời Cam, duyệt thành viên, lời mời, cài đặt, quản lý và các hành động PK được gắn với phiên `roomId + navigation`; chặn kết quả cũ và thao tác lặp. Không tự bật mic/camera.
- **Hiệu năng:** Heartbeat Cam có cùng dữ liệu không dựng lại sân khấu/chat. Luồng camera xem trước được cấp quyền muộn sau khi rời phòng sẽ bị dừng; chỉ dùng trong bản thử cục bộ.
- **Thiết kế bảo toàn:** Ivory sáng, Espresso tối; Voice PK chỉ một cặp điểm trên thanh thế trận, WIN vàng kim/LOSS tím trắng, streak `xN`, nút người xem, chat nổi và logo gốc. Không thêm stylesheet hoặc nút/tab mới.
- **QA:** `npm test` **277/277 PASS**, `npm run check:web`, Chromium Cam **2/2** thao tác nhanh + phản hồi cũ, camera cấp quyền muộn **1/1**, chat **4/4**, theme **4/4** và join cũ **1/1**, HTML PK **4/4**, visual PK **4/4**, parser native **13/13**. [Biên bản QA v0.8.22](docs/qa-v0822/QA_V0822.md).
- **Giới hạn:** Chưa build native hoặc nghiệm thu âm thanh/video LiveKit trên hai điện thoại thật. Các bài mock API và Canvas/WebRTC không chứng minh chuyển Wi-Fi/4G/Bluetooth thực tế.

---

# Túttt v0.8.21 — Voice Session Boundaries & Live Stability (12/11/2026)

Tiếp tục từ **v0.8.20**, ưu tiên ngăn phản hồi Voice/Live trả về muộn làm sai phiên phòng khi người dùng chuyển phòng, rời phòng hoặc vào lại cùng một phòng.

- **WebRTC Voice:** `join`, `seat`, `refresh`, `mic-off` kiểm tra room ID và generation; những callback ICE/SDP/track cũ không tạo peer hoặc gửi signaling cho phiên mới. Không tạo peer từ người chưa được xác nhận trong roster. Rời phòng dọn peer/roster đồng bộ trước khi chờ `replaceTrack(null)`.
- **Live Cam:** `stage.changed` và heartbeat cũ không được ghi đè roster, `liveReady` hoặc bản nháp của phòng mới.
- **Giao diện:** Bỏ màu nền cố định khỏi ô nhập chat Voice; chủ đề Ivory/Espresso tiếp tục dùng bảng màu thống nhất. Không đổi điểm PK, WIN/LOSS, chuỗi thắng, bảng người xem, logo và hệ nút.
- **QA:** `npm test` **270/270 đạt**, kiểm tra cú pháp web, 7/7 bài mới cho Voice, 2/2 tình huống Cam callback cũ, 4/4 HTML PK, 4/4 chat dồn dập, 8/8 bố cục Voice và 6/6 giao diện ngoài Live. Báo cáo [QA v0.8.21](docs/qa-v0821/QA_V0821.md).
- **Giới hạn:** Chưa nghiệm thu LiveKit bằng hai điện thoại thật; chưa xác minh âm thanh hai chiều, chuyển mạng hoặc Bluetooth. Chưa build iOS/Android. Không coi test mô phỏng là thử nghiệm thiết bị thật.

---

# Túttt v0.8.20 — Theme Interaction & Room Session Safety (12/11/2026)

Phát triển trực tiếp từ **v0.8.19** theo định hướng **Ivory sáng rõ, Espresso tối thống nhất**, không gây giật hoặc mất dữ liệu khi tương tác.

- Chuyển theme Web **tại chỗ** mà không dựng lại màn hình: đồng bộ màu form, trình duyệt, trạng thái chọn và ghi nhớ chủ đề an toàn khi có bộ nhớ trình duyệt. Không cần thêm nút hoặc stylesheet.
- Bảo vệ **vòng đời tham gia phòng**: phản hồi join/token/voice cũ không ghi đè phiên mới; rời phòng khi còn chờ join có dọn trạng thái và bù leave nếu join hoàn tất muộn. Không tự bật mic/camera.
- Bảo toàn luật PK, điểm, WIN/LOSS, nút người xem, bảng chat, và logo Túttt chính thức; không đổi mã React Native đợt này.
- QA: `npm test` **263/263 PASS**, kiểm tra cú pháp Web, Chromium **4/4 tương tác theme**, **1/1 phòng cũ phản hồi muộn**, ngoài Live **6/6**, người xem **16/16**, chat dồn dập **4/4**, HTML độc lập **4/4**. Chi tiết: [QA v0.8.20](docs/qa-v0820/QA_V0820.md).
- **Giới hạn:** Chưa build ứng dụng iOS/Android, chưa kiểm tra âm thanh hai chiều, Wi-Fi/4G hoặc Bluetooth trên hai thiết bị thật.

---

# Túttt v0.8.19 — Complete Theme Consistency & Non-Live Polish (12/11/2026)

Nâng cấp từ **v0.8.18**. Áp dụng thiết kế **Ivory thật sự sáng / Espresso thật sự tối** không chỉ trong PK/Live, mà trên **Khám phá, Chat, hội thoại, Cá nhân, Cài đặt và các hộp thoại**.

- **Web — đồng nhất giao diện:** Thanh trạng thái và header không còn màu Ivory ở chủ đề tối; Khám phá sáng dùng thẻ nổi bật và banner Vibe sáng, giữ chữ tương phản rõ; Chat, ô nhập, thông báo và các trang hồ sơ/cài đặt bám một hệ màu. Chỉnh ngay trong `prototype/styles.css`, **không tạo thêm stylesheet hay thêm nút trùng**.
- **Chọn chủ đề:** Hai lựa chọn **Ivory · Sáng** và **Espresso · Tối** trong Cài đặt có trạng thái chọn rõ ràng, chạm tối thiểu 44 px; thay theme không cần rời trang. React Native dùng cùng kiểu lựa chọn và màu bề mặt nhẹ hơn ở Khám phá/Voice khi bật sáng.
- **Sửa lỗi logo bản HTML offline:** Trước đây logo được nhúng vào HTML ban đầu, nhưng header render bằng JavaScript lại trỏ tới `assets/tuttt-logo.png` nên logo có thể mất khi mở tệp độc lập. `scripts/build_standalone_preview.py` nay nhúng luôn tham chiếu bên trong mã được đóng gói. **Ảnh logo gốc không thay đổi.**
- **Không đổi:** Luật PK, điểm Voice không lặp, WIN vàng kim, LOSS tím trắng, chuỗi `xN`, trái tim trắng, danh sách người xem qua nút và hiệu ứng đang nói chỉ khi mic thực sự hoạt động.
- **QA:** `npm test` **261/261**; `npm run check:web`; Chromium giao diện ngoài Live **6/6**, sân khấu PK **8/8**, bản HTML độc lập **4/4**; parser TypeScript/TSX **13/13**. Báo cáo và ảnh tại [`docs/qa-v0819/QA_V0819.md`](docs/qa-v0819/QA_V0819.md).
- **Giới hạn:** Chưa build iOS/Android hoặc nghiệm thu LiveKit với hai điện thoại thật, Wi-Fi/4G và Bluetooth. Kiểm thử parser không thay cho build và kiểm tra phần cứng.

---

# Túttt v0.8.18 — Ivory / Espresso Theme Consistency (12/11/2026)

Nâng cấp trực tiếp từ **v0.8.17** theo yêu cầu **“sáng ra sáng, tối ra tối”**. Đồng bộ vỏ phòng, điều khiển, chat, thanh đầu phòng và bảng người xem ở PK Voice/Cam với bộ màu Ivory/Espresso. Trong Cam, **chỉ vùng video** giữ lớp phủ tối đủ đọc điểm và chat nổi; không kéo tông tối sang ô nhập, header hoặc các nút dưới cùng.

- **Web:** PK Cam sáng đổi từ nền nâu cũ sang Ivory `#F4EAE0` và chữ `#241B1C`; vùng video trống dùng kem/đất sáng hơn, có lớp tương phản dành riêng cho chữ trắng. PK Voice dùng cùng màu vỏ phòng Ivory/Espresso của ứng dụng, giữ hai mặt đấu Scarlet/Champagne, WIN vàng kim, LOSS tím trắng, chuỗi xN và điểm không lặp.
- **React Native:** Vỏ phòng khi mở PK tiếp tục bám `palette.bg`/`palette.ink`, nền video tách riêng; thông báo kết nối lại không dùng màu tối cố định trong chế độ sáng. `Appearance.setColorScheme(theme)` đồng bộ màu giao diện hệ thống theo lựa chọn trong ứng dụng. Không tự bật mic/camera.
- **Không tăng stylesheet:** Chỉnh trong `prototype/pk-v073.css`, `prototype/pk-voice-v077.css` và các component native hiện hữu; không thêm tab, button trùng hoặc hiệu ứng vô cớ. Logo và favicon chính thức không đổi.
- **QA:** `npm test` 256/256; `npm run check:web`; `python3 tests/browser_theme_v0818.py` 8/8; `python3 tests/browser_voice_result_v0814.py` 10/10; `python3 tests/browser_standalone_theme_v0818.py` 4/4; kiểm tra cú pháp Native 13/13. Xem [báo cáo chi tiết](docs/qa-v0818/QA_V0818.md).
- **Giới hạn:** React Native chưa build và chưa nghiệm thu với hai máy thật, Bluetooth, Wi-Fi/4G và chất lượng âm thanh hai chiều. Đánh giá ảnh/Chromium không thay thế kiểm tra thiết bị.

---

# Túttt v0.8.17 — Audience Sheet Polish & Foreground Freshness (12/11/2026)

Tiếp tục trực tiếp từ **v0.8.16**. Ưu tiên UX/UI: bảng người xem gọn, có phân cấp thông tin rõ giữa trạng thái đã xác minh và chưa đồng bộ, hai nhóm Trên sân khấu / Đang xem, avatar và nhãn chính mình. Không bổ sung nút mới, không thay logo hoặc PK Cam/Voice, không tạo hiệu ứng khi người xem thay đổi.

- **Web:** Trạng thái hiện diện được thể hiện bằng cụm thông tin gọn, phân biệt rõ bản minh họa, đang đồng bộ, mất tín hiệu và dữ liệu mới xác nhận. Tên dài được cắt gọn, giữ thứ tự thành viên, cuộn bảng và bản nháp chat khi phòng cập nhật. Tinh chỉnh tại `live-polish-v075.css` để không tạo thêm stylesheet trùng lặp.
- **React Native:** Một truy vấn danh sách người xem bắt đầu trước khi app xuống nền không thể trả về sau đó và được xem là dữ liệu vừa xác minh. Vòng đời background/foreground vô hiệu hóa yêu cầu cũ bằng epoch; không tự bật mic/camera hoặc xin quyền mới. Tinh chỉnh khoảng đệm của bảng người xem.
- **Không đổi:** WIN vàng kim, LOSS tím trắng, streak `xN`, thanh điểm PK không %, tim trắng, Ivory/Espresso, tên/logo Túttt.
- **Giới hạn:** không có quyền truy cập hai thiết bị thực trong môi trường này nên chưa thể xác minh chất lượng âm thanh hai chiều, Bluetooth và chuyển mạng Wi-Fi/4G trên iPhone/Android. Test mô phỏng không thay thế nghiệm thu thiết bị.

---

# Túttt v0.8.16 — Audience Reconnect & Stable Live (12/11/2026)

Tiếp tục trực tiếp từ **v0.8.15**. Ưu tiên chính: số người xem phải là **presence vừa được máy chủ xác nhận**, không hiển thị số và tên cũ như thể còn trực tuyến khi mạng bị ngắt hoặc lần tải danh sách thất bại.

- **Web:** `prototype/audience-presence.js` phân biệt `current / reconnecting / unavailable / syncing / demo`. Tại thời điểm chưa xác minh, nút người xem vẫn mở được nhưng hiển thị dấu `…`; bảng nói rõ tình trạng đồng bộ, không tự gọi dữ liệu cũ là đang online. SSE khôi phục sẽ tải lại danh sách. Trong phòng, `rooms.changed` **không render lại toàn bộ sân khấu**, giúp giữ mic, video PK, bản nháp chat và vị trí cuộn. Danh sách đang mở chỉ cập nhật nếu thực sự có thay đổi, giữ vị trí cuộn.
- **React Native:** định kỳ làm mới danh sách người xem, khi app xuống nền hoặc trở lại sẽ yêu cầu xác minh lại; lỗi mạng không để lộ danh sách/tỷ số thành viên cũ dưới nhãn đang online. Nút người xem vẫn là một điểm mở chung, không thêm tab hoặc button khác. Trạng thái LiveKit không bị đồng nhất với khả năng truy vấn audience HTTP.
- **Không đổi:** logo Túttt, Voice/Cam đã duyệt, WIN vàng kim, LOSS tím trắng, streak `xN`, thanh điểm không %, tim trắng, Ivory/Espresso, thao tác 44 px và chính sách chỉ người tham gia phòng mới đọc được danh sách.
- **Kiểm thử:** `npm test`, `npm run check:web`, `python3 tests/browser_audience_v0815.py`, `python3 tests/browser_audience_reconnect_v0816.py`. Native chưa build lên iPhone/Android; hai thiết bị thật, Bluetooth, chuyển Wi-Fi/4G và nghe hai chiều vẫn cần nghiệm thu riêng.

---

# Túttt v0.8.15 — Audience Count & Viewer Sheet (12/11/2026)

Nâng từ **v0.8.14**. Số người xem là **một nút có thể nhấn** trong cả phòng Voice và Cam. Khi nhấn, một bảng trượt gọn sẽ liệt kê người đang trong phòng, chia theo **Trên sân khấu** và **Đang xem**. Không thêm tab Người xem thường trực hay nút trùng ở thanh điều khiển. Trong PK Cam, nút ở đầu sân khấu PK là nút duy nhất; nút đếm phía sân khấu thường được ẩn.

- **Backend:** `GET /api/rooms/:roomId/audience` dùng presence 90 giây do máy chủ quản lý để đếm mọi người đã tham gia phòng, **kể cả người chưa tham gia voice/SFU hoặc chưa bật mic/camera**. Danh sách chỉ trả về tên hiển thị, ID công khai, vai trò và trạng thái trên sân khấu; không trả token, địa chỉ mạng hoặc bí mật. Người ngoài phòng bị từ chối `403`. Thành viên rời phòng/đã hết hạn sẽ biến mất sau khi presence được cập nhật; không tuyên bố là công cụ kiểm chứng người đang nghe âm thanh hai chiều.
- **Web:** Voice/Cam/PK dùng chung nút đếm, cập nhật khi người vào/rời và theo nhịp heartbeat. Sheet hiển thị số liệu thật khi có server; demo offline dán nhãn **dữ liệu minh họa** rõ ràng, không giả người đang online thật. Mở/đóng danh sách giữ nguyên bản nháp chat và sân khấu PK.
- **React Native:** Nút đếm 44 px ở đầu phòng, phân nhóm người trên sân khấu và đang xem, tải lại khi mở và đồng bộ định kỳ. Bảng không phụ thuộc kết nối LiveKit; ở bản demo không hiển thị danh sách người thật không có bằng chứng.
- **Không đổi:** Logo chính thức, hai theme Ivory/Espresso, WIN vàng kim, LOSS tím trắng, chuỗi xN, số điểm PK, tim trắng, giao diện phòng tối giản và luật server.

**Kiểm thử:** `npm test`, `npm run check:web`, `python3 tests/browser_audience_v0815.py` (16 màn hình và chế độ), `docs/qa-v0815/`. Chưa chạy build iOS/Android hoặc kiểm thử hai thiết bị thật. Số đếm là số người **đang được presence máy chủ ghi nhận** (heartbeat/TTL), không phải lượt xem tích lũy hoặc thống kê đã kết nối truyền thông.

---

# Túttt v0.8.14 — Voice PK Score & Result Clarity (12/11/2026)

Cập nhật trực tiếp từ v0.8.13 theo phản hồi người dùng về điểm hiển thị trùng lặp. **PK Voice chỉ hiển thị số điểm ở hai đầu thanh thế trận** (điểm thực, không hiện phần trăm). Đã bỏ hoàn toàn số điểm và dòng “ĐIỂM CỔ VŨ” nằm ngay trên WIN/LOSS ở hai ô chủ phòng, cả khi đang đấu lẫn lúc kết thúc.

- **Web:** Thay `pk-side-score` của nhánh Voice bằng `pk-voice-outcome-slot` cố định 34 px (29 px trên điện thoại nhỏ). Khi trận đang diễn ra, đây là vùng trống; khi có kết quả máy chủ xác nhận, hiển thị **WIN vàng kim / LOSS tím trắng / DRAW**, với huy hiệu chuỗi thắng `xN` của người thắng. Không làm thay đổi vị trí thanh thế trận, chat, ô nhập hay điều khiển. **PK Cam vẫn giữ điểm và kết quả trong từng khung video**, đúng bản đã duyệt.
- **React Native:** Bỏ số điểm trùng trong hai ô PK Voice, dùng một hàng kết quả chiều cao ổn định; score rail tiếp tục có điểm của A/B và chuyển động theo dữ liệu server. Không thay đổi logic điểm, streak, media, quyền và trạng thái mic.
- **Khả năng tiếp cận:** `aria-label` thanh điểm vẫn chứa điểm cả hai phe; WIN/LOSS giữ `role=status`, nội dung tỷ số có thể truy cập dù không vẽ số trùng.
- **Kiểm thử:** `npm test`, `npm run check:web`, kiểm tra Chromium ở 320–430 px với hai chế độ sáng/tối, thời gian tự tắt 3,2 giây, layout Cam hồi quy. Chưa build iOS/Android thực tế; việc thay layout Native mới chỉ được kiểm tra cú pháp.

---

# Túttt v0.8.13 — Native Session Handoff & Voice Connection Clarity (12/11/2026)

## Thay đổi từ v0.8.12
- **AudioSession tuần tự:** start/stop được đưa vào hàng đợi và kiểm tra thế hệ phiên trước khi chạy. Yêu cầu mở phòng cũ hoàn tất muộn không được phép ngắt âm thanh của phòng mới.
- **Chuyển phòng nhanh:** một yêu cầu `connect` cũ không còn chiếm lại phiên sau khi người dùng bắt đầu một lần vào phòng khác; trạng thái chờ tham gia backend trong `App.tsx` cũng không được mở LiveKit sau khi người dùng đã thoát; tự dọn membership cũ khi không còn phòng mới dùng cùng ID.
- **Dữ liệu quản lý Live:** kết quả thao tác ghế, lời mời, quản trị và cấu hình chỉ cập nhật đúng phiên còn hiệu lực; kết quả trả về muộn sau khi reconnect bị bỏ qua.
- **Thông báo khi PK đang hiển thị:** dùng chính nhãn kết nối ở thanh đầu phòng, không thêm một nhãn trùng lên sân khấu (không thêm nút, không che video/chat). Không tuyên bố chất lượng nghe hai chiều hoặc Bluetooth chỉ từ trạng thái tín hiệu.
- **Không thay thiết kế đã duyệt:** Ivory/Espresso; WIN vàng kim, LOSS tím trắng; chuỗi thắng xN; thanh PK hiển thị điểm; trái tim trắng.

## Giới hạn nghiệm thu
Đã có kiểm thử tự động và HTML xem trước web. **Chưa build React Native và chưa xác nhận audio hai chiều/Bluetooth/chuyển mạng bằng 2 điện thoại thật**. Xem `docs/NATIVE_CONNECTION_QA_V0812.md` và `docs/NATIVE_HANDOFF_QA_V0813.md` để nghiệm thu thiết bị. Kết quả tự động: `docs/qa-v0813/README.md`.

---

# Túttt v0.8.12 — Native Live Connection & Session Safety (12/11/2026)

Tiếp tục từ v0.8.11, ưu tiên **trạng thái kết nối trung thực trên iPhone/Android** và chống các tác vụ bất đồng bộ làm sai mic, camera hoặc dữ liệu phòng. Giao diện PK Cam/Voice, hai theme Ivory/Espresso, điểm thay %, WIN vàng kim, LOSS tím trắng, chuỗi `xN`, trái tim trắng và logo chính thức **không thay đổi**.

- **LiveKit native:** trạng thái `ĐANG VÀO` / `ĐANG NỐI` / `MẤT KẾT NỐI` được đặt trên nhãn Live có sẵn; mic và camera tạm khóa trong lúc kết nối lại. Không đánh đồng kết nối tín hiệu với việc thật sự nghe được âm thanh hoặc đã định tuyến Bluetooth.
- **An toàn phiên:** chống phản hồi roster/heartbeat muộn từ phiên cũ, kể cả cùng phòng; không cho kết nối cũ tắt AudioSession của kết nối mới; đóng camera được cấp phép sau khi rời phòng. Không tự bật mic/camera khi kết nối lại.
- **Sửa lỗi UI:** màn Khám phá React Native không còn tham chiếu tới `pkActive` ngoài phạm vi; đồng bộ metadata root/mobile/Expo ở `0.8.12`.
- **QA:** `npm test` **237/237 đạt**; `npm run check:web` đạt; **8 kiểm thử mô phỏng native mới** đạt. Kiểm tra cú pháp TS/TSX, chưa build app iOS/Android và chưa thử mạng/Bluetooth trên thiết bị thật.
- **Tài liệu nghiệm thu:** [Native LiveKit & chuyển mạng v0.8.12](docs/NATIVE_CONNECTION_QA_V0812.md). Thiết lập: [Server/LiveKit/Expo build](docs/SETUP_TECHNICAL_FROM_V047.md).

---

# Túttt v0.8.11 — Audio Route & Foreground Safety (12/11/2026)

Tiếp tục từ v0.8.10. Ưu tiên xử lý **đổi thiết bị âm thanh**, **quay lại ứng dụng sau khi xuống nền**, và trạng thái mic có bằng chứng, không tự phát lại âm thanh hay xin quyền mới.

- **Web Voice:** phản hồi ngắn nếu thiết bị âm thanh thay đổi khi mic đã bật; không tự khẳng định chuyển sang Bluetooth thành công; không gọi `getUserMedia` lần nữa. Nếu track xác nhận `ended` thì hạ mic, xóa viền đang nói và đồng bộ server. Timer và listener bị hủy khi rời phòng; chat và PK không render lại.
- **React Native/LiveKit:** đồng bộ mic/camera từ local publication khi mute/unmute, publish/unpublish, reconnected và trở về ứng dụng sau khi ở nền. Không tự bật mic/camera; roster trả về muộn không thể áp cho phòng khác.
- **Không thay** logo, hai theme, sân khấu PK, màu WIN vàng kim/LOSS tím trắng, chuỗi xN, điểm thật và nút trái tim trắng.
- **Nghiệm thu tự động:** 229/229 Node tests; `npm run check:web` đạt; Chromium 2/2 audio route (320/390 px), 4/4 chat burst, 4/4 roster/PK + giảm chuyển động, 4/4 HTML độc lập; 11/11 TS/TSX parse hợp lệ.
- **Chưa nghiệm thu Bluetooth hoặc chuyển mạng thực giữa hai máy**; chưa build native. Xem [QA, rủi ro và ma trận thử thiết bị v0.8.11](docs/AUDIO_ROUTE_FOREGROUND_QA_V0811.md).

---

# Túttt v0.8.10 — Microphone Permission & Reconnect UX (12/11/2026)

Tiếp tục v0.8.9, ưu tiên tính chính xác của microphone và trải nghiệm chat, không thêm nút hay đổi logo/PK Cam đã duyệt.

- **Mic an toàn khi thao tác bất đồng bộ:** không xin quyền trùng, không tự bật khi kết nối lại; quyền cấp muộn sau khi rời phòng/thu hồi ghế bị hủy ngay, dừng track và không gắn vào phòng khác.
- **Mất quyền và ngắt thiết bị:** xử lý từ chối quyền, không tìm thấy thiết bị, mic bị ứng dụng khác sử dụng, sự kiện track `mute`/`unmute`/`ended`. Xóa viền đang nói khi không có bằng chứng audio, hiện lý do rõ ràng bằng tiếng Việt.
- **Giữ chat và PK ổn định:** thông báo mic cập nhật trực tiếp thay vì dựng lại phòng; vị trí thông báo không che ô nhập tin ở màn hình 320 px. Nhãn mic ngắn vẫn hiển thị sau khi thông báo tự ẩn, có aria-label/tooltip đầy đủ.
- **React Native LiveKit:** khóa thao tác mic trùng; sau khi bật/tắt, đồng bộ từ track publication thật; không lấy kết quả từ thao tác cũ sau reconnect hoặc rời phòng. Chưa có build iOS/Android thật.
- **Không đổi** bảng điểm PK bằng điểm thật, WIN vàng kim, LOSS tím trắng, chuỗi thắng xN, thời gian reveal 3,2 giây, trái tim trắng, layout Voice/Cam và logo chính thức.

**Nghiệm thu:** 224/224 Node tests, `npm run check:web`, Chromium permission 2/2, nhiều người 4/4, chat burst 4/4, HTML độc lập 4/4; 11/11 TS/TSX parse không lỗi cú pháp. Chưa kiểm thử hai điện thoại hoặc 4G/5G thật. Chi tiết: [QA v0.8.10](docs/VOICE_MIC_PERMISSION_QA_V0810.md).

---

# Túttt v0.8.9 — Voice Reconnect & Burst Chat Stability (12/11/2026)

Xem [biên bản QA v0.8.9](docs/LIVE_VOICE_CHAT_RESILIENCE_QA_V089.md).

## v0.8.9 — Ổn định âm thanh và chat khi mạng chập chờn

- **Tự phục hồi WebRTC có giới hạn:** khi kết nối đến một người tham gia bị `disconnected`/`failed`, xóa ngay viền đang nói không còn căn cứ; đợi một nhịp để kết nối tự hồi phục trước khi gọi `RTCPeerConnection.restartIce()` (tối đa 3 lần, không tự bật microphone). Hủy mọi lịch thử lại khi peer rời phòng hoặc người dùng thoát.
- **Phân biệt chính xác trạng thái:** mất SSE chỉ có nghĩa **mất tín hiệu điều khiển**. Không kết luận âm thanh hai bên đã dừng nếu chưa có chứng cứ; khi SSE hồi phục thì làm mới roster Voice, PK và các tin nhắn bị bỏ lỡ.
- **Chat Live không phá DOM:** mỗi tin có ID máy chủ, bổ sung/cập nhật đúng dòng thay vì thay toàn bộ `innerHTML` phòng; giữ ô nhập đang gõ, con trỏ, vị trí cuộn và khung PK. Giới hạn 80 dòng Voice / 45 dòng Cam trong DOM, dữ liệu gốc vẫn do server quản lý.
- **Giảm bão yêu cầu:** sự kiện `room.changed` dồn dập được gom theo lượt tải và tải lại một lượt cuối nếu có thay đổi trong lúc đang tải; chặn phản hồi trễ từ phòng đã rời.
- **Phạm vi xác minh:** đây là bản web và mã React Native hiện hữu, **không** phải xác nhận rằng mesh WebRTC sẽ chạy ổn trên mọi mạng; SFU/TURN vẫn cần thiết để đảm bảo Voice production.


## Thay đổi từ v0.8.7

- **Cập nhật ghế tại chỗ:** `voiceSeats()` và `voiceSeatMarkup()` dùng chung cho lần dựng đầu và đồng bộ incremental. `syncVoiceSeatsDom()` nhận thay đổi người vào/rời, thứ tự ghế, tên và mic mà không thay thế DOM của chat, ô nhập hoặc sân khấu PK; giữ nguyên người đang gõ và vị trí focus.
- **Trạng thái có bằng chứng:** một ghế chỉ có viền xanh và dòng “Đang nói” khi `mic===true` **và** có ID trong danh sách phát hiện tiếng nói thực tế. Mic tắt có huy hiệu gạch chéo; mic không xác định không bị gán là đang nói. Nhãn được dành chỗ ổn định, không làm các ghế nhảy khi chuyển người nói.
- **UX phòng:** nút PK nằm cùng hàng với trạng thái Voice và Bật tiếng (vùng chạm 44 px), không còn đè lên mô tả phòng trên 320 px; số người nghe được đồng bộ tại chỗ trên nút đếm thành viên; hành động lên/rời ghế và bật/tắt mic, aria-label/aria-pressed đổi theo trạng thái thật, không dựng lại trang. Nhánh PK Voice cũng cập nhật huy hiệu và mic của host nhưng vẫn giữ nguyên thanh điểm, tin nhắn và kết quả.
- **Chuyển động:** viền xanh nhẹ, nhịp thở avatar giảm từ 7,5% xuống 4% ở mobile; hỗ trợ Giảm chuyển động (không hoạt ảnh). Ghế Voice trên máy 320 px/chiều cao ngắn được canh lại để dòng “Đang nói” không bị cắt.
- **Phạm vi không thay đổi:** WIN vàng kim, LOSS tím trắng, chuỗi thắng `xN`, thanh PK hiển thị **điểm** thay vì %, nút trái tim trắng, chat nổi và PK Cam đã duyệt; logo chính thức không chỉnh sửa.

### Nghiệm thu và giới hạn

Chạy `npm test` và `npm run check:web`. Kiểm thử Chromium: `python tests/browser_voice_roster_v088.py`, `python tests/browser_voice_lux_v087.py` và `python tests/browser_standalone_v087.py` (sau `python scripts/build_standalone_preview.py`). Các thành viên nhiều người trong bài kiểm thử trình duyệt là **fixture kiểm thử**, không phải tính năng giả lập âm thanh cho người dùng. WebRTC mesh chỉ là minh họa kỹ thuật, còn sản phẩm thực tế cần SFU/TURN và thử nghiệm mạng/thiết bị. React Native chưa qua build iOS/Android trên thiết bị thật; điều này không được coi là đã nghiệm thu sản phẩm.

---

# Túttt v0.8.7 — Refined Voice Arena & Mic State Consistency (12/11/2026)

Nâng trực tiếp từ **v0.8.6**, ưu tiên cải thiện UI/UX Live cho người trẻ nhưng vẫn thanh lịch, không đổi logo TUT, bản sắc Mocha Ivory / Espresso Night và sân khấu PK Cam đã được duyệt. **PK Voice** dùng chất liệu Ivory ấm, Scarlet/Champagne dịu và Espresso trầm, giảm viền không cần thiết, làm sáng rõ nhịp avatar – tên – điểm – thanh thế trận. Vùng thao tác vẫn tối thiểu 44 px; WIN vàng kim, LOSS tím trắng và chuỗi xN vẫn **nằm dưới điểm**, chỉ hiện 3,2 giây, không thêm popup hoặc nút Xem kết quả.

- `prototype/pk-voice-v077.css`: Tinh chỉnh hai bề mặt đối kháng, VS, viền avatar, màu chữ phụ, thanh điểm và đường chia. Không tăng chiều cao sân khấu; cân lại đệm ở 360 px để chừa không gian chat. Nút gợi ý viết lời cổ vũ đổi sang kiểu đường dẫn chữ gọn mà vẫn có vùng chạm/focus.
- `prototype/live-speaker-v057.css`: Viền xanh nhịp thở **chỉ** chạy khi có sự kiện audio đang nói thực; tắt chuyển động khi `prefers-reduced-motion:reduce`. Không dùng thanh sóng hoặc hiệu ứng mic giả.
- `prototype/app.js`: Sửa một lỗi trạng thái: trong luồng cập nhật Voice tại chỗ, huy hiệu **mic tắt** cạnh avatar ghế được thêm/gỡ theo `mic===false` / mic bật, và `aria-label` phản ánh đúng mic bật/tắt/chưa rõ. **Không dựng lại chat**, không làm mất bản nháp khi người dùng đang gõ.
- `mobile/src/components/PKDuelBoard.tsx`: Đồng bộ sắc độ Ivory/Espresso, đường viền và nhãn Voice; giữ logic snapshot, avatar và kiểm soát media như cũ. Chưa biên dịch native hoặc chạy trên thiết bị thật.
- Đồng bộ phiên bản `0.8.7` ở web/package/backend và sửa `scripts/build_standalone_preview.py` để tạo tên bản xem trước theo đúng phiên bản hiện tại.

**Nghiệm thu:** Node tests **209/209 PASS**, `npm run check:web` PASS; Chromium **8/8** bố cục PK Voice (320/360/390/430 px × sáng/tối) và kiểm tra mic đổi trạng thái + giảm chuyển động **2/2**. Đã chạy regression Cam và thử bản HTML độc lập Voice/Cam ở hai theme. Chi tiết: `docs/PK_VOICE_EDITORIAL_QA_V087.md`, ảnh tại `docs/qa-v087/`. Mã React Native đã qua phân tích cú pháp, **chưa phải build ứng dụng thực**. Các demo điểm/chuỗi thắng không chứng minh ghép media hai phòng hoặc giao dịch coin thật.

Mở bản xem trước HTML độc lập kèm ZIP, hoặc tại gốc mã nguồn chạy `npm start` rồi mở `http://localhost:8787`. Để tự xuất HTML: `python scripts/build_standalone_preview.py`.

---

# Túttt v0.8.6 — PK Takeover & Voice Finish Polish (12/11/2026)

Tiếp tục từ **v0.8.5**, giữ nguyên bố cục PK Cam và phong cách Mocha Ivory / Espresso Night, không thêm nút hoặc popup kết quả. Khi hai phe đổi người dẫn theo điểm đã xác nhận (kể cả qua hòa), thanh PK phản hồi bằng một nhịp ngắn không lặp; **hai đầu thanh chỉ hiển thị điểm, không hiện %**. PK Voice cân lại chữ số/nhãn phe/vùng avatar/mic, nhường trọng tâm cho **WIN vàng kim / LOSS tím trắng / chuỗi xN** ngay dưới tỷ số lúc kết thúc. Dòng thông tin phụ ẩn nhưng giữ không gian để chat không bị xê dịch. Mic đang nói chỉ lên viền xanh theo sự kiện audio thực, không giả dạng âm thanh đối thủ.

**QA:** 205/205 Node tests; `npm run check:web` PASS; Chromium 16/16 bố cục, 4/4 vượt điểm, 4/4 bản HTML độc lập; React Native 11/11 TS/TSX tệp parse hợp lệ, **chưa build/kiểm tra trên thiết bị**. Chưa tích hợp media PK liên phòng và giao dịch quà/coin thật. [Biên bản QA v0.8.6](docs/PK_TAKEOVER_VOICE_POLISH_QA_V086.md).

---

# Túttt v0.8.4 — PK Result Palette & Voice Stage Refinement (12/11/2026)

Nâng trực tiếp từ **v0.8.3**, ưu tiên phản hồi về chữ **WIN vàng kim** và **LOSS tím trắng**. Không thêm popup/nút kết quả, không thay kết cấu PK Cam đã duyệt.

- **Hai màu kết quả có ngữ nghĩa rõ:** WIN dùng vàng kim/ánh hổ phách với nét viền và bóng ấm; LOSS dùng tím pha trắng, bóng tím dịu; badge chuỗi `xN` phối vàng cùng WIN; hòa giữ sắc trung tính. **Ở Voice Ivory**, chữ WIN được điều chỉnh sang vàng hổ phách đậm và LOSS sang tím đậm để giữ độ đọc; Voice Night và Cam dùng sắc sáng hơn để nổi trên nền tối.
- **Sửa xung đột CSS thật:** `body.light-mode ... .pk-side-score strong` của Cam từng phủ màu chữ kết quả thành trắng dù quy tắc WIN/LOSS mới đã áp dụng. Cập nhật độ ưu tiên bộ chọn ngay trong `prototype/pk-finish-v080.css`, không thêm stylesheet hoặc lớp ghi đè riêng.
- **Voice tinh chỉnh:** làm nhẹ viền sân khấu, bỏ vòng phụ avatar và viền pill tên phe, giảm độ nặng huy hiệu VS, giữ nhịp căn hai cột, tên/mic/trạng thái và khu vực chat. Không dùng animation lặp hoặc âm thanh giả.
- **React Native:** dùng cùng các màu theo trạng thái và theme (gold/purple; Ivory đậm hơn), làm nhẹ nhãn phe; `WIN/LOSS/xN` vẫn nằm dưới tỷ số. Đã parse cú pháp, **chưa build thử trên thiết bị iOS/Android**.
- **Không thay logic:** chỉ công bố kết quả/chuỗi do server xác nhận. Hiệu ứng 3,2 giây, chế độ giảm chuyển động, cơ chế tính điểm PK, API và quyền không đổi.

**Nghiệm thu:** `npm run check:web` PASS; Node tests **202/202 PASS**; trình duyệt kiểm tra màu *được tính toán thực tế* ở **6/6** trường hợp Cam/Voice, sáng/tối (390 px) và thêm 320 px; 12/12 file TS/TSX native parse hợp lệ; HTML xuất độc lập thao tác thử Voice/Cam **2/2 đạt**. Ghi nhận chi tiết tại `docs/PK_RESULT_PALETTE_QA_V084.md` và ảnh tại `docs/qa-v084/`. Chưa xác nhận media bridge liên phòng hoặc thanh toán thật.

---

# Túttt v0.8.2 — PK Finish Typography & Voice Polish (12/11/2026)

Nâng trực tiếp từ **v0.8.1**. Sau khi PK kết thúc, **Cam đặt WIN / LOSS / xN trong chính cụm tỷ số, ngay dưới dòng “Điểm cổ vũ”**; loại bỏ vị trí tuyệt đối theo pixel khiến nhãn dễ lệch khi tỷ số hoặc kích thước chữ thay đổi. Avatar/tên Cam vẫn ở lower-third, chat nổi và thanh điều khiển không bị dịch chuyển. Nhãn WIN nổi hơn LOSS nhưng không thêm nền bảng, thẻ hay nút riêng; huy hiệu chuỗi thắng hiển thị sau nhãn. Kết quả **DRAW** không có chuỗi.

**Voice:** WIN / LOSS chuyển xuống vùng chú thích của điểm; không còn che tên hoặc trạng thái microphone. Lớp nhãn tái sử dụng vùng có sẵn nên sân khấu không phát sinh hàng mới. Viền sân khấu và huy hiệu VS nhẹ hơn, tỷ số và thanh thế trận vẫn theo dữ liệu đã xác nhận. Animation avatar WIN/LOSS vừa đủ, kết quả tự ẩn sau **3,2 giây**; `prefers-reduced-motion` tắt chuyển động nhưng không ẩn chữ. Giữ nguyên hệ màu Mocha Ivory / Espresso Night và logo gốc, không sao chép layout sản phẩm khác.

**React Native:** Cam/Voice đồng bộ vị trí chữ kết quả, cỡ chữ, động tác reveal và giảm tỷ lệ phóng avatar Voice để không đè icon mic. Đây là mã cập nhật, chưa xác nhận build trên thiết bị iOS/Android. Không đổi backend tính điểm hoặc logic chuỗi thắng do server xác nhận theo ID phòng.

**QA v0.8.2:** `npm test` **199/199 PASS**, `npm run check:web` PASS; Chromium **16/16** tổ hợp bố cục (320/390/430/768 px × Voice/Cam × sáng/tối), kiểm tra riêng giảm chuyển động và tự ẩn hiệu ứng PASS; bản HTML xuất độc lập được nạp trực tiếp và thử tương tác Voice/Cam **2/2 PASS**. Native **13/13 TS/TSX parse hợp lệ**, chưa build/kiểm thử máy thật. Chi tiết và ảnh: `docs/PK_FINISH_POLISH_QA_V082.md`, `docs/qa-v082/`.

---

# Túttt v0.8.0 — PK End Reveal & Real Win Streak (12/11/2026)

**Nâng cấp từ v0.7.9; không thay thiết kế PK Cam đã chọn.** Kết thúc PK được hiển thị tại chỗ trong khoảng **3,2 giây**, không thêm nút **Xem kết quả**, không mở thẻ kết quả riêng, không thêm nút **Về Live** hoặc nút đóng popup. Trong thời gian này, bên thắng hiện **WIN**, avatar phóng lớn và huy hiệu chuỗi thắng `xN`; bên thua hiện **LOSS**, avatar thu nhỏ. Hòa điểm: hai bên hiện **DRAW** và không có huy hiệu chuỗi thắng. Sau 3,2 giây, trạng thái PK tự kết thúc và màn hình trở về phòng Live. Thanh chat và vị trí các điều khiển không bị thêm hàng mới trong lúc hiển thị.

**Chuỗi thắng là dữ liệu do máy chủ xác nhận và lưu theo ID phòng.** Server lưu `pk.streaks[roomId]`, chỉ cập nhật một lần khi trận chuyển từ `active` sang `finished` (timeout, bỏ cuộc, chủ phòng rời); thắng +1, thua/hòa đặt lại 0. `winStreak` trong snapshot là số đã được lưu, không tính từ điểm dự đoán của trình duyệt, không tự cộng nếu tải lại. Phòng mới có chuỗi 0. Các trận cũ trước v0.8.0 không có dữ liệu chuỗi được xác minh nên không tự suy diễn `xN`. Chuỗi gắn với **phòng**, không phải lịch sử toàn tài khoản (chức năng tài khoản lâu dài chưa triển khai).

**Luồng web:** `prototype/pk-finish-v080.css` xử lý scale avatar, nhãn kết quả và reduced-motion. Kết quả Live chỉ xuất hiện sau khi snapshot trả `recent.id === id` của trận đang theo dõi và trạng thái `finished`; trận kết thúc bằng đồng hồ tại client không đủ để công bố WIN/LOSS. Demo offline có mục **Thử hiệu ứng kết thúc trận** trong menu quản lý PK (không có trên sân khấu); demo và kết quả có nhãn minh họa, không phải điểm/coin thật. Tim Tiếp sức được khóa trong thời gian kết quả; không thay logic miễn phí đã có.

**React Native:** `PKPanel` tái sử dụng `PKDuelBoard` cho trạng thái `finished`, không còn `PKResultBoard.tsx` hoặc CTA đóng bảng kết quả. Có timer tự dọn 3,2 giây, `Animated` scale avatar (WIN lớn hơn, LOSS nhỏ hơn), và hỗ trợ Reduced Motion. Chưa build/kiểm tra thiết bị iOS, Android thật; parser TS/TSX đã chạy nhưng không thay thế cho native build.

**Nghiệm thu v0.8.0:** 196/196 Node.js tests đạt; `npm run check:web` đạt; 16 kịch bản duyệt giao diện (320/390/430/768 px, Voice/Cam, sáng/tối) đã qua, sau chỉnh bố cục chạy lại 5 smoke cases và 1 reduced-motion case. Demo đã thử chuỗi `x1 → x2`, tự ẩn kết quả và giữ nguyên vùng nhập chat. Ảnh tại `docs/qa-v080/`. Xem thêm `docs/PK_FINISH_QA_V080.md`.

---

# Túttt v0.7.9 — White Heart Interaction & Live PK Clarity (12/11/2026)

Tiếp tục từ **v0.7.8**. Tập trung vào độ rõ và tính nhất quán của hành động “Tiếp sức” khi ở PK Voice/Cam; không thay đổi logo, hai theme Ivory/Espresso, cách tính điểm, API, quyền hay cơ chế ghép media. **PK Cam giữ nguyên sân khấu được duyệt.**

- **Một biểu tượng, hai trạng thái:** trái tim SVG nét trắng (không phụ thuộc glyph font); khi chạm là tim trắng đầy trong khoảng 0,54 giây, kèm **một** tim trắng bay lên khoảng 0,7 giây. Bỏ toàn bộ khung và nền nút Tiếp sức; vẫn giữ vùng tương tác ít nhất 44 px, viền focus cho bàn phím, giảm chuyển động theo cài đặt hệ thống.
- **Tương phản:** tim trắng có bóng tối rất nhẹ để nổi trên Ivory và Espresso; nhãn Tiếp sức dùng màu chữ bối cảnh để không bị chìm trên nền sáng. Fix quy tắc CSS cũ từng khiến tim Cam chế độ tối chuyển về nâu.
- **Không trùng thao tác:** khi PK Voice đang diễn ra, nút Thả tim ở thanh dưới được ẩn (vẫn có Tiếp sức cạnh thanh PK), hàng dưới gọn thành 4 điều khiển. Ngoài PK, hành động Thả tim bình thường vẫn còn.
- **Phản hồi có thật:** bộ điểm chỉ thay đổi qua tính toán demo chủ động hoặc xác nhận từ API; hiệu ứng tim không tự tạo điểm, không tự giả người xem hay âm thanh. Sau khi nhận phản hồi từ server, trạng thái điểm cập nhật mà không dựng lại sân khấu/chat.
- **React Native:** đồng bộ nút không khung và tim nét trắng/đầy khi nhấn, tự trở về nét trắng sau 380 ms; bỏ nút Thả tim trùng lặp ở điều khiển PK. **Chưa build/kiểm thử trên iOS/Android thực tế.**

**Tham khảo nguyên tắc, không sao chép giao diện:** [TikTok LIVE Match](https://support.tiktok.com/vi/live-gifts-wallet/tiktok-live/live-match) (điểm và hỗ trợ người phát), [BIGO LIVE PK](https://www.bigo.tv/news-events/use-bigo-live) (hai phe/thanh tỷ lệ), [Discord Stage](https://support.discord.com/hc/en-us/articles/1500005513722-Stage-Channels-FAQ) (ưu tiên người nói và khán giả). Không thêm coin/đổi quà, bảng điểm tăng giả hoặc chức năng không có trên server.

**Kiểm thử:** Node **192/192 PASS**, `npm run check:web` PASS; Chromium **16/16** tình huống bố cục (320/390/430/768 px, sáng/tối, Voice/Cam) và **13/13** tình huống tim PK (320/390/430 px, hai theme, reduced-motion). TypeScript parser **12/12 TS/TSX** không lỗi cú pháp. Chỉ là nghiệm thu prototype web/parse cú pháp Native; chưa phải thử nghiệm thiết bị thật. Xem `docs/PK_HEART_QA_V079.md` và `docs/qa-v079`.

**Chạy:** `npm start` tại thư mục gốc, truy cập `http://localhost:8787` → Live → Voice hoặc Cam → PK → Xem minh họa. Bản `TUTTT_V0_7_9_PREVIEW.html` cạnh ZIP là bản HTML chạy độc lập để xem giao diện; vẫn là dữ liệu mô phỏng nếu không có server.

---

# Túttt v0.7.7 — Voice PK Arena & Momentum Rhythm (12/11/2026)

Bản nâng trực tiếp từ **v0.7.6**, sửa trọng tâm **PK Voice chưa đủ chỉnh chu** trong khi PK Cam đã đạt hướng thiết kế. Đã tham khảo giao diện tranh đấu có tính giờ, đối kháng hai phe và tiến trình điểm của các sản phẩm Live/Voice; thiết kế lại với ngôn ngữ Túttt, **không sao chép trực tiếp**.

- **Voice sân khấu:** hai phe là hai nửa một vùng đối kháng (Scarlet/Champagne), viên VS rõ; avatar và trạng thái mic cùng một cụm; tên/điểm/bên dẫn dễ đọc. Không có sóng âm trang trí giả.
- **Thanh thế trận:** giữ nguyên công thức tỷ lệ và trạng thái aria từ v0.7.6; bar 19 px (17 px ở màn hình 320), label A/B, marker chạy đúng tỷ lệ và dòng chênh lệch; bỏ lặp thông tin và làm rõ nhóm nút Xem kết quả – Tiếp sức.
- **Khoảng trắng:** thu gọn chọn lọc ở 320, 360, 390 px để chat nổi, ô nhập và thanh nút không bị chèn ra khỏi màn hình. Vùng chạm nút giữ tối thiểu 44 px.
- **PK Cam:** không thay đổi cấu trúc broadcast đã được duyệt. Backend, API, quyền, tính điểm, logo, theme và cơ chế kết nối không thay đổi.
- **React Native:** bố cục Voice theo cùng hệ hai phe, trạng thái mic và rail cập nhật từ snapshot. Chưa build trên iOS/Android thật.

**Kiểm tra:** `npm test` **188/188 PASS**; `npm run check:web` PASS; Chromium **10/10** Voice riêng, **16/16** bố cục tổng thể Voice/Cam, **17/17** thanh điểm và reduced motion. 13 tệp native TS/TSX qua parse cú pháp. Xem [QA v0.7.7](docs/PK_VOICE_ARENA_QA_V077.md) và `docs/qa-v077/`.

**Chạy:** từ gốc repo `npm start` → `http://localhost:8787` → Live → Voice → PK → Xem minh họa. Tệp `TUTTT_V0_7_7_PREVIEW.html` là bản xem trước UI độc lập đi kèm ZIP, dữ liệu điểm/âm thanh đối thủ trong demo không phải live thật.

---

# Túttt v0.7.6 — Rivalry Meter · PK Voice & Cam (12/11/2026)

Nâng cấp trực tiếp từ **v0.7.5** để thay thanh điểm PK quá mỏng, đơn điệu và thiếu liên kết với tỷ số. Thanh mới có hai dải màu đỏ gạch/champagne, đổ sáng rất nhẹ, các vạch chia nhỏ, và điểm nối dạng hình thoi di chuyển theo **điểm đã xác nhận hoặc điểm minh họa**. Không có hoạt ảnh chạy liên tục hay điểm tự tăng.

- **PK Voice:** hiện tỷ lệ từng phe (ví dụ 56%/44%), nhãn phe dẫn và chênh lệch số điểm. Tỷ lệ tính từ tổng điểm A+B; nếu cả hai cùng 0 điểm thì chia 50/50 để biểu diễn trạng thái cân bằng, không tạo điểm.
- **PK Cam:** thanh nằm nổi ngay dưới đồng hồ/bảng trạng thái, không thêm nhãn trùng; đã dời tên/điểm hai phe xuống để marker không đè chữ.
- **Cập nhật mượt:** giữ DOM sân khấu/chat, chỉ đổi tỷ số, phần trăm, văn bản trạng thái và vị trí ranh giới trong 480 ms. `prefers-reduced-motion` tắt hiệu ứng. `role=progressbar` + giá trị/thông tin hai phe để hỗ trợ trình đọc màn hình.
- **React Native:** cùng cấu trúc thanh điểm hai phe cho Voice/Cam; tỷ lệ lấy từ snapshot máy chủ, giữ hoạt ảnh một lần khi thay đổi điểm và có `accessibilityValue`. Chưa chạy build iOS/Android thật.
- **Không thay đổi:** logo TUT, hai chủ đề Ivory/Espresso, quyền, cơ chế PK, tính điểm, API/DB, truyền âm/video hoặc hệ thống quà tặng.

**Kiểm tra:** `npm test` **183/183 PASS**; `npm run check:web` PASS; Chromium 16/16 kịch bản bố cục cũ, **17/17** kiểm tra thanh điểm mới (16 tổ hợp 320/390/430/768 px × Voice/Cam × sáng/tối, thêm reduced motion). Kiểm tra tiến trình minh họa 1240:980 → 1280:980, tỉ lệ 56% → 57%, không dựng lại DOM sân khấu. Xem `docs/PK_RIVALRY_METER_QA_V076.md`, `docs/qa-v076/`.

**Chạy:** `npm start` tại gốc → `http://localhost:8787` → Live → Voice hoặc Cam → PK → Xem minh họa. Bản `TUTTT_V0_7_6_PREVIEW.html` xem nhanh độc lập là **demo UI**, không phải video đối thủ thật hay dịch vụ điểm/coin có thu phí.

---

# Túttt v0.7.5 — Live Room Composition & Chat Legibility (12/11/2026)

Bản nâng từ **v0.7.4** tập trung vào sự đồng đều của thanh tiêu đề, khoảng trắng ở khu vực PK Voice, tin nhắn dễ đọc trên màn hình ngắn, và nút đếm người xem Voice mở được danh sách. Không đổi logo, bảng màu, backend/API, logic PK, mic/cam hay phân quyền. **Web đã nghiệm thu** bằng 178/178 Node tests, 16/16 kịch bản Chromium (320–768 px × Cam/Voice × sáng/tối), cùng 12 tệp TS/TSX không lỗi cú pháp. **Chưa build native iOS/Android hay ghép video hai phòng PK thật.**

**Chạy**: `npm start` rồi mở `http://localhost:8787`, vào Live → Voice/Cam → PK → Xem minh họa. Bản preview HTML offline đi kèm ZIP. Xem [`docs/LIVE_ROOM_COMPOSITION_QA_V075.md`](docs/LIVE_ROOM_COMPOSITION_QA_V075.md) và ảnh QA tại `docs/qa-v075/`.

---

# Túttt v0.7.4 — Live Control Rhythm (12/11/2026)

**Tiếp tục từ v0.7.3** và không thay hướng thiết kế đã duyệt. Chuẩn hóa các nút phòng Live: Cam 6 cột và Voice 5 cột, icon đồng đều 42px (40px ở 320px), nút có khoảng thở 6–10px, vùng bấm dễ thao tác; **Tiếp sức** nổi bật bằng màu chứ không lệch kích thước. Thanh nhập và nút gửi cùng 46px; hàng trạng thái PK và cụm kết quả/cổ vũ được giãn nhịp. Sửa lỗi thanh nút Voice dễ bị đẩy xuống ngoài màn hình 320×740.

**Kiểm tra:** `npm test` (174/174 PASS), `npm run check:web` (PASS), Chromium 12/12 kịch bản 320/390/430 × Cam/Voice × sáng/tối (khoảng cách, icon, chạm, tràn và kết quả demo). Bản mobile đã chỉnh bố cục nút, nhưng **chưa build hoặc nghiệm thu trên iOS/Android thật**. Xem [`docs/LIVE_CONTROL_RHYTHM_QA_V074.md`](docs/LIVE_CONTROL_RHYTHM_QA_V074.md).

**Chạy:** `npm start` → `http://localhost:8787`. Bản preview HTML độc lập được bàn giao cạnh ZIP, không phải luồng phát Live thật.

---

# Túttt v0.7.3 — Ivory & Action Rail (12/11/2026)

**Thay đổi chính:** sân khấu PK Cam chuyển từ hai avatar chữ và bảng điểm thành **hai vùng video dọc**, nơi điểm, đồng hồ, tên host, chat nổi và nút Tiếp sức nằm trên cùng không gian phát sóng. **Không giả video đối thủ**. Native dùng `VideoTrack` nếu chủ phòng hiện tại thực sự có camera LiveKit; web demo cho phép **xem trước camera cục bộ sau khi người dùng bấm cho phép**, không phát lên phòng. PK Voice giữ bố cục phù hợp phòng audio. Bảng màu Mocha Ivory / Espresso Night và logo chính thức không đổi.

**Kiểm thử:** `npm test` 165/165; `npm run check:web`; 12 trường hợp Chromium (320/390/430 px × Cam/Voice × sáng/tối), thử track camera giả lập bằng `canvas.captureStream` và reduced-motion. 12 tệp TS/TSX qua kiểm tra cú pháp. **Chưa nghiệm thu build iOS/Android hoặc ghép media hai phòng thật.**

**Chạy:** `npm start` tại gốc rồi mở `http://localhost:8787`, vào Live Cam → PK → bản minh họa. Xem chi tiết [`docs/PK_BROADCAST_REALISM_V072.md`](docs/PK_BROADCAST_REALISM_V072.md). Tệp preview độc lập được bàn giao cạnh ZIP.

---

# Túttt v0.7.1 — PK Touch Language

Nâng cấp có chủ đích hệ nút điều khiển Live/PK: bỏ phong cách nút đồng dạng, tăng cấp bậc, cảm giác chạm, giữ nguyên màu thương hiệu và backend. Xem `docs/PK_TOUCH_LANGUAGE_V071.md`.

# Túttt v0.7.0 — PK Media Presence & Resilience (12/11/2026)

**Bản nâng cấp từ v0.6.9**: sân khấu PK trong React Native biết sử dụng camera của host thuộc phòng hiện tại khi có track LiveKit thật; viền đang nói dựa trên sự kiện audio thật và trạng thái mic. Giao diện web đồng bộ trạng thái mic Voice không dựng lại sân khấu. PK chịu lỗi mạng tốt hơn, khóa cổ vũ khi điểm mất đồng bộ, giữ khung chat nhập liệu và không tự tuyên bố kết quả.

**Chạy demo**: `npm start` (mặc định `http://localhost:8787`), kiểm thử `npm test`, `npm run check:web`. Cài LiveKit native và cấu hình theo `.env.livekit.example`, xem tài liệu kỹ thuật. Xem preview HTML độc lập: `TUTTT_V0_7_0_PREVIEW.html` được bàn giao bên ngoài ZIP.

**Kết quả kiểm thử**: 155/155 Node.js, 12/12 kịch bản Chromium, 12 tệp TS/TSX qua phân tích cú pháp, không phải typecheck/build iOS/Android. [Báo cáo v0.7.0](docs/PK_MEDIA_PRESENCE_QA_V070.md).

**Giới hạn**: Chưa có media *liên phòng*; không có ví/coin/quà tặng thật; không tuyên bố đã đạt FPS native hay sẵn sàng phát hành.

---

# Túttt v0.6.9 — PK Fluid Interactions (11/11/2026)

**Bản mới nhất:** khắc phục giật khi cổ vũ nhờ cập nhật DOM tối thiểu. Điểm đổi có animation, thanh tỷ số dịch mềm, sân khấu không bị dựng lại khi điểm thay đổi; mobile có animation thanh điểm theo snapshot. Giữ Mocha Ivory / Espresso Night và giao diện sân khấu chung.

**Chạy**: `npm start`, mở `http://localhost:8787`. **Kiểm thử**: `npm test` (148/148 đạt), `npm run check:web`. Demo tương tác độc lập có tệp `TUTTT_V0_6_9_PREVIEW.html` ngoài ZIP.

**Báo cáo**: [`docs/PK_FLUID_UX_QA_V069.md`](docs/PK_FLUID_UX_QA_V069.md). **Video tương tác Chromium**: [`docs/qa-v069/PK_FLUID_DEMO_V069.mp4`](docs/qa-v069/PK_FLUID_DEMO_V069.mp4).

**Chưa xác thực**: ứng dụng Expo trên iOS/Android, truyền media hai phòng PK, FPS máy thật, ví/quà tặng thật. Không coi bản demo là sản phẩm đã sẵn sàng phát hành.

---

# Túttt v0.6.8 — PK Live Motion (11/11/2026)

**Bản nâng cấp mới nhất từ v0.6.7.** Cải tiến PK Cam/Voice theo hướng trẻ trung và chuyển động vừa đủ, giữ nguyên màu Mocha Ivory/Espresso Night và logo đã duyệt. Không sao chép UI ứng dụng khác, không thay logic mời PK, tính điểm, kết thúc trận.

- **Web PK:** hai phe cùng một sân khấu, avatar nổi bật, đồng hồ/tỷ số rõ, phản hồi cổ vũ '+40 ♥' trong demo, màn kết quả mới với thông điệp ngắn, chat có nút 'Viết lời cổ vũ' (chỉ điền nháp, không tự gửi).
- **React Native:** bố cục tương ứng và chuyển động vào sân khấu/kết quả theo thiết lập giảm chuyển động của OS.
- **Kiểm tra:** `npm test` (142/142), `npm run check:web`; Chromium 12/12 kịch bản 320/390/430 × Cam/Voice × sáng/tối, reduced motion đạt. Mobile chỉ qua cú pháp, không phải native build.
- **Chạy:** `npm start` rồi mở `http://localhost:8787`; preview HTML độc lập ở tệp bàn giao ngoài ZIP.
- **Báo cáo:** [`docs/PK_LIVE_MOTION_V068.md`](docs/PK_LIVE_MOTION_V068.md).
- **Chưa hoàn thiện:** media thực tế giữa hai phòng, build iOS/Android, ví/coin/quà tặng. Tuyệt đối không coi điểm demo là doanh thu.

---

# Túttt v0.6.7 — PK Typography & Rhythm (11/11/2026)

**Bản cập nhật từ v0.6.5.** Giữ bảng màu Mocha Ivory/Espresso Night đã chọn; tinh chỉnh chữ tiếng Việt, thứ bậc thông tin và bố cục sân khấu PK Voice/Cam. Không đổi logic mời đấu/tính điểm, không giả có truyền media liên phòng.

- Font web PK: Inter → Noto Sans → font hệ thống (offline fallback). Tên chủ phòng, đồng hồ, điểm và chat có tỷ lệ nhất quán; chữ số tỷ số dùng tabular numerals.
- Light Voice: đã sửa dải nền sáng lạc tông và nhãn LIVE quá chói; hai chủ phòng và điểm đồng bộ với Cam.
- React Native: đồng bộ thứ bậc chữ, nhãn phụ và màu điều khiển khi PK đang hoạt động.
- Kiểm tra: `npm test` **131/131**, `npm run check:web` đạt, **12/12** kịch bản Chromium và 11 TS/TSX qua phân tích cú pháp. **Chưa build native hay ghép media PK thật**.
- Chi tiết: `docs/PK_TYPOGRAPHY_QA_V066.md`; hình chụp ở `docs/qa-v066/`.

---

# Túttt v0.6.5 — PK Theme Unification (11/11/2026)

Tiếp tục từ **v0.6.4**, tập trung sửa sự không nhất quán của **nền sáng** khi PK. Bản trước có sân khấu espresso đậm trên nền kem, chat tối nhưng thanh nhập và công cụ lại kem sáng; tạo các dải màu đứt đoạn. Bản này dùng **Mocha Ivory (`#E9D8CA`)** cho *toàn vùng phòng khi PK hoạt động* trong light mode, và giữ **Espresso Night (`#271D1F`)** khi dark mode.

- Một mặt nền chung: đầu phòng, PK arena, chat, thanh nhập và nút công cụ trên web; không còn dải kem–đen–kem ở light mode.
- Màu chữ tối, phụ đề và số điểm được kiểm tra độ tương phản với nền mới; đỏ coral và vàng champagne vẫn là hai phe PK, không dùng xanh để phân đội.
- Token chính được cập nhật trong `brand/pk-color-system.json`; chạy `node scripts/build-pk-colors.js` để sinh CSS web và TypeScript mobile đồng bộ. Không tự sửa các tệp `*.generated.css` / `pkColors.ts`.
- Ở React Native, khi PK có trận đang diễn ra, màu nền phòng/chat/ô nhập/công cụ đổi cùng sân khấu; phần ghế mic/camera của Live thường tạm ẩn để không lặp lại sân khấu dưới trận PK. Khi PK không hoạt động, giao diện thường giữ nguyên.
- Giữ logic server, mời/chấp nhận PK, cổ vũ miễn phí, quyền host, chế độ giảm chuyển động và logo Túttt đã duyệt.

**Kiểm thử:** `npm test`; `npm run check:web`; `node scripts/build-pk-colors.js --check`; `python tests/browser_pk_v065.py`. Ảnh Chromium và kết quả so sánh: `docs/qa-v065/`. Tài liệu QA: `docs/PK_THEME_QA_V065.md`.

**Giới hạn:** đây là giao diện/demo PK; **chưa có hình ảnh/âm thanh liên phòng thật**, chưa chạy build iOS/Android, chưa có gift/coin, ảnh avatar và số điểm trong preview là minh họa.

---


# Túttt v0.6.3 — Unified PK Color System

Tiếp tục **v0.6.2**: sửa triệt để bảng màu PK không ăn nhập logo. Phe A đỏ san hô, phe B vàng champagne trên sân khấu espresso; xanh ngọc chỉ dành cho trạng thái người đang nói. Light Mode giữ nền Warm Ivory, Dark Mode Espresso Night. Cả web và mobile dùng màu sinh từ `brand/pk-color-system.json` để chống lệch màu về sau.

- **Mã nguồn:** không thay đổi cơ chế PK, mời đấu, tính điểm và quyền người dùng.
- **Chạy thử:** `npm start` → http://localhost:8787, `npm test`, `npm run check:web`.
- **Kiểm tra đồng bộ:** `node scripts/build-pk-colors.js --check`.
- **Bằng chứng và giới hạn:** [`docs/PK_COLOR_QA_V063.md`](docs/PK_COLOR_QA_V063.md).
- **Quan trọng:** chưa build iOS/Android hoặc ghép âm thanh/video hai phòng. Demo offline không dùng dữ liệu tài chính thật.

---

# Túttt v0.6.2 — PK Arena visual redesign

Bản này tiếp tục từ v0.6.1; cập nhật giao diện PK trên web và React Native. **Chưa tích hợp media liên phòng**.

- Chạy: `npm start` · Kiểm thử: `npm test` · Kiểm tra JS: `npm run check:web`
- Báo cáo mới: `docs/PK_ARENA_UX_V062.md`

# Túttt v0.6.0 — Live Voice Refinement & PK Friendly Matches

Phiên bản mới nhất, tiếp tục trực tiếp từ v0.5.9. **Live Voice được cân bố cục lại; PK hai phòng cùng loại đã có API/logic thật với lời mời, chấp nhận, đồng hồ server, cổ vũ miễn phí và kết quả.** Web và mobile có giao diện PK. Đọc [`docs/LIVE_PK_V060.md`](docs/LIVE_PK_V060.md) để chạy thử và xem giới hạn.

**Chạy web demo:** `npm start` → `http://localhost:8787`. **Kiểm thử:** `npm test` (100 bài) và `npm run check:web`. **Xem offline:** mở `TUTTT_V0_6_0_PREVIEW.html` được bàn giao riêng; PK trong bản offline là minh họa, không có đối thủ/điểm số thật.

**Chưa đạt:** audio/video PK giữa hai phòng, build mobile native, LiveKit thực tế 2–6 thiết bị và giao dịch quà tặng. Thứ hạng và điểm hiện không có giá trị tiền thật.

---

# Túttt v0.5.8 — Live media resilience & UI smoothness

Tiếp tục trực tiếp từ v0.5.7, giữ logo graffiti TUT đã duyệt và theme Warm Ivory/Espresso Night. Chi tiết sửa lỗi: [`docs/LIVE_MEDIA_RESILIENCE_V058.md`](docs/LIVE_MEDIA_RESILIENCE_V058.md).

**Chạy:** `npm start` để xem web local, `npm test` để kiểm thử, `npm run check:web` kiểm tra cú pháp. Source mobile ở thư mục `mobile/` cần development build và LiveKit SFU để kiểm thử camera/voice thực tế. Giao diện offline là demo, không phải media thật.

---

# Túttt v0.5.7 — Mic trạng thái & viền người đang nói

**Mã nguồn mới nhất được nâng trực tiếp từ v0.5.6.** Phòng Live Cam/Voice giữ bố cục đã thống nhất: chat nổi, không tab thành viên, danh sách người xem mở từ nút đếm, avatar tròn khi không phát camera.

**Điểm mới:** mic tắt hiển thị badge gạch chéo cạnh avatar; người đang nói thực sự có viền xanh chuyển động nhẹ, không hiển thị mic tắt. Có fallback giảm chuyển động, tránh đoán trạng thái khi chưa có media track. Chi tiết: `docs/LIVE_SPEAKER_V057.md`.

**Chạy:** `npm start` (web/server), `npm test` (80 kiểm thử), `npm run check:web`. Trước khi test LiveKit native phải cài thư viện bằng `npm run setup:livekit`, cấu hình `.env.livekit.example` và tạo Expo Development Build. Ảnh QA `docs/qa-v057/` chưa phải xác nhận video/voice trên thiết bị thật.

---

# Túttt v0.5.6 — Live Cam gọn, khung chat nổi trong suốt

Nền tảng gốc v0.5.5 dựa trên v0.5.4, **chỉ có một cách xem Live Cam**. Không còn thanh chuyển Cân bằng/Trong suốt/Ưu tiên chat, không có nút xem/ẩn ghế trống trên sân khấu. Khi camera không phát, giao diện hiển thị **avatar tròn** với tên và vai trò; khi có `VideoTrack` LiveKit thì hiển thị video thật (ứng dụng native).

Giữ nguyên logo Túttt đã duyệt, theme **Warm Ivory / Espresso Night**, Top 3 thu gọn, chat cuộn độc lập, mời khách cần chấp nhận và giới hạn 6 camera bao gồm host. **V0.5.6 đã bỏ các tab Chat/Thành viên/Quản lý trong Live Cam:** danh sách người xem mở từ nút đếm; quản trị ở sheet riêng cho chủ/phó phòng. Chạm avatar/ô video để ghim một người mà không phải chuyển chế độ giao diện.

**Kiểm tra:** `npm test`, `npm run check:web`, `python tests/browser_qa_v056.py`. Kiểm tra trước đó ở v0.5.5 là `python tests/browser_qa_v055.py`. Ảnh Chromium và kết quả trong `docs/qa-v055/`, tiêu chuẩn mới trong `docs/LIVE_UNIFIED_STAGE_V055.md`.

**Chạy:** `npm start`, sau đó mở `http://localhost:8787`. Bản xem trước HTML độc lập được bàn giao kèm ngoài ZIP. Xem `docs/LIVE_FLOATING_CHAT_V056.md` để hiểu bố cục và phạm vi nghiệm thu.

**Chưa nghiệm thu:** build native thực tế trên iOS/Android, truyền audio/video giữa hai thiết bị, giao dịch quà tặng và xếp hạng Top 3 thật. Đây vẫn là prototype, không phải bản phát hành production.

---

## Nhật ký các phiên bản cũ (chỉ phục vụ tham khảo; lựa chọn giao diện cũ đã được thay thế ở v0.5.5)

# Túttt v0.5.4 — Adaptive Cam Stage & Spotlight

Tiếp tục từ v0.5.3, tập trung nâng chất lượng giao diện phòng Live khi có 1–6 người: lưới tự thích ứng, ghim/phóng to một thành viên, thu gọn ghế trống, giữ chế độ đọc chat và Top 3. Bản mobile lắng nghe **tín hiệu người đang nói từ LiveKit** nhưng chỉ có thể nghiệm thu khi build/kết nối SFU thật.

- Web sử dụng `prototype/stage-layout.js` và `prototype/live-stage-v054.css`. Tài nguyên mới đã được cho phép tại HTTP server.
- Offline preview có **ghế mẫu** (không có camera thật); online có dữ liệu ghế thật theo backend nhưng vẫn chưa có stream video trên web.
- Mã nguồn mobile nằm trong `mobile/`; dữ liệu media thật chỉ hiển thị khi SDK LiveKit có track.
- Kiểm thử: `npm test`, `npm run check:web`; báo cáo QA `docs/LIVE_STAGE_UX_V054.md`, ảnh và kết quả Chromium trong `docs/qa-v054/`.
- Chưa nghiệm thu build iOS/Android, SFU audio/video trên thiết bị thật, quà tặng hoặc tiền thật.

**Chạy**: tại gốc dự án, `npm start` rồi mở `http://localhost:8787`.

---

# Túttt v0.5.3 — Live Experience Refinement

Nâng cấp trực tiếp từ **v0.5.2**, dựa trên phân tích BIGO LIVE (sân khấu nhiều khách), TikTok LIVE (mời khách/quà tặng), Discord Stage (quyền nói), Twitch (kiểm duyệt chat). Chỉ kế thừa nguyên tắc UX, **không sao chép giao diện hoặc tài sản của các ứng dụng đó**.

**Đã triển khai:** chỉnh lại khoảng cách, bo góc, màu bề mặt và thứ bậc thông tin của Live Cam; bổ sung nút **Top 3 người đồng hành** gọn cho Live Cam và Live Voice. Trên web, nút mở bảng chi tiết. Khi chạy demo offline, tên và điểm là **minh họa có gắn nhãn**; khi kết nối server hiện tại, **không có xếp hạng thật** và không hiển thị điểm quà giả. Trên mobile đã có lối vào Top 3 thông báo tính năng chưa kết nối.

**Không thay đổi:** logo graffiti Túttt đã duyệt, hệ màu Warm Ivory / Espresso Night, tối đa 6 ghế Cam bao gồm host, luồng mời khách cần đồng ý, quản lý host/phó phòng và ba chế độ đọc chat.

**Chưa hoàn thành:** ví/quà/coin, bảng xếp hạng từ giao dịch thật, build native và nghiệm thu video/voice hai thiết bị.

Tài liệu đối chiếu: [`docs/LIVE_DESIGN_BENCHMARK_V053.md`](docs/LIVE_DESIGN_BENCHMARK_V053.md). Ảnh QA thực tế: `docs/qa-v053/`.

**Chạy:** `npm start` để mở http://localhost:8787, `npm test` để chạy kiểm thử, `npm run check:web` để kiểm tra cú pháp. Các chỉ dẫn từ phiên bản cũ dưới đây chỉ phục vụ tham khảo lịch sử.

---

# Túttt v0.5.2 — Live Chat UX & Viewer Invite

**Phiên bản hiện tại: v0.5.2** (nâng cấp từ v0.5.1). Tải mã nguồn và mở `prototype/`; logo đã duyệt vẫn giữ nguyên ở `brand/approved/`.

**Điểm mới:** ba chế độ xem Live Cam (Ưu tiên chat mặc định, Trong suốt, Cân bằng), cỡ chữ chat, lưới 3×2 khi ưu tiên đọc chat, mời người xem lên cam/mic có đồng ý, từ chối/hủy/hết hạn 60 giây, kiểm soát không được ép quyền phát, giới hạn sáu camera tính cả host.

**Kiểm thử:** 54/54 Node.js đạt; Chromium 320/390/430 px; mobile chỉ qua kiểm tra cú pháp. LiveKit video/audio thực tế trên điện thoại chưa nghiệm thu.

Tài liệu chính: [`docs/LIVE_CHAT_INVITES_V052.md`](docs/LIVE_CHAT_INVITES_V052.md).

---

# Túttt v0.5.1 — Live UX & Moderation QA

Ứng dụng mạng xã hội trò chuyện Túttt. Repo gồm **prototype web**, **backend Node.js demo** và **mã nguồn mobile React Native/Expo**. Bản này nâng cấp phòng Live Voice/Cam trên cơ sở nhận diện đã duyệt; chưa phải ứng dụng thương mại sẵn sàng phát hành.

## Tóm tắt v0.5.1

- Tạo phòng **Live Voice** hoặc **Live Cam**; chế độ cam tối đa **6 vị trí camera tính cả chủ phòng**, viewer không cần bật camera.
- Chủ phòng phân quyền **phó phòng**, duyệt lên mic/cam, mời ra, cấm vào có thời hạn, khóa chat cá nhân, khóa phòng và chat chậm.
- Giao diện web Cam riêng và lưới 2×3; giao diện native có `VideoTrack` và điều khiển camera LiveKit, nhưng **chưa build/kiểm chứng hai thiết bị thật**.
- Bộ kiểm thử backend/UI helper **42/42 đạt**; trình duyệt Chromium 320, 390, 430 px đã kiểm tra tạo phòng Cam và giao diện sáng/tối.
- Chi tiết quyền và giới hạn nghiệm thu: `docs/LIVE_VOICE_CAM_V050.md`.

## Cải tiến v0.5.1 (11/11/2026)

- **Live Cam:** lưới 6 vị trí được tối ưu chiều cao; ghế số 1 giữ cho chủ phòng khi tạm mất kết nối; có tab Chat / Thành viên / Quản lý, công cụ quản trị không làm tràn trang video.
- **Chặn thao tác nhầm:** khi rời phòng phải xác nhận; khi thay đổi quyền thành viên dùng sheet xác nhận thay cho `window.confirm`. Host không bị hiện nút rời ghế trái với quy tắc backend.
- **Live Voice:** phối lại vùng mic/ghế bằng màu kem-đỏ-espresso thay cho các avatar tím cũ; phòng Voice trên web vẫn là phòng mesh thử nghiệm tối đa 4 ghế, native LiveKit có cấu hình tới 8 ghế; không được gọi là truyền âm thanh đã nghiệm thu.
- **React Native:** bổ sung bộ lọc Voice/Cam, tab Chat / Thành viên / Quản lý cho Live, lưới cam gọn theo bề rộng thiết bị, host seat dự phòng, hộp thoại trước khi rời phòng.
- **Backend:** ghi audit các thao tác moderation thành công (tối đa 2.000 mục trong JSON store demo); thao tác bị từ chối không có bản ghi. Tệp CSS mới được whitelist phục vụ từ HTTP server.
- **QA:** 42/42 Node.js tests đạt; Chromium 320, 390, 430 px; kiểm tra riêng UI quản trị với roster mô phỏng và luồng xác nhận; 8/8 file TS/TSX qua kiểm tra cú pháp (chưa typecheck/build native).

Báo cáo có bằng chứng, giới hạn và checklist nghiệm thu: **`docs/LIVE_UX_QA_V051.md`**. Các ảnh trong `docs/qa-v051/` là screenshot Chromium thực tế; những ảnh có quản trị sử dụng roster mock được ghi rõ trong báo cáo.

## 1. Điểm mới

- Logo **đúng bản vừa được duyệt**: ống nghe điện thoại cổ thay thanh ngang chữ T đầu, nét graffiti đỏ/kem/đen. Tệp gốc `brand/approved/tuttt-approved-master.png` được giữ nguyên byte; chỉ cắt khoảng trống trong suốt để dùng ở UI (`brand/approved/tuttt-approved-cropped.png`).
- Giao diện theo hai theme đồng bộ: **Warm Ivory** (#F4EAE0, chữ màu mực, đỏ gạch) và **Espresso Night** (#1F1819, chữ kem, đỏ san hô).
- Header web, header mobile, favicon, app icon, Android adaptive icon và splash sử dụng cùng logo. Không còn ảnh JPEG nền kem cũ trong mã nguồn giao diện.
- Bổ sung lớp CSS nhận diện độc lập `prototype/brand-v048.css`, tránh tiếp tục chồng các bản vá màu lên CSS cũ.
- Các màn hình vẫn được gọi đơn giản: Khám phá, Live, Chat, Cộng đồng, Cá nhân.

## 2. Chạy web / backend trong VS Code

Yêu cầu Node.js >=20, không cần `npm install` cho web demo và backend cơ bản.

```bash
npm start
```

Truy cập **http://localhost:8787**. Để xem bản độc lập offline, mở `TUTTT_V0_5_1_PREVIEW.html` (tệp được bàn giao riêng cùng ZIP).

```bash
npm test
npm run check:web
```

## 3. Mobile iOS / Android

Source nằm trong `mobile/`, là Expo development-build starter. LiveKit native **không chạy trong Expo Go**. Các bước cài đặt môi trường, server/LiveKit và kiểm thử hai điện thoại có trong `docs/SETUP_TECHNICAL_FROM_V047.md`, nhưng tên phiên bản và hướng dẫn nhận diện ở đó mang tính lịch sử; nhận diện mới dùng file `docs/BRAND_SYSTEM_V048.md`.

Để build native cần kết nối mạng cài dependencies, thiết lập SDK Android/Xcode hoặc công cụ build hợp lệ, và API/LiveKit có cấu hình chuẩn. **Chưa có bản build native đã nghiệm thu.**

## 4. Kết quả và giới hạn nghiệm thu

- **42/42** bài kiểm thử Node.js (API, phân quyền và UI helper) đạt tại thời điểm đóng gói.
- Kiểm tra cú pháp JS backend và web đạt; 8/8 tệp TypeScript/TSX được transpile/parse không có lỗi cú pháp.
- Chromium DOM preview: kích thước 320, 390, 430 px; hai theme; không phát hiện lỗi runtime JS hoặc overflow ngang. Báo cáo mới: `docs/qa-v051/browser-results.json`.
- Kiểm tra tương phản tự động các cặp màu văn bản chính theo mục tiêu >=4.5:1, **không thay thế** kiểm thử WCAG toàn bộ màn hình.
- **Chưa nghiệm thu** biên dịch native thực tế, audio LiveKit hai điện thoại, chuyển trạng thái khi có cuộc gọi, TalkBack/VoiceOver, font scaling, stress test hay thông báo đẩy.
- Chat 1-1, dữ liệu community và một số thao tác vẫn là demo; JSON storage + guest session chưa phù hợp production.

## 5. Cấu trúc chính

```text
TUTTT_V0_5_1/
├── brand/
│   ├── approved/               Logo được duyệt, bản gốc và bản cắt alpha
│   └── original/               Ảnh JPEG người dùng gửi trước đó (lịch sử)
├── prototype/                  Web demo + CSS nhận diện mới + assets
├── mobile/                     React Native starter + icon/splash + theme tokens
├── server/                     HTTP API + SSE + bridge LiveKit thử nghiệm
├── tests/                      Unit/integration tests
└── docs/                       Hướng dẫn brand, QA và lịch sử kỹ thuật
```

**Quan trọng:** không để LIVEKIT_API_SECRET vào frontend, repo public, file EXPO_PUBLIC_* hoặc gói ZIP. Sử dụng môi trường backend riêng như hướng dẫn trong `.env.livekit.example`.


## v0.5.5 — Live Cam tinh gọn
Một bố cục duy nhất, camera tắt là avatar tròn, không còn thanh chọn ba chế độ xem hoặc nút ghế trống. Xem `docs/LIVE_UNIFIED_STAGE_V055.md`. Backend vẫn bảo vệ quyền và giới hạn 6 ghế; chưa nghiệm thu LiveKit thiết bị thực.


## V0.5.9 — Live UX Redesign

Thiết kế lại giao diện Live Voice/Cam dựa trên phản hồi người dùng: giảm khối cứng, thống nhất sân khấu tông espresso kết hợp nền Warm Ivory, chat nổi, viewer count/Top 3 thu gọn. Web cập nhật tại `prototype/live-redesign-v059.css`; native ở `mobile/src/screens/Screens.tsx`. Mọi API/logic vẫn giữ như v0.5.8. Xem `docs/LIVE_VISUAL_REDESIGN_V059.md`. LiveKit audio/video hai thiết bị vẫn chưa nghiệm thu.


## Túttt v0.6.1 — PK Duel Stage
- Đã thiết kế lại PK thành sân khấu đối đầu hai phía, thay bảng điểm PK cũ chỉ nổi phía trên nội dung.
- Giữ nguyên logic backend, đồng hồ do máy chủ kiểm soát, quyền mời/chấp nhận/huỷ và điểm cổ vũ miễn phí.
- Avatar đại diện không phải video của đối thủ; ghép SFU hai phòng vẫn chưa nghiệm thu.
- Đã đồng bộ bố cục PK mới cho web và component React Native, không build native trong môi trường này.
- Tài liệu: `docs/PK_DESIGN_V061.md`.


## v0.6.7 — PK Result Flow
- Web PK demo: đồng hồ đếm thật, xem kết quả mẫu, PK lại hoặc quay về Live.
- PK thật: chỉ hiển thị màn thắng/thua/hòa **sau khi có kết quả do backend xác nhận** qua snapshot, không đoán kết quả từ đồng hồ client.
- Native: thông báo nhập trận 3 giây và hiển thị kết quả của trận vừa theo dõi, có nút đóng.
- Giữ nguyên sân khấu Mocha Ivory/Espresso Night, màu đỏ coral/champagne, không thêm card.
- Hạn chế: **Chưa ghép media giữa hai host**, chưa xác nhận chạy native iOS/Android.


## v0.7.3 — Ivory & Action Rail
- PK Cam Ivory dùng một nền Mocha xuyên suốt thanh tiêu đề, vùng video chờ, khung chat, ô nhập và thanh điều khiển. Night giữ hướng hiện có.
- Nút **Tiếp sức** thay nút **Thả tim** trong thanh điều khiển khi PK Cam đang hoạt động; không còn pill chèn lên video.
- **Xem kết quả minh họa** chuyển thành biểu tượng ngữ cảnh trong thanh đầu PK, vẫn có nhãn truy cập đầy đủ.
- Không thay đổi luật tính điểm, không thêm video giả hay giao dịch coin. Native Cam có tông Ivory và hành động Tiếp sức đồng bộ; vẫn cần build điện thoại thật.
