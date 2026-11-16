# Túttt v0.5.7 — Microphone & Active Speaker UI

## Yêu cầu sản phẩm
- Người có mic **tắt**: avatar tròn, biểu tượng microphone gạch chéo đặt cạnh phía dưới phải.
- Người có mic **bật nhưng không nói**: avatar tròn, viền trung tính, không hiển thị biểu tượng mic tắt.
- Người **đang nói**: không hiện biểu tượng mic tắt; viền xanh ngọc và hiệu ứng co giãn nhẹ (scale 1–1.075), không đổi bố cục, không che chat.
- Khi tắt mic, mất tín hiệu, rời phòng hoặc mất kết nối: ngừng viền xanh ngay khi cập nhật trạng thái.
- Khi OS bật **Reduce Motion**, dùng viền xanh tĩnh thay cho hoạt ảnh; có nhãn trạng thái trợ năng.
- Không thêm tab/khung riêng; giữ chat nổi và nút số người xem như v0.5.6.

## Nguồn dữ liệu và triển khai
- **Native LiveKit**: xác định mic qua `getTrackPublication(Track.Source.Microphone)` và `.isMuted`, không dựa vào `speaker/cameraAllowed`. Nhận `RoomEvent.ActiveSpeakersChanged` để biết người đang nói. Lắng nghe `TrackMuted`, `TrackUnmuted`, `TrackPublished`, `TrackUnpublished` để vẽ lại mic badge.
- **Web Voice P2P demo**: mic qua roster xác thực ở server; nếu trình duyệt cho phép, `AudioContext`/`AnalyserNode` đọc mức RMS trên track media thực, lấy mẫu mỗi 240 ms, yêu cầu hai lần liên tiếp đủ ngưỡng để bật và ba lần không đủ để tắt. Bộ đọc này chỉ giúp prototype phòng nhỏ, không thay LiveKit SFU.
- **Web Cam demo offline**: chỉ cho phép minh họa icon mic tắt từ dữ liệu mẫu, không trình bày vòng xanh như giọng nói thực. Bản Cam web kết nối server nhưng chưa có LiveKit media track, vì vậy không giả định trạng thái mic từ quyền lên ghế.
- **Ảnh QA xanh** được tạo bằng cách đặt class CSS trong Chromium để đánh giá thị giác; không phải ảnh cuộc gọi thật.

## QA đã chạy
- `npm test`: 80/80 kiểm thử Node.js đạt, gồm kiểm thử trạng thái muted/ready/unknown, RMS và tắt indicator.
- `npm run check:web`: JavaScript syntax đạt.
- Chromium: 320x740, 390x844, 430x932, không lỗi JavaScript/tràn ngang trong kịch bản đã chạy; badge mic không phủ tên/chat/thanh điều khiển.
- TypeScript/TSX: parse cú pháp không lỗi; **typecheck và build native chưa được xác nhận**, do chưa cài dependencies.

## Điều kiện nghiệm thu còn thiếu
- Cài dependencies và chạy `npm run typecheck` trong `mobile/`, build Expo Development Build iOS/Android.
- Kiểm thử mic local/remote trong LiveKit với 2–6 thiết bị thực: bật/tắt, giọng nói nhỏ, nhiều người nói, âm thanh từ loa nền, ngắt mạng và vào lại.
- So sánh giảm chuyển động, VoiceOver/TalkBack và ảnh màn hình nhỏ.
