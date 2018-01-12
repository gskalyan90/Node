const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Please enter store name!'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now()
	},
	location: {
		type:{
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: 'you must supply coordinates!'
		}],
		address: {
			type: String,
			required: 'you must supply address!'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref:'User',
		required: "you must supply an author"
	}
}, {
	toJSON: {virtuals: true},
	toObject: {virtuals: true},
});

storeSchema.index({
	name: 'text',
	description: 'text'
})

storeSchema.index({
	location: '2dsphere'
})

storeSchema.pre('save', async function(next){
	if(!this.isModified('name')){
		return next()
	}
	this.slug = slug(this.name);
	//find other slugs having kalyan, kalyan-1, kalyan-2
	const slugRegex = new  RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
	const storesWithSlug = await this.constructor.find({slug: slugRegex})
	if(storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`
	}
	next();

	//TO DO: make more resilient slugs
});

storeSchema.statics.getTagList = function() {
	return this.aggregate([
		{ $unwind : '$tags' },{ $group: {_id: '$tags', count: { $sum:1 }}}
	])
}

storeSchema.statics.getTopStores = function(){
	return this.aggregate([
		//look up stores and populate their reviews
		{ $lookup: {from:'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
		//filter for only items that have 2 or more reviews
		{$match : {'reviews.1': {$exists: true } }},
		//Add the average reviews field
		{ $project: {
			photo: '$$ROOT.photo',
			name: '$$ROOT.name',
			reviews: '$$ROOT.reviews',
			slug: '$$ROOT.slug',
			averageRating: {$avg: '$reviews.rating'}
		}},
		//sort
		{$sort: {averageRating: -1}},
		//limit to atmost 10
		{$limit : 10}

	])
}
storeSchema.virtual('reviews', {
	ref: 'Review',
	localField: '_id', // which field on the store
	foreignField: 'store' // which field on the review
})

function autopopulate(next){
	this.populate('reviews')
	next()
}
storeSchema.pre('find', autopopulate)
storeSchema.pre('findOne', autopopulate)
module.exports = mongoose.model('Store', storeSchema);