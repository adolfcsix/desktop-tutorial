# Túttt v0.8.13 — Nghiệm thu chuyển phòng và kết nối Live Native

**Phạm vi:** React Native + LiveKit, iOS/Android development build. Thời điểm lập checklist: 12/11/2026.

## Các thay đổi cần xác minh

1. `LiveVoice.ts`: `connectIntent` ưu tiên yêu cầu chuyển phòng mới nhất; kết quả connect cũ bị vô hiệu hóa. Start/stop của AudioSession toàn cục được tuần tự hóa. Một lệnh stop đang dở không được chạy sau lệnh start của phòng mới.
2. `App.tsx`: khi thao tác `join` backend hoàn tất muộn sau khi người dùng rời phòng, ứng dụng không mở kết nối LiveKit. Nếu không có phiên mới sử dụng cùng `roomId`, thao tác dọn membership được gửi về backend.
3. Thao tác ghế, lời mời và quản lý trả về muộn không được thay danh sách người dùng của phiên mới. Nguyên tắc tương tự áp dụng khi `reconnecting → connected` trong cùng phòng.
4. Nhãn kết nối luôn nằm ở vị trí cũ trên thanh trên phòng Voice/Cam, không thêm lớp chồng vào sân khấu. Khi chưa kết nối, không được gắn nhãn LIVE như thể tín hiệu đã ổn định. LiveKit connected **không chứng minh âm thanh thực sự nghe được**.
5. **Không đổi** khung PK Cam, thứ tự điểm, WIN vàng kim, LOSS tím trắng, chuỗi thắng `xN`, trái tim trắng và chat nổi.

## Cài đặt để thử trên hai điện thoại

- Chuẩn bị máy chủ API Túttt và LiveKit SFU có kết nối từ cả hai thiết bị, TLS/TURN phù hợp, Android Studio/Xcode hoặc dịch vụ build hợp lệ, một bản Expo development build cho iOS và Android. **Expo Go không hỗ trợ đủ thư viện LiveKit Native**.
- Không đưa `LIVEKIT_API_SECRET` vào ứng dụng hoặc cấu hình `EXPO_PUBLIC_*`. Dùng địa chỉ API riêng có thể kết nối từ cả hai máy; không dùng `localhost` trừ khi chạy thiết bị giả lập trên chính máy đó.
- Chạy kiểm thử mã nguồn tại gốc: `npm test` và `npm run check:web`. Trong `mobile/` có các lệnh `npm install`, `npm run android`, `npm run ios`, `npm run typecheck` khi đủ SDK, cấu hình và dependencies. Phải đọc lỗi thực tế, không tự coi build thành công.

## Ma trận thử nghiệm thủ công

| ID | Kịch bản | Điều kiện PASS cần quan sát | Trạng thái hiện tại |
|---|---|---|---|
| D01 | Hai điện thoại cùng phòng Voice | A nghe rõ B, B nghe rõ A; mic tắt không phát tiếng | NOT RUN |
| D02 | A vào phòng 1 rồi chuyển nhanh phòng 2 | Phòng 2 giữ đúng audio, phòng 1 không phát lại | NOT RUN |
| D03 | Bấm vào phòng rồi thoát ngay khi join API chưa xong | Không bật mic, không có kết nối LiveKit xuất hiện muộn | NOT RUN |
| D04 | Chuyển Wi-Fi ↔ 4G/5G trong cuộc gọi | Trạng thái nối lại đúng; không tự xin quyền; nghe được sau phục hồi | NOT RUN |
| D05 | Rút/cắm tai nghe Bluetooth | Xác nhận tai nghe/loa/mic bằng nghe và nói thật, không dựa vào nhãn | NOT RUN |
| D06 | Chuyển app nền/foreground, khóa màn hình, nhận cuộc gọi | Publication/mic trở về đúng trạng thái; không bật track khi đã tắt | NOT RUN |
| D07 | PK đang đấu, mạng một bên gián đoạn | Điểm và kết quả lấy từ server; không nhân đôi xN; chat vẫn đúng vị trí | NOT RUN |
| D08 | Cho nhiều người vào/rời ghế, đổi người nói | Viền xanh chỉ ở người nói thực; âm thanh và bản nháp chat ổn định | NOT RUN |
| D09 | Lỗi mạng khi requestSeat/invite đang chờ | Roster cũ không ghi đè roster sau kết nối lại | NOT RUN |

## Tự động hóa đã kiểm tra

- `tests/native_connection_v0812.test.js`: mới thêm các trường hợp connect chồng nhau, start/stop âm thanh đồng thời, dữ liệu ghế trả về muộn trong/sau reconnect, và điều kiện bảo vệ luồng `join` mobile. Đây là **mô phỏng Promise và SDK**, không phải kết nối LiveKit thật.
- Bộ kiểm thử web/PK giữ nguyên để xác nhận UI và luật điểm không bị hồi quy.
- Mọi kết quả trên thiết bị thật cần ghi: phiên bản ứng dụng, model/OS, mạng, thời gian, phát âm A→B và B→A, tình trạng track, và log đã loại token/bí mật.

**Nguyên tắc nghiệm thu:** chưa chạy = `NOT RUN`, thất bại = `FAIL`, chỉ cho `PASS` khi có quan sát tương ứng. Không dùng số bài test tự động để thay thế kiểm thử microphone, Bluetooth và kết nối thực tế.
