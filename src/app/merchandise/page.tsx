import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();
  const merch = data.merchandise;

  return (
    <>
      <main className="section">
        <p className="eyebrow">Merchandise</p>
        <h1>GayC/DC Merchandise</h1>
        {merch?.intro && (
          <p className="lede" style={{ marginBottom: 24, maxWidth: 900 }}>
            {merch.intro}
          </p>
        )}
        <p style={{ fontFamily: 'system-ui, sans-serif', marginBottom: 40 }}>
          <Link href="/contact" className="button small">
            Contact us to order
          </Link>
        </p>

        {(merch?.categories ?? []).map((category) => (
          <section className="merch-category" key={category.name}>
            <h2>{category.name}</h2>
            {category.description && <p className="merch-cat-desc">{category.description}</p>}
            <div className="merch-grid">
              {category.items.map((item) => (
                <article className="merch-item show-card" key={`${category.name}-${item.name}`}>
                  {'imageUrl' in item && item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="merch-img" />
                  )}
                  <h3>{item.name}</h3>
                  <p className="merch-price">{item.price}</p>
                  <p className="notes">{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        {merch?.shippingNote && (
          <div className="pink-panel section" style={{ marginTop: 48, padding: 28 }}>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
              {merch.shippingNote}
            </p>
          </div>
        )}
      </main>
      <Footer data={data} />
    </>
  );
}
