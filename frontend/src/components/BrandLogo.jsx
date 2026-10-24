import React from 'react';

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
export default function BrandLogo({ variant = 'mark', className = '', alt }) {
  const isMark = variant === 'mark';

  return (
    <img
      src={`${process.env.PUBLIC_URL}/${isMark ? 'logo-mark.png' : 'logo.png'}`}
      // Decorative when it sits beside the name in text; described
      // when it stands alone as the brand.
      alt={alt !== undefined ? alt : 'Vynterva AI'}
      className={`brand-logo ${className}`}
      width={isMark ? 699 : 1448}
      height={isMark ? 595 : 1086}
      decoding="async"
    />
  );
}
