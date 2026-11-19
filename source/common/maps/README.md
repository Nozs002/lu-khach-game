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
