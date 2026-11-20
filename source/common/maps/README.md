# Map Tiled đang chạy

`world.tmj` là nguồn map runtime hiện tại. Giữ nguyên ảnh tileset trong `tilesets/`.

Từ gốc repo chạy:

```powershell
python statics/map-design/import_tiled_world.py
```

Lệnh này xuất `source/client/src/data/world.generated.json`, sao chép ảnh vào public/assets/maps/tiled và xuất `source/server/src/main/resources/maps/world.generated.json`. Không sửa tay file generated. Client tự chạy import trước `npm run dev` / `npm run build`; sau khi sửa map khi dev đang chạy cần chạy lại import. Build/khởi động lại server để cập nhật collision và spawn.

Các lớp hình ảnh được giữ nguyên dữ liệu GID, hướng lật, thứ tự, độ trong suốt và trạng thái hiển thị. Lớp `collision` không vẽ: ô có tile là bị chặn, ô trống là đi được. Không tự suy va chạm từ hình cây, nhà, nước. Vì vậy các vị trí chưa đánh collision trong Tiled vẫn đi được.

Object có type/class `spawn` trong lớp entities xác định điểm vào. Tọa độ pixel Tiled được lấy ô chứa điểm bằng floor(x/16), floor(y/16). Spawn hiện tại là ô (53,233). Server gửi tọa độ ô thế giới (giao thức MOVE_TO); người vào tiếp theo được chọn ô trống gần điểm spawn, chỉ trong vùng liên thông đi được. Không thay đổi file Tiled.

Chạy thử client và server như README của từng phần. Click ô trống để tìm đường A*. Server tính đường trên collision và tiến một ô mỗi 200ms; client nội suy chuyển động. Không dùng điều khiển bàn phím. Camera theo người chơi; bộ chọn vùng cho phép xem nơi khác, chọn Điểm xuất hiện để theo nhân vật. Chưa có NPC tương tác hay animation bước chân. Metadata safeZone trong WELCOME chỉ bao vùng các điểm spawn để tương thích dữ liệu A*; chưa định nghĩa vùng an toàn chiến đấu.

Kiểm tra importer: `python statics/map-design/test_import_tiled_world.py`.

## Vùng spawn quái

Thuộc tính bool `enabled` mặc định là true; đặt false để giữ một vùng nháp trong Tiled nhưng bỏ qua khi export. Vùng phải có diện tích hợp lệ trước khi đặt `enabled = true`.

Cấu hình hiện tại có 55 vùng hoạt động, tổng giới hạn `maxAlive` là 149 (chỉ là giới hạn cấu hình, chưa sinh quái). Vùng gần làng dùng slime với bán kính phát hiện 4 ô và đuổi tối đa 8 ô. Những vùng khác có 1–6 con tùy diện tích đi được; hai vùng lớn phía bắc tối đa 8 con/vùng. Các mã `zoneId` chứa tên khu vực, loại quái và object ID để không trùng nhau.

Các mã `monsterType` đang dùng tương ứng thư mục sprite trong Ninja Adventure: `slime` → Slime; `slime2` → Slime2; `mushroom` → Mushroom; `bamboo` → Bamboo; `bamboo_yellow` → BambooYellow; `panda` → Panda; `snake` → Snake; `lizard` → Lizard; `spider_yellow` → SpiderYellow; `mole` → Mole; `skull` → Skull; `spirit` → Spirit; `owl2` → Owl2; `kappa_green` → KappaGreen; `mollusc` → Mollusc; `octopus` → Octopus. Đây là quy ước cấu hình; chưa có code ánh xạ sprite, AI hay cơ chế di chuyển dưới nước.

Object Layer `monster_spawns` được xuất thành mảng `monsterSpawns` trong cả hai file generated. Mỗi object cần `zoneId`, `monsterType` kiểu string; `maxAlive` là số nguyên dương; `respawnSeconds`, `aggroRadius`, `leashRadius` là số nguyên không âm. Không cần đặt Class. Mỗi vùng xuất kèm `objectId` từ Tiled để giữ riêng từng object; mã `zoneId` trùng sẽ có cảnh báo, không gộp hoặc loại vùng. Nên sửa mã trùng trực tiếp trong Tiled.

`geometry` của hình chữ nhật có `type: rectangle` và `x`, `y`, `width`, `height`. Polygon có `type: polygon` và `points` chứa tọa độ tuyệt đối của các đỉnh. Toàn bộ geometry được đổi từ pixel sang đơn vị ô, giữ phần thập phân, không làm tròn; bán kính cũng tính bằng ô, thời gian tính bằng giây. Hiện hỗ trợ hình chữ nhật/polygon không xoay và layer không offset. File Tiled gốc không bị sửa. Đây chỉ là cấu hình xuất ra; chưa có logic server sinh quái, AI hoặc hồi sinh.
