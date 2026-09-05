import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Flag, Award, History, AlertTriangle,
} from 'lucide-react';
import { interviewAPI } from '../services/api';

// Same palette the scorecard uses, so this reads as part of the app
// rather than a bolted-on page.
const ACCENT = '#D8C4B6';
const TEXT = '#F5EFE7';
const TRACK = '#3E5879';
const CARD = '#000000';

// The scorecard's hues, kept in step so a colour means the same thing
// on both panels: green is progress, rose is a drop back.
const GREEN = '#4ADE80';
const BLUE = '#60A5FA';
const AMBER = '#FBBF24';
const PURPLE = '#C084FC';
const CYAN = '#22D3EE';
const ROSE = '#F472B6';

// Each trend gets its own colour, so the badge reads before the words do.
const TREND_COLORS = {
  IMPROVING: GREEN,
  DECREASING: ROSE,
  STABLE: AMBER,
  FIRST_INTERVIEW: BLUE,
  NO_DATA: BLUE,
};

/**
 * How each trend is described to the candidate. The backend decides
 * the trend; this only decides how to say it.
 */
const TREND = {
  IMPROVING: {
    icon: <TrendingUp size={14} />,
    label: 'Improving',
    message: 'Better than your previous interview',
  },
  DECREASING: {
    icon: <TrendingDown size={14} />,
    label: 'Down from last time',
    message: 'Lower than your previous interview',
  },
  STABLE: {
    icon: <Minus size={14} />,
    label: 'Holding steady',
    message: 'The same as your previous interview',
  },
  FIRST_INTERVIEW: {
    icon: <Flag size={14} />,
    label: 'First interview',
    message: 'Your baseline — finish another to see a trend',
  },
  NO_DATA: {
    icon: <Flag size={14} />,
    label: 'Not scored yet',
    message: 'None of your interviews have been graded yet',
  },
};

const DATE = { month: 'short', day: '2-digit' };

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--'
    : date.toLocaleDateString(undefined, DATE);
}

/**
 * A signed number, with an en dash when there is nothing to compare.
 */
function formatChange(value) {
  if (value === null || value === undefined) return '--';
  return value > 0 ? `+${value}` : `${value}`;
}

function changeColor(value) {
  if (value === null || value === undefined) return TEXT;
  return value >= 0 ? GREEN : ROSE;
}

function StatCard({ label, value, suffix, hint, hintColor, tone = ACCENT }) {
  return (
    <div className="card" style={{
      padding: 20, background: CARD, borderTop: `3px solid ${tone}`,
    }}>
      <p style={{
        fontSize: 12, color: tone, marginBottom: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: tone, lineHeight: 1 }}>
          {value}
        </span>
        {suffix && (
          <span style={{ fontSize: 13, color: TEXT, marginBottom: 4 }}>{suffix}</span>
        )}
      </div>
      {hint && (
        <p style={{ fontSize: 12, color: hintColor || TEXT, marginTop: 8 }}>{hint}</p>
      )}
    </div>
  );
}

/**
 * Score progression as an inline SVG line chart.
 *
 * <p>Hand-drawn rather than pulled from a charting library: the app
 * has no chart dependency and one line of a handful of points does not
 * justify adding one.
 */
function ScoreChart({ points }) {
  if (points.length < 2) return null;

  const width = 640;
  const height = 160;
  const padX = 32;
  const padY = 20;

  // Always plot against the full 0-100 range. Fitting the axis to the
  // data would turn a 2-point wobble into a dramatic climb.
  const x = (i) => padX + (i * (width - padX * 2)) / (points.length - 1);
  const y = (score) => padY + ((100 - score) * (height - padY * 2)) / 100;

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.score)}`)
    .join(' ');

  const area =
    `${line} L ${x(points.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Score progression across ${points.length} interviews`}
    >
      {[0, 50, 100].map(score => (
        <g key={score}>
          <line
            x1={padX} x2={width - padX} y1={y(score)} y2={y(score)}
            stroke={TRACK} strokeWidth="1"
          />
          <text
            x={padX - 8} y={y(score) + 4}
            fill={TEXT} fontSize="10" textAnchor="end" opacity="0.7"
          >
            {score}
          </text>
        </g>
      ))}

      <path d={area} fill={GREEN} opacity="0.14" />
      <path d={line} fill="none" stroke={GREEN} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={p.sessionId}>
          <circle cx={x(i)} cy={y(p.score)} r="4" fill={GREEN} />
          <text
            x={x(i)} y={y(p.score) - 10}
            fill={GREEN} fontSize="11" textAnchor="middle" fontWeight="600"
          >
            {p.score}
          </text>
          <text
            x={x(i)} y={height - 4}
            fill={TEXT} fontSize="10" textAnchor="middle" opacity="0.7"
          >
            {formatDate(p.completedAt || p.startedAt)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * "How did I do compared with last time?"
 *
 * <p>Everything here comes from GET /api/v1/interviews/progress, which
 * reads PostgreSQL. Nothing is calculated from React state or session
 * storage, so it is the same after any restart and on any device.
 *
 * @param {boolean} compact - drop the heading, for embedding under the
 *   scorecard where the page already has one.
 */
export default function InterviewProgress({ compact = false }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    interviewAPI.progress()
      .then(data => { if (active) setProgress(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    // The scorecard can unmount while this is still in flight.
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', color: TEXT, fontSize: 14, background: CARD }}>
        Loading your progress...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        background: CARD, borderTop: `3px solid ${AMBER}`,
      }}>
        <AlertTriangle size={16} color={AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>
          Your progress could not be loaded. {error}
        </p>
      </div>
    );
  }

  const interviews = progress?.interviews || [];

  if (interviews.length === 0) {
    return (
      <div className="card" style={{
        textAlign: 'center', background: CARD, borderTop: `3px solid ${PURPLE}`,
      }}>
        <History size={28} color={PURPLE} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>
          No completed interviews yet. Finish one and your score history
          will build up here.
        </p>
      </div>
    );
  }

  const trend = TREND[progress.trend] || TREND.NO_DATA;
  const trendColor = TREND_COLORS[progress.trend] || BLUE;

  // Only graded interviews can be plotted.
  const chartPoints = interviews.filter(i => i.score !== null && i.score !== undefined);

  // Newest first for the table; the API returns oldest first so the
  // chart can read straight through.
  const rows = [...interviews].reverse();

  return (
    <div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <TrendingUp size={18} color={ACCENT} />
          <h2 style={{ fontWeight: 600, fontSize: 18 }}>My Interview Progress</h2>
        </div>
      )}

      {/* Headline numbers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <StatCard
          label="Latest Score"
          value={progress.latestScore ?? '--'}
          suffix="/ 100"
          hint={trend.message}
          tone={GREEN}
        />
        <StatCard
          label="Previous Score"
          value={progress.previousScore ?? '--'}
          suffix={progress.previousScore === null ? '' : '/ 100'}
          hint={progress.previousScore === null ? 'No earlier interview' : null}
          tone={BLUE}
        />
        <StatCard
          label="Change"
          value={formatChange(progress.scoreDifference)}
          suffix={progress.scoreDifference === null ? '' : 'points'}
          hint={trend.label}
          hintColor={changeColor(progress.scoreDifference)}
          tone={changeColor(progress.scoreDifference)}
        />
        <StatCard
          label="Best Score"
          value={progress.bestScore ?? '--'}
          suffix={progress.bestScore === null ? '' : '/ 100'}
          tone={PURPLE}
        />
        <StatCard
          label="Completed"
          value={progress.totalInterviews}
          suffix={progress.totalInterviews === 1 ? 'interview' : 'interviews'}
          hint={
            progress.scoredInterviews < progress.totalInterviews
              ? `${progress.totalInterviews - progress.scoredInterviews} could not be graded`
              : null
          }
          tone={CYAN}
        />
      </div>

      {/* Trend badge */}
      <div style={{ marginBottom: 24 }}>
        <span className="badge" style={{
          background: `${trendColor}1F`,
          color: trendColor,
          border: `1px solid ${trendColor}59`,
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 14px',
        }}>
          {trend.icon} {trend.label}
        </span>
      </div>

      {/* Score progression */}
      {chartPoints.length >= 2 && (
        <div className="card" style={{
          marginBottom: 24, background: CARD, borderTop: `3px solid ${GREEN}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Award size={18} color={GREEN} />
            <span style={{ fontWeight: 700, fontSize: 15, color: GREEN }}>Score progression</span>
          </div>
          <ScoreChart points={chartPoints} />
        </div>
      )}

      {/* History */}
      <div className="card" style={{
        background: CARD, borderTop: `3px solid ${PURPLE}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <History size={18} color={PURPLE} />
          <span style={{ fontWeight: 700, fontSize: 15, color: PURPLE }}>Interview history</span>
        </div>

        {/* Narrow screens scroll the table rather than the page. */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
            minWidth: 420,
          }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${PURPLE}59` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px 12px 0', color: PURPLE, fontWeight: 600 }}>
                  Date
                </th>
                <th style={{ textAlign: 'right', padding: '8px 12px 12px', color: PURPLE, fontWeight: 600 }}>
                  Score
                </th>
                <th style={{ textAlign: 'right', padding: '8px 0 12px 12px', color: PURPLE, fontWeight: 600 }}>
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => (
                <tr key={item.sessionId} style={{ borderBottom: `1px solid ${TRACK}` }}>
                  <td style={{ padding: '12px 12px 12px 0', color: TEXT }}>
                    {formatDate(item.completedAt || item.startedAt)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: CYAN }}>
                    {/* An interview that could not be graded is still
                        listed - it happened - but has no score. */}
                    {item.score ?? 'Not graded'}
                  </td>
                  <td style={{
                    padding: '12px 0 12px 12px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: changeColor(item.scoreChange),
                  }}>
                    {formatChange(item.scoreChange)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
