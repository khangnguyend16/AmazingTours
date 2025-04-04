const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty!']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user.']
    }
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// 1 user cannot write multiple reviews for the same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({        // 2 queries
    //     path: 'user',
    //     select: 'name photo'
    // })
    this.populate({   // only populate review with user to escape populate chain
        path: 'user',
        select: 'name photo'
    })
    next();
})

reviewSchema.statics.calcAverageRatings = async function (tourId) {  //static method
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 }, // add 1 for each tour
                avgRating: { $avg: '$rating' }
            }
        }
    ])

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        })
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        })
    }

}

reviewSchema.post('save', function () {
    // this point to current review
    this.constructor.calcAverageRatings(this.tour);  //this.constructor == Review
})

// findByIdAndUpdate, findByIdAndDelete  => alias của findOneAndUpdate và findOneAndDelete
// Lấy thông tin của doc Review trước khi nó bị cập nhật hoặc xóa
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.rev = await this.clone().findOne(); //clone(): Tạo một bản sao của query object ban đầu
    // => Tránh lỗi Query was already executed
    console.log(this);  // this: query object;    this.rev: instance của Review
    next();
})

// Dùng thông tin đã lưu để cập nhật thông tin Tour sau khi tài liệu bị cập nhật hoặc xóa 
reviewSchema.post(/^findOneAnd/, async function () {
    // await this.findOne() does NOT work here, query has already executed
    await this.rev.constructor.calcAverageRatings(this.rev.tour);  // trỏ đến model Review
})

// // Cách 2
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//     const review = await this.clone().findOne();
//     this.tourId = review ? review.tour : null;
//     next();
// });

// reviewSchema.post(/^findOneAnd/, async function () {
//     if (this.tourId) {
//         await this.model.calcAverageRatings(this.tourId);
//     }
// });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;