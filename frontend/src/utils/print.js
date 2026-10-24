// Printing and "Save as PDF" both go through the browser's print dialog,
// so one place decides what a printed page looks like.

// A page prints on white paper whichever theme is on screen: dark mode
// would otherwise print a navy page or, with "background graphics" off,
// pale text on nothing. The theme is switched to light for the print
// and put back afterwards. beforeprint/afterprint also fire for Ctrl+P
// and the browser's own Print menu, not only for our buttons.
let installed = false;

export function installPrintTheme() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const root = document.documentElement;
  let before; // undefined: nothing to restore

  window.addEventListener('beforeprint', () => {
    before = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
  });

  window.addEventListener('afterprint', () => {
    if (before === undefined) return;
    if (before === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', before);
    before = undefined;
  });
}

// Browsers name the saved PDF after the page title, so the title is
// set for the print and restored when the dialog closes.
export function printPage(title) {
  const original = document.title;

  if (title) {
    document.title = title;
    window.addEventListener('afterprint', () => { document.title = original; }, { once: true });
  }

  window.print();
}

// "2026-10-24", for file names and the printed header.
export function printDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
