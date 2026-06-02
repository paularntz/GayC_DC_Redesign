import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function BioPage() {
  const data = await getSiteData();
  return (
    <>
      <main className="section">
        <p className="eyebrow">The Legend</p>
        <h1>GayC/DC Bio</h1>
        <div className="bio-copy pink-panel" style={{ padding: '40px 30px', marginTop: 30 }}>
          {data.bio.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <img 
              src="https://img1.wsimg.com/isteam/ip/0f6f3bde-e760-40b5-b66a-08d8f32b8882/026RET02.jpg/:/cr=t:0%25,l:5.66%25,w:88.68%25,h:100%25/rs=w:600,h:450,cg:true" 
              alt="GayC/DC crew" 
              style={{ maxWidth: '100%', borderRadius: 16, border: '2px solid var(--pink)', boxShadow: '0 0 25px rgba(255,20,157,0.3)' }} 
            />
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10, fontFamily: 'system-ui, sans-serif' }}>Photo by Alex Solca</p>
          </div>
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
