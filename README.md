# Túttt

Ứng dụng trò chuyện với giao diện web, backend Node.js và mã nguồn ứng dụng di động. Bản hiện tại ưu tiên chạy local: phiên khách, hồ sơ cá nhân, tạo/vào/rời phòng, tin nhắn phòng, danh sách người tham gia và điều khiển phòng.

## Cài và chạy trên máy mới

1. Cài Node.js từ 22.13 trở lên và VS Code.
2. Clone repository hoặc giải nén mã nguồn, mở thư mục có `package.json` trong VS Code.
3. Mở Terminal và chạy:

```bash
npm ci
npm start
```

Mở **http://localhost:8787**. Dừng máy chủ bằng `Ctrl+C`. Lần sau chỉ cần `npm start`. Web và backend cơ bản không cần MySQL, Docker, Expo hay khóa API. `npm ci` cài các công cụ kiểm thử theo lockfile; không cài bộ ứng dụng di động.

Nếu dùng Git, lấy mã nguồn bằng `git clone https://github.com/adolfcsix/desktop-tutorial.git`, sau đó `cd desktop-tutorial`. Repository riêng tư yêu cầu tài khoản GitHub có quyền truy cập.

Dữ liệu local tự lưu vào `server/data/store.json`. Giữ tệp này khi muốn giữ hồ sơ/phòng/tin nhắn; sao lưu khi đã dừng máy chủ. Phiên khách được giữ bằng cookie của trình duyệt. Xóa cookie hoặc đổi trình duyệt sẽ tạo người dùng khách khác; đây chưa phải tài khoản có mật khẩu và khôi phục đăng nhập.

Nếu cổng 8787 đang được dùng, dừng tiến trình cũ hoặc đổi cổng. Ví dụ PowerShell:

```powershell
$env:PORT=8788
npm start
```

## Kiểm tra

GitHub Actions tự chạy kiểm thử và kiểm tra cú pháp khi đẩy lên `main` hoặc mở pull request. Các bài kiểm tra này xác nhận web/API local; trạng thái mobile và thiết bị thật được báo cáo riêng.

Luồng vào phòng vẫn tải lịch sử chat khi Voice không khả dụng. Biểu mẫu chặn gửi trùng trong lúc chờ phản hồi; yêu cầu API web có giới hạn chờ 15 giây.

```bash
npm test
npm run check:web
npm run qa:release -- --fast
```

`npm test` gồm API, nghiệp vụ và kiểm tra HTML/JavaScript chạy qua HTTP bằng DOM runtime. Kiểm tra DOM không xác nhận bố cục trình duyệt hay media thật. Để chạy kiểm tra hình ảnh cần Python, Playwright và Chromium tại `/usr/bin/chromium` theo các script hiện có:

```bash
npm run qa:release -- --extended
```

Kết quả của đợt sửa hiện tại nằm trong [LOCAL_STABILITY_QA.md](docs/LOCAL_STABILITY_QA.md). Các báo cáo cũ chỉ phản ánh thời điểm được tạo.

## Phạm vi đã kết nối và phần còn thiếu

- Web: phiên khách, sửa tên/giới thiệu, tạo/vào/rời phòng, chat trong phòng, người xem và gửi báo cáo kết nối backend local.
- Voice web: dùng WebRTC thử nghiệm; cần trình duyệt cho phép mic và HTTPS nếu truy cập ngoài localhost. Live Cam trên web hiện chưa phát camera thật.
- LiveKit: cần SFU và cấu hình riêng để dùng các luồng media/quản trị SFU. Không cấu hình thì API trả thông báo có kiểm soát; chat phòng vẫn dùng được.
- Chat riêng, cộng đồng, một số huy hiệu/chức năng minh họa chưa phải dịch vụ hoàn chỉnh. Ví/quà trả phí và thông báo đẩy chưa triển khai.
- Mobile: có mã nguồn nhưng chưa nghiệm thu build Android/iOS hoặc âm thanh/video hai điện thoại. Không dùng Expo Go để kiểm tra LiveKit native.

## LiveKit và mobile (tùy chọn)

Hướng dẫn thiết lập: [SETUP_TECHNICAL_FROM_V047.md](docs/SETUP_TECHNICAL_FROM_V047.md). Cấu hình mẫu nằm trong `.env.livekit.example`. `npm start` đọc biến môi trường của tiến trình; không tự nạp tệp `.env`.

Các công cụ kiểm tra hiện có:

```bash
npm run doctor:native
npm run verify:native -- --json
npm run preflight:live
```

Chỉ cài dependency trong `server/` và `mobile/` khi thực sự thiết lập LiveKit/native; cấu hình và kiểm thử riêng trước khi dùng trên thiết bị.

## Cấu trúc

- `prototype/`: giao diện web và tài nguyên.
- `server/`: API, lưu trữ local, phòng và kiểm soát quyền.
- `mobile/`: ứng dụng React Native/Expo.
- `tests/`, `server/test/`: kiểm thử.
- `scripts/`: công cụ chạy, xuất bản xem trước và QA.
- `docs/`: tài liệu và bằng chứng kiểm tra; [HISTORY.md](docs/HISTORY.md) giữ README cũ.
