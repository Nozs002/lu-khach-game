# Nguồn gốc BrowserQuest

Dự án này phát triển dựa trên **BrowserQuest** của Mozilla / Little Workshop, do **Franck Lecollinet** và **Guillaume Lecollinet** tạo ra.

- Upstream: https://github.com/mozilla/BrowserQuest
- Baseline nhập từ thư mục local `D:\Workspace\Projects\BrowserQuest-master`. Thư mục local đã có một số thay đổi so với upstream; không giả định đây là một commit upstream nguyên bản.
- Mã nguồn gốc: Mozilla Public License 2.0, theo LICENSE đi kèm repo.
- Nội dung/tài nguyên: CC-BY-SA 3.0, theo LICENSE đi kèm repo.
- [LICENSE gốc được giữ lại](LICENSE-BrowserQuest).

## Phần kế thừa

- `source/client/public/`: client AMD JavaScript, bản đồ, sprite, hình ảnh, CSS, font và âm thanh của baseline local. Không nhập node_modules hoặc thư mục design.
- `source/client/index.html`: giao diện gốc, thay tiêu đề và mô tả stack.
- `source/client/public/shared/js/gametypes.js`: hằng số/thông điệp gốc cho client chưa chuyển.
- `source/server/maps/world_server.json`: bản đồ server gốc.
- `source/server/maps/mob-properties.json`: chỉ số và bảng rơi đồ trích xuất từ server/js/properties.js.

## Phần chuyển đổi và thay đổi

- `source/client/src/gameclient.ts`: port lớp mạng gốc sang TypeScript strict, giữ API callback AMD; bỏ BISON, dispatcher và hỗ trợ WebSocket cũ.
- `source/client/src/config.ts`: cấu hình local Java server; `timer.ts`: port Timer.
- `source/client/public/js/game.js`: bổ sung đồng bộ ô dừng trước khi kiểm tra cận chiến ở Java.
- `source/server/src/main/java/`: port bước đầu các trạng thái thực thể, bản đồ, giao thức và logic world sang Java. Chưa đạt đầy đủ tính tương đương server Node gốc.
- `source/prototype-v1/`: bản thử nghiệm Phaser trước khi đổi hướng, không phải nền BrowserQuest mới và không chạy mặc định.

## Dấu vết baseline

SHA-256 trước khi chỉnh sửa bản sao:

| File nguồn | SHA-256 |
| --- | --- |
| server/maps/world_server.json | 1EF475C4284F93763DBA87AD352BFD60C25B60B229C345205AB52367E4578445 |
| client/index.html | 6A205972CD9476246185A09660CD8D085F2A853F63C81CB25956B8BC1112748F |

Thư mục nguồn BrowserQuest giữ nguyên; không đọc thư mục design trong quá trình nhập và chuyển đổi.
