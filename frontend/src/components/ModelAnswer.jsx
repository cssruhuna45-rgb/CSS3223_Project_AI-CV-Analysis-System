import React from 'react';
import { BookOpen, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const ACCENT = 'var(--accent)';
const CYAN = 'var(--accent)';
const TEXT = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const GOOD = 'var(--success)';
const GAP = 'var(--warning)';
const CARD_BG = 'color-mix(in srgb, var(--bg-surface) 75%, transparent)';
const BORDER = 'color-mix(in srgb, var(--fg) 8%, transparent)';

export default function ModelAnswer({ data, loading, error }) {
  if (loading) {
    return (
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: 20,
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Sparkles size={18} color={CYAN} className="animate-spin" />
          <span style={{ color: TEXT, fontSize: 'var(--fs-sm)', fontWeight: 500 }}>
            Consulting domain knowledge base for ideal model answer…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: 18,
          background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle
            size={16}
            color={GAP}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span style={{ color: 'var(--warning)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
            Expected answer unavailable: {error}. Your answer was still securely recorded.
          </span>
        </div>
      </div>
    );
  }

  if (!data || !data.model_answer) return null;

  const keyPoints = data.key_points || [];
  const missing = data.missing_from_answer || [];
  const sources = data.sources || [];

  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderTop: '3px solid var(--accent)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: CYAN,
          }}>
            <BookOpen size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 'var(--fs-base)', color: TEXT }}>
              Ideal Model Answer
            </span>
            <span style={{ fontSize: 'var(--fs-xs)', color: MUTED, display: 'block' }}>
              Standard industry benchmark
            </span>
          </div>
        </div>

        <span
          className="badge"
          style={{
            fontSize: 'var(--fs-xs)',
            padding: '4px 10px',
            background: data.grounded
              ? 'color-mix(in srgb, var(--success) 12%, transparent)'
              : 'color-mix(in srgb, var(--warning) 12%, transparent)',
            color: data.grounded ? GOOD : GAP,
            border: `1px solid ${
              data.grounded
                ? 'color-mix(in srgb, var(--success) 30%, transparent)'
                : 'color-mix(in srgb, var(--warning) 30%, transparent)'
            }`,
          }}
        >
          {data.grounded ? 'Knowledge Base Verified' : 'General Engineering Baseline'}
        </span>
      </div>

      {/* The model answer text */}
      <div style={{
        background: 'color-mix(in srgb, var(--fg) 2%, transparent)',
        border: '1px solid color-mix(in srgb, var(--fg) 5%, transparent)',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 16,
      }}>
        <p
          style={{
            fontSize: 'var(--fs-sm)',
            color: TEXT,
            lineHeight: 1.7,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.model_answer}
        </p>
      </div>

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
          <p
            style={{
              fontSize: 'var(--fs-xs)',
              color: GOOD,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            Core Competencies Covered
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyPoints.map((point, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <CheckCircle2
                  size={16}
                  color={GOOD}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 'var(--fs-sm)', color: TEXT, lineHeight: 1.5, margin: 0 }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing from answer */}
      {missing.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
          <p
            style={{
              fontSize: 'var(--fs-xs)',
              color: GAP,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            Points To Enhance Next Time
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missing.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <AlertCircle
                  size={16}
                  color={GAP}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--warning)', lineHeight: 1.5, margin: 0 }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <p
          style={{
            fontSize: 'var(--fs-xs)',
            color: MUTED,
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          Grounding Sources: {sources.join(', ')}
        </p>
      )}
    </div>
  );
}
