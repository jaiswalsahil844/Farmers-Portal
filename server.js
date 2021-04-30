var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var app = express();
var http = require('http').createServer(app);
var User = require('./models/user.js');
var Post = require('./models/post.js');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var passportLocalMongoose = require('passport-local-mongoose');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(require("express-session")({
    secret: "finish your work",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose.connect("mongodb+srv://sohail:pokemon@cluster0.bvvzh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority", { useNewUrlParser: true });

// HOMEPAGE REDIRECT TO REGISTER
app.get('/', (req, res) => {
    if (!req.isAuthenticated()) {
        // res.render("register.ejs");
        res.redirect('/index');
    }
    else {

        if(req.user.type=="Farmer"){
            res.redirect('/index_farmer');
        }
        else{
            res.redirect('/index_buyer');
        }
        
    }
});

app.get("/register", (req,res)=>{

    res.render("register.ejs")
})

// LOGIN PAGE
app.get('/login', function (req, res) {
    if (!req.isAuthenticated()) {
        res.render("login");
    }
    else {
        res.redirect('/index');
    }
});

app.post('/register', function (req, res) {
    User.register(
        {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: req.body.email,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address,
            dob: req.body.dob,
            type: req.body.type
        }
        , req.body.password, function (err, user) {
            if (err) {
                res.render('register', { flag : 1 });
            }
            else {
                res.redirect('/login');
            }
        });
});

// INDEX PAGE CONSIST OF LIST OF GROUPS
app.get('/index', (_req, res) => {
    if (!_req.isAuthenticated()) {
        res.render("index");
    }
    else if (_req.user.type == "Farmer") {
        res.render("index_farmer");
    }
    else {
        res.render("index_buyer");
    }
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

// CREATE NEW POST
app.get('/create', function (req, res) {
    if (req.isAuthenticated() && req.user.type == "Farmer") {
        res.render("create_post");
    }
});

app.post('/create', upload.single('image'), function (req, res) {
    if (req.isAuthenticated() && req.user.type === "Farmer") {
        console.log(req.file);
        var newPost = {
            category: req.body.category,
            product: req.body.product,
            quantity: req.body.quantity,
            quantity_unit: req.body.quantity_unit,
            price: req.body.price,
            price_unit: req.body.price_unit,
            description: req.body.description,
            image: req.file.path,
            author: {
                id: req.user._id,
                name: req.user.username
            }
        };
        //console.log(newPost);
        Post.create(newPost, function (err, post) {
            if (err) {
                res.render("create_post", {flag: 0});
            }
            else {
                console.log(post)
                req.user.posts.push(post);
                req.user.save();
                res.render("create_post", { flag: 1 });
            }
        });
    }
});

//PRODUCTS PAGE
app.get('/products', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.render("register.ejs");
    }
    else {
        let products = await Post.find();
        // res.send(products)
        res.render("buyer_products.ejs", {
            products: products
        })
    }

})

app.get('/myproducts', async (req, res)=>{
    if (!req.isAuthenticated()) {
        res.render("register.ejs");
    }
    else {
        console.log(req.user.username)
        let user = await User.find({username: req.user.username});
        console.log(user[0].posts)
        let productIds = user[0].posts;
        let products = [];
        for(let i=0;i<productIds.length;i++){
            console.log(productIds[i]);
            let product = await Post.findById(productIds[i]);
            console.log(product)
            products.push(product);
        }
        // res.send(products)
        res.render("products.ejs",{
        products: products
        })
    }

})

//PROFILE

app.get("/profile", async (req, res)=>{

    let user = await User.find({username: req.user.username});

    // res.send(user)
    res.render("profile.ejs", {
        user: user
    })

})

// CHECKING IF LOGIN IS SUCCESS OR NOT
app.post('/login', passport.authenticate("local", {
    successRedirect: "/index",
    failureRedirect: "/login_error"
}), function (req, res) {
        console.log("HELLO");
});

// LOGIN ERROR
app.get('/login_error', function (req, res) {
    if (!req.isAuthenticated()) {
        res.render("login", {flag: 1});
    }
    else {
        res.redirect('/index');
    }
});


http.listen(3000, function () {
    console.log('listening on : 3000');
});

app.listen(process.env.PORT, process.env.ID, () => console.log("SERVER RUNNING"));