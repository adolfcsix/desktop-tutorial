# Túttt v0.8.35 — Chuẩn bị development build & nghiệm thu media thật

**Trạng thái:** Có thể tiến hành quy trình chuẩn bị từ mã nguồn. **Chưa cấp bản APK/IPA, chưa nghiệm thu thiết bị hoặc LiveKit SFU thực.** Không sử dụng Expo Go vì ứng dụng dùng LiveKit WebRTC native.

## 1. Trước khi build

Cần máy phát triển có Node.js >=20, npm, Android Studio/SDK hoặc quyền truy cập dịch vụ build Expo EAS. iOS cần macOS/Xcode khi build tại máy, hoặc EAS và quyền ký ứng dụng Apple khi build trên đám mây. Cần tối thiểu **hai điện thoại thật**, cùng một máy chủ API và LiveKit SFU mà cả hai truy cập được.

```bash
npm install
npm --prefix mobile install
npm run doctor:native
npm run typecheck:native
cd mobile && npx expo-doctor && cd ..
```

Nếu chưa có `node_modules`, không coi kết quả parse TypeScript thay cho `tsc --noEmit`. Trước khi ký bản phát triển, thay `com.example.tuttt.preview` trong `mobile/app.json` bằng application IDs mà bạn quản lý (hai nền tảng có thể dùng cùng chuỗi tên miền đảo).

Chỉ đặt **địa chỉ API công khai cho ứng dụng**, không đưa `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` hoặc token server vào biến `EXPO_PUBLIC_*`. Ví dụ `mobile/.env.example` là placeholder, phải thay bằng địa chỉ thật, không được copy nguyên.

- Thử bằng HTTPS staging là cách dễ xác thực nhất trên iOS và Android.
- Nếu dùng HTTP qua mạng LAN như `http://192.168.x.x:8787`, kiểm tra cấu hình Android cleartext, iOS ATS, firewall, cô lập mạng thử nghiệm và xác nhận URL có thể mở từ cả hai điện thoại. **Chưa cấu hình/kiểm chứng các ngoại lệ HTTP ở bản này.** Không đưa API HTTP LAN lên Internet.
- Nếu backend chạy local, có thể chuẩn bị `.local/` bằng `npm run prepare:livekit:local -- --lan-ip <IPv4-LAN>` và chạy SFU/API theo tài liệu `docs/LIVEKIT_LOCAL_SFU_V0824.md`. Mở đúng cổng LiveKit UDP/TCP cần thiết ở máy chủ. Địa chỉ `localhost` trên máy tính không dùng được từ điện thoại.

Để kiểm tra nguồn API được cung cấp:

```bash
npm run doctor:native -- --api https://api-staging.example.net --strict
npm run preflight:live -- --url https://api-staging.example.net --require-livekit
```

Thay hai địa chỉ mẫu trong lệnh trên bằng **tên miền thật**. `doctor:native` chỉ kiểm tra cấu trúc và chuỗi URL; `preflight:live` chỉ kiểm tra sức khỏe API và trạng thái cấu hình LiveKit, **không chứng minh chất lượng truyền media**. Nếu thử LAN HTTP, `doctor:native` phát cảnh báo; không bỏ qua vấn đề ATS/cleartext bằng cách coi cảnh báo đó là đã đạt.

## 2. Tạo development build

Đã bổ sung `mobile/eas.json` với profile `development` (Android APK nội bộ, iOS device build) và `development-simulator` (iOS Simulator). Cần Expo account/Apple provisioning do chính người vận hành quản lý; chưa có EAS project ID hoặc credentials trong repo.

```bash
cd mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npm start
```

Có thể dùng `npm run android` để build native Android tại máy khi SDK sẵn sàng. iOS Simulator không thay thế được kiểm tra media trên iPhone thật. Thứ tự phiên đăng nhập, token, quyền nói/camera không được tự cấp bằng mã phía client.

## 3. Ma trận nghiệm thu hai thiết bị

| Mã | Điều kiện / thao tác | Kết quả cần đạt | Minh chứng cần thu |
|---|---|---|---|
| D01 | A tạo phòng Voice, B tham gia, chưa bật mic | Không track microphone/camera nào tự publish | SFU publications, trạng thái UI |
| D02 | A cấp ghế mic cho B, B bật mic rồi thu hồi | Tiếng B dừng, B không phát lại tự động | Hai bản ghi thời điểm, SFU |
| D03 | B có ghế mic nhưng không có quyền camera | B có thể nói nếu được phép, không mở được camera | Quyền roster + publication |
| D04 | B mở camera, chuyển app xuống nền rồi mở lại nhanh | Camera tắt; mở lại không tự publish; tap sau khi dừng xong mới được bật | Indicator camera của OS, logs |
| D05 | Thu hồi quyền khi dialog xin phép OS chưa hoàn tất | Grant muộn không làm phát mic/cam | OS permission + SFU logs |
| D06 | Wi-Fi ↔ dữ liệu di động, airplane mode ngắn | Trạng thái reconnect trung thực, không bật lại media trái phép | Timestamps, connectivity events |
| D07 | Tai nghe Bluetooth/cắm dây/cuộc gọi đến, khóa màn hình | Không tự khẳng định đường loa; không rò capture sau khi rời | Ghi nhận thiết bị và audio route |
| D08 | Host/phó phòng/người xem thao tác menu `•••` | Chỉ đúng quyền; backend từ chối quyền không hợp lệ | HTTP response/audit |
| D09 | >100 người trong danh sách xem | Danh sách cuộn ổn, đếm theo dữ liệu server | Video cuộn, bộ nhớ/CPU |
| D10 | Voice/Cam sáng/tối, màn nhỏ | Không tràn, chat và nút mic/cam dễ bấm | Ảnh chụp 320–430dp |

**Tiêu chí PASS cho media:** Phải có quan sát trên cả hai thiết bị và bằng chứng SFU/OS. `mock tests`, `tsc`, browser preview hoặc kết nối signaling chưa đủ để chấm PASS D01–D07. Ghi FAILED/NOT RUN riêng từng ca, không tính những ca chưa chạy là đã qua.

## 4. Mẫu nhật ký thử thực tế

Ghi trên từng máy: model, OS, phiên bản app, mạng, thời điểm, ID phòng thử nghiệm, mã ca, kết quả, lời mô tả, lỗi ở console hoặc native logs (đã ẩn token/định danh nhạy cảm). Nếu một ca thất bại, tái hiện 2 lần trước khi đổi cấu hình hoặc mở rộng tính năng.

## 5. Các việc chưa hoàn thành trong môi trường hiện tại

- Không có iPhone/Android gắn vào phiên làm việc này; chưa chạy `expo run:android`, `expo run:ios` hay EAS build.
- Không có dependencies Native đã cài trong dự án để chạy typecheck đầy đủ hoặc `expo-doctor`.
- Chưa đo jitter, packet loss, độ trễ hay kiểm tra TURN/NAT, Bluetooth, tình huống gọi đến, đổi Wi-Fi/4G bằng SFU thật.
- Chưa có application IDs/Apple provisioning/Expo project cụ thể để ký bản phân phối.

Các chặn trên cần giải quyết trước khi công bố Túttt Native sẵn sàng nghiệm thu thực tế.
