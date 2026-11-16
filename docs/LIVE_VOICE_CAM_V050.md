# Túttt v0.5.0 — Live Voice / Live Cam

## 1. Phạm vi triển khai

Phiên bản này nâng cấp tiếp từ v0.4.8. Tên ứng dụng **Túttt**; bên trong gọi **Live Voice**, **Live Cam**, **Chat**, **Khám phá**, **Cộng đồng**, **Cá nhân**. Giữ nguyên file logo đã duyệt `brand/approved/tuttt-approved-master.png` và hai theme Warm Ivory / Espresso Night.

- **Live Voice:** phòng âm thanh, 8 ghế mic tối đa ở stage SFU.
- **Live Cam:** phòng âm thanh/hình ảnh, **6 vị trí được phép phát camera, tính cả chủ phòng**. Những người còn lại là khán giả và không cần cấp quyền camera.
- **Khách + chủ phòng:** có thể tự bật/tắt mic và camera **sau khi được duyệt lên vị trí**. Camera/mic mặc định tắt, chỉ được bật bằng thao tác chủ động trên thiết bị.
- **Phân quyền:** chủ phòng, phó phòng (moderator), thành viên/khán giả.
- **Phòng:** khóa/mở cửa, tắt/mở chat chung, chat chậm 0/5/10/30/60 giây; yêu cầu lên ghế và host/mod duyệt.
- **Kiểm duyệt:** tắt chat cá nhân theo thời gian, mời khỏi phòng (kick), cấm tham gia (ban), hủy ban bởi host. Có bước xác nhận trong mobile.

### Tình trạng triển khai trung thực

- ✅ Đã lập trình backend tạo phòng, danh sách ghế, quyền và thao tác kiểm duyệt; đã chạy integration tests.
- ✅ Giao diện web tạo/chọn phòng và bản trình diễn bố cục 6 cam trong hai theme, không dựng video giả.
- ✅ React Native đã có nhánh bật/tắt camera qua LiveKit, danh sách 6 video tile, khóa camera theo quyền do server cấp, thẻ host/phó phòng và các thao tác quản trị.
- ⚠️ **Chưa thể chứng minh truyền hình/âm thanh thành công giữa hai điện thoại thật** vì môi trường chưa cài/build native và chưa có phiên LiveKit Cloud/self-hosted được nghiệm thu.
- ⚠️ Màn hình Cam của **web prototype** là bản xem trước bố cục và có thể điều khiển API stage khi LiveKit được cấu hình, **không xuất bản camera từ trình duyệt**. Camera video phải dùng native build ở giai đoạn này.
- ⚠️ Guest-session và JSON storage chỉ dùng phát triển thử nghiệm, không phù hợp sản phẩm thương mại; chưa có PostgreSQL, tài khoản thật hoặc quy trình chống tái phạm đa phiên.

## 2. Ma trận phân quyền

| Thao tác | Chủ phòng | Phó phòng | Thành viên |
|---|---|---|---|
| Bật/tắt mic, cam của chính mình | Sau khi có ghế | Sau khi có ghế | Sau khi được duyệt |
| Xin lên ghế | Ghế mặc định | Có thể xin | Có thể xin |
| Duyệt/thu hồi ghế | Có | Có | Không |
| Phong/bỏ phó phòng | Có | Không | Không |
| Kick người dùng | Có | Chỉ thành viên | Không |
| Ban người dùng | Có | Chỉ thành viên | Không |
| Mute/unmute chat người dùng | Có | Chỉ thành viên | Không |
| Bỏ cấm vào phòng | Có | Không | Không |
| Khóa phòng, khóa chat chung, chat chậm | Có | Không | Không |
| Báo cáo phòng | Có | Có | Có |

Không một tài khoản nào được phép kick/ban chính mình hoặc chủ phòng. Phó phòng không thể xử lý phó phòng khác. **Kick** chỉ ngắt kết nối, **ban** bổ sung thời hạn ngăn vào phòng. Với moderator, quyền tác động được kiểm chứng tại backend, không chỉ ẩn nút ở client.

## 3. API mới và thay đổi

| Route | Method | Công dụng |
|---|---|---|
| `/api/rooms` | POST | `type: "voice" | "cam"` (mặc định voice) |
| `/api/rooms/:id/live/token` | POST | Token LiveKit ngắn hạn với nguồn publish tương ứng mode và ghế |
| `/api/rooms/:id/live` | GET | Snapshot có `type`, `settings`, `limits.cameras`, `members`, `requests` |
| `/api/rooms/:id/live/seat-request` | POST | Xin lên mic/cam |
| `/api/rooms/:id/live/seat` | POST | Host/mod duyệt/thu hồi `{userId, enabled}` |
| `/api/rooms/:id/live/seat-leave` | POST | Tự rời ghế, ngắt publish |
| `/api/rooms/:id/live/moderate` | POST | `{userId, action, minutes?}`; action: `promote`, `demote`, `kick`, `ban`, `unban`, `mute-chat`, `unmute-chat` |
| `/api/rooms/:id/live/settings` | POST | Host thay đổi `{locked?, chatEnabled?, slowModeSeconds?}` |
| `/api/rooms/:id/messages` | POST | Từ chối nếu bị khóa chat / chat chung tắt / gửi quá nhanh |

`minutes` khi cấm vào phòng: 10, 60, 1440 hoặc 10080. Khi khóa chat cá nhân: 5, 10, 30, 60 hoặc 1440. Tất cả có kiểm tra đầu vào.

LiveKit không cấp `roomAdmin` cho client. Quyền publish được giới hạn: `voice` = microphone, `cam` = microphone + camera, chỉ người có ghế mới có quyền. Mặc định viewer có `canPublish=false`.

## 4. Tối ưu giao diện

**Voice** dùng thẻ chủ đề và sơ đồ ghế mic; **Cam** dùng lưới video 2 cột × 3 hàng, hiển thị mặt hoặc avatar khi camera tắt. Ô chủ phòng có nhãn riêng, ghế trống có dấu cộng. Chat, điều khiển camera/mic, yêu cầu lên ghế, chuyển vai trò và quản trị được nhóm rõ, không chồng lên video.

- Kích cỡ nút tác vụ chủ đạo gần hoặc trên 44 pt ở web; cần kiểm tra thực tế trên iOS/Android.
- Cam mặc định tắt, khi không có track không hiển thị hình giả.
- Trạng thái kết nối, mất kết nối, chờ duyệt và không cấp quyền cần phân biệt rõ.
- Dark/Light: nền kem – đỏ gạch và nền espresso – đỏ san hô. Logo được duyệt giữ nguyên nội dung.

## 5. Checklist nghiệm thu chưa thể tự chứng minh

1. Cài SDK LiveKit phù hợp phiên bản Expo, build bằng **Expo Development Build**, không dùng Expo Go.
2. Mở trên **hai thiết bị thật** với HTTPS/LiveKit Cloud hoặc SFU tự vận hành; xác nhận truyền mic/camera hai chiều và nhiều người.
3. Vào phòng cam với 1 host + 5 khách; người thứ 7 yêu cầu cam phải bị từ chối cho đến khi còn vị trí.
4. Ngắt kết nối host rồi reconnect, phải giữ được vị trí cho host; phòng vẫn tối đa 6 vị trí.
5. Thử Android chuyển foreground/background, iOS cuộc gọi đến, cấp/từ chối quyền mic/camera, khôi phục mạng yếu.
6. Host khóa chat, phó phòng mute chat khách, khách thử gửi phải bị server trả 403.
7. Phó phòng không thể kick chủ phòng hay bổ nhiệm phó phòng khác; thử gọi API trực tiếp, không chỉ thử ẩn nút.
8. Chạy screen reader/large fonts/safe area/keyboard trên iPhone và Android thật.
9. Thử disconnect khi đang phát cam: SDK phải ngắt track, giải phóng thiết bị.
10. Nếu triển khai thương mại: xác thực tài khoản thật, PostgreSQL, Redis, audit logs, công cụ kiểm duyệt người dùng, đồng ý ghi âm và chính sách dữ liệu.

## 6. Nghiên cứu kỹ thuật

- LiveKit: https://docs.livekit.io/transport/media/publish/
- Tokens & publishing sources: https://docs.livekit.io/frontends/reference/tokens-grants/
- React Native/Expo: https://docs.livekit.io/transport/sdk-platforms/expo/
- BIGO Live Multi-Guest (tham khảo mô hình ghế): https://www.bigo.tv/blog/bigo-live-video-call

Túttt chỉ tiếp thu nguyên tắc UI/UX và phân quyền phổ biến, không sao chép hình ảnh, mã nguồn hay thương hiệu của ứng dụng khác.
