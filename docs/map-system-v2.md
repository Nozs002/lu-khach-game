# Thiết kế map v2 — tham khảo cơ chế BrowserQuest

Bước triển khai đầu tiên đã có [lớp ground 172 × 314](world-ground-layer.md), bảng ID tile, atlas và hàm vẽ theo viewport. Lớp ground đã nối vào màn chơi với camera xem nền tại M0 và bộ chọn vùng; objects/foreground/collision/entities v2 chưa triển khai.

## Cấu trúc đã thống nhất

Người dùng xác nhận thiết kế map lưới nhiều lớp theo bảng sau. Đây là hợp đồng thiết kế đích, thay cho hướng ma trận số gộp v1. **Runtime hiện chưa chuyển đổi**; các JSON generated và bộ dựng v1 vẫn đang phục vụ game.

| Phần dữ liệu | Cách lưu | Mục đích |
| --- | --- | --- |
| Nền đất, cỏ, đường | `ground`: ma trận ID tile | Vẽ dưới nhân vật |
| Công trình, đồ vật | `objects`: ma trận ID tile | Vẽ nhà, hàng rào, đồ trang trí |
| Mái nhà, tán cây | `foreground`: ma trận ID tile | Vẽ che nhân vật khi đi phía sau |
| Collision | `collision`: ma trận 0/1 | Xác định ô đi được hoặc bị chặn |
| NPC, điểm sinh, cổng | `entities`: danh sách đối tượng có tọa độ | Định nghĩa các điểm chức năng |

Tên `objects` trong schema v2 là **lớp tile**, khác trường `objects` dạng danh sách cụm tile trong file generated v1. Danh sách thực thể có trường `type` để phân biệt `npc`, `spawn`, `portal` và các đối tượng chức năng bổ sung khi cần như `noticeboard`. Tọa độ trong dữ liệu map là tọa độ ô; không phải pixel ảnh hoặc pixel màn hình. Tọa độ mạng Player hiện vẫn là pixel, cần đổi tại ranh giới hệ thống cho tới khi cập nhật giao thức riêng.

Ba lớp hình ảnh cùng kích thước map: 172 cột × 314 hàng với thế giới ngoài trời. M4 có map nội thất và kích thước riêng. Trong lớp tile, `0` nghĩa là không có tile, ID dương tra tileset. Trong collision, `0` là đi được, `1` là bị chặn. **Tile ID 0 không phải điểm spawn.** Điểm/vùng spawn nằm trong entities và phải được kiểm tra trên collision, tránh ô đã bị chiếm.

Thứ tự vẽ được chốt: `ground → objects → NPC/người chơi theo chân y → foreground → tên/ô đích/hiệu ứng UI`. Mái/tán được tách khỏi phần chân công trình; collision chỉ khóa footprint cần chặn. Không vẽ lại toàn bộ mái hoặc tán trên nhân vật bất kể vị trí: tách đúng phần foreground và dùng sắp xếp theo chân cho phần cần quan hệ trước/sau.

Ví dụ sau minh họa schema bằng lưới 4 × 3, không phải kích thước thế giới:

```json
{
  "id": "example",
  "revision": 1,
  "width": 4,
  "height": 3,
  "tileSize": 24,
  "tileset": "village",
  "layers": {
    "ground": [[1, 1, 1, 1], [1, 2, 2, 1], [1, 2, 2, 1]],
    "objects": [[0, 10, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    "foreground": [[0, 11, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  },
  "collision": [[0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  "entities": [
    {"id": "guide", "type": "npc", "x": 2, "y": 1, "characterId": "guide", "blocking": true},
    {"id": "arrival", "type": "spawn", "x": 1, "y": 2, "priority": 1},
    {"id": "exit", "type": "portal", "x": 3, "y": 2, "width": 1, "height": 1, "enabled": false, "targetMapId": "next", "targetX": 1, "targetY": 1}
  ]
}
```

NPC không nướng vào atlas nền. Collision ở trên là va chạm tĩnh; NPC có `blocking=true` bổ sung vào lưới chiếm chỗ khi tìm đường, không làm thay đổi ô collision gốc. Cổng tắt không được kích hoạt; cổng đóng vật lý cần ô collision/đối tượng chặn phù hợp, không suy từ `enabled=false` rằng mọi ô đứng của cổng bị khóa. Cổng nối hai vùng trong cùng thế giới ngoài trời có thể chỉ là ranh giới vùng, không bắt buộc teleport.

Các lớp chi tiết phụ hoặc metadata safe-zone, vùng tương tác được đề xuất ở phần sau có thể mở rộng, nhưng không thay thế năm nhóm dữ liệu đã chốt. Nguồn soạn và bộ xuất phải sinh các lớp hình ảnh, collision và entities đồng bộ; không dùng màu ảnh để đoán va chạm.

Quy mô thế giới đã cập nhật thành 172 × 314 ô ngoài trời và tám khu M0–M7 theo [bố cục hiện hành](world-layout-preview.md), trong đó nội thất M4 là không gian riêng. Kích thước M0 32 × 24 bên dưới nói về làng, không phải kích thước toàn thế giới.

Ngày: 17/11/2026. Thiết kế tiếp theo cho Lữ khách theo yêu cầu thiết kế lại map. **Chưa chuyển runtime sang v2**; code hiện vẫn dùng ma trận số v1 và bộ dựng `build_grid_map.py`.

## Cơ sở tham khảo

Đọc trực tiếp nguồn BrowserQuest cục bộ, không chỉnh sửa repo tham khảo:

| Nguồn | Cơ chế quan sát được |
| --- | --- |
| `tools/maps/README.md`, `tools/maps/processmap.js` | Soạn map trong Tiled; xuất riêng dữ liệu client/server từ cùng nguồn. Xử lý layer tile và nhóm đối tượng. |
| `client/js/map.js`, `client/maps/world_client.json` | Client có tile data, collisions, high tiles, animated tiles, doors và checkpoints. |
| `client/js/renderer.js` | Tách terrain, entities và high tiles; có camera. |
| `server/js/map.js`, `server/maps/world_server.json` | Server có collision, staticEntities, checkpoints, doors và vùng sinh; không cần dữ liệu trang trí để quyết định luật chơi. |
| `client/js/pathfinder.js` | Tìm đường A* trên lưới; có xử lý vật cản động và đường đi chưa tới đích. |

BrowserQuest nguồn dùng thế giới lớn 172 × 314 ô, tile 16 px. Doors trong dữ liệu có tọa độ đi/đến trong thế giới; không mặc định mỗi vùng cảnh quan là một map độc lập. Lữ khách tham khảo kiến trúc này, giữ M0 và kết nối các map đã thiết kế, không sao chép thế giới hay exporter cũ.

## Quyết định thiết kế cho M0

Giữ tên Bến Cỏ, 32 × 24 ô, làng an toàn ban ngày, đài phun nước ở quảng trường. Giữ các vị trí dịch vụ và bốn điểm sinh để không đổi nội dung cùng lúc với đổi cơ chế dữ liệu. Tile logic vẫn 24 px và tọa độ Player trên mạng hiện vẫn là pixel; không đổi giao thức ngầm trong bước thiết kế này.

**Map vẫn là các ma trận số**, nhưng mỗi lớp có một nhiệm vụ. Một ô có thể vừa có nền cỏ, vừa có tán cây ở phía trên, trong khi collision của ô đó vẫn đi được. Không dùng một mã “nhà” để vừa suy nền, vừa co giãn sprite, vừa quyết định toàn bộ va chạm.

Nguồn soạn được đề xuất là một file Tiled TMJ cùng tileset TSJ, có các lớp dưới đây. Bộ xuất riêng của dự án tạo JSON client/server; không dùng trực tiếp exporter cũ của BrowserQuest. File Tiled chính là nguồn, các JSON runtime không sửa tay.

Bố cục Tiled ánh xạ vào năm nhóm đã chốt: các tile layer `ground`, `objects`, `foreground`, `collision` và object layer `entities`. Hoa/mép đường/bóng đổ có thể ghép vào ground hoặc objects; không bắt buộc thêm lớp details. Điểm tương tác, spawn và portal là các loại đối tượng trong entities, không phải ba nguồn tọa độ độc lập.

Các lớp đều cùng kích thước lưới, gốc trên trái. Tile ID thuộc bảng tileset, không phải mã gameplay như “3 = quán trọ”. Trong layer hình ảnh, 0 nghĩa là **không vẽ tile**, không đồng nghĩa được spawn. Trong collision, 0 nghĩa là đi được. Spawn chỉ được chọn nếu ô collision bằng 0, nằm trong spawnArea, không có vật cản động và không thuộc vùng chuyển map.

Các mã v1 (0,1,3,7…) sẽ được bộ chuyển đổi dùng một lần để tạo các lớp v2. Sau chuyển đổi, không giữ cả ma trận v1 và Tiled làm hai nguồn phải đồng bộ thủ công.

## Vẽ hình và tỉ lệ

Thứ tự: `ground → objects → entities theo chân y → foreground → tên/ô đích/hiệu ứng giao diện`. Avatar chân dung chỉ dùng ở UI; nhân vật và NPC dùng sprite toàn thân. Bóng đổ là trang trí, không chặn đường.

Nhà được ghép bằng tile từ tileset hoặc prefab có các lớp art/collision đã định nghĩa. Không kéo giãn cả hình nhà theo bounding box của một cụm số. Đài nước, bảng tin và cây cũng có kích thước art riêng; footprint không mặc định bằng toàn bộ hình nhìn thấy. Với vật cao, phần cần che nhân vật được gắn foreground, không đưa toàn bộ đối tượng lên trên người chơi.

Ninja Adventure chủ yếu dùng tile 16 px. Đề xuất lưu source tile 16 px, sprite/frame đúng kích thước gốc; giữ world logic 24 px và thực hiện đổi tọa độ khi render. Ở màn hình đủ rộng dùng render scale nguyên (ví dụ tile hiển thị 32 px), tắt smoothing. Ở màn hình nhỏ giữ kích thước đọc được bằng viewport thay vì ép toàn map xuống quá nhỏ. Không đổi x/y mạng thành tile ID hoặc source pixel.

M0 bản đầu có thể hiện trọn 32 × 24 ô khi đủ chỗ. Camera ở bước tiếp theo chỉ vẽ các ô trong viewport và giới hạn trong biên map; click phải được đổi từ screen sang world rồi sang ô. BrowserQuest có chuyển khung/zone, nhưng không bắt buộc sao chép kích thước zone hoặc hiệu ứng chuyển màn của nó. Đường lưới là công cụ debug có nút bật/tắt, mặc định tắt ở chế độ chơi sau chuyển v2.

## Đối tượng và thao tác

NPC là thực thể có ID và vị trí, không được nướng vào atlas/map nền. Hover nhận diện mục tiêu; click NPC chọn một ô kề cạnh đi được rồi A* đến đó. Chỉ mở thoại/dịch vụ khi server xác nhận đủ gần. Click mới hủy ý định tương tác cũ. Bảng tin là đối tượng tương tác tĩnh, có hai mục nhiệm vụ/thành tựu khi hệ đó được triển khai.

Click nền đi được chọn đích và hiện dấu đích ngắn hạn. Dùng A* bốn hướng với chi phí 1, Manhattan. Server tính/kiểm tra đường và tiến từng bước theo thời gian; client nội suy hiển thị. Collision tĩnh và chiếm chỗ động được xét riêng. Luật va chạm giữa người chơi cần chốt khi triển khai movement, không lấy giới hạn 50 kết nối hiện có làm bằng chứng đường làng đã chịu được 50 người.

BrowserQuest có đường đi gần nhất khi đích không tới được. Lữ khách chưa áp dụng fallback này: đích không hợp lệ báo không thể tới, tránh tự đổi nơi đến. Click NPC khác với click vào ô chặn. Không có quái hoặc nguồn sát thương trong M0.

## Xuất dữ liệu và quyền quyết định

```text
M0.tmj + tileset/prefab
          │ validate + export
          ├─ client: layers hình ảnh, atlas, collision, điểm tương tác, metadata vùng
          └─ server: collision, entities, spawnAreas, transitions, luật an toàn
```

Hai bản xuất có cùng `mapId`, `revision`, kích thước và tileSize. Server dùng collision và cấu hình chuẩn để xác thực; client không gửi ma trận hay tự quyết spawn, tiền, nhiệm vụ hoặc chuyển map. Chọn spawn ưu tiên bốn điểm hiện tại rồi các ô trống trong quảng trường; không spawn ngẫu nhiên ở mọi ô collision bằng 0.

Khi triển khai nhiều map mới bổ sung mapId/revision vào hợp đồng khởi tạo và cập nhật trạng thái. Hiện không sửa protocol chỉ để vẽ lại M0. Mỗi transition có vùng kích hoạt, map đích, ô đến lệch khỏi vùng kích hoạt và trạng thái enabled. Cổng M0 vẫn đóng khi chưa có M1; không thêm điểm dịch chuyển hoạt động tới dữ liệu thiếu.

## Trình tự triển khai đề xuất

1. Tạo nguồn Tiled và bộ chuyển đổi từ M0 số hiện tại; giữ bố cục và spawn. Xuất preview để so art/collision.
2. Tạo exporter và validator chung; xuất client/server cùng revision. Kiểm tra liên thông, footprint, ô spawn, ô kề NPC và cổng đóng.
3. Đổi renderer sang các layer và prefab đúng kích thước, tách NPC khỏi nền. Giữ sidebar/nhật ký hiện có.
4. Triển khai click-to-move/A*, movement có server xác thực và sprite theo hướng. Sau đó mới nối tương tác NPC/bảng tin.
5. Thêm camera khi viewport không chứa đủ map; sau đó mới làm transition M0–M1.

Tiêu chí nghiệm thu: người chơi hiện ở quảng trường; đi vòng được quanh đài và tới mọi dịch vụ; không xuyên tường/thân cây; không bị mái/tán che sai; NPC không thành ảnh nền không thể chọn; nhiều client nhìn cùng vị trí; click sidebar không di chuyển; cổng chưa mở không chuyển map. Chưa coi các tiêu chí này là đã kiểm thử runtime.
