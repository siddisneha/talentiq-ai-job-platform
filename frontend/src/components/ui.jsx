import React from "react";
import { FileText, BriefcaseBusiness, LogOut, UserRound, Trash2 } from "lucide-react";
import { applicationStatuses, allRoleOptions, branchOptions, isPortalJob, isSampleJob, jobSourceLabel } from "../constants";

export function Metric({ label, value }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>;
}

export function Snapshot({ label, value }) {
  return <article className="snapshot"><span>{label}</span><strong>{value}</strong></article>;
}

export function Panel({ title, icon, children, id }) {
  return <section className="panel" id={id}><h2>{icon}{title}</h2>{children}</section>;
}

export function RoleOptions() {
  return (
    <datalist id="role-options">
      {allRoleOptions.map((role) => (
        <option key={role} value={role} />
      ))}
    </datalist>
  );
}

export function JobRow({ job, meta, onSave, onApply, canApply = true }) {
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

export function JobCard({ job, onSave, onApply, canApply = true }) {
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

export function ApplicationRow({ application, onStatusChange }) {
  return (
    <article className={`application-row status-${application.status}`}>
      <div>
        <strong>{application.job.title}</strong>
        <span>{application.job.company} · {application.job.location}</span>
        {application.cover_letter && <small>{application.cover_letter}</small>}
      </div>
      <select aria-label={`Status for ${application.job.title}`} value={application.status} onChange={(event) => onStatusChange(application.id, event.target.value)}>
        {applicationStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
    </article>
  );
}

export function EmployerApplicationRow({ application, onStatusChange }) {
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
      <select aria-label={`Status for ${application.user.full_name}`} value={application.status} onChange={(event) => onStatusChange(application.id, event.target.value)}>
        {applicationStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
    </article>
  );
}

export function PostedJobRow({ job, onDelete }) {
  return (
    <article className="posted-job-row">
      <div>
        <strong>{job.title}</strong>
        <span>{job.company} · {job.location}</span>
        <small>{job.is_active ? "Active" : "Closed"}</small>
      </div>
      {job.is_active && <button className="danger-button" onClick={() => onDelete(job.id)} title="Close job post"><Trash2 size={16} /> Close</button>}
    </article>
  );
}
