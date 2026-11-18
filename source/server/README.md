# Chạy Java game server

Xem [giải thích luồng hoạt động WebSocket](../../docs/websocket-flow.md) để hiểu
thứ tự sự kiện, trao đổi JSON, Ping/Pong và dọn phiên người chơi.

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

Server đọc collision và spawn trong `src/main/resources/maps/world.generated.json`. Khởi động lại sau khi cập nhật map. Tọa độ mạng dùng pixel thế giới, 16 px/ô. MOVE chỉ chấp nhận một bước ngang/dọc, tối đa một bước mỗi 120ms và từ chối ô chặn/ngoài biên. Người chơi hiện có thể đi xuyên nhau; chỉ spawn tránh trùng ô.

Có thể kiểm tra end-to-end trên server thử nghiệm riêng cổng 8081 (không có người chơi khác): `node statics/map-design/check_world_socket.mjs ws://localhost:8081` từ gốc repo. Yêu cầu Node.js có WebSocket toàn cục. Script kiểm tra spawn từ map, đi đến gần vật cản, bước bị chặn và bước hợp lệ tiếp theo.
