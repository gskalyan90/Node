const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const User = mongoose.model('User')
const jimp =  require('jimp');
const uuid = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/')
		if(isPhoto) {
			next(null, true)
		}else {
			next({message: 'That file type is not allowed'}, false)
		}	
	}
}

exports.homePage = (req, res) => {
	req.flash('success', "Something happened");
	req.flash('error', "Something happened");
	res.render('index');
}

exports.addStore = (req, res) => {
	res.render('editStore', { title: 'Add Store'});
}

exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req, res, next) => {
	if(!req.file){
		next();//skip to the next middleware
		return
	}
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`
	const photo = await jimp.read(req.file.buffer)
	await photo.resize(800, jimp.AUTO)
	await photo.write(`./public/uploads/${req.body.photo}`)
	//once we have written the file to our file system keep going
	next()
}

exports.createStore = async (req, res) => {
	req.body.author = req.user._id
	const store = new Store(req.body)
	await store.save()
	req.flash('success', `successfully created store ${store.name}`);
	res.redirect(`/store/${store.slug}`);
}

exports.getStore = async (req, res) => {
	//query the db to get all stores
	const page = req.params.page || 1
	const limit = 4
	const skip = (page * limit) - limit
	const storesPromise =  Store.find().skip(skip).limit(limit);
	const countPromise = Store.count()
	const [stores, count] = await Promise.all([storesPromise, countPromise])
	const pages = Math.ceil(count/limit)
	if(!stores.length && skip){
		req.flash('info', `Hey you asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`)
		res.redirect(`/stores/page/${pages}`)
		return;
	}
	res.render('stores', { title: 'stores', stores, pages, count, page})
}

const confirmOwner = (store, user) => {
	if(!store.author.equals(user._id)){
		throw Error('you must own a store in order to edit it')
	}
}

exports.editStore = async(req, res) => {
	const store = await Store.findOne({ _id: req.params.id})
	confirmOwner(store, req.user);
	res.render('editStore', {title: `Edit ${store.name}`, store})
}

exports.updateStore = async(req, res) => {
	//telling the store to set the location to point
	req.body.location.type = "Point"
	const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
		runValidators: true,
		new: true // return the new store, instead of teh old one
	}).exec();

	req.flash('success', `successfully updated ${store.name} <strong><a href="/stores/${store.slug}"></a></strong>`)
	res.redirect(`/stores/${store._id}/edit`)
}

exports.getStoreBySlug = async(req, res, next) => {
	const store = await Store.findOne({ slug: req.params.slug})
	.populate('author reviews')
	if(!store) return next()
	res.render('store', {title: store.name, store})	
}

exports.getStoreByTag = async(req, res) => {
	const tag = req.params.tag

	const tagQuery = tag || {$exists: true}
	const tagsPromise =  Store.getTagList()
	const storePromise =  Store.find({tags: tagQuery})
	const [tags, stores] = await Promise.all([tagsPromise, storePromise])
	res.render('tag', {tags, title: 'Tags', tag, stores})
}

exports.searchStores = async(req, res) => {
	const stores = await Store
	// first find the stores which match
	.find({
		$text: {
			$search: req.query.q
		} 
	},{
		score: {$meta: 'textScore'}
	})
	//sort the matched stores
	.sort({
		score: {$meta: 'textScore'}
	})
	res.json(stores)
}

exports.mapStores = async(req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat)
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates
				},
				$maxDistance: 10000 //10km
			}
		}
	}
	const stores = await Store.find(q).select('name slug location')
	res.json(stores)
}

exports.heartStore = async(req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString())
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'
	const user = await User.findByIdAndUpdate(req.user._id,
		{[operator]: {hearts: req.params.id}},
		{new: true}
	)
	res.json(user)
}

exports.getHearts = async (req, res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	})
	res.render('stores', {title: 'Hearted Stores', stores })
}

exports.getTopStores = async(req, res) => {
	const stores = await Store.getTopStores()
	res.render('topStores', {stores, title: ' Top Stores!'})
}

exports.mapPage = (req, res) => {
	res.render('map', {title: 'Map'})
}