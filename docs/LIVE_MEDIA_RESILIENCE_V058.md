# Túttt v0.5.8 — Media resilience / performance QA

## Thay đổi được triển khai

1. **Web Voice**: cập nhật class `is-speaking` và tên trợ năng trực tiếp trên avatar, không render lại toàn bộ phòng mỗi khi ai đó nói hoặc ngừng nói. Tránh mất vị trí cuộn/chat do sự kiện giọng nói.
2. **Thiết bị mic bị ngắt**: nghe sự kiện `MediaStreamTrack.ended`, dừng phát và cập nhật mic tắt về server theo cách best-effort; hiển thị thông báo cần kiểm tra quyền hoặc thiết bị.
3. **Track remote dừng**: xóa riêng đồng hồ âm lượng của track đó, không xóa đồng hồ của track mới thay thế.
4. **AudioContext tạm ngừng**: xóa viền xanh đang bật để không treo hiệu ứng khi trình duyệt vào nền.
5. **Native LiveKit**: hỗ trợ đồng thời nhiều người đang nói (multi-speaker), tắt viền khi phòng mất kết nối / đang nối lại; đối chiếu micro/camera thật khi reconnect và tránh coi remote chưa subscribe track là đang bật mic.
6. Giữ layout tối giản: chat nổi trong suốt; người xem qua nút đếm; Top 3 thu gọn; camera tắt là avatar tròn; không thêm tab hoặc toolbar mới.

## Kết quả nghiệm thu đã thực hiện (11/11/2026)

- `npm test`: **86/86 đạt** (80 bài trước + 6 bài mới).
- `npm run check:web`: đạt.
- Dùng TypeScript `transpileModule` kiểm tra 8/8 file TS/TSX: không có lỗi cú pháp (không phải typecheck).
- Chromium ở 320 × 740, 390 × 844 và 430 × 932 px: không thấy lỗi JavaScript/tràn ngang, chat và danh sách người xem vẫn truy cập được.
- Kịch bản 390 px: sử dụng trạng thái người nói mô phỏng để kiểm tra cập nhật DOM, xác nhận **giữ nguyên phần tử chat và ô nhập** qua sự kiện bắt đầu/ngừng nói.
- Ảnh `qa-v058/voice-speaking-demo-390.png` là **mô phỏng trạng thái media phục vụ QA**, không phải bằng chứng thu âm thật.
- Chạy lại trên máy có Chromium với `python tests/browser_qa_v058.py`.


## Chưa nghiệm thu

- Không có bằng chứng build native hoặc chạy LiveKit SFU trên hai thiết bị thực.
- Mic/Camera reconnect khi thực tế mất mạng có thể khác môi trường unit test; cần thử iOS/Android và xác nhận quyền OS.
- AudioContext metering chỉ áp dụng mesh web thử nghiệm, không thay thế voice activity detector chính thức từ LiveKit trên mobile.
- Chưa có dữ liệu tặng quà thật, xác thực chính thức và PostgreSQL production.
