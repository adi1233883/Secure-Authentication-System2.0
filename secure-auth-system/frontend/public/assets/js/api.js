// Shared fetch wrapper — every other page script calls api.get/post/etc
// instead of raw fetch(). Automatically attaches the JWT (stored in
// localStorage after login) and normalizes error handling.
//
// Note on token storage: the project blueprint flags httpOnly cookies as
// the more secure option for production (not readable by JS, so an XSS bug
// can't steal the token). localStorage is used here because this is a
// plain HTML/JS frontend without a build step, which makes localStorage the
// simplest approach to demo end-to-end. See README "Security Notes" for the
// production recommendation.

const API_BASE = (() => {
  // Same-origin by default; override by editing this if your backend runs
  // on a different host/port than the page is served from.
  return window.API_BASE_URL = "https://secure-authentication-system2-0.onrender.com/api";
})();

const TOKEN_KEY = 'sas_token';
const USER_KEY = 'sas_user';

const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),

  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(USER_KEY),

  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),

  logoutAndRedirect: () => {
    auth.clearToken();
    auth.clearUser();
    window.location.href = 'index.html';
  },
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw { success: false, message: 'Could not reach the server. Is the backend running?' };
  }

  // 401 on a protected route almost always means the session expired —
  // bounce to login rather than showing a confusing error.
  if (response.status === 401 && auth.isLoggedIn()) {
    auth.logoutAndRedirect();
    throw { success: false, message: 'Session expired. Please log in again.' };
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // e.g. PDF/CSV downloads — caller handles the raw response separately.
    return response;
  }

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),

  // For file downloads (PDF/CSV) — fetch raw, attach token, trigger browser download.
  download: async (path, filename) => {
    const token = auth.getToken();
    const response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Download failed' }));
      throw data;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// --- Small shared UI helpers used across pages ---
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert-banner ${type}`;
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('hidden');
}

function setButtonLoading(button, isLoading, loadingText = 'Please wait...') {
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.originalText || button.innerHTML;
    button.disabled = false;
  }
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
