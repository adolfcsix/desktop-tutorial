# Túttt v0.6.1 — PK Duel Stage · Báo cáo thiết kế và nghiệm thu

## Tham khảo và nguyên tắc sở hữu thiết kế

- TikTok LIVE Match: https://support.tiktok.com/vi/live-gifts-wallet/tiktok-live/live-match — thi đấu đơn/đội, bắt đầu sau khi người được mời chấp nhận, điểm ủng hộ.
- BIGO LIVE: https://www.bigo.tv/news-events/use-bigo-live — bố cục hai nhà sáng tạo đối đầu, đồng hồ, thanh điểm, nội dung Live nhiều khách.
- BIGO LIVE 2026: https://www.bigo.tv/blog/bigo-live-hot — người xem tham gia vào không khí thi đấu và bảng điểm.

**Không sao chép:** không sử dụng ảnh chụp, mã nguồn, biểu tượng, tên thương hiệu hoặc asset của các ứng dụng trên trong dự án. Chỉ tham khảo nguyên lý tổ chức thông tin; các màn hình PK được xây dựng riêng theo nhận diện graffiti TUT / Warm Ivory / Espresso Night.

## Thiết kế đã thay đổi

1. Trước: bảng điểm PK là khối nhỏ trên sân khấu Live, sau đó lặp lại avatar host/khách bên dưới.
2. Nay: PK trở thành sân khấu đối đầu hai phe cân xứng (coral / sage) có avatar host, điểm, thời gian và nút cổ vũ trong một khối nhất quán.
3. Live Cam web preview: khi PK, ẩn lưới avatar trùng bên dưới. Không giả tạo video của phòng đối thủ.
4. Live Voice: không lặp avatar host bên dưới đấu trường, tăng không gian hai host trên màn hình cao.
5. Đã hỗ trợ theme sáng/tối, thu nhỏ có điều kiện ở màn hình hẹp, giảm chuyển động theo cài đặt hệ điều hành và nhãn rõ ràng cho bộ đếm điểm.
6. Kết quả gần nhất chuyển thành thẻ kết quả trong PK sheet, không chiếm sân khấu trong lúc Live.
7. React Native dùng PKDuelBoard mới với hai bên được bố trí tương ứng; đây vẫn là UI native chưa build.

## Kiểm chứng dữ liệu

- PK trên backend là PK hữu nghị bằng **điểm cổ vũ miễn phí**, không có xu, quà tặng hay tiền thật.
- Chỉ host được mời PK và host kia chấp nhận thì mới thành trận.
- Đồng hồ & tỷ số online đến từ backend.
- Bản HTML offline hiển thị **điểm minh họa 1.240 vs 980**, có nhãn "BẢN MINH HỌA" và nút "Cổ vũ thử". Không gửi API hoặc ghi giao dịch.
- **Chưa ghép video/voice của hai phòng**. Hai chân dung trên sân khấu PK là avatar, không phải video livestream.

## Nghiệm thu / còn tồn tại

- Node.js: kết quả nằm ở `docs/qa-v061/results.json` và log khi chạy `npm test`.
- Chromium: kiểm tra kích thước 320×740, 390×844, 430×932; không thấy JS page errors và tràn ngang trong các kịch bản đã chạy.
- Native: đã kiểm tra cú pháp TypeScript/TSX (không đồng nghĩa typecheck/build/thiết bị thực).
- Còn cần: kết nối SFU hai phòng, voice duplex, feed video thật, test latency, ngắt mạng/rejoin, phase bắt đầu/trạng thái kết quả theo server, kiểm thử accessibility chuyên sâu.

## Định hướng PK release

Không bán xu hoặc tính tiền cho đến khi có thiết kế sổ cái giao dịch, kiểm chứng thanh toán và tuân thủ chính sách Apple/Google. Không công bố PK realtime video đã hoàn tất khi chưa chứng minh qua nhiều thiết bị thực.
