# Dữ liệu cố định của client

- `characters.ts`: danh mục nhân vật và đường dẫn ảnh dùng chung.
- `maps.ts`: kiểu dữ liệu map nhận từ server và metadata danh mục map.
- `items.ts`: định nghĩa vật phẩm.
- `skills.ts`: định nghĩa kỹ năng.

Danh mục map, vật phẩm và kỹ năng đang để trống, sẽ bổ sung theo tính năng thực tế. `MapData` mô tả dữ liệu runtime nhận từ WELCOME; server gửi ma trận `tiles` chuẩn, trong đó chỉ giá trị `0` là đi được. Client không tự tạo bản map runtime khác.
Chỉ khai báo dữ liệu và hàm tra cứu tại đây. Không xử lý DOM, WebSocket hay vòng lặp game.
Trạng thái thay đổi khi chơi như vị trí, máu, túi đồ và hồi chiêu không đặt trong thư mục này.
