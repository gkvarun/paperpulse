const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "paperpulse_session";

export const apiConfigured = Boolean(API_BASE);
export const getSessionToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};
export const clearSession = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage can be unavailable */ }
};
const saveToken = (token) => {
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { throw new Error("Session storage is unavailable in this browser."); }
};

export async function apiRequest(path, { method = "GET", body, token = getSessionToken() } = {}) {
  if (!API_BASE) throw new Error("API is not configured yet. Set VITE_API_BASE_URL in .env.local.");
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status}).`);
  return data;
}

export async function authenticate(mode, values) {
  const data = await apiRequest(mode === "Create account" ? "/api/auth/register" : "/api/auth/login", {
    method: "POST", body: values, token: "",
  });
  saveToken(data.token);
  return data.user;
}
export async function restoreSession() {
  const token = getSessionToken();
  if (!token || !API_BASE) return null;
  try { return (await apiRequest("/api/auth/me", { token })).user; }
  catch { clearSession(); return null; }
}
export async function signOut() {
  try { if (getSessionToken() && API_BASE) await apiRequest("/api/auth/logout", { method: "POST" }); }
  finally { clearSession(); }
}
