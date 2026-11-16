# Túttt v0.8.28 — Rà soát thẩm mỹ toàn ứng dụng

Ngày thực hiện: 12/11/2026. Phạm vi: prototype web và design tokens/Primitives/screens React Native. Bản được nghiệm thu giao diện bằng Chromium; bản Native vẫn chưa build trên iOS/Android.

## Nguồn nghiên cứu và cách áp dụng

1. **Pinterest Palette 2026**: https://business.pinterest.com/pinterest-palette/ (Cool Blue `#D7EFFF`, Jade `#AEB8A0`, Plum Noir `#351E28`, Wasabi `#E9F056`, Persimmon `#FF5C34`). Không dùng toàn bộ 5 màu cùng lúc; Túttt chỉ lấy ý tưởng **cam san hô biểu cảm**, **độ sâu Plum Noir**, **xanh ngọc làm trạng thái tích cực**.
2. **Canva Design Trends 2026**: https://www.canva.com/newsroom/news/design-trends-2026/ (thẩm mỹ mang dấu ấn cá nhân, thiết kế đơn giản, vật liệu tinh tế, tránh cảm giác chế tạo công nghiệp). Áp dụng bề mặt nhẹ, độ sâu tinh tế, tiết chế lớp kính và họa tiết.
3. **Adobe 2026 design trends**: https://www.adobe.com/express/learn/blog/design-trends-2026 (màu ấm, typography giàu cá tính và trải nghiệm đa giác quan). Áp dụng cỡ chữ đầu trang, bậc chữ, màu điểm nhấn ở nơi có chủ đích.
4. **Google Material 3 Expressive**: https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/ (giao diện cá nhân hóa, thông tin nhận biết nhanh, chuyển động mượt). Áp dụng nhấn trạng thái tab, vùng chạm thuận tiện và chuyển chủ đề tại chỗ.
5. **W3C WCAG 2.2 target size**: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum (mức AA tối thiểu 24 px hoặc khoảng cách đủ; Túttt chủ động đặt 44 px cho các nút chính để dễ bấm).

Các báo cáo là dấu hiệu xu hướng quốc tế; chúng **không chứng minh một thị hiếu chung cho mọi thanh niên Việt Nam**. Đây là lựa chọn mỹ thuật có kiểm soát cho Túttt, không sao chép giao diện của sản phẩm khác.

## Thiết kế đã quyết định

| Vai trò | Ivory (Sáng) | Espresso (Tối) | Quy tắc |
|---|---|---|---|
| Nền chính | `#F8F2EB` | `#1B1719` | Sáng rõ và tối sâu, không bị lẫn |
| Thẻ thông thường | `#FFFCF7` | `#282124` | Áp dụng cho Khám phá, Chat, trang thông tin và sheet |
| Mặt nổi/đầu vào | `#F1E4D7` | `#382D30` | Tách cấp bậc vừa đủ |
| Chữ chính | `#2D211D` | `#FFF3E9` | Ưu tiên đọc rõ |
| Chữ phụ | `#65534C` | `#D9C2B7` | Không dùng ghi xám quá nhạt |
| Màu nhấn | `#A9382B` | `#FFAE90` | Chỉ tập trung ở thao tác/chọn trạng thái |
| Trạng thái tích cực | `#286D54` | `#9BE5C1` | Không dùng làm điểm PK hoặc status giả |

### Kiểm tra tỷ lệ tương phản của các cặp màu chính

- Ivory: chữ chính 14,03:1; chữ phụ 6,53:1; màu nhấn 5,75:1.
- Espresso: chữ chính 16,27:1; chữ phụ 10,44:1; màu nhấn 9,90:1.
- Bong bóng tin nhắn Native tối: chữ trên nền `#B74A3D` đạt 4,80:1.

Các tỷ lệ này đo **các cặp màu token đã xác định**, chưa đồng nghĩa mọi pixel trên ảnh video hoặc mọi văn bản trong ứng dụng đều đạt WCAG.

## Rà soát theo màn hình

| Màn hình | Các thay đổi v0.8.28 |
|---|---|
| Khám phá | Thẻ nổi bật dịu hơn, màu nền sáng/tối phân tầng, search sáng rõ, phòng có điểm nhấn màu vừa đủ |
| Danh sách Live | Thẻ phòng và chip bộ lọc đồng nhất; vùng nhấn của bộ lọc đủ lớn, không thay đổi lọc nghiệp vụ |
| Chat/hội thoại | Màu bong bóng gửi/nhận, ô nhập và thanh đầu theo chủ đề, cải thiện vùng chạm |
| Cộng đồng | Thẻ và ảnh đại diện theo cùng hệ bề mặt; giữ màu riêng của ảnh minh họa |
| Cá nhân | Sửa banner tối trong Ivory, thống nhất số liệu, huy hiệu và nút sửa hồ sơ |
| Cài đặt | Hai lựa chọn Ivory/Espresso rõ, màu sheet, chữ phụ và nút theo palette |
| Tạo phòng/hộp thoại | Nền và ô nhập giống thẻ chính, tăng vùng chạm nút đóng |
| Voice/Cam/PK | Bảo toàn bố cục đã duyệt, không thay luật màu WIN/LOSS và thanh điểm |
| React Native | Đồng bộ nền, thẻ, màu, chữ, nút tìm kiếm, điều hướng, hồ sơ, tông gửi chat |

**Cần nghiệm thu tiếp trên thiết bị:** bản build native thật, các cỡ chữ do OS phóng to, tình huống bàn phím hiện ở thiết bị iPhone/Android và âm thanh hai chiều qua LiveKit SFU.

## Hạn chế đặc thù

Không thay logo được duyệt. Không thêm font nhúng hay thư viện đồ họa mới. Không áp dụng màu xu hướng một cách máy móc; màu PK WIN/LOSS, microphone xanh khi đang nói thực sự và trạng thái kết nối giữ nghĩa đã chốt.
