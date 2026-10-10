import React, { useEffect, useRef } from 'react';

/**
 * Floating aurora-style gradient blobs that drift, pulse, and morph.
 * Pure CSS — no canvas needed. These sit behind content for depth.
 */
export default function AuroraBlobs() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Randomize starting position slightly on mount for variety
    if (containerRef.current) {
      const blobs = containerRef.current.querySelectorAll('.aurora-blob');
      blobs.forEach((blob, i) => {
        blob.style.animationDelay = `${i * -2.5}s`;
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div className="aurora-blob aurora-blob--1" />
      <div className="aurora-blob aurora-blob--2" />
      <div className="aurora-blob aurora-blob--3" />
      <div className="aurora-blob aurora-blob--4" />
    </div>
  );
}
