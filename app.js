//express
var express = require('express');
var app = express();
var path = require('path');

//Handlebars
var handlebars = require('express-handlebars').create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//Set Ports
app.use(express.static(__dirname + '/public'));
app.set('port', process.env.PORT || 3000);

//
// require bodyParser
var bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

var cookieParser = require('cookie-parser');
app.use(cookieParser());

//Database
var mongojs = require('mongojs');
//Used the create ObjectID to search the _id field
var ObjectId = require('mongojs').ObjectID;

var db = mongojs('eProduce', ['items', 'orders']);
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginapp');

var routes = require('./routes/index');
var users = require('./routes/users');

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        //req.flash('error_msg','You are not logged in');
        res.redirect('/login');
    }
}


var User = require('./models/user');

// Register
app.get('/register', function(req, res){
    res.render('register');
});

// Login
app.get('/login', function(req, res){
    res.render('login');
});


// Register User
app.post('/register', function(req, res){
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;

    // Validation
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if(errors){
        res.render('register',{
            errors:errors
        });
    } else {
        var newUser = new User({
            name: name,
            email:email,
            username: username,
            password: password
        });

        User.createUser(newUser, function(err, user){
            if(err) throw err;
            console.log(user);
        });

        req.flash('success_msg', 'You are registered and can now login');

        res.redirect('/login');
    }
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
    if(err) throw err;
    if(!user){
        return done(null, false, {message: 'Unknown User'});
    }

    User.comparePassword(password, user.password, function(err, isMatch){
        if(err) throw err;
        if(isMatch){
            return done(null, user);
        } else {
            return done(null, false, {message: 'Invalid password'});
        }
    });
   });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

app.post('/login',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
    req.logout();

    req.flash('success_msg', 'You are logged out');

    res.redirect('/login');
});

//module.exports = router;
//module.exports = router;

//GET
//Render the 'Home' page
app.get('/', ensureAuthenticated, function (req, res) {
	res.render('home');
});


//GET
//Render the 'Place Order' page
app.get('/placeOrder', ensureAuthenticated, function (req, res) {     
        res.render('placeOrderReact');
});

//GET
//Render the 'View Order' page
app.get('/viewOrder', ensureAuthenticated, function (req, res) {
        res.render('viewOrder');
});

//GET
//Render the 'View Items' page
app.get('/viewItems', ensureAuthenticated, function (req, res) {
        res.render('viewItems');
});

//GET
//Render the 'Place Order React' page
app.get('/placeOrderReact', ensureAuthenticated, function (req, res) {
        res.render('placeOrderReact');
});
//Set up listener on port 3000
app.listen( app.get('port'), function () {
	console.log('App listening on 52.42.195.233:3000!');
	console.log('Stop with Ctrl-C');

});

//GET
//Get items from eProduce database
app.get('/items',function(req,res ){

        db.items.find(function(err,docs){
                if (err) {
                                console.log(err);
                } else {
                        res.json(docs);
                }
        });
});

//GET
//Get item given a plu
app.get('/items/:plu', function(req, res){
        db.items.find({"plu":req.params.plu}, function(err, docs){
                if(docs.length==0){
                        res.end("not found");
                }else {
                        res.json(docs);
                }
        });
});

//POST
//Add Item to items database
app.post('/items', function(req, res){

        var body = req.body;

        db.items.find({"plu":body.plu}, function(errFind, docsFind){

                if(docsFind.length==0){
                        db.items.insert(body, function(errAdd, docsAdd) {
                                if (errAdd) {
                                                console.log(errAdd);
                                } else {
                                        res.end("added");
                                }
                        });
                }else {
                        res.end("!added");
                }
        });
});

//PUT
//Change an item price, given a PLU
app.put('/items/:plu',function(req,res){
        
    var body = req.body;

        db.items.update({"plu" : req.params.plu}, {$set: body},  function(err, results) {
          
            if (results.n == 1) {
       
                    res.end("updated");
            }else {
       
                    res.end("!updated");
            }
        });
            
});

//Delete
//Delete an Item, given a PLU
app.delete('/items/:plu', function(req, res){

        db.items.remove({"plu" : req.params.plu}, function(err, docs) {
        if (err) {
                        console.log(err);
        } else {
                res.end("Deleted!");
        }
        });
});



//GET
//Get orders from eProduce database
app.get('/order', function (req, res){
        db.orders.find(function(err, docs){
                if (err) {
                        console.log(err);
                } else {
                        res.json(docs);
                }
        });
});

//GET
//Get order, given order id
app.get('/order/:id', function(req, res){

    db.orders.find({"_id":ObjectId(req.params.id)}, function (err, docs){
                if(err){
                    console.log(err);
                }else{
                    //Find returns an array.
                    //Since the _id field is unique, only send the first item
                    res.json(docs[0]);
                }
        });
});

//POST
//Add an order to the order database
app.post('/order', function(req, res){

        var body = req.body;

        db.orders.insert(body, function(err, docs) {
                if (err) {
                    console.log(err);
                } else {
                    res.end("Order Placed on " + docs.date);
                }
        });
});
