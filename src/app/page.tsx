import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { ShowCard } from '@/components/ShowCard';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getSiteData();
  return (
    <>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">{data.hero.eyebrow}</p>
            <h1>{data.hero.headline}</h1>
            <p className="lede">{data.hero.body}</p>
            <div className="actions">
              <Link className="button" href="/shows">
                {data.hero.primaryCta}
              </Link>
              <Link className="button ghost" href="/contact">
                {data.hero.secondaryCta}
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <img src={data.brand.logoUrl} alt="GayC/DC official logo" />
            <div className="bolt">⚡</div>
          </div>
        </section>

        <section className="section pink-panel" style={{ margin: '0 6vw' }}>
          <h2>Next Shows</h2>
          <div className="cards">
            {data.upcomingShows.slice(0, 3).map((show) => (
              <ShowCard key={show.date + show.venue} show={show} compact />
            ))}
          </div>
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <Link className="button" href="/shows">
              All Tour Dates
            </Link>
          </div>
        </section>

        <section className="section">
          <h2>Amplifier Updates</h2>
          <div className="grid">
            {data.updates.map((item, idx) => (
              <article className="feature-card" key={idx}>
                <h3>BAND UPDATE</h3>
                <p style={{ fontFamily: 'system-ui, sans-serif' }}>{item}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer data={data} />
    </>
  );
}
