# BrowserQuest client — chuyển dần sang TypeScript

Phần đã chuyển: src/gameclient.ts, config.ts và timer.ts (strict). Các module chưa chuyển và tài nguyên gốc ở public/. Giữ AMD/RequireJS để tương thích giữa các module.

```powershell
npm.cmd install
npm.cmd run dev
```

Node 22.12+, Java server chạy riêng. Mở địa chỉ Local trong hai tab. Click-to-move và tương tác theo BrowserQuest gốc; Enter để chat.

- npm.cmd run build: compile TypeScript rồi build tĩnh; cảnh báo script classic từ Vite là do giữ loader AMD, không phải đã chuyển tất cả sang ESM.
- npm.cmd run dev:types: compile lại khi sửa TypeScript.
- npm.cmd run test:network: compile GameClient, chạy module đó với Java thật qua WebSocket; đặt GAME_SERVER_URL để đổi endpoint.

Xem [README](../../README.md), [lộ trình](../../docs/migration.md), [credits/giấy phép](../../NOTICE.md). Chưa nghiệm thu trải nghiệm UI bằng test mạng.
