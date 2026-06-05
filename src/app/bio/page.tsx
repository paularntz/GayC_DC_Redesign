import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function BioPage() {
  const data = await getSiteData();
  const bioImage = data.bioImage;

  return (
    <>
      <main className="section">
        <p className="eyebrow">The Legend</p>
        <h1>GayC/DC Bio</h1>
        <div className="bio-copy pink-panel" style={{ padding: '40px 30px', marginTop: 30 }}>
          {data.bio.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {bioImage && (
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <img
                src={bioImage.url}
                alt="GayC/DC crew"
                style={{
                  maxWidth: '100%',
                  borderRadius: 16,
                  border: '2px solid var(--pink)',
                  boxShadow: '0 0 25px rgba(255, 20, 157, 0.3)',
                }}
              />
              {bioImage.credit && (
                <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10, fontFamily: 'system-ui, sans-serif' }}>
                  {bioImage.credit}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
