# Túttt v0.8.42 — Hai cổng Native thực sự độc lập

## Lỗi ở bản trước

`verify:native` từng gán `deviceConfigGate` từ `inspectNativeProject().status`. Nhưng kiểm tra tĩnh này bao gồm cả trạng thái lockfile và thư viện đã cài, vì thế ngay cả khi Android/iOS ID và HTTPS API được khai báo đầy đủ, `deviceConfigGate` vẫn báo `NEEDS_CONFIGURATION` khi thiếu `node_modules`. Đây là lỗi phân loại kết quả, **không phải** lỗi runtime LiveKit.

## Cách phân loại mới

- **`dependencyGate`:** khóa npm thực, cây thư viện đúng phiên bản, npm strict install, Expo dependency check, Expo config prebuild, Expo Doctor và TypeScript semantic. Chưa chạy/thiếu gói: `BLOCKED`.
- **`deviceConfigGate`:** chỉ xét ID Android/iOS, `EXPO_PUBLIC_TUTTT_API_URL` (origin HTTPS), quyền camera/mic, dev client và EAS development profile. `PASS` không xác nhận mạng hay hai thiết bị thật.
- **`configAuditGate`:** toàn bộ kiểm tra khai báo ngoại tuyến, bao gồm các vấn đề lockfile, TypeScript API cũ và các cảnh báo khác.
- **`nativeBuild`/`deviceMedia`:** giữ `NOT_RUN` cho tới khi có kết quả build hoặc media thực tế, không bao giờ suy từ hai cổng trên.

## Lệnh

```bash
npm run doctor:native
npm run verify:native -- --json
npm run verify:native -- --device
npm run qa:release -- --fast
```

Có thể thử tách biệt *chỉ kiểm tra cấu hình* với những giá trị ID và API thuộc quyền quản lý của bạn:

```bash
TUTTT_ANDROID_APPLICATION_ID=vn.yourcompany.tuttt \
TUTTT_IOS_BUNDLE_ID=vn.yourcompany.tuttt \
EXPO_PUBLIC_TUTTT_API_URL=https://your-staging.example.net \
npm run verify:native -- --json
```

Địa chỉ và ID trên chỉ minh họa cho cấu trúc lệnh, **không phải dịch vụ thật**. Trường hợp này có thể `deviceConfigGate=PASS`, trong khi `dependencyGate=BLOCKED` nếu chưa có bộ gói đầy đủ. `--device` vẫn thất bại khi dependency bị chặn. Đừng dùng `--force`, `--legacy-peer-deps` hoặc tự tạo lockfile.

## Thực trạng môi trường

npm registry bị lỗi DNS `EAI_AGAIN`; không có `mobile/package-lock.json` hợp lệ hoặc `mobile/node_modules` để chạy Expo Doctor / `tsc --noEmit`. Typecheck TS/TSX cú pháp và kiểm thử mock không thay thế typecheck/LiveKit trên thiết bị thật.
