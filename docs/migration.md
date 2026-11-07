# Lộ trình chuyển BrowserQuest sang Java và TypeScript

> Lộ trình này được thay thế ngày 07/11/2026 bởi [kế hoạch tự xây game trong 10 ngày](plan-10-days.md). Nội dung dưới đây là lộ trình cũ để tham khảo, không còn là mục tiêu triển khai hiện hành.

## Quyết định mới

Phát triển trực tiếp trên nền BrowserQuest, sử dụng bản đồ, tài nguyên, renderer, tìm đường và cơ chế của game. Thay server Node.js bằng Java, chuyển client dần sang TypeScript. Không tiếp tục phát triển game Phaser độc lập.

Repo BrowserQuest local chỉ đọc. Mọi thay đổi được thực hiện trên bản sao trong btl_ltm; bỏ qua design. Prototype cũ được lưu riêng tại source/prototype-v1.

## Trạng thái chuyển đổi

| Thành phần | Hiện tại | Công việc còn lại |
| --- | --- | --- |
| Tài nguyên/bản đồ/giao diện | Nhập từ baseline BrowserQuest | Giữ nguồn gốc và ghi nhận thay đổi khi chỉnh asset |
| GameClient | Port TypeScript strict, giữ AMD callbacks | Bổ sung kiểm thử các callback chiến đấu/vật phẩm nâng cao |
| Config, Timer | TypeScript | Tiếp tục bỏ globals khi đổi các module phụ thuộc |
| Renderer, map, pathfinder, entity, game, app | JavaScript gốc được giữ để game tiếp tục chạy | Port từng module sang TS có kiểu; chưa đổi đuôi file hàng loạt |
| Server | Java; handshake, LIST/WHO/SPAWN, move, chat, NPC/mob/item/chest data, sát thương cơ bản | Đạt parity với zoning, AI, hate list, chest area, hồi sinh và vật phẩm đặc biệt của Node |
| Giao thức | Giữ mã số và JSON array BrowserQuest | Đặc tả/check schema dùng chung cho Java và TS |

## Mốc 1 — nền tương thích

Đã có baseline, giấy phép/credits, lớp mạng TS và Java server đọc bản đồ gốc. Test tích hợp chạy module TS đã biên dịch với Java thật: HELLO/WELCOME, LIST/WHO/SPAWN, hai người chơi, MOVE, CHAT escape, sát thương, disconnect và từ chối gói sai.

Cần kiểm tra trực tiếp trên hai tab để xác nhận UI, pathfinding, animation, âm thanh và chiến đấu trong trình duyệt. Kiểm thử mạng không thay thế kiểm thử trải nghiệm game.

## Mốc 2 — chuyển client

Thứ tự: shared types/protocol → entity/character/player/item/mob → map/pathfinder → animation/sprite/renderer → updater/game → app/UI/storage/audio. Mỗi module phải giữ hành vi baseline, biên dịch strict và có kiểm tra liên quan trước khi thay bản JavaScript. Module chưa chuyển ở public/js; module đã chuyển ở src, đầu ra JS được sinh khi dev/build.

## Mốc 3 — hoàn thiện server

Đối chiếu từng handler và timer của Node gốc: phạm vi vùng, đồng bộ danh sách, quái tuần tra/truy đuổi/đổi mục tiêu, hồi sinh, drop/despawn, chest areas, checkpoint và firepotion. Ghi lại hành vi cần giữ và hành vi chủ động thay đổi. Chưa tuyên bố Java server tương đương toàn bộ BrowserQuest.

## Mốc 4 — xác thực và nghiệm thu

Kiểm soát vận tốc theo tick thay vì tin vị trí đích, xử lý xung đột loot, giới hạn kết nối/tần suất, kiểm thử nhiều máy và đo độ trễ. Hoàn thiện README, thông tin nhóm và báo cáo demo.
