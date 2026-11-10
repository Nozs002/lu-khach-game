# Cách chạy chức năng 2 — bản đồ và di chuyển

Tài liệu này hướng dẫn chạy trên Windows bằng PowerShell tại dự án hiện tại. Demo hiển thị hai map bằng assets có sẵn, cho phép click để di chuyển và đi qua cổng chuyển map.

**Demo dùng world giả trong trình duyệt, chưa kết nối multiplayer.** Không cần chạy server Java để mở demo. Phần Java được chạy riêng bằng bộ kiểm thử movement; mở hai tab demo sẽ tạo hai world độc lập.

## 1. Chuẩn bị

Để mở demo, cần Node.js, TypeScript và Python 3. Để chạy kiểm thử Java, cần thêm JDK 17 trở lên và Gson. Kiểm tra những công cụ bạn định sử dụng:

```powershell
node --version
python --version
java -version
javac -version
```

Trong checkout hiện tại đã có:

- TypeScript: `source/client/node_modules/typescript/bin/tsc`.
- Gson: `source/server/.deps/gson-2.11.0.jar`.
- Assets: `source/client/public/assets/tiles/floor.png` và `nature.png`.
- Map: `source/common/maps/world-01.json` và `world-02.json`.

Không cần chạy `npm run dev`, Maven hoặc tạo/sửa `package.json` để dùng demo này.

## 2. Biên dịch client

Mở PowerShell và chạy:

```powershell
Set-Location 'C:\Users\VU\Documents\BTLLTM\lu-khach-game\source\client'
node node_modules/typescript/bin/tsc -p tsconfig.movement.json
if ($LASTEXITCODE -ne 0) { throw 'Bien dich client that bai' }
```

Biên dịch thành công sẽ tạo JavaScript trong `source/client/movement-build/`. Lệnh không in thông báo khi thành công.

Nếu checkout khác chưa có TypeScript ở đường dẫn trên, dùng lệnh thay thế sau tại cùng thư mục. Lệnh có thể cần mạng và tải công cụ vào cache npm:

```powershell
npm exec --yes --package=typescript -- tsc -p tsconfig.movement.json
if ($LASTEXITCODE -ne 0) { throw 'Bien dich client that bai' }
```

Mỗi lần sửa TypeScript, chạy lại bước biên dịch trước khi tải lại trang.

## 3. Mở HTTP phục vụ demo

Sau khi biên dịch, chạy trong PowerShell:

```powershell
Set-Location 'C:\Users\VU\Documents\BTLLTM\lu-khach-game\source'
python -m http.server 8000 --bind 127.0.0.1
```

Giữ terminal này mở. Truy cập bằng Chrome hoặc Edge:

[http://127.0.0.1:8000/client/movement-demo.html](http://127.0.0.1:8000/client/movement-demo.html)

**Phải phục vụ từ thư mục `source/`** để trình duyệt đọc được cả client và `common/maps/`. Không mở HTML bằng cách nhấp đúp hoặc dùng địa chỉ `file://`.

HTTP ở bước này chỉ phục vụ file tĩnh cho demo, không phải WebSocket/server game bổ sung. Nếu đã có HTTP server phục vụ đúng thư mục này, dùng server đó và mở đường dẫn `/client/movement-demo.html` tương ứng.

Nhấn `Ctrl+C` trong terminal để dừng HTTP server.

## 4. Cách thử trên trang

1. Khi tải xong, trang hiển thị `world-01`, vị trí `(3, 3)` và bản đồ có nền cỏ, đường đất, cây, đá.
2. Click ô trống để di chuyển. Các chấm nhỏ thể hiện đường dự kiến; ô viền sáng là đích. Nhân vật vàng là bạn, nhân vật xanh là người chơi giả.
3. Click đích khác khi đang đi để thay đường. Click ô đang đứng để dừng. Tốc độ tối đa là 5 ô/giây.
4. Click ô đá hoặc cây chặn để thử báo lỗi. Thu nhỏ cửa sổ và click lại để thử tọa độ khi canvas bị co theo CSS.
5. Click một trong hai ô cổng ở giữa cạnh trái, phải, trên hoặc dưới. Khi tới cổng, nhân vật chuyển sang map còn lại và xuất hiện ở phía trong cạnh đối diện. Dòng `Bản đồ` đổi giữa `world-01` và `world-02`.
6. Nhấn **Mô phỏng rời game**. Tick ngừng cập nhật và click không còn gửi lệnh. Tải lại trang để bắt đầu phiên demo mới.

Vùng viền nét đứt là vùng an toàn. Hình ảnh nền, cây và đá được lấy từ hai PNG gốc; dữ liệu va chạm, cổng và lựa chọn tile được lưu trong JSON map.

## 5. Chạy kiểm thử client

Các lệnh dưới đây độc lập với HTTP server ở bước 3.

### Kiểm thử TypeScript

Sau khi đã biên dịch theo bước 2:

```powershell
Set-Location 'C:\Users\VU\Documents\BTLLTM\lu-khach-game\source\client'
node tests/movement.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Kiem thu TypeScript that bai' }
```

Khi thành công, terminal in dòng bắt đầu bằng `TS:` và kết thúc bằng `passed`. Bộ kiểm thử kiểm tra đường đi theo fixture chung, map sai, source rect của tileset, CSS scale, gom click và nội suy.

### Kiểm thử trình duyệt tự động — tùy chọn

Cần Playwright trong môi trường công cụ và Chrome. Checkout hiện tại đã có Playwright trong `client/node_modules`. Chạy:

```powershell
Set-Location 'C:\Users\VU\Documents\BTLLTM\lu-khach-game\source\client'
node tests/movement.browser.mjs
if ($LASTEXITCODE -ne 0) { throw 'Kiem thu trinh duyet that bai' }
```

Mặc định test dùng Chrome tại `C:/Program Files/Google/Chrome/Application/chrome.exe`. Nếu executable nằm ở nơi khác, đặt đường dẫn thực tế trước khi chạy:

```powershell
$env:MOVEMENT_CHROME = 'D:\Tools\Chrome\chrome.exe'
node tests/movement.browser.mjs
```

Khi thành công, terminal in `Browser: ... passed`. Test kiểm tra tải cả hai tileset, click khi canvas thu nhỏ, tới đích, ô chặn, đổi map và rời demo. Test tự phục vụ file bằng browser route, không cần mở HTTP server.

Ảnh kiểm chứng được tạo tại:

- `source/client/movement-build/map-world-01.png`.
- `source/client/movement-build/demo-preview.png` — ảnh sau khi sang map 2.

## 6. Chạy kiểm thử movement Java

Bước này kiểm tra logic server bằng world giả, không khởi động server game và không kết nối tới trang demo.

Mở PowerShell khác và chạy:

```powershell
Set-Location 'C:\Users\VU\Documents\BTLLTM\lu-khach-game\source\server'

if (-not (Test-Path '.deps/gson-2.11.0.jar')) {
    throw 'Thieu Gson: can file .deps/gson-2.11.0.jar hoac sua classpath toi JAR cua ban'
}

New-Item -ItemType Directory -Force movement-test-build/classes | Out-Null
$movementSources = @(Get-ChildItem src/main/java/com/game/features/movement/*.java) + @(Get-ChildItem src/test/java/com/game/features/movement/*.java)

javac -cp .deps/gson-2.11.0.jar -d movement-test-build/classes $movementSources.FullName
if ($LASTEXITCODE -ne 0) { throw 'Bien dich Java that bai' }

java -cp 'movement-test-build/classes;.deps/gson-2.11.0.jar' com.game.features.movement.MovementTest ../common
if ($LASTEXITCODE -ne 0) { throw 'Kiem thu Java that bai' }
```

Khi thành công, terminal in `Java: ... passed`. Các trường hợp gồm fixture đường đi chung với TS, payload sai/NaN, spam, cooldown, tick chậm, cả tám ô cổng và dọn trạng thái khi người chơi rời.

Các file `.class` được tạo trong `source/server/movement-test-build/classes/`. Thư mục này và `client/movement-build/` đã được loại khỏi Git bằng các file `.gitignore` riêng của phần movement.

## 7. Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `node` hoặc `python` không được nhận diện | Cài công cụ tương ứng và mở lại terminal; nếu máy dùng Python Launcher, thay `python` bằng `py` |
| Không tìm thấy `typescript/bin/tsc` | Dùng lệnh `npm exec` thay thế ở bước 2 |
| Trang trắng hoặc báo thiếu file JavaScript | Biên dịch lại; kiểm tra có `client/movement-build/movement-demo.js` |
| Map/PNG bị 404 | Dừng HTTP bằng `Ctrl+C`, chuyển về đúng `source/` rồi chạy lại bước 3; giữ nguyên thư mục `public/assets/` |
| Không nạp được map khi mở HTML trực tiếp | Mở URL HTTP ở bước 3 thay cho `file://` |
| Cổng 8000 đã được dùng | Dùng HTTP server hiện có nếu đúng thư mục, hoặc chạy `python -m http.server 8001 --bind 127.0.0.1` và mở URL với cổng 8001 |
| Sửa code nhưng trang chưa đổi | Biên dịch lại TypeScript rồi nhấn `Ctrl+F5` |
| `javac` không được nhận diện | Cài JDK 17+ và đưa thư mục `bin` của JDK vào PATH |
| Java báo thiếu Gson | Kiểm tra JAR và hai classpath trong bước 6 |
| JDK báo `AccessDeniedException` khi đóng JAR trong sandbox | Chạy các lệnh Java trong terminal có quyền đọc JAR và thư mục build; không coi lần compile có lỗi là thành công |
| Test browser không tìm thấy Chrome hoặc Playwright | Chỉ chạy phần này khi đã có các công cụ; dùng `MOVEMENT_CHROME` để trỏ tới Chrome/Chromium thực tế |

## 8. Phạm vi tích hợp còn chờ

Chạy demo và các bộ kiểm thử trên chưa đồng nghĩa đã tích hợp multiplayer. Phần movement không sửa `JOIN/WELCOME`, heartbeat, ID, giới hạn người chơi hoặc dọn phiên của chức năng 1.

Để ghép vào ứng dụng thật, người làm chức năng 1 cần cung cấp:

| Phía | Điểm nối |
| --- | --- |
| Client | Adapter `MovementPort`: gửi `MOVE_TO` trên socket hiện có, đọc snapshot, đăng ký snapshot/lỗi/disconnect; gọi `MovementModule.render()` từ render loop hiện có và `dispose()` khi hết phiên |
| Server | Adapter `MovementWorld` tới player của session; gọi `joined()`, `commands.handle()`, `system.update()` và `left()` trên cùng world thread; core trả ACK/ERROR và phát snapshot |
| Đổi map | API/event công khai xác nhận `mapId` cùng tick với vị trí, kể cả cho người vào sau; đây là dữ liệu view của adapter, không tự thêm trường vào JOIN/WELCOME |
| Vòng đời và tốc độ | Core dọn command chờ khi rời, giữ queue/rate limit có giới hạn và tắt đường `MOVE` cũ khi bật movement mới |

`joined()` và `system.update()` dùng cùng mốc thời gian thực đơn điệu, chẳng hạn `System.nanoTime()/1_000_000`; không tăng thời gian giả để chạy bù tick. Mỗi update chỉ tiến tối đa một ô.

Khi đóng gói, client và server phải dùng cùng bản `common/maps/*.json`. Host cấu hình đường phục vụ map và assets của mình. Nếu assets được phục vụ tại `/assets/tiles/`, preload bằng `loadTileAtlas(new URL('/assets/tiles/', location.origin))` rồi truyền atlas làm tham số thứ năm của `MovementModule`.

Chỉ nghiệm thu multiplayer sau khi hai client thật cùng thấy di chuyển và đổi map, đóng tab không còn movement state, đồng thời nhập tên, vào/rời, online và PING/PONG vẫn hoạt động đúng.
