module.exports = function Cart(oldCart) {

    this.userCart = (oldCart == undefined) ? {} : oldCart.userCart;

    this.add = function (userid, id) {
        if (this.userCart[userid] === undefined) {
            this.userCart[userid] = {
                items: [],
                totalQty: 0
            };
        }
        this.userCart[userid].items.push(id);
        this.userCart[userid].totalQty++;
    };

    this.remove = function (userid, id) {
        var index = this.userCart[userid].items.indexOf(id);
        if (index >= 0) {
            this.userCart[userid].items.splice(index, 1);
            this.userCart[userid].totalQty--;
        }
    };

};
