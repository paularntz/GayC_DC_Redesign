import Link from 'next/link';
import type { SiteData } from '@/lib/data';

export function Footer({ data }: { data: SiteData }) {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <strong className="footer-title">GayC/DC official</strong>
          <p className="footer-desc">High voltage queer rock from Los Angeles.</p>
        </div>
        <div className="socials">
          <a href={data.socials.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a href={data.socials.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={data.socials.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
          <a href={data.socials.soundcloud} target="_blank" rel="noopener noreferrer">SoundCloud</a>
          <Link href="/contact">Booking</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <small>© 2026 GayC/DC official. All rights reserved.</small>
      </div>
    </footer>
  );
}
