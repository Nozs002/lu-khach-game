# Client web — Lữ khách

Client TypeScript/Vite. Chạy `npm install` rồi `npm run dev` trong `source/client`; kiểm tra production bằng `npm run build`. Cả dev và build tự import `source/common/maps/world.tmj` trước khi chạy (cần Python 3). WebSocket tại `ws://localhost:8080`.

Map runtime giữ nguyên bố cục Tiled, nhiều tileset, GID và hướng lật. Tile logic 16 px; viewport 32 × 24 ô. Camera theo người chơi tại spawn; mục “Xem bản đồ” cho phép xem vùng khác, chọn “Điểm xuất hiện” để camera theo nhân vật. Click ô trống để đi theo A*, click đích mới để đổi đường. Client xem trước đường, server tính đường và tiến một ô mỗi 200ms; client nội suy vị trí. Không còn điều khiển bàn phím. Chưa có animation bước chân và tương tác NPC. Collision chỉ lấy từ lớp collision, không tự chặn theo ảnh nhà/cây/nước.

Sau khi chỉnh Tiled, lưu rồi chạy `npm run import-map`, build/khởi động lại server để cập nhật dữ liệu. Xem [hướng dẫn map](../common/maps/README.md).

Giao diện gồm chọn nhân vật, canvas, bảng nhân vật, vùng kỹ năng/trang bị, nhật ký và danh sách online. Máu, mana, kỹ năng và trang bị chưa có dữ liệu gameplay. “Rời game” tải lại trang. Chưa có chat.

Minimap “BẢN ĐỒ KHÁM PHÁ” nằm ở cột bên trái màn hình game: vùng chưa đi tới bị che tối, chấm vàng là nhân vật và khung trắng là vùng camera đang xem. Vùng mở khóa khớp với khung hình đang hiển thị trên canvas (32 × 24 ô), kể cả khi lia camera; các ô chỉ hiện một phần ở mép màn hình cũng được mở. Vùng đã mở được giữ lại và tự lưu trên trình duyệt theo tên người chơi và bố cục collision của map. Đổi trình duyệt, tên hoặc bố cục collision sẽ có tiến trình riêng; đây chưa phải dữ liệu lưu trên tài khoản/server. Nếu trình duyệt chặn lưu trữ, khám phá vẫn hoạt động trong phiên hiện tại. Chạy `npm test` để kiểm tra khám phá, lưu/khôi phục và di chuyển.

Minimap thu nhỏ bên trái hiển thị vùng 3 × 3 khung hình game (96 × 72 ô), khung hình hiện tại luôn ở giữa; ngoài biên map được đệm tối. Nhấn M trong game để mở/đóng bản đồ khám phá phóng to: khung xem khoảng 1/3 chiều cao bản đồ, giữ đúng tỷ lệ bản đồ dọc. Khi mở sẽ cuộn tới nhân vật; dùng con lăn, thanh cuộn hoặc thao tác vuốt để xem các phần phía trên/dưới. Esc, nút Đóng hoặc click nền tối cũng đóng bản đồ. Bản đồ lớn dùng cùng vùng đã khám phá với minimap; phím M không kích hoạt khi đang nhập văn bản.
