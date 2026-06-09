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
  users: () => request("/api/users/"),
  updateUserRole: (id, role) => request(`/api/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  savedResume: () => request("/api/users/me/resume/parsed"),
  updateMe: (payload) => request("/api/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadResume: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/api/users/me/resume", { method: "POST", body });
  },
  jobs: (params) => request(`/api/jobs/?${new URLSearchParams(params)}`),
  publicJobs: (params) => request(`/api/public/jobs?${new URLSearchParams(params)}`),
  myJobs: () => request("/api/jobs/mine"),
  createJob: (payload) => request("/api/jobs/", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (id, payload) => request(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteJob: (id) => request(`/api/jobs/${id}`, { method: "DELETE" }),
  importProviderJobs: (provider, payload) =>
    request(`/api/ingestion/providers/${provider}`, { method: "POST", body: JSON.stringify(payload) }),
  importRolePack: (payload) =>
    request("/api/ingestion/role-pack", { method: "POST", body: JSON.stringify(payload) }),
  saveJob: (id) => request(`/api/saved-jobs/${id}`, { method: "POST" }),
  apply: (payload) => request("/api/applications/", { method: "POST", body: JSON.stringify(payload) }),
  updateApplication: (id, payload) =>
    request(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteApplication: (id) => request(`/api/applications/${id}`, { method: "DELETE" }),
  employerApplications: () => request("/api/applications/employer"),
  savedJobs: () => request("/api/saved-jobs/"),
  applications: () => request("/api/applications/"),
  dashboard: () => request("/api/dashboard/summary"),
  recommendations: () => request("/api/recommendations/"),
  resumeMatch: (resumeText) =>
    request("/api/recommendations/resume-match", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText }),
    }),
  aiResumeReview: (resumeText) =>
    request("/api/recommendations/ai/resume-review", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText }),
    }),
  aiSkillGap: (jobId, resumeText) =>
    request("/api/recommendations/ai/skill-gap", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, resume_text: resumeText }),
    }),
  aiMatchExplanation: (jobId, resumeText) =>
    request("/api/recommendations/ai/match-explanation", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, resume_text: resumeText }),
    }),
  aiInterviewQuestions: (jobId, resumeText) =>
    request("/api/recommendations/ai/interview-questions", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, resume_text: resumeText }),
    }),
  aiCareerCoach: (question, resumeText) =>
    request("/api/recommendations/ai/career-coach", {
      method: "POST",
      body: JSON.stringify({ question, resume_text: resumeText }),
    }),
  aiLearningRoadmap: (resumeText) =>
    request("/api/recommendations/ai/learning-roadmap", {
      method: "POST",
      body: JSON.stringify({ resume_text: resumeText }),
    }),
  aiJobSimplifier: (jobId) =>
    request("/api/recommendations/ai/job-simplifier", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId }),
    }),
  aiCoverLetter: (jobId, resumeText) =>
    request("/api/recommendations/ai/cover-letter", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, resume_text: resumeText }),
    }),
  aiResumeTailoring: (jobId, resumeText) =>
    request("/api/recommendations/ai/resume-tailoring", {
      method: "POST",
      body: JSON.stringify({ job_id: jobId, resume_text: resumeText }),
    }),
  aiRecruiterSummary: (applicationId) => request(`/api/recommendations/ai/recruiter/applications/${applicationId}`),
  analytics: () => request("/api/analytics/summary"), // this is calling the backend get/api/analytics/summary then the func in that runs 
  recruiterAnalytics: () => request("/api/analytics/recruiter"),
  powerBiDataset: () => request("/api/analytics/powerbi"),
  alerts: () => request("/api/alerts/"),
  createAlert: (payload) => request("/api/alerts/", { method: "POST", body: JSON.stringify(payload) }),
  alertMatches: (id) => request(`/api/alerts/${id}/matches`),
};
