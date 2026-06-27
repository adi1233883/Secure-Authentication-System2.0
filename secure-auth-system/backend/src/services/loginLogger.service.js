// Thin wrapper service around loginLog.model so controllers call one clear
// function name. Kept separate from security.service so "logging an event"
// and "deciding what to do about it" stay conceptually distinct.

const loginLogModel = require('../models/loginLog.model');

async function logAttempt({ userId, email, ip, userAgent, status, isSuspicious = false }) {
  return loginLogModel.record({
    userId,
    emailAttempted: email,
    ipAddress: ip,
    userAgent,
    status,
    isSuspicious,
  });
}

module.exports = { logAttempt };
