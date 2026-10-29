const express = require('express');
const { isAuthenticated, isAdmin, isManager } = require('../middleware/auth');
const c = require('../controllers/partnerRequestController');

const router = express.Router();

// Public: koi bhi delivery partner banne ke liye apply kar sakta hai
router.post('/', c.apply);

// Manager: review, forward ya reject, ya khud add
router.get('/manager', isAuthenticated, isManager, c.managerList);
router.get('/manager/count', isAuthenticated, isManager, c.managerCount);
router.post('/manager/add', isAuthenticated, isManager, c.managerAdd);
router.put('/manager/:id/forward', isAuthenticated, isManager, c.managerForward);
router.put('/manager/:id/reject', isAuthenticated, isManager, c.managerReject);

// Admin: sirf yes / no
router.get('/admin', isAuthenticated, isAdmin, c.adminList);
router.get('/admin/count', isAuthenticated, isAdmin, c.adminCount);
router.put('/admin/:id/approve', isAuthenticated, isAdmin, c.adminApprove);
router.put('/admin/:id/reject', isAuthenticated, isAdmin, c.adminReject);

module.exports = router;
