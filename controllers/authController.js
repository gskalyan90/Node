const passport = require('passport')
const crypto = require('crypto')
const promisify = require('es6-promisify')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const mail = require('../handlers/mail')

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed again!',
	successRedirect: '/',
	successFlash: 'You are now logged in!'
})

exports.logout = (req, res) => {
	req.logout()
	req.flash('success', "you are now logged out!")
	res.redirect('/')
}

exports.isLoggedIn = (req, res, next) => {
	if(req.isAuthenticated()){
		next()
		return
	}
	req.flash('error', 'Oops you must be logged In!')
	res.redirect('/login')
}

exports.forgot = async (req, res) =>{
	// see if a user with that email exists
	const user = await User.findOne({ email: req.body.email })
	if(!user){
		req.flash('error', 'Account doesnt exist')
		return res.redirect('/login')
	}
	//set reset tokens and expiry on their account

	user.resetPasswordToken = crypto.randomBytes(20).toString('hex')
	user.resetPasswordExpires = Date.now() + 3600000
	await user.save()
	//send them email with the token

	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
	mail.send({
		user: user,
		subject: 'Password reset',
		resetURL,
		filename: 'password-reset'
	})

	req.flash('success', `You have been emailed a password reset link`)
	//redirect them to login page

	res.redirect('/login')
}

exports.reset =  async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {$gt: Date.now()}
	})
	if(!user){
		req.flash("error", 'Password reset is invalid or expired')
		return res.redirect('/login')
	}
	res.render('reset', {title: "Reset Your Password"})
}

exports.confirmPasswords = (req, res, next) =>{
	if(req.body.password === req.body['confirm-password']){
		next()
		return
	}
	req.flash('error', "passwords do not match" )
}

exports.update = async(req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {$gt: Date.now()}
	})
	if(!user){
		req.flash("error", 'Password reset is invalid or expired')
		return res.redirect('/login')
	}
	const setPassword = promisify(user.setPassword, user)
	await setPassword(req.body.password)
	user.resetPasswordExpires = undefined
	user.resetPasswordToken = undefined
	const updatedUser  = await user.save()
	await req.login(updatedUser)
	req.flash('success', 'Nice! your password has been reset! you are now logged In')
	res.redirect('/')
}