var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
    password: String,
    username: String,
    firstName: String,
    lastName: String,
    address: String,
    phoneNumber: String,
    dob: String,
    type: String,
    groupList: [{
        type: String
    }]
});
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model('User', userSchema);

module.exports = User;