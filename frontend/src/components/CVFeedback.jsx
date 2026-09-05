import React from 'react';
import { CheckCircle, XCircle, FileWarning, Lightbulb } from 'lucide-react';

const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const TRACK = '#3E5879';

/**
 * Shows how well the CV is written, against the standards in
 * documents/cv_resume_standards_guide.md.
 *
 * The score and the pass/fail checks come from Python rules, so the same
 * CV always scores the same; the written advice comes from the model,
 * grounded in the retrieved standard. When the model half fails the
 * checks are still shown, because they do not depend on it.
 */
export default function CVFeedback({ review, loading, error }) {
  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 24, padding: 20, background: '#000000' }}>
        <span style={{ color: TEXT, fontSize: 14 }}>
          Checking your CV against the standards…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ marginBottom: 24, padding: 20, background: '#000000' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FileWarning size={16} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: TEXT, fontSize: 14 }}>
            CV review unavailable: {error}
          </span>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const checks = review.checks || [];
  const improvements = review.improvements || [];
  const strengths = review.strengths || [];

  const passed = checks.filter(c => c.passed).length;
  const score = review.score ?? 0;
  const band =
    score >= 85 ? 'Strong' :
    score >= 65 ? 'Good' :
    score >= 45 ? 'Needs work' : 'Weak';

  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        background: '#000000',
        borderTop: `3px solid ${ACCENT}`,
      }}
    >

      {/* Header + score */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 18, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={18} color={ACCENT} />
          <span style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>CV Review</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 13, color: TEXT }}>/100 · {band}</span>
        </div>
      </div>

      <div style={{ height: 6, background: TRACK, borderRadius: 3, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: ACCENT,
          width: `${score}%`, transition: 'width 1s ease',
        }} />
      </div>

      {review.summary && (
        <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, marginBottom: 18 }}>
          {review.summary}
        </p>
      )}

      {/* Objective checks */}
      {checks.length > 0 && (
        <div style={{ marginBottom: improvements.length ? 20 : 0 }}>
          <p style={{
            fontSize: 12, color: TEXT, textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: 10, fontWeight: 500,
          }}>
            Checks · {passed} of {checks.length} passed
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checks.map(c => (
              <div key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {c.passed
                  ? <CheckCircle size={15} color={ACCENT} style={{ flexShrink: 0, marginTop: 3 }} />
                  : <XCircle size={15} color={TEXT} style={{ flexShrink: 0, marginTop: 3 }} />}
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{c.label}</span>
                  {c.detail && (
                    <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, opacity: 0.85 }}>
                      {c.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What to fix */}
      {improvements.length > 0 && (
        <div style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 16 }}>
          <p style={{
            fontSize: 12, color: TEXT, textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: 12, fontWeight: 500,
          }}>
            What to change
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {improvements.map((imp, i) => (
              <div key={i}>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                  {imp.issue}
                </p>
                {imp.fix && (
                  <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, opacity: 0.85 }}>
                    {imp.fix}
                  </p>
                )}
                {imp.example && (
                  <p style={{
                    fontSize: 12.5, color: ACCENT, lineHeight: 1.6,
                    marginTop: 6, paddingLeft: 10,
                    borderLeft: `2px solid ${ACCENT}`,
                  }}>
                    {imp.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 16, marginTop: 16 }}>
          <p style={{
            fontSize: 12, color: TEXT, textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: 10, fontWeight: 500,
          }}>
            Keep doing this
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle size={15} color={ACCENT} style={{ flexShrink: 0, marginTop: 3 }} />
                <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The checks above are still valid when only the written half failed. */}
      {review.reviewed === false && review.review_error && (
        <p style={{ fontSize: 12, color: TEXT, opacity: 0.7, marginTop: 14 }}>
          Written advice unavailable this time; the checks above still apply.
        </p>
      )}
    </div>
  );
}
