# Túttt v0.8.10 — Microphone permission, reconnection & chat UX

Nghiệm thu ngày 12/11/2026. Tiếp nối v0.8.9. Đây là bản web thử nghiệm WebRTC mesh và mã React Native/LiveKit; **chưa xác nhận kết nối âm thanh qua hai thiết bị thật**.

## Thay đổi đã thực hiện

- Luồng xin quyền mic trên web có cờ `micPending` và mã thế hệ phòng: chỉ một yêu cầu `getUserMedia()` được thực hiện tại một thời điểm, không tự xin lại trong lúc SSE/WebRTC kết nối lại.
- Nếu thoát phòng hoặc bị thu hồi ghế khi hộp thoại quyền còn mở, luồng âm thanh trả về muộn sẽ bị `stop()`, không được gán vào peer hoặc giao diện; không gửi lệnh mic ON cho phòng mới.
- Thiết bị từ chối quyền, bị rút ra hoặc bị ứng dụng khác chiếm dụng: hiển thị thông báo tiếng Việt có nguyên nhân; đối với track `mute`, xóa tín hiệu đang nói cũ; khi `unmute`, chỉ khôi phục đo âm thanh trên chính track hiện hữu, không tự cấp quyền mới.
- Khi track kết thúc: dừng local capture, ngắt sender và đồng bộ mic OFF về server nếu còn ở cùng phòng. Dừng capture tức thời trước các lời gọi WebRTC bất đồng bộ.
- Trạng thái ngắn nằm trong dòng Voice hiện có (`Cần kiểm tra mic` / `Đang xin quyền mic`). Mô tả trạng thái đầy đủ có nhãn truy cập; thông báo ngắn được đưa lên trên ô soạn tin, không render lại cả phòng.
- React Native/LiveKit khóa các thao tác mic đồng thời; kiểm tra publication thực sau khi `setMicrophoneEnabled`, không dựa vào biến giao diện cũ. Kết quả từ thao tác quyền cũ bị bỏ qua sau khi rời phòng, mất kết nối hoặc bị thu hồi quyền publish. **Chưa build native.**
- Toàn bộ PK Cam/Voice, điểm thực tế thay %, WIN vàng kim, LOSS tím trắng, chuỗi xN và chat nổi được giữ nguyên.

## Bằng chứng kiểm thử

| Hạng mục | Kết quả |
| --- | --- |
| `npm test` (bao gồm 5 bài mới về mic) | 224/224 PASS |
| `npm run check:web` | PASS |
| Chromium, quyền mic bị từ chối và cấp quyền muộn sau khi rời phòng | 2/2 PASS (320px Light, 390px Dark) |
| Chromium, roster/PK khi nhiều người nói | 4/4 PASS + reduced-motion |
| Chromium, 90–100 tin nhắn chat liên tiếp | 4/4 PASS |
| Chromium, HTML xem trước độc lập Voice/Cam × sáng/tối | 4/4 PASS |
| React Native parser TypeScript/TSX | 11/11 không lỗi cú pháp — **không tương đương build** |

Ảnh: `docs/qa-v0810/voice-light-320-mic-denied.png`, `voice-dark-390-mic-denied.png`. Dữ liệu người tham gia, stream giả và lời nhắn trong các bài test chỉ dùng trong môi trường kiểm thử, không phát hành thành tính năng giả lập tín hiệu.

## Checklist cần nghiệm thu với thiết bị thật (chưa thực hiện)

1. Hai điện thoại hoặc điện thoại + máy tính trên cùng Wi-Fi: A/B cùng vào một phòng Voice, chủ phòng duyệt ghế, kiểm tra một chiều âm thanh và phát hiện người đang nói.
2. A chuyển từ Wi-Fi sang 4G/5G, B không đổi mạng: kiểm tra trạng thái mic, âm thanh nhận, retry, và chỉ bật lại mic theo thao tác người dùng. Nếu ICE recovery hết 3 lần, xác nhận có thông báo lỗi thay vì vòng xoay vô hạn.
3. Từ chối quyền microphone, sau đó bật quyền trong cài đặt trình duyệt/hệ điều hành và chạm Bật mic. Kiểm tra không có yêu cầu permission tự động lúc vào phòng.
4. Bật yêu cầu cấp quyền rồi thoát phòng ngay; xác minh không còn chỉ báo sử dụng microphone của hệ điều hành và không có bản ghi trên server rằng phiên cũ đang mở mic.
5. Rút tai nghe Bluetooth/chuyển thiết bị thu âm, đưa ứng dụng xuống nền rồi quay lại: theo dõi `mute`, `unmute`, `ended`, không hiển thị xanh khi không có audio evidence.
6. Gửi 100 tin nhắn trong khi đang PK và có người nói; chat và vùng nhập không mất bản nháp, kết quả PK chỉ dùng điểm do server xác nhận.
7. Thử iOS Safari, Android Chrome và build React Native thực; ghi log phiên bản OS, mạng, quyền, âm thanh nhận/gửi và lỗi theo từng thiết bị.

**Giới hạn hạ tầng:** Web hiện dùng WebRTC mesh + STUN thử nghiệm; TURN/SFU, quyền, chứng chỉ HTTPS và testing NAT thực tế vẫn cần thiết để hướng đến môi trường production. Không khẳng định đã nghiệm thu 4G/5G hoặc ghép âm thanh PK liên phòng.
