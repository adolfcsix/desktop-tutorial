# Túttt v0.8.39 — Development build Android / iOS

## Điều kiện máy phát triển

- Node.js >=22.13.0, npm tương thích, Internet tới `https://registry.npmjs.org`.
- Android: Android SDK, JDK, emulator hoặc máy vật lý với USB debugging. iOS: macOS/Xcode và thiết bị + quyền ký ứng dụng phù hợp, hoặc EAS cloud build với tài khoản Expo/Apple.
- LiveKit cần native modules: **Expo Go không hỗ trợ**. Phải sử dụng Expo development client.
- Một API staging có thể truy cập từ thiết bị; để thử qua HTTP LAN cần kiểm tra quyền network security của từng nền tảng, HTTPS được ưu tiên. Không đặt LiveKit API secret vào biến `EXPO_PUBLIC_*`.

## Chuẩn bị danh tính ứng dụng (không commit vào Git)

`app.json` chứa ID demo `com.example.tuttt.preview`; chúng không dùng để ký bản phát hành. Đặt hai biến môi trường trước khi build:

```sh
export TUTTT_ANDROID_APPLICATION_ID=vn.yourcompany.tuttt
export TUTTT_IOS_BUNDLE_ID=vn.yourcompany.tuttt
export EXPO_PUBLIC_TUTTT_API_URL=https://your-real-staging-host.example
```

Thay bằng định danh và địa chỉ thật thuộc quyền quản lý của bạn. Nếu build bằng EAS cloud, cấu hình các biến ở môi trường EAS tương ứng, đừng chỉ dựa vào biến trong terminal máy cá nhân. Các biến ID ứng dụng là công khai; token, khóa máy chủ và mật khẩu phải để ở backend hoặc secret store an toàn.

`mobile/app.config.js` chỉ ghi đè Android package / iOS bundleIdentifier khi có biến hợp lệ. Nếu trống, giữ cấu hình ví dụ để có thể mở UI offline và báo cảnh báo trong preflight.

## Cài package và kiểm tra nghiêm ngặt

Từ thư mục gốc của dự án:

```sh
node scripts/doctor_native.mjs --strict
node scripts/verify_native.mjs --install
# Khi đã có package-lock.json thật, những lần sau:
node scripts/verify_native.mjs
```

`verify_native` kiểm tra lockfile npm v3, cài `npm ci --strict-peer-deps`, kiểm tra cây dependencies, chạy `expo install --check`, Expo Doctor và `tsc --noEmit`. Không dùng `--force` hoặc `--legacy-peer-deps` để che xung đột. **Chỉ trạng thái `technicalGate: PASS` mới xác nhận được việc cài đặt + typecheck**, không xác nhận build hay media.

Nếu gặp `EAI_AGAIN`: sửa DNS/Internet đến npm registry trước khi chạy lại; `ENOTCACHED`: cần tải các gói thiếu; `ERESOLVE`: đối chiếu peer dependency Expo 58/React/LiveKit và điều chỉnh bằng lockfile npm thật, không tự tạo lockfile thủ công.

## Tạo development build (sau khi kiểm tra dependency đạt)

```sh
cd mobile
npm run android                # Android Studio/SDK + máy hoặc emulator
npm run ios                    # Chỉ chạy trên macOS có Xcode
npm run start                  # Dev client, không phải Expo Go
```

Hoặc tạo build nội bộ bằng EAS profile `development` sau khi đăng nhập, cấu hình signing/certificates và biến môi trường trên EAS. Không thể thay thế các bước đó bằng bản HTML preview.

## Nghiệm thu tối thiểu hai điện thoại

1. Hai máy đăng nhập khác tài khoản, vào cùng một phòng LiveKit SFU thực. Kiểm tra âm thanh hai chiều; kiểm tra camera với từng quyền độc lập.
2. Thu hồi mic/camera khi đang phát: track phải tắt và không tự bật lại. Thử lúc OS đang hiện hộp thoại xin quyền.
3. Đưa ứng dụng vào nền, mở lại; camera không tự bật lại. Rời ghế và rời phòng phải giải phóng track thật (quan sát đèn quyền riêng tư).
4. Chuyển Wi-Fi ↔ 4G/5G, dùng Bluetooth, gọi điện đến/đi. Ghi lại các trạng thái reconnect, chất lượng âm thanh và audio routing riêng cho Android/iOS.
5. Bảo đảm người xem không mở được quyền quản trị; menu `•••` chỉ xuất hiện một lần, chat nổi không che thao tác PK.

Chỉ chuyển các mục trên từ `NOT_RUN` sang `PASS` khi có nhật ký thiết bị và kết quả thực nghiệm. Không lưu token hay thông tin cá nhân vào ảnh chụp/nhật ký nghiệm thu.
