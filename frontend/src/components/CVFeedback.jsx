import React from 'react';
import { CheckCircle2, XCircle, FileWarning, Sparkles, Check } from 'lucide-react';

const ACCENT = '#6366F1';
const CYAN = '#06B6D4';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#EF4444';
const TRACK = 'rgba(255, 255, 255, 0.08)';
const CARD_BG = 'rgba(15, 23, 42, 0.75)';

export default function CVFeedback({ review, loading, error }) {
  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 24, padding: 22, background: CARD_BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={16} color={CYAN} className="animate-spin" />
          <span style={{ color: TEXT, fontSize: 14 }}>
            Evaluating your CV structure, metrics, and technical keywords…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ marginBottom: 24, padding: 20, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FileWarning size={16} color={ROSE} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: '#FCA5A5', fontSize: 13.5 }}>
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
    score >= 85 ? 'Senior Ready' :
    score >= 65 ? 'Competitive' :
    score >= 45 ? 'Developing' : 'Needs Structure';

  const bandColor = score >= 75 ? GREEN : score >= 50 ? AMBER : ROSE;

  return (
    <div
      className="card"
      style={{
        marginBottom: 28,
        background: CARD_BG,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: '3px solid #6366F1',
      }}
    >
      {/* Header + score */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 18, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8',
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>CV Quality Score</span>
            <span style={{ fontSize: 12, color: MUTED, display: 'block' }}>Grounded in industry resume standards</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: bandColor, lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 13, color: MUTED, marginLeft: 4 }}>/100 · {band}</span>
        </div>
      </div>

      <div style={{ height: 6, background: TRACK, borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: `linear-gradient(90deg, #6366F1, ${bandColor})`,
          width: `${score}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {review.summary && (
        <p style={{ fontSize: 14, color: '#E2E8F0', lineHeight: 1.65, marginBottom: 20 }}>
          {review.summary}
        </p>
      )}

      {/* Objective checks */}
      {checks.length > 0 && (
        <div style={{ marginBottom: improvements.length ? 22 : 0 }}>
          <p style={{
            fontSize: 12, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700,
          }}>
            Standard Checks · {passed} of {checks.length} Passed
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checks.map(c => (
              <div key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {c.passed
                  ? <CheckCircle2 size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                  : <XCircle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: c.passed ? TEXT : '#FEF3C7' }}>{c.label}</span>
                  {c.detail && (
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginTop: 2 }}>
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
        <div style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 18, marginTop: 18 }}>
          <p style={{
            fontSize: 12, color: AMBER, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700,
          }}>
            Recommended Enhancements
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {improvements.map((imp, i) => (
              <div key={i} style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#FEF3C7', marginBottom: 4 }}>
                  {imp.issue}
                </p>
                {imp.fix && (
                  <p style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.5 }}>
                    {imp.fix}
                  </p>
                )}
                {imp.example && (
                  <p style={{
                    fontSize: 12.5, color: CYAN, lineHeight: 1.5,
                    marginTop: 6, paddingLeft: 10,
                    borderLeft: `2px solid ${CYAN}`,
                  }}>
                    Example: {imp.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div style={{ borderTop: `1px solid ${TRACK}`, paddingTop: 18, marginTop: 18 }}>
          <p style={{
            fontSize: 12, color: GREEN, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700,
          }}>
            Strong Aspects of Your CV
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13.5, color: '#E2E8F0', lineHeight: 1.5, margin: 0 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback notice */}
      {review.reviewed === false && review.review_error && (
        <p style={{ fontSize: 12, color: MUTED, marginTop: 14 }}>
          Written advice unavailable this time; the objective checklist above remains fully valid.
        </p>
      )}
    </div>
  );
}
