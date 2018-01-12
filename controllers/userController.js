const mongoose = require('mongoose')
const promisify = require('es6-promisify')
const User = mongoose.model('User')

exports.loginForm = (res, req) => {
	req.render("login", {title:"login"})
}

exports.registerForm = (res, req) => {
	req.render("register", {title: "Register"})
}

exports.validateRegister = (req, res, next) => {
	req.sanitizeBody('name')
	req.checkBody('name', 'You must supply a name!').notEmpty();
	req.checkBody('email', 'That Email is not valid').isEmail();
	req.sanitizeBody('email').normalizeEmail({
		remove_dots: false,
		remove_extensions: false,
		gmail_remove_subaddress: false
	})
	req.checkBody('password', 'Password cannot be Blank!').notEmpty()
	req.checkBody("confirm-password", 'oops! your passwords do not match').equals(req.body.password)
	const errors = req.validationErrors();
	if(errors){
		req.flash('error', errors.map(err => err.msg))
		res.render('register', {title: 'register', body: req.body, flashes: req.flash()})
		return;
	}
	next()// no errors passing on to the next
}

exports.register = async (req, res, next) => {
	const user = new User({
		email: req.body.email,
		name: req.body.name
	})
	const register = promisify(User.register, User)
	await register(user, req.body.password)
	next()
}

exports.account = (req,res) => {
	res.render('account', {title: 'Edit Your Account'})
}

exports.updateAccount = async (req, res) => {
	const updates = {
		name: req.body.name,
		email: req.body.email
	}
	const user = await User.findOneAndUpdate(
			{_id: req.user.id},
			{$set: updates},
			{new: true, runValidators: true, context: 'query'}
		)
	req.flash('success', 'Account updated!!')
	res.redirect('back')
}