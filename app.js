

//requiring all the modules
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose= require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const app = express();



app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: "My Mega Secret.",
    resave: false,
    saveUninitialized: false
}))


app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));
 
async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/userDB')
   
}

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secrets: [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});
 
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});



// passport.use(new GoogleStrategy({
//   clientID: process.env.CLIENT_ID,
//   clientSecret: process.env.CLIENT_SECRET,
//   callbackURL: "http://localhost:3000/auth/google/secrets",
//   userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
// },
// function(accessToken, refreshToken, profile, cb) {
//   User.findOrCreate({ googleId: profile.id }, function (err, user) {
//     return cb(err, user);
//   });
// }
// ));

passport.use(
  new GoogleStrategy({
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // console.log(profile);

        // Find or create user in your database
        let user = await User.findOne({
          googleId: profile.id
        });
        if (!user) {
          // Create new user in database
          const username =
            Array.isArray(profile.emails) && profile.emails.length > 0 ?
            profile.emails[0].value.split('@')[0] :
            '';
          const newUser = new User({
            username: profile.displayName,
            googleId: profile.id,
          });
          user = await newUser.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);




app.get("/",function (req,res) {
    res.render("home");
  });


app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
  );
  
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });
 

app.get("/login",function (req,res) {
    res.render("login");
  });
 
 
app.get("/register",function (req,res) {
    res.render("register");
  });



app.get("/secrets",function (req,res){
    if(req.isAuthenticated()){
      res.render("secrets");
    } else {
      res.redirect("/login");
    }
  });


  app.get("/logout",function(req,res){
    req.logOut(function(err){
      if(err){
        console.log(err);
      }
    });
    res.redirect("/");
  })
   


  app.post("/register",function (req,res) {
 
    User.register({username:req.body.username}, req.body.password, function(err, user) {
      if (err) { 
        console.log(err);
        res.redirect("/register");
       } else {
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
        })
        
       }
     
      });
   
    });
   
   
    app.post("/login",function(req,res){
      const user = new User({
        username:req.body.username,
        password:req.body.password
      })
   
      req.login(user,function(err){
   
        if (err) { 
          console.log(err);
          res.redirect("/login");
         } else {
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
          })
          
         }
       
      });
  })












app.listen(3000, function(){
    console.log("Server started on yo portman");
});
