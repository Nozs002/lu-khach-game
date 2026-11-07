# Lữ khách — Game web multiplayer 2D

Dự án bài tập lớn Lập trình mạng. Nhóm tự xây game tương tự BrowserQuest trong 10 ngày với 4 người làm song song.

## Trạng thái hiện tại

Đang thiết kế, chưa bắt đầu triển khai game mới. Ngày 07/11/2026 đã xóa mã nguồn game cũ, bản port BrowserQuest, prototype Phaser, tài nguyên đi kèm và các thư mục thư viện/build. Hiện chưa có lệnh chạy game.

## Tài liệu hiện hành

- [Thiết kế game v0.1](docs/game-design.md): gameplay, luật chơi, giao diện, kiến trúc, dữ liệu, giao thức và nghiệm thu.
- [Kế hoạch 10 ngày](docs/plan-10-days.md): phân công P1–P4, lịch thực hiện và các mốc tích hợp.

Các tài liệu architecture.md, protocol.md, scope.md và migration.md cũ trong docs được giữ làm lịch sử; không mô tả trạng thái code hiện tại. NOTICE.md và LICENSE-BrowserQuest giữ thông tin nguồn gốc của bản port trước đây.

## Công nghệ dự kiến

- Client: TypeScript, HTML5 Canvas 2D, HTML/CSS, Vite.
- Server: Java 17+, Java-WebSocket, Gson.
- Giao tiếp: WebSocket, JSON; server quyết định trạng thái gameplay.
- Dữ liệu: RAM cho phiên chơi; JSON cho bản đồ và cấu hình; chưa có database.

## Cấu trúc chuẩn bị

```text
btl_ltm/
├── README.md
├── INSTRUCTION.md       # Giữ nguyên yêu cầu giảng viên
├── docs/                # Thiết kế, kế hoạch và tài liệu lịch sử
├── statics/             # Sơ đồ/hình ảnh phục vụ báo cáo
└── source/
    ├── client/          # Chưa triển khai client mới
    └── server/          # Chưa triển khai server mới
```

Thư mục BrowserQuest nguồn bên ngoài dự án giữ nguyên, chỉ dùng tham khảo và không đọc design. Tên nhóm, thành viên và ngày bắt đầu triển khai chưa chốt.
