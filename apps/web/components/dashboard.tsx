"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Fingerprint,
  FlaskConical,
  HeartPulse,
  History,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Pill,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type {
  AppState,
  EvidenceReference,
  HealthEvent,
  Patient,
  Finding,
} from "../../../packages/core/src/index";

type ViewState = Omit<AppState, "resources"> & {
  patient: Patient;
  events: HealthEvent[];
  evidence: EvidenceReference[];
  tokenConfigured: boolean;
  development: boolean;
  publicDemo?: boolean;
  canReset?: boolean;
};
const nav = [
  ["priors", "Your priors", BookOpen],
  ["brief", "Visit brief", FileText],
  ["memory", "Memory", Layers3],
  ["agents", "Workflow", Workflow],
  ["access", "Data access", ShieldCheck],
] as const;
const categoryIcons: Record<string, typeof BookOpen> = {
  Imaging: ScanLine,
  Labs: FlaskConical,
  Vitals: HeartPulse,
  Medications: Pill,
  Notes: FileText,
  Encounters: CircleHelp,
  Procedures: CheckCheck,
  Conditions: History,
  "Follow-ups": Clock3,
};
function dateLabel(date: string) {
  return new Date(date.slice(0, 10) + "T12:00:00Z").toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  );
}
function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
export default function Dashboard({
  view,
  insightId,
}: {
  view: string;
  insightId?: string;
}) {
  const [data, setData] = useState<ViewState>();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the demo record.");
    setData(await response.json());
  }, []);
  useEffect(() => {
    const saved = sessionStorage.getItem("bibliotech-notice");
    if (saved) {
      setNotice(saved);
      sessionStorage.removeItem("bibliotech-notice");
    }
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, 600);
    return () => clearInterval(timer);
  }, [busy, refresh]);
  async function action(name: string, id?: string) {
    if (busy) return;
    setBusy(name);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Action failed.");
      await refresh();
      if (name === "prepare") router.push("/brief");
      else if (name === "fresh" || name === "reset") {
        if (view !== "priors")
          sessionStorage.setItem("bibliotech-notice", body.result.message);
        router.push("/priors");
        setNotice(body.result.message);
      } else if (name === "import")
        setNotice(
          body.result.synced
            ? "Follow-up imported and verified in GBrain."
            : "Follow-up imported. GBrain memory update is pending.",
        );
      else if (name === "review")
        setNotice(
          body.result.synced
            ? "Review saved in GBrain. Prepare a fresh brief to see the change."
            : "Review is pending synchronization.",
        );
      else if (name === "recall") setNotice("Read current memory from GBrain.");
      else if (name === "retry")
        setNotice(
          body.result.synced
            ? "Memory synchronization verified."
            : "Memory update is still pending.",
        );
      else if (name === "deny")
        setNotice(
          "Research access denied by policy. No source records were returned.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy("");
    }
  }
  const brief = data?.brief;
  const run = data?.runs.at(-1);
  const live =
    data?.tokenConfigured &&
    brief?.memoryStatus === "connected" &&
    !data.lastMemoryError;
  const prepare = (
    <button
      className="button primary"
      disabled={!!busy || !data}
      onClick={() => action("prepare")}
    >
      {busy === "prepare" ? (
        <LoaderCircle className="spin" size={17} />
      ) : (
        <Sparkles size={17} />
      )}
      Prepare My Visit
      <ArrowRight size={17} />
    </button>
  );
  const identity = data?.patient;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          href="/priors"
          className="brand"
          aria-label="BiblioTech Health home"
        >
          <span className="brand-icon">
            <span />
            <span />
            <span />
          </span>
          <span>
            BiblioTech<span className="brand-health">HEALTH</span>
          </span>
        </Link>
        <div className="sidebar-label">YOUR HEALTH LIBRARY</div>
        <nav aria-label="Main navigation">
          {nav.map(([slug, label, Icon]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className={`nav-item ${view === slug || (slug === "brief" && view === "insight") ? "active" : ""}`}
            >
              <Icon size={19} />
              {label}
              {slug === "brief" && brief && (
                <span className="nav-count">{brief.findings.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <span className={`status-dot ${live ? "green" : ""}`} />
            <div>
              <strong>
                {live
                  ? "GBrain connected"
                  : data?.tokenConfigured
                    ? "GBrain configured"
                    : "Connect GBrain"}
              </strong>
              <span>
                {live
                  ? "Memory verified this run"
                  : data?.tokenConfigured
                    ? "Awaiting live verification"
                    : "Persistent memory unavailable"}
              </span>
            </div>
          </div>
          <div className="local-note">
            <LockKeyhole size={13} />
            {data?.publicDemo
              ? "Your demo session expires after 24 hours"
              : "Your priors stay on this device"}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your workspace <ChevronRight size={13} />
            <strong>
              {view === "insight"
                ? "Evidence"
                : nav.find((n) => n[0] === view)?.[1]}
            </strong>
          </span>
          <div className="topbar-right">
            <span className="synthetic-label">
              <FlaskConical size={13} />
              Synthetic demo data
            </span>
            <div className="patient">
              <strong>{identity?.name ?? "Jordan Taylor"}</strong>
              <span>Synthetic Patient · Female · 50</span>
            </div>
          </div>
        </header>
        <main>
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {busy === "prepare" && (
            <div className="progress" aria-live="polite">
              <LoaderCircle className="spin" size={18} />
              <div>
                <strong>Preparing your health brief</strong>
                <span>
                  {run?.status === "running"
                    ? run.stages.at(-1)?.detail
                    : "Searching your priors…"}
                </span>
              </div>
              <Link href="/agents">
                View workflow <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {!data ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              Opening your health library…
            </div>
          ) : (
            <>
              {view === "priors" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">THE CONTEXT THAT COUNTS</div>
                      <h1>
                        Your Priors<span className="title-dot">.</span>
                      </h1>
                      <p>All your priors. One intelligence.</p>
                    </div>
                    <div className="snapshot">
                      <Clock3 size={15} />
                      <span>
                        Historical demo snapshot
                        <strong>September 19, 2026</strong>
                      </span>
                    </div>
                  </div>
                  <div className="overview-grid">
                    <section className="overview-card">
                      <div className="overview-top">
                        <span className="eyebrow">
                          A LONGER VIEW OF YOUR HEALTH
                        </span>
                        <BookOpen size={19} />
                      </div>
                      <div className="metrics">
                        <div>
                          <strong>
                            8<span>years</span>
                          </strong>
                          <p>of connected history</p>
                        </div>
                        <div>
                          <strong>{data.events.length}</strong>
                          <p>source records</p>
                        </div>
                        <div>
                          <strong>
                            {new Set(data.events.map((e) => e.specialty)).size}
                          </strong>
                          <p>specialties, together</p>
                        </div>
                      </div>
                      <div className="history-strip">
                        {Array.from({ length: 9 }, (_, i) => 2018 + i).map(
                          (year) => (
                            <div key={year}>
                              <div className="year-dots">
                                {data.events
                                  .filter((e) =>
                                    e.date.startsWith(String(year)),
                                  )
                                  .slice(0, 7)
                                  .map((e, i) => (
                                    <i
                                      key={i}
                                      className={e.category.toLowerCase()}
                                      title={e.title}
                                    />
                                  ))}
                              </div>
                              <span>{year}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                    <section className="prepare-card">
                      <span className="spark-icon">
                        <Sparkles size={22} />
                      </span>
                      <h2>
                        A little preparation.
                        <br />A better conversation.
                      </h2>
                      <p>
                        Bring your history together in a clear, source-linked
                        brief for your next visit.
                      </p>
                      {prepare}
                    </section>
                  </div>
                  <div className="timeline-layout">
                    <section className="timeline-panel">
                      <div className="section-heading">
                        <h2>Your longitudinal record</h2>
                        <span>{data.events.length} records</span>
                      </div>
                      <div
                        className="filters"
                        role="group"
                        aria-label="Filter records"
                      >
                        {[
                          "All",
                          "Imaging",
                          "Labs",
                          "Vitals",
                          "Medications",
                          "Notes",
                          "Procedures",
                        ].map((f) => (
                          <button
                            key={f}
                            aria-pressed={filter === f}
                            className={filter === f ? "selected" : ""}
                            onClick={() => setFilter(f)}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <input
                        className="record-search"
                        aria-label="Search priors"
                        placeholder="Search your priors…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <Timeline
                        events={data.events.filter(
                          (e) =>
                            (filter === "All" || e.category === filter) &&
                            `${e.title} ${e.summary}`
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )}
                      />
                    </section>
                    <aside className="context-column">
                      <div className="context-card">
                        <div className="small-icon amber">
                          <Clock3 size={20} />
                        </div>
                        <span className="eyebrow">THE MISSING PIECE</span>
                        <h3>
                          {data.imported
                            ? "One more piece, connected."
                            : "One record can change the story."}
                        </h3>
                        <p>
                          {data.imported
                            ? "The September follow-up report is now part of your priors. Prepare a new brief to see the updated context."
                            : "A March imaging report recommends follow-up. Add the supplied September report to complete the picture."}
                        </p>
                        <button
                          className="button secondary full"
                          disabled={!!busy || data.imported}
                          onClick={() => action("import")}
                        >
                          {data.imported ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}{" "}
                          {data.imported
                            ? "Follow-up imported"
                            : "Import follow-up report"}
                        </button>
                        <span className="file-caption">
                          Synthetic FHIR R4 · September 18, 2026
                        </span>
                      </div>
                      <div className="principle-card">
                        <ShieldCheck size={20} />
                        <h3>No evidence, no claim.</h3>
                        <p>
                          Every finding leads back to the source. Your history
                          provides the evidence; your care team provides the
                          clinical judgment.
                        </p>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="legend-dot imaging" /> Imaging
                        </span>
                        <span>
                          <i className="legend-dot labs" /> Labs & vitals
                        </span>
                        <span>
                          <i className="legend-dot notes" /> Notes & care
                        </span>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {view === "brief" && (
                <>
                  <PageHeading
                    eyebrow="PREPARED FROM YOUR PRIORS"
                    title="Your Health Brief"
                    subtitle="The context to carry into your next conversation."
                    right={prepare}
                  />
                  {brief ? (
                    <>
                      <MemoryBanner data={data} />
                      <div className="brief-meta">
                        <span>
                          <FileText size={16} />
                          Generated from{" "}
                          <strong>{brief.sourceCount} source records</strong>
                        </span>
                        <span>
                          {dateLabel(brief.generatedAt)} ·{" "}
                          {timeLabel(brief.generatedAt)}
                        </span>
                      </div>
                      <div className="brief-intro">
                        <span className="eyebrow">START HERE</span>
                        <h2>
                          {brief.findings.length} things to discuss
                          <br />
                          with your care team.
                        </h2>
                        <p>
                          A focused view of follow-ups, changes, and connections
                          across your history.
                        </p>
                      </div>
                      <div className="finding-grid">
                        {brief.findings.map((f, i) => (
                          <FindingCard
                            key={f.id}
                            finding={f}
                            index={i}
                            onReview={() => action("review", f.id)}
                            disabled={!!busy}
                          />
                        ))}
                      </div>
                      {brief.followUp.lifecycle === "resolved" && (
                        <div className="resolved-banner">
                          <CheckCheck size={22} />
                          <div>
                            <strong>
                              Follow-up documentation is now complete
                            </strong>
                            <p>
                              The September report links to the original imaging
                              order. The earlier missing-record question has
                              been removed.
                            </p>
                          </div>
                          <Link href="/memory">
                            Inspect memory <ArrowRight size={16} />
                          </Link>
                        </div>
                      )}
                      <section className="question-section">
                        <div>
                          <span className="eyebrow">TAKE THESE WITH YOU</span>
                          <h2>Questions for your doctor</h2>
                        </div>
                        <div>
                          {brief.questions.map((q, i) => (
                            <div className="question" key={q.text}>
                              <span>0{i + 1}</span>
                              <p>{q.text}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                      {brief.previouslyReviewed.length > 0 && (
                        <div className="context-card">
                          <h3>Already reviewed, remembered by GBrain</h3>
                          {brief.previouslyReviewed.map((t) => (
                            <p key={t}>
                              <Check size={14} /> {t}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="brief-footnote">
                        Discussion support from synthetic records. No diagnosis
                        or treatment advice is generated.
                      </div>
                    </>
                  ) : (
                    <Empty
                      title="Your next conversation starts here."
                      text="Prepare a brief to bring together the most relevant evidence from your priors."
                      action={prepare}
                    />
                  )}
                </>
              )}
              {view === "insight" && (
                <EvidenceView data={data} insightId={insightId} />
              )}
              {view === "memory" && (
                <>
                  <PageHeading
                    eyebrow="CONTEXT THAT STAYS WITH YOU"
                    title="What BiblioTech remembers"
                    subtitle="Inspectable notes. Source-linked conclusions. Corrections that last."
                    right={
                      <button
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() => action("recall")}
                      >
                        <RefreshCw
                          size={16}
                          className={busy === "recall" ? "spin" : ""}
                        />
                        Read from GBrain
                      </button>
                    }
                  />
                  <MemoryBanner data={data} />
                  <div className="memory-explainer">
                    <div className="small-icon">
                      <Layers3 size={23} />
                    </div>
                    <div>
                      <h2>
                        Your records are the source. Memory connects the dots.
                      </h2>
                      <p>
                        {data.publicDemo
                          ? "This public demo uses fictional records in your own temporary session. When GBrain is connected, only derived notes with provenance are sent to it."
                          : "GBrain holds derived notes with provenance. Raw FHIR records remain on this device. These notes can be read by another authorized assistant."}
                      </p>
                    </div>
                    <a
                      href="https://gbrain.io"
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      Open GBrain
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                  {data.memory.length === 0 && (
                    <Empty
                      title="No notes recalled in this session"
                      text={
                        data.tokenConfigured
                          ? "Read from GBrain or prepare a brief to retrieve the current notes."
                          : "Connect a GBrain client with Full memory access to save and recall real notes. Local pending notes are shown separately below."
                      }
                    />
                  )}
                  <div className="memory-grid">
                    {data.memory.map((m) => (
                      <article className="memory-card" key={m.key}>
                        <div className="card-top">
                          <Layers3 size={20} />
                          <span
                            className={`pill ${m.lifecycle === "resolved" ? "green" : "blue"}`}
                          >
                            {m.lifecycle}
                          </span>
                        </div>
                        <h3>{m.title}</h3>
                        <p>{m.statement}</p>
                        <div className="memory-detail">
                          <span>
                            Evidence status<strong>{m.status}</strong>
                          </span>
                          <span>
                            Source dates
                            <strong>
                              {m.sourceDates.map(dateLabel).join(" · ")}
                            </strong>
                          </span>
                        </div>
                        <div className="source-ids">
                          {m.evidenceIds.map((id) => (
                            <code key={id}>{id}</code>
                          ))}
                        </div>
                        <footer>
                          <Check size={14} />
                          Read from GBrain{" "}
                          {m.recalledAt ? timeLabel(m.recalledAt) : ""}
                          <code>{m.providerId}</code>
                        </footer>
                      </article>
                    ))}
                  </div>
                  {data.pendingMemory.length > 0 && (
                    <section className="pending-panel">
                      <div className="section-heading">
                        <h2>Memory update pending</h2>
                        <button
                          className="button secondary"
                          disabled={!!busy}
                          onClick={() => action("retry")}
                        >
                          <RefreshCw size={15} />
                          Retry synchronization
                        </button>
                      </div>
                      <p>
                        These conclusions exist locally and have not been
                        verified in GBrain.
                      </p>
                      {data.pendingMemory.map((m) => (
                        <div className="pending-row" key={m.key}>
                          <Clock3 size={17} />
                          <span>{m.title}</span>
                          <span className="pill amber">
                            {m.lifecycle} · pending
                          </span>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}
              {view === "agents" && (
                <>
                  <PageHeading
                    eyebrow="EVERY STEP, IN THE OPEN"
                    title="How your brief was prepared"
                    subtitle="A deterministic workflow with evidence checks at every stage."
                    right={prepare}
                  />
                  {run ? (
                    <>
                      <div className="run-summary">
                        <div>
                          <span className="eyebrow">LATEST RUN</span>
                          <h2>
                            {run.candidateCount} candidates <span>→</span>{" "}
                            {run.supportedCount} supported findings
                          </h2>
                        </div>
                        <span
                          className={`pill ${run.status === "complete" ? "green" : "blue"}`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="stage-list">
                        {run.stages.map((stage, i) => (
                          <div className="stage" key={stage.name}>
                            <span className={`stage-icon ${stage.status}`}>
                              {stage.status === "running" ? (
                                <LoaderCircle className="spin" size={18} />
                              ) : stage.status === "failed" ? (
                                <CircleHelp size={18} />
                              ) : (
                                <Check size={18} />
                              )}
                            </span>
                            <div>
                              <span className="eyebrow">STEP {i + 1}</span>
                              <h3>{stage.name}</h3>
                              <p>{stage.detail}</p>
                            </div>
                            <time>{timeLabel(stage.at)}</time>
                          </div>
                        ))}
                      </div>
                      <p className="muted small">
                        These stages execute in BiblioTech’s local workflow. QM
                        is an independent extension, not the runtime for this
                        screen.
                      </p>
                    </>
                  ) : (
                    <Empty
                      title="Every step will be visible."
                      text="Prepare your first brief to see actual stage results and source access."
                      action={prepare}
                    />
                  )}
                </>
              )}
              {view === "access" && (
                <>
                  <PageHeading
                    eyebrow="YOUR RECORDS, WITH PURPOSE"
                    title="Your Data Access"
                    subtitle="Agents get access for a purpose, not permanent keys to your health."
                    right={
                      <button
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() => action("deny")}
                      >
                        <ShieldCheck size={16} />
                        Test research access
                      </button>
                    }
                  />
                  <div className="access-callout">
                    <Fingerprint size={28} />
                    <div>
                      <h2>Read only. Scoped to this run.</h2>
                      <p>
                        Local stages receive only the resource classes their
                        policy allows. GBrain operations below reflect actual
                        attempted calls, including failures.
                      </p>
                    </div>
                  </div>
                  <div className="ledger">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Actor</th>
                          <th>Requested data</th>
                          <th>Purpose</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.access
                          .slice()
                          .reverse()
                          .map((e) => (
                            <tr key={e.id}>
                              <td>{timeLabel(e.timestamp)}</td>
                              <td>
                                <strong>{e.actor}</strong>
                                <span>
                                  {e.mode} · {e.runId.slice(0, 8)}
                                </span>
                              </td>
                              <td>{e.resourceClasses.join(", ")}</td>
                              <td>{e.purpose}</td>
                              <td>
                                <span
                                  className={`pill ${e.result === "allowed" ? "green" : e.result === "denied" ? "red" : "amber"}`}
                                >
                                  {e.result}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!data.access.length && (
                      <Empty
                        title="No accesses recorded yet"
                        text="Prepare a brief or test the research access boundary."
                      />
                    )}
                  </div>
                  <p className="muted small">
                    This application ledger demonstrates a local policy
                    boundary. It is not GBrain’s provider audit log or a
                    production security guarantee.
                  </p>
                </>
              )}
              <footer className="page-footer">
                <span>
                  <ShieldCheck size={14} /> Evidence first. Always.
                </span>
                <div>
                  <button disabled={!!busy} onClick={() => action("fresh")}>
                    Fresh Session
                  </button>
                  {(data.development || data.canReset) && (
                    <button disabled={!!busy} onClick={() => action("reset")}>
                      Reset Demo
                    </button>
                  )}
                  <span>
                    FHIR R4 ·{" "}
                    {data.publicDemo ? "Public demo" : "Local prototype"}
                  </span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="title-dot">.</span>
        </h1>
        <p>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Timeline({ events }: { events: HealthEvent[] }) {
  let year = "";
  return (
    <div className="timeline">
      {events.length === 0 && (
        <p className="empty">No records match this filter.</p>
      )}
      {events.map((e) => {
        const showYear = year !== e.date.slice(0, 4);
        year = e.date.slice(0, 4);
        const Icon = categoryIcons[e.category] ?? FileText;
        return (
          <div key={e.id}>
            {showYear && (
              <div className="year-label">
                <span>{year}</span>
                <i />
              </div>
            )}
            <details className="event">
              <summary>
                <span className={`event-icon ${e.category.toLowerCase()}`}>
                  <Icon size={18} />
                </span>
                <span className="event-text">
                  <span className="event-label">
                    {e.category} <i /> {e.specialty}
                  </span>
                  <strong>{e.title}</strong>
                  <span className="event-summary">{e.summary}</span>
                </span>
                <time>
                  {new Date(e.date + "T12:00:00Z").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
                <ChevronRight className="event-arrow" size={16} />
              </summary>
              <div className="event-detail">
                <p>{e.summary}</p>
                <code>{e.resourceId}</code>
                <span> · {dateLabel(e.date)}</span>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
function FindingCard({
  finding: f,
  index,
  onReview,
  disabled,
}: {
  finding: Finding;
  index: number;
  onReview: () => void;
  disabled: boolean;
}) {
  return (
    <article className={`finding-card finding-${index}`}>
      <div className="card-top">
        <span className="finding-number">0{index + 1}</span>
        <span
          className={`pill ${f.status === "unresolved" ? "amber" : "blue"}`}
        >
          {f.category}
        </span>
      </div>
      <h3>{f.title}</h3>
      <p>{f.statement}</p>
      <div className="finding-uncertainty">{f.uncertainty}</div>
      <div className="finding-bottom">
        <Link href={`/insights/${f.id}`}>
          View {f.evidenceIds.length} sources
          <ArrowUpRight size={15} />
        </Link>
        <button onClick={onReview} disabled={disabled}>
          Mark reviewed
        </button>
      </div>
    </article>
  );
}
function MemoryBanner({ data }: { data: ViewState }) {
  if (
    data.lastMemoryError ||
    !data.tokenConfigured ||
    data.pendingMemory.length
  )
    return (
      <div className="memory-banner">
        <CircleHelp size={18} />
        <div>
          <strong>
            {!data.tokenConfigured
              ? "GBrain is not connected"
              : data.pendingMemory.length
                ? "Memory update pending"
                : "GBrain recall unavailable"}
          </strong>
          <span>
            {data.lastMemoryError ??
              "The local brief works; durable memory has not been verified. Add the connection token to .env.local."}
          </span>
        </div>
      </div>
    );
  return (
    <div className="memory-banner verified">
      <CheckCheck size={18} />
      <div>
        <strong>
          {data.memory.length ? "Memory read from GBrain" : "GBrain configured"}
        </strong>
        <span>
          {data.memory.length
            ? `${data.memory.length} source-linked notes retrieved; source records remain canonical.`
            : "Prepare a brief or read memory to verify the connection."}
        </span>
      </div>
    </div>
  );
}
function EvidenceView({
  data,
  insightId,
}: {
  data: ViewState;
  insightId?: string;
}) {
  const finding = data.brief?.findings.find((f) => f.id === insightId);
  if (!finding)
    return (
      <Empty
        title="This finding is no longer in the current brief."
        text="New evidence or a fresh session may have changed the brief. Prepare a new one from your current priors."
        action={
          <Link href="/brief" className="button primary">
            Back to brief
            <ArrowRight size={16} />
          </Link>
        }
      />
    );
  return (
    <>
      <Link href="/brief" className="back-link">
        ← Back to your brief
      </Link>
      <PageHeading
        eyebrow="FOLLOW THE EVIDENCE"
        title="Why BiblioTech surfaced this"
        subtitle="No evidence, no claim."
      />
      <section className="evidence-finding">
        <span className="pill blue">
          {finding.status} · {finding.category}
        </span>
        <h2>{finding.title}</h2>
        <p className="statement">{finding.statement}</p>
        <div className="uncertainty-box">
          <CircleHelp size={20} />
          <p>{finding.uncertainty}</p>
        </div>
        <h3>Why it matters for the conversation</h3>
        <p>{finding.rationale}</p>
      </section>
      <div className="section-heading">
        <h2>The source records</h2>
        <span>{finding.evidenceIds.length} exact references</span>
      </div>
      <div className="evidence-list">
        {finding.evidenceIds.map((id) => {
          const e = data.evidence.find((e) => e.id === id)!;
          return (
            <article className="evidence-card" key={id}>
              <div className="evidence-icon">
                <FileText size={22} />
              </div>
              <div>
                <span className="eyebrow">
                  {e.specialty} · {dateLabel(e.date)}
                </span>
                <h3>{e.title}</h3>
                <p>{e.excerpt}</p>
                <code>{e.id}</code>
                <details className="raw-fhir">
                  <summary>Inspect original FHIR resource</summary>
                  <pre>{JSON.stringify(e.resource, null, 2)}</pre>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
