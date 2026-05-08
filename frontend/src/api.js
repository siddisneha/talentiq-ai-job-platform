const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("job_portal_token");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: async (email, password) => {
    const body = new URLSearchParams({ username: email, password });
    return request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  },
  me: () => request("/api/users/me"),
  updateMe: (payload) => request("/api/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadResume: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/api/users/me/resume", { method: "POST", body });
  },
  jobs: (params) => request(`/api/jobs/?${new URLSearchParams(params)}`),
  saveJob: (id) => request(`/api/saved-jobs/${id}`, { method: "POST" }),
  apply: (payload) => request("/api/applications/", { method: "POST", body: JSON.stringify(payload) }),
  savedJobs: () => request("/api/saved-jobs/"),
  applications: () => request("/api/applications/"),
  dashboard: () => request("/api/dashboard/summary"),
  recommendations: () => request("/api/recommendations/"),
  resumeMatch: (resumeText) =>
    request("/api/recommendations/resume-match", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText }),
    }),
  analytics: () => request("/api/analytics/summary"),
  alerts: () => request("/api/alerts/"),
  createAlert: (payload) => request("/api/alerts/", { method: "POST", body: JSON.stringify(payload) }),
  alertMatches: (id) => request(`/api/alerts/${id}/matches`),
};
