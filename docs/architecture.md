# Kiến trúc chuyển đổi BrowserQuest

```text
Web BrowserQuest
├── GameClient, Config, Timer: TypeScript → AMD JavaScript
├── Renderer/pathfinder/game/app/entity: legacy JavaScript đang chờ port
└── Asset/map/audio gốc
           │ WebSocket: go + JSON array
           ▼
Java GameServer
├── WorldMap: collision, checkpoint, doors từ world_server.json
├── Entity: player/mob/NPC/item/chest state
├── GameServer: message dispatch, visibility, combat và world tick
└── Gson + Java-WebSocket; dữ liệu trong RAM
```

Không dùng Phaser ở nền mới. Vite phục vụ local/build tĩnh; các tài nguyên legacy nằm trong public và được sao chép vào dist. TypeScript strict biên dịch module AMD, tương thích RequireJS đang có. Không đổi đuôi hàng loạt hoặc dùng ts-nocheck để giả lập việc port.

## Kết nối

Server gửi go; client trả HELLO; Java cấp ID số và WELCOME. LIST cung cấp ID thực thể lân cận; client gửi WHO để lấy SPAWN. Giữ API callback GameClient để game.js chưa chuyển tiếp tục hoạt động.

## Movement và combat

MOVE chứa **tọa độ đích đường đi**, như BrowserQuest gốc, không phải hướng đi của prototype. Client tìm đường và nội suy/animation. Java kiểm tra ô đích và đường đi khả dụng (tối đa Manhattan 64, tìm kiếm giới hạn); trạng thái server hiện đặt ở đích ngay. Chưa có xác thực vận tốc theo tick, nên chưa dùng cho phát hành public.

Bản sao game.js gửi thêm tọa độ thực tế khi dừng pathing và ATTACK sau đó, để Java kiểm tra khoảng cách cận chiến. Java tính sát thương bằng chỉ số mob nhập từ baseline, kiểm tra khoảng cách/hồi chiêu, cập nhật HP. HURT cũ vẫn được nhận để tương thích nhưng sát thương tới player do tick Java điều khiển.

World tick 500 ms xử lý truy đuổi đơn giản, sát thương và respawn; mỗi 2 giây cập nhật danh sách vùng và hồi máu. Phạm vi tạm là 56 × 24 ô quanh player, chưa tái tạo group/door adjacency của server Node. Callbacks và tick dùng chung monitor synchronized để tuần tự hóa thay đổi world.

## Giới hạn đã biết

- Chưa hoàn tất TypeScript cho renderer, world, entity và UI.
- Logic AI, vật phẩm đặc biệt, chest areas, respawn/drop và zoning chưa tương đương đầy đủ baseline.
- Client còn cập nhật đường đi/loot cục bộ; cần giải quyết từ chối hành động và xung đột loot.
- Chưa có login, persistence, resume, TLS, giới hạn tổng socket hoặc chống flood transport.
- Fresh session bắt đầu với gear cơ bản; không tin gear do browser gửi như save đã xác thực.
- Chat được escape tại ranh giới giao thức vì bubble renderer legacy dùng HTML; tên loại ký tự điều khiển và dấu ngoặc HTML.
- Tối đa 32 player đã HELLO, chưa kiểm thử tải 32 người.

Các giới hạn được theo dõi trong [lộ trình](migration.md). Kiểm thử mạng chạy GameClient TS đã compile trong môi trường Node với adapter DOM/entity tối thiểu; không kiểm thử renderer/browser bằng adapter này.
