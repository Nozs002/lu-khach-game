# Chạy Client Web (Lữ Khách — TypeScript + Canvas 2D)

## Yêu cầu

- Node.js 18+ và npm

## Cài đặt & Chạy phát triển (Vite)

Từ thư mục gốc của dự án:

```powershell
cd source\client
npm install
npm run dev
```

Sau đó mở trình duyệt tại địa chỉ Vite hiển thị (mặc định `http://localhost:5173`).

## Hai chế độ chạy & kiểm thử

1. **Kết nối Server Java thật (`VÀO GAME - KẾT NỐI SERVER 8080`)**:
   - Chạy Server Java ở `source/server` trước (`mvn compile exec:java`), sau đó bấm **VÀO GAME**.
   - Có thể mở 2–4 tab trình duyệt cùng lúc để kiểm thử:
     - **Chat thời gian thực (`CHAT`)**: Nhấn `Enter` để mở ô chat, `Enter` lần nữa để gửi, `Esc` để đóng; chống XSS bằng `textContent` và hiện bong bóng chat trên đầu nhân vật.
     - **Nhặt một lần (`LOOT` - AC06/AC07)**: Click vào bình máu (hoặc nhấn phím `E`) để tiếp cận và nhặt (`+30 HP`, tối đa `100 HP`; nếu đầy máu trả `HP_FULL` và giữ lại bình máu; 2 người cùng nhặt chỉ 1 người nhận được).
     - **Màn hình chết & Hồi sinh (`RESPAWN` - AC08)**: Khi hết máu (`0 HP`), hiện màn hình chết đếm ngược 3 giây (`30 ticks`), khóa di chuyển/đánh/nhặt đồ (nhưng vẫn chat được), sau 3 giây bật nút **Hồi sinh** đưa nhân vật về Khu an toàn với `100/100 HP`.

2. **Chế độ Dữ liệu giả định (`CHƠI THỬ VỚI DỮ LIỆU GIẢ ĐỊNH - KHÔNG CẦN CHỜ`)**:
   - Nạp trực tiếp dữ liệu giả định (Fixtures theo Mục 6–8 `docs/protocol-v1.md`: bản đồ `32x24`, Khu an toàn, 5 quái Slime, 2 bình máu mẫu) để chạy và kiểm thử độc lập toàn bộ Phần 4 ngay cả khi chưa bật Server Java hoặc chưa ghép code với các thành viên khác.

## Cấu trúc mã nguồn Client

```text
source/client/
├── index.html                                  # Giao diện đăng nhập, Canvas 32x24, Khung Chat, Màn hình chết, Bảng test Phần 4
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts                                 # Điểm vào: gắn kết UI, Input, Renderer và LootRespawnFeature
    ├── style.css                               # Giao diện Pixel-Art
    ├── types/
    │   └── protocol.ts                         # Kiểu dữ liệu TypeScript cho Giao thức v1
    ├── mock/
    │   └── fixtures.ts                         # Dữ liệu giả định (Fixtures) theo docs/protocol-v1.md
    ├── network/
    │   └── WebSocketClient.ts                  # Giao tiếp WebSocket v1 + bộ mô phỏng Fixture Mode
    ├── render/
    │   └── CanvasRenderer.ts                   # Vẽ bản đồ, SafeZone, Slime, Bình máu, Nhân vật (sống/chết), Bong bóng Chat
    └── features/
        └── loot-respawn/
            └── LootRespawnFeature.ts           # [PHẦN 4] Logic & UI Chat, Nhặt bình máu (pendingLootId), Màn hình chết & Hồi sinh
```
