'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function FloatingCart() {
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
        console.error('Failed to load cart for floating button', e);
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

  if (cartCount === 0) return null;

  return (
    <>
      <style jsx>{`
        .floating-cart-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: linear-gradient(
            45deg, 
            #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff,
            #ff0000
          );
          background-size: 400% 400%;
          animation: rainbow-flow 8s ease infinite;
          color: white;
          border: 4px solid var(--yellow);
          border-radius: 50px;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 30px rgba(255, 20, 157, 0.8);
          z-index: 9999;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-decoration: none;
        }

        @keyframes rainbow-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .floating-cart-btn:hover {
          transform: scale(1.2) rotate(5deg);
          box-shadow: 0 0 50px var(--yellow), 0 0 20px white;
          filter: brightness(1.2);
        }

        .cart-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: var(--yellow);
          color: var(--black);
          font-size: 18px;
          font-weight: 950;
          padding: 4px 10px;
          border-radius: 50%;
          border: 3px solid var(--pink);
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }

        .sparkle {
          position: absolute;
          font-size: 20px;
          pointer-events: none;
          animation: sparkle-anim 2s infinite;
        }

        @keyframes sparkle-anim {
          0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        }
      `}</style>

      <Link href="/cart" className="floating-cart-btn" aria-label="View Shopping Cart">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span className="cart-badge">{cartCount}</span>
        <span className="sparkle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>✨</span>
        <span className="sparkle" style={{ bottom: '10%', right: '10%', animationDelay: '0.5s' }}>✨</span>
      </Link>
    </>
  );
}
