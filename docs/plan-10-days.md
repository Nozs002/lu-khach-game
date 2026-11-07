# Kế hoạch game web multiplayer trong 10 ngày — 4 người

> Cập nhật 07/11/2026: theo yêu cầu mới, code port, prototype và tài nguyên cũ đã được xóa. Các đoạn dưới nói giữ code cũ hoặc source/prototype-v1 phản ánh kế hoạch trước khi dọn mã; hiện chỉ giữ tài liệu lịch sử và repo BrowserQuest nguồn bên ngoài. Bắt đầu lập trình mới sau khi review [thiết kế game](game-design.md).

Ngày lập: 07/11/2026. Mục tiêu 10 ngày do người dùng đặt. Đây là kế hoạch triển khai đề xuất, chưa phải cam kết về năng lực hoặc giờ làm của từng thành viên.

## Mục tiêu thay thế

Tự xây dựng một game nhập vai 2D trên trình duyệt, lấy cảm hứng từ BrowserQuest: nhiều người chơi cùng bản đồ, di chuyển, chat, đánh quái, nhặt vật phẩm và hồi sinh. Người dùng cùng nhóm trực tiếp thực hiện; trợ lý hướng dẫn, giải thích, review và hỗ trợ sửa lỗi theo ngày.

Không tiếp tục lấy việc port toàn bộ BrowserQuest làm mục tiêu chính. Mã và tài nguyên hiện có được giữ để tham khảo, không xóa hoặc ghi đè trong bước lập kế hoạch. Repo BrowserQuest nguồn chỉ đọc, không đọc design. Khi dùng asset bên ngoài phải ghi nguồn và giấy phép; ưu tiên hình khối hoặc asset nhỏ đã có quyền dùng để tiết kiệm thời gian.

Tài liệu này thay thế mục tiêu/phạm vi tương lai của scope.md và migration.md cũ. Các file đó và code hiện tại mô tả bản port đã làm, không phải sản phẩm mới đã hoàn thành. Chưa tự tạo nhánh hoặc di chuyển mã trong bước này.

## Giả định, thời lượng và mức độ khả thi

- 4 thành viên có kiến thức Java/TypeScript cơ bản, mỗi người dành khoảng 4 giờ tập trung/ngày trong 10 ngày: tổng năng lực giả định 160 giờ-người.
- Ngày 1–8: khoảng 128 giờ-người cho thiết kế, code, review, test và tích hợp. Ngày 9: 16 giờ-người dự phòng sửa lỗi. Ngày 10: 16 giờ-người cho nghiệm thu, báo cáo và demo.
- Đây là phân bổ năng lực, không phải số giờ công đã đo hoặc bảo đảm đủ. Chưa có dữ liệu năng suất/kinh nghiệm của nhóm; lập trình mới hoàn toàn và đồng bộ realtime có độ bất định cao.
- Dùng Ngày 1–10 tương đối vì chưa chốt ngày bắt đầu. Nếu bắt đầu 07/11/2026 thì Ngày 10 là 16/11/2026, tính cả ngày bắt đầu và cuối tuần.
- Nếu dưới khoảng 4 giờ/người/ngày hoặc cả nhóm chưa biết stack, cần giảm phạm vi hoặc điều chỉnh hạn. Không bù bằng cách bỏ kiểm thử mạng hay tin dữ liệu chiến đấu từ client.

## Phạm vi nghiệm thu

1. Một bản đồ nhỏ khoảng 32 × 24 ô, có vật cản; hình ảnh đơn giản đủ nhận diện.
2. Nhập tên, nhiều người cùng tham gia. Mục tiêu demo 4 client, không phải cam kết tải lớn.
3. Click-to-move và A* bốn hướng; server kiểm tra đường đi và tiến vị trí theo thời gian.
4. Chat chung, hiển thị kết nối và xử lý người chơi rời game.
5. Một loại quái, khoảng 5–10 con; đứng yên, đuổi, đánh, chết và hồi sinh.
6. Tấn công cận chiến có khoảng cách/hồi chiêu, HP, người chơi chết và hồi sinh.
7. Một loại bình máu rơi từ quái; kiểm tra quyền nhặt và chỉ một người nhận được mỗi vật phẩm.
8. Hướng dẫn chạy trên máy sạch, bộ kiểm thử mạng, sơ đồ kiến trúc, kịch bản demo và bảng đóng góp thật.

Không bắt buộc trong 10 ngày: tài khoản/JWT, database, lưu tiến trình, nhiều map, boss, nhiệm vụ, PvP, cửa hàng, inventory phức tạp, khôi phục phiên cũ và hosting Internet. RAM lưu phiên chơi; JSON lưu map và cấu hình. LocalStorage nếu dùng chỉ lưu tên/cài đặt giao diện, không làm nguồn trạng thái gameplay.

## Công nghệ và kiến trúc dự kiến

Client: TypeScript strict + HTML5 Canvas 2D + HTML/CSS, Vite. Server: Java 17+, Java-WebSocket, Gson. Transport: WebSocket với JSON object có type, thay vì duy trì giao thức mảng số của bản port. Giữ thư viện đã quen, giảm thay đổi công cụ trong đợt 10 ngày.

Client gửi ý định MOVE_TO/ATTACK/LOOT; server xác thực và quyết định kết quả. Một luồng world tick Java, mục tiêu ban đầu 10 tick/giây, xử lý command queue, vị trí, AI và chiến đấu. Client nội suy hiển thị giữa các cập nhật; không tự quyết định sát thương hoặc nhận vật phẩm.

Đề xuất bố trí source/client/src theo render, input, pathfinding, network, ui; source/server theo protocol, world, entity, systems, config. Chốt vị trí triển khai mới ở Ngày 1, trên nhánh riêng, trước khi thay thế bản port hiện có.

## Phân công theo đầu mục

| Người | Phạm vi sở hữu | Đầu ra | Phụ thuộc/giao diện |
| --- | --- | --- | --- |
| P1 — client thế giới | Canvas, camera, map, sprite đơn giản, input chuột, A*, nội suy | Vẽ map/nhân vật, di chuyển trực quan, chọn mục tiêu | Đọc MapData và WorldState từ P2; không tự mở socket |
| P2 — client mạng và UI | WebSocket, schema TS, state store, form tên, chat, HP, kết nối; điều phối tích hợp | Client gửi command/nhận event, UI phản ánh state server | Thống nhất protocol với P3; cung cấp state giả cho P1 từ Ngày 1 |
| P3 — server nền | Java bootstrap, protocol, connection, JOIN, command queue, world tick, movement/collision, player lifecycle | Server nhiều kết nối, quản lý world và di chuyển đúng tốc độ | Cung cấp Entity/World API cho P4 từ Ngày 1 |
| P4 — server gameplay | Spawn, AI, combat, drop, loot, respawn; phụ trách tổng hợp kịch bản test gameplay | Vòng chơi đánh quái → rơi đồ → nhặt → hồi sinh | Dùng World API của P3; không sửa transport của P3 |

Mỗi người viết kiểm tra cho phần mình và phần báo cáo cá nhân. P4 tổng hợp test gameplay, không chịu toàn bộ kiểm thử thay nhóm. P2 làm điều phối tích hợp tạm thời; thay bằng tên thật khi nhóm chốt.

## Lịch làm song song

Mỗi ô là đầu việc chính của một người trong ngày, bao gồm kiểm tra phần việc. Đầu ngày 15 phút chốt API/vướng mắc, cuối ngày khoảng 30 phút tích hợp và demo. Không chờ cuối dự án mới ghép code.

| Ngày | P1 — client thế giới | P2 — client mạng/UI | P3 — server nền | P4 — server gameplay | Cổng nghiệm thu cuối ngày |
| --- | --- | --- | --- | --- | --- |
| 1 | Canvas, grid, map mẫu; thống nhất pixel/tile | TS scaffold, protocol draft với P3, mock WorldState | Java scaffold, schema, Entity/World API với P4 | Đặc tả trạng thái mob, combat, map spawn; fake World cho test | Build client/server; protocol v1 và API nội bộ được review |
| 2 | Vẽ player, đổi tọa độ chuột sang ô, vật cản | Socket JOIN/WELCOME; form tên, store player | Nhiều kết nối, JOIN/LEAVE, snapshot và ID | Đọc cấu hình mob, spawn đúng số lượng trên ô hợp lệ | Hai client thấy cùng danh sách player; test spawn chạy độc lập |
| 3 | A* bốn hướng, click-to-move bằng state giả | MOVE_TO, cập nhật state; nối render P1 | Tính đường, movement theo tick, collision, giới hạn tốc độ | Hiển thị state mob qua API P3; chuẩn bị AI | Hai client thấy nhau di chuyển, không xuyên tường/đi quá tốc độ |
| 4 | Nội suy chuyển động, chọn mob, highlight | Chat, số người online, trạng thái socket | Xác thực message, chat, disconnect và dọn player | AI idle/chase/attack, phạm vi phát hiện và bỏ đuổi | Bốn client chat/di chuyển; mob đuổi đúng mục tiêu |
| 5 | Animation đánh đơn giản, hiệu ứng trúng đòn | ATTACK command, HP và damage event | Route command gameplay, kiểm tra player/session, hỗ trợ tích hợp | Khoảng cách/hồi chiêu, tính damage, chết; test gửi HIT giả/spam | Đánh quái qua server, client không thể tự tăng damage |
| 6 | Hình ảnh item, thao tác nhặt, trạng thái chết | LOOT/RESPAWN UI, kiểm tra input khi chết | Đồng bộ remove/spawn, bảo đảm command xử lý tuần tự | Drop bình máu, nhặt một lần, hồi máu, player/mob respawn | Có vòng chơi hoàn chỉnh và test hai người nhặt cùng item |
| 7 | Sửa lệch vị trí/animation, hiển thị ở màn hình khác | Lỗi kết nối, thao tác vào lại, thông báo lỗi dễ hiểu | Test disconnect đột ngột, stale command, map consistency | Test chase/death/drop/respawn và edge case combat | Bốn người chơi thử khoảng 15 phút, ghi bug có bước tái hiện |
| 8 | Chốt hình ảnh cần thiết; viết phần client báo cáo | Hoàn thiện UI tối thiểu, README chạy client | Test mạng tự động và script chạy server | Chỉnh thông số, kiểm tra regression, tổng hợp checklist | Khóa tính năng; bản ứng viên chạy được, không có lỗi chặn chơi |
| 9 | Sửa lỗi render theo mức ưu tiên | Sửa lỗi tích hợp/client; điều phối hàng đợi bug | Sửa lỗi server/mạng | Sửa lỗi gameplay; test lại bug đã sửa | Dự phòng 1 ngày cho lỗi đã biết; không thêm tính năng |
| 10 | Chuẩn bị phần trình bày client | Thử hướng dẫn chạy từ checkout sạch, gom tài liệu | Kiểm tra chạy LAN và trình bày protocol/tick | Chạy kịch bản demo, phần gameplay và kết quả test | Nghiệm thu, commit/tag bản giao, nộp báo cáo và demo |

## Hợp đồng phải chốt ngày 1

- Tọa độ: ô nguyên, gốc trên trái, x sang phải, y xuống dưới; tileSize nhất quán. Phân biệt grid position và render position.
- Schema MapData: width, height, tileSize, collisions, spawnPoints. Một nguồn map chuẩn cho hai bên.
- Schema Entity: id, kind, x, y, hp, maxHp, state; trường tùy chọn có quy ước rõ.
- Client command: JOIN, MOVE_TO, CHAT, ATTACK, LOOT, RESPAWN; kèm requestId khi cần đối chiếu.
- Server event: WELCOME, WORLD_STATE, CHAT, DAMAGE, ENTITY_SPAWN, ENTITY_DESPAWN, ERROR. Snapshot có tick tăng dần; chốt full snapshot trước, chưa tối ưu delta sớm.
- World API: add/remove/find entity, get player, walkable tile, event queue; chỉ world thread thay đổi trạng thái.
- Fresh connection tạo session mới; chưa resume. Loại command cũ khi socket đóng. Kiểm tra khoảng cách/cooldown/loot ở server.

P2 và P3 sở hữu protocol; P1/P4 review trước khi dùng. Đổi field phải cập nhật mẫu JSON, parser hai phía và kiểm thử liên quan trong cùng đợt tích hợp.

## Phụ thuộc và đường quyết định tiến độ

Chuỗi phụ thuộc chính: protocol/models Ngày 1 → JOIN/snapshot Ngày 2 → movement Ngày 3 → AI Ngày 4 → combat Ngày 5 → loot/respawn Ngày 6 → test chung Ngày 7–8 → sửa lỗi/nghiệm thu Ngày 9–10.

P1 làm với state giả khi P3 chưa sẵn sàng. P4 làm với fake World và mẫu event khi transport chưa xong. Khi phần thật sẵn sàng phải thay mock để tích hợp trong ngày, không để mock trở thành bằng chứng đã hoàn thành multiplayer.

## Quy trình Git và định nghĩa hoàn thành

- Nhánh tích hợp mới cho sản phẩm tự viết; nhánh cá nhân feature/client-world, feature/client-network-ui, feature/server-world, feature/server-gameplay.
- P1/P2 tách thư mục TS, P3/P4 tách world/protocol và systems. Không cùng sửa một file server lớn.
- Tích hợp thay đổi nhỏ mỗi ngày. P1 review P2 và ngược lại; P3 review P4 và ngược lại. P2 điều phối merge nhưng không tự merge khi check còn lỗi.
- Một đầu việc xong khi build qua, đáp ứng tiêu chí chức năng, đã thử tình huống lỗi liên quan, được review và demo trong bản tích hợp. Không tính code chưa ghép là tính năng đã hoàn thành.
- Ghi đóng góp thật bằng commit/PR và nhật ký; không tự gán tên/thành tích chưa có.

## Nghiệm thu ngày 10

1. Checkout sạch chạy theo README trên máy thứ hai; không phụ thuộc file build hoặc JAR chưa được khai báo.
2. Bốn client thấy nhau di chuyển, chat; player rời game được dọn khỏi world.
3. Không vượt tường/tốc độ; payload sai không làm server dừng.
4. Spam ATTACK không vượt cooldown; không đánh trúng quái ở xa; damage do server tính.
5. Hai client cùng LOOT chỉ một client được nhận item, hồi máu không vượt maxHP.
6. Player chết không di chuyển/đánh/nhặt được; hồi sinh hợp lệ; quái chết rồi trở lại theo cấu hình.
7. Phiên thử chung khoảng 15 phút không gặp lỗi chặn chơi. Ghi máy, số client và log để giới hạn đúng kết luận.
8. README, sơ đồ client/server, protocol, kết quả kiểm thử, nguồn asset, báo cáo và phân công thực tế đầy đủ.

## Rủi ro và quy tắc giảm phạm vi

| Dấu hiệu | Hành động | Người điều phối |
| --- | --- | --- |
| Cuối ngày 3 chưa có hai client đi ổn định | Dừng đồ họa mới; P1/P2/P3 sửa movement/protocol, P4 tiếp tục test bằng fake World | P2 |
| Cuối ngày 5 combat chưa ổn định | Giữ một loại quái/bình máu, bỏ hiệu ứng đẹp và trang bị; ưu tiên khoảng cách/HP/cooldown | P2 + P4 |
| Protocol thay đổi khiến client/server lệch | Chốt phiên bản/mẫu gói; sửa schema và test trước khi thêm handler | P2 + P3 |
| Thiếu thời gian học công cụ/asset | Dùng Canvas hình khối; giữ map nhỏ và một loại quái; không thêm engine hoặc editor mới | P1 + P2 |
| Tích hợp lỗi hoặc lệch tốc độ sau ngày 8 | Dùng ngày 9 dự phòng; bỏ phần tùy chọn, giữ kiểm thử correctness và ngày 10 nghiệm thu | P2 điều phối, nhóm quyết định |

Đồ họa chi tiết, âm thanh và animation nâng cao là tùy chọn, chỉ làm nếu cổng nghiệm thu chính đã qua. Nếu vẫn không đủ thời gian phải báo lại phạm vi/hạn, không tuyên bố hoàn thành khi check chưa qua.

## Cách hướng dẫn hằng ngày

Trước mỗi ngày, trợ lý giải thích cơ chế sẽ xây, đưa đầu việc theo vai trò, file/API cần tạo và bài kiểm tra đầu ra. Nhóm tự triển khai; khi có lỗi gửi log hoặc chỉ rõ phần cần review. Cuối ngày trợ lý giúp đối chiếu tiêu chí, phân tích lỗi, cập nhật backlog ngày kế tiếp. Chỉ bắt đầu đầu việc phụ thuộc sau khi mốc trước có bằng chứng chạy thật.

Thông tin còn cần nhóm điền: tên P1–P4, mức Java/TypeScript của từng người, số giờ/ngày và ngày bắt đầu. Các mục này giúp cân lại phân công, không ngăn việc chuẩn bị ngày 1.
