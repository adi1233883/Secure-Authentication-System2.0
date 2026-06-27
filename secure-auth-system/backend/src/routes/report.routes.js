const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const authenticateJWT = require('../middleware/authenticateJWT');
const authorizeRole = require('../middleware/authorizeRole');

router.get('/security-report', authenticateJWT, reportController.securityReport);
router.get('/login-activity-export', authenticateJWT, reportController.loginActivityExport);
router.get('/admin/full-report', authenticateJWT, authorizeRole('admin'), reportController.adminFullReport);

module.exports = router;
