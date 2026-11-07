# Giao thức v1 và cách chia dọc

Chốt ngày 07/11/2026 theo yêu cầu của người dùng. Đây là hợp đồng để triển khai game mới, chưa phải mô tả code đã chạy. Tài liệu này được ưu tiên khi khác với phân công theo tầng trong plan-10-days.md và mục 12, 15, 17 của game-design.md. Luật gameplay còn lại theo game-design.md; protocol.md là lịch sử.

## 1. Mỗi người làm cả client và server

| Người | Tính năng xuyên suốt hai phía | Phần nền phụ trách thêm |
| --- | --- | --- |
| P1 | Vào game, rời game, chat, trạng thái kết nối | Một WebSocket/client, Java bootstrap, session, parser/router, command queue, tick, state store và ghép module |
| P2 | Bản đồ, vẽ thế giới, click di chuyển, tìm đường, collision và nội suy | Nạp map chuẩn, renderer chung và movement system |
| P3 | Quái, AI, chọn mục tiêu, đánh, HP, hiệu ứng damage và chết | Entity model dùng chung, combat system |
| P4 | Rơi bình máu, nhặt, hiển thị item, hồi máu, hồi sinh player và mob | Loot/respawn system, tổng hợp kịch bản demo |

P1–P4 là vai trò tạm để nhóm điền tên. Người sở hữu tính năng viết UI/input, command, handler server và kiểm tra tính năng của mình. P1 chỉ cung cấp nền dùng chung, không làm toàn bộ mạng thay nhóm. P3 báo sự kiện mob chết đúng một lần để P4 xử lý drop và lịch hồi sinh; P4 gọi API hồi sinh, không tự viết lại combat.

Mỗi phía có core/ và features/session/, features/movement/, features/combat/, features/loot-respawn/. P1 sở hữu core mạng/tick/store, P2 core render/map, P3 model entity; người khác mở rộng qua API, thống nhất trước khi sửa core. Mỗi module server đăng ký handler và system với bootstrap; không mở server/socket riêng.

## 2. Kết nối và phong bì chung

- WebSocket tại ws://127.0.0.1:8080/game khi chạy local; URL cấu hình một chỗ để đổi sang IP LAN.
- Một JSON object trong mỗi text message; UTF-8, v = 1. Không gửi batch hoặc JSON array.
- Client: {v, type, requestId, payload}. requestId là số nguyên dương an toàn trong JavaScript, tăng dần trên mỗi kết nối; kết nối mới bắt đầu lại từ 1.
- Server: {v, type, tick, payload}. tick là số nguyên không âm, tăng mỗi 100 ms (10 tick/giây), trong giới hạn số nguyên an toàn JavaScript.
- ACK/ERROR thêm requestId ở cấp ngoài payload; ERROR dùng null nếu không đọc được ID hợp lệ. WELCOME cũng thêm requestId của JOIN.
- Chỉ PING được gửi trước JOIN; JOIN đúng một lần/socket. Server lấy player từ session, client không gửi playerId để nhận diện người ra lệnh.
- Parser sai trả ERROR; message lớn hơn 4 KiB đóng kết nối ở lớp transport. Áp dụng giới hạn và timeout ở mục 13 game-design.md.
- requestId hợp lệ lớn hơn ID cuối thì được ghi nhận trước khi xử lý nghiệp vụ, kể cả khi nghiệp vụ bị từ chối. ID trùng/nhỏ hơn trả STALE_REQUEST, không chạy lại lệnh.

## 3. Lệnh và kết quả

Các trường payload trong bảng đều bắt buộc. null được dùng đúng nơi ghi rõ; không thay bằng chuỗi rỗng. Server bỏ qua trường dư, nhưng không ép chuỗi thành số hoặc chấp nhận sai kiểu trường bắt buộc.

| Chủ trì | type | payload client | Kết quả trực tiếp khi hợp lệ |
| --- | --- | --- | --- |
| P1 | JOIN | {name: string} | WELCOME cho socket vừa vào |
| P1 | CHAT | {text: string} | ACK và broadcast CHAT |
| P1 | PING | {nonce: string} | PONG chứa cùng nonce, tối đa 64 ký tự |
| P2 | MOVE_TO | {x: integer, y: integer} | ACK; vị trí thay đổi qua snapshot |
| P3 | ATTACK | {targetId: string hoặc null} | ACK; null để dừng đánh |
| P4 | LOOT | {itemId: string} | ACK sau khi nhặt thành công |
| P4 | RESPAWN | {} | ACK sau khi hồi sinh thành công |

Mỗi lệnh có đúng một kết quả trực tiếp: WELCOME, PONG, ACK hoặc ERROR. ACK nghĩa là handler chấp nhận lệnh, không đảm bảo đã tới đích hoặc gây sát thương. ACK payload = {commandType: string}; ERROR payload = {code: string, message: string}. Không gửi ACK thêm cho JOIN/PING.

Tên theo luật tên trong game-design.md; CHAT trim, 1–120 Unicode code point, một dòng, render bằng text. Tọa độ là ô nguyên, gốc trên trái, x sang phải/y xuống; không phải pixel. Server kiểm tra map, khoảng cách, tốc độ, HP và cooldown; client chỉ gửi ý định.

Mã lỗi dùng chung: INVALID_MESSAGE, UNSUPPORTED_VERSION, JOIN_REQUIRED, ALREADY_JOINED, WORLD_FULL, INVALID_NAME, INVALID_TARGET, BLOCKED_TILE, NO_PATH, PLAYER_DEAD, OUT_OF_RANGE, ITEM_UNAVAILABLE, HP_FULL, RESPAWN_NOT_READY, RATE_LIMITED, STALE_REQUEST. INVALID_MESSAGE bao gồm type không biết hoặc payload sai kiểu. message để giải thích; client phân nhánh theo code.

## 4. Dữ liệu chung

ID là string do server tạo: p-1, m-1, i-1; duy nhất trong vòng chạy server. ID player/item không tái sử dụng. Tất cả trường dưới đây bắt buộc; mảng rỗng dùng [], mục tiêu/thời điểm chưa có dùng null.

| Kiểu | Các trường |
| --- | --- |
| MapData gửi client | id: string, width: integer, height: integer, tileSize: integer, collisions: integer[], safeZone: {x,y,width,height} |
| Player | id, name: string; x,y,hp,maxHp: integer; state: IDLE/MOVING/ATTACKING/DEAD; targetId: string hoặc null; respawnReadyTick: integer hoặc null |
| Mob | id: string; kind: string; x,y,hp,maxHp: integer; state: IDLE/CHASE/ATTACK/RETURN/DEAD; targetId: string hoặc null; spawnGeneration: integer |
| Item | id: string; kind: HEALTH_POTION; x,y,expiresTick: integer |
| WorldState | players: Player[], mobs: Mob[], items: Item[] |

Map ban đầu 32 × 24 ô, tileSize = 24; collisions chứa index ô chặn = y * width + x. Spawn/home/config AI chỉ giữ ở server; không cần gửi trong MapData. Snapshot chỉ gửi tọa độ ô đã đạt; client nội suy hình ảnh, server giữ tiến độ di chuyển nội bộ.

## 5. Gói server gửi

| type | payload |
| --- | --- |
| WELCOME | {playerId: string, tickDurationMs: 100, map: MapData, state: WorldState} |
| WORLD_STATE | WorldState |
| CHAT | {playerId: string, name: string, text: string} |
| DAMAGE | {attackerId: string, targetId: string, amount: integer} |
| ENTITY_SPAWN | {id: string, kind: PLAYER/MOB/ITEM, spawnGeneration: integer hoặc null} |
| ENTITY_DESPAWN | {id: string, reason: DEAD/LOOTED/EXPIRED/DISCONNECTED} |
| PONG | {nonce: string} |

kind trong ENTITY_SPAWN là nhóm entity; kind trong Mob là loại quái do config định nghĩa. spawnGeneration chỉ có giá trị với mob, còn lại null.

WELCOME gửi trước mọi event gameplay cho socket vừa JOIN và khởi tạo tick đã áp dụng. WORLD_STATE là toàn bộ world mỗi tick, chỉ gửi cho socket đã JOIN. Event hiệu ứng của tick gửi trước snapshot tương ứng, xử lý theo thứ tự nhận. Bỏ snapshot có tick nhỏ hơn hoặc bằng tick đã áp dụng; không dùng quy tắc này để bỏ event cùng tick.

State store chỉ thay danh sách/vị trí/HP từ WELCOME và WORLD_STATE. DAMAGE/SPAWN/DESPAWN chỉ phát hiệu ứng, không trừ HP hoặc xóa model lần nữa. Entity DEAD vẫn có thể còn trong snapshot; item nhặt và player rời game biến mất ở snapshot kế tiếp. Socket cũ không được cập nhật store của phiên mới. Disconnect tạo lại phiên mới khi vào lại, không resume.

## 6. Mẫu để hai phía thử ngay

Client vào game:

```json
{"v":1,"type":"JOIN","requestId":1,"payload":{"name":"An"}}
```

Server trả (map 4 × 4 chỉ dùng làm fixture thử parser):

```json
{"v":1,"type":"WELCOME","requestId":1,"tick":0,"payload":{"playerId":"p-1","tickDurationMs":100,"map":{"id":"test","width":4,"height":4,"tileSize":24,"collisions":[],"safeZone":{"x":0,"y":0,"width":1,"height":1}},"state":{"players":[{"id":"p-1","name":"An","x":0,"y":0,"hp":100,"maxHp":100,"state":"IDLE","targetId":null,"respawnReadyTick":null}],"mobs":[],"items":[]}}}
```

Client yêu cầu đi, server chấp nhận rồi cập nhật vị trí:

```json
{"v":1,"type":"MOVE_TO","requestId":2,"payload":{"x":1,"y":0}}
{"v":1,"type":"ACK","requestId":2,"tick":1,"payload":{"commandType":"MOVE_TO"}}
{"v":1,"type":"WORLD_STATE","tick":2,"payload":{"players":[{"id":"p-1","name":"An","x":1,"y":0,"hp":100,"maxHp":100,"state":"IDLE","targetId":null,"respawnReadyTick":null}],"mobs":[],"items":[]}}
```

Ví dụ từ chối ô ngoài map:

```json
{"v":1,"type":"ERROR","requestId":3,"tick":3,"payload":{"code":"INVALID_TARGET","message":"Ô đích nằm ngoài bản đồ"}}
```

## 7. Điểm ghép module

- Client chỉ dùng sendCommand(type, payload) của core; core cấp requestId và trả ID, không mỗi tính năng tự tăng ID. Module đăng ký onEvent(type, handler), đọc getState() và đăng ký lớp vẽ/input qua renderer P2. Chỉ core được ghi snapshot vào store.
- Server đăng ký registerCommand(type, handler) và registerSystem(name, update). Handler nhận player của session, payload, requestId và WorldContext; trả kết quả accept/reject, core gửi ACK/ERROR đúng một lần. JOIN/PING được core xử lý riêng.
- WorldContext cung cấp tick, map, getPlayer/getMob/getItem, add/remove entity và emit event; chỉ world thread được ghi state. WebSocket thread chỉ parse/kiểm tra transport và xếp queue.
- Thứ tự mỗi tick: xử lý command theo thứ tự queue → movement → AI/combat → drop/respawn/expiry → phát event → snapshot. Mọi module dùng cùng instance World, không tự giữ bản HP/entity riêng. Trong combat, chết chỉ chuyển trạng thái một lần; P4 nhận thông báo nội bộ để xử lý hậu quả.
- P1 tạo bootstrap và stub handler/system ngày 1. P2–P4 có thể làm với fixture/fake World; cuối ngày phải ghép vào cùng ứng dụng. Không cần chờ P1 hoàn thành toàn bộ UI.

## 8. Quy tắc thay đổi và việc làm ngay

Khung trên được chốt để bắt đầu code. Người sở hữu tính năng tự làm hai đầu theo bảng; khi cần đổi trường dùng chung, cập nhật tài liệu, mẫu và parser TS/Java trong cùng thay đổi, nhờ một người bị ảnh hưởng review. Không tự đổi type/tọa độ/ID trong nhánh cá nhân.

Ngày 1: P1 dựng JOIN/WELCOME và nền mạng/tick; P2 dựng map/renderer và MOVE_TO; P3 tạo model/fixture quái và handler ATTACK; P4 tạo fixture item cùng handler LOOT/RESPAWN. Trước hết cả nhóm dùng fixture ở mục 6 để kiểm tra đọc/ghi thống nhất.

Mốc tích hợp: ngày 2 hai client cùng vào game; ngày 3 cùng thấy di chuyển; ngày 5 đánh quái; ngày 6 loot/hồi sinh; ngày 7–8 thử chung và khóa tính năng; ngày 9 sửa lỗi; ngày 10 demo. Lịch theo tầng cũ không dùng để giao việc nữa.

Một tính năng xong khi cả client và server đã ghép, build qua, demo được và thử được lỗi liên quan; LOOT phải thử hai người nhặt cùng item, ATTACK phải thử ngoài tầm và spam, session phải thử mất kết nối.
