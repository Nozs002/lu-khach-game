# Lữ khách — Game web multiplayer 2D

Dự án bài tập lớn Lập trình mạng. Nhóm tự xây game tương tự BrowserQuest trong 10 ngày với 4 người làm song song.

## Trạng thái hiện tại

Đang triển khai client TypeScript/Vite và server Java/WebSocket. Client có click-to-move với A*; server kiểm tra đường đi và cập nhật vị trí theo từng ô. Map runtime thật chưa được thêm; server cần `source/server/src/main/resources/maps/world-map.json` để chạy gameplay.

## Tài liệu hiện hành

- [Hệ thống map](docs/world-maps.md): đề xuất làng nghỉ và các vùng khám phá nối tiếp, bố cục, NPC, quái và nội dung bảng tin; chưa triển khai.
- [Cốt truyện cơ bản và map](docs/story-and-map.md): bản đề xuất mới ngày 13/11/2026, tham khảo cấu trúc BrowserQuest; độc lập với Miền Quên, hiện chỉ viết tài liệu.
- [Giao thức v1 và chia dọc đã chốt](docs/protocol-v1.md): phân công mỗi người làm cả client/server, schema, JSON mẫu và cách ghép module. Ưu tiên tài liệu này khi phân công/giao thức khác bản thiết kế và lịch cũ.
- [Thiết kế game v0.1](docs/game-design.md): gameplay, luật chơi, giao diện, kiến trúc, dữ liệu, giao thức và nghiệm thu.
- [Kế hoạch 10 ngày](docs/plan-10-days.md): phân công P1–P4, lịch thực hiện và các mốc tích hợp.

Các tài liệu architecture.md, protocol.md, scope.md và migration.md cũ trong docs được giữ làm lịch sử; không mô tả trạng thái code hiện tại. NOTICE.md và LICENSE-BrowserQuest giữ thông tin nguồn gốc của bản port trước đây.

## Chạy và kiểm tra

Yêu cầu JDK 17+, Maven và Node.js.

```powershell
cd source\server
mvn compile exec:java
```

Trong terminal khác:

```powershell
cd source\client
npm run dev
npm test
```

## Cấu trúc hiện tại

```text
btl_ltm/
├── README.md
├── INSTRUCTION.md       # Giữ nguyên yêu cầu giảng viên
├── docs/                # Thiết kế, kế hoạch và tài liệu lịch sử
├── statics/             # Sơ đồ/hình ảnh phục vụ báo cáo
└── source/
    ├── client/          # TypeScript, Vite, Canvas 2D
    └── server/          # Java, Java-WebSocket, Gson
```

Thư mục BrowserQuest nguồn bên ngoài dự án giữ nguyên, chỉ dùng tham khảo và không đọc design. Tên nhóm, thành viên và ngày bắt đầu triển khai chưa chốt.
