# Túttt — Bản thiết kế UI/UX 0.1

## 1. Nguyên tắc thương hiệu

- App name: **Túttt**. Wordmark: `túttt.`
- Tên trang: **Khám phá**, **Live**, **Tạo**, **Chat**, **Cá nhân**, **Cộng đồng**.
- Không dùng tiền tố Túttt cho mỗi module.
- Tinh thần: Soft futurism, thân thiện, gợi cảm xúc; không sao chép Spoon Live.

## 2. Design tokens

| Token | Dark | Light | Vai trò |
|---|---|---|---|
| Background | `#101019` | `#F7F5FB` | Nền ứng dụng |
| Surface | `#1A1A26` | `#FFFFFF` | Thẻ và khối |
| Surface alt | `#252434` | `#EEeAF6` | Input và control |
| Text | `#F7F5FF` | `#242038` | Nội dung chính |
| Text muted | `#A6A0B7` | `#726C87` | Secondary |
| Lavender | `#B59DFF` | `#6E4BC6` | Thương hiệu/CTA |
| Violet | `#8363E8` | `#7852D0` | Điểm nhấn |
| Coral | `#FFAD9B` | `#BD765F` | Chỉ báo Live |

Typography: dùng hệ thống font nhất quán; bản browser ưu tiên DM Sans / Manrope nếu có mạng, có fallback. Thang 10/12/14/17/21/27. Bo góc 10/14/19/25. Khoảng cách 4/8/12/16/20/24/32.

## 3. Sơ đồ trải nghiệm

```text
Khám phá ──> Phòng Live ──> Ghế mic / Chat phòng / Thả tim / Quà
    │             │
    ├─────> Live ─┘
    ├─────> Cộng đồng ──> Chi tiết ──> Tham gia
    └─────> Tin nhắn với bạn đang online

Tạo ──> Form tạo phòng ──> Phòng Live (chủ phòng)
Chat ──> Danh sách ──> Cuộc trò chuyện ──> Gửi tin
Cá nhân ──> Sửa hồ sơ / Cộng đồng / Cài đặt
```

## 4. States cần có khi làm backend

- Loading, empty, error, offline và retry riêng cho từng màn hình.
- Phòng Live: connecting/reconnecting/connected/disconnected, ghế mic pending/approved/rejected, microphone permission, host ban/mute/kick.
- Tin nhắn: pending/sent/delivered/read/failed, retry & idempotency.
- Privacy: block, report, delete/retention, consent recording, age policy.
- Accessibility: dynamic text, screen reader, focus order, contrast WCAG, reduced motion.

## 5. Quy chuẩn tên route đề xuất

`/(tabs)/discover`, `/(tabs)/live`, `/(tabs)/chat`, `/(tabs)/profile`, `/create`, `/room/[id]`, `/conversation/[id]`, `/communities`, `/community/[id]`, `/settings`.

Khi chuyển từ prototype sang production, dùng Expo Router. Bản native 0.1 dùng state navigator nội bộ để giảm phụ thuộc và tránh giả vờ có backend.

## 6. Không đưa vào bản thương mại khi chưa kiểm chứng

- Coin, ví tiền và quà mua bằng tiền thật: cần purchase IAP/Billing, ledger, anti-fraud, refund.
- Livestream: chi phí SFU lớn, cần kiểm thử thoại có độ trễ thấp và kiểm soát lạm dụng.
- AI dịch/ghi âm: cần xin đồng ý rõ ràng, kiểm soát dữ liệu và quyền truy cập.
