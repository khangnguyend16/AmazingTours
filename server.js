const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' }); // Load environment variables

// Put at the top!
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 🔥 Shutting down...')
    console.log(err.name, err.message);
    process.exit(1);
})

const app = require('./app'); // Load app after environment variables

// Replace <db_password> in the DATABASE string with the actual password
const DB = process.env.DATABASE.replace('<db_password>', process.env.DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB).then(() => {
    console.log('DB connection successful!');
})

// Start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
    console.log('UNHANDLER REJECTION! 🔥 Shutting down...')
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1); // 0: success,  1: uncaught exception
    })
})


// This file will contain database configurations, error handling,
// environment variables... (not related to express) => entry point

