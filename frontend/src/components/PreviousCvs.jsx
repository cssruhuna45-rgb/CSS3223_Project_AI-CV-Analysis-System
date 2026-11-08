import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Target,
  CheckCircle,
  XCircle,
  Layers,
  Sparkles,
  Loader,
  AlertCircle,
  Clock,
} from 'lucide-react';

import { resumeAPI } from '../services/api';
import { userMessage } from '../services/http';

/**
 * The candidate's earlier CVs, and what each has been compared against.
 *
 * <p>Two levels of disclosure, because the page already carries a full
 * analysis of the current CV and this sits underneath it: a CV opens
 * to its stored skill gap analyses, and an analysis opens to the
 * skills behind its percentage. Nothing is fetched until a CV is
 * opened, so the common case - a candidate who came to upload - costs
 * one request for the list and nothing else.
 *
 * <p>The analyses are read, never re-run. Re-running one is a model
 * call that need not return the same skills, so a candidate reopening
 * an old analysis would be shown numbers that quietly disagreed with
 * the ones they were given the first time.
 */

const CARD = {
  border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
  borderRadius: 14,
  background: 'var(--bg-surface)',
};

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Colour by band, matching the AI service's 80/60/40 levels. */
function bandColour(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return 'var(--success)';
  if (pct >= 40) return 'var(--warning)';
  return 'var(--accent)';
}

function SkillList({ icon: Icon, label, skills, tone }) {
  if (!skills || skills.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        <Icon size={13} color={tone} aria-hidden="true" />
        {label}
        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>({skills.length})</span>
      </p>

      <div className="profile-chips">
        {skills.map((skill) => (
          <span
            key={skill}
            className="profile-chip"
            style={{
              borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`,
              color: tone,
            }}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function StoredAnalysis({ analysis }) {
  const [open, setOpen] = useState(false);

  // The denormalised columns draw the row; the snapshot draws the
  // detail. A row whose snapshot could not be parsed still lists.
  const detail = analysis.result || {};
  const pct = analysis.matchPercentage ?? 0;
  const colour = bandColour(pct);

  const hasDetail = Boolean(
    (detail.matched_skills || []).length
    || (detail.missing_skills || []).length
    || (detail.related_skills || []).length
    || (detail.additional_skills || []).length
  );

  return (
    <div style={{ ...CARD, background: 'var(--bg-card2)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!hasDetail}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: 'none', border: 'none',
          textAlign: 'left', cursor: hasDetail ? 'pointer' : 'default',
        }}
      >
        <span style={{
          display: 'grid', placeItems: 'center', flex: 'none',
          width: 44, height: 44, borderRadius: 10,
          background: `color-mix(in srgb, ${colour} 12%, transparent)`,
          color: colour, fontWeight: 800, fontSize: 'var(--fs-sm)',
        }}>
          {pct}%
        </span>

        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'block', fontWeight: 700, fontSize: 'var(--fs-sm)',
            color: 'var(--text-primary)',
          }}>
            {analysis.jobFieldName || analysis.jobField}
          </span>

          <span style={{
            display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
            fontSize: 'var(--fs-xs)', color: 'var(--text-muted)',
          }}>
            <Clock size={11} aria-hidden="true" />
            Analysed {formatDate(analysis.analysedAt)}
          </span>
        </span>

        {hasDetail && (open
          ? <ChevronDown size={16} color="var(--text-muted)" aria-hidden="true" />
          : <ChevronRight size={16} color="var(--text-muted)" aria-hidden="true" />)}
      </button>

      {open && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: '1px solid color-mix(in srgb, var(--fg) 6%, transparent)',
        }}>
          {analysis.summary && (
            <p style={{
              fontSize: 'var(--fs-sm)', lineHeight: 1.7, marginTop: 12,
              color: 'var(--text-secondary)',
            }}>
              {analysis.summary}
            </p>
          )}

          <SkillList
            icon={CheckCircle}
            label="Matched"
            skills={detail.matched_skills}
            tone="var(--success)"
          />
          <SkillList
            icon={Layers}
            label="Related"
            skills={detail.related_skills}
            tone="var(--accent)"
          />
          <SkillList
            icon={XCircle}
            label="Missing"
            skills={detail.missing_skills}
            tone="var(--warning)"
          />
          <SkillList
            icon={Sparkles}
            label="Additional"
            skills={detail.additional_skills}
            tone="var(--text-muted)"
          />
        </div>
      )}
    </div>
  );
}

function CvRow({ resume, isCurrent }) {
  const [open, setOpen] = useState(false);
  const [analyses, setAnalyses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setAnalyses(await resumeAPI.getSkillGaps(resume.id));
    } catch (err) {
      setError(userMessage(
        err,
        "We couldn't load the analyses for this CV right now."
      ));
    } finally {
      setLoading(false);
    }
  }, [resume.id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);

    // Fetched on first open, then kept. Reopening a CV the candidate
    // has already looked at should not cost another request.
    if (next && analyses === null && !loading) load();
  };

  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: 14, background: 'none', border: 'none',
          textAlign: 'left', cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'grid', placeItems: 'center', flex: 'none',
          width: 38, height: 38, borderRadius: 10,
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
        }}>
          <FileText size={17} color="var(--accent)" aria-hidden="true" />
        </span>

        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{
              fontWeight: 700, fontSize: 'var(--fs-sm)', color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {resume.originalFileName}
            </span>

            {isCurrent && (
              <span style={{
                flex: 'none', fontSize: 'var(--fs-xs)', fontWeight: 700,
                padding: '2px 8px', borderRadius: 999,
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
              }}>
                Current
              </span>
            )}
          </span>

          <span style={{
            display: 'block', marginTop: 3,
            fontSize: 'var(--fs-xs)', color: 'var(--text-muted)',
          }}>
            Uploaded {formatDate(resume.uploadedAt)}
            {resume.fileSize ? ` · ${formatSize(resume.fileSize)}` : ''}
          </span>
        </span>

        {open
          ? <ChevronDown size={17} color="var(--text-muted)" aria-hidden="true" />
          : <ChevronRight size={17} color="var(--text-muted)" aria-hidden="true" />}
      </button>

      {open && (
        <div style={{
          padding: '12px 14px 14px',
          borderTop: '1px solid color-mix(in srgb, var(--fg) 6%, transparent)',
        }}>
          {loading && (
            <p style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
            }} role="status">
              <Loader size={14} className="animate-spin" aria-hidden="true" />
              Loading saved analyses&hellip;
            </p>
          )}

          {!loading && error && (
            <p style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              fontSize: 'var(--fs-sm)', color: 'var(--danger)',
            }} role="alert">
              <AlertCircle size={14} style={{ marginTop: 2, flex: 'none' }} aria-hidden="true" />
              {error}
            </p>
          )}

          {!loading && !error && analyses && analyses.length === 0 && (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              This CV hasn&apos;t been compared with a career field yet. Open
              the Skill Gap Analysis step to compare it with one.
            </p>
          )}

          {!loading && !error && analyses && analyses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analyses.map((analysis) => (
                <StoredAnalysis key={analysis.id} analysis={analysis} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreviousCvs({ currentResumeId }) {
  const [resumes, setResumes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const list = await resumeAPI.getAll();

        if (!live) return;

        // Newest first, so the CV the candidate is most likely looking
        // for is the one they do not have to scroll to.
        setResumes(
          (Array.isArray(list) ? list : [])
            .slice()
            .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
        );
      } catch (err) {
        if (!live) return;
        setError(userMessage(err, "We couldn't load your earlier CVs right now."));
      }
    })();

    return () => { live = false; };
  }, []);

  // The section is additional context, not the page's job. Until the
  // list is known, or when it holds nothing, it stays out of the way
  // rather than showing an empty frame.
  if (error) {
    return (
      <section style={{ ...CARD, padding: 16, marginTop: 24 }}>
        <p style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontSize: 'var(--fs-sm)', color: 'var(--danger)', margin: 0,
        }} role="alert">
          <AlertCircle size={14} style={{ marginTop: 2, flex: 'none' }} aria-hidden="true" />
          {error}
        </p>
      </section>
    );
  }

  if (!resumes || resumes.length === 0) return null;

  const currentId = currentResumeId == null ? null : String(currentResumeId);

  return (
    <section style={{ marginTop: 28 }} aria-labelledby="previous-cvs-title">
      <div style={{ marginBottom: 12 }}>
        <h2
          id="previous-cvs-title"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 'var(--fs-lg)', fontWeight: 800,
            color: 'var(--text-primary)', margin: 0,
          }}
        >
          <Target size={18} color="var(--accent)" aria-hidden="true" />
          Your CVs and their analyses
        </h2>

        <p style={{
          fontSize: 'var(--fs-sm)', color: 'var(--text-muted)',
          margin: '5px 0 0', lineHeight: 1.7,
        }}>
          Every CV you have uploaded, and the career fields each one has
          been compared with. Open a CV to see its saved skill gap
          results.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {resumes.map((resume) => (
          <CvRow
            key={resume.id}
            resume={resume}
            isCurrent={currentId !== null && String(resume.id) === currentId}
          />
        ))}
      </div>
    </section>
  );
}
