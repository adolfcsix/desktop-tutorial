# Túttt v0.8.11 — Audio route & foreground safety QA

**Ngày:** 12/11/2026. Nâng từ v0.8.10, giữ nguyên UI PK và logo chính thức. Web là prototype WebRTC mesh; React Native dùng LiveKit nhưng **chưa build/test thiết bị thực**.

## Nội dung cập nhật

1. `prototype/voice.js`: gắn `devicechange` chỉ trong phiên Voice; gom sự kiện trong 450 ms; chỉ đưa lời nhắc nếu mic đang có track hoạt động, sau 1,5 giây kể từ khi mới bật. Lời nhắc ẩn sau 5,5 giây, hủy khi rời phòng. **Không tự chọn Bluetooth, không mở hộp thoại quyền, không restart mic hay đóng track còn sống.** Nếu kiểm tra thấy track thực sự `ended`, áp dụng cùng luồng tắt mic đồng bộ server như sự kiện `ended` từ v0.8.10. `devicechange` không phải bằng chứng người dùng đã chuyển thành công đầu ra.
2. `prototype/app.js`: đưa lời nhắc vào dòng trạng thái Voice hiện có, không popup hay button mới. Kể cả luồng `activityOnly` lúc PK đang mở cũng cập nhật thông báo tại chỗ, giữ nguyên chat, PK và ô nhập.
3. `mobile/src/voice/LiveVoice.ts`: đối chiếu trạng thái mic/camera từ publication và track **thật** sau `TrackMuted`/`TrackUnmuted`/publish/unpublish hoặc `Reconnected`. Chỉ đọc publication; không tự bật mic hay camera.
4. `mobile/src/voice/useLiveVoice.ts`: khi trở lại từ `inactive/background` về `active`, gọi `syncAfterForeground()`, đọc publication hiện hữu và tải roster theo `roomId` + số phiên hiện tại; dữ liệu trả chậm không thể cập nhật phòng khác. Tuyến loa/tai nghe vẫn do iOS/Android và Native AudioSession quyết định.
5. Không thay PK Voice/Cam, điểm theo server, WIN vàng kim/LOSS tím trắng/xN, hiệu ứng 3,2 giây, trái tim trắng, quyền và API.

## Kết quả kiểm thử mô phỏng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test`, gồm 5 bài cho thay đổi thiết bị | **229/229 đạt** |
| `npm run check:web` | **Đạt** |
| Chromium `browser_route_v0811.py`: 320 px Light, 390 px Dark | **2/2 đạt** |
| Chromium chat burst `browser_chat_resilience_v089.py` | **4/4 đạt** |
| Chromium nhiều người/PK `browser_voice_roster_v088.py` | **4/4 đạt + giảm chuyển động** |
| HTML xem trước độc lập `browser_standalone_v087.py` | **4/4 đạt**, WIN/LOSS đúng màu |
| Parse React Native TS/TSX | **11/11 không lỗi cú pháp** (không tương đương native build) |

Trong hai thử nghiệm thiết bị giả lập, mỗi phiên chỉ có **1** yêu cầu microphone, không tự bật lại, không đổi DOM sân khấu/ô nhập chat, không mất bản nháp và không tràn chiều ngang. Ảnh ở `docs/qa-v0811/voice-light-320-audio-route.png`, `voice-dark-390-audio-route.png`. Tín hiệu `devicechange`, WebRTC track và cuộc trò chuyện của bài kiểm tra **đều là fixture**, không phải tín hiệu Bluetooth vật lý.

## Quy trình nghiệm thu thiết bị thật — CHƯA THỰC HIỆN

| ID | Thiết bị & thao tác | Điều cần xác nhận |
| --- | --- | --- |
| D1 | iPhone iOS và Android cùng Wi-Fi, dùng build native có LiveKit cấu hình | Hai máy nghe rõ hai chiều; trạng thái mic và người đang nói khớp thực tế; không vọng tiếng |
| D2 | A đang có audio chuyển Wi-Fi → 4G/5G; B giữ Wi-Fi | Phân biệt reconnecting/connected; khôi phục đúng theo LiveKit/TURN; không tự xin quyền mic mới; tin nhắn còn nguyên |
| D3 | Bật Bluetooth tai nghe, nói thử, ngắt kết nối và nối lại | Đường âm thanh có chuyển đúng qua hệ điều hành không; nếu mất thu/phát thì thể hiện thông báo trung thực; không tuyên bố chuyển tuyến thành công khi chưa có audio |
| D4 | Dùng tai nghe dây/USB-C, rút cắm khi đang nói | Huy hiệu mic, track `mute`/`ended`, fallback của OS và tiếng gửi qua B phải phù hợp nhau |
| D5 | Tắt quyền mic giữa phiên, rồi cấp lại thủ công | Không auto-cấp quyền; không còn viền xanh khi track đã kết thúc; người dùng chủ động bật lại |
| D6 | Chuyển app xuống nền, khóa màn hình, có cuộc gọi đến, rồi trở lại | Đối chiếu mic/camera/roster theo publication mới nhất; không làm bật track vốn đã tắt |
| D7 | Người dùng rời phòng khi hộp thoại cấp quyền chưa hoàn tất | Không có mic đang ghi sau khi rời; không gửi trạng thái mic-on cho phòng cũ |
| D8 | PK Cam và Voice trong lúc có 100 tin nhắn, thiết bị thay đổi | Chat và thanh điều khiển giữ vị trí, không mất bản nháp, PK chỉ cập nhật điểm server xác nhận |

**Ghi biên bản trên mỗi thiết bị:** phiên bản OS và app, thiết bị thu/phát, phiên bản SDK, Wi-Fi/4G/5G, giờ thử, quyền mic, trạng thái UI, người nghe thực tế, các log lỗi và kết quả PASS/FAIL.

## Giới hạn và điểm không suy đoán

- Browser `devicechange` không chỉ rõ có phải Bluetooth, đầu vào hay đầu ra. Một số trình duyệt không phát sự kiện này. Cần kiểm tra bằng tai thật hoặc thiết bị đo ở nghiệm thu.
- Prototype web dùng **STUN/mesh**; không chứng minh ghép media liên phòng PK hoặc NAT khó xuyên qua. Cần SFU/TURN và phép thử mạng thực tế trước khi gọi là sẵn sàng production.
- Chưa build iOS/Android; đã có móc đối chiếu publication khi foreground và sự kiện media nhưng không thể khẳng định Bluetooth routing chạy đúng trên cả hai nền tảng.
