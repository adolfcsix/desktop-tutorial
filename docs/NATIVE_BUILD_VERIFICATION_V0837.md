# Túttt v0.8.37 — Hướng dẫn cài và nghiệm thu Expo/LiveKit

**Phạm vi:** kiểm tra dependency, `expo-doctor`, `tsc --noEmit` và cửa kiểm soát môi trường build. Đây không phải biên bản nghiệm thu WebRTC trên điện thoại thật.

## Thay đổi quan trọng

- Expo SDK 58 khai báo React Native 0.88.0 / React 19.3.0. Đã loại `backgroundColor` khỏi `<StatusBar>` để tránh dùng prop bị xóa trên RN 0.88. Nền phần safe area vẫn dựa vào theme.
- `mobile/package.json` khai báo cố định `expo-doctor` 1.21.6 và phiên bản công cụ TypeScript/@types/react; giữ `react-dom` đúng bản React và `react-server-dom-webpack` override cùng bản. Cấu hình trên là **khai báo phòng ngừa xung đột**, chưa chứng minh npm giải được peer tree.
- `scripts/doctor_native.mjs` kiểm tra thêm tương thích SDK 58, bộ pin React và dữ liệu gốc trong lockfile; không thay thế `npm install --strict-peer-deps`.
- `scripts/verify_native.mjs` kiểm tra tuần tự lockfile/installation, Expo dependency version check, Expo Doctor, TypeScript semantic, và cấu hình Native. Không báo PASS khi thiếu dependencies hoặc khi cổng cấu hình chưa đạt.
- Không tạo `mobile/package-lock.json` thủ công khi npm không tải được gói. Lockfile chỉ được commit sau khi `npm install` strict thành công và `npm ci` chạy lại thành công.

## Lệnh chạy trên máy phát triển

Yêu cầu: Node >= 22.13.0, có Internet/npm registry, môi trường Expo Dev Client và LiveKit. *Không dùng Expo Go* cho WebRTC Native.

```bash
# Tại thư mục gốc dự án
node --version
npm run doctor:native

# Cài trên máy có kết nối Internet, CHẶN peer conflict thay vì bỏ qua
npm run verify:native -- --install

# Nếu đã có lockfile: npm ci sẽ được dùng để cài tái lập
npm run verify:native

# Xuất báo cáo máy đọc được (không tải package)
npm run verify:native -- --json
```

Nếu chưa có `mobile/package-lock.json`, tùy chọn `--install` sử dụng `npm install --strict-peer-deps` để npm tạo lockfile thật. Nếu lockfile đã tồn tại, sử dụng `npm ci --strict-peer-deps`. Không dùng `--force` hoặc `--legacy-peer-deps` để lách xung đột. Kết quả đầy đủ được lưu ở `docs/qa-v0837/native-verification.json`.

**Ba điều kiện chưa tự giải quyết:** thay `com.example.tuttt.preview` bằng `android.package`/`ios.bundleIdentifier` của ứng dụng được sở hữu; tạo `mobile/.env` với `EXPO_PUBLIC_TUTTT_API_URL` trỏ đến HTTPS staging/địa chỉ LAN hợp lệ; xác minh tài khoản ký Android/Apple và quyền truy cập SFU. Không đưa LIVEKIT_API_SECRET hoặc token admin vào biến `EXPO_PUBLIC_*`.

Khi `verify:native` đạt PASS và có môi trường ký build, chạy `cd mobile && npx expo run:android` trên máy có Android SDK, hoặc EAS development build trên nền tảng phù hợp. Xác nhận `expo-doctor`, `expo install --check`, `tsc --noEmit` chạy sạch trên cây phụ thuộc vừa cài trước khi ghi nhận Native-ready.

## Ma trận kiểm thử hai máy bắt buộc

1. Cặp Android/Android, iOS/iOS, nếu có thể thêm Android/iOS.
2. Voice mic mở/đóng hai chiều; máy còn lại nhận được track đang nói và không nhận được khi tắt.
3. Camera bật/tắt, vào nền/ra nền nhanh và quyền OS bị từ chối.
4. Host thu hồi ghế/camera khi đang publish; phó phòng không chỉnh chủ phòng.
5. Wifi sang 4G và 4G sang Wi-Fi; xác nhận reconnect không tự mở mic/camera.
6. Bluetooth, tai nghe dây, đổi thiết bị xuất âm và có cuộc gọi tới.
7. Rời phòng, đóng app, bị kick/ban; chỉ báo quyền riêng tư của OS phải tắt đúng.
8. Danh sách trên 100 người xem, scroll và đổi theme không tràn hoặc giật bất thường.

Mỗi ca cần ghi **hệ điều hành, máy, giờ thử, phiên bản build, URL/ID SFU không chứa secret, log Metro/Logcat/Console và PASS/FAIL**. Lệnh `verify:native` *không* thực hiện các ca này.

Nguồn kỹ thuật: https://docs.expo.dev/versions/v58.0.0/ ; https://expo.dev/blog/how-to-upgrade-to-sdk-58 ; https://docs.livekit.io/transport/sdk-platforms/expo/ ; báo cáo conflict Expo/LiveKit ngày 09–10/11/2026: https://community.livekit.io/t/expo-sdk-58-react-native-0-88-livekit-3-1-0-npm-eresolve-dependency-conflict/2481 .
