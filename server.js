var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var app = express();
var User = require('./models/user.js');
var Post = require('./models/post.js');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var passportLocalMongoose = require('passport-local-mongoose');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var session = require('express-session');
var MongoStore = require('connect-mongo');
var Cart = require('./models/cart.js');

const stripe = require("stripe")("sk_test_MgFRWqSGP7RlXOY2Tn7fs1V900KzGb6WvH");

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: "finish your work",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: "mongodb+srv://sohail:pokemon@cluster0.bvvzh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
    }),
    cookie: { maxAge: 180 * 60 * 1000  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});

var http = require('http').createServer(app);

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

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

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
    console.log("Working");
    if (!_req.isAuthenticated()) {
        res.render("index");
    }
    else if (_req.user.type === "Farmer") {
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
    if (req.isAuthenticated() && req.user.type === "Farmer") {
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
                console.log(post);
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
        });
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
    });

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

// ADD TO CART
app.get('/add-to-cart/:id', function (req, res) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    Post.findById(productId, function (err, product) {
        if (err)
            console.log(err);
        else {
            cart.add(product.id);
            req.session.cart = cart;
            console.log(cart);
            res.redirect('/products');
        }
    });
});

// REMOVE FROM CART
app.get('/remove-from-cart/:id', function (req, res) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    Post.findById(productId, function (err, product) {
        if (err)
            console.log(err);
        else {
            cart.remove(product.id);
            req.session.cart = cart;
            console.log(cart);
            res.redirect('/products');
        }
    });
});


const calculateOrderAmount = amount => {
    
    return 10000;
};

app.post("/create-payment-intent", async (req, res) => {
    const { amount } = req.body;
    // Create a PaymentIntent with the order amount and currency
    console.log(amount);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(amount),
        currency: "inr"
    });

    res.send({
        clientSecret: paymentIntent.client_secret
    });

});

app.get('/cart/payment', (req, res) => {
    res.render("checkout.ejs");
});

app.get("/cart", async (req, res) => {
    let cart = req.session.cart;
    console.log(cart);

    let products = [];
    for (let i = 0; i < cart.items.length; i++) {
        let product = await Post.findById(cart.items[i]);
        console.log(product);
        products.push(product);
    }
    res.render("cart.ejs", {
        products: products,
    });
});



http.listen(3000, function () {
    console.log('listening on : 3000');
});

app.listen(process.env.PORT, process.env.ID, () => console.log("SERVER RUNNING"));