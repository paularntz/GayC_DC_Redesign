'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const nav = [
  ['Shows', '/shows'],
  ['Bio', '/bio'],
  ['Recordings', '/recordings'],
  ['Videos', '/videos'],
  ['Merch', '/merchandise'],
  ['Press', '/press'],
  ['Photos', '/photo-gallery'],
  ['Game', '/game'],
  ['Contact', '/contact'],
];

export function Nav() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const savedCart = localStorage.getItem('gaycdc_cart');
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        console.error('Failed to load cart for nav', e);
        setCartCount(0);
      }
    };

    updateCartCount();

    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  return (
    <header className="nav">
      <Link className="brand" href="/">
        <img src="https://paularntz-com.netlify.app/gaycdc-logo.png" alt="GayC/DC logo" />
      </Link>
      <nav>
        {nav.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        {cartCount > 0 && (
          <Link href="/cart">
            Cart ({cartCount})
          </Link>
        )}
      </nav>
    </header>
  );
}
