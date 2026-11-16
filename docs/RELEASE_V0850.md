# Túttt v0.8.50 — Đồng nhất sức chứa phòng và nghiệm thu phát hành có chứng cứ

**Ngày:** 13/11/2026. **Nguồn:** gói mã v0.8.49. **Phạm vi:** API tham gia phòng, đồng bộ giới hạn Live, kiểm thử phòng đông người, nghiệm thu offline, metadata phiên bản. **Giao diện và nghiệp vụ mic/camera/PK không thay đổi.**

## Lỗi được xác minh trước khi sửa

Tầng Live Stage công bố giới hạn **80 người**, nhưng `Store.join()` (API `POST /api/rooms/:id/join`) không áp dụng trần người tham gia. Trên phòng host chưa vào, 80 người nghe có thể chiếm mọi chỗ trước khi host quay lại. Kết quả là phòng có thể xuất hiện trên 80 người hoặc người dùng vào phòng thành công nhưng không được vào Live.

Ca `room entrance enforces ... reserving a host slot` trong `server/test/room_capacity_v0850.test.js` **FAIL trên mã v0.8.49** (không có lỗi 409 cho người nghe thứ 80). Hai ca về gia hạn/nhường chỗ đã PASS trước sửa.

## Mã đã sửa

- Định nghĩa `MAX_ROOM_PARTICIPANTS = 80` trong `server/storage.js`, cùng một hằng số được dùng bởi `server/stage.js`.
- Khi vào phòng, dọn presence đã hết hạn và từ chối lượt vào mới bằng **HTTP 409** nếu hết chỗ. Nếu host chưa có mặt, dành riêng **một vị trí**; không ưu tiên vượt trần cho moderator.
- Thành viên hiện diện được gia hạn bình thường; rời phòng hoặc presence hết hạn sẽ giải phóng chỗ.
- Giữ nguyên hành vi room lock và ban, không cấp quyền mic/camera mới.
- Cập nhật version v0.8.50 ở package root, backend, frontend và mobile.

## Kết quả chạy thực tế

| Nhóm | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm test` | **461/461 PASS** | Unit/API/mock SFU, không phải kiểm thử tải production |
| `node --test server/test/room_capacity_v0850.test.js` | **3/3 PASS** | Host reserve, gia hạn, hết hạn |
| `node --test server/test/http_room_capacity_v0850.test.js` | **1/1 PASS** | 81 tài khoản HTTP cùng phòng; trường hợp 409, host trở lại, leave/rejoin, audience |
| `npm run qa:release -- --fast` | **4/4 PASS** | Unit/API, cú pháp, audit khai báo Native, HTML export |
| `tests/browser_standalone_theme_v0818.py` | **4/4 PASS** | Voice/Cam × sáng/tối |
| `tests/browser_live_options_v0832.py` | **12/12 PASS** | Menu Live/PK trên 320/390/430 px |
| `tests/browser_chat_resilience_v089.py` | **4/4 PASS** | Chat dồn dập |
| `tests/browser_audience_reconnect_v0816.py` | **2/2 PASS** | Người xem ngắt và vào lại |
| `node scripts/doctor_native.mjs` | **Đã chạy, có cảnh báo** | Kiểm tra cấu hình/cú pháp nguồn, không phải semantic TypeScript |

## Chặn nghiệm thu cần giữ nguyên

- npm registry từ môi trường chạy trả **`EAI_AGAIN`**. `mobile/package-lock.json` và `mobile/node_modules` chưa hiện diện; **typecheck TS**, **Expo Doctor**, **Expo prebuild**, **APK/IPA** chưa chạy được.
- Android/iOS application IDs và API staging chưa đủ để chạy development build thật.
- Không có địa chỉ/khóa LiveKit SFU thật được cấu hình. Công cụ `verify:livekit:admin` từ v0.8.49 vẫn **chưa chạy trên SFU thật**; các phép thử SFU là mock.
- Chưa xác minh đường truyền media trên hai thiết bị, quyền publish thực tế, token cũ sau kick, Bluetooth, TURN/ICE hay Wi‑Fi ⇄ 4G.

## Lượt nghiệm thu Native tiếp theo

Trên máy có npm registry hoạt động, cấu hình `TUTTT_ANDROID_APPLICATION_ID`, `TUTTT_IOS_BUNDLE_ID`, `EXPO_PUBLIC_TUTTT_API_URL`, dịch vụ SFU và thông tin xác thực phù hợp. Chạy:

```bash
npm run verify:native -- --install --device
npm run verify:livekit:sfu
# CHỈ khi được phép tạo/xóa phòng tạm trên SFU:
npm run verify:livekit:admin
```

Không dùng Expo Go để xác nhận LiveKit Native; dùng development build, thử trên hai máy thật. **Không sử dụng `--force` hoặc `--legacy-peer-deps` để che xung đột dependency.**
