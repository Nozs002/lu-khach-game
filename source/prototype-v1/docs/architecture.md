# Kiến trúc mốc 1

```text
Client Phaser A ── WebSocket/JSON ──┐
                                   ├── Java server ── trạng thái trong RAM
Client Phaser B ── WebSocket/JSON ──┘
```

Client dùng Phaser vẽ bản đồ/nhân vật, TypeScript xử lý mạng, DOM cho form/chat. Vite phục vụ phát triển và build tĩnh. Server Java 17 dùng Java-WebSocket và Gson. GameServer hiện chứa vòng đời kết nối, luật di chuyển, chat và trạng thái thế giới; sẽ tách world/protocol/connection khi thêm chiến đấu.

## Luồng dữ liệu

1. Client mở WebSocket /game và gửi JOIN.
2. Server kiểm tra tên/sức chứa, cấp UUID và vị trí, gửi WELCOME với bản đồ và snapshot.
3. Server broadcast PLAYER_JOINED tới mọi người đã JOIN.
4. Client gửi MOVE chứa hướng; server kiểm tra giới hạn tốc độ và vật cản, cập nhật vị trí và phát PLAYER_MOVED cho mọi người kể cả người gửi.
5. Khi disconnect, server xóa phiên và broadcast PLAYER_LEFT.

Client không tự cập nhật tọa độ trước server. Mốc này chưa có prediction hoặc nội suy nên độ trễ sẽ thể hiện trên chuyển động. Client gửi bước tối thiểu 160 ms; server chấp nhận lần thử di chuyển tối thiểu 140 ms. Ping/pong giúp phát hiện mất kết nối đột ngột, không diễn ra tức thì. Vào lại tạo ID mới.

Các callback thay đổi trạng thái dùng chung monitor synchronized, bảo đảm snapshot và broadcast không xen kẽ sai thứ tự giữa các thread. Chưa có game loop cố định; khi thêm AI/chiến đấu sẽ chuyển cập nhật thế giới sang tick.

## Giới hạn

- Tên tối đa 20 đơn vị UTF-16; chat 200, chặn ký tự điều khiển; chat tối thiểu 600 ms/tin.
- Chỉ phiên đã JOIN nhận broadcast, tối đa 32 phiên. Chưa giới hạn tổng kết nối chưa JOIN.
- JSON dài hơn 2.048 đơn vị UTF-16 bị đóng sau khi thư viện ghép frame; chưa chống flood transport.
- Người chơi có thể đứng cùng ô. Vật cản được kiểm tra ở server.
- Chat dùng textContent trong DOM, không chèn HTML.
- Chạy local; chưa có xác thực, lưu trữ, TLS hay triển khai public.

## Kiểm chứng

Test tích hợp Node tạo WebSocket thật: snapshot, đồng bộ MOVE hai phía, tường, tốc độ, chat, JSON sai, disconnect. Build TypeScript kiểm tra kiểu. Cần thử thủ công hai tab để xác nhận hiển thị, bàn phím và focus form.
