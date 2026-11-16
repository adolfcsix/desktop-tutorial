# Túttt v0.7.0 — PK Media Presence & Resilience · Báo cáo nghiệm thu

Ngày nghiệm thu: 12/11/2026. Phiên bản phát triển từ v0.6.9, giữ giao diện Mocha Ivory/Espresso Night, màu đỏ coral/champagne và logo đã duyệt.

## Những gì đã thay đổi thực tế

1. **Media sân khấu PK native của chính phòng đang xem**: trong màn PK React Native, nếu chủ phòng local room có LiveKit camera track thực sự đang xuất bản, chỉ phía chủ phòng đó mới hiển thị video. Mic và viền đang nói chỉ phản hồi nếu có track mic chưa mute và sự kiện `RoomEvent.ActiveSpeakersChanged` thực. Camera không tự bật. Đối thủ vẫn hiển thị avatar kèm `Chưa ghép tín hiệu đối thủ` vì chưa có bridge liên phòng.
2. **Mô hình bằng chứng**: `mobile/src/components/pkMediaEvidence.ts` là logic thuần phân biệt media chưa kết nối, chủ phòng chưa có tín hiệu, mic tắt, mic sẵn sàng và đang nói. Cam chỉ hiện nếu publication thật và không mute. Có các bài thử thực cho từng trạng thái, không sử dụng tín hiệu tên/avatar để đoán ai đang nói.
3. **Phục hồi cập nhật trận PK native**: khi snapshot bị lỗi hoặc quá 15 giây không có bản mới, hiển thị trạng thái mất đồng bộ và khóa thao tác cổ vũ. Các phản hồi đến sau của yêu cầu cũ bị bỏ qua bằng bộ đếm request. Kết quả thắng/thua luôn lấy từ máy chủ, không tự chốt khi đồng hồ hết giờ.
4. **Web PK**: với Voice WebRTC riêng cùng phòng, viền người đang nói và trạng thái mic có thể cập nhật không render lại cả màn hình; đối thủ vẫn không giả có media. Khi mất mạng/backend, giữ sân khấu hiện có và khóa cổ vũ thay vì xóa màn đấu; polling lại khi server hồi phục.
5. **Không dựng lại sân khấu vì tin nhắn**: luồng chat Live được cập nhật riêng trong khi PK hoạt động, giữ sân khấu và input; SSE open/error, heartbeat và sự kiện voice sẽ không buộc tạo lại sân khấu trong đa số trường hợp. Giữ vị trí scroll của người đọc tin cũ.

## Kiểm thử trong phiên

- `npm test`: **155/155 đạt**, gồm 7 bài mới kiểm tra media evidence, bảo vệ snapshot và cập nhật chat.
- `npm run check:web`: đạt.
- Mobile: **12/12 tệp TypeScript/TSX qua kiểm tra cú pháp** bằng transpileModule; chưa thực hiện TypeScript typecheck đầy đủ với dependencies native.
- Chromium: **12/12 kịch bản** ở 320×740 / 390×844 / 430×932 × Cam/Voice × light/dark. Không phát hiện pageerror hoặc tràn ngang; cổ vũ, nháp chat, cùng một DOM sân khấu, kết quả, PK lại, trở về Live đều qua kịch bản. Chế độ reduced-motion cũng đạt.
- Server thử nghiệm: kiểm tra riêng HTTP trang chính, CSS mới, API health. Preview HTML độc lập đã được tạo và kiểm tra tương tác.

## Chưa hoàn thành / giới hạn nghiệm thu

- **Chưa có audio/video hai phòng PK**: LiveKit chỉ đang dùng media của *phòng hiện tại* trên native. Media của host đối thủ không được subscribe; người xem chưa nghe hoặc thấy host phòng đối phương qua PK.
- Chưa build Expo development client và chưa kiểm tra thiết bị iOS/Android thật; không thể tuyên bố stream camera/mic hay 60 FPS native đã được nghiệm thu.
- Điểm cổ vũ miễn phí, không phải coin/gift hoặc doanh thu. Dữ liệu minh họa trong preview không phải tài khoản/người tham gia thật.
- Backend JSON demo chưa phù hợp chạy nhiều máy chủ production; quyền, lưu trữ và media cần kiểm thử tích hợp hoàn chỉnh.
