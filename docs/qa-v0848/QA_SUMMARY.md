# Túttt v0.8.48 — Báo cáo QA và các giới hạn nghiệm thu

**Nguồn:** v0.8.47. **Ngày:** 13/11/2026. **Phạm vi:** SFU RPC timeout, quản lý fence cấp/thu hồi quyền LiveKit, HTTP multi-session, metadata và giao diện không đổi.

## 1. Bài kiểm thử và kết quả

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| `npm test` | **446/446 PASS** | Node.js/API, hồi quy và mock LiveKit |
| `sfu_rpc_deadline_v0848.test.js` | **6/6 PASS** | RPC treo, khóa phòng, cách ly grant, rời-vào, restart, cấu hình |
| `http_sfu_timeout_v0848.test.js` | **2/2 PASS** | HTTP localhost thực, SFU giả lập; 502, 409, khôi phục |
| `npm run check:web` | **PASS** | Cú pháp các module web/backend chỉ định |
| `npm run qa:release -- --fast` | **4/4 nhóm PASS** | Unit/API, web syntax, cấu hình Native tĩnh, xuất HTML |
| Chromium Voice/Cam sáng–tối | **4/4 PASS** | Bản HTML độc lập |
| Chromium menu Live/PK | **12/12 PASS** | 320, 390, 430px; 2 chủ đề |
| Chromium chat dồn dập | **4/4 PASS** | Voice/Cam, màn nhỏ |
| Chromium hồ sơ/Live kết nối | **6/6 PASS** | Các ca kết nối UI |
| QA `--extended` chạy gộp | **TIMEOUT** | 7 nhóm đầu PASS; không tính hoàn tất |
| Native lockfile/dependency | **BLOCKED** | npm registry `EAI_AGAIN`; chưa có lockfile và cây thư viện đúng |
| Device config | **NEEDS_CONFIGURATION** | ID Android/iOS mẫu, thiếu HTTPS API staging |
| TypeScript/Expo Doctor thực | **NOT_RUN** | Thiếu dependency Native |
| APK/IPA/2 điện thoại/SFU media | **NOT_RUN** | Chưa có môi trường và thiết bị |

## 2. Kiểm thử đỏ-trước-sửa

- **SFU updateParticipant bị treo:** trước sửa lời hứa không hoàn tất sau 300 ms; sau sửa RPC hết hạn và trả 502.
- **SFU removeParticipant bị treo:** trước sửa chờ vô thời hạn; sau sửa phản hồi 502 và lưu `pending` fence.
- **Phòng bị giữ khóa:** kick chờ SFU gây chặn các yêu cầu sau; sau sửa host tiếp tục cấp token và người bị kick bị chặn.
- **Grant timeout + remove thành công:** sau khi grant hết hạn phản hồi, lời gọi grant có thể còn đang xử lý; ban đầu fence bị xóa quá sớm. Sau sửa có `holdUntil` 100 giây và buộc đối soát sau hold.
- **Rời-vào để vượt cách ly:** bài thử thất bại trước sửa bổ sung; nay `exit` và `setFence` không xóa trạng thái cách ly quá sớm.

## 3. Phạm vi và hạn chế

`withRpcDeadline` không hủy được tác vụ trên SFU; timeout là **trạng thái bất định**. `holdUntil` là biện pháp giảm thiểu rủi ro token cũ/response muộn, **không phải bằng chứng track âm thanh hoặc camera đã dừng trên thiết bị**. Kết quả HTTP chỉ chạy trong một backend process với SFU giả lập.

UI v0.8.48 không thay đổi cấu trúc nút/hiệu ứng. Bản HTML độc lập phục vụ duyệt giao diện và không chứng minh media kết nối thật.

**Ưu tiên kế tiếp:** cài được cây Expo/LiveKit đúng phiên bản, `npm ci`, Expo Doctor/TypeScript, kiểm tra bridge timeout với SFU thật và nghiệm thu hai thiết bị.
