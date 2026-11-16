# Túttt v0.8.12 — LiveKit native connection & session safety

**Ngày:** 12/11/2026. Mục tiêu: chuẩn bị nghiệm thu Voice hai máy, giảm sai lệch trạng thái khi chuyển mạng/thiết bị, không làm thay đổi giao diện PK đã được duyệt.

## Thay đổi đã thực hiện

- `mobile/src/voice/liveConnectionUi.ts` định nghĩa trạng thái `idle/connecting/connected/reconnecting/error/not-configured`. **“Đã kết nối LiveKit” là trạng thái kết nối tín hiệu, không phải bằng chứng loa/tai nghe đã phát tiếng hay Bluetooth chuyển tuyến thành công.**
- `mobile/src/screens/Screens.tsx` sử dụng thông báo ngắn trong khu vực trạng thái có sẵn; khi PK hoạt động, nhãn LIVE chuyển thành “ĐANG NỐI”/“MẤT KẾT NỐI” trong đúng diện tích của nhãn trước đó. Nút bật/tắt mic và camera tạm bị vô hiệu hóa trong giai đoạn kết nối hoặc lỗi; vẫn có thể dùng chat và rời phòng. Khắc phục `pkActive` chưa khai báo trên màn Khám phá Native.
- `mobile/src/voice/LiveVoice.ts` bảo vệ phản hồi `roster/heartbeat` theo **số phiên, đối tượng phòng và trạng thái kết nối**; dữ liệu cũ, kể cả cùng `roomId`, không thể ghi đè phòng mới.
- Kết nối LiveKit cũ hoàn tất sau khi đã chuyển sang phiên mới **không được tắt global AudioSession** của phiên mới. Camera được cấp quyền muộn sau khi rời phòng phải bị tắt ở phiên cũ; không tự phát lên phòng mới.
- Chỉ thao tác bật mic/camera khi người dùng chủ động bấm và phiên đã kết nối. Khi mạng hồi phục, ứng dụng chỉ đối chiếu publication và roster; không tự bật microphone hoặc camera.
- Expo `app.json`, package metadata và web preview title được đồng bộ ở `0.8.12`. Bộ màu PK, điểm, tim trắng, WIN vàng kim / LOSS tím trắng / chuỗi `xN` được giữ nguyên.

## Kết quả kiểm tra tự động

| Hạng mục | Kết quả |
| --- | --- |
| Node.js (`npm test`) | **237/237 đạt**; gồm 8 kịch bản mới cho kết nối Native |
| Web/backend (`npm run check:web`) | **Đạt** |
| TypeScript/TSX | Kiểm tra phân tích cú pháp; không tương đương typecheck/build Native |
| HTML đơn tệp | Kiểm tra Voice/Cam và chế độ sáng/tối; chỉ kiểm tra web demo |
| Thiết bị iPhone/Android | **Chưa thực hiện** |
| Bluetooth, Wi-Fi ↔ 4G/5G thật | **Chưa thực hiện** |

## Ma trận nghiệm thu hai thiết bị — cần thực hiện trên máy thật

1. **Kết nối Voice giữa A (iPhone) và B (Android).** Đưa hai thiết bị vào cùng một phòng, cho phép mic lần lượt. A nghe B và ngược lại phải được xác nhận bằng nghe thực tế, không chỉ bằng nhãn LiveKit `connected`.
2. **Gián đoạn mạng.** A chuyển Wi-Fi sang 4G/5G trong lúc B giữ Wi-Fi; kiểm tra `reconnecting → connected`, không có yêu cầu cấp quyền mic bất ngờ. Khả năng âm thanh tiếp tục sau khi kết nối lại chỉ được đánh PASS nếu nghe được trên B.
3. **Bluetooth.** Cắm/rút tai nghe Bluetooth khi đang nói, so sánh âm thanh thu và phát với thực tế. Không đánh PASS chỉ vì `devicechange` hoặc LiveKit báo connected.
4. **Chuyển ứng dụng về nền.** Mở ứng dụng khác hoặc khóa màn hình, quay lại: mic/camera và roster được đồng bộ; không tự bật track đã tắt. Kiểm tra ứng xử với cuộc gọi hệ thống trên mỗi OS.
5. **Cấp quyền muộn.** Bấm Bật camera/mic khi chưa có quyền, rời phòng trước khi chấp thuận, sau đó cho phép: phiên cũ không tiếp tục ghi và phiên mới không tự bật.
6. **Chat trong khi mất mạng.** Bản nháp, bàn phím, trạng thái gửi và vị trí đang đọc phải giữ nguyên. Nếu tin nhắn chưa gửi được cần thông báo lỗi, không giả nhận thành công.
7. **PK song song.** Đấu Voice/Cam, cho một bên mất mạng, so sánh điểm từ server và trạng thái WIN/LOSS/xN; không tự tạo quà, coin, điểm hoặc video đối thủ giả.

**Điều kiện chạy:** LiveKit SFU có TLS và TURN phù hợp, API Túttt trong mạng tin cậy, hai Expo *development builds* (Expo Go không đủ); cấu hình `EXPO_PUBLIC_TUTTT_API_URL` tới backend có thể truy cập từ cả hai điện thoại. Không đưa khóa LiveKit API secret vào ứng dụng. Tham khảo `docs/SETUP_TECHNICAL_FROM_V047.md` và `docs/AUDIO_ROUTE_FOREGROUND_QA_V0811.md`.

**Tiêu chí chấp nhận:** mỗi kịch bản ghi rõ phiên bản iOS/Android, loại mạng, thiết bị phát/thu, thời gian, trạng thái quyền, lời nói A→B/B→A có nghe được, trạng thái UI, và lỗi SDK. Chỉ đánh `PASS` khi có bằng chứng quan sát trên máy; `NOT RUN` nếu không có thiết bị.
