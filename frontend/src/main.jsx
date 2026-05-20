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
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "./api";
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
      "Data Scientist",
      "Business Analyst",
      "BI Analyst",
      "Machine Learning Engineer",
      "AI Engineer",
      "Data Engineer",
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
      "DevOps Engineer",
      "Cloud Engineer",
      "QA Engineer",
      "Cybersecurity Analyst",
    ],
  },
  {
    value: "ece",
    label: "ECE",
    roles: [
      "Embedded Systems Engineer",
      "VLSI Engineer",
      "Electronics Engineer",
      "Hardware Design Engineer",
      "IoT Engineer",
      "Signal Processing Engineer",
      "Telecommunications Engineer",
      "RF Engineer",
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
      "Renewable Energy Engineer",
      "Electrical Design Engineer",
      "Maintenance Engineer",
      "Automation Engineer",
    ],
  },
  {
    value: "mechanical",
    label: "Mechanical",
    roles: [
      "Mechanical Engineer",
      "Design Engineer",
      "CAD Engineer",
      "Manufacturing Engineer",
      "Production Engineer",
      "Quality Engineer",
      "Maintenance Engineer",
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

function App() {
  const [token, setToken] = useState(localStorage.getItem("job_portal_token"));
  const [activeView, setActiveView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [employerApplications, setEmployerApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertMatches, setAlertMatches] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [resumeText, setResumeText] = useState("");
  const [resumeResult, setResumeResult] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);
  const [appliedJob, setAppliedJob] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [message, setMessage] = useState("");
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
  const availableRecommendations = recommendations.filter((item) => !appliedJobIds.has(item.job.id));
  const availableJobs = jobs.filter((job) => !appliedJobIds.has(job.id));
  const availableSavedJobs = savedJobs.filter((item) => !appliedJobIds.has(item.job.id));

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
    setMyJobs(postedJobs);
    setEmployerApplications(applicants);
    setDashboard(dash);
    setRecommendations(recs);
    setApplications(apps);
    setSavedJobs(saved);
    setAnalytics(stats);
    setAlerts(userAlerts);
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
    setJobs(await api.jobs(clean));
  }

  useEffect(() => {
    loadJobs();
    if (token) {
      loadPrivateData().catch((error) => setMessage(error.message));
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      loadJobs();
    }
  }, [user?.preferred_branch, user?.preferred_role]);

  async function handleLogin(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem("job_portal_token", data.access_token);
    setToken(data.access_token);
    setMessage("Signed in successfully");
  }

  function logout() {
    localStorage.removeItem("job_portal_token");
    setToken(null);
    setUser(null);
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
    const payload = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    for (const key of ["salary_min", "salary_max"]) {
      if (payload[key]) payload[key] = Number(payload[key]);
    }
    const created = await api.createJob(payload);
    event.currentTarget.reset();
    setMessage("Job posted successfully");
    setActiveView("post-jobs");
    await Promise.all([loadJobs(), loadPrivateData()]);
    setMyJobs((current) => [created, ...current.filter((job) => job.id !== created.id)]);
  }

  async function deleteMyJob(jobId) {
    await api.deleteJob(jobId);
    setMessage("Job post closed");
    await Promise.all([loadJobs(), loadPrivateData()]);
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
    const result = await api.resumeMatch(resumeText);
    setResumeResult(result);
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
    const file = event.target.files?.[0];
    if (!file) return;
    const updated = await api.uploadResume(file);
    setUser(updated);
    setMessage("Resume uploaded");
  }

  async function showAlertMatches(alertId) {
    const result = await api.alertMatches(alertId);
    setAlertMatches(result.matches);
  }

  const topSkillMax = useMemo(
    () => Math.max(...(analytics?.top_skills || []).map((item) => item.count), 1),
    [analytics],
  );

  if (!token) {
    return <AuthScreen onLogin={handleLogin} onRegister={api.register} message={message} setMessage={setMessage} />;
  }

  return (
    <main className="app-shell">
      <RoleOptions />
      <aside className="sidebar">
        <div className="brand-row">
          <BriefcaseBusiness size={28} />
          <div>
            <strong>Job Portal</strong>
            <span>FastAPI dashboard</span>
          </div>
        </div>
        <nav>
          <button className={activeView === "dashboard" ? "active-nav" : ""} onClick={() => setActiveView("dashboard")}><LayoutDashboard size={18} /> Dashboard</button>
          <button className={activeView === "analytics" ? "active-nav" : ""} onClick={() => setActiveView("analytics")}><BarChart3 size={18} /> Analytics</button>
          <button className={activeView === "jobs" ? "active-nav" : ""} onClick={() => setActiveView("jobs")}><Search size={18} /> Jobs</button>
          {canManageJobs(user) && <button className={activeView === "post-jobs" ? "active-nav" : ""} onClick={() => setActiveView("post-jobs")}><PlusCircle size={18} /> Post Jobs</button>}
          {isCandidate(user) && <button className={activeView === "tracker" ? "active-nav" : ""} onClick={() => setActiveView("tracker")}><FileText size={18} /> Tracker</button>}
          {isCandidate(user) && <button className={activeView === "alerts" ? "active-nav" : ""} onClick={() => setActiveView("alerts")}><Bell size={18} /> Alerts</button>}
          <button className={activeView === "profile" ? "active-nav" : ""} onClick={() => setActiveView("profile")}><UserRound size={18} /> Profile</button>
        </nav>
        <button className="ghost-button" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personalized career workspace</p>
            <h1>{viewTitle(activeView, user)}</h1>
          </div>
          {message && <span className="status-pill">{message}</span>}
        </header>

        {activeView === "dashboard" && (
          <>
            <section className="metric-grid">
              <Metric label="Total applications" value={dashboard?.applications_count || 0} />
              <Metric label="Saved jobs" value={dashboard?.saved_jobs_count || 0} />
              <Metric label="Alerts" value={dashboard?.alerts_count || 0} />
              <Metric label="Active jobs" value={dashboard?.active_jobs_count || 0} />
            </section>

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
              <Panel title="Applications per Job (All Users)" icon={<ChartColumn size={20} />}>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={applicationPerJobData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={140} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1f5590" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel title="Skill Trends" icon={<ChartColumn size={20} />}>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSkillData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f6b5b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
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
            </div>
          </section>
        )}

        {activeView === "jobs" && (
          <section className="jobs-workspace">
            {isCandidate(user) && (
              <Panel title="Recommended Jobs" icon={<Sparkles size={20} />}>
                <div className="list-stack">
                  {availableRecommendations.slice(0, 5).map((item) => (
                    <JobRow key={item.job.id} job={item.job} meta={`${item.score}% match`} onSave={saveJob} onApply={setApplyTarget} canApply={isCandidate(user)} />
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

        {activeView === "post-jobs" && canManageJobs(user) && (
          <section className="post-jobs-workspace">
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
            <Panel title={user?.role === "admin" ? "All Job Posts" : "Your Job Posts"} icon={<BriefcaseBusiness size={20} />}>
              <div className="list-stack">
                {myJobs.map((job) => (
                  <PostedJobRow key={job.id} job={job} onDelete={deleteMyJob} />
                ))}
              </div>
            </Panel>
            <Panel title="Applicants" icon={<FileText size={20} />}>
              <div className="list-stack">
                {employerApplications.map((application) => (
                  <EmployerApplicationRow
                    key={application.id}
                    application={application}
                    onStatusChange={updateApplicationStatus}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="Import Real Jobs" icon={<Sparkles size={20} />}>
              <form className="stack-form import-pack-form" onSubmit={importRolePack}>
                <input name="branches" defaultValue="data_ai, cse_it, ece, eee" />
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

        {activeView === "profile" && (
          <section className="profile-workspace">
            <Panel title={isCandidate(user) ? "Candidate Details" : "Employer Details"} icon={<UserRound size={20} />}>
              <form className="profile-form" onSubmit={updateProfile}>
                <label>Full name<input name="full_name" defaultValue={user?.full_name || ""} placeholder="Full name" /></label>
                <label>Phone<input name="phone" defaultValue={user?.phone || ""} placeholder="Phone number" /></label>
                <label className="wide-field">Headline<input name="headline" defaultValue={user?.headline || ""} placeholder="Backend Developer | FastAPI | React" /></label>
                <label className="wide-field">Professional summary<textarea name="summary" defaultValue={user?.summary || ""} placeholder="Short profile summary, achievements, or career objective" /></label>
                <label className="wide-field">Skills<input name="skills" defaultValue={user?.skills || ""} placeholder="Python, FastAPI, React, SQL" /></label>
                <label>Experience<input name="experience_years" defaultValue={user?.experience_years || ""} placeholder="e.g. 2 years" /></label>
                <label>Current location<input name="current_location" defaultValue={user?.current_location || ""} placeholder="e.g. Bengaluru" /></label>
                <label>Branch / domain<select name="preferred_branch" defaultValue={user?.preferred_branch || ""}>
                  <option value="">Choose branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.value} value={branch.value}>{branch.label}</option>
                  ))}
                </select></label>
                <label>Preferred role<input name="preferred_role" list="role-options" defaultValue={user?.preferred_role || ""} placeholder="Data Analyst" /></label>
                <label>Preferred location<input name="preferred_location" defaultValue={user?.preferred_location || ""} placeholder="Remote, Bengaluru" /></label>
                <label>Preferred job type<input name="preferred_job_type" defaultValue={user?.preferred_job_type || ""} placeholder="Full-time, Internship" /></label>
                <label>Expected salary<input name="expected_salary" defaultValue={user?.expected_salary || ""} placeholder="e.g. 8 LPA" /></label>
                <label>Notice period<input name="notice_period" defaultValue={user?.notice_period || ""} placeholder="e.g. Immediate, 30 days" /></label>
                <label>LinkedIn<input name="linkedin_url" defaultValue={user?.linkedin_url || ""} placeholder="https://linkedin.com/in/..." /></label>
                <label>GitHub<input name="github_url" defaultValue={user?.github_url || ""} placeholder="https://github.com/..." /></label>
                <label className="wide-field">Portfolio<input name="portfolio_url" defaultValue={user?.portfolio_url || ""} placeholder="https://your-portfolio.com" /></label>
                <label className="wide-field">Education<textarea name="education" defaultValue={user?.education || ""} placeholder="Degree, institution, graduation year, certifications" /></label>
                <div className="profile-save-bar">
                  <button type="submit">Save Profile</button>
                  {message === "Profile saved successfully" && <span>Saved</span>}
                </div>
              </form>
            </Panel>
            <section className="profile-side">
              <Panel title="Resume" icon={<Upload size={20} />}>
              <label className="upload-box">
                <Upload size={22} />
                <span>Upload resume file</span>
                <small>PDF, DOC, DOCX, or TXT</small>
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={uploadResume} />
              </label>
              {user?.resume_url && (
                <a className="resume-link" href={`http://127.0.0.1:8000${user.resume_url}`} target="_blank" rel="noreferrer">
                  <Link size={16} /> View uploaded resume
                </a>
              )}
              </Panel>
              <Panel title="Resume Matching" icon={<Sparkles size={20} />}>
                <textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste resume text to extract skills and match jobs" />
                <button onClick={matchResume}>Match Resume</button>
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
    dashboard: `${user?.full_name || "Your"} Dashboard`,
    analytics: "Analytics",
    jobs: "Job Search",
    "post-jobs": "Employer Job Posting",
    tracker: "Applications & Saved Jobs",
    alerts: "Job Alerts",
    profile: "Profile & Resume",
  };
  return titles[activeView];
}

function AuthScreen({ onLogin, onRegister, message, setMessage }) {
  const [mode, setMode] = useState("login");

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
    <main className="auth-screen">
      <section className="auth-visual" aria-label="Job discovery dashboard preview">
        <div className="preview-window">
          <div className="preview-line wide" />
          <div className="preview-line" />
          <div className="preview-cards"><span /><span /><span /></div>
        </div>
      </section>
      <section className="auth-panel">
        <BriefcaseBusiness size={36} />
        <h1>Job Portal</h1>
        <p>Search jobs, track applications, post openings, and review career insights.</p>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          {mode === "register" && <input name="full_name" placeholder="Full name" required />}
          {mode === "register" && (
            <select name="role" defaultValue="candidate">
              <option value="candidate">Candidate account</option>
              <option value="employer">Employer account</option>
            </select>
          )}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          {mode === "register" && (
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
          <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <RoleOptions />
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

function JobCard({ job, onSave, onApply, canApply = true }) {
  const canApplyInPortal = canApply && onApply && isPortalJob(job);
  const canApplyOnSite = canApply && onApply && !isPortalJob(job) && !isSampleJob(job) && job.source_url;

  return (
    <article className="job-card">
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

function EmployerApplicationRow({ application, onStatusChange }) {
  return (
    <article className={`applicant-row status-${application.status}`}>
      <div>
        <strong>{application.user.full_name}</strong>
        <span>{application.job.title}</span>
        <small>{application.user.email} · {application.user.skills || "No skills added"}</small>
        {application.cover_letter && <small>{application.cover_letter}</small>}
      </div>
      {application.resume_url && (
        <a className="icon-link" href={`http://127.0.0.1:8000${application.resume_url}`} target="_blank" rel="noreferrer">
          <FileText size={16} /> Resume
        </a>
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

function PostedJobRow({ job, onDelete }) {
  return (
    <article className="posted-job-row">
      <div>
        <strong>{job.title}</strong>
        <span>{job.company} · {job.location}</span>
        <small>{job.is_active ? "Active" : "Closed"}</small>
      </div>
      {job.is_active && (
        <button className="danger-button" onClick={() => onDelete(job.id)} title="Close job post">
          <Trash2 size={16} /> Close
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
