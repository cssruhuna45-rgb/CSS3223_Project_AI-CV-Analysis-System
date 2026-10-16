import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// Light or dark. With no saved choice the app follows the computer's
// own setting (prefers-color-scheme, handled in index.css). Pressing
// the button saves an explicit choice, which then wins on every visit.
// public/index.html applies the saved choice before React loads, so
// the page does not flash the wrong theme first.

const STORAGE_KEY = 'theme';

function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => savedTheme() || systemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const next = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows can refuse storage; the switch still works
      // for this visit.
    }
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggle}
      // Names the action, so the label is right in both states.
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
