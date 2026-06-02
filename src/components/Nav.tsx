import Link from 'next/link';

const nav = [
  ['Shows', '/shows'],
  ['Bio', '/bio'],
  ['Recordings', '/recordings'],
  ['Videos', '/videos'],
  ['Merch', '/merchandise'],
  ['Press', '/press'],
  ['Photos', '/photo-gallery'],
  ['Contact', '/contact'],
];

export function Nav() {
  return (
    <header className="nav">
      <Link className="brand" href="/">
        <img src="https://paularntz-com.netlify.app/gaycdc-logo.png" alt="GayC/DC logo" />
        <span>GayC/DC</span>
      </Link>
      <nav>
        {nav.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
