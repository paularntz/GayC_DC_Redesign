import { Footer } from '@/components/Footer';
import { ShowCard } from '@/components/ShowCard';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ShowsPage() {
  const data = await getSiteData();
  return (
    <>
      <main className="section">
        <p className="eyebrow">Tour Dates</p>
        <h1>Monsters of Cock Tour</h1>
        <div className="cards" style={{ marginBottom: 60 }}>
          {data.upcomingShows.map((show) => (
            <ShowCard key={show.date + show.venue} show={show} />
          ))}
        </div>

        <section className="pink-panel" style={{ padding: '40px 30px' }}>
          <h2 style={{ fontSize: 32, marginBottom: 20 }}>Past Gigs</h2>
          <ol className="past-list">
            {data.pastShows
              .slice()
              .reverse()
              .map((show) => (
                <li key={show.number}>
                  <strong>{show.date}</strong> — {show.details}
                </li>
              ))}
          </ol>
        </section>
      </main>
      <Footer data={data} />
    </>
  );
}
