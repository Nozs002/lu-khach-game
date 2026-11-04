
define(['character'], function(Character) {

    var NpcTalk = {
        "guard": [
            "Chào bạn.",
            "Không cần kiểm tra giấy tờ đâu.",
            "Bạn không phải người chúng tôi đang tìm.",
            "Đi tiếp đi, đi tiếp đi…"
        ],
        "king": [
            "Chào, ta là nhà vua.",
            "Ta cai quản nơi này.",
            "Đúng phong thái nhà vua!",
            "Ta trò chuyện với thần dân.",
            "Đúng phong thái nhà vua!",
            "Ta đội vương miện.",
            "Đúng phong thái nhà vua!",
            "Ta chẳng làm gì suốt cả ngày.",
            "Đúng phong thái nhà vua!",
            "Giờ hãy để ta yên.",
            "Đúng phong thái nhà vua!"
        ],
        "villagegirl": [
            "Chào nhà thám hiểm!",
            "Bạn thấy trò chơi này thế nào?",
            "Mọi thứ diễn ra trong một trang web! Thật khó tin nhỉ?",
            "Tất cả là nhờ công nghệ WebSockets.",
            "Tôi không hiểu nhiều lắm, dù sao tôi cũng chỉ là một chương trình.",
            "Bạn có thể đọc <a target=\"_blank\" href=\"http://hacks.mozilla.org/2012/03/browserquest/\">bài viết này</a> để tìm hiểu thêm!"
        ],
        "villager": [
            "Chào người lạ. Bạn có thích thơ không?",
            "Hoa hồng đỏ, hoa tím xanh…",
            "Tôi săn lũ chuột, bạn cùng đồng hành…",
            "Chuột đã chết hết, giờ làm gì đây?",
            "Thật lòng tôi chẳng biết hay.",
            "Hay vào rừng thẳm, khám phá điều hay…",
            "Hoặc nấu nồi chuột, ăn ngay cho đầy."
        ],
        "agent": [
            "Đừng cố uốn cong thanh kiếm.",
            "Điều đó là không thể.",
            "Thay vào đó, hãy nhận ra sự thật…",
            "Không hề có thanh kiếm nào."
        ],
        "rick": [
            "Tình yêu đâu còn xa lạ với đôi ta.",
            "Em hiểu luật chơi, anh cũng vậy.",
            "Anh chỉ nghĩ đến một lời hẹn trọn đời.",
            "Chẳng ai khác trao em điều ấy.",
            "Anh chỉ muốn nói điều mình cảm thấy.",
            "Để em hiểu được lòng anh.",
            "Anh sẽ chẳng bao giờ từ bỏ em.",
            "Chẳng bao giờ khiến em thất vọng.",
            "Chẳng bao giờ quay lưng bỏ em lại.",
            "Chẳng bao giờ làm em khóc.",
            "Chẳng bao giờ nói lời tạm biệt.",
            "Chẳng bao giờ dối lừa làm em đau."
        ],
        "scientist": [
            "Xin chào.",
            "Tôi đã phát minh ra hai loại thuốc này.",
            "Bình màu đỏ sẽ hồi phục máu…",
            "Bình màu cam biến bạn thành cáo lửa và giúp bạn bất tử…",
            "Nhưng hiệu lực chỉ kéo dài một lúc.",
            "Hãy sử dụng cho thật khéo nhé!",
            "Giờ xin phép, tôi phải quay lại thí nghiệm…"
        ],
        "nyan": [
            "Meo meo meo meo meo",
            "Meo meo meo meo meo meo meo",
            "Meo meo meo meo meo meo",
            "Meo meo meo meo meo meo meo meo"
        ],
        "beachnpc": [
            "Đừng để ý đến tôi, tôi chỉ đang nghỉ dưỡng thôi.",
            "Nhưng phải công nhận…",
            "Lũ cua khổng lồ này thật phiền phức.",
            "Bạn giúp tôi dẹp chúng được không?"
        ],
        "forestnpc": [
            "Khu rừng này ẩn giấu rất nhiều điều.",
            "Cẩn thận với những sinh vật trong bóng tối."
        ],
        "desertnpc": [
            "Không ai có thể cứ thế bước vào dãy núi này…",
            "Nghe nói một chúa tể xác sống cổ đại đang ngự trị ở đây.",
            "Chẳng ai biết chính xác hắn trông thế nào…",
            "…vì chưa ai sống sót trở về kể lại.",
            "Quay đầu về nhà vẫn còn kịp đấy, nhóc."
        ],
        "lavanpc": [
            "Bạn đã đến vùng núi lửa.",
            "Hãy chuẩn bị thật kỹ trước khi đi tiếp."
        ],
        "priest": [
            "Ồ, chào người bạn trẻ.",
            "Tri thức rất quý giá, để ta chỉ cho bạn vài điều.",
            "Bạn có thể tự do đi khắp thế giới này.",
            "Nhưng hãy cẩn thận với kẻ địch đang chờ phía trước.",
            "Đánh bại kẻ địch sẽ giúp bạn tìm được vũ khí và áo giáp.",
            "Kẻ địch càng mạnh, phần thưởng càng quý.",
            "Khám phá và săn quái còn giúp bạn mở khóa thành tích.",
            "Nhấn biểu tượng chiếc cúp để xem danh sách thành tích.",
            "Hãy nán lại và tận hưởng những bất ngờ của BrowserQuest.",
            "Tạm biệt, người bạn trẻ."
        ],
        "sorcerer": [
            "À… ta đã biết trước bạn sẽ đến gặp ta.",
            "Thế nào? Bạn thấy cây trượng mới của ta chứ?",
            "Ấn tượng lắm phải không?",
            "Bạn hỏi ta lấy nó ở đâu à?",
            "Ta hiểu mà. Ai nhìn cũng phải thèm muốn.",
            "Ta tự chế tạo đấy, bằng phép thuật cao siêu của mình.",
            "Nhưng để ta nói bạn nghe…",
            "Trò chơi này có rất nhiều vật phẩm.",
            "Có món mạnh hơn những món khác.",
            "Muốn tìm được chúng, bạn phải chịu khó khám phá.",
            "Chúc may mắn."
        ],
        "octocat": [
            "Chào mừng đến với BrowserQuest!",
            "Bạn muốn xem mã nguồn không?",
            "Hãy ghé <a target=\"_blank\" href=\"http://github.com/mozilla/BrowserQuest\">kho mã nguồn trên GitHub</a>."
        ],
        "coder": [
            "Chào! Bạn biết BrowserQuest cũng chơi được trên máy tính bảng và điện thoại chứ?",
            "Đó là điều tuyệt vời của HTML5!",
            "Hãy thử xem nhé…"
        ],
        "othernpc": [
            "Chào người lữ khách.",
            "Chúc bạn lên đường may mắn."
        ]
    };

    var Npc = Character.extend({
        init: function(id, kind) {
            this._super(id, kind, 1);
            this.itemKind = Types.getKindAsString(this.kind);
            this.talkCount = NpcTalk[this.itemKind].length;
            this.talkIndex = 0;
        },
    
        talk: function() {
            var msg = null;
        
            if(this.talkIndex > this.talkCount) {
                this.talkIndex = 0;
            }
            if(this.talkIndex < this.talkCount) {
                msg = NpcTalk[this.itemKind][this.talkIndex];
            }
            this.talkIndex += 1;
            
            return msg;
        }
    });
    
    return Npc;
});