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

Server nạp map từ `src/main/resources/maps/world-map.json`. Hiện chưa có map
runtime trong repo; server sẽ báo lỗi rõ ràng lúc khởi động cho đến khi file này
được cung cấp. Map cần có `id`, `width`, `height`, `tileSize`, ma trận `tiles`,
`safeZone` và `playerSpawns`. `tiles` phải có `height` hàng, mỗi hàng có
`width` số nguyên không âm. Chỉ `tiles[y][x] == 0` là đi được; mọi giá trị khác
`0` là vật cản, kể cả các ô biên. Sau khi thêm map thật, không cần sửa thuật
toán A* hoặc bộ xử lý di chuyển.

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
