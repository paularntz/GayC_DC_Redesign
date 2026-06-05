import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';
import ContactForm from './ui';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const data = await getSiteData();
  const contact = data.contact;

  return (
    <>
      <main className="section">
        <p className="eyebrow">Drop us a line</p>
        <h1>{contact?.heading ?? 'Contact the Band'}</h1>
        <div className="grid" style={{ marginTop: 30, alignItems: 'start' }}>
          <article className="contact-card">
            <h2>GayC/DC official</h2>
            {contact?.intro && (
              <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 17, lineHeight: 1.6 }}>
                {contact.intro}
              </p>
            )}
            {(contact?.prompts ?? []).length > 0 && (
              <>
                <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 17, marginTop: 20 }}>
                  Do you:
                </p>
                <ul className="contact-prompts">
                  {contact.prompts.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            <p style={{ fontSize: 18, marginTop: 24 }}>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${data.brand.email}`} style={{ color: 'var(--hot)', textDecoration: 'none' }}>
                {data.brand.email}
              </a>
            </p>
          </article>
          <ContactForm />
        </div>
      </main>
      <Footer data={data} />
    </>
  );
}
