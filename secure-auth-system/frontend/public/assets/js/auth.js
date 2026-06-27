// Powers index.html (login), register.html, verify-otp.html, and
// forgot-password.html. Each page only has the elements relevant to it,
// so each init function checks for its root element before wiring up.

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggle();
  initLoginPage();
  initRegisterPage();
  initOtpPage();
  initForgotPasswordPage();
});

// --- Shared: show/hide password ---
function initPasswordToggle() {
  document.querySelectorAll('.input-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? 'Hide' : 'Show';
    });
  });
}

// --- Live password strength meter (mirrors backend passwordAnalyzer.service.js logic) ---
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password1',
  'admin', 'letmein', 'welcome', '123456789', '111111', 'iloveyou',
];

function analyzeStrength(password) {
  if (!password) return { score: 0, label: 'Weak', checks: {} };

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    common: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  };

  let score = 0;
  score += password.length >= 12 ? 25 : (checks.length ? 15 : 0);
  score += checks.lower ? 10 : 0;
  score += checks.upper ? 15 : 0;
  score += checks.number ? 15 : 0;
  score += checks.symbol ? 20 : 0;
  score += checks.common ? 15 : -30;
  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Strong' : score >= 40 ? 'Fair' : 'Weak';
  return { score, label, checks };
}

function wireStrengthMeter(passwordInputId) {
  const input = document.getElementById(passwordInputId);
  const meter = document.getElementById('strengthMeter');
  if (!input || !meter) return;

  const fill = document.getElementById('strengthBarFill');
  const label = document.getElementById('strengthLabel');
  const scoreText = document.getElementById('strengthScore');
  const checklist = {
    length: document.getElementById('check-length'),
    upper: document.getElementById('check-upper'),
    lower: document.getElementById('check-lower'),
    number: document.getElementById('check-number'),
    symbol: document.getElementById('check-symbol'),
    common: document.getElementById('check-common'),
  };

  const colorForScore = (s) => (s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--accent)' : s >= 40 ? 'var(--warning)' : 'var(--danger)');

  input.addEventListener('input', () => {
    const password = input.value;
    if (!password) {
      meter.classList.remove('visible');
      return;
    }
    meter.classList.add('visible');

    const { score, label: strengthLabel, checks } = analyzeStrength(password);
    fill.style.width = `${score}%`;
    fill.style.background = colorForScore(score);
    label.textContent = strengthLabel;
    label.style.color = colorForScore(score);
    scoreText.textContent = `${score}/100`;

    Object.entries(checklist).forEach(([key, el]) => {
      if (!el) return;
      const met = !!checks[key];
      el.classList.toggle('met', met);
      el.innerHTML = (met ? '&#10003; ' : '&#9675; ') + el.textContent.replace(/^[\u2713\u25CB]\s*/, '');
    });
  });
}

// --- Login page ---
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('loginBtn');
    setButtonLoading(btn, true, 'Signing in...');

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const result = await api.post('/auth/login', { email, password });
      auth.setToken(result.token);
      auth.setUser(result.user);

      window.location.href = result.user.role === 'admin' ? 'dashboard-admin.html' : 'dashboard-user.html';
    } catch (err) {
      showAlert('alertBox', err.message || 'Login failed. Please try again.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// --- Register page ---
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  wireStrengthMeter('password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('registerBtn');
    setButtonLoading(btn, true, 'Creating account...');

    try {
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      await api.post('/auth/register', { fullName, email, password });

      sessionStorage.setItem('pendingVerificationEmail', email);
      window.location.href = 'verify-otp.html';
    } catch (err) {
      const message = err.errors ? err.errors.map((e) => e.message).join(' ') : (err.message || 'Registration failed.');
      showAlert('alertBox', message, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// --- OTP verification page ---
function initOtpPage() {
  const form = document.getElementById('otpForm');
  if (!form) return;

  const email = sessionStorage.getItem('pendingVerificationEmail');
  const emailDisplay = document.getElementById('emailDisplay');
  if (email && emailDisplay) emailDisplay.textContent = email;
  if (!email) {
    showAlert('alertBox', 'No pending verification found. Please register or log in again.', 'info');
  }

  // Auto-advance focus between OTP boxes.
  const boxes = Array.from(document.querySelectorAll('.otp-box'));
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '');
      if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').split('');
      boxes.forEach((b, idx) => { b.value = digits[idx] || ''; });
      boxes[Math.min(digits.length, boxes.length) - 1]?.focus();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const otp = boxes.map((b) => b.value).join('');
    if (otp.length !== 6) {
      showAlert('alertBox', 'Please enter the full 6-digit code.', 'error');
      return;
    }

    const btn = document.getElementById('verifyBtn');
    setButtonLoading(btn, true, 'Verifying...');

    try {
      await api.post('/auth/verify-otp', { email, otp });
      sessionStorage.removeItem('pendingVerificationEmail');
      showAlert('alertBox', 'Email verified! Redirecting to sign in...', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch (err) {
      showAlert('alertBox', err.message || 'Verification failed.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });

  const resendBtn = document.getElementById('resendBtn');
  if (resendBtn) {
    let cooldown = 0;
    resendBtn.addEventListener('click', async () => {
      if (cooldown > 0) return;
      try {
        await api.post('/auth/resend-otp', { email, purpose: 'email_verification' });
        showAlert('alertBox', 'A new code has been sent.', 'success');
        cooldown = 30;
        resendBtn.disabled = true;
        const tick = setInterval(() => {
          cooldown -= 1;
          resendBtn.textContent = `Resend code (${cooldown}s)`;
          if (cooldown <= 0) {
            clearInterval(tick);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend code';
          }
        }, 1000);
      } catch (err) {
        showAlert('alertBox', err.message || 'Could not resend code.', 'error');
      }
    });
  }
}

// --- Forgot password page ---
function initForgotPasswordPage() {
  const requestForm = document.getElementById('requestForm');
  if (!requestForm) return;

  wireStrengthMeter('newPassword');

  let pendingEmail = '';

  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('requestBtn');
    setButtonLoading(btn, true, 'Sending...');

    try {
      pendingEmail = document.getElementById('email').value.trim();
      await api.post('/auth/forgot-password', { email: pendingEmail });

      document.getElementById('stepRequest').classList.add('hidden');
      document.getElementById('stepReset').classList.remove('hidden');
      document.getElementById('emailDisplay').textContent = pendingEmail;
    } catch (err) {
      showAlert('alertBox', err.message || 'Something went wrong.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });

  const resetForm = document.getElementById('resetForm');
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('resetBtn');
    setButtonLoading(btn, true, 'Resetting...');

    try {
      const otp = document.getElementById('otp').value.trim();
      const newPassword = document.getElementById('newPassword').value;
      await api.post('/auth/reset-password', { email: pendingEmail, otp, newPassword });

      showAlert('alertBox', 'Password reset successfully! Redirecting to sign in...', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch (err) {
      showAlert('alertBox', err.message || 'Reset failed.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });

  const resendBtn = document.getElementById('resendBtn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      try {
        await api.post('/auth/resend-otp', { email: pendingEmail, purpose: 'password_reset' });
        showAlert('alertBox', 'A new code has been sent.', 'success');
      } catch (err) {
        showAlert('alertBox', err.message || 'Could not resend code.', 'error');
      }
    });
  }
}
