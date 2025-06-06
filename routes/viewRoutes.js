const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController.js');
const bookingController = require('../controllers/bookingController.js');
const router = express.Router();

router.get('/', viewController.getOverview);

router.get('/tour/:slug', viewController.getTour);

router.get('/login', viewController.getLoginForm);

module.exports = router;