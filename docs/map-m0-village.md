# M0 — Bản phác ô làng nghỉ

Đã chốt hướng dữ liệu nhiều lớp tại [cấu trúc v2](map-system-v2.md): ba lớp tile (nền, công trình/đồ vật, mái/tán), collision 0/1 và danh sách NPC/spawn/cổng. Ma trận số gộp trong lịch sử bên dưới vẫn là runtime v1, chưa phải cấu trúc đích.

Hướng thiết kế tiếp theo: [Map v2 theo cơ chế BrowserQuest](map-system-v2.md). V2 tách các lớp tile số, collision và entities/spawn/transition; chưa thay runtime ma trận số v1 hiện tại. Các phần bên dưới ghi bố cục và lịch sử phát triển M0.

Ngày: 13/11/2026. Bản phác đề xuất, chỉ là tài liệu; chưa tạo dữ liệu runtime hoặc sửa code. Theo [hệ thống map](world-maps.md) và [thiết kế làng](story-and-map.md). Cập nhật 17/11/2026: đã xác nhận giữ tên **Bến Cỏ**, điểm nhấn quảng trường là **đài phun nước**, không khí **ban ngày, sáng và yên bình**. Kích thước và tọa độ vẫn là đề xuất.

## 1. Quy ước và lưới

Map M0 rộng 172 × 314 ô, tile logic 24 px. Sơ đồ dưới đây chỉ phác khu vực lõi 32 × 24 ô, không phải toàn bộ map; các tọa độ trong sơ đồ và bảng bên dưới là tọa độ cục bộ của khu vực này, vị trí của khu vực trên map đầy đủ chưa chốt. Gốc tọa độ cục bộ (0,0) ở trên trái; x tăng sang phải, y tăng xuống. Số đầu hàng là y, không phải ô. Khu vực được phác hoàn toàn an toàn, không có quái hoặc nguồn sát thương.

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
12 #.SSSSSS=====P=P==OOO==N====...#
13 #.SSSSSS==========OOO=======...#
14 #.SSSSSS=====P=P==OOO=======...#
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
| `O` | Bể đài phun nước | Chặn; chỉ trang trí |
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
| Đài phun nước | x=18..20, y=12..14; footprint đề xuất 3 × 3 ô | Không có tương tác chức năng |
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

Đài phun nước đặt lệch về phía đông quảng trường để giữ nguyên bốn điểm sinh. Chừa lối vòng phía tây x=15..17 và phía bắc y=9..11 rộng ba ô. Lối phía đông qua x=21..23, y=13..15 tránh NPC (23,12); phía nam có thể đi trên nền lát và cỏ y=15..17. Không thêm vật cản vào các lối vòng này.

Không khí ban ngày sáng và yên bình: cỏ xanh, nhà gỗ, đường đất nối nền đá sáng của quảng trường, bóng đổ nhẹ. Không cần chu kỳ ngày đêm. Đài có bể đá thấp, nước xanh sáng và vòi phun nhỏ để hạn chế che nhân vật. Animation nước là tùy chọn; đài không hồi máu, không giao nhiệm vụ. Chọn asset ở bước dựng hình, chưa xác minh Ninja Adventure có đài phù hợp.


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

## Trạng thái hiển thị M0 — 17/11/2026

Đã đưa nền M0 vào client làm màn hình khởi đầu sau WELCOME, thay nền lưới sảnh chờ. Canvas 768 × 576, tile logic 24 px; renderer vẽ người chơi từ tọa độ pixel của server, server ưu tiên bốn ô P rồi các ô quảng trường trống. Nền có NPC tĩnh, không có người chơi mẫu hoặc nhãn review. Đây là bước hiển thị map; collision runtime, di chuyển A*, dịch vụ, chuyển map và animation nước chưa triển khai. Các tuyên bố “chỉ tài liệu” phía trên phản ánh giai đoạn phác trước cập nhật này.

## Bản đồ theo lưới ô — cập nhật 17/11/2026

Đã thay nền PNG nguyên map bằng tile atlas và dữ liệu lưới. Giữ bố cục 32 × 24 ô, mỗi ô logic 24 px; có nút bật/tắt đường lưới trên client, mặc định bật để review.

- Nguồn cấu trúc: `source/common/maps/m0-layout.json`, gồm hàng ký hiệu, kích thước, tileSize và trạng thái cổng. Khi đổi bố cục cần cập nhật nguồn này và sơ đồ tài liệu tương ứng.
- File sinh tự động: `source/client/src/data/m0.generated.json`, gồm `ground`, `objects`, `collision`, `spawns` và thông số atlas.
- Tile atlas: `source/client/public/assets/maps/m0-tiles.png`; mỗi tile nguồn 16 px được renderer vẽ thành một ô logic 24 px. Công trình được chia thành các tile; hình nhà hiện vẫn dùng sprite resize ở bước tạo atlas, cần tinh chỉnh art sau.
- Script dựng: `python statics/map-design/build_grid_map.py`. Ảnh review từ cùng dữ liệu tại `statics/map-design/ben-co-grid-preview.png`. Ảnh nền cũ còn lưu làm tham chiếu, renderer không dùng nữa.
- Collision là dữ liệu riêng: 0 đi được, 1 bị chặn. Mái/tán cây có thể nằm trên ô khác footprint; không suy collision từ alpha ảnh. Cây và ghế chỉ được đặt theo các ký hiệu T/b; bỏ các đồ trang trí ngoài lưới của ảnh cũ để tránh chặn đường không rõ.
- Cổng G chỉ đi được khi mở. Hiện `gateOpen=false`: chỉ ba ô biên (31,19..21) bị chặn, phần hành lang x=29..30 vẫn đi được theo quy tắc bên trên.
- Bốn spawn P liên thông; NPC và bảng tin có ô kề tiếp cận được. Đã kiểm tra kích thước, collision, tile index và bounds công trình.

Chưa có di chuyển A* hoặc xử lý va chạm phía server. Tọa độ Player qua mạng vẫn là pixel; tọa độ lưới và hàm isWalkable dùng ô. Đây là bước chuẩn bị dữ liệu, chưa phải cơ chế tìm đường hoàn chỉnh.

## Nguồn hiện hành: ma trận số

Từ cập nhật này, nguồn chính là `source/common/maps/m0-layout.json`, trường `matrix[y][x]`. Sơ đồ ký tự phía trên chỉ giữ để đọc bố cục lịch sử. Renderer không đọc sơ đồ Markdown và không dùng tọa độ công trình viết sẵn.

| Mã | Nội dung | Đi được | Được spawn |
| --- | --- | --- | --- |
| 0 | Ô trống quảng trường | Có | Có |
| 1 | Biên | Không | Không |
| 2 | Đường đất | Có | Không |
| 3 | Quán trọ | Không | Không |
| 4 | Cây | Không | Không |
| 5 | Đài phun nước | Không | Không |
| 6 | NPC hướng dẫn | Không | Không |
| 7 | Điểm spawn ưu tiên | Có | Có |
| 8 | Cỏ | Có | Không |
| 9 | Lò rèn | Không | Không |
| 10 | Tạp hóa | Không | Không |
| 11 | Ghế | Không | Không |
| 12 | Bảng tin | Không | Không |
| 13 | Chủ quán trọ | Không | Không |
| 14 | Thợ rèn | Không | Không |
| 15 | Người bán đồ | Không | Không |
| 16 | Hành lang cổng | Có | Không |
| 17 | Đường lát đá | Có | Không |
| 18 | Cổng đóng | Không | Không |

`0` là ô trống trong quảng trường, có nền đá và được phép spawn; `8` là cỏ đi được nhưng không dùng làm spawn đầu game. `7` là điểm spawn ưu tiên. Cách này giữ người chơi xuất hiện ở quảng trường thay vì rải khắp làng. Đổi một ô sang `0` đồng nghĩa ô đó trở thành ứng viên spawn; không cần sửa danh sách tọa độ Java.

Mỗi mã có quy tắc trong `tileTypes`: tên, loại nền, đi được và có được spawn. Bộ dựng duyệt ma trận để sinh nền và collision; các cụm liên thông mã 3/9/10/5 được tìm tự động, phải là hình chữ nhật. Mỗi cụm vẽ đúng một công trình theo bounding box, không vẽ lặp nhà trên từng ô. Cây, ghế, NPC và bảng tin lấy vị trí từ từng ô tương ứng; bảng tin có hình nhô lên một ô, thân cây có tán nhô lên/tràn ngang nhưng collision dựa mã ô.

Cổng: `16` là hành lang đi được, `18` là ô cổng đóng. Để mở cổng về mặt dữ liệu đổi mã 18 thành 16; chưa có chuyển map nên hiện giữ cổng đóng.

Sau khi sửa ma trận, chạy `python statics/map-design/build_grid_map.py`. Script tạo atlas, `m0.generated.json` cho client, tài nguyên `source/server/src/main/resources/maps/m0-spawns.generated.json` cho server và ảnh review. Không sửa các file generated thủ công. Server ưu tiên ô 7 rồi ô 0 theo thứ tự hàng/cột, bỏ qua vị trí đã có người. Tọa độ mạng vẫn là pixel = tọa độ ô × 24. Cần build/khởi động lại server sau đổi ma trận.

Các lớp `ground`, `collision`, `objects` trong file generated là kết quả tính từ một ma trận nguồn, không phải các bản thiết kế độc lập phải sửa tay. A* và di chuyển vẫn chưa triển khai.
