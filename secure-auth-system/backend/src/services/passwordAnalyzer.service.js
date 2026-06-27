// Password strength analyzer. Scores 0-100 based on weighted criteria.
// Run both client-side (instant feedback) and server-side (never trust
// client validation alone — this server-side score is what's actually stored).

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password1',
  'admin', 'letmein', 'welcome', '123456789', '111111', 'iloveyou',
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'qwerty123',
  'changeme', 'password123',
];

function analyzePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Weak', checks: {} };
  }

  const checks = {
    length12: password.length >= 12,
    length8: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  };

  let score = 0;
  score += checks.length12 ? 25 : (checks.length8 ? 15 : 0);
  score += checks.lowercase ? 10 : 0;
  score += checks.uppercase ? 15 : 0;
  score += checks.number ? 15 : 0;
  score += checks.symbol ? 20 : 0;
  score += checks.notCommon ? 15 : -30;

  // Mild penalty for short, repetitive, or sequential patterns.
  if (/(.)\1{2,}/.test(password)) score -= 10; // 3+ repeated chars in a row
  if (/^(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(password)) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Strong' : score >= 40 ? 'Fair' : 'Weak';

  return { score, label, checks };
}

module.exports = { analyzePasswordStrength };
