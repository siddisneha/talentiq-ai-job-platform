import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BriefcaseBusiness,
  BarChart3,
  ChartColumn,
  ExternalLink,
  FileText,
  Link,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { api, assetUrl } from "./api";
import "./styles.css";
import{
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
}from "recharts"

const emptyFilters = { search: "", country: "", location: "", skill: "", job_type: "", salary_min: "" };
const countryOptions = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
  "Remote",
  "Worldwide",
];
const applicationStatuses = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];
const statusPalette = {
  applied: "#2563eb",
  screening: "#0f766e",
  interview: "#7c3aed",
  offer: "#15803d",
  rejected: "#b42318",
  withdrawn: "#64748b",
  unknown: "#94a3b8",
};
const statusLabels = Object.fromEntries(applicationStatuses.map((status) => [status.value, status.label]));
const branchOptions = [
  {
    value: "data_ai",
    label: "Data / AI",
    roles: [
      "Data Analyst",
      "Business Analyst",
      "BI Analyst",
      "Power BI Analyst",
      "Data Visualization Analyst",
      "Data Engineer",
      "ETL Developer",
      "Data Scientist",
      "Machine Learning Engineer",
      "AI Engineer",
    ],
  },
  {
    value: "cse_it",
    label: "CSE / IT",
    roles: [
      "Software Engineer",
      "Python Developer",
      "Backend Developer",
      "Frontend Developer",
      "Full Stack Developer",
      "Application Developer",
      "Web Developer",
      "DevOps Engineer",
      "Cloud Engineer",
      "QA Engineer",
      "Software Tester",
      "Cybersecurity Analyst",
      "System Administrator",
      "IT Support Engineer",
    ],
  },
  {
    value: "ece",
    label: "ECE",
    roles: [
      "Embedded Systems Engineer",
      "Embedded Software Engineer",
      "VLSI Engineer",
      "RTL Design Engineer",
      "FPGA Engineer",
      "Verification Engineer",
      "Semiconductor Engineer",
      "Electronics Engineer",
      "Hardware Design Engineer",
      "PCB Design Engineer",
      "IoT Engineer",
      "Signal Processing Engineer",
      "Telecommunications Engineer",
      "RF Engineer",
      "Network Engineer",
    ],
  },
  {
    value: "eee",
    label: "EEE",
    roles: [
      "Electrical Engineer",
      "Power Systems Engineer",
      "Control Systems Engineer",
      "PLC SCADA Engineer",
      "Electrical Maintenance Engineer",
      "Electrical Project Engineer",
      "Electrical Site Engineer",
      "Substation Engineer",
      "Renewable Energy Engineer",
      "Solar Engineer",
      "Electrical Design Engineer",
      "Maintenance Engineer",
      "Automation Engineer",
      "Instrumentation Engineer",
    ],
  },
  {
    value: "mechanical",
    label: "Mechanical",
    roles: [
      "Mechanical Engineer",
      "Design Engineer",
      "Mechanical Design Engineer",
      "CAD Engineer",
      "CAE Engineer",
      "Thermal Engineer",
      "HVAC Engineer",
      "Manufacturing Engineer",
      "Production Engineer",
      "Quality Engineer",
      "Maintenance Engineer",
      "Automobile Engineer",
      "Process Engineer",
    ],
  },
  {
    value: "civil",
    label: "Civil",
    roles: [
      "Civil Engineer",
      "Site Engineer",
      "Structural Engineer",
      "Construction Project Engineer",
      "Quantity Surveyor",
      "Planning Engineer",
      "AutoCAD Draftsman",
      "BIM Engineer",
      "Revit Modeler",
      "Highway Engineer",
      "Geotechnical Engineer",
      "Estimation Engineer",
    ],
  },
  {
    value: "business",
    label: "Business / Management",
    roles: [
      "Business Analyst",
      "Product Manager",
      "Project Coordinator",
      "Operations Analyst",
      "Marketing Analyst",
      "HR Analyst",
      "Sales Analyst",
      "Financial Analyst",
      "Management Trainee",
      "Operations Executive",
      "Digital Marketing Executive",
    ],
  },
];
const roleOptions = [
  "Data Analyst",
  "Data Scientist",
  "Business Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Python Backend Developer",
  "React Frontend Developer",
  "Full Stack Developer",
  "Cloud DevOps Engineer",
  "BI Analyst",
];
const allRoleOptions = [...new Set([...roleOptions, ...branchOptions.flatMap((branch) => branch.roles)])];

function branchLabel(value) {
  return branchOptions.find((branch) => branch.value === value)?.label || value;
}

function canManageJobs(user) {
  return user?.role === "employer" || user?.role === "admin";
}

function isAdmin(user) {
  return user?.role === "admin";
}

function isCandidate(user) {
  return !user || user.role === "candidate";
}

function isSampleJob(job) {
  return job.source_name === "Sample Seed Feed" || job.source_url?.includes("example.com");
}

function isPortalJob(job) {
  return Boolean(job.posted_by_id) && !job.source_name;
}

function jobSourceLabel(job) {
  if (isSampleJob(job)) return "Sample";
  if (isPortalJob(job)) return "Portal";
  return job.source_name || "External";
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMatchScore(score) {
  const value = Number(score);
  return Number.isFinite(value) ? `${Math.round(value)}% match` : "Match";
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("job_portal_token"));
  const [activeView, setActiveView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recruiterAnalytics, setRecruiterAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [employerApplications, setEmployerApplications] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertMatches, setAlertMatches] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [resumeText, setResumeText] = useState("");
  const [uploadedResumeText, setUploadedResumeText] = useState("");
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeUploadResult, setResumeUploadResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiQuestion, setAiQuestion] = useState("How do I become a Data Scientist?");
  const [aiJobId, setAiJobId] = useState("");
  const [applyTarget, setApplyTarget] = useState(null);
  const [editJobTarget, setEditJobTarget] = useState(null);
  const [authIntent, setAuthIntent] = useState(null);
  const [appliedJob, setAppliedJob] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [message, setMessage] = useState("");
  const [heroStacked, setHeroStacked] = useState(false);
  const [publicPage, setPublicPage] = useState("home");
  const appliedJobIds = useMemo(
    () => new Set(applications.map((application) => application.job_id)),
    [applications],
  );
  const applicationStatusData = useMemo(() => analytics?.application_statuses || [], [analytics]);
  const topSkillData = useMemo(() => analytics?.top_skills || [], [analytics]);
  const topRoleData = useMemo(() => analytics?.top_roles || [], [analytics]);
  const topLocationData = useMemo(() => analytics?.top_locations || [], [analytics]);
  const applicationPerJobData = useMemo(() => analytics?.applications_per_job || [], [analytics]);
  const engagementData = useMemo(() => {
    const activity = dashboard?.recent_activity_count || 0;
    const alertsCount = dashboard?.alerts_count || 0;
    const savedCount = dashboard?.saved_jobs_count || 0;
    return [
      { name: "Activity", count: activity },
      { name: "Alerts", count: alertsCount },
      { name: "Saved", count: savedCount },
    ];
  }, [dashboard]);
  const availableRecommendations = recommendations.filter(
    (item) => !appliedJobIds.has(item.job.id) && Number(item.score || 0) >= 25,
  );
  const availableJobs = jobs.filter((job) => !appliedJobIds.has(job.id));
  const availableSavedJobs = savedJobs.filter((item) => !appliedJobIds.has(item.job.id));
  const aiJobs = [...recommendations.map((item) => item.job), ...jobs].filter(
    (job, index, list) => job && list.findIndex((item) => item.id === job.id) === index,
  );
  const selectedAiJobId = Number(aiJobId || aiJobs[0]?.id || 0);

  async function loadPrivateData() {
    let me;
    try {
      me = await api.me();
    } catch (error) {
      localStorage.removeItem("job_portal_token");
      setToken(null);
      setUser(null);
      setMessage("Session expired. Please login again.");
      return;
    }

    setUser(me);
    if (isAdmin(me) && ["dashboard", "employer-dashboard", "tracker", "alerts", "ai-career"].includes(activeView)) {
      setActiveView("admin-dashboard");
    } else if (canManageJobs(me) && ["dashboard", "tracker", "alerts", "ai-career"].includes(activeView)) {
      setActiveView("employer-dashboard");
    }
    if (!isAdmin(me) && ["admin-dashboard", "admin-users", "admin-ai"].includes(activeView)) {
      setActiveView(canManageJobs(me) ? "employer-dashboard" : "dashboard");
    }
    if (!canManageJobs(me) && ["employer-dashboard", "employer-jobs", "employer-applicants", "employer-analytics", "post-jobs"].includes(activeView)) {
      setActiveView("dashboard");
    }

    const safe = async (request, fallback) => {
      try {
        return await request();
      } catch (error) {
        console.warn(error);
        return fallback;
      }
    };

    const [dash, recs, apps, saved, stats, userAlerts] = await Promise.all([
      safe(api.dashboard, null),
      safe(api.recommendations, []),
      safe(api.applications, []),
      safe(api.savedJobs, []),
      safe(api.analytics, null),
      safe(api.alerts, []),
    ]);
    const [postedJobs, applicants] = canManageJobs(me)
      ? await Promise.all([
          safe(api.myJobs, []),
          safe(api.employerApplications, []),
        ])
      : [[], []];
    const recruiterStats = canManageJobs(me) ? await safe(api.recruiterAnalytics, null) : null;
    const users = isAdmin(me) ? await safe(api.users, []) : [];
    setMyJobs(postedJobs);
    setEmployerApplications(applicants);
    setAdminUsers(users);
    setDashboard(dash);
    setRecommendations(recs);
    setApplications(apps);
    setSavedJobs(saved);
    setAnalytics(stats);
    setAlerts(userAlerts);
    setRecruiterAnalytics(recruiterStats);
  }

  async function loadJobs(nextFilters = filters) {
    const clean = Object.fromEntries(
      Object.entries(nextFilters)
        .filter(([key, value]) => key !== "country" && value)
    );
    if (nextFilters.country && !clean.location) {
      clean.location = nextFilters.country;
    }
    if (isCandidate(user) && user?.preferred_branch && !clean.search && !clean.skill) {
      clean.branch = user.preferred_branch;
    }
    setJobs(token ? await api.jobs(clean) : await api.publicJobs(clean));
  }

  useEffect(() => {
    loadJobs();
    if (token) {
      loadPrivateData().catch((error) => setMessage(error.message));
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      loadJobs().catch((error) => setMessage(error.message));
    }
  }, [filters, token]);

  useEffect(() => {
    if (token && user) {
      loadJobs();
    }
  }, [user?.preferred_branch, user?.preferred_role]);

  useEffect(() => {
    const updateHeroStacked = () => {
      setHeroStacked(window.scrollY > 24);
    };

    updateHeroStacked();
    window.addEventListener("scroll", updateHeroStacked, { passive: true });
    return () => window.removeEventListener("scroll", updateHeroStacked);
  }, []);

  async function handleLogin(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem("job_portal_token", data.access_token);
    setToken(data.access_token);
    setMessage("Signed in successfully");
  }

  function promptLoginForApply(job) {
    setApplyTarget(job);
    setAuthIntent("register");
    setMessage("Sign in to continue with this application");
    window.setTimeout(() => {
      const loginInput = document.querySelector('input[name="email"]');
      loginInput?.focus();
      loginInput?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function logout() {
    localStorage.removeItem("job_portal_token");
    setToken(null);
    setUser(null);
    setActiveView("dashboard");
    setApplyTarget(null);
    setEditJobTarget(null);
    setAuthIntent(null);
    setMessage("Returned to sign-in");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveJob(jobId) {
    await api.saveJob(jobId);
    setMessage("Job saved");
    await loadPrivateData();
  }

  async function applyToJob(event) {
    event.preventDefault();
    const job = applyTarget;
    const payload = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    await api.apply({ ...payload, job_id: job.id, resume_url: user?.resume_url || undefined });
    setMessage(isPortalJob(job) ? "Applied successfully" : "Marked as applied");
    setApplyTarget(null);
    setAppliedJob(job);
    await loadPrivateData();
  }

  async function updateApplicationStatus(applicationId, status) {
    await api.updateApplication(applicationId, { status });
    setMessage("Application status updated");
    await loadPrivateData();
  }

  async function createJob(event) {
    event.preventDefault();
    if (!canManageJobs(user)) {
      setMessage("Use an employer account to post jobs.");
      return;
    }

    const payload = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    for (const key of ["salary_min", "salary_max"]) {
      if (payload[key]) payload[key] = Number(payload[key]);
    }
    try {
      const created = await api.createJob(payload);
      event.currentTarget.reset();
      setMessage(`Job posted: ${created.title}`);
      setActiveView("employer-jobs");
      setMyJobs((current) => [created, ...current.filter((job) => job.id !== created.id)]);
      await Promise.all([loadJobs(), loadPrivateData()]);
    } catch (error) {
      setMessage(error.message || "Job post failed. Please check the required fields.");
    }
  }

  async function deleteMyJob(jobId) {
    await api.deleteJob(jobId);
    setMessage("Job removed from active listings");
    await Promise.all([loadJobs(), loadPrivateData()]);
  }

  async function updateJob(event) {
    event.preventDefault();
    const job = editJobTarget;
    if (!job) return;

    const payload = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    for (const key of ["salary_min", "salary_max"]) {
      if (payload[key]) payload[key] = Number(payload[key]);
    }

    try {
      await api.updateJob(job.id, payload);
      setEditJobTarget(null);
      setMessage("Job updated");
      await Promise.all([loadJobs(), loadPrivateData()]);
    } catch (error) {
      setMessage(error.message || "Could not update job");
    }
  }

  async function deleteApplication(applicationId) {
    try {
      await api.deleteApplication(applicationId);
      setMessage("Application removed");
      await loadPrivateData();
    } catch (error) {
      setMessage(error.message || "Could not remove application");
    }
  }

  function flagRecommendation(job) {
    setMessage(`Flag noted for review: ${job.title}`);
  }

  async function updateUserRole(userId, role) {
    try {
      await api.updateUserRole(userId, role);
      setMessage("User role updated");
      await loadPrivateData();
    } catch (error) {
      setMessage(error.message || "Could not update user role");
    }
  }

  async function importRealJobs(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const provider = form.get("provider");
    const payload = Object.fromEntries(
      [...form.entries()].filter(([key, value]) => key !== "provider" && String(value).trim() !== ""),
    );
    if (payload.limit) payload.limit = Number(payload.limit);
    const result = await api.importProviderJobs(provider, payload);
    setImportResult(result);
    setMessage(`Imported ${result.created_count} jobs, skipped ${result.skipped_count}`);
    await Promise.all([loadJobs(), loadPrivateData()]);
  }

  async function importRolePack(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roles = String(form.get("roles") || "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
    const countries = String(form.get("countries") || "")
      .split(",")
      .map((country) => country.trim())
      .filter(Boolean);
    const branches = String(form.get("branches") || "")
      .split(",")
      .map((branch) => branch.trim())
      .filter(Boolean);
    const result = await api.importRolePack({
      roles,
      branches,
      countries,
      limit_per_search: Number(form.get("limit_per_search") || 50),
      include_external_key_providers: true,
    });
    setImportResult(result);
    setMessage(`Imported ${result.created_count} jobs, skipped ${result.skipped_count}`);
    await Promise.all([loadJobs(), loadPrivateData()]);
  }

  async function createAlert(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      [...form.entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    if (payload.minimum_salary) payload.minimum_salary = Number(payload.minimum_salary);
    const alert = await api.createAlert(payload);
    event.currentTarget.reset();
    setMessage("Alert created");
    const matches = await api.alertMatches(alert.id);
    setAlertMatches(matches.matches);
    await loadPrivateData();
  }

  async function matchResume() {
    const text = (uploadedResumeText || resumeText).trim();
    const result = await api.resumeMatch(text);
    setResumeResult(result);
  }

  async function runCandidateAI(action) {
    const text = (uploadedResumeText || resumeText || user?.summary || user?.skills || "").trim();
    if (!text && action !== "job-simplifier") {
      setMessage("Add resume text or upload a resume first");
      return;
    }
    if (
      ["skill-gap", "match-explanation", "interview-questions", "job-simplifier", "cover-letter", "resume-tailoring"].includes(action)
      && !selectedAiJobId
    ) {
      setMessage("Choose a job for this AI action");
      return;
    }
    const actions = {
      "resume-review": () => api.aiResumeReview(text),
      "skill-gap": () => api.aiSkillGap(selectedAiJobId, text),
      "match-explanation": () => api.aiMatchExplanation(selectedAiJobId, text),
      "interview-questions": () => api.aiInterviewQuestions(selectedAiJobId, text),
      "career-coach": () => api.aiCareerCoach(aiQuestion, text),
      "learning-roadmap": () => api.aiLearningRoadmap(text),
      "job-simplifier": () => api.aiJobSimplifier(selectedAiJobId),
      "cover-letter": () => api.aiCoverLetter(selectedAiJobId, text),
      "resume-tailoring": () => api.aiResumeTailoring(selectedAiJobId, text),
    };
    const result = await actions[action]();
    setAiResult({ action, result });
    setMessage("AI insight generated");
  }

  async function runRecruiterAI(applicationId) {
    const result = await api.aiRecruiterSummary(applicationId);
    setAiResult({ action: "recruiter-ai", result });
    setMessage("Recruiter AI summary generated");
  }

  async function updateProfile(event) {
    event.preventDefault();
    const payload = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    if (payload.preferred_branch) payload.preferred_branch = String(payload.preferred_branch).toLowerCase();
    const updated = await api.updateMe(payload);
    setUser(updated);
    setProfileSaved(true);
    setMessage("Profile saved successfully");
    await loadPrivateData();
  }

  async function uploadResume(event) {
    if (!isCandidate(user)) {
      setMessage("Resume upload is only available for candidate accounts.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await api.uploadResume(file);
    setUser(result.user);
    setResumeUploadResult(result);
    setUploadedResumeText(result.extracted_text || "");
    setResumeResult(null);
    setMessage("Resume uploaded");
  }

  async function showAlertMatches(alertId) {
    const result = await api.alertMatches(alertId);
    setAlertMatches(result.matches);
  }

  async function downloadPowerBiDataset() {
    const dataset = await api.powerBiDataset();
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "avenir-powerbi-dataset.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Power BI dataset exported");
  }

  const topSkillMax = useMemo(
    () => Math.max(...(analytics?.top_skills || []).map((item) => item.count), 1),
    [analytics],
  );

  function openSignedInHome() {
    setActiveView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!token) {
    if (applyTarget || authIntent) {
      return (
        <AuthScreen
          applyTarget={applyTarget}
          initialMode={authIntent || "register"}
          message={message}
          onLogin={handleLogin}
          onRegister={api.register}
          setMessage={setMessage}
          onCancel={() => {
            setAuthIntent(null);
            setApplyTarget(null);
          }}
        />
      );
    }
    return (
      <main className="public-page public-page-avenir">
        <nav className="public-nav" aria-label="Public navigation">
            <div className="public-nav-brand" style={{ cursor: "pointer" }} onClick={() => { setPublicPage("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <span className="public-nav-mark"><BriefcaseBusiness size={18} /></span>
              <strong>Avenir</strong>
            </div>
          <div className="public-nav-links">
            <button 
              type="button" 
              onClick={() => { 
                setPublicPage("home"); 
                window.setTimeout(() => {
                  document.getElementById("featured-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }}
            >
              Jobs
            </button>
            <form 
              className="nav-search-form"
              onSubmit={(event) => { 
                event.preventDefault();
                const query = event.target.elements.navSearch.value;
                setFilters({ ...filters, search: query });
                setPublicPage("search"); 
                window.setTimeout(() => {
                  document.getElementById("featured-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  loadJobs({ ...filters, search: query });
                }, 150);
              }}
            >
              <input 
                name="navSearch"
                type="text"
                placeholder="Search jobs..."
                className="nav-search-input"
              />
              <button type="submit" className="nav-search-icon-btn" aria-label="Search">
                <Search size={15} />
              </button>
            </form>
          </div>
          <div className="public-nav-actions">
            <button className="nav-icon-button" type="button" onClick={() => setAuthIntent("login")}>
              <LogOut size={16} /> Login
            </button>
            <button className="nav-icon-button primary" type="button" onClick={() => setAuthIntent("register")}>
              <UserRound size={16} /> Create
            </button>
          </div>
        </nav>

        <section className="public-content public-content-avenir">
          <header className="public-hero public-hero-avenir">
            <div className="avenir-landing-hero">
              <div className="hero-title-stage">
                <span className="hero-kicker">Where talent meets momentum.</span>
                <h1>Avenir</h1>
                <p>Find work that feels aligned with your skills, goals, and next move.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setPublicPage("search")}>
                    <Search size={16} /> Explore jobs
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setAuthIntent("register")}>
                    <UserRound size={16} /> Get started
                  </button>
                </div>
              </div>
              <div className={`hero-opportunity-panel${heroStacked ? " hero-opportunity-panel-stacked" : ""}`} aria-label="Avenir opportunity preview">
                <div className="scroll-story-heading">
                  <span>Opportunity flow</span>
                  <h2>Job matches move like momentum.</h2>
                </div>
                <div className="hero-role-rail">
                  {(jobs.length ? jobs.slice(0, 3) : [
                    { id: "sample-1", title: "Data Analyst Intern", company: "Avenir Picks", location: "Remote", skills: "SQL, Excel, Power BI", job_type: "Internship" },
                    { id: "sample-2", title: "VLSI Engineer", company: "Avenir Picks", location: "Bengaluru", skills: "VLSI, FPGA, Verilog", job_type: "Full Time" },
                    { id: "sample-3", title: "Civil Site Engineer", company: "Avenir Picks", location: "India", skills: "AutoCAD, Site Execution", job_type: "Full Time" },
                  ]).map((job, index) => (
                    <article className="hero-role-card" key={job.id} style={{ "--stack-index": index, cursor: "pointer" }} onClick={() => promptLoginForApply(job)}>
                      <div>
                        <span>{job.job_type || "Open role"}</span>
                        <h3>{job.title}</h3>
                        <p>{job.company} · {job.location}</p>
                      </div>
                      <small>{job.skills || "Skills matched from your profile"}</small>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {publicPage === "home" && (
            <section className="public-feed">
              <Panel title="Job Search" icon={<Search size={20} />} id="job-search">
                <form className="filter-grid public-search-form" onSubmit={(event) => {
                  event.preventDefault();
                  setPublicPage("search");
                  window.setTimeout(() => {
                    document.getElementById("featured-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    loadJobs(filters);
                  }, 100);
                }}>
                  {Object.keys(emptyFilters).map((key) => (
                    key === "country" ? (
                      <select
                        key={key}
                        value={filters.country}
                        onChange={(event) => setFilters({ ...filters, country: event.target.value })}
                      >
                        <option value="">All countries</option>
                        {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                      </select>
                    ) : key === "job_type" ? (
                      <select
                        key={key}
                        value={filters.job_type}
                        onChange={(event) => setFilters({ ...filters, job_type: event.target.value })}
                      >
                        <option value="">All job types</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Internship">Internship</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    ) : (
                      <input
                        key={key}
                        placeholder={key.replace("_", " ")}
                        value={filters[key]}
                        onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                      />
                    )
                  ))}
                  <button type="submit">Search</button>
                </form>
              </Panel>
              <Panel title="Suggested For You" icon={<Sparkles size={20} />} id="featured-jobs">
                <div className="jobs-section-head">
                  <h3>Recommended starting points</h3>
                  <span>Showing {Math.min(jobs.length, 4)} suggestions</span>
                </div>
                <div className="job-grid public-job-grid">
                  {jobs.slice(0, 4).map((job, index) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      style={{ "--card-index": index }}
                      onSave={() => setMessage("Login or register to save jobs")}
                      onApply={() => promptLoginForApply(job)}
                      canApply
                    />
                  ))}
                </div>
              </Panel>
            </section>
          )}
          {publicPage === "search" && (
            <section className="public-feed public-search-page">
              <Panel title="Job Search" icon={<Search size={20} />} id="job-search">
                <form className="filter-grid public-search-form" onSubmit={(event) => { event.preventDefault(); loadJobs(filters); }}>
                  {Object.keys(emptyFilters).map((key) => (
                    key === "country" ? (
                      <select
                        key={key}
                        value={filters.country}
                        onChange={(event) => setFilters({ ...filters, country: event.target.value })}
                      >
                        <option value="">All countries</option>
                        {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
                      </select>
                    ) : key === "job_type" ? (
                      <select
                        key={key}
                        value={filters.job_type}
                        onChange={(event) => setFilters({ ...filters, job_type: event.target.value })}
                      >
                        <option value="">All job types</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Internship">Internship</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    ) : (
                      <input
                        key={key}
                        placeholder={key.replace("_", " ")}
                        value={filters[key]}
                        onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                      />
                    )
                  ))}
                  <button type="submit">Search</button>
                </form>
              </Panel>
              <Panel title="Search Results" icon={<Search size={20} />} id="featured-jobs">
                <div className="jobs-section-head">
                  <h3>Available Opportunities</h3>
                  <span>Showing {Math.min(jobs.length, 150)} results</span>
                </div>
                <div className="job-grid public-job-grid">
                  {!jobs.length ? (
                    <div className="empty-state" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 1rem" }}>
                      <strong>No jobs found</strong>
                      <span>Try adjusting your search filters.</span>
                    </div>
                  ) : (
                    jobs.slice(0, 150).map((job, index) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        style={{ "--card-index": index }}
                        onSave={() => setMessage("Login or register to save jobs")}
                        onApply={() => promptLoginForApply(job)}
                        canApply
                      />
                    ))
                  )}
                </div>
              </Panel>
            </section>
          )}
          </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <RoleOptions />
      <aside className="sidebar">
        <button className="brand-row brand-row-button" type="button" onClick={openSignedInHome} aria-label="Open Avenir home">
          <BriefcaseBusiness size={28} />
          <div>
            <strong>Avenir</strong>
            <span>Where talent meets momentum.</span>
          </div>
        </button>
        <nav>
          {isAdmin(user) ? (
            <>
              <button className={activeView === "admin-dashboard" ? "active-nav" : ""} onClick={() => setActiveView("admin-dashboard")}><ShieldCheck size={18} /> Admin</button>
              <button className={activeView === "admin-users" ? "active-nav" : ""} onClick={() => setActiveView("admin-users")}><UserRound size={18} /> Users</button>
              <button className={activeView === "employer-jobs" ? "active-nav" : ""} onClick={() => setActiveView("employer-jobs")}><PlusCircle size={18} /> All Jobs</button>
              <button className={activeView === "employer-applicants" ? "active-nav" : ""} onClick={() => setActiveView("employer-applicants")}><FileText size={18} /> Applicants</button>
              <button className={activeView === "employer-analytics" ? "active-nav" : ""} onClick={() => setActiveView("employer-analytics")}><BarChart3 size={18} /> Analytics</button>
              <button className={activeView === "admin-ai" ? "active-nav" : ""} onClick={() => setActiveView("admin-ai")}><Sparkles size={18} /> AI Review</button>
              <button className={activeView === "jobs" ? "active-nav" : ""} onClick={() => setActiveView("jobs")}><Search size={18} /> Talent Market</button>
            </>
          ) : canManageJobs(user) ? (
            <>
              <button className={activeView === "employer-dashboard" ? "active-nav" : ""} onClick={() => setActiveView("employer-dashboard")}><LayoutDashboard size={18} /> Dashboard</button>
              <button className={activeView === "employer-jobs" ? "active-nav" : ""} onClick={() => setActiveView("employer-jobs")}><PlusCircle size={18} /> Job Posts</button>
              <button className={activeView === "employer-applicants" ? "active-nav" : ""} onClick={() => setActiveView("employer-applicants")}><FileText size={18} /> Applicants</button>
              <button className={activeView === "employer-analytics" ? "active-nav" : ""} onClick={() => setActiveView("employer-analytics")}><BarChart3 size={18} /> Hiring Analytics</button>
              <button className={activeView === "jobs" ? "active-nav" : ""} onClick={() => setActiveView("jobs")}><Search size={18} /> Talent Market</button>
            </>
          ) : (
            <>
              <button className={activeView === "dashboard" ? "active-nav" : ""} onClick={() => setActiveView("dashboard")}><LayoutDashboard size={18} /> Dashboard</button>
              <button className={activeView === "analytics" ? "active-nav" : ""} onClick={() => setActiveView("analytics")}><BarChart3 size={18} /> Analytics</button>
              <button className={activeView === "jobs" ? "active-nav" : ""} onClick={() => setActiveView("jobs")}><Search size={18} /> Jobs</button>
              <button className={activeView === "tracker" ? "active-nav" : ""} onClick={() => setActiveView("tracker")}><FileText size={18} /> Tracker</button>
              <button className={activeView === "alerts" ? "active-nav" : ""} onClick={() => setActiveView("alerts")}><Bell size={18} /> Alerts</button>
              <button className={activeView === "ai-career" ? "active-nav" : ""} onClick={() => setActiveView("ai-career")}><Sparkles size={18} /> AI Career</button>
            </>
          )}
          <button className={activeView === "profile" ? "active-nav" : ""} onClick={() => setActiveView("profile")}><UserRound size={18} /> Profile</button>
        </nav>
        <button className="ghost-button" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{isAdmin(user) ? "Admin control workspace" : canManageJobs(user) ? "Employer hiring workspace" : "Personalized career workspace"}</p>
            <h1>{viewTitle(activeView, user)}</h1>
          </div>
          <div className="topbar-actions">
            {message && <span className="status-pill">{message}</span>}
          </div>
        </header>

        {activeView === "home" && (
          <section className="logged-home">
            <header className="public-hero public-hero-avenir">
              <div className="avenir-home-hero">
                <div className="signedin-landing-hero">
                  <div className="hero-title-stage">
                    <span className="hero-kicker">Welcome, {user?.full_name || "there"}.</span>
                    <h1>Avenir</h1>
                    <p>
                      {isAdmin(user)
                        ? "A clear workspace to review users, posts, and platform health."
                        : canManageJobs(user)
                        ? "A focused workspace to post roles, review applicants, and keep hiring moving."
                        : "A polished workspace to explore opportunities, track progress, and move your career forward."}
                    </p>
                    <div className="hero-actions">
                      <button
                        type="button"
                        onClick={() => setActiveView(isAdmin(user) ? "admin-dashboard" : canManageJobs(user) ? "employer-dashboard" : "dashboard")}
                      >
                        <LayoutDashboard size={16} /> Dashboard
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setActiveView(isAdmin(user) ? "admin-users" : canManageJobs(user) ? "employer-jobs" : "jobs")}
                      >
                        {isAdmin(user) ? <UserRound size={16} /> : canManageJobs(user) ? <PlusCircle size={16} /> : <Search size={16} />}
                        {isAdmin(user) ? "Manage users" : canManageJobs(user) ? "Post jobs" : "Explore jobs"}
                      </button>
                    </div>
                    <div className="hero-brand-notes">
                      <span>{isAdmin(user) ? "Platform oversight" : canManageJobs(user) ? "Hiring workflows" : "Personal career flow"}</span>
                      <span>{jobs.length ? `${jobs.length} live roles in view` : "Fresh roles loading"}</span>
                      <span>{analytics?.top_skills?.length ? `${analytics.top_skills.length} skills tracked` : "Analytics ready"}</span>
                    </div>
                  </div>
                  <div className="avenir-hero-portrait" aria-label="Avenir profile illustration">
                    <div className="portrait-orb portrait-orb-a" aria-hidden="true" />
                    <div className="portrait-orb portrait-orb-b" aria-hidden="true" />
                    <div className="portrait-desk" aria-hidden="true">
                      <div className="portrait-laptop portrait-laptop-left">
                        <span />
                        <div className="laptop-screen laptop-screen-left">
                          <div className="screen-line" />
                          <div className="screen-line short" />
                        </div>
                      </div>
                      <div className="portrait-laptop portrait-laptop-center">
                        <span />
                        <div className="laptop-screen laptop-screen-center">
                          <div className="screen-line" />
                          <div className="screen-line short" />
                          <div className="screen-line tiny" />
                        </div>
                      </div>
                      <div className="portrait-laptop portrait-laptop-right">
                        <span />
                        <div className="laptop-screen laptop-screen-right">
                          <div className="screen-line" />
                          <div className="screen-line short" />
                        </div>
                      </div>
                    </div>
                    <div className="portrait-card portrait-card-main">
                      <span>Professional workspace</span>
                      <strong>Focus, collaboration, and growth</strong>
                      <small>{user?.preferred_role || "Engineer"} • Avenir career flow</small>
                    </div>
                    <div className="portrait-card portrait-card-mini portrait-card-top">
                      <span>Team work</span>
                      <small>People at laptops</small>
                    </div>
                    <div className="portrait-card portrait-card-mini portrait-card-bottom">
                      <span>Momentum</span>
                      <small>Jobs, interviews, progress</small>
                    </div>
                  </div>
                </div>
                <section className="dashboard-grid home-insight-grid">
                  <Panel title="Applications" icon={<FileText size={20} />}>
                    <div className="summary-metric-card">
                      <Metric label="Total applications" value={applications.length} />
                      <Metric label="Active alerts" value={alerts.length} />
                    </div>
                  </Panel>
                  <Panel title="Interviews" icon={<BriefcaseBusiness size={20} />}>
                    <div className="summary-metric-card">
                      <Metric label="Interview stage" value={applications.filter((item) => item.status === "interview").length} />
                      <Metric label="Offer stage" value={applications.filter((item) => item.status === "offer").length} />
                    </div>
                  </Panel>
                  <Panel title="Applications per Job (All Users)" icon={<ChartColumn size={20} />}>
                    <div className="chart-box home-chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={applicationPerJobData.slice(0, 6)} layout="vertical">
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={140} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#1f5590" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                  <Panel title="Skill Trends" icon={<ChartColumn size={20} />}>
                    <div className="chart-box home-chart-box">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topSkillData.slice(0, 8)}>
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0f6b5b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </section>
                <section className="hero-opportunity-shell">
                  <div className="scroll-story-heading">
                    <span>{isAdmin(user) ? "Platform flow" : canManageJobs(user) ? "Hiring flow" : "Opportunity flow"}</span>
                    <h2>{isAdmin(user) ? "Keep the platform moving." : canManageJobs(user) ? "Hiring momentum starts here." : "Job matches move with momentum."}</h2>
                  </div>
                  <div className="hero-role-rail">
                    {(jobs.length ? jobs.slice(0, 3) : [
                      { id: "sample-1", title: "Data Analyst Intern", company: "Avenir Picks", location: "Remote", skills: "SQL, Excel, Power BI", job_type: "Internship" },
                      { id: "sample-2", title: "VLSI Engineer", company: "Avenir Picks", location: "Bengaluru", skills: "VLSI, FPGA, Verilog", job_type: "Full Time" },
                      { id: "sample-3", title: "Civil Site Engineer", company: "Avenir Picks", location: "India", skills: "AutoCAD, Site Execution", job_type: "Full Time" },
                    ]).map((job, index) => (
                      <article className="hero-role-card" key={job.id} style={{ "--stack-index": index }}>
                        <div>
                          <span>{job.job_type || "Open role"}</span>
                          <h3>{job.title}</h3>
                          <p>{job.company} · {job.location}</p>
                        </div>
                        <small>{job.skills || "Skills matched from your profile"}</small>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </header>

            <section className="dashboard-grid">
              <Panel title={isAdmin(user) ? "Admin Shortcuts" : canManageJobs(user) ? "Hiring Shortcuts" : "Career Shortcuts"} icon={<Sparkles size={20} />}>
                <div className="quick-action-grid">
                  <button type="button" onClick={() => setActiveView(isAdmin(user) ? "admin-dashboard" : canManageJobs(user) ? "employer-dashboard" : "dashboard")}><LayoutDashboard size={16} /> Open dashboard</button>
                  <button type="button" onClick={() => setActiveView(isAdmin(user) ? "admin-users" : canManageJobs(user) ? "employer-jobs" : "jobs")}>{isAdmin(user) ? <UserRound size={16} /> : canManageJobs(user) ? <PlusCircle size={16} /> : <Search size={16} />}{isAdmin(user) ? "Manage users" : canManageJobs(user) ? "Manage job posts" : "Search jobs"}</button>
                  <button type="button" onClick={() => setActiveView(canManageJobs(user) ? "employer-applicants" : "tracker")}><FileText size={16} /> {canManageJobs(user) ? "Review applicants" : "View tracker"}</button>
                </div>
              </Panel>
              <Panel title={isAdmin(user) ? "Platform Snapshot" : canManageJobs(user) ? "Hiring Snapshot" : "Profile Snapshot"} icon={<UserRound size={20} />}>
                <div className="snapshot-grid">
                  <Snapshot label="Account" value={user?.role || "candidate"} />
                  <Snapshot label={isAdmin(user) ? "Users" : canManageJobs(user) ? "Hiring focus" : "Preferred role"} value={isAdmin(user) ? adminUsers.length : user?.preferred_role || "Not set"} />
                  <Snapshot label="Location" value={user?.preferred_location || user?.current_location || "Not set"} />
                  <Snapshot label={canManageJobs(user) ? "Applicants" : "Applications"} value={canManageJobs(user) ? employerApplications.length : applications.length} />
                </div>
              </Panel>
            </section>
          </section>
        )}

        {activeView === "admin-dashboard" && isAdmin(user) && (
          <>
            <section className="metric-grid">
              <Metric label="Users" value={adminUsers.length} />
              <Metric label="Jobs" value={recruiterAnalytics?.total_jobs || myJobs.length} />
              <Metric label="Applicants" value={recruiterAnalytics?.total_applications || employerApplications.length} />
              <Metric label="Active jobs" value={recruiterAnalytics?.active_jobs || myJobs.filter((job) => job.is_active).length} />
            </section>
            <section className="dashboard-grid">
              <Panel title="Platform Controls" icon={<ShieldCheck size={20} />}>
                <div className="quick-action-grid">
                  <button type="button" onClick={() => setActiveView("admin-users")}><UserRound size={16} /> Manage users</button>
                  <button type="button" onClick={() => setActiveView("employer-jobs")}><PlusCircle size={16} /> Manage jobs</button>
                  <button type="button" onClick={() => setActiveView("employer-applicants")}><FileText size={16} /> Review applicants</button>
                  <button type="button" onClick={() => setActiveView("employer-analytics")}><BarChart3 size={16} /> Open analytics</button>
                  <button type="button" onClick={() => setActiveView("admin-ai")}><Sparkles size={16} /> AI moderation</button>
                </div>
              </Panel>
              <Panel title="Role Summary" icon={<UserRound size={20} />}>
                <div className="snapshot-grid">
                  <Snapshot label="Candidates" value={adminUsers.filter((item) => item.role === "candidate").length} />
                  <Snapshot label="Employers" value={adminUsers.filter((item) => item.role === "employer").length} />
                  <Snapshot label="Admins" value={adminUsers.filter((item) => item.role === "admin").length} />
                  <Snapshot label="Latest user" value={adminUsers[0]?.full_name || "No users"} />
                </div>
              </Panel>
            </section>
            <Panel title="Recent Users" icon={<UserRound size={20} />}>
              <div className="list-stack">
                {!adminUsers.length && (
                  <div className="empty-state">
                    <strong>No users found</strong>
                    <span>Registered users will appear here.</span>
                  </div>
                )}
                {adminUsers.slice(0, 6).map((item) => (
                  <AdminUserRow key={item.id} userItem={item} currentUser={user} onRoleChange={updateUserRole} />
                ))}
              </div>
            </Panel>
          </>
        )}

        {activeView === "admin-users" && isAdmin(user) && (
          <section className="admin-users-workspace">
            <section className="metric-grid">
              <Metric label="Total users" value={adminUsers.length} />
              <Metric label="Candidates" value={adminUsers.filter((item) => item.role === "candidate").length} />
              <Metric label="Employers" value={adminUsers.filter((item) => item.role === "employer").length} />
              <Metric label="Admins" value={adminUsers.filter((item) => item.role === "admin").length} />
            </section>
            <Panel title="User Accounts" icon={<ShieldCheck size={20} />}>
              <div className="list-stack">
                {!adminUsers.length && (
                  <div className="empty-state">
                    <strong>No users found</strong>
                    <span>Users will appear here after registration.</span>
                  </div>
                )}
                {adminUsers.map((item) => (
                  <AdminUserRow key={item.id} userItem={item} currentUser={user} onRoleChange={updateUserRole} />
                ))}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "employer-dashboard" && canManageJobs(user) && (
          <>
            <section className="metric-grid">
              <Metric label="Posted jobs" value={recruiterAnalytics?.total_jobs || myJobs.length} />
              <Metric label="Active roles" value={recruiterAnalytics?.active_jobs || myJobs.filter((job) => job.is_active).length} />
              <Metric label="Applicants" value={recruiterAnalytics?.total_applications || employerApplications.length} />
              <Metric label="Recent apps" value={recruiterAnalytics?.recent_applications || 0} />
            </section>
            <section className="dashboard-grid">
              <Panel title="Hiring Snapshot" icon={<BriefcaseBusiness size={20} />}>
                <div className="snapshot-grid">
                  <Snapshot label="Company contact" value={user?.full_name || "Not set"} />
                  <Snapshot label="Hiring focus" value={user?.preferred_role || "Add role in Profile"} />
                  <Snapshot label="Domain" value={user?.preferred_branch ? branchLabel(user.preferred_branch) : "Not set"} />
                  <Snapshot label="Location focus" value={user?.preferred_location || "Not set"} />
                </div>
              </Panel>
              <Panel title="Top Job Posts" icon={<ChartColumn size={20} />}>
                <div className="list-stack">
                  {!(recruiterAnalytics?.top_jobs || []).length && (
                    <div className="empty-state">
                      <strong>No applicant data yet</strong>
                      <span>Post a role and applicants will appear here as candidates apply.</span>
                    </div>
                  )}
                  {(recruiterAnalytics?.top_jobs || []).map((job) => (
                    <JobRow key={job.job_id} job={{ id: job.job_id, title: job.title, company: job.company, location: "", job_type: "", skills: "" }} meta={`${job.applications} applications`} />
                  ))}
                </div>
              </Panel>
            </section>
            <section className="dashboard-grid">
              <Panel title="Recent Applicants" icon={<FileText size={20} />}>
                <div className="list-stack">
                  {!employerApplications.length && (
                    <div className="empty-state">
                      <strong>No applicants yet</strong>
                      <span>New applications for your jobs will show up here.</span>
                    </div>
                  )}
                  {employerApplications.slice(0, 5).map((application) => (
                    <EmployerApplicationRow
                      key={application.id}
                      application={application}
                      onStatusChange={updateApplicationStatus}
                      onRecruiterAI={runRecruiterAI}
                      onDelete={isAdmin(user) ? deleteApplication : null}
                    />
                  ))}
                </div>
              </Panel>
              <Panel title="Quick Actions" icon={<PlusCircle size={20} />}>
                <div className="quick-action-grid">
                  <button type="button" onClick={() => setActiveView("employer-jobs")}><PlusCircle size={16} /> Post a job</button>
                  <button type="button" onClick={() => setActiveView("employer-applicants")}><FileText size={16} /> Review applicants</button>
                  <button type="button" onClick={() => setActiveView("employer-analytics")}><BarChart3 size={16} /> View hiring analytics</button>
                </div>
              </Panel>
            </section>
          </>
        )}

        {activeView === "dashboard" && isCandidate(user) && (
          <>
            <section className="metric-grid">
              <Metric label="Total applications" value={dashboard?.applications_count || 0} />
              <Metric label="Saved jobs" value={dashboard?.saved_jobs_count || 0} />
              <Metric label="Alerts" value={dashboard?.alerts_count || 0} />
              <Metric label="Active jobs" value={dashboard?.active_jobs_count || 0} />
            </section>
            {canManageJobs(user) && recruiterAnalytics && (
              <section className="dashboard-grid">
                <Panel title="Recruiter Overview" icon={<BriefcaseBusiness size={20} />}>
                  <div className="snapshot-grid">
                    <Snapshot label="Total jobs" value={recruiterAnalytics.total_jobs} />
                    <Snapshot label="Active jobs" value={recruiterAnalytics.active_jobs} />
                    <Snapshot label="Closed jobs" value={recruiterAnalytics.closed_jobs} />
                    <Snapshot label="Applications" value={recruiterAnalytics.total_applications} />
                    <Snapshot label="Recent apps" value={recruiterAnalytics.recent_applications} />
                  </div>
                </Panel>
                <Panel title="Top Recruiter Jobs" icon={<ChartColumn size={20} />}>
                  <div className="list-stack">
                    {(recruiterAnalytics.top_jobs || []).map((job) => (
                      <JobRow key={job.job_id} job={{ id: job.job_id, title: job.title, company: job.company, location: "", job_type: "", skills: "" }} meta={`${job.applications} applications`} />
                    ))}
                  </div>
                </Panel>
              </section>
            )}

            {isCandidate(user) && (
              <Panel title="Recommended Jobs" icon={<Sparkles size={20} />}>
                <div className="list-stack">
                  {!availableRecommendations.length && (
                    <div className="empty-state">
                      <strong>No strong recommendations yet</strong>
                      <span>We will show roles once they match your branch, skills, or preferred role closely enough.</span>
                    </div>
                  )}
                  {availableRecommendations.slice(0, 3).map((item) => (
                    <div key={item.job.id} className="recommendation-card">
                      <JobRow
                        job={item.job}
                        meta={formatMatchScore(item.score)}
                        onSave={saveJob}
                        onApply={setApplyTarget}
                        canApply={isCandidate(user)}
                      />
                      {item.explanation && <p className="resume-preview">{item.explanation}</p>}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <section className="dashboard-grid">
              <Panel title="Career Snapshot" icon={<UserRound size={20} />}>
                <div className="snapshot-grid">
                  <Snapshot label={isCandidate(user) ? "Profile role" : "Hiring focus"} value={user?.preferred_role || "Not set"} />
                  <Snapshot label="Branch / domain" value={user?.preferred_branch ? branchLabel(user.preferred_branch) : "Not set"} />
                  <Snapshot label="Account type" value={user?.role || "candidate"} />
                  <Snapshot label="Experience" value={user?.experience_years || "Not set"} />
                  <Snapshot label="Current location" value={user?.current_location || "Not set"} />
                  <Snapshot label="Skills" value={user?.skills || "Add skills in Profile"} />
                  <Snapshot label="Resume" value={user?.resume_url ? "Uploaded" : "Not uploaded"} />
                </div>
              </Panel>
              <Panel title="Skill Gap Analysis" icon={<ChartColumn size={20} />}>
                <div className="skill-gap-card">
                  <div className="skill-gap-section">
                    <h4>Your Skills</h4>
                    <p>{(analytics?.user_skills || []).join(", ") || "No skills added"}</p>
                  </div>
                  <div className="skill-gap-section">
                    <h4>Recommended Skills to Learn</h4>
                    <p>{(analytics?.missing_skills || []).join(", ") || "You are up to date"}</p>
                  </div>
                </div>
              </Panel>
            </section>
          </>
        )}

        {activeView === "analytics" && (
          <section className="analytics-workspace">
            <div className="detail-grid">
              <Panel title="Engagement Metrics" icon={<ChartColumn size={20} />}>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#de7a22" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Application Status Overview" icon={<ChartColumn size={20}/>}>
                <div className="status-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={applicationStatusData}
                        dataKey="count"
                        nameKey="name"
                        outerRadius={100}
                        innerRadius={58}
                        paddingAngle={3}
                        label={({ name, percent }) => `${statusLabels[name] || name} ${Math.round(percent * 100)}%`}
                      >
                        {(analytics?.application_statuses || []).map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={statusPalette[entry.name] || statusPalette.unknown}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, statusLabels[name] || name]}
                        contentStyle={{
                          border: "1px solid #dbe5e1",
                          borderRadius: 8,
                          boxShadow: "0 12px 28px rgba(23, 32, 38, 0.12)",
                        }}
                      />
                      <Legend formatter={(value) => statusLabels[value] || value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Job Demand Trends" icon={<ChartColumn size={20} />}>
                <div className="summary-grid">
                  <Snapshot label="Top role" value={topRoleData?.[0]?.name || "N/A"} />
                  <Snapshot label="Top location" value={topLocationData?.[0]?.name || "N/A"} />
                  <Snapshot label="Salary range" value={analytics?.salary_ranges?.minimum && analytics?.salary_ranges?.maximum ? `${analytics.salary_ranges.minimum} - ${analytics.salary_ranges.maximum}` : "Not available"} />
                  <Snapshot label="Market skills" value={(analytics?.top_skills || []).slice(0, 3).map((skill) => skill.name).join(", ") || "No trend data"} />
                </div>
              </Panel>
              <Panel title="Predicted Job Trends" icon={<Sparkles size={20} />}>
                <div className="summary-grid">
                  <Snapshot label="Market direction" value={analytics?.job_trend_prediction?.trend_direction || "Learning"} />
                  <Snapshot label="Next 7 days" value={`${(analytics?.job_trend_prediction?.forecast || []).reduce((sum, item) => sum + item.predicted_count, 0)} predicted roles`} />
                  <Snapshot label="Growth roles" value={(analytics?.job_trend_prediction?.top_growth_roles || []).slice(0, 3).map((item) => item.name).join(", ") || "Not enough data"} />
                  <Snapshot label="Growth skills" value={(analytics?.job_trend_prediction?.top_growth_skills || []).slice(0, 3).map((item) => item.name).join(", ") || "Not enough data"} />
                </div>
              </Panel>
              <Panel title="User Engagement Prediction" icon={<UserRound size={20} />}>
                <div className="skill-gap-card">
                  <div className="skill-gap-section">
                    <h4>{analytics?.engagement_prediction?.segment || "Learning user intent"}</h4>
                    <p>{analytics?.engagement_prediction?.next_action || "Use the app to generate engagement signals."}</p>
                  </div>
                  <div className="summary-grid">
                    <Snapshot label="Engagement score" value={`${Math.round(analytics?.engagement_prediction?.score || 0)}%`} />
                    <Snapshot label="Profile completion" value={`${analytics?.engagement_prediction?.profile_completion || 0}%`} />
                  </div>
                </div>
              </Panel>
              <Panel title="Power BI Dataset" icon={<ChartColumn size={20} />}>
                <div className="skill-gap-card">
                  <div className="skill-gap-section">
                    <h4>Power BI-ready export</h4>
                    <p>Download jobs, applications, saved jobs, and activity tables as a clean JSON dataset for Power BI Web or JSON import.</p>
                  </div>
                  <button type="button" onClick={downloadPowerBiDataset}>
                    <ChartColumn size={16} /> Download Power BI dataset
                  </button>
                </div>
              </Panel>
            </div>
          </section>
        )}

        {activeView === "jobs" && (
          <section className="jobs-workspace">
            {isCandidate(user) && (
              <Panel title="Recommended Jobs" icon={<Sparkles size={20} />}>
                <div className="list-stack">
                  {!availableRecommendations.length && (
                    <div className="empty-state">
                      <strong>No strong recommendations yet</strong>
                      <span>Try importing more roles for your branch or updating your skills in Profile.</span>
                    </div>
                  )}
                  {availableRecommendations.slice(0, 5).map((item) => (
                    <div key={item.job.id} className="recommendation-card">
                      <JobRow job={item.job} meta={`${item.score}% match`} onSave={saveJob} onApply={setApplyTarget} canApply={isCandidate(user)} />
                      {item.explanation && <p className="resume-preview">{item.explanation}</p>}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Search Jobs" icon={<Search size={20} />}>
              <form className="filter-grid" onSubmit={(event) => { event.preventDefault(); loadJobs(filters); }}>
                {Object.keys(emptyFilters).map((key) => (
                  key === "country" ? (
                    <select
                      key={key}
                      value={filters.country}
                      onChange={(event) => setFilters({ ...filters, country: event.target.value })}
                    >
                      <option value="">All countries</option>
                      {countryOptions.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  ) : key === "job_type" ? (
                    <select
                      key={key}
                      value={filters.job_type}
                      onChange={(event) => setFilters({ ...filters, job_type: event.target.value })}
                    >
                      <option value="">All job types</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Internship">Internship</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  ) : (
                    <input
                      key={key}
                      placeholder={key.replace("_", " ")}
                      value={filters[key]}
                      onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                    />
                  )
                ))}
                <button type="submit">Search</button>
              </form>
              <div className="job-grid">
                {availableJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={isCandidate(user) ? saveJob : null}
                    onApply={isCandidate(user) ? setApplyTarget : null}
                    canApply={isCandidate(user)}
                  />
                ))}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "tracker" && isCandidate(user) && (
          <section className="split">
            <Panel title="Application Tracker" icon={<FileText size={20} />}>
              <div className="list-stack">
                {applications.map((item) => (
                  <ApplicationRow
                    key={item.id}
                    application={item}
                    onStatusChange={updateApplicationStatus}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Saved Jobs" icon={<Star size={20} />}>
              <div className="list-stack">
                {availableSavedJobs.map((item) => <JobRow key={item.id} job={item.job} meta="Saved" onApply={setApplyTarget} canApply={isCandidate(user)} />)}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "employer-jobs" && canManageJobs(user) && (
          <section className="post-jobs-workspace">
            <section className="metric-grid">
              <Metric label="Posted jobs" value={myJobs.length} />
              <Metric label="Applicants" value={recruiterAnalytics?.total_applications || employerApplications.length} />
              <Metric label="Active roles" value={myJobs.filter((job) => job.is_active).length} />
              <Metric label="Imported jobs" value={importResult?.created_count || 0} />
            </section>
            <Panel title="Create Job Post" icon={<PlusCircle size={20} />}>
              <form className="job-post-form" onSubmit={createJob}>
                <label>Title<input name="title" placeholder="Python Backend Developer" required /></label>
                <label>Company<input name="company" placeholder="Company name" required /></label>
                <label>Location<input name="location" placeholder="Bengaluru, Remote" required /></label>
                <label>Job type<input name="job_type" placeholder="Full-time, Internship" /></label>
                <label>Minimum salary<input name="salary_min" type="number" placeholder="500000" /></label>
                <label>Maximum salary<input name="salary_max" type="number" placeholder="900000" /></label>
                <label className="wide-field">Skills<input name="skills" placeholder="Python, FastAPI, SQL" /></label>
                <label className="wide-field">Original posting URL<input name="source_url" placeholder="https://company.com/careers/job" /></label>
                <label className="wide-field">Description<textarea name="description" placeholder="Role responsibilities, requirements, and benefits" required /></label>
                <button type="submit">Publish Job</button>
              </form>
            </Panel>
            <Panel title={user?.role === "admin" ? "Job Posts & Moderation" : "Your Job Posts"} icon={<BriefcaseBusiness size={20} />}>
              <div className="list-stack">
                {!myJobs.length && (
                  <div className="empty-state">
                    <strong>No job posts yet</strong>
                    <span>Publish your first role from the form and it will appear here.</span>
                  </div>
                )}
                {myJobs.map((job) => (
                  <PostedJobRow
                    key={job.id}
                    job={job}
                    onDelete={deleteMyJob}
                    onEdit={setEditJobTarget}
                    showModerationReason={isAdmin(user)}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Import Real Jobs" icon={<Sparkles size={20} />}>
              <form className="stack-form import-pack-form" onSubmit={importRolePack}>
                <input name="branches" defaultValue="data_ai, cse_it, ece, eee, mechanical, civil, business" />
                <input name="roles" defaultValue="" placeholder="Extra roles, optional" />
                <input name="countries" defaultValue="India, Remote" />
                <input name="limit_per_search" type="number" min="1" max="100" defaultValue="50" />
                <button type="submit">Import Role Pack</button>
              </form>
              <form className="stack-form" onSubmit={importRealJobs}>
                <select name="provider" defaultValue="remotive">
                  <option value="remotive">Remotive remote jobs</option>
                  <option value="arbeitnow">Arbeitnow jobs</option>
                  <option value="himalayas">Himalayas remote jobs</option>
                  <option value="adzuna">Adzuna country jobs</option>
                </select>
                <input name="query" list="role-options" placeholder="Search keyword, e.g. Data Analyst" />
                <select name="country" defaultValue="">
                  <option value="">Any country</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <input name="category" placeholder="Remotive category, optional" />
                <input name="limit" type="number" min="1" max="100" defaultValue="25" />
                <button type="submit">Import Jobs</button>
              </form>
              {importResult && (
                <div className="import-result">
                  <strong>{importResult.created_count} imported</strong>
                  <span>{importResult.skipped_count} duplicates skipped</span>
                </div>
              )}
            </Panel>
          </section>
        )}

        {activeView === "employer-applicants" && canManageJobs(user) && (
          <section className="employer-applicants-workspace">
            <section className="metric-grid">
              <Metric label="Total applicants" value={employerApplications.length} />
              <Metric label="Screening" value={employerApplications.filter((item) => item.status === "screening").length} />
              <Metric label="Interview" value={employerApplications.filter((item) => item.status === "interview").length} />
              <Metric label="Offers" value={employerApplications.filter((item) => item.status === "offer").length} />
            </section>
            <Panel title="Applicant Pipeline" icon={<FileText size={20} />}>
              <div className="list-stack">
                {!employerApplications.length && (
                  <div className="empty-state">
                    <strong>No applicants yet</strong>
                    <span>Applications for jobs posted by this employer account will appear here.</span>
                  </div>
                )}
                {employerApplications.map((application) => (
                  <EmployerApplicationRow
                    key={application.id}
                    application={application}
                    onStatusChange={updateApplicationStatus}
                    onRecruiterAI={runRecruiterAI}
                    onDelete={isAdmin(user) ? deleteApplication : null}
                  />
                ))}
              </div>
            </Panel>
            {aiResult?.action === "recruiter-ai" && (
              <Panel title="Recruiter AI Fit" icon={<Sparkles size={20} />}>
                <AIResult result={aiResult} />
              </Panel>
            )}
          </section>
        )}

        {activeView === "admin-ai" && isAdmin(user) && (
          <section className="admin-ai-workspace">
            <section className="metric-grid">
              <Metric label="AI recommendations" value={availableRecommendations.length} />
              <Metric label="Recruiter summaries" value={employerApplications.length} />
              <Metric label="Flagged items" value="Manual" />
              <Metric label="Review status" value="Active" />
            </section>
            <section className="dashboard-grid">
              <Panel title="AI Recommendations" icon={<Sparkles size={20} />}>
                <div className="list-stack">
                  {!availableRecommendations.length && (
                    <div className="empty-state">
                      <strong>No AI recommendations loaded</strong>
                      <span>Recommendations will appear here when the admin profile has matching job signals.</span>
                    </div>
                  )}
                  {availableRecommendations.slice(0, 8).map((item) => (
                    <div key={item.job.id} className="recommendation-card">
                      <JobRow job={item.job} meta={formatMatchScore(item.score)} />
                      {item.explanation && <p className="resume-preview">{item.explanation}</p>}
                      <div className="button-row">
                        <button type="button" className="danger-button" onClick={() => flagRecommendation(item.job)}>
                          <Trash2 size={16} /> Flag bad recommendation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Recruiter AI Summaries" icon={<FileText size={20} />}>
                <div className="list-stack">
                  {!employerApplications.length && (
                    <div className="empty-state">
                      <strong>No applications to summarize</strong>
                      <span>Recruiter AI summaries can be reviewed after candidates apply to jobs.</span>
                    </div>
                  )}
                  {employerApplications.slice(0, 8).map((application) => (
                    <EmployerApplicationRow
                      key={application.id}
                      application={application}
                      onStatusChange={updateApplicationStatus}
                      onRecruiterAI={runRecruiterAI}
                      onDelete={deleteApplication}
                    />
                  ))}
                </div>
              </Panel>
            </section>
            <Panel title="Moderation Roadmap" icon={<ShieldCheck size={20} />}>
              <div className="skill-gap-card">
                <div className="skill-gap-section">
                  <h4>Current controls</h4>
                  <p>Admins can view AI recommendations, flag bad recommendations, and review recruiter AI summaries from applications.</p>
                </div>
                <div className="skill-gap-section">
                  <h4>Future controls</h4>
                  <p>Persisted flag queues, model feedback history, and approval workflows can be added when you want a full moderation audit trail.</p>
                </div>
              </div>
            </Panel>
            {aiResult?.action === "recruiter-ai" && (
              <Panel title="AI Summary Review" icon={<Sparkles size={20} />}>
                <AIResult result={aiResult} />
              </Panel>
            )}
          </section>
        )}

        {activeView === "employer-analytics" && canManageJobs(user) && (
          <section className="analytics-workspace">
            <section className="metric-grid">
              {isAdmin(user) && <Metric label="Total users" value={analytics?.total_users || adminUsers.length} />}
              <Metric label="Total jobs" value={isAdmin(user) ? analytics?.active_jobs || recruiterAnalytics?.total_jobs || 0 : recruiterAnalytics?.total_jobs || 0} />
              <Metric label="Active jobs" value={recruiterAnalytics?.active_jobs || 0} />
              <Metric label="Applications" value={recruiterAnalytics?.total_applications || 0} />
              {!isAdmin(user) && <Metric label="Closed jobs" value={recruiterAnalytics?.closed_jobs || 0} />}
            </section>
            <div className="detail-grid">
              {isAdmin(user) && (
                <Panel title="Platform Totals" icon={<ShieldCheck size={20} />}>
                  <div className="summary-grid">
                    <Snapshot label="Total users" value={analytics?.total_users || adminUsers.length} />
                    <Snapshot label="Total jobs" value={analytics?.active_jobs || 0} />
                    <Snapshot label="Total applications" value={analytics?.total_applications || 0} />
                    <Snapshot label="Saved jobs" value={analytics?.total_saved_jobs || 0} />
                  </div>
                </Panel>
              )}
              {isAdmin(user) && (
                <Panel title="Growth Trends" icon={<ChartColumn size={20} />}>
                  <div className="summary-grid">
                    <Snapshot label="Market direction" value={analytics?.job_trend_prediction?.trend_direction || "Learning"} />
                    <Snapshot label="Next 7 days" value={`${(analytics?.job_trend_prediction?.forecast || []).reduce((sum, item) => sum + item.predicted_count, 0)} predicted roles`} />
                    <Snapshot label="Growth roles" value={(analytics?.job_trend_prediction?.top_growth_roles || []).slice(0, 3).map((item) => item.name).join(", ") || "Not enough data"} />
                    <Snapshot label="Growth skills" value={(analytics?.job_trend_prediction?.top_growth_skills || []).slice(0, 3).map((item) => item.name).join(", ") || "Not enough data"} />
                  </div>
                </Panel>
              )}
              {isAdmin(user) && (
                <Panel title="AI Insights" icon={<Sparkles size={20} />}>
                  <div className="skill-gap-card">
                    <div className="skill-gap-section">
                      <h4>{analytics?.engagement_prediction?.segment || "Learning platform behavior"}</h4>
                      <p>{analytics?.engagement_prediction?.next_action || "Use platform activity to generate stronger AI insights."}</p>
                    </div>
                    <button type="button" onClick={() => setActiveView("admin-ai")}>
                      <Sparkles size={16} /> Review AI moderation
                    </button>
                  </div>
                </Panel>
              )}
              <Panel title="Applicant Skills" icon={<ChartColumn size={20} />}>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recruiterAnalytics?.applicant_skills || []}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f6b5b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Pipeline Status" icon={<ChartColumn size={20} />}>
                <div className="status-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={recruiterAnalytics?.job_statuses || []}
                        dataKey="count"
                        nameKey="name"
                        outerRadius={100}
                        innerRadius={58}
                        paddingAngle={3}
                        label={({ name, percent }) => `${statusLabels[name] || name} ${Math.round(percent * 100)}%`}
                      >
                        {(recruiterAnalytics?.job_statuses || []).map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={statusPalette[entry.name] || statusPalette.unknown}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, statusLabels[name] || name]} />
                      <Legend formatter={(value) => statusLabels[value] || value} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Top Performing Jobs" icon={<BriefcaseBusiness size={20} />}>
                <div className="list-stack">
                  {!(recruiterAnalytics?.top_jobs || []).length && (
                    <div className="empty-state">
                      <strong>No applications yet</strong>
                      <span>Job performance will be ranked when candidates begin applying.</span>
                    </div>
                  )}
                  {(recruiterAnalytics?.top_jobs || []).map((job) => (
                    <JobRow key={job.job_id} job={{ id: job.job_id, title: job.title, company: job.company, location: "", job_type: "", skills: "" }} meta={`${job.applications} applications`} />
                  ))}
                </div>
              </Panel>
              <Panel title="Hiring Signals" icon={<Sparkles size={20} />}>
                <div className="skill-gap-card">
                  <div className="skill-gap-section">
                    <h4>Top applicant skills</h4>
                    <p>{(recruiterAnalytics?.applicant_skills || []).map((item) => item.name).join(", ") || "No applicant skill data yet"}</p>
                  </div>
                  <div className="skill-gap-section">
                    <h4>Application statuses</h4>
                    <p>{(recruiterAnalytics?.job_statuses || []).map((item) => `${statusLabels[item.name] || item.name}: ${item.count}`).join(" | ") || "No status data yet"}</p>
                  </div>
                </div>
              </Panel>
            </div>
          </section>
        )}

        {activeView === "alerts" && isCandidate(user) && (
          <section className="alerts-grid">
            <Panel title="Create Alert" icon={<Bell size={20} />}>
              <form className="stack-form" onSubmit={createAlert}>
                <input name="name" placeholder="Alert name" required />
                <input name="keyword" placeholder="Role keyword" />
                <input name="location" placeholder="Location" />
                <input name="skill" placeholder="Skill" />
                <input name="minimum_salary" placeholder="Minimum salary" type="number" />
                <button type="submit">Create Alert</button>
              </form>
            </Panel>
            <Panel title="Saved Alerts" icon={<Bell size={20} />}>
              <div className="list-stack">
                {alerts.map((alert) => (
                  <button className="alert-row" key={alert.id} onClick={() => showAlertMatches(alert.id)}>
                    {alert.name}<span>{alert.location || "Any location"}</span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Alert Matches" icon={<Search size={20} />}>
              <div className="list-stack">
                {alertMatches.map((job) => <JobRow key={job.id} job={job} meta={job.location} />)}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "ai-career" && isCandidate(user) && (
          <section className="ai-career-workspace">
            <Panel title="AI Career Studio" icon={<Sparkles size={20} />}>
              <div className="ai-studio">
                <select value={aiJobId} onChange={(event) => setAiJobId(event.target.value)}>
                  <option value="">Use strongest available job</option>
                  {aiJobs.slice(0, 30).map((job) => (
                    <option key={job.id} value={job.id}>{job.title} · {job.company}</option>
                  ))}
                </select>
                <textarea
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  placeholder="Ask the career coach"
                />
                <div className="ai-action-grid">
                  <button type="button" onClick={() => runCandidateAI("resume-review")}>Resume Review</button>
                  <button type="button" onClick={() => runCandidateAI("skill-gap")}>Skill Gap</button>
                  <button type="button" onClick={() => runCandidateAI("match-explanation")}>Match Why</button>
                  <button type="button" onClick={() => runCandidateAI("interview-questions")}>Questions</button>
                  <button type="button" onClick={() => runCandidateAI("career-coach")}>Coach</button>
                  <button type="button" onClick={() => runCandidateAI("learning-roadmap")}>Roadmap</button>
                  <button type="button" onClick={() => runCandidateAI("job-simplifier")}>Explain Job</button>
                  <button type="button" onClick={() => runCandidateAI("cover-letter")}>Cover Letter</button>
                  <button type="button" onClick={() => runCandidateAI("resume-tailoring")}>Tailor Resume</button>
                </div>
                {aiResult && <AIResult result={aiResult} />}
              </div>
            </Panel>
            <Panel title="Resume Matching" icon={<Sparkles size={20} />}>
              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder={uploadedResumeText ? "Resume uploaded. Click Match Resume to analyze it." : "Paste resume text to extract skills and match jobs"}
              />
              <button onClick={matchResume}>Match Resume</button>
              {uploadedResumeText && !resumeText.trim() && (
                <div className="resume-preview">Using the uploaded resume for matching.</div>
              )}
              {resumeResult && (
                <div className="resume-result">
                  <strong>Extracted skills: {resumeResult.extracted_skills.join(", ") || "No known skills found"}</strong>
                  {resumeResult.recommendations.slice(0, 3).map((item) => (
                    <JobRow key={item.job.id} job={item.job} meta={`${item.score}% match`} />
                  ))}
                </div>
              )}
            </Panel>
          </section>
        )}

        {activeView === "profile" && (
          <section className="profile-workspace">
            <Panel title={isCandidate(user) ? "Candidate Details" : "Employer Details"} icon={<UserRound size={20} />}>
              <form className="profile-form" onSubmit={updateProfile}>
                <label>{canManageJobs(user) ? "Company / recruiter name" : "Full name"}<input name="full_name" defaultValue={user?.full_name || ""} placeholder={canManageJobs(user) ? "Company or recruiter name" : "Full name"} /></label>
                <label>Phone<input name="phone" defaultValue={user?.phone || ""} placeholder="Phone number" /></label>
                <label className="wide-field">Headline<input name="headline" defaultValue={user?.headline || ""} placeholder={canManageJobs(user) ? "Hiring for engineering, analytics, and operations roles" : "Backend Developer | FastAPI | React"} /></label>
                <label className="wide-field">{canManageJobs(user) ? "Company summary" : "Professional summary"}<textarea name="summary" defaultValue={user?.summary || ""} placeholder={canManageJobs(user) ? "Briefly describe your company, hiring needs, and culture" : "Short profile summary, achievements, or career objective"} /></label>
                <label className="wide-field">{canManageJobs(user) ? "Hiring focus" : "Skills"}<input name="skills" defaultValue={user?.skills || ""} placeholder={canManageJobs(user) ? "Python, Data, Frontend, VLSI" : "Python, FastAPI, React, SQL"} /></label>
                {isCandidate(user) && <label>Experience<input name="experience_years" defaultValue={user?.experience_years || ""} placeholder="e.g. 2 years" /></label>}
                <label>{canManageJobs(user) ? "Company location" : "Current location"}<input name="current_location" defaultValue={user?.current_location || ""} placeholder="e.g. Bengaluru" /></label>
                {isCandidate(user) && <label>Branch / domain<select name="preferred_branch" defaultValue={user?.preferred_branch || ""}>
                  <option value="">Choose branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.value} value={branch.value}>{branch.label}</option>
                  ))}
                </select></label>}
                {isCandidate(user) && <label>Preferred role<input name="preferred_role" list="role-options" defaultValue={user?.preferred_role || ""} placeholder="Data Analyst" /></label>}
                {isCandidate(user) && <label>Preferred location<input name="preferred_location" defaultValue={user?.preferred_location || ""} placeholder="Remote, Bengaluru" /></label>}
                {isCandidate(user) && <label>Preferred job type<input name="preferred_job_type" defaultValue={user?.preferred_job_type || ""} placeholder="Full-time, Internship" /></label>}
                {isCandidate(user) && <label>Expected salary<input name="expected_salary" defaultValue={user?.expected_salary || ""} placeholder="e.g. 8 LPA" /></label>}
                {isCandidate(user) && <label>Notice period<input name="notice_period" defaultValue={user?.notice_period || ""} placeholder="e.g. Immediate, 30 days" /></label>}
                <label>LinkedIn<input name="linkedin_url" defaultValue={user?.linkedin_url || ""} placeholder="https://linkedin.com/in/..." /></label>
                {isCandidate(user) && <label>GitHub<input name="github_url" defaultValue={user?.github_url || ""} placeholder="https://github.com/..." /></label>}
                <label className="wide-field">{canManageJobs(user) ? "Company website" : "Portfolio"}<input name="portfolio_url" defaultValue={user?.portfolio_url || ""} placeholder={canManageJobs(user) ? "https://company.com" : "https://your-portfolio.com"} /></label>
                {isCandidate(user) && <label className="wide-field">Education<textarea name="education" defaultValue={user?.education || ""} placeholder="Degree, institution, graduation year, certifications" /></label>}
                <div className="profile-save-bar">
                  <button type="submit">Save Profile</button>
                  {message === "Profile saved successfully" && <span>Saved</span>}
                </div>
              </form>
            </Panel>
            {isCandidate(user) && (
            <section className="profile-side">
              <Panel title="Resume" icon={<Upload size={20} />}>
              <label className="upload-box">
                <Upload size={22} />
                <span>Upload resume file</span>
                <small>PDF, DOCX, or TXT</small>
                <input type="file" accept=".pdf,.docx,.txt" onChange={uploadResume} />
              </label>
              {resumeUploadResult && (
                <div className="resume-result">
                  <strong>Resume uploaded</strong>
                  {resumeUploadResult.inferred_profile?.preferred_role && (
                    <div>Inferred role: {resumeUploadResult.inferred_profile.preferred_role}</div>
                  )}
                </div>
              )}
              {user?.resume_url && (
                <a className="resume-link" href={assetUrl(user.resume_url)} target="_blank" rel="noreferrer">
                  <Link size={16} /> View uploaded resume
                </a>
              )}
              </Panel>
            </section>
            )}
          </section>
        )}
      </section>
      {applyTarget && (
        <div className="modal-backdrop" role="presentation" onClick={() => setApplyTarget(null)}>
          <section className="apply-dialog" role="dialog" aria-modal="true" aria-labelledby="apply-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="apply-title"><FileText size={20} /> Apply to {applyTarget.title}</h2>
            <p>{applyTarget.company} · {applyTarget.location}</p>
            <form className="stack-form" onSubmit={applyToJob}>
              <textarea name="cover_letter" placeholder="Cover letter, optional" />
              <select name="status" defaultValue="applied">
                {applicationStatuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              {user?.resume_url ? (
                <span className="helper-text">
                  {isPortalJob(applyTarget)
                    ? "Your profile, resume, and cover note will be sent to this employer inside the portal."
                    : "Open the original posting, apply on the company site, then return here and mark it as applied."}
                </span>
              ) : (
                <span className="helper-text">
                  {isPortalJob(applyTarget)
                    ? "Your profile and cover note will be sent to this employer. Upload a resume from Profile to include it."
                    : "Open the original posting, apply on the company site, then return here and mark it as applied."}
                </span>
              )}
              <div className="dialog-actions">
                {!isPortalJob(applyTarget) && !isSampleJob(applyTarget) && (
                  <a className="external-job-link" href={applyTarget.source_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} /> Open posting
                  </a>
                )}
                <button type="button" className="secondary-button" onClick={() => setApplyTarget(null)}>Cancel</button>
                <button type="submit">{isPortalJob(applyTarget) ? "Apply" : "Mark as applied"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {editJobTarget && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditJobTarget(null)}>
          <section className="apply-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-job-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="edit-job-title"><BriefcaseBusiness size={20} /> Edit job</h2>
            <form className="job-post-form" onSubmit={updateJob}>
              <label>Title<input name="title" defaultValue={editJobTarget.title || ""} required /></label>
              <label>Company<input name="company" defaultValue={editJobTarget.company || ""} required /></label>
              <label>Location<input name="location" defaultValue={editJobTarget.location || ""} required /></label>
              <label>Job type<input name="job_type" defaultValue={editJobTarget.job_type || ""} /></label>
              <label>Minimum salary<input name="salary_min" type="number" defaultValue={editJobTarget.salary_min || ""} /></label>
              <label>Maximum salary<input name="salary_max" type="number" defaultValue={editJobTarget.salary_max || ""} /></label>
              <label className="wide-field">Skills<input name="skills" defaultValue={editJobTarget.skills || ""} /></label>
              <label className="wide-field">Original posting URL<input name="source_url" defaultValue={editJobTarget.source_url || ""} /></label>
              <label className="wide-field">Description<textarea name="description" defaultValue={editJobTarget.description || ""} required /></label>
              <div className="dialog-actions wide-field">
                <button type="button" className="secondary-button" onClick={() => setEditJobTarget(null)}>Cancel</button>
                <button type="submit">Save changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {appliedJob && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAppliedJob(null)}>
          <section className="success-dialog" role="dialog" aria-modal="true" aria-labelledby="applied-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="applied-title"><FileText size={20} /> Applied</h2>
            <p>
              {isPortalJob(appliedJob)
                ? `Your application for ${appliedJob.title} has been submitted.`
                : `${appliedJob.title} was moved to your application tracker.`}
            </p>
            <button onClick={() => setAppliedJob(null)}>Done</button>
          </section>
        </div>
      )}
      {profileSaved && (
        <div className="modal-backdrop" role="presentation" onClick={() => setProfileSaved(false)}>
          <section className="success-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-saved-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="profile-saved-title"><UserRound size={20} /> Profile saved</h2>
            <p>Your profile details were saved and the dashboard has been refreshed.</p>
            <button onClick={() => setProfileSaved(false)}>Done</button>
          </section>
        </div>
      )}
    </main>
  );
}

function viewTitle(activeView, user) {
  const titles = {
    home: `Welcome, ${user?.full_name || "there"}`,
    "admin-dashboard": "Admin Dashboard",
    "admin-users": "User Management",
    "admin-ai": "AI Moderation",
    dashboard: `${user?.full_name || "Your"} Dashboard`,
    "employer-dashboard": `${user?.full_name || "Employer"} Dashboard`,
    analytics: "Analytics",
    jobs: "Job Search",
    "employer-jobs": "Job Posts",
    "employer-applicants": "Applicants",
    "employer-analytics": "Hiring Analytics",
    "post-jobs": "Employer Job Posting",
    tracker: "Applications & Saved Jobs",
    alerts: "Job Alerts",
    "ai-career": "AI Career Studio",
    profile: canManageJobs(user) ? "Employer Profile" : "Profile & Resume",
  };
  return titles[activeView];
}

function AuthScreen({
  onLogin,
  onRegister,
  message,
  setMessage,
  publicJobs = [],
  applyTarget = null,
  initialMode = "login",
  onCancel = () => {},
}) {
  const [mode, setMode] = useState(initialMode);
  const [revealStage, setRevealStage] = useState("offer");
  const [userRoleType, setUserRoleType] = useState(applyTarget ? "candidate" : null);
  const featuredJob = publicJobs[0];
  const previewJob = applyTarget || featuredJob;

  useEffect(() => {
    setRevealStage("offer");
    const first = window.setTimeout(() => setRevealStage("twirl"), 1200);
    const second = window.setTimeout(() => setRevealStage("wordmark"), 3000);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [applyTarget]);

  async function submit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (mode === "register") {
        await onRegister(payload);
        await onLogin(payload.email, payload.password);
        setMessage("Account created and signed in.");
      } else {
        await onLogin(payload.email, payload.password);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className={`auth-screen auth-screen-avenir auth-screen-split${applyTarget ? " auth-screen-apply" : ""}`}>
      <section className="auth-form-panel">
        <div className="auth-card-shell auth-card-avenir">
          {!userRoleType ? (
            <div className="role-selection-stage">
              <div className="auth-brand-header auth-brand-header-avenir">
                <div className="auth-brand-mark">
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <h2>Welcome to Avenir</h2>
                  <p>To continue, please choose your career path.</p>
                </div>
              </div>
              <div className="role-selection-options">
                <button 
                  type="button" 
                  className="role-select-card"
                  onClick={() => setUserRoleType("candidate")}
                >
                  <div className="role-card-icon"><UserRound size={26} /></div>
                  <div className="role-card-info">
                    <h3>I am a Candidate</h3>
                    <p>I want to browse remote/global jobs and apply.</p>
                  </div>
                </button>
                <button 
                  type="button" 
                  className="role-select-card"
                  onClick={() => setUserRoleType("employer")}
                >
                  <div className="role-card-icon"><BriefcaseBusiness size={26} /></div>
                  <div className="role-card-info">
                    <h3>I am a Recruiter / Employer</h3>
                    <p>I want to post jobs, manage candidates and track analytics.</p>
                  </div>
                </button>
              </div>
              <button 
                type="button" 
                className="role-select-cancel"
                onClick={onCancel}
              >
                Go Back to Browsing
              </button>
            </div>
          ) : (
            <>
              <button 
                type="button" 
                className="role-back-link" 
                onClick={() => setUserRoleType(null)}
              >
                ← Back to choose role
              </button>
              <div className="auth-brand-header auth-brand-header-avenir">
                <div className="auth-brand-mark">
                  {userRoleType === "candidate" ? <UserRound size={20} /> : <BriefcaseBusiness size={20} />}
                </div>
                <div>
                  <h2>{mode === "login" ? `Sign In` : `Create Account`}</h2>
                  <p>
                    {userRoleType === "candidate" 
                      ? "Access Avenir as a Candidate" 
                      : "Access Avenir as an Employer / Recruiter"}
                  </p>
                </div>
              </div>
              <div className="segmented">
                <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
                <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
              </div>
              <form className="stack-form" onSubmit={submit}>
                <input type="hidden" name="role" value={userRoleType} />
                {mode === "register" && <input name="full_name" placeholder="Full name" required />}
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Password" required />
                {mode === "register" && userRoleType === "candidate" && (
                  <>
                    <input name="skills" placeholder="Skills, comma separated" />
                    <input name="preferred_location" placeholder="Preferred location" />
                    <select name="preferred_branch" defaultValue="">
                      <option value="">Choose branch/domain</option>
                      {branchOptions.map((branch) => (
                        <option key={branch.value} value={branch.value}>{branch.label}</option>
                      ))}
                    </select>
                    <input name="preferred_role" list="role-options" placeholder="Preferred role" />
                  </>
                )}
                {mode === "register" && userRoleType === "employer" && (
                  <>
                    <input name="skills" placeholder="Hiring focus (e.g. Frontend, VLSI)" />
                    <input name="current_location" placeholder="Company location" />
                    <input name="portfolio_url" placeholder="Company website (https://...)" />
                  </>
                )}
                <button type="submit">{mode === "login" ? (applyTarget ? "Continue to apply" : "Login") : "Create Account"}</button>
              </form>
              {message && <p className="form-message">{message}</p>}
              <div className="auth-note">
                {applyTarget ? "Your selected job will stay ready after signup." : "Browse jobs freely. Sign in only when you want to save or apply."}
              </div>
            </>
          )}
        </div>

        {previewJob && (
          <div className="auth-mini-preview">
            <span className="auth-mini-preview-label">{applyTarget ? "Selected role" : "Featured role"}</span>
            <>
              <strong>{previewJob.title}</strong>
              <small>{previewJob.company} · {previewJob.location}</small>
            </>
          </div>
        )}
        <RoleOptions />
      </section>

      <section className="auth-brand-panel" aria-label="Avenir brand introduction">
        <div className="avenir-cinema" aria-hidden="true">
          <div className="cinema-glow cinema-glow-a" />
          <div className="cinema-glow cinema-glow-b" />
          <div className={`offer-letter offer-letter-${revealStage}`}>
            <div className="letter-seal" />
            <span className="letter-kicker">Offer Letter</span>
            <strong>Congratulations...</strong>
            <p>We are pleased to...</p>
            <div className="letter-line letter-line-wide" />
            <div className="letter-line" />
            <div className="letter-line letter-line-soft" />
          </div>
          <div className="particle-field">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} style={{ "--particle-index": index }} />
            ))}
          </div>
          <div className={`wordmark-reveal wordmark-reveal-${revealStage}`}>
            <span>avenir</span>
          </div>
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-badge">
            <BriefcaseBusiness size={22} />
            <span>avenir</span>
          </div>
          <h1>avenir</h1>
          <p className="auth-tagline">Where opportunity meets momentum.</p>
          <p>
            {applyTarget
              ? "Create your profile once, then continue straight into the role you selected."
              : "Discover roles that fit your skills, explore opportunities with confidence, and keep your career moving forward."}
          </p>
          <div className="auth-feature-pills" aria-label="Platform highlights">
            <span>{applyTarget ? "Selected job saved" : "Curated roles"}</span>
            <span>Fast apply</span>
            <span>Smart matching</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>;
}

function Snapshot({ label, value }) {
  return <article className="snapshot"><span>{label}</span><strong>{value}</strong></article>;
}

function Panel({ title, icon, children, id }) {
  return <section className="panel" id={id}><h2>{icon}{title}</h2>{children}</section>;
}

function JobCard({ job, onSave, onApply, canApply = true, style }) {
  const canApplyInPortal = canApply && onApply && isPortalJob(job);
  const canApplyOnSite = canApply && onApply && !isPortalJob(job) && !isSampleJob(job) && job.source_url;

  return (
    <article className="job-card" style={style}>
      <div className="job-meta-row">
        <span>{job.job_type || "Job"}</span>
        <b>{jobSourceLabel(job)}</b>
      </div>
      <h3>{job.title}</h3>
      <p>{job.company} · {job.location}</p>
      <small>{job.skills}</small>
      <div className="button-row">
        {onSave && <button onClick={() => onSave(job.id)}>Save</button>}
        {canApplyOnSite && <button onClick={() => onApply(job)}>Apply</button>}
        {canApplyInPortal && <button onClick={() => onApply(job)}>Apply</button>}
      </div>
    </article>
  );
}

function JobRow({ job, meta, onSave, onApply, canApply = true }) {
  const canApplyInPortal = canApply && onApply && isPortalJob(job);
  const canApplyOnSite = canApply && onApply && !isPortalJob(job) && !isSampleJob(job) && job.source_url;

  return (
    <article className="job-row">
      <div>
        <strong>{job.title}</strong>
        <span>{job.company} · {job.location}</span>
      </div>
      <small>{meta}</small>
      {onSave && <button onClick={() => onSave(job.id)}>Save</button>}
      {canApplyOnSite && <button onClick={() => onApply(job)}>Apply</button>}
      {canApplyInPortal && <button onClick={() => onApply(job)}>Apply</button>}
    </article>
  );
}

function ApplicationRow({ application, onStatusChange }) {
  return (
    <article className={`application-row status-${application.status}`}>
      <div>
        <strong>{application.job.title}</strong>
        <span>{application.job.company} · {application.job.location}</span>
        {application.cover_letter && <small>{application.cover_letter}</small>}
      </div>
      <select
        aria-label={`Status for ${application.job.title}`}
        value={application.status}
        onChange={(event) => onStatusChange(application.id, event.target.value)}
      >
        {applicationStatuses.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </select>
    </article>
  );
}

function EmployerApplicationRow({ application, onStatusChange, onRecruiterAI, onDelete }) {
  return (
    <article className={`applicant-row status-${application.status}`}>
      <div>
        <strong>{application.user.full_name}</strong>
        <span>{application.job.title}</span>
        <small>{application.user.email} · {application.user.skills || "No skills added"}</small>
        {application.cover_letter && <small>{application.cover_letter}</small>}
      </div>
      {application.resume_url && (
        <a className="icon-link" href={assetUrl(application.resume_url)} target="_blank" rel="noreferrer">
          <FileText size={16} /> Resume
        </a>
      )}
      {onRecruiterAI && (
        <button type="button" className="icon-link" onClick={() => onRecruiterAI(application.id)}>
          <Sparkles size={16} /> AI fit
        </button>
      )}
      {onDelete && (
        <button type="button" className="danger-button" onClick={() => onDelete(application.id)} title="Remove spam application">
          <Trash2 size={16} /> Remove
        </button>
      )}
      <select
        aria-label={`Status for ${application.user.full_name}`}
        value={application.status}
        onChange={(event) => onStatusChange(application.id, event.target.value)}
      >
        {applicationStatuses.map((status) => (
          <option key={status.value} value={status.value}>{status.label}</option>
        ))}
      </select>
    </article>
  );
}

function AdminUserRow({ userItem, currentUser, onRoleChange }) {
  const isSelf = userItem.id === currentUser?.id;

  return (
    <article className="admin-user-row">
      <div>
        <strong>{userItem.full_name}</strong>
        <span>{userItem.email}</span>
        <small>{userItem.headline || userItem.preferred_role || "No headline added"}</small>
      </div>
      <b>{userItem.role}</b>
      <select
        aria-label={`Role for ${userItem.full_name}`}
        value={userItem.role}
        disabled={isSelf}
        onChange={(event) => onRoleChange(userItem.id, event.target.value)}
      >
        <option value="candidate">Candidate</option>
        <option value="employer">Employer</option>
        <option value="admin">Admin</option>
      </select>
    </article>
  );
}

function AIResult({ result }) {
  const data = result.result || {};
  const title = result.action.replace(/-/g, " ");
  return (
    <div className="ai-result">
      <strong>{title}</strong>
      {"resume_score" in data && <Snapshot label="Resume Score" value={`${data.resume_score}/100`} />}
      {"match_score" in data && <Snapshot label="Match Score" value={`${data.match_score}%`} />}
      {"overall_fit" in data && <Snapshot label="Overall Fit" value={`${data.overall_fit}%`} />}
      {data.current_level && <Snapshot label="Current Level" value={data.current_level} />}
      {data.estimated_timeline && <Snapshot label="Timeline" value={data.estimated_timeline} />}
      {data.answer && <p>{data.answer}</p>}
      {data.simplified && <p>{data.simplified}</p>}
      {data.draft && <pre>{data.draft}</pre>}
      {data.candidate && <p>{data.candidate.full_name} · {data.candidate.skills || "No skills added"}</p>}
      <AIList title="Strengths" items={data.strengths} />
      <AIList title="Improvements" items={data.improvements} />
      <AIList title="Job Requirements" items={data.job_requirements || data.required} />
      <AIList title="Your Skills" items={data.user_skills || data.extracted_skills || data.skills} />
      <AIList title="Matched" items={data.matched_skills || data.why_this_matches} />
      <AIList title="Missing" items={data.missing_skills || data.missing || data.weaknesses} />
      <AIList title="Questions" items={data.questions} ordered />
      <AIList title="Next Steps" items={data.next_steps || data.recommended_focus} ordered />
      {Array.isArray(data.suggestions) && (
        <div className="ai-list">
          <span>Resume Tailoring</span>
          {data.suggestions.map((item, index) => (
            <p key={`${item.current}-${index}`}>
              <b>{item.current}</b><br />{item.suggested}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AIList({ title, items, ordered = false }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div className="ai-list">
      <span>{title}</span>
      <ListTag>
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ListTag>
    </div>
  );
}

function PostedJobRow({ job, onDelete, onEdit, showModerationReason = false }) {
  return (
    <article className="posted-job-row">
      <div>
        <strong>{job.title}</strong>
        <span>{job.company} · {job.location}</span>
        <small>
          {job.is_active ? "Active" : "Closed"}
          {showModerationReason ? " · remove fake, scam, duplicate, or expired jobs" : ""}
        </small>
      </div>
      {onEdit && (
        <button className="secondary-button" onClick={() => onEdit(job)} title="Edit job details">
          <FileText size={16} /> Edit
        </button>
      )}
      {job.is_active && (
        <button className="danger-button" onClick={() => onDelete(job.id)} title="Remove job post">
          <Trash2 size={16} /> Remove
        </button>
      )}
    </article>
  );
}

function RoleOptions() {
  return (
    <datalist id="role-options">
      {allRoleOptions.map((role) => (
        <option key={role} value={role} />
      ))}
    </datalist>
  );
}

createRoot(document.getElementById("root")).render(<App />);
