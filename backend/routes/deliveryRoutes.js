const express = require('express');
const c = require('../controllers/deliveryController');
const { isDeliveryPartner } = require('../middleware/deliveryAuth');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: sirf login. Register nahi hai, partner sirf admin banata hai
router.post('/login', c.login);

// Admin only: delivery partners manage karna
router
  .route('/admin/partners')
  .get(isAuthenticated, isAdmin, c.listPartners)
  .post(isAuthenticated, isAdmin, c.createPartner);

router
  .route('/admin/partners/:id')
  .put(isAuthenticated, isAdmin, c.updatePartner)
  .delete(isAuthenticated, isAdmin, c.deletePartner);

router.put('/admin/partners/:id/password', isAuthenticated, isAdmin, c.resetPartnerPassword);

// Admin only: order ko partner ko assign karna
router.put('/admin/assign/:orderId', isAuthenticated, isAdmin, c.assignOrder);

// Delivery partner only (neeche ke saare routes ke liye partner ka login zaroori)
router.use(isDeliveryPartner);
router.get('/me', c.getMe);
router.put('/me', c.updateMe);
router.put('/password', c.updatePassword);
router.put('/availability', c.setAvailability);
router.get('/stats', c.stats);
router.get('/orders', c.listOrders);
router.get('/orders/:id', c.getOrder);
router.put('/orders/:id/pickup', c.pickup);
router.put('/orders/:id/out-for-delivery', c.outForDelivery);
router.post('/orders/:id/resend-otp', c.resendOtp);
router.put('/orders/:id/deliver', c.deliver);
router.put('/orders/:id/fail', c.fail);

module.exports = router;