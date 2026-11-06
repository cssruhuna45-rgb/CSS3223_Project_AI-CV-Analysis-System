import { useEffect } from 'react';

/**
 * Publishes the pointer's position inside an element as CSS variables.
 *
 * <p>Writes `--px` and `--py` as fractions from 0 to 1 of the element's
 * own box, and sets `data-pointer="on"` while the pointer is inside it.
 * Everything that reacts - a spotlight, a lit pattern, a tilt, a shine
 * crossing the logo - is then CSS reading those three values, so the
 * effect can be redesigned without touching this file and none of it
 * costs a React render.
 *
 * <p>Three deliberate limits:
 *
 * <ul>
 *   <li><b>Fine pointers only.</b> A finger has no hover: on a touch
 *       screen `pointerenter` fires on tap and `pointerleave` may never
 *       follow, which would leave the panel stuck lit. Coarse pointers
 *       get the unlit design, which is complete on its own.</li>
 *   <li><b>One write per frame.</b> `pointermove` fires faster than the
 *       screen refreshes, and setting a custom property invalidates
 *       style on the subtree each time.</li>
 *   <li><b>Reduced motion opts out entirely.</b> No listeners are
 *       attached, so the variables keep their CSS defaults and the
 *       panel stays still.</li>
 * </ul>
 *
 * @param ref ref to the element the pointer moves across
 */
export default function usePointerGlow(ref) {

  useEffect(() => {
    const el = ref.current;

    if (!el) return undefined;

    const wants = (query) => window.matchMedia?.(query).matches ?? false;

    if (wants('(prefers-reduced-motion: reduce)')) return undefined;
    if (!wants('(hover: hover) and (pointer: fine)')) return undefined;

    let frame = 0;
    let next = null;

    const write = () => {
      frame = 0;

      if (!next) return;

      el.style.setProperty('--px', next.x.toFixed(4));
      el.style.setProperty('--py', next.y.toFixed(4));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(write);
    };

    const clamp = (value) => Math.min(1, Math.max(0, value));

    const onMove = (event) => {
      const box = el.getBoundingClientRect();

      if (!box.width || !box.height) return;

      next = {
        x: clamp((event.clientX - box.left) / box.width),
        y: clamp((event.clientY - box.top) / box.height),
      };

      schedule();
    };

    const onEnter = (event) => {
      el.dataset.pointer = 'on';
      onMove(event);
    };

    const onLeave = () => {
      delete el.dataset.pointer;

      // Back to the middle rather than wherever it left, so the
      // spotlight settles under the mark instead of sliding off the
      // edge it exited through.
      next = { x: 0.5, y: 0.5 };
      schedule();
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);

      if (frame) window.cancelAnimationFrame(frame);

      delete el.dataset.pointer;
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
    };
  }, [ref]);
}
