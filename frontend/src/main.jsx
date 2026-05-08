import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BriefcaseBusiness,
  ChartColumn,
  FileText,
  Link,
  LogOut,
  Search,
  Sparkles,
  Star,
  Upload,
  UserRound,
} from "lucide-react";
import { api } from "./api";
import "./styles.css";

const emptyFilters = { search: "", location: "", skill: "", job_type: "", salary_min: "" };

function App() {
  const [token, setToken] = useState(localStorage.getItem("job_portal_token"));
  const [activeView, setActiveView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertMatches, setAlertMatches] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [resumeText, setResumeText] = useState("");
  const [resumeResult, setResumeResult] = useState(null);
  const [message, setMessage] = useState("");

  async function loadPrivateData() {
    const [me, dash, recs, apps, saved, stats, userAlerts] = await Promise.all([
      api.me(),
      api.dashboard(),
      api.recommendations(),
      api.applications(),
      api.savedJobs(),
      api.analytics(),
      api.alerts(),
    ]);
    setUser(me);
    setDashboard(dash);
    setRecommendations(recs);
    setApplications(apps);
    setSavedJobs(saved);
    setAnalytics(stats);
    setAlerts(userAlerts);
  }

  async function loadJobs(nextFilters = filters) {
    const clean = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
    setJobs(await api.jobs(clean));
  }

  useEffect(() => {
    loadJobs();
    if (token) {
      loadPrivateData().catch((error) => setMessage(error.message));
    }
  }, [token]);

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

  async function applyToJob(jobId) {
    await api.apply({ job_id: jobId });
    setMessage("Application added to tracker");
    await loadPrivateData();
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
    const updated = await api.updateMe(payload);
    setUser(updated);
    setMessage("Profile updated");
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
      <aside className="sidebar">
        <div className="brand-row">
          <BriefcaseBusiness size={28} />
          <div>
            <strong>Job Portal</strong>
            <span>FastAPI dashboard</span>
          </div>
        </div>
        <nav>
          <button className={activeView === "dashboard" ? "active-nav" : ""} onClick={() => setActiveView("dashboard")}><ChartColumn size={18} /> Dashboard</button>
          <button className={activeView === "jobs" ? "active-nav" : ""} onClick={() => setActiveView("jobs")}><Search size={18} /> Jobs</button>
          <button className={activeView === "tracker" ? "active-nav" : ""} onClick={() => setActiveView("tracker")}><FileText size={18} /> Tracker</button>
          <button className={activeView === "alerts" ? "active-nav" : ""} onClick={() => setActiveView("alerts")}><Bell size={18} /> Alerts</button>
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
              <Metric label="Saved jobs" value={dashboard?.saved_jobs_count || 0} />
              <Metric label="Applications" value={dashboard?.applications_count || 0} />
              <Metric label="Active jobs" value={dashboard?.active_jobs_count || 0} />
              <Metric label="Alerts" value={dashboard?.alerts_count || 0} />
            </section>

            <section className="dashboard-grid">
              <Panel title="Career Snapshot" icon={<UserRound size={20} />}>
                <div className="snapshot-grid">
                  <Snapshot label="Profile role" value={user?.preferred_role || "Not set"} />
                  <Snapshot label="Experience" value={user?.experience_years || "Not set"} />
                  <Snapshot label="Current location" value={user?.current_location || "Not set"} />
                  <Snapshot label="Skills" value={user?.skills || "Add skills in Profile"} />
                  <Snapshot label="Resume" value={user?.resume_url ? "Uploaded" : "Not uploaded"} />
                </div>
              </Panel>
              <Panel title="Market Insights" icon={<ChartColumn size={20} />}>
                <div className="bar-list">
                  {(analytics?.top_skills || []).map((skill) => (
                    <div key={skill.name} className="bar-row">
                      <span>{skill.name}</span>
                      <div><i style={{ width: `${(skill.count / topSkillMax) * 100}%` }} /></div>
                      <b>{skill.count}</b>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          </>
        )}

        {activeView === "jobs" && (
          <section className="jobs-workspace">
            <Panel title="Recommended Jobs" icon={<Sparkles size={20} />}>
              <div className="list-stack">
                {recommendations.slice(0, 5).map((item) => (
                  <JobRow key={item.job.id} job={item.job} meta={`${item.score}% match`} onSave={saveJob} onApply={applyToJob} />
                ))}
              </div>
            </Panel>

            <Panel title="Search Jobs" icon={<Search size={20} />}>
              <form className="filter-grid" onSubmit={(event) => { event.preventDefault(); loadJobs(filters); }}>
                {Object.keys(emptyFilters).map((key) => (
                  <input
                    key={key}
                    placeholder={key.replace("_", " ")}
                    value={filters[key]}
                    onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
                  />
                ))}
                <button type="submit">Search</button>
              </form>
              <div className="job-grid">
                {jobs.map((job) => <JobCard key={job.id} job={job} onSave={saveJob} onApply={applyToJob} />)}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "tracker" && (
          <section className="split">
            <Panel title="Application Tracker" icon={<FileText size={20} />}>
              <div className="list-stack">
                {applications.map((item) => <JobRow key={item.id} job={item.job} meta={item.status} />)}
              </div>
            </Panel>
            <Panel title="Saved Jobs" icon={<Star size={20} />}>
              <div className="list-stack">
                {savedJobs.map((item) => <JobRow key={item.id} job={item.job} meta="Saved" onApply={applyToJob} />)}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "alerts" && (
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
            <Panel title="Candidate Details" icon={<UserRound size={20} />}>
              <form className="profile-form" onSubmit={updateProfile}>
                <label>Full name<input name="full_name" defaultValue={user?.full_name || ""} placeholder="Full name" /></label>
                <label>Phone<input name="phone" defaultValue={user?.phone || ""} placeholder="Phone number" /></label>
                <label className="wide-field">Headline<input name="headline" defaultValue={user?.headline || ""} placeholder="Backend Developer | FastAPI | React" /></label>
                <label className="wide-field">Professional summary<textarea name="summary" defaultValue={user?.summary || ""} placeholder="Short profile summary, achievements, or career objective" /></label>
                <label className="wide-field">Skills<input name="skills" defaultValue={user?.skills || ""} placeholder="Python, FastAPI, React, SQL" /></label>
                <label>Experience<input name="experience_years" defaultValue={user?.experience_years || ""} placeholder="2 years" /></label>
                <label>Current location<input name="current_location" defaultValue={user?.current_location || ""} placeholder="Bengaluru" /></label>
                <label>Preferred role<input name="preferred_role" defaultValue={user?.preferred_role || ""} placeholder="Backend Developer" /></label>
                <label>Preferred location<input name="preferred_location" defaultValue={user?.preferred_location || ""} placeholder="Remote, Bengaluru" /></label>
                <label>Preferred job type<input name="preferred_job_type" defaultValue={user?.preferred_job_type || ""} placeholder="Full-time, Internship" /></label>
                <label>Expected salary<input name="expected_salary" defaultValue={user?.expected_salary || ""} placeholder="8 LPA" /></label>
                <label>Notice period<input name="notice_period" defaultValue={user?.notice_period || ""} placeholder="Immediate, 30 days" /></label>
                <label>LinkedIn<input name="linkedin_url" defaultValue={user?.linkedin_url || ""} placeholder="https://linkedin.com/in/..." /></label>
                <label>GitHub<input name="github_url" defaultValue={user?.github_url || ""} placeholder="https://github.com/..." /></label>
                <label className="wide-field">Portfolio<input name="portfolio_url" defaultValue={user?.portfolio_url || ""} placeholder="https://your-portfolio.com" /></label>
                <label className="wide-field">Education<textarea name="education" defaultValue={user?.education || ""} placeholder="Degree, institution, graduation year, certifications" /></label>
                <button type="submit">Save Profile</button>
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
    </main>
  );
}

function viewTitle(activeView, user) {
  const titles = {
    dashboard: `${user?.full_name || "Your"} Dashboard`,
    jobs: "Job Search",
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
        setMode("login");
        setMessage("Account created. Sign in to continue.");
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
        <p>Search jobs, track applications, create alerts, and review career insights.</p>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          {mode === "register" && <input name="full_name" placeholder="Full name" required />}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          {mode === "register" && (
            <>
              <input name="skills" placeholder="Skills, comma separated" />
              <input name="preferred_location" placeholder="Preferred location" />
              <input name="preferred_role" placeholder="Preferred role" />
            </>
          )}
          <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>
        {message && <p className="form-message">{message}</p>}
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

function JobCard({ job, onSave, onApply }) {
  return (
    <article className="job-card">
      <span>{job.job_type || "Job"}</span>
      <h3>{job.title}</h3>
      <p>{job.company} · {job.location}</p>
      <small>{job.skills}</small>
      <div className="button-row">
        <button onClick={() => onSave(job.id)}>Save</button>
        <button onClick={() => onApply(job.id)}>Apply</button>
      </div>
    </article>
  );
}

function JobRow({ job, meta, onSave, onApply }) {
  return (
    <article className="job-row">
      <div>
        <strong>{job.title}</strong>
        <span>{job.company} · {job.location}</span>
      </div>
      <small>{meta}</small>
      {onSave && <button onClick={() => onSave(job.id)}>Save</button>}
      {onApply && <button onClick={() => onApply(job.id)}>Apply</button>}
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
