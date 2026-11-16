# Túttt v0.5.3 — Nghiên cứu UX và thiết kế lại Live

## Đối chiếu sản phẩm
- BIGO LIVE: nhiều bố cục ghế, ưu tiên host và khách đang phát. https://activity.bigo.tv/live/act/bigo_foursixRoom/index.html
- TikTok LIVE: mời khách co-host cần người được mời chấp nhận, các hoạt động tương tác có điểm và quà. https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/cohost-on-tiktok-live
- Discord Stage: tách người nghe, người nói và người điều phối; lời mời cần người nhận xác nhận. https://support.discord.com/hc/en-us/articles/1500005513722-Stage-Channels-FAQ
- Twitch: chat chậm, AutoMod, cảnh báo và quản trị có nhật ký. https://help.twitch.tv/s/article/setting-up-moderation-for-your-twitch-channel

## Quy tắc thiết kế Túttt
1. Sân khấu Live là trọng tâm: cam 6 ghế, voice riêng, chat không đè điều khiển.
2. Top 3 dưới dạng một thanh nhỏ có thể chạm để xem chi tiết. Tránh đặt bảng xếp hạng lớn thường trực.
3. Không hiển thị người tặng quà giả như dữ liệu thật: khi nối máy chủ, bảng chưa có ví/quà tặng phải hiện trạng thái chưa kết nối.
4. Camera/mic chỉ bật sau hành động của người được cấp quyền, host không thể cưỡng ép.
5. Ảnh/logo bản duyệt giữ nguyên. Chủ đề Warm Ivory và Espresso Night có bề mặt dịu, tương phản đạt trên chữ chính.
6. Các mảng tĩnh cần bớt đường viền, tăng bo mềm, nhịp cách; giữ vùng chạm tối thiểu ~44 px.
7. Nút rời, cấm thành viên, khóa chat phải có trạng thái/xác nhận và kiểm soát từ máy chủ.

## Đã triển khai trong v0.5.3
- Thanh Top 3 gọn bên cạnh sân khấu với bảng chi tiết dạng bottom sheet trên web; khi online không hiển thị số liệu hư cấu.
- Một lượt chỉnh hệ thống màu, bo góc, khoảng cách cho Live Cam, chế độ chat, điều khiển và trạng thái kết nối trên cả hai theme.
- React Native có lối vào Top 3 và giải thích rõ chức năng chưa kết nối quà tặng.

## Chưa triển khai / nghiệm thu
- Coin/quà thật, webhook nạp tiền, sổ cái giao dịch, xếp hạng server, chống gian lận.
- Native build trên iOS/Android và LiveKit 1–6 camera ngoài thực tế.
- Tính năng auto-layout theo số video track thực, video focused speaker; hiện giữ lưới 6 vị trí để demo ổn định.
- Bài test user study 5–8 người, VoiceOver/TalkBack, font hệ thống cực lớn, battery/network profiling.
