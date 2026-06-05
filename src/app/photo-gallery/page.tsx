import { Footer } from '@/components/Footer';
import { PhotoGallery } from '@/components/PhotoGallery';
import { getSiteData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();
  const gallery = data.photos;

  return (
    <>
      <main className="section">
        <p className="eyebrow">Photo Gallery</p>
        <h1>{gallery?.title ?? 'Photo Gallery'}</h1>
        {gallery?.subtitle && (
          <p className="lede" style={{ marginBottom: 12 }}>
            {gallery.subtitle}
            {gallery.photographerUrl && (
              <>
                {' — '}
                <a href={gallery.photographerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hot)' }}>
                  alexsolca.zenfolio.com
                </a>
              </>
            )}
          </p>
        )}
        <PhotoGallery items={gallery?.items ?? []} />
      </main>
      <Footer data={data} />
    </>
  );
}
