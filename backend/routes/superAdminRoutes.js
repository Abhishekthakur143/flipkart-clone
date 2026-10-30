const express = require('express');
const { isAuthenticated, isSuperAdmin } = require('../middleware/auth');
const c = require('../controllers/superAdminController');
const sellers = require('../controllers/sellerController');

const router = express.Router();
router.use(isAuthenticated, isSuperAdmin); // sirf superadmin + unlock gate

router.get('/overview', c.overview);
router.get('/accounts', c.listAccounts);
router.post('/accounts', c.createAccount);
router.put('/accounts/:id', c.updateAccount);
router.put('/accounts/:id/password', c.resetPassword);
router.delete('/accounts/:id', c.deleteAccount);
router.get('/activity', c.activity);
router.get('/sellers', sellers.list);
router.get('/sellers/:id/dashboard', c.sellerDashboard);
router.get('/delivery-partners', c.deliveryPartners);
router.post('/delivery-partners/:id/open', c.openPartnerApp);

module.exports = router;
