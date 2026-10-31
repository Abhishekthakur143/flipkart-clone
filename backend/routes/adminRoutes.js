const express = require('express');
const { getDashboardStats } = require('../controllers/adminController');
const { status, setup, unlock } = require('../controllers/adminSecurityController');
const {
  listManagers, createManager, updateManager, resetManagerPassword, deleteManager,
} = require('../controllers/adminManagerController');
const analytics = require('../controllers/analyticsController');
const rewards = require('../controllers/rewardController');
const { isAuthenticated, isAdmin, isAdminRole } = require('../middleware/auth');

const router = express.Router();

// Unlock gate: sirf role check (panel abhi locked hota hai, isliye isAdmin yahan nahi)
router.get('/security/status', isAuthenticated, isAdminRole, status);
router.post('/security/setup', isAuthenticated, isAdminRole, setup);
router.post('/security/unlock', isAuthenticated, isAdminRole, unlock);

// Baaki sab: admin + unlocked
router.get('/dashboard', isAuthenticated, isAdmin, getDashboardStats);

// Manager accounts (sirf admin banata hai)
router.get('/managers', isAuthenticated, isAdmin, listManagers);
router.post('/managers', isAuthenticated, isAdmin, createManager);
router.put('/managers/:id', isAuthenticated, isAdmin, updateManager);
router.put('/managers/:id/password', isAuthenticated, isAdmin, resetManagerPassword);
router.delete('/managers/:id', isAuthenticated, isAdmin, deleteManager);

// ---- Analytics (daily / weekly / monthly / yearly profit reports) ----
router.get('/analytics', isAuthenticated, isAdmin, analytics.overview);

// ---- Rewards & gifts ----
// Specific routes pehle, /:id wale baad me
router.get('/rewards/recipients', isAuthenticated, isAdmin, rewards.recipients);
router.get('/rewards/rules', isAuthenticated, isAdmin, rewards.listRules);
router.post('/rewards/rules', isAuthenticated, isAdmin, rewards.createRule);
router.put('/rewards/rules/:id', isAuthenticated, isAdmin, rewards.updateRule);
router.delete('/rewards/rules/:id', isAuthenticated, isAdmin, rewards.deleteRule);
router.post('/rewards/run', isAuthenticated, isAdmin, rewards.run);
router.get('/rewards/mine', isAuthenticated, isAdmin, rewards.mine); // admin ke apne gifts
router.get('/rewards', isAuthenticated, isAdmin, rewards.list);
router.post('/rewards', isAuthenticated, isAdmin, rewards.give);
router.put('/rewards/:id/approve', isAuthenticated, isAdmin, rewards.approve);
router.put('/rewards/:id/reject', isAuthenticated, isAdmin, rewards.reject);

module.exports = router;
