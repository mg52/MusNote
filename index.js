/*
 mg52 - Mus
 */
var port = process.env.PORT || 5000;
var express = require('express');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var app = express();

var cons = require('consolidate');
app.engine('html', cons.swig);
app.set('view engine', 'html');

app.use(cookieParser());
app.use(expressSession({secret:'MusSecret'}));
app.use(bodyParser());

var mongoose = require('mongoose');
var uristring = process.env.MONGOLAB_URI || 'mongodb://localhost/musnote_a';
mongoose.connect(uristring);
var UserSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	email: {type: String, required: true},
	notes: String
});
var User = mongoose.model('User', UserSchema);

var sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

app.get('/', function (req, res) {
	if(req.session.user)
		res.redirect('/login');
	else
		res.render('index');
});
app.get('/login', function (req, res) {
	if(req.session.user)
		res.render('login', { loginmessage: req.session.user + " !",
			username: req.session.user,
			password: req.session.password,
			email: req.session.email,
			notes: req.session.notes});
	else
		res.redirect('/');
});

app.post('/login', function (req, res) {
	delete req.session.user;
	delete req.session.password;
	delete req.session.email;
	delete req.session.notes;
	var post = req.body;
	User.findOne({ 'username': post.user }, function(err, user) {
		if (err) throw err;
		if(user){
			if(post.password == user.password){
				req.session.user = user.username;
				req.session.password = user.password;
				req.session.email = user.email;
				req.session.notes = user.notes;
				console.log(req.session.user + " logged in.");
				res.redirect('/login');
			}
			else res.render('index', { loginmessage: "Bad Username or Password"});
		}
		else res.render('index', { loginmessage: "Bad Username or Password"});
	});
});
app.post('/signup', function (req,res){
	if(req.session.user)
		res.redirect('/login');
	else
		res.render('signup');
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
			notes: req.session.notes,
			saved: "Note Saved!"
		});
	}
	else
		res.redirect('/');
});

app.post('/addUser', function (req, res) {
	var post = req.body;
	req.session.user = post.adduser;
	req.session.password = post.addpassword;
	req.session.email = post.addemail;
	req.session.notes = "";
	var new_user = new User({
		username: req.session.user,
		password: req.session.password,
		email: req.session.email,
		notes: req.session.notes
	});
	new_user.save(function (err, new_user) {
		if (err) {
			delete req.session.user;
			delete req.session.password;
			delete req.session.email;
			delete req.session.notes;
			res.render('index', { loginmessage: "This username is using by someone else!"});
			console.log(req.session.user + " is using by someone else!")
		}
		else{
			if(req.session.user) {
				res.render('index', {loginmessage: req.session.user + " added!"});
				console.log(req.session.user + " " + req.session.password + ' User saved successfully!');
			}
			else
				res.redirect('/');
		}
	});
});

app.get('/changePassword', function (req, res) {
	if(req.session.user)
		res.render('changePassword');
	else
		res.redirect('/');
});
app.post('/changePassword', function (req, res){
	if(req.session.user){
		res.redirect('/changePassword');
	}
	else
		res.redirect('/');
});
app.post('/passwordChanged', function(req, res){
	var post = req.body;
	User.findOne({ 'username': req.session.user }, function(err, user) {
		if (err) throw err;
		user.password = post.password;
		user.save(function(err) {
			if (err) throw err;
			console.log("New Password Saved.");
		});
	});
	res.render('login', {
		loginmessage: req.session.user + " !",
		username: req.session.user,
		password: req.session.password,
		email: req.session.email,
		notes: req.session.notes,
		changePasswordMessage: "Your password has been changed sucessfully!"
	});
});
app.post('/sendNote', function(req, res){
	if(req.session.user){
		sendgrid.send({
			to:       req.session.email,
			from:     'no-reply@musnote.com',
			subject:  'Your MusNote',
			text:     req.session.notes
		}, function(err, json) {
			if (err) throw err;
			console.log(json);
		});
		res.render('login', {
			loginmessage: req.session.user + " !",
			username: req.session.user,
			password: req.session.password,
			email: req.session.email,
			notes: req.session.notes,
			sendNoteMessage: "Your note has been sent to your email!"
		});
	}
	else
		res.redirect('/');
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
	delete req.session.notes;
	res.redirect('/');
});

app.post('/logout', function (req, res) {
	delete req.session.user;
	delete req.session.password;
	delete req.session.email;
	delete req.session.notes;
	res.redirect('/');
});

app.all('*', function(req, res){
	res.redirect('/');
});
var server = app.listen(port);
console.log("Working!");
