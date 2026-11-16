# Túttt v0.5.9 — Live UI visual redesign & QA

## Vấn đề từ giao diện cũ
- Phòng Voice bị phân tán giữa banner trang trí, status kỹ thuật, hộp ghế và phần chat, tạo quá nhiều khu vực riêng.
- Phòng Cam có sân khấu nhỏ, vùng trắng trống quá lớn và nội dung phụ không có thứ bậc.
- Nhiều nền và đường viền kem nhạt cùng cấp độ, không tạo điểm tập trung.
- UI mobile native và UI web preview chưa thống nhất mức độ nhấn mạnh sân khấu.

## Chỉnh sửa thực sự
- Làm lại bố cục phòng Voice: bỏ banner không liên quan, tiêu đề rõ, sân khấu espresso/đỏ trầm, ghế avatar tròn, trạng thái mic và nút audio gọn.
- Live Cam: sân khấu cinematic chỉ chứa avatar/video, tính cả host trong giới hạn 6 ghế, Top 3 dạng pill thu gọn, viewer count mở danh sách; chat nằm dưới bằng lớp nền dịu.
- Không thêm chế độ hiển thị hoặc tab; giữ duy nhất bố cục Live, chat nổi, nút thành viên trong header, quản lý mở riêng.
- Đồng bộ React Native: bỏ banner Voice, status và Top 3 gọn, stage cam/voice dùng cùng màu, thanh nhập và điều khiển nhẹ hơn.
- Giữ nguyên logo TUT đã được duyệt và hệ màu Warm Ivory / Espresso Night.
- Không thay đổi quyền người tham gia, moderation, giao dịch quà hoặc truyền media; không giả nhận camera thực.

## Nghiệm thu
- `npm test`: 90 bài kiểm tra, cần đạt 90/90 (sau khi cập nhật version health test).
- `npm run check:web`: kiểm tra cú pháp JavaScript.
- TypeScript parser: Screens.tsx không có lỗi phân tích cú pháp; chưa phải typecheck/native build.
- Chromium: 320×740, 390×844, 430×932; chụp phòng Voice và Cam, Light/Dark, check không tràn ngang và không có pageerror.
- Cần nghiệm thu thêm: Voice/Cam thực tế giữa iOS và Android, tối ưu keyboard safe area, Dynamic Type, accessibility, media interruptions.

## Lưu ý
Ảnh kiểm tra Chromium sử dụng dữ liệu demo không có video thật. Giao diện LiveCam thay avatar bằng video chỉ khi có video track LiveKit trên mobile. Top 3 chưa có giao dịch thanh toán thật.
