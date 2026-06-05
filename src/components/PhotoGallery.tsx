'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SiteData } from '@/lib/data';

type PhotoItem = NonNullable<SiteData['photos']>['items'][number];

function fullSizeUrl(url: string): string {
  return url.replace(/rs=w:\d+/, 'rs=w:2560');
}

export function PhotoGallery({ items }: { items: PhotoItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null || i <= 0 ? i : i - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null || i >= items.length - 1 ? i : i + 1));
  }, [items.length]);

  const open = (index: number) => setActiveIndex(index);

  const active = activeIndex !== null ? items[activeIndex] : null;
  const hasPrev = activeIndex !== null && activeIndex > 0;
  const hasNext = activeIndex !== null && activeIndex < items.length - 1;

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, close, goPrev, goNext]);

  return (
    <>
      <div className="photo-grid">
        {items.map((photo, index) => (
          <figure className="photo-card" key={photo.url}>
            <button
              type="button"
              className="photo-thumb"
              onClick={() => open(index)}
              aria-label={`View full size: ${photo.alt}`}
            >
              <img src={photo.url} alt={photo.alt} loading="lazy" />
            </button>
            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {active && activeIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
        >
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={close}
              aria-label="Close photo viewer"
            >
              ×
            </button>

            {hasPrev && (
              <button
                type="button"
                className="lightbox-nav lightbox-prev"
                onClick={goPrev}
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            <div className="lightbox-stage">
              <img
                src={fullSizeUrl(active.url)}
                alt={active.alt}
                className="lightbox-image"
              />
              {active.caption && <p className="lightbox-caption">{active.caption}</p>}
            </div>

            {hasNext && (
              <button
                type="button"
                className="lightbox-nav lightbox-next"
                onClick={goNext}
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
