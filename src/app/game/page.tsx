import type { Metadata } from 'next';
import MemoryGame from '@/components/MemoryGame';
import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';

export const metadata: Metadata = {
  title: 'GayC/DC Memory Match — high voltage fan club game',
  description:
    'A campy, lightning-charged memory matching game starring the members of GayC/DC.',
};

export const dynamic = 'force-dynamic';

export default async function GamePage() {
  const data = await getSiteData();
  return (
    <>
      <main>
        <section className="mem-section">
          <MemoryGame />
        </section>
      </main>
      <Footer data={data} />
    </>
  );
}
