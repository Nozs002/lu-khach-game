# Cốt truyện cơ bản và bản đồ — Lữ khách

Ngày: 13/11/2026. Trạng thái: bản đề xuất để trao đổi, chưa phải thiết kế đã chốt hoặc tính năng đã triển khai.

## 1. Hướng đã thống nhất

- Nhánh `codex/map-design` hiện chỉ viết tài liệu.
- Tham khảo mã nguồn và dữ liệu thế giới của BrowserQuest để thiết kế lại cốt truyện cơ bản và map.
- Cốt truyện mới hoàn toàn độc lập với bộ thiết kế **Miền Quên**. Không kế thừa thế giới, nhân vật, tổ chức, quy luật hoặc diễn biến của bộ đó.
- Repo BrowserQuest bên ngoài chỉ được đọc để tham khảo, không chỉnh sửa.

**Yêu cầu mới đã xác nhận:** thiết kế map nghỉ trước, không có quái, có người bán đồ; đặt các NPC hướng dẫn rải rác; dùng bảng tin để giao nhiệm vụ và xem thành tựu. Tên địa điểm, kích thước, danh tính NPC, nội dung nhiệm vụ, điều kiện thành tựu và cách mua bán dưới đây vẫn là đề xuất.

Hướng này mở rộng so với phạm vi cũ trong `game-design.md` và `protocol-v1.md` (một map chiến đấu, chưa có cửa hàng, nhiệm vụ hoặc thành tựu). Trên nhánh này ưu tiên yêu cầu thiết kế mới; các hợp đồng triển khai cũ chưa được sửa và cần cập nhật trước khi lập trình NPC, mua bán, nhiệm vụ, thành tựu hoặc chuyển map.

## 2. Tham khảo BrowserQuest

Đối chiếu trực tiếp tại thư mục `D:/Workspace/Projects/BrowserQuest-master`, không dùng thư mục `design` làm nguồn xây dựng nội dung mới.

| Nguồn đã xem | Điều quan sát được | Áp dụng cho game mình |
| --- | --- | --- |
| `tools/maps/tmx/map.tmx` | Map orthogonal 172 × 314 ô, tile 16 × 16; có nhóm đối tượng cửa, vùng quái, checkpoint và âm nhạc | Thiết kế địa hình và các vùng chức năng riêng trước khi chọn hình ảnh |
| `client/maps/world_client.json` | Có dữ liệu hình ảnh, collision, cửa, checkpoint; các vùng âm nhạc mang tên village, forest, beach, desert, cave, lavaland, boss | Dùng màu sắc và địa hình để người chơi nhận ra khu vực; map nghỉ dùng một miền cảnh quan nhất quán |
| `server/maps/world_server.json` | Có collision, vùng quái di chuyển, thực thể cố định, rương, cửa và checkpoint | Phân biệt phần nhìn thấy với luật đi lại và vị trí sinh; chỉ lấy phần cần cho phạm vi hiện hành |
| `client/js/npc.js` | NPC có các đoạn thoại ngắn hướng dẫn khám phá, nhắc kẻ địch và vật phẩm | Chỉ dẫn ngắn gắn với địa điểm, không cần kể truyện bằng đoạn thoại dài |
| `server/js/map.js` | Server nạp dữ liệu map, tạo lưới collision và xử lý nhóm vùng | Collision phải dựa trên dữ liệu chuẩn, không suy từ hình cây hoặc màu nền |
| `tools/maps/README.md` | Một map Tiled được xuất thành dữ liệu phục vụ client và server khác nhau | Khi triển khai, cần một nguồn dữ liệu chuẩn cho địa hình và gameplay |

Đây là quan sát từ bản nguồn cục bộ; phần hội thoại trong bản này đã có tiếng Việt. Không mặc định mọi nội dung tại đó là nguyên bản chưa chỉnh sửa của BrowserQuest. Việc tổ chức nhịp khám phá dưới đây là đề xuất của dự án mình, không phải cốt truyện BrowserQuest được chép lại.

Không đưa kích thước thế giới lớn, nhiều biome, cửa chuyển khu, hệ trang bị, rương hoặc boss vào bản đầu chỉ vì nguồn tham khảo có những phần đó. Nếu sau này sao chép mã hay nội dung, cần xem lại LICENSE và ghi nguồn theo phần thực sự dùng; tài liệu hiện tại chỉ tham khảo cấu trúc.

## 3. Vai trò của map nghỉ

Map đầu tiên là nơi người chơi xuất hiện, làm quen với thế giới, gặp nhau và chuẩn bị trước khi lên đường. Toàn bộ map an toàn: không sinh quái, không có chiến đấu, không có sát thương môi trường và không có sự kiện quái tấn công làng.

**Bối cảnh đề xuất:** Bến Cỏ là một làng nhỏ nằm trên tuyến giao thương. Thương nhân ghé bán vật dụng, người đi đường nghỉ chân và các lữ khách gặp nhau trước khi khám phá vùng đất bên ngoài. Người chơi bắt đầu như một khách mới tới làng; chưa cần nhiệm vụ khẩn cấp hoặc một phản diện để thúc đẩy họ rời đi.

Bến Cỏ là tên tạm. Chưa chốt cốt truyện ngoài làng, số map khám phá, loại quái hoặc boss. Đề xuất bãi slime và suối chiến đấu trước đây được rút khỏi map khởi đầu; không xem chúng là nội dung đã chốt cho map tiếp theo.

Vòng hoạt động tại đây:

```text
Vào game → xuất hiện ở quảng trường → gặp NPC / người chơi khác
                    ↑                         ↓
              trở về nghỉ chân ← chuẩn bị đồ → tới cổng làng
```

Cổng làng thể hiện hướng hành trình về sau. Trong giai đoạn chỉ có map nghỉ, cổng chưa chuyển người chơi tới một map chưa tồn tại; phải có thông báo rõ khi tương tác.

## 4. Các địa điểm và NPC

| Địa điểm | Nhân vật đề xuất | Người chơi làm gì | Trạng thái |
| --- | --- | --- | --- |
| Các điểm trong làng | NPC hướng dẫn rải rác | Chỉ dẫn theo địa điểm: quảng trường, khu dịch vụ, bảng tin và cổng | Đã xác nhận cách bố trí; vị trí và lời thoại cụ thể là đề xuất |
| Quầy tạp hóa | Người bán đồ | Xem hàng và mua vật phẩm chuẩn bị cho chuyến đi | Có người bán đồ là yêu cầu đã xác nhận; danh mục và luật mua chưa chốt |
| Lò rèn | Thợ rèn | Xem vũ khí và giáp | Đề xuất; chưa thêm nâng cấp, chế tạo hoặc sửa độ bền |
| Quán trọ | Chủ quán | Nghỉ chân, trò chuyện | Đề xuất; cách hồi máu và phí nghỉ chưa chốt |
| Bảng tin | Không bắt buộc có NPC trực | Nhận nhiệm vụ và xem thành tựu | Đã xác nhận hai chức năng; nội dung và luật tiến trình chưa chốt |
| Cổng làng | Người gác cổng | Hỏi về hướng đi, rời làng khi có map tiếp theo | Đề xuất; quy tắc chuyển map sẽ thiết kế sau |

Ưu tiên một người bán đồ với quầy dễ nhận biết. Các NPC khác làm làng có sinh hoạt nhưng không cần triển khai toàn bộ ngay. Không mặc định mọi ngôi nhà đều có nội thất riêng; trước mắt có thể đặt NPC trước cửa hoặc dưới mái hiên.

### NPC hướng dẫn rải rác

Mỗi NPC hướng dẫn một việc gắn với nơi họ đứng, tránh dồn toàn bộ thông tin vào một người ở điểm xuất hiện. Đề xuất người đón khách gần quảng trường chỉ đường tới dịch vụ; NPC gần quầy giải thích mua đồ; NPC cạnh bảng tin giới thiệu nhiệm vụ và thành tựu; người gác cổng giới thiệu vùng bên ngoài. Có thể để NPC dịch vụ kiêm hướng dẫn, không cần thêm một NPC cho mọi chức năng.

Hội thoại ngắn, có thể đọc lại và không bắt buộc nói chuyện lần lượt mới được sử dụng dịch vụ. Đặt NPC bên đường hoặc cạnh mốc dễ thấy, không chắn lối đi và điểm tương tác.

### Bảng tin: nhiệm vụ và thành tựu

Bảng tin là nơi người chơi chủ động tới để nhận việc và xem những gì đã đạt được. NPC vẫn đảm nhiệm hướng dẫn tại chỗ; bảng tin không thay thế toàn bộ lời chỉ dẫn trong làng.

Đề xuất giao diện có hai mục:

- **Nhiệm vụ:** xem danh sách công việc, mô tả, mục tiêu, phần thưởng và trạng thái của bản thân; chọn nhận nhiệm vụ. Nơi trả nhiệm vụ hoặc nhận thưởng (tại bảng hay NPC liên quan) cần chốt sau.
- **Thành tựu:** xem thành tựu đã mở khóa và điều kiện/tiến độ của các thành tựu được công khai. Chưa mặc định có điểm thưởng, bảng xếp hạng hoặc quà cho mỗi thành tựu.

Đề xuất nhiệm vụ là công việc chủ động nhận, có mục tiêu và kết quả hoàn thành; thành tựu ghi nhận các cột mốc đạt được trong quá trình chơi. Ví dụ để trao đổi: nhiệm vụ khám phá một địa điểm ngoài làng; thành tựu ghé đủ các dịch vụ trong làng. Đây chưa phải danh sách nội dung đã chốt.

Bảng tin là vật thể dùng chung, nhưng giao diện và tiến trình hiển thị theo từng người; nhiều người được xem đồng thời. Việc nhiệm vụ có thể làm chung, cách tính đóng góp và lưu tiến trình sau khi rời game cần thiết kế riêng. Yêu cầu xem thành tựu chưa đồng nghĩa đã có tài khoản hoặc cơ chế lưu lâu dài.

### Người bán đồ

Quầy đặt gần quảng trường, có biển hiệu và các kiện hàng để nhận ra ngay khi vào game. Đề xuất bắt đầu bằng vật phẩm tiêu hao như bình máu; vũ khí, giáp và bán lại đồ thiết kế sau khi xác định hệ trang bị.

Luồng tương tác dự kiến: tới gần → mở danh mục → xem tên, công dụng, giá và số tiền đang có → chọn số lượng → xác nhận mua → nhận kết quả và số dư mới. Thiếu tiền hoặc không đủ chỗ chứa phải có phản hồi rõ. Không tiêu tiền chỉ vì click vào NPC.

Cần chốt tiền tệ, nguồn tiền ban đầu, cách kiếm tiền, túi đồ và cách dùng vật phẩm trước khi lập trình. Thiết kế cũ dùng bình máu ngay khi nhặt và chưa có inventory; mua bình để mang theo là thay đổi gameplay cần thiết kế riêng. Chưa đặt giá hoặc hứa có hệ mua bán hoạt động.

### Quán trọ và nghỉ chân

Nghỉ chân trước hết là chức năng của không gian: nơi an toàn để dừng lại, gặp bạn và chuẩn bị. Chưa mặc định đứng trong làng sẽ tự hồi máu, được hồi sinh tại mọi giường hoặc nghỉ miễn phí. Có thể chọn hồi đầy máu khi nói chuyện với chủ quán ở bước thiết kế luật chơi sau.

## 5. Bố cục sơ bộ

Đề xuất map 32 × 24 ô, tileSize 24 như kích thước khởi đầu của tài liệu cũ; đây chưa phải kích thước đã chốt cho làng. Nếu các quầy và đường đi quá chật, tăng kích thước sau khi phác ô, thay vì thu hẹp lối đi.

```text
                            BẮC
    ┌────────────────────────────────────────┐
    │     QUÁN TRỌ             LÒ RÈN        │
    │        │                    │          │
    │        └──── Đường làng ─────┘          │
    │                   │                    │
    │  TẠP HÓA ─── QUẢNG TRƯỜNG ─── BẢNG TIN │
    │              Điểm xuất hiện            │
    │                   │                    │
    │  Vườn / ghế nghỉ ──┴────── CỔNG LÀNG   │
    └────────────────────────────────────────┘
                            NAM
```

Sơ đồ biểu diễn vị trí tương đối, không theo tỉ lệ. Quảng trường là mốc chính; từ đây thấy hoặc nhận ra đường tới quầy bán đồ và cổng. Đường nối các dịch vụ tạo vòng để người chơi đi dạo, không cần quay lại cùng một ngõ cụt.

| Khu | Khoảng ô dự kiến, tính cả hai đầu | Ghi chú |
| --- | --- | --- |
| Quán trọ | x=3..10, y=2..7 | Mặt tiền hướng về trung tâm, có sân trước |
| Lò rèn | x=21..28, y=2..7 | Chừa khoảng tương tác trước quầy |
| Tạp hóa | x=2..8, y=10..15 | Gần nơi xuất hiện, dễ nhận biết |
| Quảng trường | x=11..20, y=9..16 | Điểm sinh đề xuất (13,12), (15,12), (13,14), (15,14) |
| Bảng tin | x=23..28, y=10..14 | Không chắn đường từ quảng trường ra cổng |
| Vườn nghỉ | x=3..11, y=18..21 | Cây, ghế, hoa; không có quái ẩn |
| Cổng làng | x=25..29, y=18..22 | Hướng đi về sau, chưa chốt ô kích hoạt chuyển map |

Các khoảng trên là diện tích bố trí, không phải footprint collision của công trình. Đường chính rộng ít nhất ba ô đi được; khu đứng trước NPC rộng ít nhất hai ô. Chừa khoảng trống để bốn người xuất hiện và tiếp cận các dịch vụ. Không đặt điểm sinh trong vật cản hoặc ô tương tác của NPC.

Nhà, hàng rào, thân cây và đá chặn đường theo dữ liệu rõ ràng. Cỏ thấp, hoa, bóng đổ chỉ trang trí. Biên map đóng bằng hàng rào và cây, chỉ chừa cổng theo thiết kế; khi chưa có chuyển map, có chặn và thông báo phù hợp tại cổng.

## 6. Quy tắc của map nghỉ

- Không có điểm sinh quái, vùng roaming, mục tiêu tấn công hoặc sát thương từ quái bên ngoài đi theo vào làng.
- Không PvP và không nhận sát thương môi trường. Toàn bộ map là khu an toàn, không chỉ quảng trường.
- Mọi người chơi nhìn thấy cùng NPC và bố cục làng. Giao diện mua hàng và tiền/túi đồ thuộc từng người; không để một người mở cửa hàng làm khóa NPC với người khác.
- Không mặc định NPC có lượng hàng giới hạn dùng chung. Đây là quyết định kinh tế cần chốt nếu muốn thêm sau.
- Tương tác NPC phải phân biệt với click di chuyển, có cách đóng hộp thoại và không làm nhân vật kẹt đường.
- Khi có map ngoài làng, cần thiết kế rõ điểm đến, điểm quay về và cách ngăn quái vượt ranh giới. Chưa tự thêm loại gói tin vào protocol-v1.

## 7. Tiêu chí cho bản phác tiếp theo

1. Từ cả bốn điểm sinh đều tới được tạp hóa, quán trọ, bảng tin và cổng.
2. Người mới nhận ra quầy bán đồ và lối ra mà không cần bật lưới/debug.
3. NPC và người chơi đứng trước quầy không làm nghẽn đường chính.
4. Toàn bộ map không có quái hoặc nguồn sát thương; không có ngõ dẫn nhầm vào bãi chiến đấu trong cùng map.
5. Công trình có footprint rõ, không để mái nhà che khu tương tác quan trọng.
6. Cổng chưa mở có thông báo rõ; không chuyển tới dữ liệu hoặc địa điểm chưa thiết kế.
7. NPC hướng dẫn phân bố theo địa điểm, nội dung ngắn và không yêu cầu đọc tuần tự.
8. Bảng tin có hai mục nhiệm vụ/thành tựu rõ ràng, hiển thị đúng tiến trình của người đang tương tác và không khóa người chơi khác.

Đây là tiêu chí thiết kế, chưa phải kết quả kiểm thử.

## 8. Thứ tự thiết kế tiếp

Bản đề xuất hệ thống map nối từ làng được phát triển tại [world-maps.md](world-maps.md), gồm sơ đồ kết nối, vai trò và bố cục từng vùng. Đây là bước thiết kế tiếp theo, chưa chốt số lượng map hoặc thay đổi hợp đồng triển khai.

Trước tiên chốt phong cách làng, vị trí các dịch vụ, NPC hướng dẫn và bảng tin trên bản phác lưới map nghỉ. Sau đó thiết kế danh mục hàng, tiền, túi đồ, nhiệm vụ đầu tiên và các thành tựu cơ bản; xác định cách lưu tiến trình. Tiếp theo nối làng với map khám phá và viết tiếp cốt truyện ngoài làng. Chỉ sửa mã nguồn hoặc tạo dữ liệu game khi có yêu cầu chuyển sang triển khai.
