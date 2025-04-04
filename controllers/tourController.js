const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false)
    }
}
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadTourImages = upload.fields([   // => req.files
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
]);
// upload.singe('image')  => req.file
// upload.array('images',5)  => req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    console.log(req.files);
    if (!req.files.imageCover || !req.files.images) return next

    // 1.Cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`  // for the next middleware to use
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`)

    // 2. Images
    req.body.images = [];
    await Promise.all(
        req.files.images.map(async (file, idx) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${idx + 1}.jpeg`

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`)

            req.body.images.push(filename)  // for the next middleware to use
        }))
    next();
})

//ROUTE HANDLERS
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        {
            $sort: { avgPrice: 1 }  // 1: asc   -1: desc
        },
        // {
        //     $match: { _id: { $ne: 'EASY' } }  // repeating stage
        //     // _id: difficulty upper     $ne: not equal
        // }
    ])
    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    })
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1
    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: { numTourStarts: -1 }
        },
        {
            $limit: 6
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            plan
        }
    })
})

// '/tours-within/:distance/center/:latlng/unit/:unit'
// /tours-within/233/center/34.135492,-118.161856/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;

    // 1. Kiểm tra distance
    const dist = Number(distance);
    if (isNaN(dist) || dist < 0) {
        return next(new AppError('Distance must be a non-negative number', 400));
    }

    // 2. Kiểm tra unit
    if (!['mi', 'km'].includes(unit)) {
        return next(new AppError('Unit must be either "mi" or "km"', 400));
    }

    // 3. Kiểm tra và tách latlng
    if (!latlng || !latlng.includes(',')) {
        return next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
    }
    const [latStr, lngStr] = latlng.split(',');
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
        return next(new AppError('Latitude and longitude must be valid numbers', 400));
    }

    // 4. Tính radius (đảm bảo không âm)
    const radius = unit === 'mi' ? dist / 3963.2 : dist / 6378.1;   // unit = mile or km ?
    console.log({ distance: dist, lat, lng, unit, radius }); // Debug

    // 5. Truy vấn MongoDB
    try {
        const tours = await Tour.find({
            startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
        });

        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: {
                data: tours
            }
        });
    } catch (err) {
        console.error('Query error:', err);
        return next(new AppError('Error querying tours', 500));
    }
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;

    // 1. Kiểm tra unit
    if (!['mi', 'km'].includes(unit)) {
        return next(new AppError('Unit must be either "mi" or "km"', 400));
    }

    // 2. Kiểm tra và tách latlng
    if (!latlng || !latlng.includes(',')) {
        return next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
    }
    const [latStr, lngStr] = latlng.split(',');
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (isNaN(lat) || isNaN(lng)) {
        return next(new AppError('Latitude and longitude must be valid numbers', 400));
    }

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier  // convert to km/mile
            }
        },
        {
            $project: {
                distance: 1,  //1: keep
                name: 1
            }
        }
    ])
    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    });
})