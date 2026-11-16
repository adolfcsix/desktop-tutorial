# Túttt v0.8.9 — Voice Reconnect & Burst Chat Stability
Ngày nghiệm thu: 12/11/2026

## Mục tiêu
Giữ sân khấu PK, ghế Voice, chat Live và ô soạn tin ổn định khi kết nối tín hiệu bị gián đoạn hoặc có hàng chục đến hàng trăm tin nhắn mới. Không thêm nút mới, không thay logo và không suy đoán rằng WebRTC đã ngắt chỉ vì mất SSE.

## Đã triển khai
1. Khi kết nối giữa hai thiết bị trong mesh WebRTC bị `disconnected` / `failed`: ngắt đo âm thanh của peer để không còn viền xanh cũ; gọi `restartIce()` theo tối đa ba lần thử có giới hạn; hủy lịch khi peer kết nối lại, rời phòng hoặc phòng bị đổi. Không tự bật mic. Khi browser không hỗ trợ API này, hiện hướng dẫn vào lại phòng; TURN/SFU vẫn là yêu cầu hạ tầng cho quy mô thực tế.
2. Kênh SSE `error`: ghi đúng mất tín hiệu điều khiển, không khẳng định âm thanh đã dừng; không render lại phòng. Khi `open`: cập nhật trạng thái, đồng bộ lại tin nhắn, roster Voice và PK.
3. Tin nhắn lấy theo UUID từ máy chủ, cập nhật từng node chat thay vì dựng lại sân khấu/ô soạn; giới hạn 80 dòng Voice / 45 dòng Cam trong DOM. Dùng text node để chặn nội dung HTML trở thành markup.
4. Gom các lượt nhận `room.changed` liên tiếp khi đang tải tin. Ngăn phản hồi từ phòng cũ ghi đè phòng hiện hành. Giữ vị trí đang đọc theo scroll anchoring, không tự ép cuộn xuống khi người xem đang đọc tin cũ.
5. Khôi phục nội dung trạng thái Cam sau SSE `open`, không để vĩnh viễn thông báo kết nối lại.

## Kiểm thử thực tế trong môi trường phát triển
- `npm test`: **219/219** đạt, gồm ba thử nghiệm phục hồi ICE/mic, ba kiểm thử tĩnh cho chat/SSE, và bộ hồi quy trước đó.
- `npm run check:web`: cú pháp JS đạt.
- `python3 tests/browser_chat_resilience_v089.py`: **4/4** trường hợp (Voice và Cam, sáng/tối, 320–390 px); thử 90–100 dòng, an toàn nội dung HTML, không mất ô nhập/focus, không nhảy vị trí đọc, gom tải SSE và bỏ phản hồi phòng cũ.
- `python3 tests/browser_voice_roster_v088.py`: **4/4** kịch bản thành viên thay phiên nói; giảm chuyển động đạt.
- `python3 tests/browser_voice_lux_v087.py`: **8/8** bố cục Voice và hai thử nghiệm mic/giảm chuyển động đạt.
- `python3 tests/browser_standalone_v087.py`: **4/4** bản HTML độc lập Voice/Cam, Ivory/Espresso, WIN vàng kim và LOSS tím trắng.
- TypeScript 5.8.3: phân tích cú pháp **11/11** tệp TS/TSX không lỗi phân tích cú pháp (không phải build native).

## Giới hạn và việc cần nghiệm thu tiếp
- Mesh WebRTC trong bản web chưa được xác nhận đa thiết bị/mạng di động thực. Hãy thử hai thiết bị thật với Wi-Fi, 4G/5G, chuyển mạng, vào/ra Voice và kiểm tra quyền microphone.
- TURN/SFU cần triển khai để có độ ổn định production; ba lượt `restartIce()` chỉ là bước hồi phục ngắn, không bảo đảm vượt NAT/firewall phức tạp.
- React Native được giữ nguyên trong bản này, chưa build trên iOS/Android.
- Dữ liệu chat/roster trong kịch bản Playwright là dữ liệu kiểm thử cô lập, không được đưa vào bản sản phẩm.
