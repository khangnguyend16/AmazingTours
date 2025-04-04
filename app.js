// Configure everything that has to do with the Express application
const path = require('path')
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');


const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');

// Start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'))


// 1. GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin: *
// api.amazingtours.com,  front-end: amazingtours.com
// app.use(cors({
//     origin: 'https://www.amazingtours.com'
// }))

// non-simple requests (patch, put, delete... => preflight request)
app.options('*', cors())  // cho phép preflight request cho tất cả các API.
// app.options('/api/v1/tours/:id', cor())  // only this route! 

// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers with Helmet
app.use(helmet());
// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
// process.env is available in every single file

// Limit requests from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter);

//Stripe Webhook, dữ liệu cần được giữ nguyên dạng thô (raw buffer) để xác thực chữ ký bảo mật (signature) từ Stripe.
app.post('/webhook-checkout', express.raw({ type: 'application/json' }), bookingController.webhookCheckout);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // Middleware
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Middleware is a function that can modify the incoming request data
// Middleware stands between in the middle of the request and the response
// Middleware is a step that the request goes through while being processed

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());  // remove $ signs

// Data sanitization against XSS
// Tự động lọc tất cả dữ liệu từ req.body
const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof (req.body[key]) === "string") {
                req.body[key] = xss(req.body[key])
            }
        }
    }
    next();
}
app.use(sanitizeMiddleware);  // clean any input with malicious HTML code

// Prevent parameter pollution
app.use(hpp({
    whitelist: [    // excluded
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price'
    ]
}));

app.use(compression());  // compress all the text sent to client

// Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    console.log(req.cookies);
    next();
})

// 3. ROUTES
app.use('/', require('./routes/viewRoutes'));

app.use('/api/v1/tours', require('./routes/tourRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/reviews', require('./routes/reviewRoutes'));
app.use('/api/v1/bookings', require('./routes/bookingRoutes'));


app.all('*', (req, res, next) => { // all http methods
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
})

// Global error handling middelware
app.use(globalErrorHandler);

module.exports = app;

