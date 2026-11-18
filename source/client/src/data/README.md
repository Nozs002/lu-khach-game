# Dữ liệu cố định của client

- `characters.ts`: danh mục nhân vật; `avatarSource` cho chân dung, `spriteSource` cho sheet toàn thân, `spriteFrame` cho vùng frame đứng. Hàm tra cứu avatar và sprite tách riêng, ID không hợp lệ dùng Hiệp sĩ.
- `maps.ts`: định nghĩa bản đồ.
- `items.ts`: định nghĩa vật phẩm.
- `skills.ts`: định nghĩa kỹ năng.

Map M0 được khai báo trong `maps.ts`, nhập các lớp ô từ `m0.generated.json`. Dữ liệu nguồn là `source/common/maps/m0-layout.json`; dựng lại atlas và JSON bằng `python statics/map-design/build_grid_map.py` từ gốc repo. Không sửa trực tiếp file generated. `ground` là chỉ số tile nền; `objects` là cụm tile công trình/NPC; `collision` dùng 0 = đi được, 1 = bị chặn. `isWalkable` nhận tọa độ ô, không nhận pixel. Vật phẩm và kỹ năng vẫn để trống.
Chỉ khai báo dữ liệu và hàm tra cứu tại đây. Không xử lý DOM, WebSocket hay vòng lặp game.
Trạng thái thay đổi khi chơi như vị trí, máu, túi đồ và hồi chiêu không đặt trong thư mục này.

Nguồn M0 dùng ma trận số `matrix` và bảng `tileTypes`: 0 ô trống spawn, 1 biên, 2 đường đất, 3 quán trọ, 4 cây, 5 đài, 6 NPC, 7 spawn ưu tiên, 8 cỏ, 9 lò rèn, 10 tạp hóa, 11 ghế, 12 bảng tin, 13–15 NPC dịch vụ, 16 hành lang cổng, 17 đường đá, 18 cổng đóng. Công trình được tìm theo cụm ô cùng mã, không khai báo vị trí nhà lần hai. File spawn của server cũng được sinh từ nguồn này.
