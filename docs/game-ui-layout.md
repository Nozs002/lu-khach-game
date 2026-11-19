> Bản thiết kế lịch sử. Ảnh phác và bộ dựng cũ đã được dọn; map đang chạy lấy từ `source/common/maps/world.tmj`.

# Bố cục giao diện game

Cập nhật 17/11/2026. Thiết kế theo yêu cầu người dùng; ảnh tham khảo chỉ định hướng, không sao chép nguyên giao diện. Đã triển khai khung UI client theo thiết kế; map, A* và các hệ gameplay chưa triển khai.

UI hiện có: avatar/tên người chơi, trạng thái kết nối, nút rời game, khung mana/kỹ năng/trang bị, nhật ký tối đa 200 dòng có thời gian và giữ vị trí đọc, hướng dẫn dưới cùng. Danh sách online được giữ trong khung thu gọn dưới map. HP hiển thị `— / —` thay cho số minh họa trong ảnh vì server chưa có dữ liệu. Hội thoại không dùng avatar người chơi thay cho người đang nói. Màn hình hẹp đưa sidebar xuống dưới map. Ảnh bên dưới vẫn là mockup thiết kế, không phải ảnh chụp bản chạy.


## Bố cục đã yêu cầu

Map ở bên trái, bảng thông tin ở bên phải. Thứ tự từ trên xuống của bảng bên phải:

1. Nhân vật: avatar của nhân vật đang chọn, tên, chỉ số máu và mana.
2. Kỹ năng: vùng tùy chọn dành sẵn. Hiện chưa thiết kế skill.
3. Trang bị: vùng dành sẵn, hiện chưa thiết kế hệ thống trang bị.
4. Nhật ký: các sự kiện như người chơi tham gia, rời game, chết hoặc đạt thành tựu.
5. Hướng dẫn chơi ở dưới cùng.

Map giữ tỉ lệ, bảng thông tin không che nội dung map. Giao diện đồng bộ với template chọn lữ khách: nền ngoài #111111, panel gần đen #141414, khung xám có cạnh sáng trên/trái và cạnh tối dưới/phải tạo viền pixel. Tiêu đề vàng #ffdc00, nội dung trắng ngà, chữ phụ xám; font monospace có hỗ trợ tiếng Việt. Không bo góc hoặc dùng hiệu ứng kính. Nút hành động chính xanh #24ad60; trạng thái chọn có viền vàng. Avatar giữ nét pixel khi phóng to. Thanh trên cùng dành cho tên game, tên vùng, trạng thái mạng và rời game. Các nút hoặc chức năng chưa triển khai chỉ là đề xuất thiết kế.

## Nhân vật và phần chưa thiết kế

Avatar thể hiện nhân vật của người chơi, không dùng ảnh NPC hội thoại. HP trình bày bằng số và thanh để không phụ thuộc màu sắc. Số 100/100 trong mockup chỉ là dữ liệu minh họa: model Player hiện chưa có HP/MP.

Mana hiển thị `— / —` kèm “Chưa thiết kế mana”; chưa đặt giá trị tối đa, hồi phục hoặc tiêu hao. Skill và trang bị chỉ hiển thị chú thích, chưa gán số ô, loại slot, phím tắt hoặc biểu tượng chức năng. Khi có thiết kế riêng mới mở điều khiển tương ứng.

## Nhật ký

Mỗi dòng có thời gian và nội dung ngắn. Màu sắc có thể phân biệt nhóm sự kiện, nhưng nội dung phải tự giải thích được. Sự kiện chết và thành tựu trong ảnh là ví dụ cho bố cục; không có nghĩa đã triển khai trong game hoặc xảy ra trong map nghỉ. M0 vẫn không có chiến đấu hay sát thương.

Đề xuất nhật ký tự cuộn khi người dùng đang ở cuối. Nếu đang đọc dòng cũ, giữ vị trí và báo có dòng mới. Chặn tăng DOM vô hạn bằng giới hạn số dòng, mức cụ thể chọn khi triển khai. Tên và nội dung sự kiện phải render dưới dạng văn bản, không chèn HTML từ dữ liệu người chơi. Chưa mặc định lưu lịch sử qua phiên hoặc hiển thị sự kiện từ mọi map; phạm vi phân phối sự kiện cần thiết kế cùng giao thức.

## Di chuyển bằng chuột và tìm đường

Đã xác nhận ngày 17/11/2026: người chơi di chuyển bằng chuột, dùng thuật toán **A*** để tìm đường. Click trái vào ô đi được trên map để chọn đích; nhân vật đi theo đường hợp lệ, không đi xuyên vật cản. Click đích mới thay thế đường đang đi. Không dùng WASD hoặc phím mũi tên để di chuyển trong thiết kế này.

Áp dụng quy tắc tìm đường trong `game-design.md`, mục 5: lưới bốn hướng, không đi chéo; chi phí mỗi bước bằng 1, heuristic Manhattan. Client đổi vị trí chuột từ màn hình qua tỉ lệ canvas và camera sang tọa độ ô, dùng A* cho đường dự kiến. Server kiểm tra đích và tự tính đường trên collision chuẩn, quyết định vị trí theo thời gian; không tin đường đi do client cung cấp. Đây là yêu cầu thiết kế, chưa triển khai trong client/server hiện tại.

Click ô chặn hoặc đích không có đường tới thì báo “Không thể tới vị trí này”, không cho nhân vật xuyên vật cản. Click trên sidebar hoặc hộp thoại không phát lệnh di chuyển.

## Cách hoạt động tham khảo BrowserQuest

Đã đọc nguồn cục bộ BrowserQuest tại `client/js/game.js` (movecursor, click, makeNpcTalk), `client/js/pathfinder.js` và `client/js/lib/astar.js`. Đây là tham khảo cách thao tác, không sao chép toàn bộ giao diện hay mặc định các tính năng đã triển khai.

| Mục tiêu chuột | Hành vi đề xuất cho Lữ khách |
| --- | --- |
| Nền đi được | Click trái đặt đích; A* tìm đường, đánh dấu ô đích ngắn hạn. Click mới đổi đích. |
| NPC | Hover làm nổi mục tiêu; click tự đi tới ô kề cạnh hợp lệ rồi mở thoại. Nếu đã đứng kề thì mở ngay. Không đặt đích vào ô NPC. |
| Bảng tin | Cùng cách tiếp cận ô kề như NPC; tới nơi mới mở hai mục nhiệm vụ/thành tựu. |
| NPC dịch vụ | Tới ô kề rồi mở thoại hoặc cửa sổ dịch vụ đã có thiết kế; không mua đồ chỉ bằng click lên NPC. |
| Vật cản | Không đi xuyên; không tạo yêu cầu di chuyển hợp lệ tới chính ô bị chặn. |
| Sidebar/cửa sổ | Chỉ thao tác UI, không click xuyên xuống map. Có nút đóng rõ ràng. |

BrowserQuest phân biệt mob, item, NPC và rương ngay trong luồng click; NPC ở xa được tiếp cận trước khi nói chuyện. Với M0 chỉ áp dụng nền, NPC, dịch vụ và bảng tin. Không thêm quái hoặc rương vào làng. Hành vi chọn quái/tự tiếp cận đánh và tiếp cận nhặt đồ thuộc thiết kế ngoài làng trong `game-design.md`, không phải tính năng có sẵn do đổi UI.

Khi chọn NPC/bảng tin, lưu ý định tương tác và chỉ mở khi đã tới đủ gần. Click đích mới, chọn mục tiêu khác, rời map hoặc mất kết nối hủy ý định cũ, tránh mở nhầm cửa sổ khi nhân vật đến muộn. Server xác nhận khoảng cách cho hành động gameplay; client không tự quyết giao dịch hay tiến trình.

Hội thoại được đề xuất đặt dưới map, tách khỏi hướng dẫn cố định ở cuối sidebar. Avatar sidebar luôn là người chơi; tên/ảnh trong hội thoại là người đang nói. Ảnh xem trước minh họa trạng thái đang nói chuyện; ngoài trạng thái đó có thể ẩn hoặc để trống khung. Cửa hàng và bảng tin chỉ mở theo ngữ cảnh, không chiếm sidebar thường trực. Quy tắc này là đề xuất cho dự án mình; BrowserQuest nguồn sử dụng bong bóng thoại cho NPC.

## Hướng dẫn và màn hình nhỏ

Khung hướng dẫn nằm cuối sidebar, dùng các câu ngắn: “Click nền: chọn đích di chuyển”, “Click NPC: đến gần, trò chuyện”, “Click nơi khác: đổi đích di chuyển”. Nhân vật tự tìm đường tránh vật cản; không đưa tên thuật toán vào hướng dẫn dành cho người chơi. Khi chiều ngang thiếu, đề xuất chuyển sidebar xuống dưới map theo cùng thứ tự, tránh ép nhỏ map và chữ. Nhật ký có vùng cuộn riêng; hướng dẫn không nằm trong vùng cuộn nhật ký.

Ảnh không thêm các nút demo/kiểm thử từ mẫu tham khảo. Chat và danh sách người chơi hiện có chưa được quyết định vị trí trong bố cục mới; chưa có yêu cầu xóa hoặc bỏ các chức năng đó. Không tự bổ sung chúng vào bản phác này.

## Chuyển sang triển khai

Các file liên quan: `source/client/index.html` cho cấu trúc; `source/client/src/style.css` cho bố cục; `source/client/src/ui/GameUI.ts` cho hiển thị; các network handler cho cập nhật sự kiện. Cần bổ sung hợp đồng dữ liệu server/client trước khi hiển thị HP, MP và sự kiện gameplay thực. Bản thiết kế này không thay thế giao thức hiện hành.

Mockup được dựng bằng `statics/map-design/build_ui_preview.py`, đọc ảnh map từ `ben-co-map.png`. Đây là artifact thiết kế, không phải screenshot UI đang chạy.

## Điều chỉnh sau khi triển khai

Thông báo toast hiển thị giữa phía trên màn hình, dạng gọn, tự đóng sau 3 giây và tối đa hai thông báo cùng lúc. Nội dung thông báo cho phép click xuyên xuống vùng bên dưới; chỉ nút đóng nhận click. Không tự chiếm focus hoặc khóa thao tác chơi. Đã bỏ khung Hệ thống/hội thoại dưới map và các callback cập nhật khung này. Lời chào hiển thị qua toast; sự kiện tham gia/rời game tiếp tục ghi nhật ký. Hội thoại NPC sẽ được thiết kế riêng khi triển khai tương tác. Ảnh mockup bên trên chưa phản ánh điều chỉnh này.
