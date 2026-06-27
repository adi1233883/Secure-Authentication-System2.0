// Powers dashboard-admin.html: single-page-style navigation between
// sections (Overview, Users, Logs, Locked Accounts, Security Analytics),
// each loading its data on first view.

let trendsChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }
  const user = auth.getUser();
  if (user && user.role !== 'admin') {
    window.location.href = 'dashboard-user.html';
    return;
  }

  if (user) {
    document.getElementById('userNameChip').textContent = user.fullName;
    document.getElementById('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();
  }

  wireSidebarNav();
  wireLogout();
  wireLogFilter();
  wireAnalysisButton();
  wireReportDownload();
  initChatbotWidget();

  loadOverview();
});

const SECTION_TITLES = {
  overview: 'Overview',
  users: 'Users',
  logs: 'Login Logs',
  locked: 'Locked Accounts',
  analytics: 'Security Analytics',
};

const loadedSections = new Set();

function wireSidebarNav() {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', () => {
      const section = link.dataset.section;

      document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('main > section').forEach((s) => s.classList.add('hidden'));
      document.getElementById(`section-${section}`).classList.remove('hidden');
      document.getElementById('sectionTitle').textContent = SECTION_TITLES[section];

      if (!loadedSections.has(section)) {
        loadedSections.add(section);
        if (section === 'users') loadUsers();
        if (section === 'logs') loadLogs();
        if (section === 'locked') loadLockedAccounts();
        if (section === 'analytics') loadLatestAnalysis();
      }
    });
  });
}

function wireLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await api.post('/auth/logout'); } catch (e) { /* proceed regardless */ }
    auth.logoutAndRedirect();
  });
}

// --- Overview ---
async function loadOverview() {
  try {
    const { data } = await api.get('/admin/analytics/summary');
    document.getElementById('statTotalUsers').textContent = data.totalUsers;
    document.getElementById('statActiveSessions').textContent = data.activeSessions;
    document.getElementById('statFailedToday').textContent = data.failedLoginsToday;
    document.getElementById('statLockedAccounts').textContent = data.lockedAccounts;

    const trends = await api.get('/admin/analytics/trends?days=7');
    renderTrendsChart(trends.data);
  } catch (err) {
    showAlert('alertBox', err.message || 'Failed to load overview.', 'error');
  }
}

function renderTrendsChart(trendData) {
  const ctx = document.getElementById('trendsChart');
  const labels = trendData.map((d) => new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const successes = trendData.map((d) => d.successes);
  const failures = trendData.map((d) => d.failures);

  if (trendsChartInstance) trendsChartInstance.destroy();
  trendsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Successful logins', data: successes, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.3, fill: true },
        { label: 'Failed logins', data: failures, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, fill: true },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8A93A6' } } },
      scales: {
        x: { ticks: { color: '#8A93A6' }, grid: { color: '#232B3D' } },
        y: { ticks: { color: '#8A93A6' }, grid: { color: '#232B3D' }, beginAtZero: true },
      },
    },
  });
}

// --- Users ---
async function loadUsers() {
  const body = document.getElementById('usersTableBody');
  try {
    const { data } = await api.get('/admin/users?limit=100');
    if (data.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="text-sm text-muted">No users found.</td></tr>';
      return;
    }
    body.innerHTML = data.map((u) => `
      <tr>
        <td data-label="Name">${escapeHtml(u.full_name)}</td>
        <td data-label="Email" class="text-sm">${escapeHtml(u.email)}</td>
        <td data-label="Role"><span class="badge badge-neutral">${u.role}</span></td>
        <td data-label="Status">${u.is_locked ? '<span class="badge badge-danger">Locked</span>' : '<span class="badge badge-success">Active</span>'}</td>
        <td data-label="Score">${u.password_score ?? '—'}</td>
        <td data-label="Actions">
          ${u.is_locked
            ? `<button class="btn btn-secondary btn-sm" data-action="unlock" data-id="${u.id}">Unlock</button>`
            : `<button class="btn btn-secondary btn-sm" data-action="lock" data-id="${u.id}">Lock</button>`}
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleUserAction(btn.dataset.action, btn.dataset.id));
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="text-sm text-muted">${escapeHtml(err.message || 'Failed to load users.')}</td></tr>`;
  }
}

async function handleUserAction(action, id) {
  try {
    if (action === 'lock') await api.patch(`/admin/users/${id}/lock`);
    if (action === 'unlock') await api.patch(`/admin/users/${id}/unlock`);
    loadUsers();
    loadOverview();
  } catch (err) {
    showAlert('alertBox', err.message || 'Action failed.', 'error');
  }
}

// --- Login Logs ---
function wireLogFilter() {
  const filter = document.getElementById('logStatusFilter');
  filter.addEventListener('change', () => loadLogs());
}

async function loadLogs() {
  const body = document.getElementById('logsTableBody');
  const status = document.getElementById('logStatusFilter').value;
  try {
    const query = status ? `?status=${encodeURIComponent(status)}&limit=100` : '?limit=100';
    const { data } = await api.get(`/admin/login-logs${query}`);
    if (data.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="text-sm text-muted">No logs found.</td></tr>';
      return;
    }
    body.innerHTML = data.map((log) => `
      <tr>
        <td data-label="Time" class="text-sm">${new Date(log.created_at).toLocaleString()}</td>
        <td data-label="Email" class="text-sm">${escapeHtml(log.email_attempted)}</td>
        <td data-label="IP" class="ip-cell">${escapeHtml(log.ip_address)}</td>
        <td data-label="Status">${log.status === 'success' ? '<span class="badge badge-success">Success</span>' : '<span class="badge badge-danger">' + log.status.replace(/_/g, ' ') + '</span>'}${log.is_suspicious ? ' <span class="badge badge-warning">Suspicious</span>' : ''}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" class="text-sm text-muted">${escapeHtml(err.message || 'Failed to load logs.')}</td></tr>`;
  }
}

// --- Locked Accounts ---
async function loadLockedAccounts() {
  const body = document.getElementById('lockedTableBody');
  try {
    const { data } = await api.get('/admin/locked-accounts');
    if (data.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="text-sm text-muted">No locked accounts. Nice and clean!</td></tr>';
      return;
    }
    body.innerHTML = data.map((u) => `
      <tr>
        <td data-label="Name">${escapeHtml(u.full_name)}</td>
        <td data-label="Email" class="text-sm">${escapeHtml(u.email)}</td>
        <td data-label="Failed Attempts">${u.failed_attempts}</td>
        <td data-label="Actions"><button class="btn btn-secondary btn-sm" data-action="unlock" data-id="${u.id}">Unlock</button></td>
      </tr>
    `).join('');
    body.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await handleUserAction('unlock', btn.dataset.id);
        loadLockedAccounts();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" class="text-sm text-muted">${escapeHtml(err.message || 'Failed to load locked accounts.')}</td></tr>`;
  }
}

// --- Security Analytics / AI Log Analyzer ---
function wireAnalysisButton() {
  document.getElementById('runAnalysisBtn').addEventListener('click', runAnalysis);
}

async function loadLatestAnalysis() {
  try {
    const { data } = await api.get('/ai/analyze-logs/latest');
    if (data) {
      renderAnalysis(data.summary, data.findings);
    }
  } catch (err) {
    // No analysis yet is fine — leave the default placeholder text.
  }
}

async function runAnalysis() {
  const btn = document.getElementById('runAnalysisBtn');
  setButtonLoading(btn, true, 'Analyzing...');
  try {
    const { data, aiConfigured } = await api.post('/ai/analyze-logs');
    renderAnalysis(data.summary, data.findings);
    if (aiConfigured === false) {
      showAlert('alertBox', 'AI summarization is not configured (no GEMINI_API_KEY) — showing raw findings only.', 'info');
    }
  } catch (err) {
    showAlert('alertBox', err.message || 'Analysis failed.', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function renderAnalysis(summary, findings) {
  document.getElementById('analysisSummary').innerHTML = `<div>${escapeHtml(summary).replace(/\n/g, '<br>')}</div>`;

  const bruteForceEl = document.getElementById('bruteForceList');
  if (!findings.bruteForceIPs || findings.bruteForceIPs.length === 0) {
    bruteForceEl.innerHTML = '<p class="text-sm text-muted">No brute-force patterns detected.</p>';
  } else {
    bruteForceEl.innerHTML = findings.bruteForceIPs.map((ip) => `
      <div class="alert-item">
        <div class="alert-icon high">&#9888;</div>
        <div>
          <div class="alert-title ip-cell">${escapeHtml(ip.ip_address)}</div>
          <p class="alert-message">${ip.attempts} attempts across ${ip.distinct_accounts} accounts</p>
        </div>
      </div>
    `).join('');
  }

  const credEl = document.getElementById('credStuffingList');
  if (!findings.credentialStuffingAccounts || findings.credentialStuffingAccounts.length === 0) {
    credEl.innerHTML = '<p class="text-sm text-muted">No credential-stuffing patterns detected.</p>';
  } else {
    credEl.innerHTML = findings.credentialStuffingAccounts.map((acc) => `
      <div class="alert-item">
        <div class="alert-icon high">&#9888;</div>
        <div>
          <div class="alert-title text-sm">${escapeHtml(acc.email_attempted)}</div>
          <p class="alert-message">${acc.attempts} attempts from ${acc.distinct_ips} different IPs</p>
        </div>
      </div>
    `).join('');
  }
}

function wireReportDownload() {
  document.getElementById('downloadFullReportBtn').addEventListener('click', async () => {
    try {
      await api.download('/reports/admin/full-report', 'organization-security-report.pdf');
    } catch (err) {
      showAlert('alertBox', err.message || 'Could not download report.', 'error');
    }
  });
}
