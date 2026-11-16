# Nghiệm thu PK kết thúc trận — v0.8.0

## Mục tiêu và thiết kế

- Không hiển thị nút Xem kết quả trên sân khấu Voice hoặc Cam.
- Trong 3,2 giây sau khi server xác nhận trận kết thúc: WIN / LOSS, avatar thắng lớn hơn, avatar thua nhỏ hơn; cạnh WIN hiển thị chuỗi `xN` do server cấp. Trận hòa hiển thị DRAW ở cả hai phía, không hiển thị xN.
- Hoạt ảnh tôn trọng `prefers-reduced-motion`; không che hoặc đẩy chat, toolbar, nút gửi. Sau khi ẩn thì trở về bố cục phòng Live mặc định.
- Ở chế độ offline, mục kiểm thử nằm **bên trong bảng quản lý PK**, không thêm nút lên sân khấu. Chuỗi trong demo không phải số liệu thật.

## Dữ liệu chuỗi thắng

Server lưu `pk.streaks` theo ID phòng và `match.winStreak` tại thời điểm kết thúc. Hàm `finalize()` xác nhận một lần duy nhất, cả với timeout/forfeit/host-left. Hòa điểm hoặc thua ngắt chuỗi. Trận chưa được xác nhận không có kết quả. Legacy matches thiếu winStreak không bị suy đoán.

## Kiểm thử

- `npm test`: 196 đạt, 0 lỗi.
- `npm run check:web`: kiểm tra cú pháp toàn bộ web/backend: đạt.
- TypeScript compiler parser: 3 tệp PK Native được kiểm tra cú pháp: không lỗi.
- Browser test `tests/browser_finish_v080.py`: qua 16 biến thể kết thúc trận gồm 320, 390, 430 và 768px; Voice/Cam, light/dark; không tràn ngang và không thay đổi chiều cao thanh nhập.
- Browser test `tests/browser_streak_v080.py`: demo qua hai trận liên tiếp với `x1` và `x2`, mỗi overlay tự đóng sau khoảng 3,2 giây.
- Browser smoke `tests/browser_finish_smoke_v080.py`: 5 tình huống ảnh nghiệm thu mới sau khi chỉnh lớp chữ Voice, 1 tình huống giảm chuyển động: đạt.
- Chưa chạy native build iOS/Android trên thiết bị thật; LiveKit cross-room media vẫn là phần chưa tích hợp.

## Tệp ảnh đại diện

- `docs/qa-v080/voice-light-390-finish.png`
- `docs/qa-v080/voice-dark-390-finish.png`
- `docs/qa-v080/cam-light-390-finish.png`
- `docs/qa-v080/cam-dark-390-finish.png`
- `docs/qa-v080/voice-light-320-finish.png`

Ghi chú: các kịch bản browser từ các phiên bản cũ còn nằm trong thư mục tests để lưu vết các mốc UX; những kịch bản từng yêu cầu popup `pk-finale` không còn là chuẩn nghiệm thu giao diện v0.8.0. Dùng `browser_finish_v080.py` và `browser_finish_smoke_v080.py` cho hiệu ứng kết thúc mới.
