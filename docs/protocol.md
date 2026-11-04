# Giao thức BrowserQuest tương thích — bước chuyển đổi 1

Thay thế giao thức object JOIN/MOVE của prototype. Endpoint local ws://127.0.0.1:8080/; Java cũng nhận /game. Server mở đầu bằng text go. Sau đó message là JSON array; client TS nhận được cả một action và batch nhiều action.

Mã số kế thừa shared/js/gametypes.js của BrowserQuest.

## Client → Java

| Mã | Tên | Dạng |
| --- | --- | --- |
| 0 | HELLO | [0, name, armorKind, weaponKind] |
| 4 | MOVE | [4, destinationX, destinationY] |
| 5 | LOOTMOVE | [5, destinationX, destinationY, itemId] |
| 6 | AGGRO | [6, mobId] |
| 7 | ATTACK | [7, mobId] |
| 8 | HIT | [8, mobId] |
| 9 | HURT | [9, mobId], nhận để tương thích; tick Java quyết định sát thương |
| 11 | CHAT | [11, text] |
| 12 | LOOT | [12, itemId] |
| 15 | TELEPORT | [15, destinationX, destinationY], phải là cửa hợp lệ |
| 20 | WHO | [20, ...entityIds] |
| 21 | ZONE | [21] |
| 25 | OPEN | [25, chestId] |
| 26 | CHECK | [26, checkpointId] |

HELLO lần đầu tạo player; HELLO sau khi chết hồi sinh phiên hiện tại. Fresh session không khôi phục gear chỉ dựa vào browser. Tên trim, tối đa 15 đơn vị UTF-16, bỏ ký tự điều khiển và dấu ngoặc HTML. Chat tối đa 60, giới hạn tối thiểu 500 ms, escape HTML.

## Java → client

| Mã | Tên | Dạng |
| --- | --- | --- |
| 1 | WELCOME | [1, id, name, x, y, maxHP] |
| 2 | SPAWN | [2, id, kind, x, y, ...state] |
| 3 | DESPAWN | [3, id] |
| 4 | MOVE | [4, id, destinationX, destinationY] |
| 5 | LOOTMOVE | [5, playerId, itemId] |
| 7 | ATTACK | [7, attackerId, targetId] |
| 10 | HEALTH | [10, hp, regenFlag?] |
| 11 | CHAT | [11, playerId, escapedText] |
| 13 | EQUIP | [13, playerId, itemKind] |
| 14 | DROP | [14, mobId, itemId, kind, involvedPlayerIds] |
| 15 | TELEPORT | [15, id, x, y] |
| 16 | DAMAGE | [16, mobId, points] |
| 17 | POPULATION | [17, worldCount, totalCount] |
| 18 | KILL | [18, mobKind] |
| 19 | LIST | [19, ...entityIds] |
| 23 | HP | [23, maxHP] |

State SPAWN player: name, orientation, armorKind, weaponKind, targetId tùy chọn. Mob: orientation, targetId tùy chọn. NPC/item/chest không có state phụ.

TypeScript còn giải mã DESTROY=22 và BLINK=24 để giữ callback API gốc; Java chưa phát đầy đủ các lifecycle này. BISON và dispatcher không được hỗ trợ trong bản port.

Gói JSON/hành động sai đóng 1008; gói quá 4096 đơn vị UTF-16 đóng 1009 sau khi transport ghép message. World đầy đóng 1013. Không còn ERROR object của prototype. Chưa có kiểm soát toàn bộ schema/tần suất transport.

Tọa độ là ô của bản đồ gốc; tile hiển thị 16 pixel ở scale 1, bản đồ 172 × 314. ID là số do server cấp, không phải UUID prototype.
