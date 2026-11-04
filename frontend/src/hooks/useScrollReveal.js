import { useEffect } from 'react';

/** Decorative, once-only reveals. Content is visible until an observer
 * successfully opts it into motion; unavailable APIs never hide it. */
export default function useScrollReveal(ref, deps = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const targets = [...root.querySelectorAll('.subreveal:not(.subreveal--visible), .reveal-section:not(.visible)')];
    if (!targets.length) return undefined;
    const reveal = (element) => {
      element.classList.remove('reveal-pending');
      element.classList.add(element.classList.contains('reveal-section') ? 'visible' : 'subreveal--visible');
    };
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion?.matches || typeof IntersectionObserver === 'undefined') {
      targets.forEach(reveal);
      return undefined;
    }
    let observer;
    try {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) {
            reveal(target);
            observer.unobserve(target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
      targets.forEach((target) => {
        const bounds = target.getBoundingClientRect();
        if (bounds.top < window.innerHeight && bounds.bottom >= 0) {
          reveal(target);
        } else {
          observer.observe(target);
          target.classList.add('reveal-pending');
        }
      });
    } catch {
      targets.forEach(reveal);
      observer?.disconnect();
      return undefined;
    }
    // Tabbing to an offscreen control must never leave focus invisible.
    const onFocus = (event) => {
      let element = event.target.closest('.reveal-pending');
      while (element && root.contains(element)) {
        reveal(element);
        observer.unobserve(element);
        element = element.parentElement?.closest('.reveal-pending');
      }
    };
    const onMotionChange = (event) => {
      if (event.matches) {
        targets.forEach(reveal);
        observer.disconnect();
      }
    };
    root.addEventListener('focusin', onFocus);
    motion?.addEventListener?.('change', onMotionChange);
    return () => {
      targets.forEach(reveal);
      observer.disconnect();
      root.removeEventListener('focusin', onFocus);
      motion?.removeEventListener?.('change', onMotionChange);
    };
  // Callers supply the data changes that add reveal targets to the DOM.
  }, [ref, ...deps]);
}
