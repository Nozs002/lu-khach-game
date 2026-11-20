## Asset quái theo cấu hình spawn (20/11/2026)

Đã bổ sung đủ 16 loại đang dùng trong `monsterSpawns`: bamboo, bamboo_yellow, kappa_green, lizard, mole, mollusc, mushroom, octopus, owl2, panda, skull, slime, slime2, snake, spider_yellow và spirit.

Mỗi loại có `mobs/<monsterType>.png` (spritesheet 64 × 64, ô 16 × 16) và `mobs/<monsterType>-face.png` (chân dung 38 × 38). Các file được sao chép nguyên bản từ `Actor/Monster/<thư mục gốc>` của Ninja Adventure; đường dẫn gốc, kích thước và URL nằm trong `../manifest.json`. Mục `monsterTypes` ánh xạ mã loại quái sang spritesheet và chân dung. Không suy diễn thứ tự hoạt ảnh từ số hàng/cột; cần kiểm tra hướng/frame khi triển khai renderer quái.

Các asset này dùng giấy phép CC0 của bộ Ninja Adventure của Pixel-boy và AAA (https://pixel-boy.itch.io/ninja-adventure-asset-pack); xem LICENSE.txt trong thư mục này. Đây là bổ sung tài nguyên, chưa triển khai sinh quái, AI hay hiển thị quái trong game.
