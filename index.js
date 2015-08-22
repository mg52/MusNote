/*
mg52 - Mus
*/
var port = process.env.PORT || 5000;
var express = require('express');
var app = express();
var server = app.listen(port);

var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

var mongoose = require('mongoose');
/*var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://user:password@ds027483.mongolab.com:27483/heroku_31dfrws9';*/
//var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/mushost';
var uristring = process.env.MONGOLAB_URI;
mongoose.connect(uristring);
var UserSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	email: {type: String, required: true, unique: true},
  	admin: Boolean,
  	notes: String
});
var User = mongoose.model('User', UserSchema);
module.exports = User;

var expressSession = require('express-session');
app.use(expressSession({secret:'musSecret'}));

app.set('view engine', 'jade');

var sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var users = [];
var usercount = 0;
var deleteduser = '';
var sendusers = new String;

app.get('/', function (req, res) {
	if(req.session.user){
	if(!req.session.admin)
		res.redirect('/login');
	else
		res.redirect('/admin');
	}
	else 
		res.render('index');
});
app.get('/login', function (req, res) {
	if(req.session.user)
		res.render('login', { loginmessage: req.session.user + " !", 
		username: req.session.user, 
		password: req.session.password,
		email: req.session.email,
		admin: req.session.admin,
		notes: req.session.notes});
	else 
		res.redirect('/');
});
app.get('/admin', function (req, res) {
	if(req.session.user){
	if(deleteduser == '')
		res.render('admin', { loginmessage: req.session.user + " !", 
		username: req.session.user, 
		password: req.session.password,
		email: req.session.email,
		admin: req.session.admin, 
		totalusers: sendusers
		});
	else
		res.render('admin', { loginmessage: req.session.user + " !", 
		username: req.session.user, 
		password: req.session.password,
		email: req.session.email,
		admin: req.session.admin,
		totalusers: sendusers,
		deleteduser: deleteduser + " deleted!"
		});
		deleteduser = '';
		}
	else 
		res.redirect('/');
});
app.post('/login', function (req, res) {
  	delete req.session.user;
  	delete req.session.password;
	delete req.session.email;
  	delete req.session.admin;
	delete req.session.notes;
  	var post = req.body;
  	User.findOne({ 'username': post.user }, function(err, user) {
  if (err) throw err;
  if(user){
	if(post.password == user.password){
		req.session.user = user.username;
		req.session.password = user.password;
		req.session.email = user.email;
		req.session.admin = user.admin;
		req.session.notes = user.notes;
		console.log(req.session.user + " logged in.");
		if(req.session.admin == true){
			findall();
			/*sendgrid.send({
			to:       'mgords@gmail.com',
  			from:     'mus@mus.com',
  			subject:  'Hello World',
  			text:     'Selam baba' + req.session.user
			}, function(err, json) {
  				if (err) { return console.error(err); }
  				console.log(json);
			});*/
			res.redirect('/admin');
		}
		else
			res.redirect('/login');
	}
	else res.redirect('badUserLogIn');
  }
  else res.redirect('badUserLogIn');
});
});
app.post('/addNote', function (req,res) {
	var post = req.body;
	if(req.session.user) {
		var new_note = post.sendnote;
		User.findOne({ 'username': req.session.user }, function(err, user) {
			if (err) throw err;
			user.notes = new_note;
			user.save(function(err) {
				if (err) throw err;
				console.log(user.notes + 'Note Added!');
			});
		});
		req.session.notes = new_note;
		res.render('login', {
			loginmessage: req.session.user + " !",
			username: req.session.user,
			password: req.session.password,
			email: req.session.email,
			admin: req.session.admin,
			notes: req.session.notes
		});
	}
	else
		res.redirect('/');
});
app.get('/addUser', function (req, res) {
	if(req.session.user)
		res.render('index', { signupmessage: req.session.user + " added!"});
	else
		res.render('index');
});

app.post('/addUser', function (req, res) {
  	var post = req.body;
  	req.session.user = post.adduser;
  	req.session.password = post.addpassword;
	req.session.email = post.addemail;
  	req.session.admin = false;
	req.session.notes = "";
  	var new_user = new User({
  	username: req.session.user,
  	password: req.session.password,
	email: req.session.email,
  	admin: req.session.admin,
	notes: req.session.notes	
});
	new_user.save(function (err, new_user) {
            if (err) {
				res.redirect('/badUserSignUp');
				console.log(req.session.user + " is using by someone else!")
			}
			else{
				res.redirect('/addUser');
				console.log(req.session.user + " " + req.session.password + ' User saved successfully!');
			}
        });
});
app.get('/badUserSignUp', function (req, res) {
	res.render('index', { signupmessage: "Bad Username or Password"});
});
app.get('/badUserLogIn', function (req, res) {
	res.render('index', { loginmessage: "Bad Username or Password"});
});
app.post('/delete', function (req, res) {
  var deleted_user = req.session.user;
  User.findOneAndRemove({ username: req.session.user }, function(err) {
  if (err) throw err;
  console.log(deleted_user + ' deleted!');
});
  	delete req.session.user;
  	delete req.session.password;
	delete req.session.email;
 	delete req.session.admin;
	res.redirect('/');
});
app.post('/deletebyname', function (req, res) {
  var post = req.body;
  
  if(post.username != 'mustafa')
  User.findOneAndRemove({ username: post.username }, function(err, numberRemoved) {
	if (err) throw err;
	if(numberRemoved != null){
	deleteduser = post.username;
	console.log(deleteduser + ' deleted!');
	}
	findall();
    res.redirect('/admin');
  });
  else
	res.redirect('/admin');
  
});
app.post('/logout', function (req, res) {
  	delete req.session.user;
  	delete req.session.password;
	delete req.session.email;
  	delete req.session.admin;
	delete req.session.notes;
  	res.redirect('/');
});  
function findall(){
	users = [];
	User.count({}, function( err, count){
		console.log( "Number of users:", count );
		usercount = count;
	});
	
	User.find({}, function(err, user) {
		var a = 0;
		for(i = 0;i<usercount;i++){
			users[a] = user[i].username;
			a++;
			users[a] = user[i].password;
			a++;
		}
		sendusers = users.toString();
	});
}
findall();
console.log("Working!");

