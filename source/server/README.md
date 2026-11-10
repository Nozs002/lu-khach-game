# Chạy Java Game Server (Lữ Khách)

## Yêu cầu

- JDK 17 trở lên
- Maven 3.8 trở lên

## Chạy Server bằng PowerShell

Từ thư mục gốc của dự án, chạy:

```powershell
cd source\server
mvn compile exec:java
```

Server mặc định lắng nghe tại cổng `8080`, địa chỉ WebSocket là `ws://localhost:8080` (hoặc `ws://127.0.0.1:8080/game`).
Dừng server bằng `Ctrl+C`.

Để chạy trên cổng khác, truyền cổng qua `exec.args`:

```powershell
mvn compile exec:java "-Dexec.args=8081"
```

## Chạy Kiểm thử tự động (Unit Tests) cho Phần 4 (Chat, Vật phẩm & Hồi sinh)

```powershell
cd source\server
mvn test
```

## Cấu trúc mã nguồn Server

```text
source/server/src/main/java/com/game/
├── Main.java                       # Điểm vào khởi chạy GameServer
├── GameServer.java                 # WebSocketServer: quản lý kết nối, tick loop (100ms), điều phối command
├── model/
│   ├── Player.java                 # Trạng thái người chơi (HP, maxHP, state IDLE/MOVING/ATTACKING/DEAD, respawnReadyTick)
│   ├── Mob.java                    # Trạng thái quái Slime (HP 40, homeX/Y, spawnGeneration, respawnReadyTick)
│   ├── Item.java                   # Vật phẩm bình máu (HEALTH_POTION, expiresTick = +200 ticks)
│   ├── MapData.java                # Bản đồ chuẩn starting-valley (32x24 ô, tileSize 24, safeZone, collisions)
│   ├── WorldState.java             # Snapshot toàn thế giới gửi mỗi tick
│   └── NetworkMessage.java         # Phong bì JSON v1 ({v, type, requestId, tick, payload})
├── world/
│   └── WorldContext.java           # Quản lý state thế giới + Fake World (dữ liệu giả định để test độc lập)
└── systems/
    ├── CommandResult.java          # Kết quả xử lý lệnh (ACK / ERROR)
    └── LootRespawnSystem.java      # [PHẦN 4] Xử lý CHAT, rơi đồ 50%, LOOT một lần (+30 HP), hết hạn item (20s), RESPAWN player (3s) & quái (15s)
```
