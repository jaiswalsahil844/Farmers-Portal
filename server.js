var express = require("express");
const stripe = require("stripe")("sk_test_MgFRWqSGP7RlXOY2Tn7fs1V900KzGb6WvH");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var app = express();
var User = require("./models/user.js");
var Post = require("./models/post.js");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var multer = require("multer");
var upload = multer({ dest: "uploads/" });
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var http = require("http").createServer(app);
var io = require('socket.io')(http);
var sharedsession = require("express-socket.io-session");
const { Console } = require("console");

app.set("view engine", "ejs");

app.use(express.static('.'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(session);
app.use(passport.initialize());
app.use(passport.session());

io.use(sharedsession(session));

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose.connect(
    "mongodb+srv://sohail:pokemon@cluster0.bvvzh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
    { useNewUrlParser: true }
);

// HOMEPAGE REDIRECT TO REGISTER
app.get("/", (req, res) => {
    if (!req.isAuthenticated()) {
        // res.render("register.ejs");
        res.render("index");
    } else {
        if (req.user.type == "Farmer") {
            res.render("index_farmer");
        } else {
            res.render("index_buyer");
        }
    }
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

// LOGIN PAGE
app.get("/login", function (req, res) {
    if (!req.isAuthenticated()) {
        res.render("login");
    } else {
        res.redirect("/index");
    }
});

app.post("/register", function (req, res) {
    User.register(
        {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: req.body.email,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address,
            dob: req.body.dob,
            type: req.body.type
        },
        req.body.password,
        function (err, user) {
            if (err) {
                res.render("register", { flag: 1 });
            } else {
                res.redirect("/login");
            }
        }
    );
});

// INDEX PAGE CONSIST OF LIST OF GROUPS
app.get("/index", (_req, res) => {
    console.log("Working");
    if (!_req.isAuthenticated()) {
        res.render("index");
    } else if (_req.user.type === "Farmer") {
        res.render("index_farmer");
    } else {
        res.render("index_buyer");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// CREATE NEW POST
app.get("/create", function (req, res) {
    if (req.isAuthenticated() && req.user.type === "Farmer") {
        res.render("create_post");
    }
});

app.post("/create", upload.single("image"), function (req, res) {
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
                name: req.user.username,
            },
        };
        //console.log(newPost);
        Post.create(newPost, function (err, post) {
            if (err) {
                res.render("create_post", { flag: 0 });
            } else {
                console.log(post);
                req.user.posts.push(post);
                req.user.save();
                res.render("create_post", { flag: 1 });
            }
        });
    }
});

//PRODUCTS PAGE
app.get("/products", async (req, res) => {

    if (!req.isAuthenticated()) {
        res.render("register.ejs");
    } else {
        let user = await User.find({ username: req.user.username });
        let products = await Post.find();
        // res.send(products)
        res.render("buyer_products.ejs", {
            products: products,
            cart: req.user.cart,
            user: user
        });
    }
});

app.get("/myproducts", async (req, res) => {
    if (!req.isAuthenticated()) {
        res.render("register.ejs");
    } else {
        console.log(req.user.username);
        let user = await User.find({ username: req.user.username });
        console.log(user[0].posts);
        let productIds = user[0].posts;
        let products = [];
        for (let i = 0; i < productIds.length; i++) {
            console.log(productIds[i]);
            let product = await Post.findById(productIds[i]);
            console.log(product);
            products.push(product);
        }
        // res.send(products)
        res.render("products.ejs", {
            products: products,
            user: user
        });
    }
});

//PROFILE

app.get("/profile", async (req, res) => {
    let user = await User.find({ username: req.user.username });

    // res.send(user)
    res.render("profile.ejs", {
        user: user,
    });
});

// CHECKING IF LOGIN IS SUCCESS OR NOT
app.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/index",
        failureRedirect: "/login_error",
    }),
    function (req, res) {
        console.log("HELLO");
    }
);

// LOGIN ERROR
app.get("/login_error", function (req, res) {
    if (!req.isAuthenticated()) {
        res.render("login", { flag: 1 });
    } else {
        res.redirect("/index");
    }
});

// ADD TO CART
app.get("/add-to-cart/:id", function (req, res) {
    var productId = req.params.id;
    Post.findById(productId, function (err, product) {
        if (err) console.log(err);
        else {
            req.user.cart.push(productId);
            req.user.qty.push(1);
            req.user.save(function () {
                res.redirect("/products");
            });
        }
    });
});

app.get("/add-and-buy/:id", function (req, res) {
    var productId = req.params.id;
    Post.findById(productId, function (err, product) {
        if (err) console.log(err);
        else {
            req.user.cart = []
            req.user.cart.push(productId);

            req.user.qty = []
            req.user.qty.push(1);
            req.user.save(function () {
                res.redirect("/payment");
            });
        }
    });
});

// REMOVE FROM CART
app.get("/remove-from-cart/:id", function (req, res) {
    var productId = req.params.id;
    Post.findById(productId, function (err, product) {
        if (err) console.log(err);
        else {
            let index = req.user.cart.indexOf(productId);
            if (index >= 0) {
                req.user.cart.splice(index, 1);
                req.user.qty.splice(index, 1);
            }
            req.user.save();
            req.user.save(function () {
                console.log(req.user.cart);
                res.redirect("/products/");
            });
        }
    });
});

// REMOVE FROM CART FROM CART_PAGE
app.get("/cart/:id", function (req, res) {
    var productId = req.params.id;
    Post.findById(productId, function (err, product) {
        if (err) console.log(err);
        else {
            let index = req.user.cart.indexOf(productId);
            if (index >= 0) {
                req.user.cart.splice(index, 1);
                req.user.qty.splice(index, 1);
            }
            req.user.save(function () {
                console.log(req.user.cart);
                res.redirect("/cart/");
            });
            
        }
    });
});

app.get("/cart", async (req, res) => {
    let cart = req.user.cart;
    console.log(cart);
    console.log(req.user.qty);
    let user = await User.find({ username: req.user.username });
    let products = [];
    for (let i = 0; i < cart.length; i++) {
        let product = await Post.findById(cart[i]);
        products.push(product);
    }
    res.render("cart.ejs", {
        products: products,
        user: user,
        qty: req.user.qty
    });
});

app.get("/add-and-buy/:id", function (req, res) {
    var productId = req.params.id;
    Post.findById(productId, function (err, product) {
        if (err) console.log(err);
        else {
            req.user.cart = []
            req.user.cart.push(productId);

            req.user.qty = []
            req.user.qty.push(1);
            req.user.save(function () {
                res.redirect("/cart");
            });
        }
    });
});

io.on('connection', function (socket) {
    console.log("connected");
    socket.on('to-server', function (data) {
        User.findOne({ username: socket.handshake.session.passport.user }, function (err, user) {
            if (err)
                console.log(err);
            else {
                let index = user.cart.indexOf(data.id);
                user.qty[index] = parseInt(data.value);
                User.update({ username: socket.handshake.session.passport.user }, { $set: user }, function (err, updatedUser) {
                    if (err)
                        console.log(err);
                    else {
                        //console.log(updatedUser);
                        io.emit('to-client', {});
                    }
                });
            }
              
        });
    });

});

// PAYMENT
// const calculateOrderAmount = amount => {
    
//     return amount;
//   };

function makeid(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
        charactersLength)));
   }
   return result.join('');
}

//UPDATE CART
app.post("/update-cart", async(req,res)=>{

    if (!req.isAuthenticated()) {
        res.render("index");
    } else {
        if (req.user.type == "Buyer") {

            let products = req.user.cart;
            let quantities = req.user.qty;

            let order = {};
            order["order_id"] = makeid(5);
            order["products"] = [];
            order["quantities"] = quantities;
            for(let i=0;i<products.length;i++){
                let product = await Post.findById(products[i]);
                let dp = {...product};
                let dummyProduct = dp._doc;
                dummyProduct["buyer"] = req.user.username;
                dummyProduct["quantity_bought"] = quantities[i];
                dummyProduct["price_bought"] = product.price;
                order["products"].push(product);

                let newQuantity = product.quantity - quantities[i];
                let farmer = await User.findById(product.author.id);

                if(newQuantity == 0){
                    let index = farmer.posts.indexOf(product._id);
                    console.log("index", index);
                    if (index >= 0) {
                        farmer.posts.splice(index, 1);
                    }
                    console.log(farmer.posts);
                    await product.remove();
                }
                else{
                    let newP = await product.update({quantity: newQuantity});
                    console.log(newP)
                }
                
                farmer.orders.push(dummyProduct);
                farmer.save();
                console.log(farmer.posts);
            }

            req.user.orders.push(order)

            // User.findByIdAndUpdate(req.user._id, {orders:req.user.orders},
            //     function (err, docs) {
            //         if (err){
            //         console.log(err)
            //         }
            //         else{
            //             console.log("Updated User : ", docs);
            //         }
            // });

            req.user.cart = [];
            req.user.qty = [];
            req.user.save();
        }
    }
    
})

// VIEW ORDERS
app.get("/orders", async(req, res)=>{

    if (!req.isAuthenticated()) {
        // res.render("register.ejs");
        res.render("index");
    } else {
        let orders = req.user.orders;
        if (req.user.type == "Farmer") {
            res.send({
                orders
            })
        } else {
            res.send({
                orders
            })
        }
    }

})

app.post("/create-payment-intent", async (req, res) => {
    let products = req.user.cart;
    let quantities = req.user.qty;

    let amount = 0;

    for(let i=0;i<products.length;i++){
        let product = await Post.findById(products[i]);
        let quantity = quantities[i];
        amount += product.price*quantity;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount*100,
      currency: "inr"
    });
    
    res.send({
      clientSecret: paymentIntent.client_secret
    });
    
  });

app.get('/payment', async (req,res)=>{

    let products = req.user.cart;
    let quantities = req.user.qty;

    let amount = 0;
    
    for(let i=0;i<products.length;i++){
        let product = await Post.findById(products[i]);
        let quantity = quantities[i];
        amount += product.price*quantity;
    }

    res.render("checkout.ejs",{
        amount
    });
})

// Remove item from my products page
app.get("/removeFromMyProducts/:id", async (req, res) => {
    let productId = req.params.id;
    Post.findById(productId, async (err, product) => {
        if (err) console.log(err);
        else {
	     let user = await User.find({ username: req.user.username });
            let product = Post.findById(productId);
            let index=req.user.posts.indexOf(productId);
            req.user.posts.splice(index, 1 );
            req.user.save();
            res.redirect("/myproducts");  
        }
    });
    Post.findByIdAndDelete(productId, function (err, docs) {
        if (err){
            console.log(err)
        }
        else{
            console.log("Deleted : ", docs);
        }
    });  
});

http.listen(3000, function () {
    console.log("listening on : 3000");
});

app.listen(process.env.PORT, process.env.ID, () =>
    console.log("SERVER RUNNING")
);
