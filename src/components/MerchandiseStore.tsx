'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MerchItem {
  name: string;
  price: string;
  description: string;
  imageUrl?: string;
}

interface MerchCategory {
  name: string;
  description?: string;
  items: MerchItem[];
}

interface MerchData {
  intro?: string;
  shippingNote?: string;
  categories: MerchCategory[];
}

interface CartItem {
  id: string; // generated from name + size + style
  name: string;
  category: string;
  price: number; // numeric price
  priceStr: string; // original price string
  description: string;
  imageUrl?: string;
  selectedSize?: string;
  selectedStyle?: string;
  quantity: number;
}

interface MerchandiseStoreProps {
  merch: MerchData;
}

// Helper to parse numeric price from string
function parsePrice(priceStr: string): number {
  if (priceStr.toLowerCase().includes('2 for $1')) return 0.50;
  const match = priceStr.match(/\$(\d+(\.\d+)?)/);
  if (match) return parseFloat(match[1]);
  return 0.0;
}

export function MerchandiseStore({ merch }: MerchandiseStoreProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Added to cart confirmation lightbox state
  const [addedItemLightbox, setAddedItemLightbox] = useState<{
    isOpen: boolean;
    itemName: string;
    itemCategory: string;
    itemPrice: string;
    itemImage?: string;
    sassyQuote: string;
  } | null>(null);

  // Pool of sassy and gay messages about the product
  const sassyQuotes = [
    "Oh honey, this is going to look ABSOLUTELY fabulous on you! Get ready to turn some heads! 💅✨",
    "Darling, you are going to look so gorgeous in this, it's practically a hate crime. 💖👑",
    "High voltage hotness incoming! This is officially certified to boost your charisma by 1000%! ⚡🔥",
    "Yas queen! You're going to rock this harder than Angus rocks a schoolboy uniform! 🎸🍒",
    "Alert the paparazzi! Someone is about to look drop-dead stunning. Work it, honey! 📸🌟",
    "Strap in, beautiful! This purchase officially marks you as the trendiest icon in the crowd! 💋🕺",
    "Let's be honest, you're not just wearing this—you are serving it on a silver platter! Bon appetit! 🍽️✨",
    "Get ready to sweat-soak the stage! This gear is made for pure, unfiltered rock 'n' roll attitude! 🤘💖",
    "Absolutely delicious choice! They aren't ready for this level of sheer, unadulterated glamour. 🥵🌈",
    "For those about to look incredibly hot, we salute you! Rock on, you gorgeous thing! 🫡🔥"
  ];

  // Sizing & style selections per item
  const [itemSelections, setItemSelections] = useState<{
    [key: string]: { size?: string; style?: string; quantity: number };
  }>({});

  // Initialize and load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('gaycdc_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem('gaycdc_cart', JSON.stringify(cart));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    }
  }, [cart]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add Item to Cart
  const handleAddToCart = (item: MerchItem, category: string) => {
    const isTShirt = category === 'T-Shirts';
    const selections = itemSelections[item.name] || { quantity: 1 };
    
    // Check required options for shirts
    if (isTShirt && !selections.size) {
      alert('Please select a size for your shirt!');
      return;
    }
    
    const price = parsePrice(item.price);
    const id = `${item.name}-${isTShirt ? selections.size : ''}`;

    const existingIndex = cart.findIndex((cartItem) => cartItem.id === id);
    let updatedCart = [...cart];

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += selections.quantity || 1;
    } else {
      updatedCart.push({
        id,
        name: item.name,
        category,
        price,
        priceStr: item.price,
        description: item.description,
        imageUrl: item.imageUrl,
        selectedSize: isTShirt ? selections.size : undefined,
        selectedStyle: undefined,
        quantity: selections.quantity || 1
      });
    }

    setCart(updatedCart);
    try {
      localStorage.setItem('gaycdc_cart', JSON.stringify(updatedCart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }

    // Reset local state selection quantity but keep size/style for ease
    setItemSelections({
      ...itemSelections,
      [item.name]: {
        ...selections,
        quantity: 1
      }
    });

    // Select random quote
    const randomQuote = sassyQuotes[Math.floor(Math.random() * sassyQuotes.length)];

    // Trigger the custom added-to-cart confirmation lightbox
    setAddedItemLightbox({
      isOpen: true,
      itemName: item.name,
      itemCategory: category,
      itemPrice: item.price,
      itemImage: item.imageUrl,
      sassyQuote: randomQuote
    });
  };

  // Update item selection state
  const handleSelectionChange = (itemName: string, field: 'size' | 'style' | 'quantity', value: any) => {
    const current = itemSelections[itemName] || { quantity: 1 };
    setItemSelections({
      ...itemSelections,
      [itemName]: {
        ...current,
        [field]: value
      }
    });
  };

  return (
    <>
      <style jsx global>{`
        .store-container {
          position: relative;
        }
        .add-cart-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
          border-top: 1px solid rgba(255, 20, 157, 0.15);
          padding-top: 16px;
        }
        .add-cart-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .qty-input {
          background: var(--black);
          border: 1px solid var(--pink);
          color: white;
          padding: 8px;
          border-radius: 4px;
          width: 60px;
          text-align: center;
          font-family: inherit;
        }
        .option-select {
          background: var(--black);
          border: 1px solid var(--pink);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          width: 100%;
        }
        .floating-cart-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: var(--pink);
          color: white;
          border: 3px solid var(--yellow);
          border-radius: 50px;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 20px var(--pink);
          z-index: 999;
          transition: transform 0.2s;
          text-decoration: none;
        }
        .floating-cart-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 30px var(--pink), 0 0 10px var(--yellow);
        }
        .cart-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: var(--yellow);
          color: var(--black);
          font-size: 14px;
          font-weight: 950;
          padding: 3px 8px;
          border-radius: 50%;
          border: 2px solid var(--pink);
        }

        /* Lightbox and confetti animations */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .lightbox-content {
          background: var(--deep);
          border: 4px solid var(--pink);
          border-radius: 16px;
          width: 100%;
          max-width: 650px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 0 50px rgba(255, 20, 157, 0.6);
          animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes scaleUp {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        /* Huge banner with animated pink overlay */
        .lightbox-banner {
          position: relative;
          background: var(--black);
          padding: 40px 20px;
          text-align: center;
          border-bottom: 3px solid var(--pink);
          overflow: hidden;
        }
        .lightbox-banner h2 {
          font-family: Impact, sans-serif;
          font-size: 42px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0;
          color: var(--yellow);
          text-shadow: 0 0 15px rgba(255, 230, 0, 0.8);
          z-index: 2;
          position: relative;
        }
        .lightbox-banner .banner-sub {
          font-family: Impact, sans-serif;
          font-size: 20px;
          color: var(--white);
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          z-index: 2;
          position: relative;
        }
        .pink-overlay-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255, 20, 157, 0) 0%,
            rgba(255, 20, 157, 0.65) 50%,
            rgba(255, 20, 157, 0) 100%
          );
          transform: translateX(-100%);
          animation: sweepEffect 2s infinite linear;
          z-index: 1;
          pointer-events: none;
        }
        @keyframes sweepEffect {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Party animations & details inside lightbox */
        .lightbox-body {
          padding: 30px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .lightbox-item-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 24px;
        }
        .lightbox-item-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border: 3px solid var(--pink);
          border-radius: 8px;
          box-shadow: 0 0 15px rgba(255, 20, 157, 0.4);
        }
        .lightbox-item-info {
          text-align: left;
        }
        .lightbox-item-name {
          font-family: Impact, sans-serif;
          font-size: 24px;
          text-transform: uppercase;
          color: var(--white);
          margin: 0;
        }
        .lightbox-item-price {
          font-size: 18px;
          color: var(--yellow);
          font-weight: bold;
          margin-top: 4px;
        }
        .lightbox-sassy-quote {
          font-size: 22px;
          line-height: 1.5;
          color: #ff99dc;
          font-family: system-ui, sans-serif;
          font-weight: bold;
          font-style: italic;
          margin: 20px 0;
          padding: 15px;
          background: rgba(255, 20, 157, 0.1);
          border-left: 4px solid var(--pink);
          border-right: 4px solid var(--pink);
          border-radius: 8px;
          text-shadow: 0 0 5px rgba(255, 20, 157, 0.2);
        }

        /* Party animations, glitter & confetti css */
        .confetti-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 20px;
          opacity: 0;
          animation: confettiFall 4s infinite ease-out;
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(450px) rotate(720deg);
            opacity: 0;
          }
        }
        .sparkle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%;
          animation: sparkleAnim 1.5s infinite ease-in-out;
          pointer-events: none;
        }
        @keyframes sparkleAnim {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); opacity: 1; filter: drop-shadow(0 0 5px var(--pink)); }
        }
        .disco-ball-light {
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
          background: radial-gradient(circle at top, rgba(255, 20, 157, 0.15), transparent 60%);
          animation: discoLights 3s infinite alternate ease-in-out;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes discoLights {
          0% { filter: hue-rotate(0deg); opacity: 0.4; }
          100% { filter: hue-rotate(360deg); opacity: 0.9; }
        }
        .lightbox-close-btn {
          background: var(--pink);
          border: 2px solid var(--yellow);
          color: white;
          padding: 10px 24px;
          font-family: Impact, sans-serif;
          text-transform: uppercase;
          font-size: 16px;
          letter-spacing: 1px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
          box-shadow: 0 0 15px rgba(255, 20, 157, 0.4);
          display: inline-block;
          text-decoration: none;
          text-align: center;
        }
        .lightbox-close-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 25px rgba(255, 20, 157, 0.7);
        }
      `}</style>

      {/* Floating cart button redirects to the dedicated /cart page */}
      <Link href="/cart" className="floating-cart-btn" aria-label="View Shopping Cart">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {totalCartItems > 0 && <span className="cart-badge">{totalCartItems}</span>}
      </Link>

      <main className="section store-container">
        <p className="eyebrow">Merchandise</p>
        <h1>GayC/DC Store</h1>
        {merch?.intro && (
          <p className="lede" style={{ marginBottom: 24, maxWidth: 900 }}>
            {merch.intro}
          </p>
        )}

        {/* Global Store Notes */}
        <div className="pink-panel section" style={{ marginTop: 24, marginBottom: 40, padding: 20 }}>
          <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--white)' }}>
            <strong>⚡ Store Information:</strong> Checkout our redesigned dedicated Cart page with real-time postage quotes! Want to pick up your order at an upcoming show? Just choose "Pickup at a Show" on the checkout page for free pickup! 
            <br />
            <span style={{ color: 'var(--yellow)' }}>✈️ International buyers: Since postage varies, please click the link below to contact us for customized shipping rates!</span>
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <Link href="/cart" className="button small" style={{ boxShadow: 'none', background: 'var(--yellow)', color: 'var(--black)' }}>
              Go To Cart 🛒
            </Link>
            <Link href="/contact" className="button small" style={{ boxShadow: 'none' }}>
              International Inquiries
            </Link>
          </div>
        </div>

        {/* Merchandise categories grid */}
        {(merch?.categories ?? []).map((category) => (
          <section className="merch-category" key={category.name}>
            <h2>{category.name}</h2>
            {category.description && <p className="merch-cat-desc" style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--muted)', fontSize: 16 }}>{category.description}</p>}
            <div className="merch-grid">
              {category.items.map((item) => {
                const isTShirt = category.name === 'T-Shirts';
                const selections = itemSelections[item.name] || { quantity: 1 };
                
                return (
                  <article className="merch-item show-card" key={`${category.name}-${item.name}`}>
                    {'imageUrl' in item && item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="merch-img" />
                    )}
                    <h3>{item.name}</h3>
                    <p className="merch-price" style={{ color: 'var(--yellow)', textShadow: 'none' }}>{item.price}</p>
                    <p className="notes" style={{ minHeight: '60px' }}>{item.description}</p>
                    
                    {/* Interactive shopping cart add options */}
                    <div className="add-cart-section">
                      {/* Size Selection for Shirts */}
                      {isTShirt && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <select 
                            className="option-select"
                            value={selections.size || ''}
                            onChange={(e) => handleSelectionChange(item.name, 'size', e.target.value)}
                          >
                            <option value="" disabled>Select Size...</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                          </select>
                        </div>
                      )}

                      <div className="add-cart-row">
                        <input 
                          type="number" 
                          min="1" 
                          className="qty-input"
                          value={selections.quantity || 1}
                          onChange={(e) => handleSelectionChange(item.name, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button 
                          className="button small" 
                          onClick={() => handleAddToCart(item, category.name)}
                          style={{ flex: 1, boxShadow: 'none' }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {merch?.shippingNote && (
          <div className="pink-panel section" style={{ marginTop: 48, padding: 28 }}>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
              {merch.shippingNote}
            </p>
          </div>
        )}
      </main>

      {/* Added to Cart Lightbox with high voltage sassy vibes & party animations */}
      {addedItemLightbox?.isOpen && (
        <div className="lightbox-overlay" onClick={() => setAddedItemLightbox(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setAddedItemLightbox(null)}
            aria-label="Close confirmation lightbox"
          >
            ×
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Pulsing Disco Ball light background */}
            <div className="disco-ball-light"></div>

            {/* Confetti & glitter party simulation layer */}
            <div className="confetti-canvas">
              {/* Confetti pieces */}
              {[...Array(25)].map((_, i) => {
                const colors = ['#ff149d', '#ffe600', '#00f0ff', '#ffffff', '#a832a8'];
                const randColor = colors[i % colors.length];
                const randLeft = `${Math.floor(Math.random() * 100)}%`;
                const randDelay = `${(Math.random() * 2).toFixed(1)}s`;
                const randDuration = `${(2.5 + Math.random() * 2).toFixed(1)}s`;
                
                return (
                  <div
                    key={`confetti-${i}`}
                    className="confetti"
                    style={{
                      left: randLeft,
                      backgroundColor: randColor,
                      animationDelay: randDelay,
                      animationDuration: randDuration,
                    }}
                  />
                );
              })}

              {/* Sparkles / Glitter */}
              {[...Array(15)].map((_, i) => {
                const randLeft = `${Math.floor(Math.random() * 100)}%`;
                const randTop = `${Math.floor(Math.random() * 100)}%`;
                const randDelay = `${(Math.random() * 1.5).toFixed(1)}s`;
                
                return (
                  <div
                    key={`sparkle-${i}`}
                    className="sparkle"
                    style={{
                      left: randLeft,
                      top: randTop,
                      animationDelay: randDelay,
                    }}
                  />
                );
              })}
            </div>

            {/* Huge banner with animated hot pink overlay sweep */}
            <div className="lightbox-banner">
              <div className="pink-overlay-sweep"></div>
              <h2>🛒 Item Added to Cart!</h2>
              <div className="banner-sub">Let's get this party started! ⚡🎉</div>
            </div>

            {/* Lightbox body content */}
            <div className="lightbox-body">
              <div className="lightbox-item-display">
                {addedItemLightbox.itemImage && (
                  <img
                    src={addedItemLightbox.itemImage}
                    alt={addedItemLightbox.itemName}
                    className="lightbox-item-img"
                  />
                )}
                <div className="lightbox-item-info">
                  <p className="lightbox-item-name">{addedItemLightbox.itemName}</p>
                  <p className="lightbox-item-price">{addedItemLightbox.itemCategory} • {addedItemLightbox.itemPrice}</p>
                </div>
              </div>

              {/* Sassy and gay product remark */}
              <div className="lightbox-sassy-quote">
                "{addedItemLightbox.sassyQuote}"
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 15, justifyContent: 'center', marginTop: 20 }}>
                <button
                  className="lightbox-close-btn"
                  onClick={() => setAddedItemLightbox(null)}
                >
                  Keep Shopping
                </button>
                <Link
                  className="lightbox-close-btn"
                  style={{ background: 'var(--yellow)', color: 'var(--black)', borderColor: 'var(--pink)' }}
                  href="/cart"
                >
                  View Cart 🛒
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
