# Túttt v0.5.4 — Adaptive Live Stage / UX QA

## Phạm vi cập nhật

- Tiếp tục trực tiếp từ mã nguồn v0.5.3; không thay logo graffiti Túttt được duyệt, không thay bảng màu Warm Ivory / Espresso Night.
- Live Cam không còn tự dành diện tích lớn cho **6 ô trống** khi chỉ có ít thành viên được cấp ghế. Bố cục hiện thay đổi theo **1–6 vị trí được cấp quyền**; các vị trí còn trống thu gọn vào nút **Xem N ghế trống**.
- Ở bố cục ba người: một ô lớn phía trên và hai ô nhỏ phía dưới để tránh một ô lẻ ở cuối lưới; màn hình vẫn đủ không gian cho chat.
- Người dùng chạm một ô thành viên để **ghim/phóng to** và chạm lại để bỏ ghim. Không tự ý bật mic/camera.
- Mobile React Native đọc sự kiện `RoomEvent.ActiveSpeakersChanged` từ LiveKit để báo **ĐANG NÓI**. Khi không có tín hiệu audio thật, không tự suy đoán ai đang nói. Bản web **không** báo đang nói vì chưa kết nối track SFU.
- Chế độ **Ưu tiên chat / Trong suốt / Cân bằng** và cửa sổ **Top 3** được giữ lại; khi kết nối máy chủ chưa có ledger quà tặng thật, không có số coin tự tạo.
- Ảnh offline có người mẫu minh họa được gắn nhãn **Khách mẫu** và **ghế minh họa**; hoàn toàn không phải hình ảnh/video cuộc gọi thực.

## Đường dữ liệu / an toàn

- Số ghế lấy từ danh sách server `roster.members[].speaker` và 1 vị trí dành cho host kể cả khi host tạm offline; không đồng nhất ghế được cấp quyền với **camera đang phát**.
- Giới hạn tối đa 6 vị trí vẫn do backend kiểm soát. Ghim/thu phóng chỉ là trạng thái xem cục bộ, không thay đổi quyền phát, không tự kích hoạt thiết bị.
- Chủ/phó phòng chỉ được gửi lời mời; người được mời tự chấp nhận trước khi được cấp ghế; camera/microphone vẫn tắt cho tới hành động của họ.

## Bằng chứng nghiệm thu

- `npm test`: 64/64 bài Node.js đạt (đếm tại thời điểm đóng gói).
- `npm run check:web`: đạt.
- Parser TypeScript 8/8 tệp qua kiểm tra **cú pháp** (không phải typecheck/build).
- Playwright/Chromium: 320×740, 390×844, 430×932; ba ghế mẫu khi mặc định, hiện đủ 6 ghế theo yêu cầu, ghim/bỏ ghim, chế độ ưu tiên chat, bản sáng và tối, không tràn ngang, không có lỗi JS quan sát được. Xem `docs/qa-v054/results.json` và ảnh `cam-*.png`.
- Các luồng server HTTP mới có test riêng cho CSS/JS, MIME và health.

## Chưa được nghiệm thu

- LiveKit SFU thực sự với 1–6 video track, chuyển camera, mạng yếu, mất mạng, 2 thiết bị iOS/Android và build native.
- Chất lượng âm thanh/phụ đề, mức hao pin, thay đổi trạng thái App Background/Foreground.
- Kiểm tra với VoiceOver/TalkBack, font hệ thống rất lớn, keyboard overlay và tất cả thiết bị.
- Ví coin/quà tặng thật, leaderboard dựa trên giao dịch thanh toán/ledger, quản trị tài khoản thật, PostgreSQL production.

## Nghiệm thu trên thiết bị thật cần thực hiện

1. Tham gia phòng 1 người; bật cam khi chủ động cho phép; xác nhận không có hình giả khi chưa có track.
2. Mời lần lượt 2–6 người; kiểm tra đa bố cục và giới hạn 6 ghế kể cả host.
3. Bật mic của nhiều người, xác nhận nhãn **ĐANG NÓI** chỉ xuất hiện khi LiveKit phát sự kiện.
4. Ghim, bỏ ghim, chuyển chat lớn, mở bàn phím và chat khi có 6 camera.
5. Mất mạng, khôi phục kết nối, chủ phòng rời khỏi, phó phòng thu hồi quyền, kick/ban và quyền camera bị hệ điều hành từ chối.
6. So hai theme trên iPhone màn hình nhỏ và Android màn hình dài, không có control bị che bởi phần cắt trên/dưới.
