# Túttt v0.6.6 · PK Typography & Rhythm — nghiệm thu

## Phạm vi thay đổi

- Giữ nguyên bảng màu **Mocha Ivory** và **Espresso Night** của v0.6.5, không thêm màu phe mới và không quay lại giao diện hai card.
- Web: thêm `prototype/pk-v066.css` làm lớp tinh chỉnh cuối; font stack ưu tiên **Inter, Noto Sans, font hệ thống** hỗ trợ tiếng Việt và offline, không tải phông từ xa cho vùng PK.
- Cấu trúc phân cấp thông tin: tên phòng 16 px, đồng hồ 24 px, tên host 17 px, điểm 31 px, chú thích điểm 11 px ở màn 390 px. Giữ chữ số tabular để đồng hồ và tỷ số ổn định khi cập nhật.
- Chuyển nhãn phụ về câu thường (`Phe của bạn`, `Đối thủ`, `Điểm cổ vũ`); thêm khoảng thở có chủ đích giữa trạng thái, avatar, điểm và chat.
- Cam: chỉnh tiêu đề, nhãn chat, input và biểu tượng thanh công cụ; giữ bố cục chat nổi và không bổ sung tab cố định.
- Voice: thống nhất banner LIVE theo màu coral của PK, bỏ mảng sáng lạc tông ở thanh trên cùng, đồng bộ tên phòng, đồng hồ, avatar và điểm.
- Native React Native: `PKDuelBoard.tsx` được đồng bộ cấp bậc cỡ chữ và khoảng cách; `Screens.tsx` áp màu PK đang hoạt động cho nhãn LIVE, người xem, tiêu đề, Top 3 và nút quản lý.
- Dữ liệu và luật trận đấu không đổi; giữ thông báo minh bạch **điểm minh họa/miễn phí**, không phải coin/quà có giao dịch thật.

## Kiểm thử

- `npm test`: **131/131 đạt**, gồm 6 bài v0.6.6 kiểm tra font, vai trò chữ, responsive, stylesheet, server, giao diện native và disclaimer.
- `npm run check:web`: **đạt**.
- `node scripts/build-pk-colors.js --check`: **đạt**; không đổi token màu đã chốt.
- Chromium: **12/12** kịch bản (320×740, 390×844, 430×932 × Cam/Voice × Light/Dark), không quan sát thấy lỗi JavaScript, không tràn ngang viewport, tên hai host và hai cụm điểm không chồng nhau.
- `typescript.transpileModule`: **11 tệp TS/TSX mobile** được phân tích cú pháp, 0 lỗi. Đây **không phải typecheck với dependency hoặc build ứng dụng native**.
- HTTP GET `/`, `/pk-v066.css`, `/app.js`: **200** trong lần chạy server riêng.
- Ảnh kiểm tra ở `docs/qa-v066/`, các số liệu DOM và bố cục nằm trong `results.json`.

## Chưa đạt điều kiện xác nhận production

- Chưa build, chạy và nghiệm thu trên iPhone/Android thật.
- Chưa có ghép video/âm thanh của hai chủ phòng trong PK; avatar/điểm của bản preview offline vẫn là minh họa.
- Chưa tích hợp gift/coin thật; chưa đánh giá accessibility với Dynamic Type, VoiceOver/TalkBack trên thiết bị.
- Phần cỡ chữ ở Live không PK và toàn ứng dụng chưa được thiết kế lại đồng loạt trong bản này.
