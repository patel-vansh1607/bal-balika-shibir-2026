// ============================================================
// Centralized API client — replaces Supabase JS client
// All calls go to REACT_APP_API_URL (your cPanel PHP backend)
// ============================================================

const API_BASE = (process.env.REACT_APP_API_URL || 'https://api.riftkoders.com/mtrc').replace(/\/$/, '');

const TOKEN_KEY    = 'auth_token';
const USER_KEY     = 'auth_user';

// ---- Token helpers ----
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ---- Core fetch wrapper ----
async function apiFetch(method, path, body = null, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---- Auth ----
export const auth = {
  login: (email, password) =>
    apiFetch('POST', '/auth/login', { email, password }),

  me: () =>
    apiFetch('GET', '/auth/me'),

  logout: () => {
    clearToken();
    localStorage.removeItem('selected_shibir_region');
    localStorage.removeItem('selected_shibir_prefix');
    localStorage.removeItem('user_role');
  },
};

// ---- Attendees ----
export const attendees = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return apiFetch('GET', `/attendees${qs ? '?' + qs : ''}`);
  },

  get: (id) => apiFetch('GET', `/attendees/${id}`),

  create: (data) => apiFetch('POST', '/attendees', data),

  update: (id, data) => apiFetch('PATCH', `/attendees/${id}`, data),
};

// ---- Sessions ----
export const sessions = {
  list: () => apiFetch('GET', '/sessions'),
  count: () => apiFetch('GET', '/sessions/count'),
  get: (id) => apiFetch('GET', `/sessions/${id}`),
  create: (data) => apiFetch('POST', '/sessions', data),
};

// ---- Session Logs ----
export const sessionLogs = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return apiFetch('GET', `/session-logs${qs ? '?' + qs : ''}`);
  },
  create: (data) => apiFetch('POST', '/session-logs', data),
};

// ---- Gate Logs ----
export const gateLogs = {
  list: (limit = 20) => apiFetch('GET', `/gate-logs?limit=${limit}`),
  create: (data) => apiFetch('POST', '/gate-logs', data),
};

// ---- User Roles ----
export const userRoles = {
  list: () => apiFetch('GET', '/user-roles'),
  me: () => apiFetch('GET', '/user-roles/me'),
  update: (id, data) => apiFetch('PATCH', `/user-roles/${id}`, data),
  create: (data) => apiFetch('POST', '/user-roles', data),
};

// ---- File upload ----
export const upload = {
  photo: async (fileBlob, filename) => {
    const fd = new FormData();
    fd.append('file', fileBlob, filename);
    fd.append('filename', filename);
    return apiFetch('POST', '/upload/photo', fd, true);
  },

  qr: async (svgBlob, filename) => {
    const fd = new FormData();
    fd.append('file', svgBlob, filename);
    fd.append('filename', filename);
    return apiFetch('POST', '/upload/qr', fd, true);
  },
};

// ---- Email ----
export const email = {
  sendRegistration:  (data) => apiFetch('POST', '/email/send-registration',  data),
  sendAdminWelcome:  (data) => apiFetch('POST', '/email/send-admin-welcome',  data),
  sendSelection:     (data) => apiFetch('POST', '/email/send-selection',      data),
};

// ---- Karayakars (volunteers) ----
export const karayakars = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return apiFetch('GET', `/karayakars${qs ? '?' + qs : ''}`);
  },
  get:    (id)       => apiFetch('GET',    `/karayakars/${id}`),
  create: (data)     => apiFetch('POST',   '/karayakars', data),
  update: (id, data) => apiFetch('PATCH',  `/karayakars/${id}`, data),
  remove: (id)       => apiFetch('DELETE', `/karayakars/${id}`),
};

// Default export for convenience
const api = { auth, attendees, sessions, sessionLogs, gateLogs, userRoles, upload, email, karayakars };
export default api;
