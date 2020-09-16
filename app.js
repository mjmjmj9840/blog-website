//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const flash = require('connect-flash');
const http = require('http');
require('dotenv').config();

const app = express();

// Prevent Sleep in Heroku Server
setInterval(function () {
  http.get('https://mjmjmj9840-blog.herokuapp.com');
}, 600000);

// App Set
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connect and Set
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
});
mongoose.set('useCreateIndex', true);

// Post Shcema
const postsSchema = new mongoose.Schema({
  title: String,
  content: String,
  comments: Array,
});

const Post = new mongoose.model('Post', postsSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

// Passport Configure Strategy
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://mjmjmj9840-blog.herokuapp.com/auth/goolge/blog',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// Google Authentication
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get(
  '/auth/google/blog',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// Home Route
app.get('/', function (req, res) {
  Post.find({}, function (err, foundPosts) {
    if (err) {
      console.log(err);
      return;
    } else {
      if (req.isAuthenticated()) {
        // already login
        res.render('home', { headerName: 'header-login', posts: foundPosts });
      } else {
        res.render('home', { headerName: 'header', posts: foundPosts });
      }
    }
  });
});

// Contact Route
app.get('/contact', function (req, res) {
  if (req.isAuthenticated()) {
    // already login
    res.render('contact', { headerName: 'header-login' });
  } else {
    res.render('contact', { headerName: 'header' });
  }
});

// Compose Route
app.get('/compose', function (req, res) {
  if (req.isAuthenticated()) {
    // already login
    res.render('compose', { headerName: 'header-login' });
  } else {
    res.render('compose', { headerName: 'header' });
  }
});

app.post('/compose', function (req, res) {
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
    comments: [],
  });

  post.save(function (err) {
    if (!err) {
      res.redirect('/');
    }
  });
});

// Post Route
app.get('/posts/:postID', function (req, res) {
  const requestedID = req.params.postID;

  Post.findOne({ _id: requestedID }, function (err, foundPost) {
    if (!err) {
      if (!foundPost) {
        // Post가 없는 경우
        res.redirect('/');
      } else {
        if (req.isAuthenticated()) {
          res.render('post', {
            headerName: 'header-login',
            title: foundPost.title,
            contents: foundPost.content,
          });
        } else {
          res.redirect('/login');
        }
      }
    }
  });
});

// Login Route
app.get('/login', function (req, res) {
  const fmsg = req.flash();
  var msg = 'LOGIN'; // default message
  if (fmsg.error) {
    msg = fmsg.error[0]; // error message
  }

  if (req.isAuthenticated()) {
    // already login
    res.render('login', { headerName: 'header-login', loginMessage: msg });
  } else {
    res.render('login', { headerName: 'header', loginMessage: msg });
  }
});

app.post('/login', function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect('/login');
    } else {
      passport.authenticate('local', { failureRedirect: '/login', failureFlash: true })(
        req,
        res,
        function () {
          res.redirect('/');
        }
      );
    }
  });
});

// Sign Up Route
app.get('/signUp', function (req, res) {
  if (req.isAuthenticated()) {
    // already login
    res.render('signUp', { headerName: 'header-login' });
  } else {
    res.render('signUp', { headerName: 'header' });
  }
});

app.post('/signUp', function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect('/signUp');
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/');
      });
    }
  });
});

// Starting Server
let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}

app.listen(port, function () {
  console.log('Server started successfully.');
});
