// AI Service — wraps all Google Gemini API calls. If no API key is
// configured, every function returns a clear fallback response instead of
// crashing, so the rest of the app (especially the security features,
// which must NEVER depend on AI) keeps working regardless.

const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');
const logger = require('../utils/logger');

const MODEL = 'gemini-2.5-flash';

let client = null;
if (env.isAiConfigured) {
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
} else {
  logger.warn('[ai] GEMINI_API_KEY not set — AI features will return fallback responses. Add a key to .env to enable them.');
}

const FALLBACK_MESSAGE =
  "The AI assistant isn't configured yet. Add a GEMINI_API_KEY to the backend .env file to enable this feature.";

// Gemini uses role: 'user' | 'model' (not 'assistant' like Anthropic/OpenAI).
// Our app stores history as { role: 'user' | 'assistant', content: '...' }
// (see chatbot-widget.js on the frontend), so we translate it here.
function toGeminiContents(conversationHistory, latestUserMessage) {
  const history = conversationHistory.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  return [...history, { role: 'user', parts: [{ text: latestUserMessage }] }];
}

/**
 * AI Security Assistant chatbot — explains cybersecurity concepts in plain
 * language. Keeps a short rolling history for context.
 */
async function askSecurityAssistant(userMessage, conversationHistory = []) {
  if (!client) {
    return { reply: FALLBACK_MESSAGE, aiConfigured: false };
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: toGeminiContents(conversationHistory, userMessage),
      config: {
        maxOutputTokens: 500,
        systemInstruction: `You are a friendly, knowledgeable cybersecurity assistant embedded in a "Secure Authentication System" demo project.
Explain concepts like brute-force attacks, password hashing, two-factor authentication, phishing, session hijacking, and related topics in clear, simple terms suitable for someone learning cybersecurity.
Keep answers concise (under 150 words) unless more detail is specifically requested.
Only provide defensive and educational explanations — never give step-by-step attack instructions.
If asked about something unrelated to cybersecurity or this app, gently redirect to security topics.`,
      },
    });

    const reply = response.text || '';
    return { reply, aiConfigured: true };
  } catch (err) {
    logger.error('[ai] Chatbot request failed:', err.message);
    return { reply: 'The AI assistant is temporarily unavailable. Please try again shortly.', aiConfigured: true, error: true };
  }
}

/**
 * AI-generated personalized security recommendations, based on the user's
 * own data (password score, recent alerts, verification status).
 */
async function getRecommendations(context) {
  if (!client) {
    return {
      recommendations: [
        'Use a password manager to generate and store strong, unique passwords.',
        'Avoid reusing passwords across multiple sites.',
        'Review your login history regularly for unfamiliar activity.',
      ],
      aiConfigured: false,
    };
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
      config: {
        maxOutputTokens: 400,
        systemInstruction: `Generate exactly 3 short, specific, actionable security recommendations for a user of an authentication
system, based on the JSON data provided about their account. Be encouraging and clear, not alarming.
Respond with ONLY a JSON array of 3 strings — no preamble, no markdown formatting, no code fences.`,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const recommendations = JSON.parse(cleaned);
    return { recommendations, aiConfigured: true };
  } catch (err) {
    logger.error('[ai] Recommendations request failed:', err.message);
    return {
      recommendations: ['Unable to generate personalized recommendations right now. Please try again later.'],
      aiConfigured: true,
      error: true,
    };
  }
}

/**
 * AI Log Analyzer — takes STRUCTURED FINDINGS already produced by deterministic
 * rule-based detection (security.service.js) and summarizes them in plain
 * English for an admin. The AI never decides what counts as an attack —
 * it only explains findings that rules already surfaced.
 */
async function summarizeFindings(findings) {
  if (!client) {
    return {
      summary: 'AI summarization is not configured. Showing raw findings only — add a GEMINI_API_KEY to enable plain-English summaries.',
      aiConfigured: false,
    };
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [{ text: `Findings:\n${JSON.stringify(findings, null, 2)}\n\nSummarize this for the admin security dashboard.` }],
      }],
      config: {
        maxOutputTokens: 600,
        systemInstruction: `You are a security analyst assistant. You will receive structured findings already detected by
rule-based security logic in a JSON object. Summarize them for a non-technical admin in clear, prioritized
bullet points using markdown. Do not invent findings beyond what is given — if a category is empty, briefly
say so or omit it. End with one specific recommended next action. Keep the whole summary under 250 words.`,
      },
    });

    const summary = response.text || '';
    return { summary, aiConfigured: true };
  } catch (err) {
    logger.error('[ai] Log analysis summarization failed:', err.message);
    return { summary: 'AI summarization failed. Raw findings are shown below.', aiConfigured: true, error: true };
  }
}

module.exports = { askSecurityAssistant, getRecommendations, summarizeFindings, isAiConfigured: env.isAiConfigured };
