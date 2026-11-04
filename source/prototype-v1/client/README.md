# Web game client

Phaser 3 + TypeScript + Vite. Khuyến nghị Node 22.12+.

```powershell
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ Local trong hai tab, nhập tên và vào game. WASD/phím mũi tên để đi, Enter để nhập chat. Server cần chạy riêng trước.

`npm.cmd run build` kiểm tra TypeScript và tạo dist/. `npm.cmd run test:network` kiểm thử mạng với server ws://127.0.0.1:8080/game; đặt GAME_SERVER_URL để đổi endpoint.

Xem [README gốc](../../README.md) và [giao thức](../../docs/protocol.md). Nhân vật đang vẽ bằng hình khối để kiểm chứng mạng.
