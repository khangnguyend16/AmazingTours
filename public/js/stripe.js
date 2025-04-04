const stripe = Stripe('pk_test_51R9pRyQCoAHbRrKwooUJzF5E96GXXHvgnqeetRKDoyatSel3IfR9SuNn3SQvILKgUrhCXZnK0xwC03ZtNt0ZHzih00XndL2aqe')
import axios from 'axios';

export const bookTour = async tourId => {
    try {
        // 1. Get checkout session from API
        const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`)

        // 2. Create checkout form + charge credit cart
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    } catch (error) {
        console.log(error);
    }

}