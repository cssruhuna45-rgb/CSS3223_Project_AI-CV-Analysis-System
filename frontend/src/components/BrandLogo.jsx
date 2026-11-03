import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The Vynterva AI brand artwork.
 *
 * <p>Two assets, because they behave differently against a surface:
 *
 * <ul>
 *   <li><b>mark</b> - the V symbol on its own (logo-mark.png, cut from
 *       the supplied lockup). Pure blue artwork with no text, so it
 *       reads on a light tint and on a dark panel alike. This is the
 *       one to use anywhere the theme can change underneath it.</li>
 *   <li><b>full</b> - the complete lockup with wordmark and tagline.
 *       Its wordmark is white and its tagline pale grey, so it needs a
 *       dark surface; on a light one the words disappear.</li>
 * </ul>
 *
 * <p>Both are transparent RGBA and carry no background of their own.
 * Where the wordmark is wanted on a themed surface, pair `mark` with
 * real text instead - text follows the theme, a picture of text does
 * not.
 */
export default function BrandLogo({ variant = 'mark', className = '', alt, shine = true }) {
  const isMark = variant === 'mark';
  const src = `${process.env.PUBLIC_URL}/${isMark ? 'logo-mark.png' : 'logo.png'}`;
  const frameRef = useRef(null);
  const lastShine = useRef(-Infinity);
  const endTimer = useRef(null);
  const [shining, setShining] = useState(false);

  const playShine = useCallback(() => {
    if (!shine || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (Date.now() - lastShine.current < 6000) return;
    lastShine.current = Date.now();
    setShining(true);
    clearTimeout(endTimer.current);
    endTimer.current = setTimeout(() => setShining(false), 1100);
  }, [shine]);

  useEffect(() => {
    if (!shine) {
      setShining(false);
      return undefined;
    }
    const startTimer = setTimeout(playShine, 700);
    const trigger = frameRef.current?.closest('button, a, [role="button"]');
    trigger?.addEventListener('focus', playShine);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer.current);
      trigger?.removeEventListener('focus', playShine);
    };
  }, [playShine, shine]);

  return (
    <span
      ref={frameRef}
      className={`brand-logo ${className} ${shining && shine ? 'brand-logo--shining' : ''}`.trim()}
      style={{ '--brand-artwork': `url("${src}")`, '--brand-ratio': isMark ? '699 / 595' : '1448 / 1086' }}
      onPointerEnter={playShine}
    >
      <img
        src={src}
        // Decorative beside a text wordmark; described when standalone.
        alt={alt !== undefined ? alt : 'Vynterva AI'}
        className="brand-logo-image"
        width={isMark ? 699 : 1448}
        height={isMark ? 595 : 1086}
        decoding="async"
      />
      <span className="brand-logo-shine" aria-hidden="true" />
    </span>
  );
}
