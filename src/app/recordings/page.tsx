import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function RecordingsPage() {
  const data = await getSiteData();
  const tracks = data.trackRecordings ?? [];

  return (
    <>
      <main className="section">
        <p className="eyebrow">Audio</p>
        <h1>Recordings</h1>
        
        <p className="lede" style={{ marginBottom: 40, textAlign: 'left', marginLeft: 0 }}>
          Check out our versions of some of your favorite AC/DC songs. 
          Listen to individual tracks below or head over to SoundCloud for the full experience.
        </p>

        <div className="cards">
          {tracks.map((track) => (
            <article className="feature-card" key={track.title} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ color: 'var(--yellow)', marginBottom: 12 }}>{track.title}</h3>
                <p className="notes" style={{ fontSize: 16, marginBottom: 20 }}>{track.description}</p>
              </div>
              <a className="button small" href={track.url} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
                {track.url.startsWith('/') ? 'Listen Now' : 'Listen on SoundCloud'}
              </a>
            </article>
          ))}
        </div>

        {data.soundcloudPlaylist && (
          <div className="actions" style={{ marginTop: 60, justifyContent: 'flex-start' }}>
            <a className="button" href={data.soundcloudPlaylist} target="_blank" rel="noopener noreferrer">
              Dirty Dudes Done Dirt Cheap — full playlist on SoundCloud
            </a>
          </div>
        )}
      </main>
      <Footer data={data} />
    </>
  );
}
