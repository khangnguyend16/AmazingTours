const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' }); // Load environment variables
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// Replace <db_password> in the DATABASE string with the actual password
const DB = process.env.DATABASE.replace('<db_password>', process.env.DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB).then(() => {
    console.log('DB connection successful!');
}).catch(err => {
    console.error('DB connection error:', err);
});

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));

// IMPORT DATA INTO DB
const importData = async () => {
    try {
        await Tour.create(tours)
        await User.create(users, { validateBeforeSave: false })
        await Review.create(reviews)
        console.log('Data successfully loaded!')
    } catch (error) {
        console.log(error);
    }
    process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
    try {
        await Tour.deleteMany()
        await User.deleteMany()
        await Review.deleteMany()
        console.log('Data successfully deleted!')
    } catch (error) {
        console.log(error);
    }
    process.exit();
}

if (process.argv[2] === '--import') {
    importData();
} else if (process.argv[2] === '--delete') {
    deleteData();
}

// console.log(process.argv); //command line arguments




