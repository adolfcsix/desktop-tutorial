# Túttt v0.8.38 — Quy trình xác minh Expo/LiveKit trước khi build

Ngày kiểm tra: 12/11/2026. Phiên bản nền giữ nguyên Expo 58.0.19, React 19.3.0, React Native 0.88.0, LiveKit RN 3.1.0. Không thêm chức năng hoặc nút UI.

## Kiểm tra được thực hiện trong môi trường này

- Node 22.16.0, npm 10.9.2.
- `npm view react@19.3.0 version` với registry công khai: **EAI_AGAIN** (DNS không phân giải được `registry.npmjs.org`).
- `npm install --package-lock-only --strict-peer-deps --ignore-scripts --offline`: **ENOTCACHED** (`@config-plugins/react-native-webrtc` không có trong cache).
- Chưa sinh được `mobile/package-lock.json` thật; chưa có đầy đủ `mobile/node_modules`.
- `node scripts/verify_native.mjs --json`: **BLOCKED**. Các bước npm ls, `expo install --check`, `expo-doctor`, `tsc --noEmit`: **NOT_RUN**. Không có APK/IPA hoặc kiểm thử media thật.

## Lệnh chạy sau khi có Internet và máy phát triển

Từ thư mục gốc dự án:

```sh
node --version
npm --version
npm run doctor:native
npm run verify:native -- --install
```

Cổng `verify:native -- --install` hoạt động như sau:

1. Nếu chưa có lockfile, yêu cầu npm tạo lockfile thật với `--package-lock-only --strict-peer-deps`; không viết lockfile giả.
2. Kiểm tra phiên bản từng dependency trực tiếp đã được phân giải và metadata nguồn của lockfile.
3. Chạy `npm ci --strict-peer-deps` từ lockfile, không dùng `--force` hoặc `--legacy-peer-deps`.
4. Kiểm tra các package thực tế trong `node_modules`, `npm ls --depth=0`, `expo install --check`, `expo-doctor`, `tsc --noEmit`.
5. Nếu bất kỳ bước nào lỗi, `technicalGate=BLOCKED`; không được dùng thư viện cũ còn tồn để coi lần cài đặt mới là đạt.

Báo cáo máy đọc: `docs/qa-v0838/native-verification.json`.

## Cách phân loại lỗi

| Lỗi | Xử lý an toàn |
|---|---|
| EAI_AGAIN / ENOTFOUND | Kiểm tra DNS, proxy và truy cập registry; không sửa dependency khi chưa có kết quả resolver |
| ENOTCACHED | Tắt `--offline` và tải gói qua mạng có kết nối |
| ERESOLVE | Đọc cây peer thực tế; đối chiếu `react`, `react-dom` và override `react-server-dom-webpack`, không bỏ qua kiểm tra peers |
| EBADENGINE | Nâng phiên bản Node đúng yêu cầu Expo trước khi cài |
| EINTEGRITY | Kiểm tra checksum/registry/cache; không chỉnh `integrity` bằng tay |
| Lỗi Expo Doctor | Điều chỉnh package theo SDK và thử lại, giữ nhật ký |
| Lỗi TypeScript | Sửa từ lỗi compiler thật sau khi cài đủ type declarations |

Thảo luận cộng đồng LiveKit ngày 9–10/11/2026 cho thấy cùng tổ hợp phiên bản có thể gây ERESOLVE, nhưng cũng có mẫu build với `react-dom` cùng React và override RSC. Vì vậy không thể kết luận **đã giải quyết ERESOLVE** chỉ bằng việc ghim phiên bản mà chưa chạy npm resolver thực tế. Nguồn tham khảo: https://community.livekit.io/t/expo-sdk-58-react-native-0-88-livekit-3-1-0-npm-eresolve-dependency-conflict/2481 ; Expo: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

## Chuẩn bị nghiệm thu điện thoại

Sau khi `technicalGate=PASS`, thay ID `com.example...` bằng Android package và iOS bundle identifier thuộc quyền sử dụng của dự án; cung cấp `EXPO_PUBLIC_TUTTT_API_URL` là origin HTTPS staging hoặc IP LAN truy cập được từ thiết bị. **Không** nhập LiveKit API secret vào ứng dụng. Chạy development build (không dùng Expo Go cho WebRTC), kiểm tra mic/camera, thu hồi quyền giữa phiên, chuyển Wi-Fi ↔ 4G, Bluetooth, nền/foreground và cuộc gọi hai chiều trên hai thiết bị. Ghi log thiết bị, phiên bản OS và kết quả từng kịch bản trước khi gọi là đạt.
