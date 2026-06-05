import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();
  const press = data.press;

  return (
    <>
      <main className="section">
        <p className="eyebrow">Press</p>
        <h1>Press</h1>
        {press?.intro && (
          <p className="lede" style={{ marginBottom: 40 }}>
            {press.intro}
          </p>
        )}
        <ul className="press-list">
          {(press?.items ?? []).map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="press-link">
                {item.title}
                <span className="press-dl">Download PDF</span>
              </a>
            </li>
          ))}
        </ul>
      </main>
      <Footer data={data} />
    </>
  );
}
