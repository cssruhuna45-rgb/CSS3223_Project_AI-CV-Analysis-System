import React from 'react';
import { BookOpen, CheckCircle, XCircle, FileWarning } from 'lucide-react';

const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const GOOD = '#4ADE80';
const GAP = '#FBBF24';
const LINE = 'rgba(216,196,182,0.2)';

/**
 * The answer the candidate should have given, shown once they submit.
 *
 * It is built from the same Chroma knowledge base that produced the
 * question, so "you did not mention X" traces back to documents/ rather
 * than to whatever the model happens to recall. When retrieval finds
 * nothing the answer still appears, labelled as general knowledge, so
 * the candidate knows how much weight to give it.
 *
 * A failure here is never fatal: the interview turn is already saved,
 * so this panel just says the answer is unavailable and the candidate
 * moves on.
 */
export default function ModelAnswer({ data, loading, error }) {
  if (loading) {
    return (
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: 18,
          background: '#000000',
          border: `1px solid ${LINE}`,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <BookOpen size={16} color={ACCENT} />
          <span style={{ color: TEXT, fontSize: 14 }}>
            Looking up the expected answer…
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
          background: '#000000',
          border: `1px solid ${LINE}`,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <FileWarning
            size={16}
            color={GAP}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span style={{ color: TEXT, fontSize: 13, lineHeight: 1.6 }}>
            Expected answer unavailable: {error}. Your answer was still
            recorded.
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
        marginBottom: 20,
        background: '#000000',
        border: `1px solid ${LINE}`,
        borderTop: `3px solid ${ACCENT}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} color={ACCENT} />
          <span style={{ fontWeight: 700, fontSize: 15, color: ACCENT }}>
            Expected Answer
          </span>
        </div>

        <span
          className="badge"
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 12,
            background: data.grounded
              ? 'rgba(74,222,128,0.12)'
              : 'rgba(251,191,36,0.12)',
            color: data.grounded ? GOOD : GAP,
            border: `1px solid ${
              data.grounded
                ? 'rgba(74,222,128,0.35)'
                : 'rgba(251,191,36,0.35)'
            }`,
          }}
        >
          {data.grounded ? 'From knowledge base' : 'General knowledge'}
        </span>
      </div>

      {/* The answer itself */}
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

      {/* What a complete answer covers */}
      {keyPoints.length > 0 && (
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, marginTop: 16 }}>
          <p
            style={{
              fontSize: 12,
              color: GOOD,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Key points
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyPoints.map((point, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <CheckCircle
                  size={15}
                  color={GOOD}
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What their own answer left out */}
      {missing.length > 0 && (
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, marginTop: 16 }}>
          <p
            style={{
              fontSize: 12,
              color: GAP,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Missing from your answer
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missing.map((item, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <XCircle
                  size={15}
                  color={GAP}
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
                <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, margin: 0 }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Where it came from, so the candidate can go and read it */}
      {sources.length > 0 && (
        <p
          style={{
            fontSize: 12,
            color: TEXT,
            opacity: 0.65,
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          Source: {sources.join(', ')}
        </p>
      )}
    </div>
  );
}
