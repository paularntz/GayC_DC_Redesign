import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';
import ContactForm from './ui';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const data = await getSiteData();
  return (
    <>
      <main className="section">
        <p className="eyebrow">Drop us a line</p>
        <h1>Contact the Band</h1>
        <div className="grid" style={{ marginTop: 30, alignItems: 'start' }}>
          <article className="contact-card">
            <h2>Booking Info</h2>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 17, lineHeight: 1.6 }}>
              Want to book the band, send us love letters, or report useful trouble? Get in touch! We play festivals, clubs, pride events, and anywhere that needs high-voltage gay rock.
            </p>
            <p style={{ fontSize: 18, marginTop: 24 }}>
              <strong>Email:</strong> <a href={`mailto:${data.brand.email}`} style={{ color: 'var(--hot)', textDecoration: 'none' }}>{data.brand.email}</a>
            </p>
          </article>
          <ContactForm />
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
