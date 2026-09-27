"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Layers3,
  LockKeyhole,
  Pill,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { initialRecords, followupRecord } from "@/lib/data";
import {
  crossSpecialtyFindings,
  followupFindings,
  medicationFindings,
  reviewFinding,
} from "@/lib/domain";
import "./landing.css";

export default function Landing() {
  const [afterImport, setAfterImport] = useState(false);
  const findings = useMemo(() => {
    const records = afterImport
      ? [...initialRecords, followupRecord]
      : initialRecords;
    return [
      ...followupFindings(records),
      ...crossSpecialtyFindings(records),
      ...medicationFindings(records),
    ]
      .map((f) => reviewFinding(f, records))
      .filter((f) => f.reviewer.passed);
  }, [afterImport]);

  return (
    <div className="lp-page">
      <a href="#landing-main" className="lp-skip">
        Skip to content
      </a>
      <header className="lp-nav lp-container">
        <Link href="/" className="lp-brand" aria-label="BiblioTech Health home">
          <span className="lp-brand-mark">
            B<i />
          </span>
          <span>
            BiblioTech<small>HEALTH</small>
          </span>
        </Link>
        <nav aria-label="Marketing navigation">
          <a href="#benefits">Why BiblioTech</a>
          <a href="#how-it-works">How it works</a>
          <a href="#intelligence">GBrain + QM</a>
        </nav>
        <Link href="/priors" className="lp-nav-cta">
          Explore the demo
          <ArrowUpRight size={16} />
        </Link>
      </header>

      <main id="landing-main" className="lp-main">
        <section className="lp-hero lp-container">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow">
              <span />
              YOUR HISTORY. YOUR ADVANTAGE.
            </div>
            <h1>
              All your prior test results.
              <br />
              <em>Intelligence for your body.</em>
            </h1>
            <p>
              BiblioTech connects your medical history across specialties and
              turns it into evidence-grounded intelligence you can inspect,
              correct, and carry with you.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-button" href="/priors">
                Explore your health story
                <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="lp-secondary">
                See how it works
                <ArrowDown size={15} />
              </a>
            </div>
            <div className="lp-demo-note">
              <FlaskConical size={14} />
              Interactive synthetic demo<span>·</span>No sign-up needed
            </div>
          </div>
          <div className="lp-preview-area">
            <div className="lp-preview-orbit" aria-hidden="true" />
            <div className="lp-floating-source">
              <span>
                <Layers3 size={17} />
              </span>
              <div>
                <strong>8 years of context</strong>
                <small>One connected story</small>
              </div>
              <CheckCheck size={16} />
            </div>
            <div className="lp-product-preview">
              <div className="lp-preview-top">
                <span className="lp-mini-logo">
                  B<i />
                </span>
                <strong>Your visit, in focus.</strong>
                <span className="lp-synthetic-chip">Synthetic preview</span>
              </div>
              <div className="lp-preview-patient">
                <span>JT</span>
                <div>
                  <strong>Jordan Taylor</strong>
                  <small>51 · Female · Synthetic Patient</small>
                </div>
                <FileCheck2 size={18} />
              </div>
              <div className="lp-preview-summary">
                <span>{findings.length}</span>
                <div>
                  <strong>things worth discussing</strong>
                  <small>A little more context. A better conversation.</small>
                </div>
                <Sparkles size={24} />
              </div>
              <div className="lp-preview-findings" aria-live="polite">
                {afterImport && (
                  <div className="lp-resolved-preview">
                    <CircleCheck size={17} />
                    <div>
                      <strong>Breast imaging follow-up matched</strong>
                      <small>New evidence answers an open question.</small>
                    </div>
                    <span>Resolved</span>
                  </div>
                )}
                {findings.map((f) => (
                  <div className="lp-preview-finding" key={f.id}>
                    <span
                      className={`lp-finding-icon ${f.id === "cross-specialty-cardiovascular" ? "blue" : "amber"}`}
                    >
                      {f.id === "follow-up" ? (
                        <ScanLine size={16} />
                      ) : f.id === "medication" ? (
                        <Pill size={16} />
                      ) : (
                        <GitBranch size={16} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {f.id === "follow-up"
                          ? "Confirm an imaging follow-up"
                          : f.id === "medication"
                            ? "Confirm the current medication dose"
                            : "Connect the cross-specialty context"}
                      </strong>
                      <small>
                        {f.evidenceIds.length} linked source
                        {f.evidenceIds.length === 1 ? "" : "s"}
                        <span>·</span>
                        {f.status === "inferred"
                          ? "For clinician review"
                          : "Needs confirmation"}
                      </small>
                    </div>
                    <ArrowUpRight size={14} />
                  </div>
                ))}
              </div>
              <div className="lp-preview-footer">
                <ShieldCheck size={14} />
                <span>No evidence, no claim.</span>
                <Link href="/brief">
                  Open the full brief
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <div className="lp-preview-toggle">
              <span>See what a new record changes</span>
              <div role="group" aria-label="Synthetic preview state">
                <button
                  aria-pressed={!afterImport}
                  onClick={() => setAfterImport(false)}
                >
                  Before follow-up
                </button>
                <button
                  aria-pressed={afterImport}
                  onClick={() => setAfterImport(true)}
                >
                  After import
                  <Check size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="lp-proof lp-container"
          aria-label="Inside the synthetic demo"
        >
          <span className="lp-proof-label">
            ONE SYNTHETIC PATIENT.
            <br />
            <strong>A MUCH BIGGER PICTURE.</strong>
          </span>
          <div>
            <strong>25</strong>
            <span>meaningful records</span>
          </div>
          <div>
            <strong>8</strong>
            <span>years of history</span>
          </div>
          <div>
            <strong>6</strong>
            <span>specialties connected</span>
          </div>
          <div>
            <strong>1</strong>
            <span>clear starting point</span>
          </div>
        </section>

        <section id="benefits" className="lp-benefits lp-container">
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">MORE CONTEXT. MORE CONFIDENCE.</span>
              <h2>
                Make your history
                <br />
                work for you.
              </h2>
            </div>
            <p>
              The important details rarely live in one place.
              <br />A clearer picture starts by bringing them together.
            </p>
          </div>
          <div className="lp-benefit-grid">
            <article className="lp-benefit-card">
              <div className="lp-benefit-art lp-connections" aria-hidden="true">
                <span className="lp-node labs">
                  <FlaskConical size={21} />
                </span>
                <span className="lp-node scan">
                  <ScanLine size={21} />
                </span>
                <span className="lp-node meds">
                  <Pill size={21} />
                </span>
                <span className="lp-connected-center">
                  <GitBranch size={27} />
                </span>
                <svg viewBox="0 0 280 130">
                  <path
                    d="M50 32L140 66L231 31M140 66L215 106"
                    fill="none"
                    stroke="#c8d5ef"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
              <span className="lp-card-number">01 / THE BIGGER PICTURE</span>
              <h3>
                Connect the dots
                <br />
                across your care.
              </h3>
              <p>
                Bring imaging, lab trends, and medications into the same
                conversation. Surface connections worth reviewing with your
                clinician.
              </p>
              <Link href="/insights/cross-specialty-cardiovascular">
                Follow the evidence
                <ArrowUpRight size={16} />
              </Link>
            </article>
            <article className="lp-benefit-card">
              <div
                className="lp-benefit-art lp-questions-art"
                aria-hidden="true"
              >
                <div>
                  <span>
                    <Check size={12} />
                  </span>
                  <i />
                  <small>For your next visit</small>
                </div>
                <div>
                  <span>
                    <Check size={12} />
                  </span>
                  <i />
                </div>
                <div>
                  <span>
                    <Check size={12} />
                  </span>
                  <i />
                </div>
                <span className="lp-art-book">
                  <BookOpen size={23} />
                </span>
              </div>
              <span className="lp-card-number">02 / A BETTER CONVERSATION</span>
              <h3>
                Bring the questions
                <br />
                that matter.
              </h3>
              <p>
                Turn a long history into a short, useful brief. Know what needs
                confirmation and see the exact records behind each question.
              </p>
              <Link href="/brief">
                Explore a visit brief
                <ArrowUpRight size={16} />
              </Link>
            </article>
            <article className="lp-benefit-card">
              <div className="lp-benefit-art lp-change-art" aria-hidden="true">
                <span className="lp-old-status">Open question</span>
                <span className="lp-art-change-line" />
                <span className="lp-new-status">
                  <CircleCheck size={15} />
                  New evidence matched
                </span>
                <FileCheck2 size={26} />
              </div>
              <span className="lp-card-number">03 / CONTEXT THAT EVOLVES</span>
              <h3>
                Move forward
                <br />
                with new evidence.
              </h3>
              <p>
                A new report can answer an old question. When the evidence
                changes, your next brief reflects what is now known.
              </p>
              <Link href="/memory">
                See what carries forward
                <ArrowUpRight size={16} />
              </Link>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="lp-how-section">
          <div className="lp-container lp-how-grid">
            <div className="lp-how-copy">
              <span className="lp-eyebrow">FROM RECORDS TO READINESS</span>
              <h2>
                Your story, connected.
                <br />
                Your next step, clearer.
              </h2>
              <p>
                One thoughtful process brings the past into focus—so you can
                spend your next visit on the conversation ahead.
              </p>
              <Link href="/priors" className="lp-secondary">
                Try the two-minute demo
                <ArrowRight size={16} />
              </Link>
              <div className="lp-evidence-promise">
                <ShieldCheck size={25} />
                <span>
                  <strong>Questions you can investigate.</strong>
                  <small>
                    Every finding keeps its source and its uncertainty.
                  </small>
                </span>
              </div>
            </div>
            <div className="lp-how-steps">
              {[
                {
                  icon: Layers3,
                  title: "Start with your priors.",
                  text: "Explore a coherent timeline of labs, imaging, medications, and notes. Open any record to see the original synthetic evidence.",
                },
                {
                  icon: Sparkles,
                  title: "Prepare a better conversation.",
                  text: "The workflow checks follow-ups, compares medication records, connects specialties, and reviews every candidate finding.",
                },
                {
                  icon: Database,
                  title: "Carry the context forward.",
                  text: "Import a new report and see your brief change. With GBrain connected, evidence-linked memory can continue into the next session.",
                },
              ].map(({ icon: Icon, title, text }, i) => (
                <div className="lp-how-step" key={title}>
                  <span className="lp-step-index">0{i + 1}</span>
                  <div>
                    <Icon size={22} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="intelligence" className="lp-intelligence">
          <div className="lp-container">
            <div className="lp-intelligence-heading">
              <div>
                <span className="lp-eyebrow">
                  THE INTELLIGENCE BEHIND THE EXPERIENCE
                </span>
                <h2>
                  Memory that lasts.
                  <br />A process you can inspect.
                </h2>
              </div>
              <p>
                Useful health context needs continuity and a repeatable way to
                work. GBrain and QM have distinct roles in that architecture.
              </p>
            </div>
            <div className="lp-integration-grid">
              <article className="lp-integration-card">
                <div className="lp-integration-title">
                  <span className="lp-partner-icon">
                    <Database size={26} />
                  </span>
                  <div>
                    <h3>GBrain</h3>
                    <span>THE MEMORY LAYER</span>
                  </div>
                  <span className="lp-integration-status">
                    Available when connected
                  </span>
                </div>
                <h4>
                  Keep the context.
                  <br />
                  Carry it into what’s next.
                </h4>
                <p>
                  BiblioTech’s GBrain connector saves findings with their source
                  evidence, recalls them in a fresh session, and updates open
                  questions when new records resolve them.
                </p>
                <ul>
                  <li>
                    <Check size={15} />
                    Remembered findings remain inspectable
                  </li>
                  <li>
                    <Check size={15} />
                    Resolved questions keep the evidence that changed them
                  </li>
                  <li>
                    <Check size={15} />
                    Writes are checked with a separate memory read
                  </li>
                </ul>
                <a
                  href="https://gbrain.io/docs/workspace/memory-anywhere"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore GBrain memory
                  <ArrowUpRight size={15} />
                </a>
              </article>
              <article className="lp-integration-card">
                <div className="lp-integration-title">
                  <span className="lp-partner-icon qm">
                    <GitBranch size={26} />
                  </span>
                  <div>
                    <h3>QM</h3>
                    <span>THE PLANNED ORCHESTRATION LAYER</span>
                  </div>
                  <span className="lp-integration-status planned">
                    Planned integration
                  </span>
                </div>
                <h4>
                  A repeatable skill.
                  <br />A transparent path to a brief.
                </h4>
                <p>
                  QM is the intended home for the Health Priors workflow:
                  retrieve authorized evidence, investigate candidates, review
                  claims, and update durable memory through a reusable skill.
                </p>
                <ul>
                  <li>
                    <Check size={15} />A consistent procedure from evidence to
                    review
                  </li>
                  <li>
                    <Check size={15} />
                    Purpose and permissions stay part of the process
                  </li>
                  <li>
                    <Check size={15} />A workflow designed to be inspected and
                    improved
                  </li>
                </ul>
                <a
                  href="https://qm.ycombinator.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Learn about QM
                  <ArrowUpRight size={15} />
                </a>
              </article>
            </div>
            <div className="lp-architecture-note">
              <FileText size={17} />
              <p>
                <strong>Where the demo is today.</strong> GBrain requires a
                configured connection and verified read/write access. The
                current review workflow runs locally with deterministic rules;
                live QM orchestration is planned.
              </p>
              <Link href="/agents">
                Inspect the workflow
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="lp-trust lp-container">
          <div>
            <span className="lp-trust-emblem">
              <ShieldCheck size={30} />
            </span>
            <span className="lp-eyebrow">CLARITY EARNS TRUST</span>
            <h2>No evidence, no claim.</h2>
            <p>
              You deserve to know where a finding came from,
              <br />
              what remains uncertain, and who accessed what.
            </p>
          </div>
          <div className="lp-trust-points">
            <Link href="/insights/cross-specialty-cardiovascular">
              <FileCheck2 size={21} />
              <span>
                <strong>Every finding has a source.</strong>
                <small>Open the original record behind a connection.</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/agents">
              <ShieldCheck size={21} />
              <span>
                <strong>Uncertainty stays visible.</strong>
                <small>
                  Unsupported diagnoses and assumptions are rejected.
                </small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/access">
              <Fingerprint size={21} />
              <span>
                <strong>Access has a purpose.</strong>
                <small>
                  Inspect allowed and denied requests in the audit ledger.
                </small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        <section className="lp-faq lp-container">
          <div>
            <span className="lp-eyebrow">A FEW THINGS TO KNOW</span>
            <h2>Built for understanding.</h2>
          </div>
          <div className="lp-faq-items">
            <details>
              <summary>
                Does BiblioTech provide a diagnosis?
                <ChevronDown size={18} />
              </summary>
              <p>
                BiblioTech surfaces questions and evidence for review with your
                care team. It preserves uncertainty and does not provide medical
                diagnoses or recommend a medication dose.
              </p>
            </details>
            <details>
              <summary>
                What can I explore in the demo?
                <ChevronDown size={18} />
              </summary>
              <p>
                Explore 25 synthetic FHIR R4 records, prepare a visit brief,
                inspect evidence and workflow decisions, import the supplied
                follow-up report, and start a fresh session to see the updated
                brief.
              </p>
            </details>
            <details>
              <summary>
                Can I add my real medical records?
                <ChevronDown size={18} />
              </summary>
              <p>
                This prototype accepts only its supplied synthetic follow-up
                fixture. It is designed for demonstration and is not ready for
                real patient data.
              </p>
            </details>
            <details>
              <summary>
                Are GBrain and QM running in this demo?
                <ChevronDown size={18} />
              </summary>
              <p>
                The GBrain connector is implemented and clearly reports whether
                a real connection succeeds. Without a configured connection, the
                demo demonstrates local record persistence only. QM
                orchestration is planned; the five review stages currently run
                locally.
              </p>
            </details>
          </div>
        </section>

        <section className="lp-closing lp-container">
          <div className="lp-closing-mark">
            <Sparkles size={25} />
          </div>
          <span className="lp-eyebrow">ALL YOUR PRIOR TEST RESULTS. INTELLIGENCE FOR YOUR BODY.</span>
          <h2>
            Your next visit deserves
            <br />
            the whole story.
          </h2>
          <p>See what changes when your history comes together.</p>
          <Link href="/priors" className="lp-button">
            Explore the BiblioTech demo
            <ArrowRight size={17} />
          </Link>
          <small>
            <FlaskConical size={13} />
            Synthetic patient. Real, inspectable evidence flow.
          </small>
        </section>
      </main>
      <footer className="lp-footer lp-container">
        <Link href="/" className="lp-brand">
          <span className="lp-brand-mark">
            B<i />
          </span>
          <span>
            BiblioTech<small>HEALTH</small>
          </span>
        </Link>
        <p>All your prior test results. Intelligence for your body.</p>
        <div>
          <a href="#intelligence">GBrain + QM</a>
          <Link href="/priors">
            Explore the demo
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <small>
          A synthetic product demonstration. For questions and evidence, not
          medical diagnoses.
        </small>
      </footer>
    </div>
  );
}
