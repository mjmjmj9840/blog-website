//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect('mongodb+srv://_@cluster0.suwaf.mongodb.net/blogDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
});

const postsSchema = {
  title: String,
  content: String,
};

const Post = mongoose.model('Post', postsSchema);

app.get('/', function (req, res) {
  Post.find({}, function (err, foundPosts) {
    if (!err) {
      res.render('home', { posts: foundPosts });
    }
  });
});

app.get('/contact', function (req, res) {
  res.render('contact');
});

app.get('/compose', function (req, res) {
  res.render('compose');
});

app.get('/posts/:postID', function (req, res) {
  const requestedID = req.params.postID;

  Post.findOne({ _id: requestedID }, function (err, foundPost) {
    if (!err) {
      if (!foundPost) {
        // Post가 없는 경우
        res.redirect('/');
      } else {
        res.render('post', { title: foundPost.title, contents: foundPost.content });
      }
    }
  });
});

app.post('/compose', function (req, res) {
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
  });

  post.save(function (err) {
    if (!err) {
      res.redirect('/');
    }
  });
});

let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}

app.listen(port, function () {
  console.log('Server started successfully.');
});
