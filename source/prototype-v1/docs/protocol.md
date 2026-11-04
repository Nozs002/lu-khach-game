# Giao thức WebSocket v1

Endpoint: ws://127.0.0.1:8080/game. Mỗi message là một JSON object trong text message. Tọa độ ô nguyên, gốc trên trái; x tăng sang phải, y tăng xuống dưới. Trường bổ sung được bỏ qua.

## Client → server

| type | Trường | Ý nghĩa |
| --- | --- | --- |
| JOIN | name: string | Một lần mỗi kết nối; sau trim dài 1–20 |
| MOVE | direction: UP / DOWN / LEFT / RIGHT | Yêu cầu đi một ô, không nhận tọa độ từ client |
| CHAT | text: string | Sau trim dài 1–200, một dòng |

```json
{"type":"JOIN","name":"An"}
```

```json
{"type":"MOVE","direction":"RIGHT"}
```

## Server → client

| type | Trường | Ý nghĩa |
| --- | --- | --- |
| WELCOME | you, map, players | ID của mình, bản đồ, snapshot; gửi riêng |
| PLAYER_JOINED | player | Broadcast cả người mới |
| PLAYER_MOVED | id, x, y | Di chuyển hợp lệ |
| PLAYER_LEFT | id, name | Phiên rời game |
| CHAT | id, name, text | Chat được chấp nhận |
| ERROR | code, message | Hành động/dữ liệu không hợp lệ |

player có {id, name, x, y}; id là UUID do server cấp, tên không cần duy nhất. map có {width:24, height:16, tileSize:32, blocked:[[x,y],...]}. Client dùng bản đồ từ server.

Lỗi: INVALID_MESSAGE, JOIN_REQUIRED, ALREADY_JOINED, INVALID_NAME, WORLD_FULL, INVALID_DIRECTION, INVALID_CHAT, UNKNOWN_TYPE. Lỗi không thay đổi trạng thái.

MOVE chạm vật cản hoặc gửi quá nhanh bị bỏ qua, không phát PLAYER_MOVED; CHAT quá nhanh bị bỏ qua. Đường dẫn sai đóng code 1008; message quá dài đóng 1009. Kết nối lại tạo phiên mới. Chưa có resume, login hoặc sequence number.
