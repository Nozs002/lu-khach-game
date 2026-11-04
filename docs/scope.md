# Phạm vi mới — phát triển dựa trên BrowserQuest

Quyết định này thay thế hướng tự viết game Phaser độc lập. Prototype cũ nằm trong source/prototype-v1.

## Mục tiêu

Giữ trải nghiệm BrowserQuest trên web, kế thừa bản đồ/tài nguyên và mã nguồn phù hợp; chuyển server Node.js sang Java, client sang TypeScript theo từng module. Giữ giao thức JSON array để các phần đã chuyển và chưa chuyển tương tác được.

## Mốc hiện tại

- Nhập baseline BrowserQuest local, bỏ qua design, node_modules và reparse point.
- Giữ ghi nhận tác giả/giấy phép và lưu nguồn gốc.
- Port TypeScript strict: GameClient, Config, Timer.
- Java đọc bản đồ gốc, checkpoint, static entities, roaming areas, chest data và mob properties.
- Có handshake, danh sách/spawn, movement destination, chat, trạng thái kết nối, sát thương, loot và vòng cập nhật cơ bản.

Mốc này chưa có đầy đủ parity: AI/hate list, zoning, chest areas, vật phẩm đặc biệt và thời gian hồi sinh cần đối chiếu. Phần lớn client còn JavaScript; không xem việc sao chép client là đã chuyển TypeScript.

## Nghiệm thu nền mạng

Hai client dùng lớp mạng TypeScript thật nhận WELCOME, LIST/WHO/SPAWN, thấy nhau, nhận MOVE/CHAT, đánh gây sát thương lên quái; gói sai bị từ chối và disconnect được đồng bộ. Build Java và TypeScript phải qua.

Cần kiểm tra trực tiếp hai tab về hình ảnh, âm thanh, click-to-move, cửa dịch chuyển, đánh quái, nhặt đồ và hồi sinh trước khi nghiệm thu gameplay.

## Các mốc tiếp theo

Xem [migration.md](migration.md): port các module client còn lại, hoàn thiện hành vi server, rồi kiểm soát vận tốc/tần suất và kiểm thử nhiều máy. Chưa bổ sung tài khoản/database hoặc triển khai public.

## Ràng buộc

Giữ nguyên INSTRUCTION.md và repo BrowserQuest nguồn. Không đọc design. Chỉ sửa bản sao trong btl_ltm. Giữ credits và thông tin giấy phép đi kèm mã/tài nguyên.
