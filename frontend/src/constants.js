export const emptyFilters = { search: "", country: "", location: "", skill: "", job_type: "", salary_min: "" };

export const countryOptions = [
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

export const applicationStatuses = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const statusLabels = Object.fromEntries(applicationStatuses.map((status) => [status.value, status.label]));

export const branchOptions = [
  { value: "data_ai", label: "Data / AI", roles: ["Data Analyst", "Data Scientist", "Business Analyst", "BI Analyst", "Machine Learning Engineer", "AI Engineer", "Data Engineer"] },
  { value: "cse_it", label: "CSE / IT", roles: ["Software Engineer", "Python Developer", "Backend Developer", "Frontend Developer", "Full Stack Developer", "DevOps Engineer", "Cloud Engineer", "QA Engineer", "Cybersecurity Analyst"] },
  { value: "ece", label: "ECE", roles: ["Embedded Systems Engineer", "VLSI Engineer", "Electronics Engineer", "Hardware Design Engineer", "IoT Engineer", "Signal Processing Engineer", "Telecommunications Engineer", "RF Engineer"] },
  { value: "eee", label: "EEE", roles: ["Electrical Engineer", "Power Systems Engineer", "Control Systems Engineer", "PLC SCADA Engineer", "Renewable Energy Engineer", "Electrical Design Engineer", "Maintenance Engineer", "Automation Engineer"] },
  { value: "mechanical", label: "Mechanical", roles: ["Mechanical Engineer", "Design Engineer", "CAD Engineer", "Manufacturing Engineer", "Production Engineer", "Quality Engineer", "Maintenance Engineer"] },
  { value: "civil", label: "Civil", roles: ["Civil Engineer", "Site Engineer", "Structural Engineer", "Construction Project Engineer", "Quantity Surveyor", "Planning Engineer"] },
  { value: "business", label: "Business / Management", roles: ["Business Analyst", "Product Manager", "Project Coordinator", "Operations Analyst", "Marketing Analyst", "HR Analyst"] },
];

export const roleOptions = [
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

export const allRoleOptions = [...new Set([...roleOptions, ...branchOptions.flatMap((branch) => branch.roles)])];

export function branchLabel(value) {
  return branchOptions.find((branch) => branch.value === value)?.label || value;
}

export function canManageJobs(user) {
  return user?.role === "employer" || user?.role === "admin";
}

export function isCandidate(user) {
  return !user || user.role === "candidate";
}

export function isSampleJob(job) {
  return job.source_name === "Sample Seed Feed" || job.source_url?.includes("example.com");
}

export function isPortalJob(job) {
  return Boolean(job.posted_by_id) && !job.source_name;
}

export function jobSourceLabel(job) {
  if (isSampleJob(job)) return "Sample";
  if (isPortalJob(job)) return "Portal";
  return job.source_name || "External";
}
