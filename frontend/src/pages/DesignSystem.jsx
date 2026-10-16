import React, { useState } from 'react';
import { Play, Download, Trash2, Layers, CheckCircle } from 'lucide-react';
import { Button, Card, SectionHeader, Badge } from '../components/ui';

// A living reference for the design system: every token and shared
// component rendered from the real CSS, so this page can never drift
// from what the app actually shows. Open it at /design-system.

const TYPE_SCALE = [
  ['--fs-2xl', '32px', 'Hero numbers, landing headline'],
  ['--fs-xl', '24px', 'Page titles'],
  ['--fs-lg', '20px', 'Card and section titles'],
  ['--fs-base', '16px', 'Body text, form inputs'],
  ['--fs-sm', '14px', 'Secondary text, buttons, labels'],
  ['--fs-xs', '12px', 'Captions, badges, table headers'],
];

const SPACING = [1, 2, 3, 4, 5, 6, 7, 8];

// Contrast on the card surface in each theme: light (#FFFFFF) and
// dark (#111A2E). WCAG AA asks for 4.5:1 for normal text.
const TEXT_COLOURS = [
  ['--text-primary', 'Headings, body text', '17.9', '14.7'],
  ['--text-secondary', 'Supporting text', '10.4', '11.4'],
  ['--text-muted', 'Captions, hints', '7.6', '7.2'],
  ['--text-sub', 'Placeholders, fine print', '5.4', '5.9'],
  ['--accent-text', 'Links, accent text', '6.7', '7.8'],
];

const STATUS_COLOURS = [
  ['--success', 'Good, completed'],
  ['--warning', 'Needs attention'],
  ['--danger', 'Failed, destructive'],
  ['--info', 'Neutral information'],
];

const label = {
  fontSize: 'var(--fs-xs)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
};

export default function DesignSystem() {
  const [loading, setLoading] = useState(false);

  const fakeSubmit = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--fs-xl)', lineHeight: 'var(--lh-tight)', marginBottom: 'var(--space-2)' }}>
        Design System
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', maxWidth: '65ch' }}>
        The tokens and shared components every screen is built from. Defined in
        <code style={{ fontFamily: 'var(--font-mono)' }}> src/index.css</code> and
        <code style={{ fontFamily: 'var(--font-mono)' }}> src/components/ui/</code>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        <Card as="section" aria-labelledby="ds-type">
          <SectionHeader id="ds-type" title="Type scale" subtitle="Six sizes. Nothing smaller than 12px." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {TYPE_SCALE.map(([token, size, use]) => (
              <div key={token} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <span style={{ ...label, width: 140, flexShrink: 0 }}>{token} · {size}</span>
                <span style={{ fontSize: `var(${token})`, fontWeight: 600, lineHeight: 'var(--lh-tight)' }}>{use}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" aria-labelledby="ds-colour">
          <SectionHeader id="ds-colour" title="Colour" subtitle="Text colours with their contrast on the card surface in each theme (AA needs 4.5:1)." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {TEXT_COLOURS.map(([token, use, light, dark]) => (
              <div key={token} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ color: `var(${token})`, fontWeight: 600 }}>{use}</div>
                <div style={label}>{token}</div>
                <div style={{ ...label, color: 'var(--success-light)' }}>{light}:1 light · {dark}:1 dark</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
            {STATUS_COLOURS.map(([token, use]) => (
              <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `var(${token})`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{use}</div>
                  <div style={label}>{token}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" aria-labelledby="ds-space">
          <SectionHeader id="ds-space" title="Spacing" subtitle="A 4px base. Every margin, padding and gap uses one of these." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {SPACING.map((n) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ ...label, width: 80 }}>--space-{n}</span>
                <span style={{ height: 12, width: `var(--space-${n})`, background: 'var(--accent)', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </Card>

        <Card as="section" aria-labelledby="ds-buttons">
          <SectionHeader id="ds-buttons" title="Button" subtitle="One primary action per screen. Tab through them to see the focus ring." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Button icon={<Play size={16} />}>Primary</Button>
            <Button variant="secondary" icon={<Download size={16} />}>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={<Trash2 size={16} />}>Danger</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={fakeSubmit}>
              {loading ? 'Submitting…' : 'Click for loading'}
            </Button>
          </div>
        </Card>

        <Card as="section" aria-labelledby="ds-badges">
          <SectionHeader id="ds-badges" title="Badge" subtitle="Named by meaning. The text always says the status too." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Badge tone="success" icon={<CheckCircle size={12} />}>Completed</Badge>
            <Badge tone="warning">In progress</Badge>
            <Badge tone="danger">Failed</Badge>
            <Badge tone="info">Backend Development</Badge>
            <Badge tone="neutral">Draft</Badge>
          </div>
        </Card>

        <Card as="section" accent="var(--info)" aria-labelledby="ds-card">
          <SectionHeader
            id="ds-card"
            icon={<Layers size={18} />}
            color="var(--info)"
            title="Card with SectionHeader"
            subtitle="The heading is a real h2, so screen readers can jump to it."
            action={<Button size="sm" variant="secondary">Action</Button>}
          />
          <p style={{ color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)', maxWidth: '65ch' }}>
            Cards group related content. Use the accent edge sparingly, to tell
            apart sections that sit next to each other.
          </p>
        </Card>
      </div>
    </div>
  );
}
