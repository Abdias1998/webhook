const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/webhook', authController.webhook);
router.post('/payment/transaction',authController.payments)

module.exports = router;