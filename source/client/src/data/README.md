# Dữ liệu cố định của client

- `characters.ts`: danh mục nhân vật và đường dẫn ảnh dùng chung.
- `maps.ts`: định nghĩa bản đồ.
- `items.ts`: định nghĩa vật phẩm.
- `skills.ts`: định nghĩa kỹ năng.

Ba danh mục bản đồ, vật phẩm và kỹ năng đang để trống, sẽ bổ sung theo tính năng thực tế.
Chỉ khai báo dữ liệu và hàm tra cứu tại đây. Không xử lý DOM, WebSocket hay vòng lặp game.
Trạng thái thay đổi khi chơi như vị trí, máu, túi đồ và hồi chiêu không đặt trong thư mục này.
