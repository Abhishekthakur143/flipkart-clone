const express = require('express');
const { isAuthenticated, isManager, isSeller } = require('../middleware/auth');
const c = require('../controllers/sellerController');
const r = require('../controllers/sellerRequestController');

const router = express.Router();

// Public: email wale link se password set
router.get('/setup/:token', c.setupInfo);
router.post('/setup/:token', c.setupPassword);

// Public: "Become a seller" request (sirf managers ko jati hai)
router.post('/request', r.apply);

// Manager: request inbox
router.get('/manager/requests', isAuthenticated, isManager, r.managerList);
router.put('/manager/requests/:id/dismiss', isAuthenticated, isManager, r.dismiss);

// Manager: seller ko access dena (Grant access), verification review
router.get('/manager/list', isAuthenticated, isManager, c.list);
router.get('/manager/count', isAuthenticated, isManager, c.count);
router.post('/manager/invite', isAuthenticated, isManager, c.invite);
router.put('/manager/:id/resend', isAuthenticated, isManager, c.resend);
router.put('/manager/:id/verify', isAuthenticated, isManager, c.verify);
router.put('/manager/:id/reject', isAuthenticated, isManager, c.reject);
router.put('/manager/:id/active', isAuthenticated, isManager, c.setActive);

// Seller
router.get('/me', isAuthenticated, isSeller, c.me);
router.put('/profile', isAuthenticated, isSeller, c.submitProfile);
router.get('/categories', isAuthenticated, isSeller, c.categories);
router.get('/dashboard', isAuthenticated, isSeller, c.dashboard);

module.exports = router;
