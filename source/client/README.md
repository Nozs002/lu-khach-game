# Client web — demo bản đồ

Ba bản đồ dùng asset có sẵn, mỗi bản đồ 52 cột × 24 dòng, ô vuông 24 px. Bản đồ canh trái; bên phải chừa trống tương đương 12 cột. Bộ chọn phía trên cho phép xem từng cảnh, click ô trống để đi và dùng cổng ở bốn cạnh để chuyển map.

Từ thư mục repo, biên dịch rồi phục vụ thư mục `source/`:

```powershell
node source/client/node_modules/typescript/bin/tsc -p source/client/tsconfig.movement.json
python -m http.server 8000 --bind 127.0.0.1 --directory source
```

Mở [demo](http://127.0.0.1:8000/client/movement-demo.html). Đây là world giả trong trình duyệt; chưa kết nối multiplayer.

Ảnh xem trước: [map 1](../../statics/maps/world-01.png), [map 2](../../statics/maps/world-02.png), [map 3](../../statics/maps/world-03.png).

Xem [hướng dẫn build, kiểm thử và tích hợp](../../docs/feature-2-integration.md) để biết chi tiết.
