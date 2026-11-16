# Túttt v0.4.5 — Tích hợp logo gốc

Đã tích hợp trực tiếp hình logo **gốc** do người dùng gửi vào giao diện web, header mobile, ứng dụng Expo (app icon), splash screen, Android adaptive icon và favicon. Cả ba bản gốc trong repository có SHA256 giống hệt nhau; chỉ các tệp icon/splash **có khung đệm** mới được tạo thêm.

Giao diện chuyển hướng màu sang **than đen / kem ấm / đỏ**, phối hợp với ảnh gốc. Các trang vẫn tên thông dụng: Khám phá, Live, Chat, Cộng đồng, Cá nhân. Không sử dụng hai logo do AI tạo trước đây.

**Kiểm thử:** `npm test` và `npm run check:web`. **Giới hạn:** Chưa build native, chưa nghiệm thu microphone LiveKit và ảnh icon trên iOS/Android thật. 

---

# Túttt — v0.4.5 · Logo gốc & nhận diện thương hiệu

> **Logo chính thức:** Ảnh JPEG gốc do người dùng gửi — không chỉnh sửa hoặc thiết kế lại. Xem `brand/README.md`.
> **Tên ứng dụng:** Túttt. **Tên các trang:** Khám phá, Live, Chat, Cộng đồng, Cá nhân. Không thêm “Túttt” trước các tên trang.

## Tổng quan chính xác

Gói này tiếp tục từ Túttt v0.3, chứa **web prototype**, **Node.js demo backend** và **Expo/React Native mobile starter**. Đây là **bản mã nguồn phát triển / kỹ thuật**, không phải ứng dụng đã nghiệm thu phát hành.

### Đã triển khai và được kiểm thử

- Backend cấp JWT LiveKit (HS256) giới hạn 5 phút, đúng phòng và người dùng; mặc định người nghe có `canPublish=false`, host có quyền publish **microphone**, không cấp quyền camera hoặc `roomAdmin` cho client.
- Phân quyền host / moderator / người nghe; hàng chờ xin lên mic; duyệt/thu hồi mic qua **LiveKit RoomServiceClient.updateParticipant** khi máy chủ có SDK; mời người ra khỏi phòng qua API, khóa tham gia lại 10 phút.
- Xử lý lỗi cập nhật quyền theo kiểu *fail closed*: không đánh dấu quyền đã cấp nếu LiveKit báo lỗi.
- Mobile source tích hợp `@livekit/react-native`, `livekit-client`, SDK Expo config plugins; màn Live có ghế nói, duyệt yêu cầu, quản lý thành viên, mic thủ công, trạng thái kết nối lại.
- Ứng dụng lưu phiên **khách demo**, phòng và tin nhắn như v0.3; bộ kiểm thử **14/14 PASS**, JavaScript backend/web đều qua `node --check`, toàn bộ TS/TSX mobile qua **kiểm tra cú pháp**.

### Chưa nghiệm thu / hạn chế quan trọng

- **Chưa chạy bản native build, chưa kiểm chứng audio qua hai điện thoại**. Môi trường hiện tại không truy cập npm registry (`EAI_AGAIN`), nên chưa cài native modules, chưa chạy TypeScript typecheck với node_modules, Expo Doctor, Xcode/Android Gradle hoặc WebRTC audio E2E.
- **LiveKit SFU cần máy chủ bên ngoài** (LiveKit Cloud hoặc self-host). Gói mã nguồn **không kèm máy chủ SFU**, không tự tạo tài khoản LiveKit, không tự cấp credentials.
- Web prototype vẫn chạy **WebRTC mesh từ v0.3**, **không phải** LiveKit SFU. Tính năng SFU của v0.4 có mã tích hợp trên mobile, không có web bundle LiveKit.
- Backend demo chạy **một process với JSON storage và guest sessions**. Ghế mic được lưu RAM, không có webhook LiveKit đối soát trạng thái thực tế; phòng Live hiển thị các phiên đã cấp quyền, chưa xác thực online từ SFU. Không dùng để triển khai production hoặc thanh toán thật.
- Chưa có tài khoản/đăng nhập chính thức, PostgreSQL, Redis, chat riêng thật, kiểm duyệt cộng đồng đầy đủ, audit, pháp lý, push notifications, kiếm tiền hoặc năng lực phục vụ đông người đã benchmark.

## A. Chạy web và backend offline (không cần npm install)

Yêu cầu Node.js **>=20**. Mở terminal tại thư mục gốc:

```bash
npm start
```

Truy cập `http://localhost:8787` để xem demo web, phòng và chat của bản cũ. Không có LiveKit credentials: `/api/health` báo `livekitConfigured:false`; endpoint `/live/token` trả **503**, không tạo phòng SFU giả.

Kiểm thử:

```bash
npm test
npm run check:web
```

## B. Cấu hình LiveKit cho voice native

1. Tạo một máy chủ LiveKit Cloud hoặc self-host, lấy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. URL media có dạng `wss://...` (hoặc `ws://` cho lab phù hợp).
2. **Giữ secret phía backend**. Không đưa secret vào mobile, Expo `EXPO_PUBLIC_*`, GitHub hoặc source frontend.
3. Cài gói server cho chức năng quản trị LiveKit (cần Internet):

   ```bash
   npm install --prefix server
   ```

4. Khởi chạy Node server với biến môi trường. Trên **PowerShell Windows** (điền giá trị thật trước khi chạy):

   ```powershell
   $env:LIVEKIT_URL="wss://your-project.livekit.cloud"
   $env:LIVEKIT_API_KEY="YOUR_KEY"
   $env:LIVEKIT_API_SECRET="YOUR_SERVER_ONLY_SECRET"
   $env:HOST="0.0.0.0"
   $env:PORT="8787"
   npm start
   ```

   Không nên mở backend demo ra Internet công khai. Cổng local chỉ dành cho **mạng tin cậy**.
5. Muốn kết nối iOS/Android thực, API nên được phục vụ qua **HTTPS với chứng chỉ được thiết bị tin cậy**. Có thể cấu hình `TUTTT_TLS_CERT`/`TUTTT_TLS_KEY` như v0.3 hoặc dùng reverse proxy HTTPS trong môi trường test. `https://localhost` trên điện thoại là chính điện thoại, không phải PC.

## C. Mobile native (Expo development build — KHÔNG dùng Expo Go)

Yêu cầu Android Studio hoặc máy macOS với Xcode nếu build iOS local. Expo Go **không thể chạy LiveKit native**. Mở terminal trong thư mục `mobile`:

```bash
npm install
npx expo-doctor
```

Đặt API URL bằng địa chỉ HTTPS của máy chủ đã cấu hình (đừng dùng `localhost` khi chạy điện thoại):

```powershell
$env:EXPO_PUBLIC_TUTTT_API_URL="https://YOUR_TRUSTED_API_DOMAIN_OR_HOST:8787"
npm run android
```

Hoặc trên macOS:

```bash
export EXPO_PUBLIC_TUTTT_API_URL="https://YOUR_TRUSTED_API_DOMAIN_OR_HOST:8787"
npm run ios
```

Sau khi đã build development client, mở Metro qua `npm start`. Bộ gói native **được pin** theo ví dụ công khai đã build được với Expo 58/LiveKit, nhưng kết quả cài/build vẫn phải nghiệm thu trên máy của bạn. Không dùng `--force` hoặc `--legacy-peer-deps` để che lỗi dependency.

### Quy trình thử voice trên 2 thiết bị

- Vào ứng dụng bằng hai phiên khách khác nhau; tạo phòng ở điện thoại A, vào phòng ở B.
- Host A được đứng ghế nhưng mic **mặc định tắt**. A bấm **Bật mic** và cấp quyền hệ điều hành.
- B nghe âm thanh từ A; B chọn **Xin lên mic**. A duyệt. B bật mic và kiểm tra trò chuyện hai chiều.
- A thu hồi ghế B; xác nhận B không thể tiếp tục publish audio.
- A bổ nhiệm B làm moderator; B duyệt người C. Kiểm tra moderator không có quyền bổ nhiệm moderator khác.
- Thử tắt Wi-Fi / đổi mạng / đóng app / rời phòng / đăng nhập lại. Cần xác thực luồng audio, reconnect, microphone, routing Bluetooth, và hồi phục token khi permission thay đổi.

**Không tuyên bố các bước này đã thành công** trước khi chạy thiết bị thật. Xem `docs/QA_V04.md` để nghiệm thu.

## D. Cấu trúc

```text
TUTTT_V0_4/
├── prototype/                   Web UI + WebRTC mesh legacy lab
├── server/
│   ├── index.js                 HTTP API + SSE
│   ├── storage.js               JSON storage demo
│   ├── voice.js                 WebRTC mesh v0.3
│   ├── livekit.js               Sign JWT + LiveKit admin adapter
│   ├── stage.js                 Server-controlled stage & moderation
│   └── test/                    Node integration tests
├── mobile/
│   ├── App.tsx                  Native UI flows
│   └── src/
│       ├── voice/               LiveVoice + useLiveVoice hook
│       ├── services/api.ts      Chat + Live REST API
│       └── screens/Screens.tsx  UI phòng Live, host/mod controls
├── docs/
│   ├── API_V04.md
│   ├── QA_V04.md
│   └── LIVEKIT_NOTES.md
├── .env.livekit.example
└── package.json
```

## Tiêu chí đạt giai đoạn tiếp theo

- Audio hai chiều thực nghiệm **Android ↔ Android, Android ↔ iOS, iOS ↔ iOS**.
- Backend chuyển guest JSON thành tài khoản chính thức/PostgreSQL và Redis presence; triển khai webhook LiveKit để chống ghế ảo/đồng bộ khi app crash.
- Test quyền host/moderator trên LiveKit server thật; test cập nhật permissions khi reconnect/mất kết nối.
- Bộ test tự động mở rộng về đăng nhập, giới hạn quyền, CSRF, spam, thiết bị thật, kiểm thử bảo mật.

## Tham khảo kỹ thuật

- https://docs.livekit.io/transport/sdk-platforms/expo/
- https://docs.livekit.io/frontends/reference/tokens-grants/
- https://docs.livekit.io/reference/server-sdk-js/classes/RoomServiceClient.html
- https://community.livekit.io/t/expo-sdk-58-react-native-0-88-livekit-3-1-0-npm-eresolve-dependency-conflict/2481


## Bản vá v0.4.2
Xem `docs/CHANGELOG_V042.md`.


## v0.4.4 — UX Reliability & Readability
Xem `docs/UX_RELEASE_V044.md`. Đã sửa tìm kiếm tiếng Việt, trạng thái rỗng, focus, giao diện sáng/tối và vùng chạm. Chưa nghiệm thu UI trên thiết bị thật hoặc LiveKit audio.

### Xem trước giao diện v0.4.4
Có tệp `TUTTT_V0_4_4_PREVIEW.html` bàn giao riêng, mở bằng trình duyệt để xem **offline UI demo**. Ảnh kiểm tra trong `docs/qa-screens/`; xem báo cáo `docs/UX_RELEASE_V044.md`.

Khi mở URL từ `npm start`, giao diện sẽ thử kết nối backend Node và sử dụng phòng/tin nhắn phòng thực. Bản HTML độc lập không có backend.


## v0.4.6 — Brand visual fix
Historical v0.4.6 experiment (superseded in v0.4.7): we had attempted to remove the paper background. The v0.4.7 fix replaces it with the original JPEG on warm ivory; see `docs/BRAND_WARM_IVORY_V047.md`.


## v0.4.7 — Brand correction (warm ivory)
Default theme is now warm ivory. The actual user-provided JPEG displays directly in the web/native headers, and the launcher/splash use warm ivory rather than black. Previous transparent-cutout experiments are NOT used in runtime UI. See `docs/BRAND_WARM_IVORY_V047.md`.


## Túttt v0.4.8 — Đồng bộ nhận diện

Đã tích hợp logo được duyệt (nền alpha tự nhiên), đồng bộ giao diện **Warm Ivory / Espresso** giữa web demo và React Native; icon/splash đã làm mới. Xem `docs/BRAND_SYSTEM_V048.md`. Voice native vẫn cần kiểm thử thiết bị thật.
