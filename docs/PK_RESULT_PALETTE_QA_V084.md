# Túttt v0.8.4 — Nghiệm thu màu kết quả và bố cục PK Voice

- Nguồn: nâng trực tiếp từ v0.8.3, giữ nguyên cấu trúc Room/PK, logo gốc và vị trí kết quả dưới tỷ số.
- Cam: trước sửa, một bộ chọn CSS cũ tô cả WIN/LOSS thành `#FFF6EE` trong chủ đề Ivory. Đã sửa specificity; Chromium xác nhận WIN `rgb(248,215,126)` và LOSS `rgb(243,238,255)` cả sáng/tối.
- Voice Ivory: WIN `rgb(173,113,31)` để đủ tương phản nền kem; LOSS `rgb(114,82,157)` để khác rõ WIN. Voice Night: WIN `rgb(248,217,134)`, LOSS `rgb(237,226,255)`.
- Badge chuỗi là vàng nhạt chữ đồng; không thêm khung kết quả riêng, không biến đổi công thức tính điểm.
- Voice: giảm viền, bớt vòng avatar/pill thừa, huy hiệu VS gọn hơn; không thay disclosure mic và người nói có kết nối thực.
- Kiểm thử: Node `202/202`; check:web PASS; Chromium `6/6` tổ hợp màu & bố cục, xác nhận không dịch chuyển ô gửi. 12 tệp TS/TSX parse hợp lệ. HTML độc lập đã thử thao tác hoàn tất PK ở Voice và Cam **2/2 đạt**; chưa build native trên thiết bị.
- Các ảnh nghiệm thu: `qa-v084/voice-light-390-finish.png`, `voice-dark-390-finish.png`, `cam-light-390-finish.png`, `cam-dark-390-finish.png`, `voice-light-320-finish.png`, `cam-light-320-finish.png`.
