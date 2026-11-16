# Túttt v0.7.7 — PK Voice Arena & Momentum Rhythm

**Ngày:** 12/11/2026 · **Nền:** v0.7.6 · **Phạm vi:** bố cục sân khấu **Voice PK** trên web/React Native, không đổi tính điểm/API/DB/media liên phòng. PK Cam giữ bản đã được duyệt.

## Vấn đề của v0.7.6

PK Cam đã có ngôn ngữ broadcast rõ, còn PK Voice dùng hai avatar nổi tự do trên nền nhạt, kèm bar và caption mỏng; thứ bậc thông tin chưa rõ, nhiều khoảng rỗng trong khi màn hình nhỏ bị chiếm chiều cao. Một số nhãn nội dung trùng nhau. Phiên bản này không tăng số hiệu ứng để che vấn đề đó.

## Tham khảo và thiết kế

- BIGO LIVE: PK hai phía, trận có thời hạn, tỷ số và bar phản ánh bên dẫn; chế độ phòng thoại là trường hợp riêng, không được dựng giả nguồn video/âm thanh liên phòng. Nguồn: https://www.bigo.tv/news-events/use-bigo-live
- BIGO Room PK: cần trạng thái thế trận rõ ràng, không yêu cầu tạo cơ chế x2/booster chưa có ở Túttt. Nguồn: https://www.bigo.tv/news-events/new-multi-room-pk-system-guide
- Mẫu ảnh tham khảo TopVoice Team PK: bố trí hai chủ phòng quanh mốc VS/timer, phân biệt hai bên theo màu sắc. Chỉ tham khảo bố cục, **không sao chép giao diện, logo hoặc hình ảnh**.

**Thiết kế áp dụng:**

1. Khung đối kháng hai nửa Scarlet/Champagne tông Ivory/Espresso, có đường phân chia dọc, viên VS đặt tâm, avatar có viền phân biệt; tên chủ phòng và vai trò nằm dưới.
2. Điểm số 28/23 px ở hai nửa, không hiển thị lặp trong rail. Nhãn tỷ lệ A/B ở trên, progress dài 19/17 px bên dưới, marker hình thoi dịch đúng phần trăm, caption thể hiện bên dẫn và khoảng cách; không tự tăng điểm.
3. Badge mic web: có track và mic bật => icon mic; mic tắt => mic gạch chéo; đối thủ chưa có media => headphone/chưa kết nối; avatar chỉ xanh khi server/LiveKit cho biết **đang nói thật**. Ở bản minh họa, nhãn âm thanh minh họa hiện rõ, không mô phỏng biên độ âm thanh giả.
4. Footer chỉ một hàng CTA **Xem kết quả · Tiếp sức**; chú thích điểm thử được chuyển vào dưới rail. Không tạo thêm tab Thành viên hoặc bảng chat cố định.
5. Tối ưu màn hình hẹp 320×740 / 360×780 / 390×844; đảm bảo phần chat, thanh nhập và thanh nút dưới không bị mất khỏi vùng nhìn.
6. React Native dùng khung Voice hai vùng, mic status badge, scoreRail từ snapshot và không tải track camera Voice hoặc đối thủ liên phòng chưa ghép. **Chưa build native**.

## Kiểm tra

- `npm run check:web`: PASS.
- `npm test`: **188/188 PASS**, có 5 bài cho v0.7.7 và bộ test cũ được chỉnh theo cấp nhãn mới.
- `python tests/browser_voice_v077.py`: **10/10 PASS**, 320/360/390/430/768, sáng/tối. Kiểm tra không tràn, trạng thái media có thể đọc, bar >=17px, giữ chat và cập nhật 56% → 57% khi cổ vũ demo.
- `python tests/browser_room_v075.py`: **16/16 PASS**, hồi quy cả Voice và Cam.
- `python tests/browser_meter_v076.py`: **17/17 PASS** (bao gồm reduced motion), hồi quy thanh điểm Cam và Voice.
- 13 tệp `.ts`/`.tsx` native qua **kiểm tra cú pháp**; chưa cài dependencies hoặc xác thực typecheck/build iOS/Android.
- Logo web và mobile giữ nguyên byte-for-byte so với v0.7.6.

## Giới hạn

Các ảnh QA được chụp trên Chromium headless trong môi trường mô phỏng, chưa là bằng chứng thao tác thực trên iPhone hay Android. Chưa có ghép âm thanh/video **liên phòng** và chưa có hệ quà/coin giao dịch thực. Tỷ số demo chỉ là dữ liệu mẫu.
