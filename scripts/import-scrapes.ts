/**
 * Parses GAYC_DC_Scrapes markdown exports and merges structured content into siteData.json.
 * Run: npx tsx scripts/import-scrapes.ts [scrapesDir]
 * Then: npm run seed
 */
import * as fs from 'fs';
import * as path from 'path';

const scrapesDir =
  process.argv[2] || path.join(process.env.HOME || '', 'Downloads/GAYC_DC_Scrapes');
const siteDataPath = path.join(__dirname, '../src/data/siteData.json');

const IMG_BASE =
  'https://img1.wsimg.com/isteam/ip/0f6f3bde-e760-40b5-b66a-08d8f32b8882';
const BLOB_BASE =
  'https://img1.wsimg.com/blobby/go/0f6f3bde-e760-40b5-b66a-08d8f32b8882/downloads';

function readScrape(name: string): string {
  const file = path.join(scrapesDir, name);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing scrape file: ${file}`);
  }
  return fs.readFileSync(file, 'utf-8');
}

function extractYoutubeIds(md: string): string[] {
  const ids = new Set<string>();
  const re = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) ids.add(m[1]);
  return [...ids];
}

function extractImageUrls(md: string): string[] {
  const urls = new Set<string>();
  const re = /!\[[^\]]*\]\((https:\/\/img1\.wsimg\.com[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (!m[1].includes('logo/70b972a1')) urls.add(m[1]);
  }
  return [...urls];
}

function extractPdfLinks(md: string): { title: string; url: string }[] {
  const items: { title: string; url: string }[] = [];
  const re = /\[([^\]]+)\]\((https:\/\/img1\.wsimg\.com\/blobby[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const title = m[1]
      .replace(/\s*\(pdf\)\s*Download$/i, '')
      .replace(/\\+/g, '')
      .replace(/\s*\|\s*/g, ' | ')
      .trim();
    if (title.toLowerCase().includes('download') && title.length < 12) continue;
    items.push({ title, url: m[2] });
  }
  return items;
}

function extractBioParagraphs(md: string): string {
  const start = md.indexOf('#### GayC/DC:');
  const end = md.indexOf('![A colorful group');
  if (start === -1 || end === -1) return '';
  return md
    .slice(start + 4, end)
    .replace(/^#.*$/gm, '')
    .trim();
}

function buildContent() {
  const videosMd = readScrape('videos.md');
  const pressMd = readScrape('press.md');
  const photosMd = readScrape('photo-gallery.md');
  const merchMd = readScrape('merchandise.md');
  const recordingsMd = readScrape('recordings.md');
  const contactMd = readScrape('contact.md');
  const bioMd = readScrape('bio.md');

  const youtubeIds = extractYoutubeIds(videosMd);
  const videoMeta: Record<
    string,
    { title: string; description: string }
  > = {
    Nzmo9wTRylc: {
      title: 'Gay Boy Boogie',
      description:
        "Our third and newest official video! Directed by Frank Meyer (FEAR, Streetwalkin' Cheetahs) and starring Johnny Martin (L.A. Guns, Tiffany)!",
    },
    YfKLCfNepew: {
      title: 'Highway To Hell',
      description:
        "Our second official video! Directed by Frank Meyer (FEAR, Streetwalkin' Cheetahs), starring Johnny Martin (L.A. Guns, Tiffany) and guest starring dUg Pinnick (Kings X) and John Bush (Armored Saint, Anthrax)!",
    },
    z2c_nxevlDA: {
      title: 'Dirty Dudes Done Dirt Cheap',
      description:
        'Our first official video! Directed by Jasten King and filmed at the iconic Viper Room on Sunset Blvd in Los Angeles!',
    },
  };

  const videos = youtubeIds.map((id) => ({
    title: videoMeta[id]?.title || 'Official Video',
    youtubeId: id,
    label: 'Official Music Video',
    description: videoMeta[id]?.description || '',
  }));

  const pressItems = extractPdfLinks(pressMd);

  const photoUrls = extractImageUrls(photosMd);
  const photoCaptions: Record<string, { alt: string; caption: string }> = {
    '008RET.jpg': {
      alt: 'Five men in bold, eclectic costumes posing against a blue background.',
      caption: 'Photo by Alex Solca, 3/15/2026',
    },
    '074RET.jpg': {
      alt: 'Man in pink suit and red hat with a black feather boa smiles against blue background.',
      caption: 'Photo by Alex Solca, 3/15/2026',
    },
    'dx0a0768.jpg': {
      alt: 'Performer in devil horns reads from a Holy Bible on stage, holding a microphone.',
      caption: 'Chris Freeman, Viper Room, 9/29/2017 — Photo by Jack Lue',
    },
    'GayCDC%20Steve4.jpg': {
      alt: 'Energetic musician with mohawk playing electric guitar in bold outfit.',
      caption: 'Photo by Alex Solca, 3/15/2025',
    },
    'dx0a6432.jpg': {
      alt: 'Energetic guitarist performing passionately on stage with vibrant blue lighting.',
      caption: 'Steve McKnight, Viper Room, 7/28/2017 — photo by Jack Lue',
    },
    '090RET.jpg': { alt: 'GayC/DC band photo', caption: 'Photo by Alex Solca, 3/15/2026' },
    'me2.jpg': { alt: 'GayC/DC band member', caption: 'Photo by Alex Solca, 3/15/2026' },
    '060RET.jpg': { alt: 'GayC/DC band photo', caption: 'Photo by Alex Solca, 3/15/2026' },
    '101RET.jpg': { alt: 'GayC/DC band photo', caption: 'Photo by Alex Solca, 3/15/2026' },
    '026RET02.jpg': {
      alt: 'A colorful group of five men in eclectic, bold outfits posing against a blue background.',
      caption: 'Photo by Alex Solca',
    },
    'Screenshot%202024-12-13': {
      alt: 'GayC/DC performance screenshot',
      caption: 'December 2024',
    },
    'Screenshot%202024-08-01': {
      alt: 'GayC/DC performance screenshot',
      caption: 'August 2024',
    },
  };

  const photos = photoUrls.map((url) => {
    const key = Object.keys(photoCaptions).find((k) => url.includes(k)) || '';
    const meta = photoCaptions[key] || { alt: 'GayC/DC photo', caption: '' };
    return { url, alt: meta.alt, caption: meta.caption };
  });

  const dirtyDudesUrl =
    'https://soundcloud.com/chris-freeman-815714767/sets/dirty-dudes-done-dirt-cheap?si=e16e95ed01d34946aa1677eb8e81b634&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing';

  const trackRecordings = ['PNP', 'Big Balls', 'Touch Too Much'].map((title) => ({
    title,
    description: `Here's a link to ${title}! Go to SoundCloud to check out our versions of some of your favorite AC/DC songs.`,
    url: dirtyDudesUrl,
  }));

  const bioText = extractBioParagraphs(bioMd);
  const bioImageUrl = `${IMG_BASE}/026RET02.jpg/:/cr=t:0%25,l:5.66%25,w:88.68%25,h:100%25/rs=w:600,h:450,cg:true`;

  return {
    bio: bioText || undefined,
    bioImage: { url: bioImageUrl, credit: 'Photo by Alex Solca' },
    contact: {
      heading: 'Contact Us',
      intro: 'Reach out, we\'ll get right back to you!',
      prompts: [
        'Have questions?',
        'Want to submit a merchandise order request?',
        'Want to book a show?',
      ],
    },
    videos,
    press: {
      intro: 'A selection of articles on GayC/DC',
      items: pressItems,
    },
    photos: {
      title: 'Photo Gallery',
      subtitle: 'Studio photos by Alex Solca',
      photographerUrl: 'https://alexsolca.zenfolio.com',
      items: photos,
    },
    merchandise: {
      intro:
        'Below are all of our available merchandise items and prices. Once you know what you\'d like and how much it will cost, add in the appropriate postage charge, then click on our Contact page and email us the request.',
      shippingNote:
        'ALL OF OUR MERCHANDISE IS AVAILABLE AT SHOWS, OR YOU CAN BUY HERE USING PAYPAL. WE ALSO TAKE ZELLE AND VENMO. FOR SHIPPING IN THE USA, PLEASE ADD $3 FOR EACH STICKER ORDER, AND $10 FOR EACH SHIRT ORDERED. (FOR OVERSEAS ORDERS, WE\'LL NEED TO DETERMINE EXACT POSTAGE)',
      categories: buildMerchCategories(merchMd),
    },
    trackRecordings,
    soundcloudPlaylist: dirtyDudesUrl,
  };
}

function buildMerchCategories(md: string) {
  const shirtImages = [
    `${IMG_BASE}/Screen%20Shot%202019-08-09%20at%2010.09.54%20PM.png/:/rs=w:360,h:270,cg:true,m/cr=w:360,h:270`,
    `${IMG_BASE}/Screen%20Shot%202022-04-28%20at%202.29.50%20AM.png/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:360,cg:true`,
    `${IMG_BASE}/Screen%20Shot%202023-10-15%20at%2011.10.33%20PM.png/:/cr=t:0%25,l:1.51%25,w:96.98%25,h:96.98%25/rs=w:360,cg:true,m`,
  ];

  return [
    {
      name: 'T-Shirts',
      description: 'We have a variety of styles and sizes',
      items: [
        {
          name: 'Basic logos',
          price: '$30',
          description:
            'Our bolt/boa icon on the front and name logo on the back. We also have a single-sided version with the logo above the icon on the front.',
          imageUrl: shirtImages[0],
        },
        {
          name: 'Neon logo',
          price: '$30',
          description: 'Our logo in pink and red neon with LA/CA on the back',
          imageUrl: shirtImages[1],
        },
        {
          name: '10th anniversary logo',
          price: '$30',
          description: 'Our 10th anniversary logo with slogan on the back.',
          imageUrl: shirtImages[2],
        },
      ],
    },
    {
      name: 'Stickers',
      description: 'Ready to stick, anywhere you like! Any 2 for $1',
      items: [
        { name: 'GayC/DC logo', price: '2 for $1', description: 'Our basic logo' },
        { name: 'Icon image', price: '2 for $1', description: 'Our bolt with boa design' },
        {
          name: 'Dirty Dudes Done Dirt Cheap',
          price: '2 for $1',
          description: 'Our altered version of the iconic album cover',
        },
      ],
    },
    {
      name: 'Magnets & picks',
      description: 'More ways to show your love',
      items: [
        { name: 'Magnets', price: '2 for $1', description: 'A popular way to impress your friends' },
        {
          name: 'Guitar picks',
          price: '2 for $1',
          description: "Who cares if you can't actually play guitar? You need these!",
        },
      ],
    },
    {
      name: 'Patches & buttons',
      description: 'More ways to show your love',
      items: [
        { name: 'Patches', price: '$5 each', description: "Stitch 'em to that ol' denim vest!" },
        {
          name: 'Buttons',
          price: '$1 each',
          description: 'These are perfect for any jacket, cap or guitar strap!',
        },
      ],
    },
  ];
}

function main() {
  if (!fs.existsSync(scrapesDir)) {
    throw new Error(`Scrapes directory not found: ${scrapesDir}`);
  }

  const siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf-8'));
  const imported = buildContent();

  if (imported.bio) siteData.bio = imported.bio;
  siteData.bioImage = imported.bioImage;
  siteData.contact = imported.contact;
  siteData.videos = imported.videos;
  siteData.press = imported.press;
  siteData.photos = imported.photos;
  siteData.merchandise = imported.merchandise;
  siteData.trackRecordings = imported.trackRecordings;
  siteData.soundcloudPlaylist = imported.soundcloudPlaylist;

  fs.writeFileSync(siteDataPath, JSON.stringify(siteData, null, 2) + '\n');
  console.log('Merged scrape content into', siteDataPath);
  console.log(
    `  videos: ${imported.videos.length}, press: ${imported.press.items.length}, photos: ${imported.photos.items.length}`
  );
}

main();
