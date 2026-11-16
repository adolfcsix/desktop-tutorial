# Túttt v0.7.2 — Broadcast-first PK Cam

## Mục tiêu và lý do thay đổi

v0.7.1 đặt avatar chữ trong sân khấu gần giống bảng thống kê. Trong một buổi Live có hình ảnh, **người phát và luồng camera phải chiếm diện tích chính**; tên, điểm, thời gian, bình luận và hành động chỉ là các lớp phủ trợ giúp. Bản v0.7.2 học cách tổ chức thứ bậc đó từ những ứng dụng LIVE phổ biến, nhưng sử dụng logo và bảng màu riêng của Túttt, không sao chép bố cục cụ thể.

## Đã sửa

- Web PK Cam: hai vùng media dọc liền mạch, tách bằng đường ranh 1px; thanh điểm chạy gần đầu hình; tên chủ phòng nằm ở lower-third; chat nổi trong chân sân khấu; nút Tiếp sức nằm ở mép phải dưới, tách khỏi vùng chat.
- Giao diện minh họa không giả video: vùng trống ghi rõ **Chờ tín hiệu camera** và **Chưa ghép video đối thủ**.
- Có nút **Thử camera của tôi** riêng cho demo offline. Chỉ khi người dùng bấm, trình duyệt mới yêu cầu quyền camera với `audio:false`. Video chỉ xuất hiện trên máy hiện tại qua `MediaStream.srcObject`, không upload và không xuất bản qua LiveKit. Người dùng có thể tắt; `track.stop()` được gọi khi tắt, kết thúc PK, chuyển phòng, rời phòng, rời trang.
- Tin nhắn minh họa có nhãn **TIN NHẮN MẪU** trong bản offline; sau khi gửi chat thật trong demo, nội dung tự nhập thay thế mẫu. Điểm cổ vũ vẫn là dữ liệu minh họa miễn phí.
- React Native: PK Cam hiển thị camera host **thuộc phòng đang tham gia** ở kích thước lớn hơn nếu đã có LiveKit camera publication hợp lệ; đối thủ không được hiển thị như video thật khi chưa ghép media liên phòng. PK Voice tiếp tục dùng màn hình avatar và trạng thái mic thật.
- Tôn trọng reduced-motion, các thao tác cũ: mời PK, đồng ý, đồng hồ, cổ vũ, từ chối, kết thúc, kết quả, PK lại ở bản demo.

## Xem và chạy

1. Mở `TUTTT_V0_7_2_PREVIEW.html` để xem bố cục, chuyển sáng/tối, Cam/Voice, cổ vũ thử, kết quả và PK lại.
2. Để thử quyền camera dễ nhất, giải nén ZIP rồi chạy `npm start` tại thư mục gốc và mở `http://localhost:8787` từ máy chạy server. Trình duyệt phải hỗ trợ camera và dùng secure context (localhost hoặc HTTPS). Trình duyệt điện thoại không nên được giả định có quyền camera nếu bạn chỉ mở một file HTML qua trình xem tệp.
3. Vào Live > lọc Cam > chọn phòng > PK > bật PK minh họa > chọn **Thử camera của tôi**. Tắt bằng nút **Tắt camera thử** trong chính phần video.
4. Không cần cấp quyền mic cho chế độ xem trước camera. Camera không truyền đến phòng đối thủ.

## Kiểm thử

- Node.js: **165/165 đạt**, bao gồm 5 test bổ sung cho phân cấp bố cục broadcast, sự đồng ý khi dùng camera và nhận diện trạng thái media.
- Chromium: đã chạy **12 tổ hợp** Cam/Voice × sáng/tối × 320/390/430 px, đều đạt ở các lượt kiểm tra theo kích thước. Có kiểm tra reduced-motion. Không phát hiện lỗi JS trong kịch bản.
- Kiểm thử browser riêng cho camera: thay phần cứng bằng `canvas.captureStream` trong môi trường QA (không cấp quyền camera thật) để xác minh quyền truy cập chỉ kích hoạt sau click, video track được giải phóng khi tắt và khi trận kết thúc.
- Kiểm tra cú pháp React Native: 12 tệp TypeScript/TSX qua `transpileModule`; **chưa phải TypeScript typecheck hoặc native build**.

## Giới hạn cần giữ rõ

- Chưa có cầu nối âm thanh/video giữa hai phòng. Web PK Cam có xem trước **chỉ tại thiết bị**, chưa truyền đi.
- Không có quà tặng/coin/thanh toán thật; không suy đoán số tiền từ điểm cổ vũ miễn phí.
- Chưa đo FPS native, chưa nghiệm thu 2 thiết bị iOS/Android thật, chưa đạt tiêu chí production.
- Không tự gán camera của phòng A vào phòng B; việc đó phải có đường truyền LiveKit liên phòng, quyền truy cập phù hợp và kiểm thử thật.
