import React from 'react';
import { BookOpen, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

const ACCENT = '#6366F1';
const CYAN = '#06B6D4';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const GOOD = '#10B981';
const GAP = '#F59E0B';
const CARD_BG = 'rgba(15, 23, 42, 0.75)';
const BORDER = 'rgba(255, 255, 255, 0.08)';

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
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>
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
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle
            size={16}
            color={GAP}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span style={{ color: '#FEF3C7', fontSize: 13, lineHeight: 1.6 }}>
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
        borderTop: '3px solid #06B6D4',
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
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: CYAN,
          }}>
            <BookOpen size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>
              Ideal Model Answer
            </span>
            <span style={{ fontSize: 12, color: MUTED, display: 'block' }}>
              Standard industry benchmark
            </span>
          </div>
        </div>

        <span
          className="badge"
          style={{
            fontSize: 11.5,
            padding: '4px 10px',
            background: data.grounded
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(245, 158, 11, 0.12)',
            color: data.grounded ? GOOD : GAP,
            border: `1px solid ${
              data.grounded
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(245, 158, 11, 0.3)'
            }`,
          }}
        >
          {data.grounded ? 'Knowledge Base Verified' : 'General Engineering Baseline'}
        </span>
      </div>

      {/* The model answer text */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 16,
      }}>
        <p
          style={{
            fontSize: 14,
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
              fontSize: 12,
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
                <p style={{ fontSize: 13.5, color: TEXT, lineHeight: 1.5, margin: 0 }}>
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
              fontSize: 12,
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
                <p style={{ fontSize: 13.5, color: '#FEF3C7', lineHeight: 1.5, margin: 0 }}>
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
            fontSize: 12,
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
