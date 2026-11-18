# Client web — Lữ khách

Client TypeScript/Vite. Chạy `npm install` rồi `npm run dev` trong `source/client`; kiểm tra production bằng `npm run build`. Cả dev và build tự import `source/common/maps/world.tmj` trước khi chạy (cần Python 3). WebSocket tại `ws://localhost:8080`.

Map runtime giữ nguyên bố cục Tiled, nhiều tileset, GID và hướng lật. Tile logic 16 px; viewport 32 × 24 ô. Camera theo người chơi tại spawn; mục “Xem bản đồ” cho phép xem vùng khác, di chuyển sẽ quay camera về nhân vật. WASD hoặc mũi tên di chuyển từng ô; server kiểm tra collision. Chưa có click để đi/A*, animation bước chân và tương tác NPC. Collision chỉ lấy từ lớp collision, không tự chặn theo ảnh nhà/cây/nước.

Sau khi chỉnh Tiled, lưu rồi chạy `npm run import-map`, build/khởi động lại server để cập nhật dữ liệu. Xem [hướng dẫn map](../common/maps/README.md).

Giao diện gồm chọn nhân vật, canvas, bảng nhân vật, vùng kỹ năng/trang bị, nhật ký và danh sách online. Máu, mana, kỹ năng và trang bị chưa có dữ liệu gameplay. “Rời game” tải lại trang. Chưa có chat.
