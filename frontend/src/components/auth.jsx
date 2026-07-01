import React, { useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { branchOptions, RoleOptions } from "../constants";
import { JobCard } from "./ui";

export function AuthScreen({ onLogin, onRegister, message, setMessage, publicJobs = [], onNeedLogin }) {
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
        <BriefcaseBusiness size={36} color="#1f5590" />
        <h1 style={{ color: "#1f5590", fontWeight: "900" }}>Avenir</h1>
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
                {branchOptions.map((branch) => <option key={branch.value} value={branch.value}>{branch.label}</option>)}
              </select>
              <input name="preferred_role" list="role-options" placeholder="Preferred role" />
            </>
          )}
          <button type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <RoleOptions />
      </section>
      <section className="auth-visual">
        <div className="preview-window" style={{ width: "100%" }}>
          <h2 style={{ marginBottom: 16 }}>Latest jobs</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {publicJobs.slice(0, 4).map((job) => (
              <JobCard key={job.id} job={job} onApply={onNeedLogin} onSave={onNeedLogin} canApply />
            ))}
          </div>
          {!publicJobs.length && <p>No jobs loaded yet.</p>}
        </div>
      </section>
    </main>
  );
}
