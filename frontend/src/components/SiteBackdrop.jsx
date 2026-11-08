import React from 'react';

/**
 * The slow blue curves behind every page.
 *
 * <p>Three bands drifting at different speeds, so they never line up
 * the same way twice and the movement never resolves into a loop the
 * eye can follow. The point is that it should not be watchable: a
 * background a candidate notices during an interview is a background
 * that is costing them attention they came here to spend elsewhere.
 *
 * <p>Softness is in the gradients, not in a CSS blur. A blurred
 * element that moves is re-rasterised every frame; a gradient that
 * fades to transparent is painted once and then only translated,
 * which the compositor handles on its own. Nothing here animates a
 * property that triggers layout or paint.
 *
 * <p>Decorative, so it is hidden from assistive technology entirely,
 * takes no pointer events, and sits behind the content rather than
 * over it. Under reduced motion the curves stay where they are: a
 * still curve is a perfectly good shape, unlike a spinner stopped
 * mid-turn, so there is nothing to hide.
 */
export default function SiteBackdrop() {
  return (
    <div className="site-backdrop" aria-hidden="true">
      <svg
        className="site-backdrop-art"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          {/* Each band fades out along its own length, so the shape has
              no edge anywhere the eye can catch on. */}
          <linearGradient id="backdrop-a" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
            <stop offset="45%" stopColor="var(--backdrop-ink)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="backdrop-b" x1="1" y1="0" x2="0" y2="0.8">
            <stop offset="0%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--backdrop-ink)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="backdrop-c" x1="0.2" y1="1" x2="0.9" y2="0">
            <stop offset="0%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--backdrop-ink)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--backdrop-ink)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Drawn well past the viewBox on every side. The bands move,
            and a shape that stops at the edge would slide its end into
            view. */}
        <path
          className="site-backdrop-band site-backdrop-band--a"
          d="M-400 180 C 120 40, 420 300, 900 170 S 1600 60, 2000 210 L 2000 -200 L -400 -200 Z"
          fill="url(#backdrop-a)"
        />

        <path
          className="site-backdrop-band site-backdrop-band--b"
          d="M-400 640 C 180 520, 520 780, 980 620 S 1620 500, 2000 660 L 2000 1100 L -400 1100 Z"
          fill="url(#backdrop-b)"
        />

        <path
          className="site-backdrop-band site-backdrop-band--c"
          d="M-400 440 C 260 340, 560 560, 1020 430 S 1680 340, 2000 470"
          fill="none"
          stroke="url(#backdrop-c)"
          strokeWidth="150"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
