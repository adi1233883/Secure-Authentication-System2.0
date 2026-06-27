const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authenticateJWT = require('../middleware/authenticateJWT');
const { changePasswordValidation, updateProfileValidation } = require('../middleware/validateInput');

// Public utility: live password strength check (used on register page before signup)
router.post('/check-password-strength', userController.checkPasswordStrength);

// Authenticated routes
router.get('/dashboard', authenticateJWT, userController.getDashboard);
router.get('/login-history', authenticateJWT, userController.getLoginHistory);
router.get('/security-alerts', authenticateJWT, userController.getSecurityAlerts);
router.patch('/security-alerts/:id/read', authenticateJWT, userController.markAlertRead);
router.put('/profile', authenticateJWT, updateProfileValidation, userController.updateProfile);
router.put('/change-password', authenticateJWT, changePasswordValidation, userController.changePassword);
router.get('/password-score', authenticateJWT, userController.getPasswordScore);

module.exports = router;
