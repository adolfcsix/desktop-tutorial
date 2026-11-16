# Túttt v0.5.2 — Live Chat Reading & Viewer Invitations

Ngày cập nhật: 11/11/2026. Mốc code: v0.5.2, phát triển từ v0.5.1. **Bản prototype; không được mô tả là đã phát hành hoặc đã nghiệm thu âm thanh/hình ảnh native.**

## I. Vấn đề trải nghiệm đã xử lý
Ở v0.5.1, lưới video 2×3 chiếm nhiều chiều cao, khiến chat phải cuộn hoặc bị khuất phía dưới thanh nhập; với 320–390 px, người dùng khó xem và đọc cả hai cùng lúc.

### Ba chế độ xem (dùng chung cho web prototype và React Native)

1. **Ưu tiên chat** (mặc định): sáu camera thu về 3 cột × 2 hàng. Chat có vùng đọc mở rộng, độc lập; thanh gửi và các nút mic/camera giữ cố định.
2. **Trong suốt**: camera 3×2 hơi lớn hơn chế độ ưu tiên chat, phần chat là một lane nền bán trong với độ tương phản duy trì, không che các nút và không chèn lớp modal lên khuôn mặt người Live.
3. **Cân bằng**: camera 2×3 truyền thống, phần Chat dưới sân khấu. Phù hợp người xem ưu tiên hình ảnh và chỉ đọc một số tin mới.

Nút **A+** chuyển cỡ chữ Chat qua 13 → 15 → 17 px ở web/native. Trạng thái người dùng đang nhập không bị reset trong vòng render cùng màn hình web. Không cố đồng bộ lựa chọn UI cá nhân lên server; đây là tùy chỉnh hiển thị phía client.

### Tiêu chí UI
- 6 vị trí cam vẫn tồn tại trong cả ba chế độ; host vẫn giữ ghế khi mất kết nối.
- Thanh gửi tin và hàng điều khiển Live vẫn nhìn thấy, vùng chạm chính tối thiểu khoảng 44 px.
- Không có nội dung nào nằm *dưới* các nút khi dùng chế độ Ưu tiên chat và Trong suốt tại 320/390/430 px (đã kiểm tra bằng Chromium desktop viewport emulation).
- Camera thật chỉ được hiển thị khi có LiveKit video track; nếu chưa bật thì hiển thị avatar và nhãn minh bạch.
- Không tạo video, mic hoặc số liệu truy cập giả trong màn hình thật; ảnh QA có chat được người kiểm thử nhập ở demo offline.
- Màu sắc theo logo duyệt: Warm Ivory và Espresso Night; không vẽ lại logo.

## II. Mời người xem làm khách (consent-first)

### Luồng hợp lệ
1. Chủ/phó phòng mở **Quản lý** → chọn người xem → **Mời lên cam/mic**.
2. Backend kiểm tra: đã vào phòng, role là host/mod, người nhận là listener chưa có ghế, chưa có lời mời khác, còn vị trí trống.
3. Backend tạo invitation riêng có UUID, TTL 60 giây, phát `stage.changed` cho web; mobile đồng bộ roster định kỳ khoảng 8 giây.
4. Người xem thấy thông báo nêu rõ người mời và hai nút **Từ chối** / **Chấp nhận**.
5. Chỉ khi người xem chấp nhận và backend cập nhật permission SFU thành công thì `speaker=true`; micro/camera **không tự bật**.
6. Người xem tự bấm mic/camera và cấp quyền hệ điều hành; có thể tắt hoặc rời ghế.
7. Lời mời bị hủy nếu hết 60 giây, bị kick/rời phòng, người mời không còn quyền, hoặc host chủ động hủy.

### API mới
| Phương thức | Route | Body |
|---|---|---|
| POST | `/api/rooms/:id/live/invite` | `{ "userId": "<uuid>" }` |
| POST | `/api/rooms/:id/live/invite-respond` | `{ "invitationId": "<uuid>", "accept": true/false }` |
| POST | `/api/rooms/:id/live/invite-cancel` | `{ "invitationId": "<uuid>" }` |
| GET | `/api/rooms/:id/live` | Trả `incomingInvitations` dành cho chính người hỏi và `outgoingInvitations` chỉ cho người quản lý |

`POST /live/seat` vẫn dành cho **khách chủ động gửi `/seat-request`**, không còn được phép cấp ghế tùy ý khi không có yêu cầu. Luồng mời dùng `/invite-respond`, không dùng endpoint duyệt ghế để bỏ qua đồng ý.

### Ràng buộc và an toàn
- 6 vị trí camera tính cả host. Lời mời **không** giữ ghế để tránh chiếm chỗ; khi chấp nhận, server khóa theo phòng và kiểm tra lại số ghế. Hết ghế → HTTP 409, chưa cấp quyền; có thể thử lại nếu lời mời còn hiệu lực.
- `updateParticipant` của LiveKit phải thành công trước khi trạng thái speaker được commit. Nếu SFU từ chối, trạng thái không chuyển sang speaker.
- Khách B không thể chấp nhận invitation được gửi cho khách A (404). Chỉ manager thấy danh sách invitation đang chờ. Guest không được mời người khác.
- Sau kick/ban hoặc rời phòng, lời mời liên quan bị hủy; khi phó phòng bị giáng quyền, lời mời do phó đó gửi bị thu hồi.
- Không có nút “ép bật cam”; người dùng có quyền từ chối và luôn chủ động cấp quyền microphone/camera.

## III. Nghiệm thu thực hiện được trong môi trường này

- `npm test`: **54/54 bài đạt**. Gồm các test invite với nhiều phiên HTTP, quyền, privacy, từ chối, hết hạn, đủ 6 ghế, lỗi SFU và kick/demote; test static CSS.
- `npm run check:web`: kiểm tra cú pháp server/web đạt.
- 8/8 file TypeScript/TSX ở mobile qua **transpilation syntax**; đây KHÔNG phải `tsc --noEmit`, Metro bundle hoặc native build.
- `python tests/browser_qa_v052.py`: kiểm tra 320×740, 390×844, 430×932, ba mode, 6 tiles, gửi chat luôn hiện, không tràn ngang/lỗi JS quan sát được, Light/Dark screenshot.
- `python tests/chat_readability_qa_v052.py`: ảnh có nhiều tin nhắn người kiểm thử nhập trực tiếp, xác nhận độ đọc ở Warm Ivory và Espresso Night.

Ảnh nằm trong `docs/qa-v052/`. Các thử nghiệm API dùng mock bridge LiveKit; **không phải truyền media thật**.

## IV. Chưa nghiệm thu / hạn chế

- Chưa build iOS/Android thực tế, chưa có kết quả webcam / microphone hai chiều giữa hai điện thoại.
- Server dùng guest sessions, JSON storage và stage state trong RAM. Lời mời không tồn tại khi restart hoặc qua nhiều instance. Cần PostgreSQL + Redis/queue trước khi scale.
- Web Cam chỉ là preview UI, không render camera thật. React Native có component VideoTrack nhưng vẫn cần cài và build phụ thuộc SDK LiveKit.
- Chưa có push notification lúc app nằm nền; invitation 60 giây hiện phục vụ người **đang trong phòng**.
- Cần thử bàn phím khi quay ngang/dọc, VoiceOver/TalkBack, cỡ chữ hệ thống lớn, điều hướng bằng screen reader, và màn hình máy thật.

## V. Chạy thử

```bash
npm start
npm test
npm run check:web
```

Mở `http://localhost:8787` để thử web/chat UI. Muốn xem ba mode không cần server, mở tệp `TUTTT_V0_5_2_PREVIEW.html` đi kèm ZIP bên ngoài. Để dùng LiveKit SFU, cần cấu hình `.env.livekit.example` tại máy local, cài dependency backend/mobile, và dùng Expo Development Build; không đặt khóa bí mật trong ứng dụng.

## VI. Ưu tiên kế tiếp
1. Kiểm thử mời khách trên 3 thiết bị thật: host, moderator, viewer; camera/mic tắt mặc định, quay lại phòng, lời mời hết hạn.
2. Nghiệm thu media 1→6 camera và nhiều thiết bị, kiểm tra mạng yếu và rớt kết nối.
3. Tối ưu video tile active speaker, chuyển camera trước/sau, keyboard inset và chat focus trên máy nhỏ.
4. Chuyển tài khoản/session, room state, invites và moderation audit sang hạ tầng production.
