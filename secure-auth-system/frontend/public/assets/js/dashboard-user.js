// Powers dashboard-user.html: fetches dashboard data, renders the score
// ring, login history, alerts, AI recommendations, and wires up the
// profile/password forms + report downloads.

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  initChatbotWidget();
  loadDashboard();
  loadRecommendations();
  wireProfileForm();
  wirePasswordForm();
  wireLogout();
  wireDownloads();
});

function scoreColor(score) {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function scoreLabelFor(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Strong';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

function renderScoreRing(score) {
  const circumference = 264; // 2 * PI * 42, matches the SVG r=42
  const fillEl = document.getElementById('scoreRingFill');
  const offset = circumference - (circumference * (score || 0)) / 100;
  fillEl.style.stroke = scoreColor(score || 0);
  fillEl.setAttribute('stroke-dashoffset', offset);

  document.getElementById('scoreText').textContent = score != null ? score : '--';
  document.getElementById('scoreLabel').textContent = score != null ? `${scoreLabelFor(score)} password` : 'No score yet';
}

function statusBadge(status, isSuspicious) {
  if (isSuspicious) return '<span class="badge badge-warning">Suspicious</span>';
  if (status === 'success') return '<span class="badge badge-success">Success</span>';
  if (status === 'failed_locked') return '<span class="badge badge-danger">Locked</span>';
  return '<span class="badge badge-danger">Failed</span>';
}

async function loadDashboard() {
  try {
    const { data } = await api.get('/user/dashboard');
    const user = auth.getUser();

    // Topbar
    document.getElementById('greeting').textContent = `Welcome back, ${data.account.fullName.split(' ')[0]}`;
    document.getElementById('userNameChip').textContent = data.account.fullName;
    document.getElementById('userAvatar').textContent = data.account.fullName.charAt(0).toUpperCase();

    // Account info card
    document.getElementById('infoName').textContent = data.account.fullName;
    document.getElementById('infoEmail').textContent = data.account.email;
    document.getElementById('infoSince').textContent = new Date(data.account.memberSince).toLocaleDateString();
    document.getElementById('infoLastLogin').textContent = data.account.lastLoginAt
      ? new Date(data.account.lastLoginAt).toLocaleString() : 'This is your first login';

    document.getElementById('profileFullName').value = data.account.fullName;
    document.getElementById('profileEmail').value = data.account.email;

    renderScoreRing(data.passwordScore);
    renderLoginHistory(data.recentLogins);
    renderAlerts(data.alerts);
  } catch (err) {
    showAlert('alertBox', err.message || 'Failed to load dashboard data.', 'error');
  }
}

function renderLoginHistory(logins) {
  const body = document.getElementById('loginHistoryBody');
  if (!logins || logins.length === 0) {
    body.innerHTML = '<tr><td colspan="3" class="text-muted text-sm">No login history yet.</td></tr>';
    return;
  }
  body.innerHTML = logins.map((log) => `
    <tr>
      <td data-label="Time" class="text-sm">${timeAgo(log.created_at)}</td>
      <td data-label="IP" class="ip-cell">${escapeHtml(log.ip_address)}</td>
      <td data-label="Status">${statusBadge(log.status, log.is_suspicious)}</td>
    </tr>
  `).join('');
}

function renderAlerts(alerts) {
  const container = document.getElementById('alertsList');
  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted">No security alerts. You\'re all clear!</p>';
    return;
  }
  container.innerHTML = alerts.map((alert) => `
    <div class="alert-item">
      <div class="alert-icon ${alert.severity}">${alert.severity === 'high' || alert.severity === 'critical' ? '&#9888;' : '&#128276;'}</div>
      <div style="flex: 1;">
        <div class="alert-title">${escapeHtml(alert.alert_type.replace(/_/g, ' '))}</div>
        <p class="alert-message">${escapeHtml(alert.message)}</p>
      </div>
      <div class="alert-time">${timeAgo(alert.created_at)}</div>
    </div>
  `).join('');
}

async function loadRecommendations() {
  const container = document.getElementById('recommendationsList');
  try {
    const { data, aiConfigured } = await api.get('/ai/recommendations');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted">No recommendations right now.</p>';
      return;
    }
    container.innerHTML = data.map((tip) => `
      <div class="recommendation-item">&#10024; <span>${escapeHtml(tip)}</span></div>
    `).join('');
    if (aiConfigured === false) {
      container.insertAdjacentHTML('beforeend', '<p class="text-sm text-muted mt-8">Add a Gemini API key on the backend for personalized AI recommendations.</p>');
    }
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-muted">${escapeHtml(err.message || 'Could not load recommendations.')}</p>`;
  }
}

function wireProfileForm() {
  const form = document.getElementById('profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('profileBtn');
    setButtonLoading(btn, true, 'Saving...');
    try {
      const fullName = document.getElementById('profileFullName').value.trim();
      const email = document.getElementById('profileEmail').value.trim();
      const { data } = await api.put('/user/profile', { fullName, email });

      const user = auth.getUser();
      auth.setUser({ ...user, fullName: data.fullName, email: data.email });
      showAlert('alertBox', 'Profile updated successfully.', 'success');
      loadDashboard();
    } catch (err) {
      const message = err.errors ? err.errors.map((e) => e.message).join(' ') : (err.message || 'Update failed.');
      showAlert('alertBox', message, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function wirePasswordForm() {
  const form = document.getElementById('passwordForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('alertBox');
    const btn = document.getElementById('passwordBtn');
    setButtonLoading(btn, true, 'Updating...');
    try {
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      await api.put('/user/change-password', { currentPassword, newPassword });

      showAlert('alertBox', 'Password changed successfully.', 'success');
      form.reset();
      loadDashboard();
    } catch (err) {
      const message = err.errors ? err.errors.map((e) => e.message).join(' ') : (err.message || 'Password change failed.');
      showAlert('alertBox', message, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function wireLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Even if the API call fails, clear local state and redirect.
    } finally {
      auth.logoutAndRedirect();
    }
  });
}

function wireDownloads() {
  document.getElementById('downloadReportBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await api.download('/reports/security-report', 'security-report.pdf');
    } catch (err) {
      showAlert('alertBox', err.message || 'Could not download report.', 'error');
    }
  });

  document.getElementById('exportCsvBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await api.download('/reports/login-activity-export', 'login-activity.csv');
    } catch (err) {
      showAlert('alertBox', err.message || 'Could not export login activity.', 'error');
    }
  });
}
