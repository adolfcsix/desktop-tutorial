# Túttt v0.6.0 — Nghiệm thu Live Voice & PK hữu nghị

Ngày cập nhật: 11/11/2026. Kế thừa trực tiếp v0.5.9, không tạo dự án rời.

## I. Thiết kế

- Live Voice: avatar host ở vị trí trung tâm, khách mời nhỏ hơn phía dưới, không dàn hàng ghế trống làm rối. Mic tắt có badge gạch chéo, viền xanh chỉ khi phát hiện người đang nói.
- Live Cam: giữ bố cục tối giản, avatar tròn khi tắt cam, video thật chỉ hiện khi LiveKit cấp track. Tối đa 6 camera, tính cả chủ phòng.
- Không thêm thanh chuyển chế độ xem. Danh sách người xem mở từ số người đang xem, quản trị mở riêng. Chat luôn là lớp đọc độc lập, nổi nhẹ và có thanh nhập cố định.
- PK: một nút ⚡ PK; không thêm tab thường trực. Khi trận bắt đầu, bảng điểm xuất hiện gọn giữa thông tin phòng và sân khấu. Phòng Voice tự thu sân khấu khi PK để tránh đè chat.
- Hai theme Warm Ivory và Espresso Night dùng chung luồng hiển thị; logo graffiti TUT được duyệt giữ nguyên.

## II. Luồng PK đã có mã thật

1. Chủ phòng A tạo và tham gia phòng loại Voice hoặc Cam.
2. Chủ phòng B tạo và tham gia một phòng **cùng loại** ở một phiên đăng nhập khác.
3. A mở ⚡ PK, chọn phòng B và mời đấu mặc định 3 phút.
4. B nhận lời mời, bấm Chấp nhận hoặc Từ chối. Lời mời tự hết hạn sau 60 giây.
5. Khi B đồng ý, backend tạo một trận và công bố hai phía, đồng hồ server, bảng điểm. Chỉ 1 trận hoặc 1 lời mời chờ/phòng.
6. Khán giả trong mỗi phòng có thể bấm Cổ vũ. Mỗi lần là **1 điểm miễn phí**, cách nhau ít nhất 2 giây và tối đa 30 lần/người/trận. Điểm do server ghi nhận, không được client nhập số điểm.
7. Hết thời gian, server chốt thắng/thua/hòa. Nếu host kết thúc sớm hoặc rời phòng, phía còn lại thắng do bỏ cuộc. Lưu lịch sử trận trong file dữ liệu demo.

**Không có coin/quà tặng quy đổi tiền trong bản này.** Trên web offline có nút “Xem giao diện PK minh họa” và ghi rõ không phải trận thật. Không chèn điểm giả khi đã kết nối máy chủ.

## III. API

Tất cả endpoint dùng `Authorization: Bearer <token>` trên mobile hoặc cookie `tuttt_session` ở web; host và hội viên phòng được xác minh tại backend.

| Method | Route | Quyền |
|---|---|---|
| GET | `/api/rooms/:roomId/pk` | Thành viên phòng |
| POST | `/api/rooms/:roomId/pk/invite` `{opponentRoomId,durationSeconds}` | Host |
| POST | `/api/rooms/:roomId/pk/respond` `{invitationId,accept}` | Host bên nhận |
| POST | `/api/rooms/:roomId/pk/cancel` `{invitationId}` | Host bên gửi |
| POST | `/api/rooms/:roomId/pk/cheer` `{matchId}` | Thành viên phòng |
| POST | `/api/rooms/:roomId/pk/end` `{matchId}` | Host một trong hai bên |

Tự chốt bằng `pkClock` mỗi 1 giây. SSE `pk.changed` giúp web tải lại bảng điểm; React Native làm mới trạng thái qua API mỗi 5 giây.

## IV. Cách kiểm thử trên Windows / VS Code

1. Trong thư mục dự án, chạy `npm start`. Mở `http://localhost:8787` trên hai **trình duyệt/profile khác nhau** hoặc một trình duyệt thường và một cửa sổ ẩn danh; nếu mở hai tab thường có thể dùng chung cookie và thành cùng một người dùng.
2. Mỗi phiên tạo một phòng Cam, cả hai chủ phòng vào phòng. Bên A mở ⚡ PK, chọn phòng bên B; bên B mở ⚡ PK và chấp nhận.
3. Dùng người xem thứ ba tham gia phòng A, bấm cổ vũ; kiểm tra điểm của A tăng tại cả hai bên. Gửi liên tục phải bị rate-limit.
4. Thử B từ chối, A hủy, B không online, thời gian hết hạn, A rời phòng, B kết thúc sớm.
5. Đổi hai theme. Kiểm tra tin nhắn, nút mic và trạng thái host không bị PK che khuất.
6. Chạy `npm test` và `npm run check:web`.

## V. Kết quả kiểm thử hiện tại

- `npm test`: **100/100 đạt** (Node.js tests, gồm logic PK, quyền và kiểm thử UI tĩnh).
- `npm run check:web`: đạt.
- Chromium offline: **320×740, 390×844, 430×932**; mở Voice/Cam, PK minh họa, thoát phòng; không phát hiện lỗi JavaScript, không tràn ngang.
- Cú pháp TS/TSX: **8/8 tệp mobile** phân tích thành công (chưa typecheck/build native vì chưa cài dependency).
- ZIP kiểm tra tính toàn vẹn trong lúc đóng gói.

## VI. Chưa nghiệm thu — quan trọng

- **Chưa ghép audio/video từ hai phòng bằng LiveKit**; bảng điểm PK đã chạy qua backend, nhưng người xem vẫn ở media room riêng của họ. Cần triển khai server-side cross-room SFU subscriptions/relay đúng kiến trúc, phân quyền theo phòng và kiểm thử hai host.
- Chưa build Expo Development Build trên iPhone/Android; chưa xác nhận microphone/camera thật, mạng yếu, background/foreground, độ trễ thực tế hoặc tải nhiều người.
- Chưa có hệ thống tài khoản chính thức, anti-bot, chống gian lận nhiều thiết bị, PostgreSQL/Redis, giao dịch coin, lịch sử quà tặng và Top 3 lấy dữ liệu thật. Vì phiên khách có thể tạo nhiều tài khoản, điểm cổ vũ chỉ là bản demo.
- Chưa đạt chuẩn phát hành production hoặc nghiệm thu App Store/Google Play.

## VII. Nguồn tham khảo (không sao chép giao diện)

- TikTok LIVE Match: https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/live-match
- BIGO PK Battles: https://www.bigo.tv/news-events/use-bigo-live
- LiveKit media tracks: https://docs.livekit.io/transport/media/

Định hướng tiếp theo: ghép media PK hai phòng và nghiệm thu native trước, rồi mới phát triển cơ chế quà tặng dựa trên sổ cái giao dịch được xác minh.
