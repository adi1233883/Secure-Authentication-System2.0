const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const authenticateJWT = require('../middleware/authenticateJWT');
const authorizeRole = require('../middleware/authorizeRole');
const { chatMessageValidation } = require('../middleware/validateInput');
const { aiChatLimiter } = require('../middleware/rateLimiter');

router.post('/chat', authenticateJWT, aiChatLimiter, chatMessageValidation, aiController.chat);
router.get('/recommendations', authenticateJWT, aiController.getRecommendations);

router.post('/analyze-logs', authenticateJWT, authorizeRole('admin'), aiController.analyzeLogs);
router.get('/analyze-logs/latest', authenticateJWT, authorizeRole('admin'), aiController.getLatestAnalysis);

module.exports = router;
