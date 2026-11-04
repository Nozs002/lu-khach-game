
define(['item'], function(Item) {
    
    var Items = {
        
        Sword2: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.SWORD2, "weapon");
                this.lootMessage = "Bạn nhặt được kiếm thép";
            },
        }),

        Axe: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.AXE, "weapon");
                this.lootMessage = "Bạn nhặt được rìu";
            },
        }),

        RedSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDSWORD, "weapon");
                this.lootMessage = "Bạn nhặt được kiếm lửa";
            },
        }),

        BlueSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.BLUESWORD, "weapon");
                this.lootMessage = "Bạn nhặt được kiếm phép";
            },
        }),

        GoldenSword: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOLDENSWORD, "weapon");
                this.lootMessage = "Bạn nhặt được kiếm tối thượng";
            },
        }),

        MorningStar: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.MORNINGSTAR, "weapon");
                this.lootMessage = "Bạn nhặt được chùy gai";
            },
        }),

        LeatherArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.LEATHERARMOR, "armor");
                this.lootMessage = "Bạn mặc giáp da";
            },
        }),

        MailArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.MAILARMOR, "armor");
                this.lootMessage = "Bạn mặc giáp xích";
            },
        }),

        PlateArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.PLATEARMOR, "armor");
                this.lootMessage = "Bạn mặc giáp tấm";
            },
        }),

        RedArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.REDARMOR, "armor");
                this.lootMessage = "Bạn mặc giáp hồng ngọc";
            },
        }),

        GoldenArmor: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.GOLDENARMOR, "armor");
                this.lootMessage = "Bạn mặc giáp vàng";
            },
        }),

        Flask: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.FLASK, "object");
                this.lootMessage = "Bạn uống một bình hồi máu";
            },
        }),
        
        Cake: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.CAKE, "object");
                this.lootMessage = "Bạn ăn một chiếc bánh";
            },
        }),

        Burger: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.BURGER, "object");
                this.lootMessage = "Bạn ăn bánh kẹp thịt chuột";
            },
        }),

        FirePotion: Item.extend({
            init: function(id) {
                this._super(id, Types.Entities.FIREPOTION, "object");
                this.lootMessage = "Bạn cảm nhận sức mạnh của Firefox!";
            },
    
            onLoot: function(player) {
                player.startInvincibility();
            },
        }),
    };

    return Items;
});
