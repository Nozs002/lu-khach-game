# BTL Lập trình mạng — Game nhập vai 2D trên web

Tên làm việc: **Lữ khách**. Tự viết game lấy cảm hứng từ BrowserQuest; không sao chép mã nguồn hoặc tài nguyên tham khảo.

## Trạng thái

Mốc 1 có client Phaser + TypeScript và server Java + WebSocket: nhập tên, vào bản đồ, đồng bộ nhiều người chơi, di chuyển từng ô có vật cản, chat và xử lý rời game/kết nối lại. Đồ họa hình khối tạm thời. Chưa có quái, chiến đấu, tài khoản hoặc lưu tiến trình.

## Chạy trên Windows

Cần JDK 17+, Node.js 22.12+ (hoặc Node 20.19+). Lần cài đầu cần Internet. Đặt JAVA_HOME trỏ tới JDK; script cũng nhận JDK 17 ở đường dẫn Oracle thông dụng.

Terminal 1 — server:

```powershell
cd D:\Workspace\Projects\btl_ltm\source\server
.\run.ps1
```

Script tải JAR có phiên bản cố định từ Maven Central vào .deps/, biên dịch bằng javac và chạy tại ws://127.0.0.1:8080/game. Không cần Maven. Có Maven thì dùng `mvn compile exec:java` thay cho script.

Terminal 2 — client:

```powershell
cd D:\Workspace\Projects\btl_ltm\source\client
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ Local Vite in ra (thường http://127.0.0.1:5173) trong **hai tab**, nhập tên khác nhau và vào game. Dùng WASD/phím mũi tên để đi, Enter để nhập chat. Khi đang nhập liệu nhân vật không di chuyển; bấm nền trang để bỏ focus.

Đổi cổng server: `.\run.ps1 -Port 8081`; đổi endpoint client qua query `?server=ws%3A%2F%2F127.0.0.1%3A8081%2Fgame`.

Mặc định chạy local. Thử LAN: server dùng `-BindAddress 0.0.0.0`, client dùng `npm.cmd run dev -- --host 0.0.0.0`; mở IP máy server và cấu hình firewall khi cần. Chưa thiết lập triển khai Internet/TLS.

## Kiểm tra

```powershell
# Trong source/server
.\run.ps1 -BuildOnly

# Trong source/client
npm.cmd run build
# Cần server chạy; Node 22+ có sẵn WebSocket
npm.cmd run test:network
```

## Tài liệu và cấu trúc

- [Phạm vi và nghiệm thu](docs/scope.md)
- [Kiến trúc](docs/architecture.md)
- [Giao thức WebSocket v1](docs/protocol.md)

```text
btl_ltm/
├── INSTRUCTION.md       # Giữ nguyên yêu cầu giảng viên
├── docs/                # Phạm vi, kiến trúc, giao thức
├── statics/             # Tài nguyên dự án khi bổ sung
└── source/
    ├── client/          # Phaser, TypeScript, Vite; test mạng Node
    └── server/          # Java, pom.xml, run.ps1
```

## Thông tin nhóm

Chưa cung cấp tên nhóm, thành viên, MSSV và tên đề tài đăng ký chính thức; cần bổ sung trước khi nộp.

## Tham khảo

- [BrowserQuest](https://github.com/mozilla/BrowserQuest): tham khảo cách chia client/server. Thư mục tham khảo được giữ nguyên, không đọc design.
- [Java-WebSocket](https://github.com/TooTallNate/Java-WebSocket)
- [Gson](https://github.com/google/gson)
- [Phaser](https://docs.phaser.io/phaser/getting-started/installation)
