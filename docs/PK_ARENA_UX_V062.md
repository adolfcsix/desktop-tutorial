# Túttt v0.6.2 — PK Arena UX redesign

## Phạm vi
- Giữ nguyên backend PK, lời mời, từ chối, thời gian server và điểm cổ vũ miễn phí.
- Sân khấu đối đầu một bề mặt chung, không xếp hộp lồng nhiều lớp.
- Hai phe đối xứng, avatar host lớn, điểm bám sát phe; vùng VS trung tâm và đồng hồ cố định.
- Khi PK hoạt động: bỏ nút PK nổi đè sân khấu; nút tùy chọn PK và xem người trong phòng đặt ở đầu sân khấu.
- Bỏ tiêu đề sân khấu và Top 3 trùng tại màn hình PK Cam; giữ lối vào PK từ phòng thường.
- Tối ưu 320/390/430 px, giảm chuyển động, focus bàn phím, độ dài tên.
- Mobile: đồng bộ PK Arena sang React Native (chưa build native).

## Kết quả đo được
- 109/109 kiểm thử Node.js đạt.
- Chromium 320/390/430 px: không tràn ngang, không lỗi JavaScript quan sát được, còn input chat, cổ vũ thử tăng 1.240 -> 1.280.
- Phần TS/TSX native đã được phân tích cú pháp; **chưa** xác nhận bundle hoặc chạy trên máy thật.

## Không coi là hoàn thành
- Chưa ghép media (âm thanh/camera) giữa hai phòng trong LiveKit.
- Điểm cổ vũ trong bản xem trước là dữ liệu giả định phục vụ bố cục, không phải quà thật.
- Chưa nghiệm thu accessibility bởi người dùng thực, TalkBack/VoiceOver, tải mạng yếu hoặc iOS/Android production build.

## Nghiệm thu thiết kế trước khi khóa UI
- So sánh trực tiếp ảnh PK Cam sáng, Cam tối và Voice ở 320/390/430 px.
- Với ảnh người dùng thật/video track, kiểm tra crop và chuyển trạng thái video/avatar.
- Chỉnh tương phản chữ nhỏ, sử dụng dynamic type, xử lý bàn phím và kết nối giữa hai phòng.
