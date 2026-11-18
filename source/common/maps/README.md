# Map Tiled đang chạy

`world.tmj` là nguồn map runtime hiện tại. Giữ nguyên ảnh tileset trong `tilesets/`.

Từ gốc repo chạy:

```powershell
python statics/map-design/import_tiled_world.py
```

Lệnh này xuất `source/client/src/data/world.generated.json`, sao chép ảnh vào public/assets/maps/tiled và xuất `source/server/src/main/resources/maps/world.generated.json`. Không sửa tay file generated. Client tự chạy import trước `npm run dev` / `npm run build`; sau khi sửa map khi dev đang chạy cần chạy lại import. Build/khởi động lại server để cập nhật collision và spawn.

Các lớp hình ảnh được giữ nguyên dữ liệu GID, hướng lật, thứ tự, độ trong suốt và trạng thái hiển thị. Lớp `collision` không vẽ: ô có tile là bị chặn, ô trống là đi được. Không tự suy va chạm từ hình cây, nhà, nước. Vì vậy các vị trí chưa đánh collision trong Tiled vẫn đi được.

Object có type/class `spawn` trong lớp entities xác định điểm vào. Tọa độ pixel Tiled được lấy ô chứa điểm bằng floor(x/16), floor(y/16). Spawn hiện tại là ô (53,233). Server dùng tọa độ pixel thế giới; người vào tiếp theo được chọn ô trống gần điểm spawn, chỉ trong vùng liên thông đi được. Không thay đổi file Tiled.

Chạy thử client và server như README của từng phần. Di chuyển WASD/mũi tên từng ô, server kiểm tra collision và giới hạn nhịp 120ms/bước. Camera theo người chơi; bộ chọn vùng cho phép xem nơi khác, nhấn di chuyển để quay về. Chưa có A*, click để đi, NPC tương tác hay animation bước chân.

Kiểm tra importer: `python statics/map-design/test_import_tiled_world.py`.

---

## Tài liệu map cũ (không còn là runtime chính)

# Ma trận map M0

## Lớp nền v2 đang xây dựng

`world-ground.json` chứa lớp `layers.ground` cho thế giới 172 × 314 ô. Đây là ma trận ID tile hình ảnh, tách khỏi collision/entities. Bảng ID tại `world-ground-tileset.json`; chi tiết ở [world-ground-layer.md](../../../docs/world-ground-layer.md). Sửa ma trận rồi chạy `python statics/map-design/build_ground_layer.py` để kiểm tra/dựng ảnh. Script không ghi đè ma trận đã có trừ khi truyền `--initialize`. Lớp nền v2 chưa thay màn chơi M0 v1.

## Runtime M0 v1

**Trạng thái:** đây là định dạng v1 đang chạy. Thiết kế đích đã chốt là [map nhiều lớp v2](../../../docs/map-system-v2.md): ground, objects và foreground là ma trận tile ID; collision là ma trận 0/1; NPC/spawn/portal là danh sách entities có tọa độ. Chưa chuyển runtime; không áp dụng bảng mã số gộp bên dưới vào schema v2.

Sửa `m0-layout.json`: `matrix[y][x]` là nguồn bố cục duy nhất, `tileTypes` giải thích quy tắc của từng mã. Không sửa các lớp generated của client hoặc danh sách spawn generated của server.

| Mã | Nội dung |
| --- | --- |
| 0 | Ô trống quảng trường: đi được và được spawn |
| 1 | Biên chặn |
| 2 | Đường đất |
| 3 | Quán trọ |
| 4 | Cây |
| 5 | Đài phun nước |
| 6 | NPC hướng dẫn |
| 7 | Điểm spawn ưu tiên |
| 8 | Cỏ đi được, không dùng spawn đầu game |
| 9 | Lò rèn |
| 10 | Tạp hóa |
| 11 | Ghế |
| 12 | Bảng tin |
| 13–15 | Chủ quán trọ, thợ rèn, người bán đồ |
| 16 | Hành lang cổng đi được |
| 17 | Đường lát đá |
| 18 | Cổng đóng |

Các cụm ô 3/5/9/10 phải là hình chữ nhật; script tìm vị trí/kích thước từ cụm và vẽ một công trình cho mỗi cụm. Hai công trình cùng mã cần có khoảng cách, nếu chạm cạnh sẽ được coi là một cụm. Các loại cây/NPC/ghế/bảng tin là một thực thể cho mỗi ô mã tương ứng.

Sau khi sửa, chạy từ gốc repo:

```powershell
python statics/map-design/build_grid_map.py
```

Script cần Pillow và bộ Ninja Adventure cục bộ; có thể truyền `--assets "đường dẫn gốc bộ asset"`. Kết quả gồm atlas, các lớp vẽ/collision của client, tài nguyên spawn của server và ảnh preview. Client vẽ tile từ các lớp sinh ra này, không còn dùng tọa độ công trình cố định trong script.

Spawn: ưu tiên mã 7, sau đó các ô 0 còn trống. Hiện có 57 ô ứng viên, đủ cho giới hạn 50 người của server. Build lại client và server khi đóng gói; khởi động lại server sau khi đổi map. Chưa có A* hoặc xử lý di chuyển.
