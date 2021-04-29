var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var postSchema = new mongoose.Schema({
    category: String,
    product: String,
    quantity: Number,
    quantity_unit: String,
    price: Number,
    price_unit: String,
    description: String,
    image: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        name: String
    }
});

var Post = mongoose.model('Post', postSchema);

module.exports = Post;
