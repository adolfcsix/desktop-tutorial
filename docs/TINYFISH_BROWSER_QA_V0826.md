# Túttt v0.8.26 — TinyFish Browser QA + kiểm thử cục bộ

## Đã kết nối kiểm tra

TinyFish đã chạy một lượt trình duyệt trên trang tài liệu LiveKit chính thức và kiểm tra yêu cầu cài đặt React Native/Expo: [Lịch sử chạy TinyFish](https://agent.tinyfish.ai/runs/33bce2ea-c61e-49d8-8bbc-d7ca60598d98).

**Chưa có bản Túttt staging trên URL công khai** ở thời điểm kiểm tra. TinyFish là trình duyệt đám mây: không thể mặc nhiên truy cập `/mnt/data`, `file:///`, `localhost`, hoặc địa chỉ LAN của máy người dùng. Lượt chạy trên trang LiveKit **không phải** bằng chứng TinyFish đã kiểm thử app Túttt.

## Kiểm tra Túttt thật bằng một lệnh — không cần TinyFish

Tại thư mục dự án, chạy `npm run qa:release` để lần lượt kiểm tra API/unit test, cú pháp web, xuất HTML độc lập và các luồng Chromium: PK sáng/tối, danh sách khi mất mạng, chat nhiều tin và đổi chủ đề trong Live. Kết quả lưu vào `docs/qa-v0826/AUTOMATED_QA.md` và `automation-results.json`. Dùng `npm run qa:release -- --fast` khi chỉ cần unit/syntax/export.

Cần Node.js 20+, Python 3, Playwright Python và Chromium để chạy toàn bộ. Nếu thiếu trình duyệt, bài sẽ báo **FAIL**, không đánh dấu đạt giả. Đầu ra kiểm thử cục bộ **không chứng minh chất lượng media LiveKit**.

## Khi đã có URL staging HTTPS riêng

Có thể yêu cầu TinyFish chạy các bước sau trên **URL staging do chủ dự án cho phép** (không dùng production có người dùng thật):

1. Mở ứng dụng, chuyển Ivory/Espresso ở Cài đặt; xác minh header, thẻ, chat và điều khiển theo đúng chủ đề.
2. Vào phòng Voice demo; mở danh sách bằng **nút đếm người**, kiểm tra nhóm *Trên sân khấu / Đang xem*. Mở/đóng và xác nhận nội dung nháp chat vẫn nguyên.
3. Vào phòng Cam demo; vào PK; xác minh chỉ một nút người xem, điểm hai phe, WIN vàng kim, LOSS tím trắng, không thêm thanh phần trăm.
4. Thử kích thước 320/390/430 px và desktop; kiểm tra không tràn, không cắt nút, tối thiểu 44 px vùng chạm khi có thể.
5. Báo cáo trạng thái PASS/FAIL và ảnh bằng chứng; **không tương tác với tài khoản thật hoặc gửi tin nhắn cho người thật**.

Không đưa LiveKit API secret, token người dùng, mật khẩu hoặc các tệp `.local/` vào prompt, URL hay môi trường staging. TinyFish tự duyệt giao diện nhưng không thể xác minh nghe/nói âm thanh thực giữa hai điện thoại, chuyển Bluetooth hoặc Wi-Fi/4G.

## Nghiệm thu phần cứng riêng

- Cần một LiveKit SFU hoạt động với API key và secret chỉ ở backend.
- Expo Go không chạy được các native module LiveKit; dùng **development build** theo [LiveKit React Native quickstart](https://docs.livekit.io/transport/sdk-platforms/react-native/) và [LiveKit Expo](https://docs.livekit.io/transport/sdk-platforms/expo/).
- Hai điện thoại thật hoặc emulator/device phù hợp, có microphone/camera và kiểm thử nghe hai chiều; ghi rõ đường mạng, thiết bị, kết quả.
