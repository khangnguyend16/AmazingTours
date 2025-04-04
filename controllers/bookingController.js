const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Booking = require('../models/bookingModel');

// khi người dùng nhấn nút "Thanh toán" trên website. Frontend sẽ nhận session và chuyển hướng người dùng đến trang thanh toán của Stripe
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1. Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId)

    // 2. Create checkout session
    const session = await stripe.checkout.sessions.create({  //Gọi API của Stripe để tạo một phiên thanh toán.
        mode: 'payment',                            // Explicitly specify payment mode
        payment_method_types: ['card'],             // Still valid
        // success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
        success_url: `${req.protocol}://${req.get('host')}/`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [{
            price_data: {                            // Updated structure for line items
                currency: 'usd',
                unit_amount: tour.price * 100,         // Still in cents
                product_data: {
                    name: `${tour.name} Tour`,
                    description: tour.summary,
                    images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
                },
            },
            quantity: 1,
        }],
        metadata: {                                 // Added for better tracking
            tour_id: req.params.tourId,
            user_id: req.user.id,
        },
    });

    // 3. Create session as response
    res.status(200).json({
        status: 'success',
        session
    })
})

const createBookingCheckout = async session => {
    const tour = session.client_reference_id;
    const user = (await User.findOne({ email: session.customer_email })).id;
    const price = session.line_items[0].price_data.unit_amount / 100;
    await Booking.create({ tour, user, price })
}

// Hàm xử lý webhook từ Stripe khi một sự kiện xảy ra (ví dụ: thanh toán hoàn tất).
exports.webhookCheckout = (req, res, next) => {
    // Stripe calls webhook -> adds a header containing a special signature to that request
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,  //Dữ liệu thô từ webhook (nhờ express.raw)
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return res.status(400).send(`Webhook error: ${error.message}`)
    }
    if (event.type === 'checkout.session.completed')
        createBookingCheckout(event.data.object)   //event.data.object chính là session!

    res.status(200).json({ received: true })
}

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);