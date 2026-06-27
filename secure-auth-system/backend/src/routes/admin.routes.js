const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authenticateJWT = require('../middleware/authenticateJWT');
const authorizeRole = require('../middleware/authorizeRole');

// Every route below requires a valid JWT AND the 'admin' role.
router.use(authenticateJWT, authorizeRole('admin'));

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/lock', adminController.lockUser);
router.patch('/users/:id/unlock', adminController.unlockUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/login-logs', adminController.getLoginLogs);
router.get('/failed-attempts', adminController.getFailedAttempts);
router.get('/locked-accounts', adminController.getLockedAccounts);

router.get('/analytics/summary', adminController.getAnalyticsSummary);
router.get('/analytics/trends', adminController.getAnalyticsTrends);

module.exports = router;
