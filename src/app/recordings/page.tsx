import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function RecordingsPage() {
  const data = await getSiteData();
  return (
    <>
      <main className="section">
        <p className="eyebrow">Releases</p>
        <h1>Recordings</h1>
        <div className="cards" style={{ marginTop: 30 }}>
          {data.recordings.map((r) => (
            <article className="record-card" key={r.title} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: 30, alignItems: 'center' }}>
              <img 
                src={r.cover} 
                alt={`${r.title} Cover`} 
                style={{ width: '100%', borderRadius: 12, border: '2px solid var(--pink)', boxShadow: '0 0 15px rgba(255,20,157,0.2)' }} 
              />
              <div>
                <span className="date-pill" style={{ marginBottom: 12 }}>{r.year} Release</span>
                <h2 style={{ fontSize: 32, margin: '10px 0' }}>{r.title}</h2>
                <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 18, marginBottom: 20 }}>
                  Featuring: {r.tracks.join(', ')}
                </p>
                <a className="button" href={r.url} target="_blank" rel="noopener noreferrer">
                  Listen on SoundCloud
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
