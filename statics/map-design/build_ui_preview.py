"""Static layout study. Uses the existing map mockup; does not change game UI."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
REPO = OUT.parent.parent
im = Image.new('RGB', (1528, 940), '#111111')
d = ImageDraw.Draw(im)
def f(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('courbd.ttf' if bold else 'cour.ttf'), size)
def text(x,y,s,size=18,color='#e2e2e2',bold=False):
    d.text((x,y),s,font=f(size,bold),fill=color)
def panel(x,y,w,h,title):
    d.rectangle((x,y,x+w,y+h),fill='#141414',outline='#555555',width=2)
    d.rectangle((x+2,y+2,x+w-2,y+35),fill='#171717')
    d.line((x+1,y+h-1,x+1,y+1,x+w-1,y+1),fill='#888888',width=3)
    d.line((x+w-1,y+1,x+w-1,y+h-1,x+1,y+h-1),fill='#292929',width=3)
    d.line((x+12,y+37,x+w-12,y+37),fill='#444444',width=1)
    text(x+14,y+8,title,16,'#ffdc00',True)

text(28,20,'LỮ KHÁCH',30,'#ffdc00',True)
text(250,29,'BẾN CỎ  /  Khu vực an toàn',19,'#cccccc')
d.ellipse((1135,31,1145,41),fill='#73bc8f')
text(1155,25,'Đã kết nối',18)
d.rectangle((1360,17,1498,58),fill='#242424',outline='#666666',width=2)
text(1390,28,'Rời game',17)

world=Image.open(OUT/'ben-co-map.png').convert('RGB').resize((1024,768),Image.Resampling.NEAREST)
im.paste(world,(28,84))
d.rectangle((26,82,1053,853),outline='#777777',width=2)
# Caption sits outside map so the mockup preserves all map cells.
# An example dialogue, separate from the persistent help panel.
d.rectangle((28,870,1052,928),fill='#101010',outline='#777777',width=3)
text(45,878,'NGƯỜI ĐÓN KHÁCH · hội thoại minh họa',15,'#ffdc00',True)
text(45,901,'Chào bạn! Tạp hóa ở phía tây, bảng tin ở phía đông quảng trường.',16)


x=1076;w=424
panel(x,84,w,174,'NHÂN VẬT')
d.rectangle((x+16,132,x+96,212),fill='#080808',outline='#ffdc00',width=2)
avatar_path=REPO/'source/client/public/assets/characters/knight.png'
avatar=Image.open(avatar_path).convert('RGBA')
avatar=avatar.resize((64,64),Image.Resampling.NEAREST)
im.paste(avatar,(x+24,140),avatar)
text(x+112,133,'Hoàng (Bạn)',23,'#ffdc00',True)
text(x+112,164,'HP 100/100 · mẫu',15)
d.rectangle((x+112,188,x+w-18,201),fill='#080808')
d.rectangle((x+113,189,x+w-19,200),fill='#24ad60')
text(x+16,227,'MP   — / —   Chưa thiết kế mana',16,'#999999')

panel(x,270,w,82,'KỸ NĂNG')
text(x+16,318,'Chưa thiết kế kỹ năng',16,'#999999')
panel(x,364,w,92,'TRANG BỊ')
text(x+16,411,'Chưa thiết kế hệ thống trang bị',16,'#999999')

panel(x,468,w,228,'NHẬT KÝ')
entries=[('09:41','Hệ thống','Chào mừng bạn đến Bến Cỏ.','#ffdc00'),('09:42','Tham gia','Người chơi A đã tham gia.','#8fccac'),('09:43','Rời game','Người chơi A đã rời game.','#b6c2c4'),('09:44','Chiến đấu','Người chơi B đã chết.','#dea38d'),('09:45','Thành tựu','C đạt “Lần đầu khám phá”.','#dbca88')]
for i,(time,kind,msg,color) in enumerate(entries):
    y=511+i*34
    text(x+15,y,time,14,'#8fa4a3')
    text(x+65,y,msg,14,color)
d.rectangle((x+w-10,512,x+w-6,681),fill='#080808')
d.rectangle((x+w-10,604,x+w-6,681),fill='#777777')
text(x+16,677,'Sự kiện mẫu để minh họa bố cục',12,'#91a19c')

panel(x,708,w,144,'HƯỚNG DẪN CHƠI')
text(x+16,755,'Click nền: chọn đích di chuyển.',16)
text(x+16,786,'Click NPC: đến gần, trò chuyện.',16)
text(x+16,816,'Click nơi khác: đổi đích di chuyển.',15,'#999999')
text(x,879,'Bản thiết kế · dữ liệu minh họa',14,'#aaaaaa')
im.save(OUT/'ben-co-ui-preview.png')
print(OUT/'ben-co-ui-preview.png')
