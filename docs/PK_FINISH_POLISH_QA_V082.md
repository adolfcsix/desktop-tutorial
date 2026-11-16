# Túttt v0.8.2 — nghiệm thu typography và kết quả PK

Ngày: 12/11/2026. Gốc nâng cấp: v0.8.1.

## Những gì đã sửa trực tiếp

1. **PK Cam:** chuyển nhãn WIN/LOSS/xN **vào trong `.pk-side-score`**, ngay dưới số và dòng “Điểm cổ vũ”. Không dùng định vị cứng `top:138px` theo sân khấu. Cam vẫn là hai cột video lớn, thanh điểm phía trên và lower-third tên/ảnh ở dưới. Giữ nguyên chat nổi, thanh nhập, toolbar; không thêm nút `Xem kết quả`.
2. **PK Voice:** chuyển nhãn kết quả xuống cụm điểm và thay thế không gian dòng “ĐIỂM CỔ VŨ” khi kết thúc; tên host và icon microphone vẫn hiển thị, không che thanh điểm hoặc tạo thêm hàng. Viền của sân khấu và huy hiệu VS được tiết giảm, kiểu số nhất quán.
3. **Động tác ngắn:** avatar thắng phóng nhẹ, thua thu nhỏ, chữ kết quả hiện sau avatar và badge `xN` xuất hiện sau chữ. **Chỉ xuất hiện sau kết quả được xác nhận**, tự biến mất sau 3,2 giây, không rung lặp; `prefers-reduced-motion` không áp dụng animation.
4. **React Native:** cập nhật nhãn và scale tương ứng; không đổi API, server, cách tính tỷ số hoặc streak. Dữ liệu `winStreak` do server xác nhận và lưu theo ID phòng, không phải giao dịch tiền/coin.

## Kết quả kiểm tra đã chạy

- `npm run check:web`: đạt kiểm tra cú pháp web/backend.
- `npm test`: **199/199 PASS**, thêm ba bài kiểm tra riêng cho quan hệ nhãn kết quả–tỷ số, Voice giữ tên/mic và trạng thái Native.
- Chromium: **16/16** trường hợp bố cục kết thúc (320×740, 390×844, 430×932, 768×1024 × Voice/Cam × sáng/tối). Kiểm tra WIN/LOSS, x1, vùng nhãn không tràn, ô nhập không dịch chuyển, Voice không đè rail, Cam không đè avatar.
- Chromium riêng: chế độ **Giảm chuyển động** hiển thị chữ kết quả mà không animating avatar; hiệu ứng tự ẩn đúng thời điểm và nút Cam vẫn ở vị trí cũ.
- HTML đóng gói: nạp chính nội dung tệp `TUTTT_V0_8_2_PREVIEW.html` vào Chromium và thao tác hai chế độ Voice/Cam: **2/2 PASS**. Môi trường chặn truy cập HTTP `localhost`, nên không tuyên bố đã thử mở bản HTML qua máy chủ cục bộ.
- React Native: **13/13 tệp TS/TSX parse hợp lệ**, chưa được build và chạy trên iOS/Android thật.

## Hình ảnh nghiệm thu

- `qa-v082/voice-light-320-finish.png`
- `qa-v082/voice-light-390-finish.png`
- `qa-v082/voice-dark-390-finish.png`
- `qa-v082/cam-light-390-finish.png`
- `qa-v082/cam-dark-390-finish.png`

## Giới hạn không thay đổi

Đây là bản giao diện prototype và mã nguồn triển khai. Chưa có âm thanh/video ghép giữa hai phòng PK bằng media bridge đã xác minh, chưa có coin/gift thanh toán thật, chưa kiểm tra trên thiết bị Native. Không công bố hiệu năng FPS hay tính sẵn sàng phát hành.
