# Phạm vi dự án

Tự viết game nhập vai 2D multiplayer trên trình duyệt, client Phaser + TypeScript, server Java + WebSocket. Tên làm việc: Lữ khách.

## Mốc 1

Một bản đồ 24 × 16 ô; tối đa 32 người chơi đã JOIN. Nhập tên thay cho tài khoản. Đồ họa hình khối tạm thời, di chuyển từng ô; người chơi được đứng cùng ô.

Nghiệm thu:

1. Hai tab nhìn thấy nhau; tab vào sau nhận snapshot đầy đủ.
2. Di chuyển được phản ánh ở cả hai tab với cùng tọa độ từ server.
3. Không đi xuyên vật cản hoặc ra khỏi bản đồ. Client không thể tự gửi tọa độ để dịch chuyển.
4. Chat chung có giới hạn độ dài; nội dung không được diễn giải thành HTML.
5. Đóng tab làm nhân vật biến mất; vào lại tạo phiên mới.
6. JSON sai, thao tác trước JOIN và hướng sai nhận lỗi; server tiếp tục phục vụ.

## Mốc sau

1. Nội suy chuyển động, animation, bản đồ Tiled.
2. Quái và AI trên server.
3. Chiến đấu: khoảng cách, hồi chiêu, sát thương, chết và hồi sinh.
4. Vật phẩm: rơi đồ, nhặt đồ, hồi máu.
5. Demo nhiều máy, đo độ trễ và hoàn thiện báo cáo.

Ngoài phạm vi bản đầu: tài khoản, database, nhiệm vụ, cửa hàng, PvP, nhiều thế giới, triển khai public. Giới hạn 32 chưa phải kết quả kiểm thử tải.

## Ràng buộc

- Giữ nguyên INSTRUCTION.md.
- BrowserQuest chỉ dùng tham khảo, không sửa; không đọc thư mục design bên trong.
- Mã và hình ảnh hiện tại tự viết, không sao chép tài nguyên tham khảo.
- Chưa có thời hạn và thông tin nhóm nên chưa lập lịch theo ngày.
