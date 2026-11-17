# Luồng hoạt động WebSocket trong game

Tài liệu giải thích luồng kết nối trong mã hiện tại: client trình duyệt dùng
`WebSocket`, server Java dùng thư viện Java-WebSocket và class `GameServer`.
Đây là phần giải thích cách chạy, không thay thế hợp đồng giao thức trong
[protocol-v1.md](protocol-v1.md).

## 1. Thứ tự hoạt động thông thường

```text
Main.main() gọi server.start()
        ↓
Server mở cổng thành công
        ↓
onStart()
        ↓
Client mở WebSocket, hoàn tất bắt tay với server
        ↓
Server: onOpen(conn, handshake)
Client: sự kiện open → hàm đã gán cho socket.onopen
        ↓
Client gửi JSON có type = JOIN
        ↓
Server: onMessage(conn, message)
        ↓
Server tạo Player, lưu phiên và gửi WELCOME
Đồng thời gửi PLAYER_JOINED cho các người chơi khác
        ↓
Client nhận WELCOME trong onmessage, lưu dữ liệu và hiện game
        ↓
Client tiếp tục gửi các tin nhắn ứng dụng
        ↓
Server: onMessage(conn, message) được gọi mỗi lần nhận tin text
        ↓
Kết nối đóng
        ↓
Server: onClose(conn, ...) → cleanupSession(conn)
Client: sự kiện close → hàm đã gán cho socket.onclose
```

Sơ đồ mô tả một lần kết nối thành công. Hai phía nhận sự kiện mở/đóng theo xử lý
của riêng mình; sơ đồ không quy định thứ tự tuyệt đối giữa callback client và
server. Nếu kết nối thất bại, luồng có thể không tới bước `onOpen()`.

## 2. Ai gọi các hàm này?

Thư viện không chạy lần lượt các hàm theo vị trí trong file. Sau khi được khởi
động, nó chờ sự kiện và gọi phương thức tương ứng mà `GameServer` ghi đè.

| Hàm server | Khi được gọi | Xử lý trong game |
| --- | --- | --- |
| `onStart()` | Server khởi động thành công | Ghi log cổng lắng nghe |
| `onOpen(conn, handshake)` | Một client hoàn tất kết nối WebSocket | Ghi log địa chỉ client |
| `onMessage(conn, message)` | Nhận một tin nhắn text | Đọc JSON bằng Gson, phân loại theo `type` |
| `onClose(conn, ...)` | Kết nối đóng | Dọn phiên và thông báo người chơi rời game |
| `onError(conn, ex)` | Có lỗi | Nếu có kết nối liên quan, gọi dọn phiên |

`onStart()` thuộc vòng đời server, không chạy lại mỗi khi có client mới.
`onOpen()` chưa tạo nhân vật: client phải gửi `JOIN` để server xử lý việc tham gia.
`onError()` có thể xảy ra ở nhiều thời điểm và không phải lỗi nào cũng đóng kết nối.
Các sự kiện từ nhiều client có thể xen kẽ hoặc được xử lý đồng thời.

`@Override` giúp trình biên dịch kiểm tra phương thức ghi đè đúng khai báo của
class cha; annotation này không tự gọi phương thức.

## 3. Gửi và nhận JSON

Ví dụ client gửi yêu cầu tham gia theo mã hiện tại:

```javascript
socket.onopen = () => {
    socket.send(JSON.stringify({
        type: 'JOIN',
        name: 'An',
        characterId: 'knight'
    }));
};
```

Server nhận chuỗi trong `onMessage()` và chuyển sang object Java:

```java
NetworkMessage input = gson.fromJson(message, NetworkMessage.class);
```

`NetworkMessage` chứa dữ liệu, Gson chuyển đổi JSON, còn `conn.send()` thực hiện
gửi. Gửi tin tới một client không cần chờ client gửi yêu cầu trước đó: sau khi
kết nối mở, cả server và client đều có thể chủ động gửi tin.

## 4. Ping/Pong kiểm tra mất kết nối

Constructor của `GameServer` cấu hình:

```java
setConnectionLostTimeout(CONNECTION_LOST_TIMEOUT_SECONDS);
```

Giá trị hiện tại là `10`, đơn vị giây. Java-WebSocket quản lý việc kiểm tra và
gửi khung Ping tới các kết nối đang mở, kể cả kết nối chưa gửi `JOIN`.

```text
Server ── khung Ping ──→ Trình duyệt
Server ←─ khung Pong ─── Trình duyệt tự trả lời
```

Ping/Pong đi trên chính kết nối WebSocket hiện có. Đây là khung điều khiển của
giao thức, không phải JSON `PING`/`PONG`, nên không đi vào nhánh xử lý JSON trong
`onMessage()` của game. JavaScript trình duyệt không cần tự trả Pong.

Trong Java-WebSocket 1.5.6, bộ kiểm tra chạy theo chu kỳ cấu hình và đối chiếu
thời điểm Pong cuối với ngưỡng 1,5 lần chu kỳ. Do đó cấu hình `10` không có nghĩa
là luôn ngắt đúng 10 giây sau khi mất mạng. Khi phát hiện không còn phản hồi,
thư viện đóng kết nối và `onClose()` thực hiện dọn phiên.

Tham khảo: [mã kiểm tra kết nối của Java-WebSocket 1.5.6](https://github.com/TooTallNate/Java-WebSocket/blob/v1.5.6/src/main/java/org/java_websocket/AbstractWebSocket.java).

## 5. Dọn phiên khi rời game

`cleanupSession(conn)` xóa người chơi khỏi Map:

```java
Player leaver = players.remove(conn);
```

`remove()` trả về Player vừa xóa, hoặc `null` nếu không có. Nếu có người chơi,
server tạo tin `PLAYER_LEFT` chứa ID của họ rồi gọi `broadcastMessage(..., null)`
để gửi cho mọi người chơi còn lại. Hàm broadcast chỉ gửi qua các socket còn mở.

Các file liên quan:

- [Main.java](../source/server/src/main/java/com/game/Main.java): khởi động server.
- [GameServer.java](../source/server/src/main/java/com/game/GameServer.java): callback, xử lý lệnh và quản lý phiên.
- [NetworkMessage.java](../source/server/src/main/java/com/game/model/NetworkMessage.java): dữ liệu message.
- [WebSocketClient.ts](../source/client/src/network/WebSocketClient.ts): kết nối và xử lý tin phía trình duyệt.
