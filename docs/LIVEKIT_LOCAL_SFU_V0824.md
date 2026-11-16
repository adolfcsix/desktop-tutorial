# Túttt v0.8.24 — Thiết lập LiveKit LAN và xác minh SFU bằng API có xác thực

**Mục tiêu:** đi từ “đã điền biến môi trường” sang “máy chủ LiveKit thực sự phản hồi API quản trị”. Kết quả vẫn **KHÔNG** thay thế nghe thử âm thanh hai chiều hoặc video trên hai thiết bị.

## 1. Phương án A — LiveKit Cloud

1. Tạo dự án LiveKit trên tài khoản của chính bạn; nhận URL `wss://...`, API key và API secret theo hướng dẫn của nhà cung cấp.
2. Đặt cả ba biến **chỉ ở backend**: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Không đưa API key hoặc secret vào `EXPO_PUBLIC_*`, JavaScript web, ảnh, ảnh chụp màn hình, mã nguồn hay repository.
3. Cài server dependencies: `npm install --prefix server`; chạy backend theo cấu hình riêng của máy.
4. Chạy `npm run verify:livekit:sfu -- --api https://DIA_CHI_API_TUTTT` từ **máy chủ phát triển có biến LiveKit**, để xác minh cả `/api/health` và `RoomServiceClient.listRooms()` có xác thực. Nếu chưa có API công khai, chạy `npm run verify:livekit:sfu` chỉ kiểm tra SFU.
5. Điện thoại truy cập API **HTTPS tin cậy** và LiveKit **WSS**. Cần Expo development build, không dùng Expo Go, vì LiveKit dùng native WebRTC.

Lệnh `preflight:live` cũ chỉ xác minh **backend đã cấu hình LiveKit**, không kiểm tra tính đúng của key/secret hoặc LiveKit đang phục vụ. Lệnh `verify:livekit:sfu` mới gọi **API LiveKit có xác thực**, nhận phản hồi trước khi báo PASS. Không in token, key, secret hay danh sách phòng.

## 2. Phương án B — LiveKit chạy trong LAN bằng Docker Desktop

Phù hợp để phát triển cục bộ với Android/iOS trong mạng thử nghiệm. **Không triển khai nguyên cấu hình này lên Internet hoặc dùng với người dùng thực**: cổng HTTP/WebSocket chưa được mã hóa, không có TLS/đường TURN hoàn chỉnh và Docker Desktop trên Windows có thể cần cấu hình firewall/UDP riêng.

1. Xác định IPv4 mạng riêng (10.x, 172.16–31.x, 192.168.x) **của máy tính chạy Docker**, ví dụ `192.168.1.242`. Không dùng `127.0.0.1`, `localhost`, IP điện thoại hoặc VPN.
2. Cài Docker Desktop và mở terminal ở thư mục dự án Túttt:

```powershell
npm run prepare:livekit:local -- --lan-ip 192.168.1.242
docker compose -f compose.livekit.yml up -d
npm install --prefix server
npm run dev:api:local
```

Lệnh chuẩn bị tạo **hai tệp không được đưa lên Git** trong `.local/`: `livekit.yaml` chứa cổng/đường media + khóa server, và `livekit.env` chứa cùng key/secret để backend dùng. Cả hai được tạo với tên ngẫu nhiên/secret mạnh, cố gắng giới hạn quyền đọc cho chủ sở hữu trên hệ Unix, và **không bị ghi đè** nếu chạy lệnh hai lần. Không gửi hai tệp này cho người khác. `.gitignore` bỏ qua `.local/`.

3. Mở terminal khác và thử:

```powershell
npm run preflight:live -- --url http://192.168.1.242:8787 --require-livekit
npm run verify:livekit:sfu -- --api http://192.168.1.242:8787
```

- `preflight:live` **PASS** = API Túttt chạy và nhận thấy đủ biến LiveKit; **chưa chứng minh** đã nối được SFU.
- `verify:livekit:sfu` **PASS** = backend API hợp lệ và **LiveKit RoomService API trả lời bằng xác thực đúng**; **vẫn chưa chứng minh** mic/camera hai chiều.
- `verify:livekit:sfu` **FAIL** = cần kiểm tra Docker logs, IP/cổng, khóa LiveKit, network/firewall hoặc TLS. Không xuất nội dung `.local/livekit.env` khi xin hỗ trợ.

Để xem lỗi container: `docker compose -f compose.livekit.yml logs --tail 60 livekit`. Để dừng server media: `docker compose -f compose.livekit.yml down`.

**Lưu ý Windows:** Docker Desktop có thể thay đổi cách NAT/định tuyến UDP. Cấu hình đã đưa dải UDP 50000–50019 và TCP 7880/7881 ra ngoài, đồng thời quảng bá `node_ip` bằng IP LAN đã cung cấp. Nếu IP thay đổi, phải tạo lại cấu hình LAN cẩn thận (dừng server cũ, sao lưu ngoài Git nếu cần, xóa hai tệp `.local/`, tạo lại khóa, khởi động lại Docker + API). Không mở các cổng này trên router Internet. **Docker Compose mặc định xuất bản cổng trên các giao diện của máy chủ**, vì thế cần chặn truy cập ngoài mạng thử bằng firewall; không dùng với mạng Wi-Fi công cộng.

## 3. Thiết bị thật và quyền microphone/camera

- Android: có Android SDK và Expo development build. Cài dependencies `npm install --prefix mobile`, đặt biến `EXPO_PUBLIC_TUTTT_API_URL` trỏ tới API **điện thoại truy cập được** trước khi build. Đối với Android chạy trong LAN, HTTP cleartext có thể bị chặn bởi chính sách app/OS; cần HTTPS tin cậy nếu gặp lỗi.
- iOS: build native trên macOS/Xcode hoặc hệ thống build tương thích; iOS có thể chặn HTTP và WebSocket không mã hóa theo App Transport Security. **Ưu tiên LiveKit Cloud WSS + backend HTTPS** để nghiệm thu iPhone. Không coi cấu hình Docker HTTP ở trên là giải pháp sản xuất.
- Thử bằng **hai tài khoản và hai điện thoại khác nhau**, vào cùng một phòng Voice và một phòng Cam. Lần lượt xác minh nghe hai chiều, bật/tắt mic có hiệu lực, mute icon, viền người đang nói, video thật (không chỉ placeholder), xin/rời ghế, rời/vào nhanh, chuyển Wi-Fi ↔ 4G, Bluetooth và app background ↔ foreground.
- Không ghi log audio/video thô hoặc token đăng nhập; lưu tối thiểu **thiết bị, OS, mạng, giờ, thao tác, kỳ vọng, kết quả, screenshot không lộ bí mật**.

### Ma trận nghiệm thu (phải điền kết quả thật)

| Kịch bản | Thiết bị A | Thiết bị B | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| A bật mic, B nghe và ngược lại | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |
| Tắt mic và xác minh viền/biểu tượng | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |
| Camera thật, hai chiều/không giả khung | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |
| Chuyển Wi-Fi/4G khi đang Live | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |
| Kết nối tai nghe Bluetooth và rút/ghép lại | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |
| Rời/vào nhanh, đổi phòng | Chưa thử | Chưa thử | **CHƯA NGHIỆM THU** | — |

## 4. Quy tắc an toàn và giới hạn

- Tệp `.local` không được commit/đưa vào ZIP. Nếu từng để lộ key/secret, **xoay khóa** và tạo cấu hình mới.
- Không nhầm `livekitConfigured=true` với SFU online; không nhầm RoomService API PASS với WebRTC/ICE hoặc định tuyến Bluetooth PASS.
- Docker, Android SDK và thiết bị không có trong môi trường kiểm thử hiện tại. Các bước Docker và thiết bị là **quy trình để chạy thực tế**, không được ghi là đã chạy thành công.
- Không chỉnh PK Voice/Cam, thang điểm, hai theme Ivory/Espresso hay logo chính thức trong mốc chuẩn bị hạ tầng này.
