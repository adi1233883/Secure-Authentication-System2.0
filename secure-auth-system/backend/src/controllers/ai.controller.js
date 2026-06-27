// AI controller — exposes the chatbot, personalized recommendations, and
// the admin-only log analyzer. All real AI calls happen server-side here;
// the frontend never touches the Gemini API key directly.

const aiService = require('../services/ai.service');
const securityService = require('../services/security.service');
const aiCacheModel = require('../models/aiAnalysisCache.model');
const userModel = require('../models/user.model');
const alertModel = require('../models/alert.model');

async function chat(req, res, next) {
  try {
    const { message, history } = req.body;
    // Keep only the last 6 messages of history to bound token usage.
    const trimmedHistory = Array.isArray(history) ? history.slice(-6) : [];

    const result = await aiService.askSecurityAssistant(message, trimmedHistory);
    res.json({ success: true, reply: result.reply, aiConfigured: result.aiConfigured });
  } catch (err) {
    next(err);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    const recentAlerts = await alertModel.findByUser(req.user.id, { limit: 5 });

    const context = {
      passwordScore: user.password_score,
      isEmailVerified: !!user.is_verified,
      recentAlertTypes: recentAlerts.map((a) => a.alert_type),
      accountAgeApprox: user.created_at,
    };

    const result = await aiService.getRecommendations(context);
    res.json({ success: true, data: result.recommendations, aiConfigured: result.aiConfigured });
  } catch (err) {
    next(err);
  }
}

// Admin-only: run deterministic detection, then ask AI to summarize it.
async function analyzeLogs(req, res, next) {
  try {
    const findings = await securityService.detectAttackPatterns();
    const result = await aiService.summarizeFindings(findings);

    await aiCacheModel.save(result.summary, findings);

    res.json({
      success: true,
      data: { summary: result.summary, findings },
      aiConfigured: result.aiConfigured,
    });
  } catch (err) {
    next(err);
  }
}

async function getLatestAnalysis(req, res, next) {
  try {
    const cached = await aiCacheModel.getLatest();
    if (!cached) {
      return res.json({ success: true, data: null, message: 'No analysis has been run yet.' });
    }
    res.json({ success: true, data: { summary: cached.summary, findings: cached.findings, generatedAt: cached.created_at } });
  } catch (err) {
    next(err);
  }
}

module.exports = { chat, getRecommendations, analyzeLogs, getLatestAnalysis };
