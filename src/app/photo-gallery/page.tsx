import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();
  return (
    <>
      <main className="section">
        <p className="eyebrow">Photo Gallery</p>
        <h1>Photo Gallery</h1>
        <div className="pink-panel section">
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 18, lineHeight: 1.6 }}>
            This section is currently being updated as part of the brand redesign. We are preparing our official merch store, live tour videos, press clippings, and performance photo gallery.
          </p>
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 18, marginTop: 20 }}>
            In the meantime, follow our official channels to stay in the loop!
          </p>
          <div className="actions" style={{ marginTop: 30 }}>
            <a className="button" href={data.socials.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a className="button ghost" href={data.socials.youtube} target="_blank" rel="noopener noreferrer">
              YouTube Channel
            </a>
          </div>
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
