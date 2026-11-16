# Túttt v0.8.41 — Hai cổng kiểm tra độc lập cho Native

Ngày: 12/11/2026. Nguồn: v0.8.40. Không thay đổi UI, không thêm nút hay chuyển động.

## Vì sao tách cổng?

Một dự án có thể **cài thư viện và typecheck thành công** nhưng vẫn chưa có Android application ID, iOS bundle identifier, staging API hoặc môi trường ký build. Ngược lại, ID và API hợp lệ không chứng minh dependency đã cài. Trước đây `technicalGate` có thể bị đánh BLOCKED chỉ do thiếu cấu hình thiết bị. Từ v0.8.41:

- `dependencyGate` / `technicalGate`: npm lock v3 thật, npm ci strict, direct dependencies, npm ls, `expo install --check`, **Expo config prebuild resolution**, Expo Doctor và semantic `tsc --noEmit` phải đạt.
- `deviceConfigGate`: đánh giá khai báo cấu hình iOS/Android/API/SDK (`PASS`, `NEEDS_CONFIGURATION` hoặc `FAIL`). Đây **không phải** chứng nhận thiết bị đã chạy.
- `nativeBuild` / `deviceMedia`: chỉ cập nhật khi thực sự tạo build và kiểm chứng media trên điện thoại, không tự nâng lên PASS.

## Chạy trên máy có npm registry hoạt động

```sh
node --version            # >=22.13.0
npm --version
npm run doctor:native
npm run verify:native -- --install
npm run verify:native -- --json
# Khi chuẩn bị build/test trên thiết bị: buộc cấu hình thiết bị cũng phải PASS
npm run verify:native -- --device
```

Nếu npm không tải được gói, dùng máy phát triển có Internet. Chỉ dùng lockfile do npm tạo, không tạo giả hoặc bypass peer dependency; không đưa secrets vào client. Sau khi `dependencyGate=PASS`, cấu hình `TUTTT_ANDROID_APPLICATION_ID`, `TUTTT_IOS_BUNDLE_ID`, `EXPO_PUBLIC_TUTTT_API_URL` trong môi trường build, chạy doctor lại, rồi mới thực hiện development build.

**Kết quả trong môi trường này:** npm registry `EAI_AGAIN`; thiếu `mobile/package-lock.json` và `mobile/node_modules`. `dependencyGate=BLOCKED`, `deviceConfigGate=NEEDS_CONFIGURATION`, Expo Doctor, TypeScript, APK/IPA và SFU trên hai điện thoại chưa chạy. Kiểm tra cú pháp/Node unit tests không thay cho TypeScript semantic.

Tham khảo: https://docs.expo.dev/versions/v58.0.0/ ; https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ ; https://docs.expo.dev/more/expo-cli/ .
