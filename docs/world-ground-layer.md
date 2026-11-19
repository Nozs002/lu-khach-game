> Bản thiết kế lịch sử. Ảnh phác và bộ dựng cũ đã được dọn; map đang chạy lấy từ `source/common/maps/world.tmj`.

# Lớp nền thế giới — ground

Kích thước 172 cột × 314 hàng, 54.008 ô; gốc trên trái, `ground[y][x]`, tile logic 24 px. Chỉ chứa hình nền, không có nhà, NPC, mái/tán cây, collision hoặc điểm spawn. Nước trong ground chưa quyết định đi được/bơi được; luật đó thuộc collision và gameplay.

## Nguồn dữ liệu

`source/common/maps/world-ground.json` là ma trận ID tile nền có thể sửa trực tiếp. `source/common/maps/world-ground-tileset.json` ánh xạ ID sang source rectangle trong `source/client/public/assets/maps/world-ground-tiles.png`. ID 0 dành cho ô không vẽ, hiện toàn bộ nền đều được phủ bởi ID 1–10.

| ID | Loại nền |
| --- | --- |
| 1 | Cỏ |
| 2 | Nền rừng |
| 3 | Đường đất |
| 4 | Đá lát |
| 5 | Cát bờ biển |
| 6 | Cát sa mạc |
| 7 | Đất khô chuyển tiếp |
| 8 | Nước |
| 9 | Nước sâu |
| 10 | Nước nông |

Các ID thuộc tileset `world-ground`, không dùng lẫn với mã gameplay của `m0-layout.json` v1. Ví dụ ID 3 ở đây là đường đất, không phải quán trọ. Các khu M0/M1 ở phía nam, M2 đông nam, M3 phía bắc M2, M5 miền trung, M6 bờ tây và M7 miền bắc. M4 là nội thất riêng, không tạo nền hang bên trong ground ngoài trời.


## Dựng và vẽ

Chạy `python statics/map-design/build_ground_layer.py` để kiểm tra ma trận, dựng atlas và preview. Nếu ma trận đã tồn tại script **không ghi đè** chỉnh sửa trong ma trận. `--initialize` là tùy chọn chủ động tạo lại bố cục ban đầu, thay thế chỉnh sửa; không dùng khi chỉ muốn dựng ảnh.

`worldGround.ts` cung cấp dữ liệu và `getGroundTile(x,y)`; ô ngoài biên/tọa độ không nguyên trả undefined. `GroundLayerRenderer.ts` có `drawGroundLayer(ctx,cameraX,cameraY,viewportWidth,viewportHeight)`, chỉ duyệt các ô trong viewport, cắt biên khung vẽ, tính source rectangle từ tile ID và tắt smoothing. Camera nhận world pixel. Đã nối hàm này vào CanvasRenderer: màn chơi vẽ trực tiếp ground của thế giới thay nền/công trình v1. Canvas giữ 768 × 576, viewport 32 × 24 ô; camera mặc định tại (12,258) theo tọa độ ô của M0. Mục “Xem nền” chọn camera M0/M1/M2/M3/M5/M6/M7, không dịch chuyển nhân vật. M4 không có trong lựa chọn vì là nội thất riêng. Server vẫn gửi tọa độ pixel cục bộ M0; renderer tạm cộng offset M0 để chuyển sang tọa độ thế giới rồi trừ camera. Chưa đổi giao thức hoặc tọa độ server.

Tile cỏ/đất lấy từ Ninja Adventure; nền rừng là biến thể giảm sáng của cỏ; tile đá/cát/đất khô/nước vẽ bằng mã làm mẫu. Chưa autotile mép bờ/đường, animation nước hoặc art cuối. Khu vực cầu tương lai hiện vẫn có nền nước: cầu thuộc lớp objects, không biến nước thành đất trong ground.

Đã kiểm tra kích thước, ID hợp lệ, viewport culling, camera lệch một phần ô và xử lý ngoài biên; build TypeScript/Vite đã qua. Chưa có kiểm thử di chuyển hoặc đường đi vì collision/A* chưa triển khai trong v2.
