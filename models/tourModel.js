const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have less or equal then 40 characters'],
        minlength: [10, 'A tour name must have more or equal then 10 characters'],
        // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficulty is either: easy, medium, difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10   // 4.6666, 46.666, 47, 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (value) {
                // 'this' only points to current document on NEW document creation
                return value < this.price
            },
            message: 'Discount price ({VALUE}) should be below regular price'
        }
    },
    summary: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false       // excluding field from schema
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
            type: mongoose.Schema.ObjectId,  // mongoDB id
            ref: 'User'
        }
    ]
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

tourSchema.index({ price: 1, ratingsAverage: -1 }) // Compound indexes
tourSchema.index({ slug: 1 }) // 1: asc  -1: desc
tourSchema.index({ startLocation: '2dsphere' }) // chỉ mục địa không gian (geospatial index)

tourSchema.virtual('durationWeeks').get(function () {  // not in database => can not query
    return this.duration / 7
})

// Virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// DOCUMENT MIDDLEWARE: pre -> runs before .save() and .create() 
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
})

// // Embedding users into tours  -> not recommended cause user info usually change!!!
// tourSchema.pre('save', async function (next) {
//     const guidesPromises = this.guides.map(async id => await User.findById(id)) //async function always returns a promise
//     this.guides = await Promise.all(guidesPromises); //guidesPromises is an array with full of promises
//     next();
// })

tourSchema.post('save', (doc, next) => {
    // console.log(doc);
    next();
})

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
    // All strings starting with 'find'
    this.find({ secretTour: { $ne: true } })

    this.start = Date.now();
    next();
})

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt',  // excluded
    })
    next();
})

tourSchema.post(/^find/, (docs, next) => {
    console.log(`Query took ${Date.now() - this.start} milliseconds`);
    next();
})

// // AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })
//     console.log(this.pipeline());
//     next();
// })

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;