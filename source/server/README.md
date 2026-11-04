# BrowserQuest Java server — bước chuyển đổi 1

JDK 17+, Java-WebSocket và Gson. Thay server Node, giữ WebSocket JSON array của BrowserQuest. Chạy `.\run.ps1`; chỉ compile với `.\run.ps1 -BuildOnly`. Có Maven thì dùng `mvn compile exec:java`.

Endpoint ws://127.0.0.1:8080/ (cũng nhận /game). Đổi cổng/bind bằng tham số Port/BindAddress của script. Bản đồ và chỉ số gốc ở maps/.

GameServer: handler/world tick; WorldMap: collision/checkpoint/door; Entity: state/spawn. Trạng thái trong RAM. AI, zoning, chest areas, vật phẩm đặc biệt và vòng đời spawn/drop còn cần đối chiếu server gốc.

Xem [kiến trúc](../../docs/architecture.md), [giao thức](../../docs/protocol.md), [lộ trình](../../docs/migration.md), [nguồn gốc](../../NOTICE.md).
