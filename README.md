# BrowserQuest — Java server / TypeScript client

Bài tập lớn Lập trình mạng, **phát triển dựa trên BrowserQuest** của Mozilla / Little Workshop. Giữ bản đồ, hình ảnh, âm thanh, giao diện và cơ chế nền; thay server Node.js bằng Java và chuyển client dần sang TypeScript.

**Đây là bản chuyển đổi từng phần, chưa phải port hoàn chỉnh.** Lớp mạng, Config và Timer đã dùng TypeScript strict; renderer, tìm đường, nhân vật và phần lớn game/UI vẫn là JavaScript gốc. Server Java đã có luồng multiplayer và chiến đấu cơ bản, chưa tương đương toàn bộ server gốc. Xem [trạng thái và lộ trình](docs/migration.md).

## Chạy local trên Windows

Cần JDK 17+, Node.js 22.12+. Lần cài đầu cần Internet. Đặt JAVA_HOME tới JDK; script cũng nhận JDK 17 tại đường dẫn Oracle thông dụng.

Terminal 1:

```powershell
cd D:\Workspace\Projects\btl_ltm\source\server
.\run.ps1
```

Server đọc bản đồ BrowserQuest 172 × 314 và phục vụ tại ws://127.0.0.1:8080/. Script tải JAR từ Maven Central và biên dịch Java. Có Maven thì có thể dùng `mvn compile exec:java` trong source/server.

Terminal 2:

```powershell
cd D:\Workspace\Projects\btl_ltm\source\client
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ Local Vite in ra, thường http://127.0.0.1:5173, trong hai tab rồi nhập tên. **Bấm chuột trên bản đồ để di chuyển/tương tác như BrowserQuest gốc**; Enter mở chat. Bản này không dùng WASD của prototype cũ.

TypeScript được biên dịch thành AMD trong public/js khi chạy dev/build. Khi sửa TypeScript, khởi động lại dev hoặc chạy `npm.cmd run dev:types` trong terminal khác để theo dõi thay đổi.

Đổi cổng server: `.\run.ps1 -Port 8081`; client dùng query `?server=ws%3A%2F%2F127.0.0.1%3A8081%2F`. Mặc định chỉ chạy local. Chưa cấu hình phát hành Internet/TLS.

## Kiểm tra

```powershell
# source/server
.\run.ps1 -BuildOnly

# source/client
npm.cmd run build
# Cần Java server đang chạy; thực thi cả module GameClient đã compile
npm.cmd run test:network
```

Test mạng kiểm tra handshake, LIST/WHO/SPAWN từ bản đồ gốc, hai người chơi, MOVE, CHAT, sát thương, disconnect và dữ liệu sai. Không thay thế kiểm tra trình duyệt về render, animation, âm thanh hoặc trải nghiệm chiến đấu.

## Cấu trúc

```text
btl_ltm/
├── INSTRUCTION.md          # Giữ nguyên
├── LICENSE-BrowserQuest    # LICENSE từ nguồn
├── NOTICE.md               # Credits, nguồn gốc và các thay đổi
├── docs/                   # Phạm vi, kiến trúc, giao thức, lộ trình port
└── source/
    ├── client/
    │   ├── src/            # Các module đã chuyển TypeScript
    │   ├── public/         # Tài nguyên và module JS chưa chuyển
    │   └── tests/          # Tích hợp TS → Java qua WebSocket thật
    ├── server/
    │   ├── src/main/java/  # Server Java
    │   └── maps/           # Bản đồ và chỉ số từ baseline
    └── prototype-v1/       # Lưu bản Phaser trước khi đổi hướng; không chạy mặc định
```

- [Phạm vi](docs/scope.md)
- [Kiến trúc](docs/architecture.md)
- [Giao thức](docs/protocol.md)
- [Lộ trình chuyển đổi](docs/migration.md)
- [Nguồn gốc, giấy phép và credits](NOTICE.md)

Thư mục nguồn BrowserQuest chỉ đọc và được giữ nguyên; không đọc design. Tên nhóm, thành viên, MSSV và thời hạn chưa được cung cấp.

## Tham khảo

[BrowserQuest](https://github.com/mozilla/BrowserQuest), [Java-WebSocket](https://github.com/TooTallNate/Java-WebSocket), [Gson](https://github.com/google/gson), [TypeScript AMD modules](https://www.typescriptlang.org/tsconfig/module.html).
