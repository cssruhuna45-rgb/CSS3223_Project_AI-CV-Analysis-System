import React from 'react';

/**
 * Shows text from the AI with its `backtick` code words as code.
 *
 * Gemini writes in Markdown, so a question arrives as
 * "difference between `PUT` and `PATCH`". Printed as plain text the
 * backticks showed on screen. Here the text is split on backticks:
 * every odd-numbered piece was between a pair, so it becomes <code>.
 *
 * A backtick still waiting for its partner counts as already open.
 * The interview types the question out letter by letter, and this way
 * "`PU" shows as code straight away instead of flashing a raw backtick
 * until the closing one arrives.
 *
 * Only inline code is handled; other Markdown is left as it is.
 */
export default function CodeText({ text }) {
  const parts = String(text || '').split('`');

  return (
    <>
      {parts.map((part, i) => (
        i % 2 === 1
          ? part && <code key={i} className="inline-code">{part}</code>
          : part
      ))}
    </>
  );
}

/**
 * The same text with the backticks removed, for places that need a
 * plain string, such as a screen-reader announcement, where a
 * backtick could be read out as "grave accent".
 */
export function stripBackticks(text) {
  return String(text || '').replace(/`/g, '');
}
