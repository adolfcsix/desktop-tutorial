# QA report — Túttt v0.8.13

Ngày: 12/11/2026. Phạm vi: mã nguồn web/backend và mô phỏng phản hồi SDK LiveKit Native; trình duyệt Chromium cho bản xem trước web.

| Nhóm | Kết quả | Bằng chứng |
| --- | --- | --- |
| Node.js regression + 5 kịch bản mới | 242/242 PASS | `npm test`, bao gồm `tests/native_connection_v0812.test.js` |
| Cú pháp web/backend | PASS | `npm run check:web` |
| TypeScript/TSX | 13/13 parse hợp lệ | TypeScript parser; **không thay thế typecheck/build native** |
| Phòng Live/PK Voice-Cam × 4 khổ × 2 theme | 16/16 PASS | `python3 tests/browser_room_v075.py`; đã đổi assertion kết thúc trận sang WIN/LOSS trên sân khấu theo UX hiện hành |
| Chat dồn dập Voice/Cam | 4/4 PASS | `python3 tests/browser_chat_resilience_v089.py` |
| Voice compact + mic state | 8/8 layout + 2 tương tác PASS | `python3 tests/browser_voice_lux_v087.py` |
| HTML single-file Voice/Cam × light/dark | 4/4 PASS | `python3 tests/browser_standalone_v087.py`, `results-standalone.json` và ảnh `*-390-finish.png` |
| Logo và favicon | Byte-identical vs v0.8.12 | SHA-256 so sánh trực tiếp |
| Native iOS/Android thực tế | NOT RUN | Chưa có build native và hai điện thoại ghép LiveKit |
| Wi-Fi ↔ 4G/5G, Bluetooth, audible audio thực tế | NOT RUN | Xem `docs/NATIVE_HANDOFF_QA_V0813.md` |

### Đặc biệt đã kiểm tra bằng mock SDK
- Hai yêu cầu connect chồng nhau: yêu cầu sau giữ quyền sở hữu phiên.
- AudioSession stop đang chờ: start phiên mới không chạy vượt qua stop cũ.
- Request seat trả về sau reconnect / sau lần vào phòng mới cùng ID: không ghi đè roster.
- Đã thoát trong lúc `join` backend đang chờ: logic giao diện không mở LiveKit muộn.

### Giới hạn
Không ghi nhận PASS cho chất lượng âm thanh hai chiều, định tuyến loa, Bluetooth hoặc chuyển mạng thực tế. PK Cam chưa ghép hình video đối thủ liên phòng; preview có trạng thái chờ rõ ràng, không dùng video giả. ZIP chỉ là mã nguồn và tài liệu, không phải build mobile đã cài đặt.
