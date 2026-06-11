import Link from 'next/link';
import { listSetlists } from '@/data/setlists';

export const metadata = {
  title: 'Setlists | GayC/DC',
  description: 'Setlists and rehearsal players for GayC/DC.',
};

export default function SetlistsIndexPage() {
  const setlists = listSetlists();

  return (
    <section
      style={{
        width: 'min(900px, calc(100vw - 2rem))',
        margin: '0 auto',
        padding: 'clamp(1.5rem, 2vw, 2.5rem)',
        borderRadius: '20px',
        background:
          'linear-gradient(135deg, rgba(30, 0, 18, 0.92) 0%, rgba(15, 0, 9, 0.96) 100%)',
        border: '1px solid rgba(233, 30, 140, 0.28)',
        boxShadow: '0 0 60px rgba(233, 30, 140, 0.12), 0 24px 56px rgba(0,0,0,0.6)',
      }}
    >
      <p
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#ffd700',
          margin: '0 0 0.4rem',
        }}
      >
        GayC/DC
      </p>
      <h1
        style={{
          margin: '0 0 0.5rem',
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#ffffff',
        }}
      >
        Setlists &amp; Players
      </h1>
      <p
        style={{
          color: 'rgba(255, 220, 235, 0.72)',
          lineHeight: 1.65,
          margin: '0 0 2rem',
          maxWidth: '52ch',
        }}
      >
        Rehearsal players built from Dropbox audio, ready to run straight through the current song order.
      </p>
      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {setlists.map((setlist) => (
          <Link
            key={setlist.slug}
            href={`/setlists/${setlist.slug}`}
            style={{
              display: 'block',
              padding: '1.15rem 1.3rem',
              borderRadius: '14px',
              border: '1px solid rgba(233, 30, 140, 0.25)',
              background: 'rgba(233, 30, 140, 0.05)',
              color: 'inherit',
              textDecoration: 'none',
              position: 'relative',
              overflow: 'hidden',
              transition:
                'border-color 0.18s ease, background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(135deg, rgba(233,30,140,0.12) 0%, rgba(255,215,0,0.06) 60%, transparent 100%)',
                opacity: 0,
                transition: 'opacity 0.18s ease',
                pointerEvents: 'none',
              }}
            />
            <strong
              style={{
                display: 'block',
                fontSize: '1.05rem',
                color: '#ffffff',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {setlist.title}
            </strong>
            <span
              style={{
                display: 'block',
                marginTop: '0.35rem',
                color: 'rgba(255, 220, 235, 0.7)',
                fontSize: '0.9rem',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {setlist.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
