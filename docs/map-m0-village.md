# M0 — Bản phác ô làng nghỉ

Ngày: 13/11/2026. Bản phác đề xuất, chỉ là tài liệu; chưa tạo dữ liệu runtime hoặc sửa code. Theo [hệ thống map](world-maps.md) và [thiết kế làng](story-and-map.md). Tên Bến Cỏ vẫn tạm thời.

## 1. Quy ước và lưới

32 × 24 ô, tile logic 24 px. Gốc (0,0) ở trên trái; x tăng sang phải, y tăng xuống. Số đầu hàng là y, không phải ô. Toàn bộ map an toàn, không có quái hoặc nguồn sát thương.

```text
   00000000001111111111222222222233
   01234567890123456789012345678901
00 ################################
01 #..............................#
02 #..HHHHHHHH..........FFFFFFFF..#
03 #..HHHHHHHH..........FFFFFFFF..#
04 #..HHHHHHHH..........FFFFFFFF..#
05 #..HHHHHHHH..........FFFFFFFF..#
06 #..HHHHHHHH..........FFFFFFFF..#
07 #......I============R======....#
08 #.......===================....#
09 #.......===================....#
10 #.SSSSSS.=====N=======.........#
11 #.SSSSSSV=============...B.....#
12 #.SSSSSS=====P=P=======N====...#
13 #.SSSSSS====================...#
14 #.SSSSSS=====P=P============...#
15 #........=============...===...#
16 #........=============...===...#
17 #........===.............===...#
18 #...T...b===================N=.#
19 #........====================GGG
20 #.....T..====================GGG
21 #..T.b...................===.GGG
22 #........................===...#
23 ################################
```

| Ký hiệu | Ý nghĩa | Di chuyển |
| --- | --- | --- |
| `.` | Cỏ hoặc đất sân | Đi được |
| `=` | Đường lát / quảng trường | Đi được |
| `P` | Điểm xuất hiện; nền quảng trường | Đi được |
| `G` | Lối cổng, hành lang nối M1 | Đi được khi cổng hoạt động |
| `#` | Biên cây hoặc hàng rào | Chặn |
| `H` | Footprint quán trọ | Chặn |
| `F` | Footprint lò rèn | Chặn |
| `S` | Footprint quầy tạp hóa | Chặn |
| `T` | Cây, phần thân/ô chiếm chỗ | Chặn |
| `b` | Ghế nghỉ trang trí | Chặn; chưa có thao tác ngồi |
| `B` | Bảng tin | Chặn; tương tác từ ô kề |
| `I` | Chủ quán trọ | Chặn; tương tác từ ô kề |
| `R` | Thợ rèn | Chặn; tương tác từ ô kề |
| `V` | Người bán đồ | Chặn; tương tác từ ô kề |
| `N` | NPC hướng dẫn | Chặn; tương tác từ ô kề |

Cỏ được phép đi để làng không giống mê cung hành lang. Lưới thể hiện collision logic, không thể hiện hết mái nhà, hoa, biển hiệu hoặc bóng đổ. Không suy collision từ phần mái nhô ra ngoài footprint.

## 2. Công trình và chỗ tương tác

| Địa điểm | Footprint / vị trí (x,y), tính cả hai đầu | Ô đứng tương tác gợi ý |
| --- | --- | --- |
| Quán trọ | x=3..10, y=2..6; chủ quán (7,7) | (7,8) |
| Lò rèn | x=21..28, y=2..6; thợ rèn (20,7) | (20,8) |
| Tạp hóa | x=2..7, y=10..14; người bán (8,11) | (9,11) |
| Bảng tin | (25,11) | (25,12), (24,11), (26,11) |
| Quảng trường | khu trung tâm x=11..21, y=10..16 | Bốn điểm P: (13,12), (15,12), (13,14), (15,14) |
| Cụm nghỉ | Cây và ghế ở tây nam | Đi tới được; không có chức năng hồi máu riêng |

Ô tương tác trong bảng là ví dụ dễ tiếp cận; đề xuất cho phép mọi ô kề cạnh hợp lệ. NPC đứng cố định ở bước đầu. Nhà chưa có nội thất hoặc cửa chuyển map; người chơi dùng dịch vụ trước mặt tiền. Hình cửa chỉ trang trí, không tạo kỳ vọng có phòng vào được.

## 3. NPC hướng dẫn

| Vị trí | Nội dung chính | Câu gợi ý |
| --- | --- | --- |
| (14,10), sát quảng trường | Giới thiệu làng | “Tạp hóa ở phía tây, quán trọ ở phía bắc. Bạn có thể chuẩn bị trước khi lên đường.” |
| (23,12), gần bảng tin | Nhiệm vụ và thành tựu | “Đọc bảng tin để nhận việc và xem những cột mốc bạn đã đạt được.” |
| (28,18), gần cổng | Đường ra ngoài | “Qua cổng là đường đồng cỏ. Hãy chuẩn bị vật dụng trước khi rời làng.” |

Người bán đồ, chủ quán và thợ rèn kiêm giải thích dịch vụ; không thêm NPC hướng dẫn riêng ngay sát họ. Không yêu cầu gặp đủ NPC mới cho mở bảng tin hoặc cửa hàng. Lời thoại trên là đề xuất, chưa chốt tên nhân vật.

## 4. Cổng nối M1

Cổng ở biên đông, mở tại x=31, y=19..21; hành lang cổng x=29..31, y=19..21. Đề xuất ô kích hoạt sang M1 là ba ô biên (31,19), (31,20), (31,21).

Khi quay từ M1 về, người chơi tới (28,20), cách vùng kích hoạt ba ô, tránh chuyển ngược tức thì. Đích sang M1 chỉ chốt khi có lưới M1; cần kiểm tra cặp lối đi trước khi triển khai. Khi M1 chưa tồn tại, ba ô biên cổng bị chặn và có thông báo “Đường phía trước chưa mở”; không đổi toàn bộ hành lang thành vật cản.

Không có lối ra khác hoặc dịch chuyển nhanh. Người vào game xuất hiện tại P, không xuất hiện giữa cổng.

## 5. Hình ảnh và khả năng đọc map

- Quảng trường sáng và thoáng; không đặt mái che, cây cao hoặc bàn ở bốn điểm sinh.
- Quán trọ có biển giường, lò rèn có đe/biển vũ khí, tạp hóa có kiện hàng để phân biệt dịch vụ trước khi đọc thoại.
- Bảng tin quay về đường ngang y=12..14; chừa các ô đứng đọc để nhiều người cùng tới.
- Vườn thu thành cây, ghế và hoa cạnh lối đi, không phát triển thành một hệ dịch vụ riêng.
- Đường chính thường rộng ba ô, sân trung tâm rộng hơn. NPC và bảng tin đặt bên lối, tránh bít hết chiều ngang.
- Mái, tán cây và lớp trang trí trên cao cần kiểm tra bằng ảnh render sau; bản phác logic chưa xác minh phần che hình.

## 6. Kiểm tra bản phác

Đã kiểm tra bằng duyệt lưới bốn hướng trên đúng bản phác trong tài liệu: bốn điểm P liên thông; mọi NPC và bảng tin có ô kề tiếp cận được; đường ra cổng liên thông; không có ô đi được bị cô lập khi cổng hoạt động. Phép kiểm tra coi NPC và công trình là ô chặn theo chú giải.

Đây chỉ là kiểm tra tính nối thông của bản phác, chưa kiểm thử gameplay, camera, đồ họa, khoảng tương tác, mua bán hoặc chuyển map thực tế. Hệ thống đứng chung ô/va chạm động cần tuân theo luật gameplay khi triển khai.

## 7. Bước tiếp theo

Review bố cục làng rồi phác M1 — Đồng Cỏ Ven Đường, ghép lối vào phía tây M1 với cổng đông M0. M0 vẫn giữ vai trò nghỉ và chuẩn bị; toàn bộ quái nằm ngoài làng.
