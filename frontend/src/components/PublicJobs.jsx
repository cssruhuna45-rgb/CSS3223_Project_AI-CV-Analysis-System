import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, ChevronDown, ChevronUp, Globe, Search, Send } from 'lucide-react';
import { PREDEFINED_JOB_FIELDS } from '../constants/jobFields';
import { publicJobsAPI } from '../services/publicJobsApi';
import { Badge, Button, Card, SectionHeader } from './ui';

function fieldName(id) {
  return PREDEFINED_JOB_FIELDS.find((f) => f.id === id)?.name || id;
}

const PREVIEW_LENGTH = 180;

/**
 * Jobs recruiters have chosen to publish, shown under the invite-code
 * form on Apply for a Job. Applying goes through the same application
 * page as an invite link - CV choice, consent, skill match and the
 * duplicate check all stay in one place.
 *
 * A closed job stays listed so candidates can see it existed, but it
 * cannot be applied for (and the server refuses it either way).
 */
export default function PublicJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [field, setField] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (field && job.jobField !== field) return false;
      if (!q) return true;
      return [job.title, job.company, fieldName(job.jobField), ...(job.requiredSkills || [])]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(q));
    });
  }, [jobs, query, field]);

  useEffect(() => {
    let cancelled = false;

    publicJobsAPI.list()
      .then((list) => { if (!cancelled) setJobs(list || []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Public jobs could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // The same application page an invite link opens, found by job id.
  const apply = (job) => navigate(`/apply/job/${job.id}`);

  return (
    <section aria-labelledby="public-jobs-title" style={{ marginTop: 'var(--space-7)' }}>
      <SectionHeader
        id="public-jobs-title"
        icon={<Globe size={18} />}
        title="Public Jobs"
        subtitle="Jobs recruiters have published. No invite code needed."
      />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', margin: 'var(--space-4) 0' }}>
        <div style={{ flex: '2 1 220px', position: 'relative' }}>
          <label className="label" htmlFor="public-jobs-search">Search</label>
          <Search size={16} aria-hidden="true"
            style={{ position: 'absolute', left: 12, bottom: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input id="public-jobs-search" className="input" type="search"
            placeholder="Title, company or skill"
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label className="label" htmlFor="public-jobs-field">Job field</label>
          <select id="public-jobs-field" className="input" value={field} onChange={(e) => setField(e.target.value)}>
            <option value="">All fields</option>
            {PREDEFINED_JOB_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p role="status" style={{ color: 'var(--text-secondary)' }}>Loading public jobs{'…'}</p>
      ) : error ? (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>{error}</p>
      ) : visible.length === 0 ? (
        <Card padding="md">
          <p role="status" style={{ color: 'var(--text-secondary)' }}>
            {jobs.length === 0
              ? 'No jobs have been published yet. Check back later, or use an invite code above.'
              : 'No public jobs match your search.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {visible.map((job) => {
            const expanded = expandedId === job.id;
            const long = job.jobDescription.length > PREVIEW_LENGTH;
            const description = expanded || !long
              ? job.jobDescription
              : `${job.jobDescription.slice(0, PREVIEW_LENGTH).trimEnd()}…`;

            return (
              <Card key={job.id} as="article" padding="md" aria-labelledby={`public-job-${job.id}-title`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 id={`public-job-${job.id}-title`} style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                      {job.title}
                    </h3>
                    <p style={meta}>
                      <Briefcase size={14} aria-hidden="true" />
                      {[job.company, fieldName(job.jobField)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div>
                    <Badge tone={job.open ? 'success' : 'neutral'}>{job.open ? 'Open' : 'Closed'}</Badge>
                  </div>
                </div>

                <p id={`public-job-${job.id}-description`}
                  style={{ whiteSpace: 'pre-wrap', lineHeight: 'var(--lh-normal)', color: 'var(--text-secondary)', margin: 'var(--space-3) 0' }}>
                  {description}
                </p>

                {job.requiredSkills?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
                    aria-label="Required skills">
                    {(expanded ? job.requiredSkills : job.requiredSkills.slice(0, 5)).map((skill) => (
                      <Badge key={skill} tone="info">{skill}</Badge>
                    ))}
                    {!expanded && job.requiredSkills.length > 5 && (
                      <Badge tone="neutral">+{job.requiredSkills.length - 5} more</Badge>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <span style={meta}>
                    {job.publishedAt && (
                      <>
                        <Calendar size={14} aria-hidden="true" />
                        Published {new Date(job.publishedAt).toLocaleDateString()}
                      </>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {(long || job.requiredSkills?.length > 5) && (
                      <Button size="sm" variant="ghost"
                        icon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        aria-expanded={expanded}
                        aria-controls={`public-job-${job.id}-description`}
                        onClick={() => setExpandedId(expanded ? null : job.id)}>
                        {expanded ? 'Show less' : 'View details'}
                      </Button>
                    )}
                    <Button size="sm" icon={<Send size={14} />} disabled={!job.open}
                      aria-label={job.open ? `Apply now for ${job.title}` : `${job.title} is closed`}
                      onClick={() => apply(job)}>
                      {job.open ? 'Apply now' : 'Closed'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

const meta = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--fs-sm)',
};
