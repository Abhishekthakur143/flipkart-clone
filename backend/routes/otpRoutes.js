const router = require('express').Router();
const { sendOtp, loginWithOtp, resetPassword } = require('../controllers/otpController');

router.post('/send', sendOtp);
router.post('/login', loginWithOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
