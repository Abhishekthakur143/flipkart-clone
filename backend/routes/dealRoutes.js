const express = require('express');
const { isAuthenticated, isAdmin, isManager, isSeller } = require('../middleware/auth');
const c = require('../controllers/dealController');

const router = express.Router();

// Seller
router.get('/seller', isAuthenticated, isSeller, c.sellerList);
router.get('/seller/count', isAuthenticated, isSeller, c.sellerCount);
router.post('/seller', isAuthenticated, isSeller, c.create);
router.put('/seller/:id/accept', isAuthenticated, isSeller, c.sellerAccept);
router.put('/seller/:id/counter', isAuthenticated, isSeller, c.sellerCounter);
router.put('/seller/:id/withdraw', isAuthenticated, isSeller, c.sellerWithdraw);

// Manager
router.get('/manager', isAuthenticated, isManager, c.managerList);
router.get('/manager/count', isAuthenticated, isManager, c.managerCount);
router.put('/manager/:id/accept', isAuthenticated, isManager, c.managerAccept);
router.put('/manager/:id/counter', isAuthenticated, isManager, c.managerCounter);
router.put('/manager/:id/reject', isAuthenticated, isManager, c.managerReject);
router.put('/manager/:id/submit', isAuthenticated, isManager, c.managerSubmit);

// Admin: sirf yes / no
router.get('/admin', isAuthenticated, isAdmin, c.adminList);
router.get('/admin/count', isAuthenticated, isAdmin, c.adminCount);
router.put('/admin/:id/approve', isAuthenticated, isAdmin, c.adminApprove);
router.put('/admin/:id/reject', isAuthenticated, isAdmin, c.adminReject);

module.exports = router;
