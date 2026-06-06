import { Footer } from '@/components/Footer';
import { getSiteData } from '@/lib/data';
import { CartClient } from '@/components/CartClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await getSiteData();

  return (
    <>
      <CartClient siteData={data} />
      <Footer data={data} />
    </>
  );
}
