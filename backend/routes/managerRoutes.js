const express = require('express');
const { isAuthenticated, isManager } = require('../middleware/auth');
const { dashboard, listOrders, confirmOrder } = require('../controllers/managerController');
// Delivery boy ki list aur assign ka logic pehle se bana hai, wahi use hota hai
const { listPartners, assignOrder } = require('../controllers/deliveryController');

const router = express.Router();
router.use(isAuthenticated, isManager);

router.get('/dashboard', dashboard);
router.get('/orders', listOrders);
router.put('/orders/:id/confirm', confirmOrder);
router.get('/partners', listPartners);
router.put('/assign/:orderId', assignOrder);

module.exports = router;
