# Client web — bản tích hợp trên nhánh test

Game tích hợp đăng nhập/chọn nhân vật, nút VÀO GAME, ba bản đồ 52 × 24, di chuyển, chiến đấu, chat, nhặt bình máu và hồi sinh.

Chạy Java server bằng `mvn compile exec:java` trong `source/server`, sau đó chạy `npm ci` và `npm run dev` trong `source/client`. Mở URL do Vite hiển thị (thường là `http://localhost:5173`). Client kết nối WebSocket tại cổng 8080. Dùng `npm run build` để kiểm tra TypeScript và tạo bản production.

Client nạp `public/maps/world-01.json` đến `world-03.json`; đây là bản sao của dữ liệu dùng chung trong `source/common/maps`. Khi thay đổi map, cần cập nhật cả hai nơi để client và server dùng cùng dữ liệu. Vùng 12 cột bên phải canvas được chừa trống.

## Demo bản đồ độc lập

Ba bản đồ dùng asset có sẵn, mỗi bản đồ 52 cột × 24 dòng, ô vuông 24 px. Bản đồ canh trái; bên phải chừa trống tương đương 12 cột. Bộ chọn phía trên cho phép xem từng cảnh, click ô trống để đi và dùng cổng ở bốn cạnh để chuyển map.

Từ thư mục repo, biên dịch rồi phục vụ thư mục `source/`:

```powershell
node source/client/node_modules/typescript/bin/tsc -p source/client/tsconfig.movement.json
python -m http.server 8000 --bind 127.0.0.1 --directory source
```

Mở [demo](http://127.0.0.1:8000/client/movement-demo.html). Đây là world giả trong trình duyệt; chưa kết nối multiplayer.

Ảnh xem trước: [map 1](../../statics/maps/world-01.png), [map 2](../../statics/maps/world-02.png), [map 3](../../statics/maps/world-03.png).

Xem [hướng dẫn build, kiểm thử và tích hợp](../../docs/feature-2-integration.md) để biết chi tiết.
