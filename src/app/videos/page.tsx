import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();
  const videos = data.videos ?? [];

  return (
    <>
      <main className="section">
        <p className="eyebrow">Videos</p>
        <h1>Official Videos</h1>
        <p className="lede" style={{ marginBottom: 40 }}>
          See more on our{' '}
          <a href={data.socials.youtube} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hot)' }}>
            YouTube channel
          </a>
          .
        </p>
        <div className="video-list">
          {videos.map((video) => (
            <article className="video-card pink-panel" key={video.youtubeId}>
              <div className="video-embed">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}`}
                  title={`GayC/DC — ${video.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="video-copy">
                <span className="date-pill">{video.label}</span>
                <h2>{video.title}</h2>
                <p>{video.description}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
