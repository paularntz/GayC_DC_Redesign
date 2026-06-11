import { notFound } from 'next/navigation';
import { SetlistPlayer } from '@/components/SetlistPlayer';
import { getSetlistBySlug, listSetlists } from '@/data/setlists';

export const dynamic = 'force-static';

type RouteParams = {
  slug: string;
};

export function generateStaticParams(): RouteParams[] {
  return listSetlists().map((setlist) => ({ slug: setlist.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const setlist = getSetlistBySlug(slug);
  if (!setlist) {
    return {};
  }

  return {
    title: `${setlist.title} | GayC/DC Setlists`,
    description: setlist.description,
  };
}

export default async function SetlistPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const setlist = getSetlistBySlug(slug);
  if (!setlist) {
    notFound();
  }

  return <SetlistPlayer setlist={setlist} allSetlists={listSetlists()} />;
}
