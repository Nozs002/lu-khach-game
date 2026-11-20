# Chạy Java game server

Xem [giải thích luồng hoạt động WebSocket](../../docs/websocket-flow.md) để hiểu
thứ tự sự kiện, trao đổi JSON và dọn phiên người chơi.

## Yêu cầu

- JDK 17 trở lên
- Maven 3.8 trở lên

## Chạy bằng PowerShell

Từ thư mục gốc của dự án, chạy:

```powershell
cd source\server
mvn compile exec:java
```

Server mặc định lắng nghe tại cổng `8080`, địa chỉ WebSocket là `ws://localhost:8080`.
Dừng server bằng `Ctrl+C`.

## Map runtime

Server nạp `src/main/resources/maps/world.generated.json`, được xuất từ `source/common/maps/world.tmj`. WorldMap ánh xạ collision sang tiles (0 đi được, 1 bị chặn) và spawns sang playerSpawns. Không tạo bản đồ thay thế. Nếu map chưa định nghĩa safeZone, metadata này chỉ bao các điểm spawn để tương thích contract client; chưa có luật chiến đấu vùng an toàn.

Trong prototype hiện tại, client gửi `{"type":"MOVE_TO","x":12,"y":8}`.
Server gửi map ở trường `map` của WELCOME và gửi vị trí ô trong
`STATE_UPDATE.payload`. Đây là luồng tương thích với giao thức prototype hiện
có, chưa phải toàn bộ phong bì có phiên bản của `docs/protocol-v1.md`.

Để chạy trên cổng khác, truyền cổng qua `exec.args`:

```powershell
mvn compile exec:java "-Dexec.args=8081"
```

Giá trị cổng phải là số nguyên từ `1` đến `65535`.

## Chạy từ IDE

Mở thư mục `source\server` như một dự án Maven, sau đó chạy `com.game.Main`.
Không cần truyền tham số để dùng cổng `8080`; có thể đặt một tham số như `8081`
trong cấu hình chạy để chọn cổng khác.

## Map Tiled và kiểm tra chạy thử

Trước khi build server, chạy từ gốc repo:

```powershell
python statics/map-design/import_tiled_world.py
```

Server đọc collision và spawn trong `src/main/resources/maps/world.generated.json`. Khởi động lại sau khi cập nhật map. Tọa độ mạng dùng ô thế giới, render 16 px/ô. MOVE_TO nhận ô đích, server tính A* bốn hướng và tiến một ô mỗi 200ms. Lệnh MOVE cũ không còn được hỗ trợ. Người chơi hiện có thể đi xuyên nhau; chỉ spawn tránh trùng ô.

Có thể kiểm tra end-to-end trên server thử nghiệm riêng cổng 8081 (không có người chơi khác): `node statics/map-design/check_world_socket.mjs ws://localhost:8081` từ gốc repo. Yêu cầu Node.js có WebSocket toàn cục. Script kiểm tra spawn từ map, đi đến gần vật cản, bước bị chặn và bước hợp lệ tiếp theo.

## Chỉ số nhân vật

Cấu hình gốc nằm tại `src/main/resources/config/characters.json`, dùng các ID `knight`, `hunter`, `fighter`, `lion`. Mỗi nhân vật có `maxHp` (số nguyên dương), `damage` và `armor` (số nguyên không âm). Sửa JSON rồi build/khởi động lại server để áp dụng cho người chơi vào sau. Cấu hình thiếu/sai làm server dừng khởi tạo thay vì phát chỉ số mặc định âm thầm.

| Nhân vật | Máu tối đa | Sát thương | Giáp |
| --- | --- | --- | --- |
| knight | 160 | 18 | 12 |
| hunter | 100 | 24 | 4 |
| fighter | 130 | 30 | 7 |
| lion | 145 | 26 | 8 |

Player mới bắt đầu với `hp = maxHp`. Các trường `hp`, `maxHp`, `damage`, `armor` được serialize trong từng player ở `WELCOME.payload[]`, `PLAYER_JOINED.payload` và `STATE_UPDATE.payload[]`. JOIN chỉ chọn `characterId`; client không quyết định chỉ số. ID lạ/rỗng dùng `knight` và server trả lại ID đã chuẩn hóa. Hệ thống chiến đấu dùng damage riêng từng nhân vật thay cho hằng số chung. Sát thương thực nhận = max(1, sát thương gốc - giáp), giới hạn theo HP còn lại; quái hiện có giáp 0. HP được cập nhật qua STATE_UPDATE và sự kiện DAMAGE chỉ phục vụ hiệu ứng trên client. Chưa lưu HP qua lần đăng nhập.

`com.game.model.CharacterStatsCheck` trong `src/test/java` chạy bằng Java với `-ea` và classpath có `src/main/resources`, kiểm tra cấu hình bốn nhân vật, gói WELCOME/JOINED/STATE và bỏ qua chỉ số client giả gửi. `WorldMapCheck` kiểm tra lại spawn/di chuyển.

## Tích hợp quái và chiến đấu

Nhánh quai đã được tích hợp cùng NPC, minimap và UUID local. Server sinh quái từ monsterSpawns, điều khiển AI/chiến đấu; click quái để nhân vật tự tìm đường đến ô kề và tấn công khi tới gần. Click đất hoặc nhấn Esc để dừng đánh. Người chơi hồi thụ động 10 HP/giây khi không còn quái đe dọa ở gần. Phần cấu hình nhân vật trong characters.json vẫn là nguồn chỉ số chính thức. Kiểm thử CombatTest có kiểm tra sát thương/giáp cho đủ bốn nhân vật; GameServerCombatTest kiểm tra WELCOME và di chuyển qua WebSocket thật.
