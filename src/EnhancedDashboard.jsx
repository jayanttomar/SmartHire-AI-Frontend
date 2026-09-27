import { useEffect, useMemo, useState } from "react";
import "./enhanced-dashboard.css";
import {
  applyToJob,
  getApplicationResumeFile,
  getApplicationResumeContent,
  listMyApplications,
  listRecruiterApplications,
  recalculateApplicationMatch,
  updateApplicationStatus,
} from "./api/applications";
import {
  createJob,
  deactivateJob,
  listJobs,
  listMyJobs,
  updateJob,
} from "./api/jobs";
import {
  getCandidateProfile,
  getRecruiterProfile,
  saveCandidateProfile,
  saveRecruiterProfile,
} from "./api/profile";
import { generateResume, listMyResumes, uploadResume } from "./api/resumes";

const candidateNav = [
  ["home", "Home", "⌂"],
  ["jobs", "Find jobs", "⌕"],
  ["applications", "Applications", "▣"],
  ["resumes", "Resumes", "✦"],
  ["profile", "Profile", "◎"],
];
const recruiterNav = [
  ["home", "Overview", "⌂"],
  ["jobs", "My jobs", "▣"],
  ["applicants", "Applicants", "◉"],
  ["post", "Post a job", "+"],
  ["profile", "Company", "◎"],
];
const blankCandidate = {
  phone: "",
  location: "",
  headline: "",
  experienceYears: "",
  skills: "",
  education: "",
  dateOfBirth: "",
  gender: "",
  preferredWorkMode: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  bio: "",
};
const blankRecruiter = {
  companyName: "",
  companyWebsite: "",
  designation: "",
  companyDescription: "",
};
const blankJob = {
  title: "",
  companyName: "",
  location: "",
  jobType: "FULL_TIME",
  workMode: "REMOTE",
  description: "",
  requirements: "",
  salaryRange: "",
};
const blankResumeDraft = {
  targetRole: "",
  title: "",
  templateName: "Modern",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  projects: "",
};

const icon = {
  search: "⌕",
  pin: "⌖",
  briefcase: "▣",
  clock: "◷",
  spark: "✦",
  arrow: "→",
  close: "×",
  check: "✓",
  bookmark: "♡",
  bookmarkOn: "♥",
  upload: "↑",
  refresh: "↻",
};
const cls = (...values) => values.filter(Boolean).join(" ");
const pretty = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const initials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SH";
const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Recently";
const skillsFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};
const storageKey = (user) =>
  `smarthire:saved-jobs:v2:${user.userId ?? user.id ?? user.email}`;
const savedFor = (user) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(user)) || "[]");
  } catch {
    return [];
  }
};
const hiddenApplicationsKey = (user) =>
  `smarthire:hidden-applications:v1:${user.userId ?? user.id ?? user.email}`;
const hiddenApplicationsFor = (user) => {
  try {
    return JSON.parse(localStorage.getItem(hiddenApplicationsKey(user)) || "[]");
  } catch {
    return [];
  }
};
const jobSkills = (job) =>
  skillsFrom(
    `${job.title || ""},${job.requirements || ""},${job.description || ""}`.match(
      /JavaScript|TypeScript|React|Java|Spring Boot|Spring|Python|SQL|PostgreSQL|MySQL|MongoDB|AWS|Docker|Kubernetes|Git|REST|HTML|CSS|Node\.js|Angular|Figma|Machine Learning|Power BI/gi,
    ) || [],
  );
const profileSkills = (profile, resumes) => [
  ...new Set(
    [
      ...skillsFrom(profile?.skills),
      ...String(profile?.bio || "").split(/[,/|\n]/),
      ...resumes.flatMap((resume) => skillsFrom(resume.aiSkills)),
    ]
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 1),
  ),
];
const alignedSkills = (job, skills) =>
  jobSkills(job).filter((skill) => skills.includes(skill.toLowerCase()));

function Dialog({ children, onClose, className = "" }) {
  useEffect(() => {
    const dismiss = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [onClose]);
  return (
    <div
      className="sh-dialog-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        className={cls("sh-dialog", className)}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sh-dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          {icon.close}
        </button>
        {children}
      </section>
    </div>
  );
}

function Toast({ value, onDismiss }) {
  if (!value) return null;
  return (
    <div
      className={cls("sh-toast", value.type === "error" && "is-error")}
      role="status"
    >
      <span>{value.type === "error" ? "!" : icon.check}</span>
      <p>{value.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        {icon.close}
      </button>
    </div>
  );
}

function Status({ value }) {
  return (
    <span
      className={cls(
        "sh-status",
        `is-${String(value || "APPLIED").toLowerCase()}`,
      )}
    >
      {pretty(value || "APPLIED")}
    </span>
  );
}

function MatchState({ application, compact = false }) {
  const state = application.matchAnalysisStatus;
  if (
    state === "PENDING" ||
    state === "PROCESSING" ||
    (!state && application.matchScore == null)
  )
    return (
      <span className="sh-match is-pending">
        <i /> Analysing
      </span>
    );
  if (state === "INSUFFICIENT_DATA")
    return <span className="sh-match is-unavailable">Needs job skills</span>;
  if (state === "FAILED")
    return (
      <span className="sh-match is-unavailable">Analysis unavailable</span>
    );
  if (application.matchScore == null)
    return <span className="sh-match is-unavailable">No score yet</span>;
  return (
    <span className={cls("sh-match", compact && "is-compact")}>
      <b>{application.matchScore}%</b>
      <small>
        {application.matchSource === "AI" ? "AI match" : "skill match"}
      </small>
    </span>
  );
}

function Brand() {
  return (
    <span className="sh-brand">
      <i>{icon.spark}</i> SmartHire <b>AI</b>
    </span>
  );
}

// Share the primary action across the card without intercepting its controls.
function clickableCard(onOpen, label) {
  return {
    role: "link",
    tabIndex: 0,
    "aria-label": label,
    "data-clickable-card": true,
    onClick: (event) => {
      const control = event.target.closest('button, a, input, select, textarea, label, [role="button"]');
      if (control && control !== event.currentTarget) return;
      if (window.getSelection()?.toString()) return;
      onOpen();
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
  };
}

function JobCard({
  job,
  saved,
  applied,
  aligned = [],
  applicationCount,
  onOpen,
  onToggleSave,
  onApplicants,
}) {
  return (
    <article className="sh-job-card" {...clickableCard(() => onOpen(job), `${applied ? "View application" : "View role"}: ${job.title}`)}>
      <div className="sh-job-card-top">
        <span className="sh-company-mark">{initials(job.companyName)}</span>
        {onToggleSave && (
          <button
            type="button"
            className={cls("sh-save-button", saved && "is-saved")}
            onClick={() => onToggleSave(job.id)}
            aria-label={saved ? "Unsave job" : "Save job"}
          >
            {saved ? icon.bookmarkOn : icon.bookmark}
          </button>
        )}
      </div>
      <p className="sh-company">{job.companyName}</p>
      <h3>{job.title}</h3>
      <div className="sh-job-meta">
        <span>
          {icon.pin} {job.location || "Flexible"}
        </span>
        <span>
          {icon.clock} {pretty(job.workMode)}
        </span>
      </div>
      <div className="sh-job-chip-row">
        <span>{pretty(job.jobType)}</span>
        {aligned.length > 0 && <em>{aligned.length} skills aligned</em>}
        {applicationCount != null && <em>{applicationCount} applicants</em>}
      </div>
      <button
        type="button"
        className="sh-card-link"
        onClick={() => onOpen(job)}
      >
        {onApplicants
          ? "Manage role"
          : applied
            ? "View application"
            : "View role"}{" "}
        <b>{icon.arrow}</b>
      </button>
    </article>
  );
}

function JobDrawer({
  job,
  saved,
  applied,
  aligned,
  onClose,
  onSave,
  onApply,
  onApplications,
}) {
  if (!job) return null;
  const requirements = String(job.requirements || "")
    .split(/[\n,•]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <Dialog onClose={onClose} className="sh-job-drawer">
      <div className="sh-drawer-company">
        <span className="sh-company-mark is-large">
          {initials(job.companyName)}
        </span>
        <div>
          <p>{job.companyName}</p>
          <small>Actively hiring</small>
        </div>
      </div>
      <h2>{job.title}</h2>
      <div className="sh-detail-meta">
        <span>
          {icon.pin} {job.location || "Flexible location"}
        </span>
        <span>{pretty(job.workMode)}</span>
        <span>{job.salaryRange || "Salary not disclosed"}</span>
      </div>
      <div className="sh-drawer-actions">
        <button
          type="button"
          className="sh-primary"
          onClick={() => (applied ? onApplications() : onApply(job))}
        >
          {applied ? "Track application" : "Apply now"} {icon.arrow}
        </button>
        <button
          type="button"
          className={cls("sh-secondary", saved && "is-saved")}
          onClick={() => onSave(job.id)}
        >
          {saved ? "Saved" : "Save job"}
        </button>
      </div>
      {aligned.length > 0 && (
        <div className="sh-alignment">
          <span>{icon.spark}</span>
          <div>
            <b>{aligned.length} profile signals align</b>
            <p>{aligned.slice(0, 5).join(" · ")}</p>
          </div>
        </div>
      )}
      <section>
        <h4>About this role</h4>
        <p>
          {job.description || "The recruiter has not added a description yet."}
        </p>
      </section>
      <section>
        <h4>What they are looking for</h4>
        {requirements.length ? (
          <ul>
            {requirements.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>Requirements will be shared by the recruiter.</p>
        )}
      </section>
      <footer>
        <span>{pretty(job.jobType)}</span>
        <small>Posted {dateText(job.createdAt)}</small>
      </footer>
    </Dialog>
  );
}

function ApplyDialog({ job, resumes, onClose, onApply, sending }) {
  const [resumeId, setResumeId] = useState(resumes[0]?.id || "");
  const [coverLetter, setCoverLetter] = useState("");
  return (
    <Dialog onClose={onClose} className="sh-apply-dialog">
      <p className="sh-eyebrow">APPLICATION</p>
      <h2>Make your first impression count.</h2>
      <p className="sh-dialog-copy">
        Apply to <b>{job.title}</b> at {job.companyName}. Add a brief note to
        give your application context.
      </p>
      <label>
        Choose your resume
        <select
          value={resumeId}
          onChange={(event) => setResumeId(event.target.value)}
        >
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.originalFileName ||
                resume.templateName ||
                "SmartHire resume"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cover letter <small>Optional · up to 3,000 characters</small>
        <textarea
          rows="6"
          maxLength="3000"
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value)}
          placeholder="Why are you a strong fit for this role? Mention your relevant work and interest."
        />
      </label>
      <div className="sh-dialog-actions">
        <button type="button" className="sh-secondary" onClick={onClose}>
          Not now
        </button>
        <button
          type="button"
          className="sh-primary"
          disabled={!resumeId || sending}
          onClick={() => onApply(Number(resumeId), coverLetter)}
        >
          {sending ? "Submitting…" : "Send application"} {icon.arrow}
        </button>
      </div>
    </Dialog>
  );
}

function Explorer({
  jobs,
  skills,
  savedIds,
  applications,
  query,
  onQuery,
  onOpen,
  onSave,
}) {
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [jobType, setJobType] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const applied = new Set(
    applications
      .filter((item) => item.status !== "WITHDRAWN")
      .map((item) => item.jobId),
  );
  const results = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const haystack =
        `${job.title} ${job.companyName} ${job.description} ${job.requirements}`.toLowerCase();
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (!location ||
          String(job.location || "")
            .toLowerCase()
            .includes(location.toLowerCase())) &&
        (!workMode || job.workMode === workMode) &&
        (!jobType || job.jobType === jobType) &&
        (!savedOnly || savedIds.includes(job.id))
      );
    });
    return [...filtered].sort((left, right) =>
      sort === "aligned"
        ? alignedSkills(right, skills).length -
          alignedSkills(left, skills).length
        : new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
    );
  }, [
    jobs,
    query,
    location,
    workMode,
    jobType,
    savedOnly,
    savedIds,
    sort,
    skills,
  ]);
  const clear = () => {
    onQuery("");
    setLocation("");
    setWorkMode("");
    setJobType("");
    setSavedOnly(false);
  };
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">OPPORTUNITY EXPLORER</p>
          <h1>Find a role that moves you forward.</h1>
          <p>
            Search verified live roles and see where your profile has relevant
            signals.
          </p>
        </div>
        <div className="sh-live-count">
          <b>{jobs.length}</b>
          <span>live roles</span>
        </div>
      </section>
      <section className="sh-search-board">
        <div className="sh-main-search">
          <span>{icon.search}</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search role, skill or company"
            aria-label="Search jobs"
          />
        </div>
        <input
          className="sh-location-input"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          aria-label="Filter by location"
        />
        <button type="button" className="sh-primary" onClick={() => {}}>
          Search {icon.arrow}
        </button>
      </section>
      <section className="sh-filter-row">
        <span>Refine</span>
        <select
          value={workMode}
          onChange={(event) => setWorkMode(event.target.value)}
        >
          <option value="">Work mode</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
          <option value="ONSITE">On-site</option>
        </select>
        <select
          value={jobType}
          onChange={(event) => setJobType(event.target.value)}
        >
          <option value="">Job type</option>
          <option value="FULL_TIME">Full time</option>
          <option value="PART_TIME">Part time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="CONTRACT">Contract</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="aligned">Most aligned</option>
        </select>
        <button
          type="button"
          className={cls("sh-filter-button", savedOnly && "is-active")}
          onClick={() => setSavedOnly(!savedOnly)}
        >
          {icon.bookmark} Saved ({savedIds.length})
        </button>
        {(query || location || workMode || jobType || savedOnly) && (
          <button type="button" className="sh-text-button" onClick={clear}>
            Clear all
          </button>
        )}
      </section>
      <div className="sh-result-heading">
        <p>
          <b>{results.length}</b> roles matched your search
        </p>
        <span>Profile signals are informational—not an application score.</span>
      </div>
      {results.length ? (
        <section className="sh-jobs-grid">
          {results.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={savedIds.includes(job.id)}
              applied={applied.has(job.id)}
              aligned={alignedSkills(job, skills)}
              onOpen={onOpen}
              onToggleSave={onSave}
            />
          ))}
        </section>
      ) : (
        <Empty
          title="No roles matched this search"
          detail="Try a broader skill, location, or clear your filters."
          action={
            <button type="button" className="sh-secondary" onClick={clear}>
              Clear filters
            </button>
          }
        />
      )}
    </>
  );
}

function Empty({ title, detail, action }) {
  return (
    <div className="sh-empty">
      <span>{icon.spark}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}

function CandidateHome({
  user,
  profile,
  jobs,
  applications,
  savedIds,
  skills,
  onTab,
  onOpen,
  onSave,
}) {
  const activeApps = applications.filter((item) => item.status !== "WITHDRAWN");
  const profileFields = [
    "phone",
    "location",
    "bio",
    "linkedinUrl",
    "githubUrl",
    "portfolioUrl",
  ];
  const strength = Math.round(
    (profileFields.filter((field) => profile?.[field]).length /
      profileFields.length) *
      100,
  );
  const recommended = jobs
    .filter((job) => !activeApps.some((app) => app.jobId === job.id))
    .sort(
      (a, b) =>
        alignedSkills(b, skills).length - alignedSkills(a, skills).length,
    )
    .slice(0, 3);
  const reviewing = activeApps.filter((item) =>
    ["REVIEWING", "SHORTLISTED"].includes(item.status),
  ).length;
  return (
    <>
      <section className="sh-welcome">
        <div>
          <p className="sh-eyebrow">CAREER COMMAND CENTER</p>
          <h1>Good to see you, {user.name?.split(" ")[0] || "there"}.</h1>
          <p>Build momentum with one focused home for your job search.</p>
        </div>
        <button
          type="button"
          className="sh-primary"
          onClick={() => onTab("jobs")}
        >
          Explore jobs {icon.arrow}
        </button>
      </section>
      <section className="sh-candidate-hero">
        <div>
          <span className="sh-hero-chip">{icon.spark} Your career radar</span>
          <h2>
            Make every application
            <br />
            feel intentional.
          </h2>
          <p>
            {strength < 70
              ? "Complete your profile and resume to unlock stronger role signals."
              : "Your profile is ready. Find roles where your work can stand out."}
          </p>
          <button
            type="button"
            className="sh-light-button"
            onClick={() => onTab(strength < 70 ? "profile" : "jobs")}
          >
            {strength < 70 ? "Complete profile" : "Find your next role"}{" "}
            {icon.arrow}
          </button>
        </div>
        <div className="sh-profile-orbit">
          <strong>{strength}%</strong>
          <span>profile ready</span>
        </div>
      </section>
      <section className="sh-metric-grid">
        <Metric
          icon="⌕"
          value={jobs.length}
          label="Live opportunities"
          action="Explore"
          onClick={() => onTab("jobs")}
        />
        <Metric
          icon="▣"
          value={activeApps.length}
          label="Applications active"
          action="Track"
          onClick={() => onTab("applications")}
        />
        <Metric
          icon="◉"
          value={reviewing}
          label="In recruiter review"
          action="See status"
          onClick={() => onTab("applications")}
        />
        <Metric
          icon="♡"
          value={savedIds.length}
          label="Roles saved"
          action="View"
          onClick={() => onTab("jobs")}
        />
      </section>
      <section className="sh-section-title">
        <div>
          <p className="sh-eyebrow">FOR YOU</p>
          <h2>Worth a closer look</h2>
        </div>
        <button
          type="button"
          className="sh-text-button"
          onClick={() => onTab("jobs")}
        >
          See all roles {icon.arrow}
        </button>
      </section>
      {recommended.length ? (
        <section className="sh-jobs-grid sh-jobs-grid-small">
          {recommended.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={savedIds.includes(job.id)}
              aligned={alignedSkills(job, skills)}
              onOpen={onOpen}
              onToggleSave={onSave}
            />
          ))}
        </section>
      ) : (
        <Empty
          title="Your role feed is warming up"
          detail="Add more profile details or browse every active opportunity."
          action={
            <button
              type="button"
              className="sh-secondary"
              onClick={() => onTab("jobs")}
            >
              Browse roles
            </button>
          }
        />
      )}
    </>
  );
}

function Metric({ icon: iconValue, value, label, action, onClick }) {
  return (
    <article className="sh-metric" {...clickableCard(onClick, `${action}: ${label}`)}>
      <span>{iconValue}</span>
      <div>
        <b>{value}</b>
        <p>{label}</p>
      </div>
      <button type="button" onClick={onClick}>
        {action} {icon.arrow}
      </button>
    </article>
  );
}

function CandidateApplications({
  applications,
  jobs,
  resumes,
  onRemove,
  hiddenApplicationIds,
  onOpen,
}) {
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const resumesById = new Map(resumes.map((resume) => [resume.id, resume]));
  const visible = applications.filter(
    (item) =>
      item.status !== "WITHDRAWN" && !hiddenApplicationIds.includes(item.id),
  );
  const counts = ["APPLIED", "REVIEWING", "SHORTLISTED", "HIRED"].map(
    (status) => [
      status,
      visible.filter((item) => item.status === status).length,
    ],
  );
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">APPLICATION CENTER</p>
          <h1>Every opportunity, clearly tracked.</h1>
          <p>
            Follow each stage and see when a recruiter moves your application
            forward.
          </p>
        </div>
      </section>
      <section className="sh-status-summary">
        {counts.map(([status, count]) => (
          <article key={status}>
            <Status value={status} />
            <b>{count}</b>
            <span>{pretty(status)}</span>
          </article>
        ))}
      </section>
      {visible.length ? (
        <section className="sh-application-list">
          {visible.map((application) => {
            const job = jobsById.get(application.jobId);
            const resume = resumesById.get(application.resumeId);
            const canWithdraw = !["HIRED", "WITHDRAWN"].includes(
              application.status,
            );
            return (
              <article className="sh-application-card" key={application.id} {...(job ? clickableCard(() => onOpen(job), `View role: ${job.title}`) : {})}>
                <div className="sh-application-main">
                  <span className="sh-company-mark">
                    {initials(job?.companyName)}
                  </span>
                  <div>
                    <p>{job?.companyName || "SmartHire opportunity"}</p>
                    <h3>{job?.title || `Role #${application.jobId}`}</h3>
                    <small>
                      Applied {dateText(application.appliedAt)} ·{" "}
                      {resume?.originalFileName || "Selected resume"}
                    </small>
                  </div>
                </div>
                <div className="sh-application-state">
                  <Status value={application.status} />
                  <MatchState application={application} />
                </div>
                <div className="sh-application-bottom">
                  <p>
                    {application.matchReasoning ||
                      "Your match analysis is being prepared."}
                  </p>
                  {application.coverLetter && (
                    <span>Cover letter included</span>
                  )}
                  {canWithdraw && (
                    <button
                      type="button"
                      className="sh-danger-link"
                      onClick={() => onRemove(application.id)}
                    >
                      Remove application
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <Empty
          title="No applications yet"
          detail="Browse live roles and send an application when you find a good fit."
        />
      )}
    </>
  );
}

function ResumeHub({ resumes, onUpload, onGenerate, working }) {
  const [draft, setDraft] = useState(blankResumeDraft);
  const [mode, setMode] = useState("upload");
  const update = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const drop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">RESUME STUDIO</p>
          <h1>Bring your best work forward.</h1>
          <p>
            Upload a PDF for skill extraction or generate a clean ATS-friendly
            starting point.
          </p>
        </div>
      </section>
      <div className="sh-tab-switch">
        <button
          type="button"
          className={mode === "upload" ? "is-active" : ""}
          onClick={() => setMode("upload")}
        >
          Upload a PDF
        </button>
        <button
          type="button"
          className={mode === "build" ? "is-active" : ""}
          onClick={() => setMode("build")}
        >
          Build a resume
        </button>
      </div>
      {mode === "upload" ? (
        <section className="sh-upload-panel">
          <div>
            <span>{icon.upload}</span>
            <h2>Drop your resume here</h2>
            <p>
              PDF only, up to 5 MB. SmartHire extracts skills and prepares it
              for applications.
            </p>
            <ul>
              <li>Private to your applications</li>
              <li>Skill extraction included</li>
              <li>Ready to apply immediately</li>
            </ul>
          </div>
          <label
            className="sh-drop-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={drop}
          >
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = "";
              }}
            />
            <b>{working ? "Uploading…" : "Choose PDF"}</b>
            <small>or drag and drop it here</small>
          </label>
        </section>
      ) : (
        <form
          className="sh-resume-builder"
          onSubmit={(event) => {
            event.preventDefault();
            onGenerate(draft);
          }}
        >
          <div>
            <p className="sh-eyebrow">RESUME BUILDER</p>
            <h2>Create your ATS-ready draft</h2>
            <p>
              Use concise, specific experience to get a stronger first draft.
            </p>
          </div>
          <label>
            Target role
            <input
              required
              value={draft.targetRole}
              onChange={(event) => update("targetRole", event.target.value)}
              placeholder="e.g. Backend Developer"
            />
          </label>
          <label>
            Skills
            <input
              required
              value={draft.skills}
              onChange={(event) => update("skills", event.target.value)}
              placeholder="Java, Spring Boot, PostgreSQL"
            />
          </label>
          <label>
            Experience
            <textarea
              required
              rows="5"
              value={draft.experience}
              onChange={(event) => update("experience", event.target.value)}
              placeholder="Role, company, achievements and dates"
            />
          </label>
          <label>
            Education
            <textarea
              rows="3"
              value={draft.education}
              onChange={(event) => update("education", event.target.value)}
              placeholder="Degree, institute, year"
            />
          </label>
          <button type="submit" className="sh-primary" disabled={working}>
            {working ? "Creating…" : "Generate resume"} {icon.spark}
          </button>
        </form>
      )}
      <section className="sh-section-title">
        <div>
          <p className="sh-eyebrow">YOUR TOOLKIT</p>
          <h2>
            {resumes.length
              ? `${resumes.length} resume${resumes.length > 1 ? "s" : ""} ready`
              : "No resumes yet"}
          </h2>
        </div>
      </section>
      {resumes.length ? (
        <section className="sh-resume-list">
          {resumes.map((resume) => (
            <article key={resume.id}>
              <span>
                {resume.sourceType === "GENERATED" ? icon.spark : "PDF"}
              </span>
              <div>
                <h3>
                  {resume.originalFileName ||
                    resume.templateName ||
                    "SmartHire resume"}
                </h3>
                <small>Added {dateText(resume.uploadedAt)}</small>
                <p>
                  {resume.aiSummary || "Ready to use in your applications."}
                </p>
              </div>
              <em
                className={
                  resume.analysisStatus === "PROCESSING" ? "is-pending" : ""
                }
              >
                {resume.analysisStatus === "PROCESSING" ? "Analysing" : "Ready"}
              </em>
            </article>
          ))}
        </section>
      ) : (
        <Empty
          title="Your resume toolkit starts here"
          detail="Upload your current resume or build an ATS-friendly draft."
        />
      )}
    </>
  );
}

function CandidateProfile({ profile, setProfile, saving, onSave, user }) {
  const hasSavedProfile = Boolean(
    profile.phone ||
    profile.location ||
    profile.headline ||
    profile.experienceYears ||
    profile.skills ||
    profile.education ||
    profile.bio ||
    profile.linkedinUrl ||
    profile.githubUrl ||
    profile.portfolioUrl,
  );
  const [mode, setMode] = useState(hasSavedProfile ? "view" : "edit");
  const update = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  const links = [
    ["LinkedIn", profile.linkedinUrl],
    ["GitHub", profile.githubUrl],
    ["Portfolio", profile.portfolioUrl],
  ].filter(([, url]) => url);
  const submitProfile = async (event) => {
    event.preventDefault();
    if (await onSave()) setMode("view");
  };

  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">CANDIDATE PROFILE</p>
          <h1>Your professional identity, in one place.</h1>
          <p>
            Review exactly what recruiters can see after you apply, then update
            it whenever your story changes.
          </p>
        </div>
      </section>
      <div className="sh-profile-mode">
        <div>
          <b>
            {mode === "view"
              ? "Saved profile preview"
              : "Edit your saved details"}
          </b>
          <span>
            {hasSavedProfile
              ? "Your latest saved information is shown below."
              : "Add a few details so recruiters get the right context."}
          </span>
        </div>
        <div className="sh-tab-switch">
          <button
            type="button"
            className={mode === "view" ? "is-active" : ""}
            onClick={() => setMode("view")}
          >
            Preview
          </button>
          <button
            type="button"
            className={mode === "edit" ? "is-active" : ""}
            onClick={() => setMode("edit")}
          >
            Edit profile
          </button>
        </div>
      </div>
      {mode === "view" ? (
        <section className="sh-profile-preview">
          <div className="sh-profile-preview-head">
            <span>{initials(user?.name || "Candidate")}</span>
            <div>
              <p>{user?.name || "Your profile"}</p>
              <small>{user?.email || "Candidate account"}</small>
            </div>
            <button
              type="button"
              className="sh-secondary"
              onClick={() => setMode("edit")}
            >
              Edit profile {icon.arrow}
            </button>
          </div>
          {hasSavedProfile ? (
            <div className="sh-profile-preview-grid">
              <article>
                <small>CONTACT</small>
                <b>{profile.phone || "Phone not added"}</b>
                <span>{profile.location || "Location not added"}</span>
              </article>
              <article>
                <small>ABOUT YOU</small>
                <p>
                  {profile.bio ||
                    "Add a concise professional summary so recruiters understand your strengths."}
                </p>
              </article>
              <article>
                <small>PROFESSIONAL DETAILS</small>
                <b>{profile.headline || "Professional headline not added"}</b>
                <span>
                  {profile.experienceYears !== "" &&
                  profile.experienceYears != null
                    ? `${profile.experienceYears} years experience`
                    : "Experience not added"}
                </span>
              </article>
              <article>
                <small>SKILLS & EDUCATION</small>
                <p>{profile.skills || "Add the skills you use most."}</p>
                {profile.education && <span>{profile.education}</span>}
              </article>
              <article>
                <small>WORK PREFERENCE</small>
                <b>{profile.preferredWorkMode || "Preference not added"}</b>
                <span>{profile.gender || "Personal details not added"}</span>
              </article>
              <article>
                <small>PROFESSIONAL LINKS</small>
                {links.length ? (
                  <div className="sh-profile-links">
                    {links.map(([label, url]) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {label} {icon.arrow}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p>
                    Add LinkedIn, GitHub, or a portfolio to strengthen your
                    profile.
                  </p>
                )}
              </article>
            </div>
          ) : (
            <div className="sh-profile-empty">
              <span>{icon.spark}</span>
              <div>
                <b>Your profile is ready for its first details.</b>
                <p>
                  Add a phone number, location, introduction and links. You
                  control what is shown to recruiters you apply to.
                </p>
              </div>
              <button
                type="button"
                className="sh-primary"
                onClick={() => setMode("edit")}
              >
                Complete profile {icon.arrow}
              </button>
            </div>
          )}
        </section>
      ) : (
        <form className="sh-form-card" onSubmit={submitProfile}>
          <div className="sh-form-section">
            <h2>Contact details</h2>
            <div className="sh-two-column">
              <label>
                Phone number
                <input
                  required
                  value={profile.phone || ""}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="e.g. 98765 43210"
                />
              </label>
              <label>
                Current location
                <input
                  required
                  value={profile.location || ""}
                  onChange={(event) => update("location", event.target.value)}
                  placeholder="e.g. Bengaluru, India"
                />
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={profile.dateOfBirth || ""}
                  onChange={(event) => update("dateOfBirth", event.target.value)}
                />
              </label>
              <label>
                Gender
                <select
                  value={profile.gender || ""}
                  onChange={(event) => update("gender", event.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Prefer to self-describe</option>
                </select>
              </label>
            </div>
          </div>
          <div className="sh-form-section">
            <h2>Professional details</h2>
            <div className="sh-two-column">
              <label>
                Professional headline
                <input
                  required
                  value={profile.headline || ""}
                  onChange={(event) => update("headline", event.target.value)}
                  placeholder="e.g. Software Developer"
                />
              </label>
              <label>
                Years of experience
                <input
                  type="number"
                  required
                  min="0"
                  max="60"
                  value={profile.experienceYears ?? ""}
                  onChange={(event) =>
                    update(
                      "experienceYears",
                      event.target.value === "" ? "" : Number(event.target.value),
                    )
                  }
                  placeholder="e.g. 2"
                />
              </label>
              <label>
                Key skills
                <input
                  required
                  value={profile.skills || ""}
                  onChange={(event) => update("skills", event.target.value)}
                  placeholder="e.g. Java, React, SQL"
                />
              </label>
              <label>
                Preferred work mode
                <select
                  value={profile.preferredWorkMode || ""}
                  onChange={(event) =>
                    update("preferredWorkMode", event.target.value)
                  }
                >
                  <option value="">Select preference</option>
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                  <option>Open to all</option>
                </select>
              </label>
            </div>
            <label>
              Education
              <textarea
                required
                rows="3"
                value={profile.education || ""}
                onChange={(event) => update("education", event.target.value)}
                placeholder="e.g. B.Tech in Computer Science, AKTU, 2025"
              />
            </label>
          </div>
          <div className="sh-form-section">
            <h2>Your professional story</h2>
            <label>
              About you
              <textarea
                required
                rows="5"
                value={profile.bio || ""}
                onChange={(event) => update("bio", event.target.value)}
                placeholder="Your strengths, interests and the kind of work you want to do."
              />
            </label>
          </div>
          <div className="sh-form-section">
            <h2>Professional links</h2>
            <div className="sh-two-column">
              <label>
                LinkedIn
                <input
                  type="url"
                  value={profile.linkedinUrl || ""}
                  onChange={(event) =>
                    update("linkedinUrl", event.target.value)
                  }
                  placeholder="https://linkedin.com/in/you"
                />
              </label>
              <label>
                GitHub
                <input
                  type="url"
                  value={profile.githubUrl || ""}
                  onChange={(event) => update("githubUrl", event.target.value)}
                  placeholder="https://github.com/you"
                />
              </label>
              <label>
                Portfolio
                <input
                  type="url"
                  value={profile.portfolioUrl || ""}
                  onChange={(event) =>
                    update("portfolioUrl", event.target.value)
                  }
                  placeholder="https://yourportfolio.com"
                />
              </label>
            </div>
          </div>
          <div className="sh-form-footer">
            <p>
              Your profile becomes visible only to a recruiter you apply to.
            </p>
            <button type="submit" className="sh-primary" disabled={saving}>
              {saving ? "Saving…" : "Save profile"} {icon.arrow}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function JobComposer({ job, onCancel, onSave, saving }) {
  const [draft, setDraft] = useState(job || blankJob);
  const update = (field, value) =>
    setDraft((current) => ({ ...current, [field]: value }));
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">
            {job?.id ? "EDIT ROLE" : "CREATE OPPORTUNITY"}
          </p>
          <h1>
            {job?.id
              ? "Make this role clearer."
              : "Write a role candidates want."}
          </h1>
          <p>
            Concrete responsibilities and skills give candidates—and
            matching—better context.
          </p>
        </div>
      </section>
      <form
        className="sh-form-card sh-job-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <div className="sh-two-column">
          <label>
            Job title
            <input
              required
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="e.g. Frontend Engineer"
            />
          </label>
          <label>
            Company name
            <input
              required
              value={draft.companyName}
              onChange={(event) => update("companyName", event.target.value)}
              placeholder="Your company"
            />
          </label>
          <label>
            Location
            <input
              value={draft.location}
              onChange={(event) => update("location", event.target.value)}
              placeholder="e.g. Remote / Delhi"
            />
          </label>
          <label>
            Salary range
            <input
              value={draft.salaryRange}
              onChange={(event) => update("salaryRange", event.target.value)}
              placeholder="e.g. ₹8–12 LPA"
            />
          </label>
          <label>
            Work mode
            <select
              value={draft.workMode}
              onChange={(event) => update("workMode", event.target.value)}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-site</option>
            </select>
          </label>
          <label>
            Job type
            <select
              value={draft.jobType}
              onChange={(event) => update("jobType", event.target.value)}
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </label>
        </div>
        <label>
          Role description
          <textarea
            required
            rows="7"
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Describe impact, responsibilities, team and what success looks like."
          />
        </label>
        <label>
          Skills and requirements{" "}
          <small>Use concrete skills for a trustworthy match score.</small>
          <textarea
            rows="5"
            value={draft.requirements}
            onChange={(event) => update("requirements", event.target.value)}
            placeholder="e.g. React, TypeScript, REST APIs, 2+ years building production interfaces"
          />
        </label>
        <div className="sh-form-footer">
          <button type="button" className="sh-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="sh-primary" disabled={saving}>
            {saving ? "Saving…" : job?.id ? "Save changes" : "Publish role"}{" "}
            {icon.arrow}
          </button>
        </div>
      </form>
    </>
  );
}

function RecruiterHome({ profile, jobs, applications, onTab }) {
  const active = jobs.filter((job) => job.active).length;
  const reviewing = applications.filter((item) =>
    ["APPLIED", "REVIEWING"].includes(item.status),
  ).length;
  const shortlisted = applications.filter(
    (item) => item.status === "SHORTLISTED",
  ).length;
  return (
    <>
      <section className="sh-welcome">
        <div>
          <p className="sh-eyebrow">HIRING COMMAND CENTER</p>
          <h1>Build a hiring process candidates trust.</h1>
          <p>Review talent, move your pipeline, and keep every role clear.</p>
        </div>
        <button
          type="button"
          className="sh-primary"
          onClick={() => onTab("post")}
        >
          Post a job +
        </button>
      </section>
      <section className="sh-recruiter-hero">
        <div>
          <p className="sh-eyebrow">YOUR HIRING PULSE</p>
          <h2>
            {reviewing
              ? `${reviewing} candidates need attention.`
              : "Your candidate pipeline is ready."}
          </h2>
          <p>
            {profile.companyName
              ? `Hiring for ${profile.companyName}.`
              : "Complete your company profile to build more candidate trust."}
          </p>
          <button
            type="button"
            className="sh-light-button"
            onClick={() => onTab(reviewing ? "applicants" : "post")}
          >
            {reviewing ? "Review applicants" : "Post your first role"}{" "}
            {icon.arrow}
          </button>
        </div>
        <div className="sh-funnel-mini">
          <span>
            Applied
            <b>
              {applications.filter((item) => item.status === "APPLIED").length}
            </b>
          </span>
          <span>
            Reviewing
            <b>
              {
                applications.filter((item) => item.status === "REVIEWING")
                  .length
              }
            </b>
          </span>
          <span>
            Shortlisted<b>{shortlisted}</b>
          </span>
        </div>
      </section>
      <section className="sh-metric-grid">
        <Metric
          icon="▣"
          value={active}
          label="Active roles"
          action="Manage"
          onClick={() => onTab("jobs")}
        />
        <Metric
          icon="◉"
          value={applications.length}
          label="Total applicants"
          action="Review"
          onClick={() => onTab("applicants")}
        />
        <Metric
          icon="↗"
          value={shortlisted}
          label="Shortlisted"
          action="View"
          onClick={() => onTab("applicants")}
        />
        <Metric
          icon="✦"
          value={profile.companyName ? "Ready" : "Draft"}
          label="Company profile"
          action="Complete"
          onClick={() => onTab("profile")}
        />
      </section>
    </>
  );
}

function RecruiterJobs({ jobs, applications, onEdit, onClose, onApplicants }) {
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">JOB MANAGEMENT</p>
          <h1>Make every role easy to manage.</h1>
          <p>
            Edit a live role, close it when hiring is complete, or jump directly
            into its applicant pipeline.
          </p>
        </div>
      </section>
      {jobs.length ? (
        <section className="sh-recruiter-job-list">
          {jobs.map((job) => {
            const count = applications.filter(
              (application) =>
                application.jobId === job.id &&
                application.status !== "WITHDRAWN",
            ).length;
            return (
              <article key={job.id} {...clickableCard(() => onApplicants(job.id), `View applicants: ${job.title}`)}>
                <div>
                  <span className="sh-company-mark">
                    {initials(job.companyName)}
                  </span>
                  <section>
                    <p>
                      {job.companyName} · {job.active ? "Live" : "Closed"}
                    </p>
                    <h3>{job.title}</h3>
                    <small>
                      {job.location || "Flexible"} · {pretty(job.workMode)} ·
                      Posted {dateText(job.createdAt)}
                    </small>
                  </section>
                </div>
                <div className="sh-job-actions">
                  <span>
                    {count} applicant{count === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className="sh-secondary"
                    onClick={() => onApplicants(job.id)}
                  >
                    Applicants
                  </button>
                  <button
                    type="button"
                    className="sh-text-button"
                    onClick={() => onEdit(job)}
                  >
                    Edit
                  </button>
                  {job.active && (
                    <button
                      type="button"
                      className="sh-danger-link"
                      onClick={() => onClose(job)}
                    >
                      Close role
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <Empty
          title="No roles posted yet"
          detail="Create a clear role to start receiving candidates."
        />
      )}
    </>
  );
}

function ApplicantDialog({ review, onClose, onRefresh }) {
  const { application, content, loading } = review;
  const strengths = skillsFrom(application.strengths);
  const missing = skillsFrom(application.missingSkills);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const openPdf = async () => {
    setOpeningPdf(true);
    setPdfError("");
    try {
      const url = await getApplicationResumeFile(application.id);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setPdfError(error.message || "Unable to open this resume PDF.");
    } finally {
      setOpeningPdf(false);
    }
  };
  return (
    <Dialog onClose={onClose} className="sh-candidate-dialog">
      <p className="sh-eyebrow">CANDIDATE REVIEW</p>
      <div className="sh-candidate-heading">
        <span className="sh-company-mark is-large">
          {initials(application.candidateName)}
        </span>
        <div>
          <h2>{application.candidateName || "Candidate"}</h2>
          <p>
            {application.candidateEmail}
            {application.candidateLocation
              ? ` · ${application.candidateLocation}`
              : ""}
          </p>
        </div>
        <Status value={application.status} />
      </div>
      <div className="sh-candidate-detail-grid">
        <section>
          <h4>Profile</h4>
          <p>
            {application.candidateBio || "No professional summary added yet."}
          </p>
          {application.candidatePhone && (
            <p>
              <b>Phone:</b> {application.candidatePhone}
            </p>
          )}
          <h4>Match insight</h4>
          <MatchState application={application} />
          <p>
            {application.matchReasoning ||
              "The match analysis is still being prepared."}
          </p>
          {strengths.length > 0 && (
            <div className="sh-skill-tags">
              {strengths.map((skill) => (
                <span className="is-positive" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          )}
          {missing.length > 0 && (
            <div className="sh-skill-tags">
              {missing.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          )}
          <button type="button" className="sh-secondary" onClick={onRefresh}>
            {icon.refresh} Recalculate match
          </button>
          {application.coverLetter && (
            <>
              <h4>Cover letter</h4>
              <p className="sh-cover-letter">{application.coverLetter}</p>
            </>
          )}
        </section>
        <section>
          <h4>Submitted resume</h4>
          <p className="sh-resume-name">
            {application.resumeFileName || "Selected resume"}
          </p>
          {application.resumeSourceType !== "GENERATED" && (
            <button
              type="button"
              className="sh-secondary"
              onClick={openPdf}
              disabled={openingPdf}
            >
              {openingPdf ? "Opening PDF..." : "Open resume PDF"} {icon.arrow}
            </button>
          )}
          {pdfError && <p className="sh-resume-error">{pdfError}</p>}
          {loading ? (
            <p className="sh-resume-loading">
              <i /> Loading resume…
            </p>
          ) : (
            <pre>{content || "Resume text is not available."}</pre>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function RecruiterPipeline({
  jobs,
  applications,
  selectedJobId,
  onSelectedJob,
  onUpdate,
  onRecalculate,
  updating,
}) {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [review, setReview] = useState(null);
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const visible = applications.filter(
    (application) =>
      (!selectedJobId || application.jobId === Number(selectedJobId)) &&
      (!status || application.status === status) &&
      (!query ||
        `${application.candidateName} ${application.candidateEmail}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  async function open(application) {
    setReview({ application, loading: true, content: "" });
    try {
      setReview({
        application,
        loading: false,
        content: await getApplicationResumeContent(application.id),
      });
    } catch {
      setReview({ application, loading: false, content: "" });
    }
  }
  async function refreshMatch() {
    if (!review) return;
    const updated = await onRecalculate(review.application.id);
    setReview((current) => ({ ...current, application: updated }));
  }
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">APPLICANT PIPELINE</p>
          <h1>From application to a confident decision.</h1>
          <p>
            Filter by role or stage, review evidence, and move candidates
            through the pipeline.
          </p>
        </div>
      </section>
      <section className="sh-pipeline-stats">
        <Metric
          icon="◉"
          value={applications.length}
          label="Total applicants"
          action=""
          onClick={() => {}}
        />
        <Metric
          icon="✦"
          value={
            applications.filter((item) => item.status === "APPLIED").length
          }
          label="New applications"
          action=""
          onClick={() => {}}
        />
        <Metric
          icon="↗"
          value={
            applications.filter((item) => item.status === "SHORTLISTED").length
          }
          label="Shortlisted"
          action=""
          onClick={() => {}}
        />
      </section>
      <section className="sh-pipeline-filters">
        <select
          value={selectedJobId || ""}
          onChange={(event) => onSelectedJob(event.target.value)}
        >
          <option value="">All roles</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} · {job.companyName}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All stages</option>
          {[
            "APPLIED",
            "REVIEWING",
            "SHORTLISTED",
            "REJECTED",
            "HIRED",
            "WITHDRAWN",
          ].map((item) => (
            <option key={item} value={item}>
              {pretty(item)}
            </option>
          ))}
        </select>
        <label>
          <span>{icon.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search candidate"
          />
        </label>
        <b>
          {visible.length} candidate{visible.length === 1 ? "" : "s"}
        </b>
      </section>
      {visible.length ? (
        <section className="sh-applicant-list">
          {visible.map((application) => {
            const job = jobById.get(application.jobId);
            const locked = application.status === "WITHDRAWN";
            return (
              <article key={application.id} {...clickableCard(() => open(application), `View profile and resume: ${application.candidateName || "Candidate"}`)}>
                <div className="sh-applicant-person">
                  <span className="sh-company-mark">
                    {initials(application.candidateName)}
                  </span>
                  <div>
                    <p>{application.candidateName || "Candidate"}</p>
                    <h3>{job?.title || "Role"}</h3>
                    <small>
                      {application.candidateEmail} · Applied{" "}
                      {dateText(application.appliedAt)}
                    </small>
                  </div>
                </div>
                <MatchState application={application} />
                <div className="sh-applicant-actions">
                  <button
                    type="button"
                    className="sh-secondary"
                    onClick={() => open(application)}
                  >
                    View profile & resume
                  </button>
                  <label>
                    Stage
                    <select
                      value={application.status}
                      disabled={locked || updating === application.id}
                      onChange={(event) =>
                        onUpdate(application.id, event.target.value)
                      }
                    >
                      {[
                        "APPLIED",
                        "REVIEWING",
                        "SHORTLISTED",
                        "REJECTED",
                        "HIRED",
                        "WITHDRAWN",
                      ].map((item) => (
                        <option key={item} value={item}>
                          {pretty(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <Empty
          title="No candidates in this view"
          detail="Change the filters or publish a role to begin receiving applications."
        />
      )}
      {review && (
        <ApplicantDialog
          review={review}
          onClose={() => setReview(null)}
          onRefresh={refreshMatch}
        />
      )}
    </>
  );
}

function RecruiterProfile({ profile, setProfile, onSave, saving }) {
  const update = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  return (
    <>
      <section className="sh-page-hero">
        <div>
          <p className="sh-eyebrow">COMPANY PROFILE</p>
          <h1>Give candidates a reason to join.</h1>
          <p>A clear company story helps the right people choose your role.</p>
        </div>
      </section>
      <form
        className="sh-form-card"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="sh-form-section">
          <h2>Company essentials</h2>
          <div className="sh-two-column">
            <label>
              Company name
              <input
                value={profile.companyName || ""}
                onChange={(event) => update("companyName", event.target.value)}
              />
            </label>
            <label>
              Company website
              <input
                type="url"
                value={profile.companyWebsite || ""}
                onChange={(event) =>
                  update("companyWebsite", event.target.value)
                }
                placeholder="https://company.com"
              />
            </label>
            <label>
              Your designation
              <input
                value={profile.designation || ""}
                onChange={(event) => update("designation", event.target.value)}
                placeholder="e.g. Talent Partner"
              />
            </label>
          </div>
        </div>
        <div className="sh-form-section">
          <h2>Why join your team?</h2>
          <label>
            Company description
            <textarea
              rows="7"
              value={profile.companyDescription || ""}
              onChange={(event) =>
                update("companyDescription", event.target.value)
              }
              placeholder="Share mission, culture, team, and the impact candidates can expect."
            />
          </label>
        </div>
        <div className="sh-form-footer">
          <p>A strong profile builds candidate trust.</p>
          <button type="submit" className="sh-primary" disabled={saving}>
            {saving ? "Saving…" : "Save company profile"} {icon.arrow}
          </button>
        </div>
      </form>
    </>
  );
}

export default function EnhancedDashboard({ user, onLogout }) {
  const recruiter = user.role === "RECRUITER";
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(
    recruiter ? blankRecruiter : blankCandidate,
  );
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedIds, setSavedIds] = useState(() => savedFor(user));
  const [hiddenApplicationIds, setHiddenApplicationIds] = useState(() =>
    hiddenApplicationsFor(user),
  );
  const [query, setQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [pipelineJobId, setPipelineJobId] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const skills = useMemo(
    () => profileSkills(profile, resumes),
    [profile, resumes],
  );
  const appliedIds = useMemo(
    () =>
      new Set(
        applications
          .filter((item) => item.status !== "WITHDRAWN")
          .map((item) => item.jobId),
      ),
    [applications],
  );
  const nav = recruiter ? recruiterNav : candidateNav;
  const announce = (text, type = "success") => setToast({ text, type });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user), JSON.stringify(savedIds));
    } catch {
      /* Local saving remains optional. */
    }
  }, [savedIds, user]);
  useEffect(() => {
    try {
      localStorage.setItem(
        hiddenApplicationsKey(user),
        JSON.stringify(hiddenApplicationIds),
      );
    } catch {
      /* Local removal remains available for this browser session. */
    }
  }, [hiddenApplicationIds, user]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const requests = recruiter
        ? [getRecruiterProfile(), listMyJobs(), listRecruiterApplications()]
        : [
            getCandidateProfile(),
            listJobs(),
            listMyResumes(),
            listMyApplications(),
          ];
      const result = await Promise.allSettled(requests);
      if (cancelled) return;
      const value = (index, fallback) =>
        result[index]?.status === "fulfilled" ? result[index].value : fallback;
      setProfile(
        value(0, recruiter ? blankRecruiter : blankCandidate) ||
          (recruiter ? blankRecruiter : blankCandidate),
      );
      setJobs(Array.isArray(value(1, [])) ? value(1, []) : []);
      if (recruiter)
        setApplications(Array.isArray(value(2, [])) ? value(2, []) : []);
      else {
        setResumes(Array.isArray(value(2, [])) ? value(2, []) : []);
        setApplications(Array.isArray(value(3, [])) ? value(3, []) : []);
      }
      const failed = result.find((item) => item.status === "rejected");
      if (failed)
        announce(
          failed.reason?.message || "Some workspace data could not be loaded.",
          "error",
        );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [recruiter, user.id, user.userId, refreshTick]);

  useEffect(() => {
    const unsettled = applications.some(
      (application) =>
        ["PENDING", "PROCESSING"].includes(application.matchAnalysisStatus) ||
        (!application.matchAnalysisStatus && application.matchScore == null),
    );
    if (!recruiter && unsettled) {
      const timer = window.setTimeout(
        () => setRefreshTick((current) => current + 1),
        6500,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [applications, recruiter]);

  const saveToggle = (id) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [id, ...current],
    );
  const openJob = (job) => {
    if (appliedIds.has(job.id)) {
      setTab("applications");
      return;
    }
    setSelectedJob(job);
  };
  const saveProfile = async () => {
    setWorking("profile");
    try {
      const payload = recruiter
        ? {
            companyName: profile.companyName || "",
            companyWebsite: profile.companyWebsite || "",
            designation: profile.designation || "",
            companyDescription: profile.companyDescription || "",
          }
        : {
            phone: profile.phone || "",
            location: profile.location || "",
            headline: profile.headline || "",
            experienceYears:
              profile.experienceYears === "" ? null : profile.experienceYears,
            skills: profile.skills || "",
            education: profile.education || "",
            dateOfBirth: profile.dateOfBirth || "",
            gender: profile.gender || "",
            preferredWorkMode: profile.preferredWorkMode || "",
            linkedinUrl: profile.linkedinUrl || "",
            githubUrl: profile.githubUrl || "",
            portfolioUrl: profile.portfolioUrl || "",
            bio: profile.bio || "",
          };
      setProfile(
        await (recruiter
          ? saveRecruiterProfile(payload)
          : saveCandidateProfile(payload)),
      );
      announce("Profile saved. Your workspace is up to date.");
      return true;
    } catch (error) {
      announce(error.message, "error");
      return false;
    } finally {
      setWorking("");
    }
  };
  const upload = async (file) => {
    if (!file || file.size > 5 * 1024 * 1024)
      return announce("Choose a PDF smaller than 5 MB.", "error");
    setWorking("resume");
    try {
      const created = await uploadResume(file);
      setResumes((current) => [created, ...current]);
      announce("Resume uploaded. Skill analysis is starting.");
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const generate = async (draft) => {
    setWorking("resume");
    try {
      const created = await generateResume(draft);
      setResumes((current) => [created, ...current]);
      announce("Your resume draft is ready to use.");
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const submit = async (resumeId, coverLetter) => {
    if (!applyJob) return;
    setWorking("apply");
    try {
      const created = await applyToJob({
        jobId: applyJob.id,
        resumeId,
        coverLetter,
      });
      setApplications((current) => [created, ...current]);
      setApplyJob(null);
      setSelectedJob(null);
      setTab("applications");
      announce("Application sent. You can track every stage here.");
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const removeApplication = (id) => {
    if (
      !window.confirm(
        "Remove this application from your list?",
      )
    )
      return;
    setHiddenApplicationIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    announce("Application removed from your list.");
  };
  const saveJob = async (draft) => {
    setWorking("job");
    try {
      const saved = draft.id
        ? await updateJob(draft.id, draft)
        : await createJob(draft);
      setJobs((current) =>
        draft.id
          ? current.map((job) => (job.id === saved.id ? saved : job))
          : [saved, ...current],
      );
      setEditJob(null);
      setTab("jobs");
      announce(
        draft.id
          ? "Role updated."
          : "Role published and visible to candidates.",
      );
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const closeJob = async (job) => {
    if (
      !window.confirm(`Close ${job.title}? Candidates will no longer see it.`)
    )
      return;
    setWorking(`close-${job.id}`);
    try {
      await deactivateJob(job.id);
      setJobs((current) =>
        current.map((item) =>
          item.id === job.id ? { ...item, active: false } : item,
        ),
      );
      announce("Role closed.");
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const updateStage = async (id, status) => {
    setWorking(`stage-${id}`);
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...updated } : item,
        ),
      );
      announce(`Candidate moved to ${pretty(status)}.`);
    } catch (error) {
      announce(error.message, "error");
    } finally {
      setWorking("");
    }
  };
  const recompute = async (id) => {
    setWorking(`match-${id}`);
    try {
      const updated = await recalculateApplicationMatch(id);
      setApplications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      announce("Match analysis recalculated.");
      return updated;
    } catch (error) {
      announce(error.message, "error");
      throw error;
    } finally {
      setWorking("");
    }
  };

  let page;
  if (loading)
    page = (
      <div className="sh-loading">
        <i />
        <p>Preparing your SmartHire workspace…</p>
      </div>
    );
  else if (!recruiter && tab === "home")
    page = (
      <CandidateHome
        user={user}
        profile={profile}
        jobs={jobs}
        applications={applications}
        savedIds={savedIds}
        skills={skills}
        onTab={setTab}
        onOpen={openJob}
        onSave={saveToggle}
      />
    );
  else if (!recruiter && tab === "jobs")
    page = (
      <Explorer
        jobs={jobs}
        skills={skills}
        savedIds={savedIds}
        applications={applications}
        query={query}
        onQuery={setQuery}
        onOpen={openJob}
        onSave={saveToggle}
      />
    );
  else if (!recruiter && tab === "applications")
    page = (
      <CandidateApplications
        applications={applications}
        jobs={jobs}
        resumes={resumes}
        onRemove={removeApplication}
        hiddenApplicationIds={hiddenApplicationIds}
        onOpen={setSelectedJob}
      />
    );
  else if (!recruiter && tab === "resumes")
    page = (
      <ResumeHub
        resumes={resumes}
        onUpload={upload}
        onGenerate={generate}
        working={working === "resume"}
      />
    );
  else if (!recruiter)
    page = (
      <CandidateProfile
        profile={profile}
        setProfile={setProfile}
        saving={working === "profile"}
        onSave={saveProfile}
        user={user}
      />
    );
  else if (tab === "home")
    page = (
      <RecruiterHome
        profile={profile}
        jobs={jobs}
        applications={applications}
        onTab={setTab}
      />
    );
  else if (tab === "jobs")
    page = (
      <RecruiterJobs
        jobs={jobs}
        applications={applications}
        onEdit={(job) => {
          setEditJob(job);
          setTab("post");
        }}
        onClose={closeJob}
        onApplicants={(id) => {
          setPipelineJobId(String(id));
          setTab("applicants");
        }}
      />
    );
  else if (tab === "applicants")
    page = (
      <RecruiterPipeline
        jobs={jobs}
        applications={applications}
        selectedJobId={pipelineJobId}
        onSelectedJob={setPipelineJobId}
        onUpdate={updateStage}
        onRecalculate={recompute}
        updating={
          working.startsWith("stage-") ? working.replace("stage-", "") : ""
        }
      />
    );
  else if (tab === "post")
    page = (
      <JobComposer
        job={editJob}
        onCancel={() => {
          setEditJob(null);
          setTab("jobs");
        }}
        onSave={saveJob}
        saving={working === "job"}
      />
    );
  else
    page = (
      <RecruiterProfile
        profile={profile}
        setProfile={setProfile}
        onSave={saveProfile}
        saving={working === "profile"}
      />
    );

  return (
    <main className="sh-shell">
      <aside className="sh-sidebar">
        <div>
          <Brand />
          <p className="sh-workspace-label">
            {recruiter ? "RECRUITER WORKSPACE" : "CANDIDATE WORKSPACE"}
          </p>
          <nav>
            {nav.map(([id, label, navIcon]) => (
              <button
                type="button"
                key={id}
                className={tab === id ? "is-active" : ""}
                onClick={() => {
                  setTab(id);
                  setSelectedJob(null);
                  if (id !== "post") setEditJob(null);
                }}
              >
                <span>{navIcon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="sh-sidebar-user">
          <div>
            <span>{initials(user.name)}</span>
            <p>
              <b>{user.name}</b>
              <small>
                {recruiter ? "Recruiter account" : "Candidate account"}
              </small>
            </p>
          </div>
          <button type="button" onClick={onLogout}>
            ↪ Sign out
          </button>
        </div>
      </aside>
      <section className="sh-main">
        <header className="sh-topbar">
          <button
            type="button"
            className="sh-mobile-brand"
            onClick={() => setTab("home")}
          >
            <Brand />
          </button>
          {!recruiter ? (
            <label className="sh-top-search">
              <span>{icon.search}</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setTab("jobs");
                }}
                placeholder="Search jobs, companies or skills"
              />
            </label>
          ) : (
            <div className="sh-top-context">
              <span>{icon.spark}</span> Better hiring, one clear pipeline.
            </div>
          )}
          <div className="sh-top-user">
            <span className="sh-notification">
              ♧<i />
            </span>
            <span>{initials(user.name)}</span>
            <b>{user.name?.split(" ")[0]}</b>
          </div>
        </header>
        <div className="sh-content">
          <Toast value={toast} onDismiss={() => setToast(null)} />
          {page}
        </div>
      </section>
      {selectedJob && (
        <JobDrawer
          job={selectedJob}
          saved={savedIds.includes(selectedJob.id)}
          applied={appliedIds.has(selectedJob.id)}
          aligned={alignedSkills(selectedJob, skills)}
          onClose={() => setSelectedJob(null)}
          onSave={saveToggle}
          onApply={(job) => {
            if (!resumes.length) {
              setSelectedJob(null);
              setTab("resumes");
              announce("Add a resume before applying.", "error");
            } else setApplyJob(job);
          }}
          onApplications={() => {
            setSelectedJob(null);
            setTab("applications");
          }}
        />
      )}
      {applyJob && (
        <ApplyDialog
          job={applyJob}
          resumes={resumes}
          onClose={() => setApplyJob(null)}
          onApply={submit}
          sending={working === "apply"}
        />
      )}
    </main>
  );
}
