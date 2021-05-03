module.exports = function Cart(oldCart) {
    this.items = oldCart.items || [];
    this.totalQty = oldCart.totalQty || 0;

    this.add = function (id) {
        this.items.push(id);
        this.totalQty++;
    };

    this.remove = function (id) {
        var index = this.items.indexOf(id);
        if (index >= 0) {
            this.items.splice(index, 1);
            this.totalQty--;
        }
    }

    this.generateArray = function () {
        return this.items;
    };

};