# Túttt v0.8.36 — Native readiness / nghiệm thu media

**Ngày:** 12/11/2026. **Nguồn nâng cấp:** v0.8.35. **Trạng thái:** nâng cấp mã nguồn + kiểm thử offline; **chưa nghiệm thu thiết bị thật, build, hay typecheck semantic**.

## Các thay đổi hoàn tất

1. `mobile/src/voice/LiveVoice.ts`: Cho phép **tắt** mic/camera dù quyền publish bị thu hồi. Chỉ thao tác **bật** mới bắt buộc còn ghế/quyền phát/đúng nguồn phát.
2. Rời ghế là hành động tắt có chủ đích (`setMicrophoneEnabled(false)` và `setCameraEnabled(false)` khi track đang phát), không gọi lại toggle dựa vào UI. Pending permission prompt được vô hiệu hóa bằng `mediaEpoch`, kết quả cấp quyền đến muộn phải tự tắt.
3. Khi driver báo tắt media thất bại, ứng dụng chủ động yêu cầu thoát phiên LiveKit thay vì giữ phòng với icon hiển thị đã tắt. Lỗi vẫn hiển thị để người dùng kiểm tra chỉ báo camera/mic của hệ điều hành. Hành vi driver và việc giải phóng track **chưa được xác nhận trên điện thoại thật**.
4. `scripts/doctor_native.mjs`: kiểm tra *khai báo* Expo 58 / React 19.3 / React Native 0.88 / Node >=22.13.0, package-lock.json và các điều kiện phát hành trước đó. Kiểm tra này không xác nhận peer dependency hay binary tương thích.
5. Tăng 9 ca hồi quy mới (7 kiểm soát media, 2 kiểm soát cấu hình), đồng bộ root/server/mobile/app/HTML lên v0.8.36. Không thêm nút, toolbar hay hoạt ảnh.

## Kết quả thực chạy

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm test` | **360/360 PASS** | Unit, API, mocks; không có âm thanh thật |
| `npm run qa:release -- --fast` | **4/4 PASS** | Bộ kiểm tra native cho phép WARN và nêu chặn thực tế |
| Parse TypeScript/TSX Native | **16/16 PASS** | TypeScript 5.8.3 transpile syntax; KHÔNG phải typecheck |
| Chromium HTML Voice/Cam × sáng/tối | **4/4 PASS** | HTML offline, không có WebRTC Native |
| Chromium menu Live/PK (320/390/430px × sáng/tối × Voice/Cam) | **12/12 PASS** | Browser UI, không phải thiết bị thật |
| `npm run doctor:native` | **WARN** | ID ứng dụng mẫu, chưa có lockfile, chưa có node_modules Native, chưa đặt API |
| `npm run doctor:native -- --strict` | **FAILED GATE đúng kỳ vọng** | Không được công bố Native-ready nếu còn WARN |
| `npm run typecheck:native` | **CHƯA ĐẠT** | Thiếu React/React Native/Expo types vì chưa cài dependency; TS báo không tìm thấy module |
| `npm install --prefix mobile --offline` | **ENOTCACHED** | Không có gói `@config-plugins/react-native-webrtc` trong cache |
| `npm install --prefix mobile` | **Không hoàn tất** | Lượt tải registry không phản hồi trước timeout kiểm tra |
| EAS dev build / APK / IPA / thiết bị thật | **NOT RUN** | Cần npm packages, signing, Android/iOS toolchain / môi trường thử |

## Ma trận chuẩn Expo SDK 58

- Expo SDK 58 → React Native 0.88, React 19.3.0, Node.js tối thiểu 22.13.x. Dự án hiện **khai báo đúng dòng nền**, chưa xác nhận `npm install` có resolve được toàn bộ peer dependencies.
- LiveKit React Native sử dụng `@livekit/react-native`, `@livekit/react-native-expo-plugin`, `@livekit/react-native-webrtc`, `@config-plugins/react-native-webrtc`, `livekit-client` và **Expo development build**, không dùng Expo Go.
- Tài liệu tham khảo: https://docs.expo.dev/versions/v58.0.0/ và https://docs.livekit.io/home/quickstarts/expo .

## Bước thực hiện trên máy phát triển có Internet/Android Studio hoặc EAS

```bash
node --version                # >= 22.13.0
npm install --prefix mobile   # sẽ tạo mobile/package-lock.json
npm run typecheck:native
cd mobile
npx expo install --check
npx expo-doctor
cd ..
npm run doctor:native -- --strict
```

Trước khi chạy `doctor:native --strict`, thay `com.example.tuttt.preview` trong `mobile/app.json` bằng ID của ứng dụng đang sở hữu; tạo `mobile/.env` từ mẫu và đặt `EXPO_PUBLIC_TUTTT_API_URL` (HTTPS staging do chính bạn quản lý, không cho secret phía máy chủ vào EXPO_PUBLIC_*). Với HTTP qua LAN, phải xác minh Android cleartext / iOS ATS thật trước khi bỏ cảnh báo. Kiểm tra `mobile/eas.json` và quyền ký Apple/Android; sau đó:

```bash
cd mobile
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npm start
```

**Bàn giao nghiệm thu hai thiết bị:** tiếp tục ma trận D01–D10 trong `docs/NATIVE_DEVICE_READINESS_V0835.md`, đặc biệt D02–D05 (thu hồi quyền khi đang phát/OS dialog đến muộn), D06 (chuyển Wi-Fi/4G), D07 (Bluetooth/cuộc gọi), D08 (phân quyền host/moderator), D09 (100+ người xem), D10 (sáng/tối). Phải ghi log hai thiết bị + SFU; không chấm PASS nếu chưa chạy.

## Ranh giới an toàn

Không thể bảo đảm một driver đã dừng thu camera/mic chỉ bằng sự kiện LiveKit hoặc mock: khi `setEnabled(false)` báo lỗi, code sẽ cố ngắt kết nối và yêu cầu kiểm tra chỉ báo riêng tư của thiết bị. Chỉ nghiệm thu thật mới xác định được track còn tồn tại hay bị đóng hoàn toàn. Thao tác rời ghế sẽ không báo thành công nếu chưa xác nhận lệnh tắt; trong tình huống lỗi sẽ yêu cầu ngắt phiên.
