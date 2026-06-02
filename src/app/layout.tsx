import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'GayC/DC official — high voltage queer rock',
  description: "GayC/DC, the world's first and only all-gay tribute to the music of AC/DC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-wrapper">
          <Nav />
          <div className="content-wrapper">{children}</div>
        </div>
      </body>
    </html>
  );
}
