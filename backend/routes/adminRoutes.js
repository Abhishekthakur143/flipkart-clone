const express = require('express');
const { getDashboardStats } = require('../controllers/adminController');
const { status, setup, unlock } = require('../controllers/adminSecurityController');
const { isAuthenticated, isAdmin, isAdminRole } = require('../middleware/auth');

const router = express.Router();

// Unlock gate: sirf role check (panel abhi locked hota hai, isliye isAdmin yahan nahi)
router.get('/security/status', isAuthenticated, isAdminRole, status);
router.post('/security/setup', isAuthenticated, isAdminRole, setup);
router.post('/security/unlock', isAuthenticated, isAdminRole, unlock);

// Baaki sab: admin + unlocked
router.get('/dashboard', isAuthenticated, isAdmin, getDashboardStats);

module.exports = router;
