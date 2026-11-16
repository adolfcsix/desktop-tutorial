# Túttt v0.6.4 — Báo cáo PK Arena / nghiệm thu

## Vấn đề được xử lý

Bản v0.6.3 trông như một dashboard gồm hai card host, thêm thẻ điểm, rồi đến chat với đường cắt nền đột ngột. Bản v0.6.4 chuyển sang một sân khấu duy nhất, hai host trên cùng một mặt nền; nhấn màu bằng sắc đỏ san hô và champagne (theo logo TUT), không dùng viền hộp làm phân cách.

## Thay đổi cụ thể

| Vùng | v0.6.3 | v0.6.4 |
|---|---|---|
| Hai phe | Hai panel nền riêng | Hai host tự do trên chung một sân khấu |
| Số điểm | Bảng bên dưới, tách biệt | Điểm đặt dưới từng host |
| VS | Hình thoi đóng khung | Chữ VS không khung |
| Chat | Đổi sang nền kem ngay sau sân khấu | Liên tục trên nền sân khấu, dễ đọc |
| Nút quản lý PK | Riêng ở đầu phòng trên mobile | Nằm trong đầu sân khấu khi đang PK |
| Responsive | Các panel co hẹp | Avatar / cỡ chữ co giãn ở 320–430 px |

## Nghiệm thu tự động

- `npm test`: **119/119** bài đạt, gồm **5** bài mới dành cho cấu trúc PK v0.6.4.
- `npm run check:web`: cú pháp JavaScript đạt.
- `tests/browser_pk_v064.py`: **12/12** kịch bản Chromium (320×740 / 390×844 / 430×932 × Warm Ivory/Espresso Night × Voice/Cam), không tràn ngang hoặc phát sinh lỗi JS; nhấn cổ vũ demo làm thay đổi điểm trên giao diện.
- Code nguồn TypeScript/TSX mobile được parser TypeScript đọc không có chẩn đoán cú pháp. Đây không phải native build/typecheck đầy đủ.
- Logo và bảng màu từ v0.6.3 được giữ nguyên, không đổi sang sắc xanh cho phe B.

## Cần kiểm thử khi có thiết bị

- Nghiệm thu PK audio/video liên phòng bằng LiveKit SFU; chọn track và quyền xem hai bên.
- Kiểm thử iPhone/Android (320–430+ dp), VoiceOver/TalkBack, phông chữ lớn, màn hình bị che bởi bàn phím.
- Xác nhận dữ liệu PK server đồng bộ đúng khi mạng yếu, host ngắt, tranh chấp và PK kết thúc.
- Hiệu năng 6 cam, kết nối lại và xử lý ứng dụng chạy nền.

**Quan trọng:** Các avatar, điểm và danh sách phòng trong preview là dữ liệu minh họa; đây chưa phải buổi PK có media thật.
