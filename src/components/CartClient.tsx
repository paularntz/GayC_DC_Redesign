'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    paypal?: any;
    google?: any;
  }
}

interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  priceStr: string;
  description: string;
  imageUrl?: string;
  selectedSize?: string;
  selectedStyle?: string;
  quantity: number;
}

interface ShippingRate {
  id: string;
  provider: string;
  serviceName: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
}

interface CartClientProps {
  siteData: any;
}

export function CartClient({ siteData }: CartClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [clientEnvId, setClientEnvId] = useState<string>('');

  // Customer Contact Info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Delivery Choice
  const [shippingOption, setShippingOption] = useState<'ship' | 'pickup'>('ship');
  
  // Address State
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA'
  });
  const [pickupDetails, setPickupDetails] = useState('');

  // Shipping Rates State
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const paypalRef = useRef<HTMLDivElement>(null);

  // Sassy quotes pool
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
  const [sassyQuote, setSassyQuote] = useState('');

  // Load environment variables and cart on mount
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sb';
    setClientEnvId(clientId);

    // Random sassy quote on load
    setSassyQuote(sassyQuotes[Math.floor(Math.random() * sassyQuotes.length)]);

    try {
      const savedCart = localStorage.getItem('gaycdc_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  }, []);

  // Save cart changes
  useEffect(() => {
    if (cart.length > 0) {
      try {
        localStorage.setItem('gaycdc_cart', JSON.stringify(cart));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    }
  }, [cart]);

  // Dynamically load PayPal SDK
  useEffect(() => {
    if (!clientEnvId) return;
    if (window.paypal) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientEnvId}&currency=USD`;
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    script.onerror = (err) => console.error('Failed to load PayPal SDK script:', err);
    document.body.appendChild(script);
  }, [clientEnvId]);

  // Google Places Autocomplete Integration
  useEffect(() => {
    if (shippingOption !== 'ship' || cart.length === 0) return;

    let autocompleteInstance: any = null;

    const initAutocomplete = () => {
      if (!autocompleteInputRef.current || !window.google?.maps?.places) return;

      autocompleteInstance = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (!place.address_components) return;

        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let zip = '';

        place.address_components.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('route')) {
            route = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name; // Short code CA, NY
          }
          if (types.includes('postal_code')) {
            zip = component.long_name;
          }
        });

        const street = `${streetNumber} ${route}`.trim();
        setShippingAddress({
          street,
          city,
          state,
          zip,
          country: 'USA'
        });
      });
    };

    // Check if script is already present
    const existingScript = document.getElementById('google-maps-places-script');

    if (window.google?.maps?.places) {
      initAutocomplete();
    } else if (!existingScript) {
      const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (mapsApiKey && !mapsApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY_HERE')) {
        const script = document.createElement('script');
        script.id = 'google-maps-places-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`;
        script.async = true;
        script.onload = () => initAutocomplete();
        document.body.appendChild(script);
      } else {
        console.warn('Google Maps API Key not fully configured. Using standard manual address input.');
      }
    } else {
      existingScript.addEventListener('load', initAutocomplete);
    }

    return () => {
      if (existingScript) {
        existingScript.removeEventListener('load', initAutocomplete);
      }
    };
  }, [shippingOption, cart]);

  // Retrieve Real-time shipping quotes from API when shippingAddress details are set
  useEffect(() => {
    if (shippingOption !== 'ship' || cart.length === 0) return;

    const { street, city, state, zip } = shippingAddress;
    if (!street || !city || !state || !zip || zip.length < 5) {
      setShippingRates([]);
      setSelectedRate(null);
      return;
    }

    const fetchRates = async () => {
      setIsLoadingRates(true);
      setRatesError(null);
      try {
        const response = await fetch('/api/shipping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addressTo: { street, city, state, zip, country: 'US' },
            cartItems: cart,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to retrieve postage quotes.');
        }

        const data = await response.json();
        if (data.rates && data.rates.length > 0) {
          setShippingRates(data.rates);
          // Auto-select first (cheapest) rate
          setSelectedRate(data.rates[0]);
        } else {
          throw new Error('No postage options returned for this address.');
        }
      } catch (err: any) {
        console.error('Error fetching postage:', err);
        setRatesError(err.message || 'Error fetching postage rates.');
        setShippingRates([]);
        setSelectedRate(null);
      } finally {
        setIsLoadingRates(false);
      }
    };

    // Debounce the call slightly
    const delayDebounceFn = setTimeout(() => {
      fetchRates();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [shippingAddress, shippingOption, cart]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = shippingOption === 'pickup' ? 0 : (selectedRate ? parseFloat(selectedRate.amount) : 0);
  const total = subtotal + shipping;
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Form Validation
  const isFormValid = () => {
    if (!customerName.trim() || !customerEmail.trim()) return false;
    if (shippingOption === 'ship') {
      const hasValidAddress = (
        shippingAddress.street.trim() !== '' &&
        shippingAddress.city.trim() !== '' &&
        shippingAddress.state.trim() !== '' &&
        shippingAddress.zip.trim() !== ''
      );
      return hasValidAddress && selectedRate !== null;
    } else {
      return pickupDetails.trim() !== '';
    }
  };

  // Setup PayPal SDK Buttons
  useEffect(() => {
    if (!paypalLoaded || !window.paypal || !paypalRef.current || cart.length === 0 || !isFormValid() || isCheckingOut) {
      if (paypalRef.current) paypalRef.current.innerHTML = '';
      return;
    }

    paypalRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay'
      },
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: total.toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: 'USD',
                    value: subtotal.toFixed(2),
                  },
                  shipping: {
                    currency_code: 'USD',
                    value: shipping.toFixed(2),
                  }
                }
              },
              items: cart.map((item) => ({
                name: `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''}${
                  item.selectedStyle ? ` - ${item.selectedStyle}` : ''
                }`,
                unit_amount: {
                  currency_code: 'USD',
                  value: item.price.toFixed(2),
                },
                quantity: item.quantity.toString(),
                category: 'PHYSICAL_GOODS'
              })),
              shipping: shippingOption === 'ship' ? {
                name: {
                  full_name: customerName
                },
                address: {
                  address_line_1: shippingAddress.street,
                  admin_area_2: shippingAddress.city,
                  admin_area_1: shippingAddress.state,
                  postal_code: shippingAddress.zip,
                  country_code: 'US'
                }
              } : undefined
            }
          ]
        });
      },
      onApprove: async (data: any, actions: any) => {
        setIsCheckingOut(true);
        try {
          const order = await actions.order.capture();
          
          const fullAddress = shippingOption === 'ship'
            ? `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}, ${shippingAddress.country}`
            : `LOCAL PICKUP: ${pickupDetails}`;

          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paypalOrderId: order.id,
              customerName,
              customerEmail,
              shippingAddress: fullAddress,
              items: cart.map(item => ({
                name: item.name,
                category: item.category,
                price: item.price,
                quantity: item.quantity,
                selectedSize: item.selectedSize || null,
                selectedStyle: item.selectedStyle || null
              })),
              subtotal,
              shipping,
              total,
              status: order.status || 'APPROVED'
            })
          });

          if (!response.ok) {
            console.error('Failed to record order details in DB');
          }

          setOrderSuccess({
            id: order.id,
            customerName,
            customerEmail,
            total,
            items: [...cart],
            shippingOption,
            shippingAddress: fullAddress
          });

          // Empty cart
          setCart([]);
          localStorage.removeItem('gaycdc_cart');
        } catch (error) {
          console.error('Capture error', error);
          alert('Failed to process payment. Please contact gaycdclola@gmail.com.');
        } finally {
          setIsCheckingOut(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal Buttons error:', err);
      }
    }).render(paypalRef.current);
  }, [paypalLoaded, cart, total, shipping, subtotal, customerName, customerEmail, shippingOption, shippingAddress, pickupDetails, selectedRate, isCheckingOut]);

  const updateCartQuantity = (id: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setCart(updated);
    if (updated.length === 0) {
      localStorage.removeItem('gaycdc_cart');
    } else {
      localStorage.setItem('gaycdc_cart', JSON.stringify(updated));
    }
  };

  const removeCartItem = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    setCart(updated);
    if (updated.length === 0) {
      localStorage.removeItem('gaycdc_cart');
    } else {
      localStorage.setItem('gaycdc_cart', JSON.stringify(updated));
    }
  };

  return (
    <>
      <style jsx global>{`
        .cart-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 40px;
          margin-top: 30px;
        }
        @media (max-width: 968px) {
          .cart-layout {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
        .cart-section-title {
          font-family: Impact, sans-serif;
          font-size: 24px;
          text-transform: uppercase;
          border-bottom: 2px solid var(--pink);
          padding-bottom: 8px;
          margin-bottom: 20px;
          color: var(--yellow);
          letter-spacing: 1px;
        }
        .cart-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .cart-page-item {
          display: flex;
          gap: 20px;
          background: var(--panel-bg);
          border: 1px solid var(--border-pink);
          border-radius: 8px;
          padding: 16px;
          align-items: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cart-page-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 15px rgba(255, 20, 157, 0.25);
          border-color: var(--pink);
        }
        .cart-page-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border: 2px solid var(--pink);
          border-radius: 6px;
        }
        .cart-page-details {
          flex: 1;
        }
        .cart-page-details h3 {
          margin: 0 0 6px 0;
          font-size: 20px;
          font-family: Impact, sans-serif;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cart-page-options {
          font-size: 14px;
          color: var(--muted);
          margin-bottom: 8px;
          font-family: system-ui, sans-serif;
        }
        .cart-page-options span {
          background: rgba(255, 20, 157, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          margin-right: 6px;
          border: 1px solid rgba(255, 20, 157, 0.3);
        }
        .qty-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        .qty-btn {
          background: rgba(255, 20, 157, 0.2);
          border: 1px solid var(--pink);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          transition: background 0.15s;
        }
        .qty-btn:hover {
          background: var(--pink);
          box-shadow: 0 0 10px var(--pink);
        }
        .qty-val {
          font-weight: bold;
          font-size: 16px;
          min-width: 20px;
          text-align: center;
        }
        .remove-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s;
        }
        .remove-btn:hover {
          color: var(--pink);
          text-shadow: 0 0 5px var(--pink);
        }
        .checkout-sidebar {
          background: var(--black);
          border: 2px solid var(--pink);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 0 25px rgba(255, 20, 157, 0.2);
          align-self: start;
        }
        .form-group {
          margin-bottom: 18px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          font-size: 13px;
          text-transform: uppercase;
          color: var(--yellow);
          letter-spacing: 0.5px;
        }
        .form-control {
          width: 100%;
          background: rgba(16, 0, 16, 0.8);
          border: 1px solid var(--border-pink);
          color: white;
          padding: 12px;
          border-radius: 6px;
          font-family: system-ui, sans-serif;
          font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-control:focus {
          outline: none;
          border-color: var(--yellow);
          box-shadow: 0 0 8px rgba(255, 230, 0, 0.4);
        }
        .shipping-toggle {
          display: flex;
          border: 1px solid var(--pink);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .shipping-toggle-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 12px;
          font-weight: bold;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          font-size: 13px;
          transition: background 0.2s;
        }
        .shipping-toggle-btn.active {
          background: var(--pink);
          text-shadow: 0 0 8px white;
        }
        .rate-option {
          background: rgba(255, 20, 157, 0.05);
          border: 1px solid var(--border-pink);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .rate-option:hover {
          background: rgba(255, 20, 157, 0.12);
          border-color: var(--pink);
        }
        .rate-option.selected {
          background: rgba(255, 20, 157, 0.2);
          border-color: var(--yellow);
          box-shadow: 0 0 10px rgba(255, 230, 0, 0.2);
        }
        .rate-option input[type="radio"] {
          accent-color: var(--pink);
          width: 18px;
          height: 18px;
        }
        .rate-details {
          flex: 1;
          font-family: system-ui, sans-serif;
        }
        .rate-title {
          font-weight: bold;
          color: white;
          font-size: 15px;
        }
        .rate-time {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }
        .rate-price {
          font-family: Impact, sans-serif;
          font-size: 18px;
          color: var(--yellow);
        }
        .summary-block {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          padding: 16px;
          margin: 20px 0;
          border: 1px solid rgba(255, 20, 157, 0.1);
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-family: system-ui, sans-serif;
          font-size: 15px;
          margin-bottom: 10px;
          color: #ffe8fb;
        }
        .summary-row.total-row {
          border-top: 1px solid rgba(255, 20, 157, 0.2);
          padding-top: 12px;
          margin-top: 12px;
          font-family: Impact, sans-serif;
          font-size: 24px;
          color: var(--yellow);
          text-transform: uppercase;
        }
        .checkout-prompt {
          font-size: 13px;
          color: var(--muted);
          text-align: center;
          padding: 14px;
          border: 1px dashed var(--pink);
          background: rgba(255, 20, 157, 0.03);
          border-radius: 6px;
          margin-top: 15px;
          font-family: system-ui, sans-serif;
          line-height: 1.4;
        }
        .shipping-hint {
          font-family: system-ui, sans-serif;
          font-size: 12px;
          color: #ff99dc;
          margin-top: 6px;
          line-height: 1.4;
        }
        .postage-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border: 1px dashed var(--pink);
          border-radius: 6px;
          background: rgba(255, 20, 157, 0.02);
          gap: 12px;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          color: var(--muted);
        }
        .lightning-spinner {
          font-size: 32px;
          animation: lightningPulse 1.2s infinite ease-in-out;
        }
        @keyframes lightningPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px var(--yellow)); }
          50% { transform: scale(1.3); filter: drop-shadow(0 0 15px var(--yellow)); }
        }
        .success-box {
          border: 3px solid var(--yellow);
          background: var(--panel-bg);
          padding: 40px;
          border-radius: 12px;
          text-align: center;
          margin-top: 20px;
          box-shadow: 0 0 40px rgba(255, 230, 0, 0.3);
          position: relative;
          overflow: hidden;
        }
        .success-box h2 {
          color: var(--yellow);
          font-size: 38px;
          text-shadow: 0 0 15px rgba(255, 230, 0, 0.6);
        }
        .success-details {
          margin: 30px auto;
          text-align: left;
          background: rgba(0, 0, 0, 0.4);
          padding: 24px;
          border-radius: 8px;
          font-family: system-ui, sans-serif;
          border: 1px solid var(--border-pink);
          max-width: 650px;
        }
        .success-details h4 {
          margin-top: 0;
          border-bottom: 1px solid var(--pink);
          padding-bottom: 8px;
          text-transform: uppercase;
          color: var(--yellow);
          font-size: 16px;
        }
        .sassy-banner {
          font-family: system-ui, sans-serif;
          font-size: 17px;
          line-height: 1.5;
          color: #ff99dc;
          font-weight: bold;
          font-style: italic;
          background: rgba(255, 20, 157, 0.1);
          border-left: 4px solid var(--pink);
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 24px;
        }
      `}</style>

      <main className="section container">
        {orderSuccess ? (
          <div className="success-box">
            {/* Animated background features */}
            <div className="disco-ball-light" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2>⚡ Order Complete! ⚡</h2>
              <p className="lede" style={{ margin: '0 auto 20px', maxWidth: 650 }}>
                Hell yeah! We received your payment and order details. Get ready to rock with high voltage pride!
              </p>
              
              <div className="success-details">
                <h4>Order Details</h4>
                <p><strong>PayPal Order ID:</strong> {orderSuccess.id}</p>
                <p><strong>Customer Name:</strong> {orderSuccess.customerName}</p>
                <p><strong>Customer Email:</strong> {orderSuccess.customerEmail}</p>
                <p><strong>Delivery Option:</strong> {orderSuccess.shippingOption === 'ship' ? 'US Shipping' : 'Pickup at a Show'}</p>
                {orderSuccess.shippingOption === 'ship' && <p><strong>Shipping Address:</strong> {orderSuccess.shippingAddress}</p>}
                
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 8px', color: 'var(--yellow)' }}>Items Ordered:</p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {orderSuccess.items.map((item: any) => (
                      <li key={item.id} style={{ marginBottom: 6 }}>
                        {item.name} {item.selectedSize ? `(Size: ${item.selectedSize})` : ''} x {item.quantity} - {item.priceStr}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <p style={{ fontSize: 20, fontWeight: 'bold', borderTop: '1px solid var(--pink)', paddingTop: 14, marginTop: 16, color: 'var(--yellow)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Paid:</span>
                  <span>${orderSuccess.total.toFixed(2)}</span>
                </p>
              </div>

              <Link href="/merchandise" className="button">
                Back to Store
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
              <div>
                <p className="eyebrow">Your Selection</p>
                <h1 style={{ margin: '8px 0' }}>Your Cart</h1>
              </div>
              <Link href="/merchandise" className="button small" style={{ boxShadow: 'none' }}>
                &larr; Back To Store
              </Link>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--panel-bg)', border: '1px dashed var(--pink)', borderRadius: 12, marginTop: 30 }}>
                <p className="lede" style={{ color: 'var(--muted)', fontSize: 24, margin: '0 0 10px' }}>Your cart is empty.</p>
                <p style={{ fontFamily: 'system-ui, sans-serif', color: '#ffe8fb', marginBottom: 30 }}>Load up on amazing, high-voltage queer rock gear!</p>
                <Link href="/merchandise" className="button">
                  Browse Merchandise
                </Link>
              </div>
            ) : (
              <div className="cart-layout">
                {/* Left side - Cart items list */}
                <div>
                  <div className="cart-section-title">🛒 Cart Items ({totalCartItems})</div>
                  
                  {sassyQuote && (
                    <div className="sassy-banner">
                      "{sassyQuote}"
                    </div>
                  )}

                  <div className="cart-list">
                    {cart.map((item) => (
                      <div className="cart-page-item" key={item.id}>
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} className="cart-page-img" />
                        )}
                        <div className="cart-page-details">
                          <h3>{item.name}</h3>
                          <div className="cart-page-options">
                            <span>{item.category}</span>
                            {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                            {item.selectedStyle && <span>Style: {item.selectedStyle}</span>}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div className="qty-controls">
                              <button className="qty-btn" onClick={() => updateCartQuantity(item.id, -1)} aria-label="Decrease quantity">-</button>
                              <span className="qty-val">{item.quantity}</span>
                              <button className="qty-btn" onClick={() => updateCartQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                            </div>

                            <button className="remove-btn" onClick={() => removeCartItem(item.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '90px' }}>
                          <span style={{ fontSize: 14, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{item.priceStr} each</span>
                          <span style={{ fontSize: 20, fontFamily: 'Impact, sans-serif', color: 'var(--yellow)' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pink-panel" style={{ marginTop: 30, padding: 20 }}>
                    <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                      <strong>✈️ International Shipments:</strong> This checkout calculator is configured for fast USPS domestic rates within the USA. If you are an international rocking fan, please use our <Link href="/contact" style={{ color: 'var(--yellow)', textDecoration: 'underline' }}>contact page</Link> to drop us a line so we can organize a custom international shipping quote for you!
                    </p>
                  </div>
                </div>

                {/* Right side - Billing & Delivery Address Autocomplete & Paypal */}
                <div className="checkout-sidebar">
                  <div className="cart-section-title">📦 Checkout Details</div>

                  <div className="form-group">
                    <label>Delivery Option</label>
                    <div className="shipping-toggle">
                      <button 
                        type="button"
                        className={`shipping-toggle-btn ${shippingOption === 'ship' ? 'active' : ''}`}
                        onClick={() => setShippingOption('ship')}
                      >
                        Ship to Address
                      </button>
                      <button 
                        type="button"
                        className={`shipping-toggle-btn ${shippingOption === 'pickup' ? 'active' : ''}`}
                        onClick={() => setShippingOption('pickup')}
                      >
                        Pickup at Show
                      </button>
                    </div>
                  </div>

                  {/* Customer Contact Details */}
                  <div className="form-group">
                    <label htmlFor="customerName">Full Name</label>
                    <input 
                      type="text" 
                      id="customerName"
                      className="form-control" 
                      placeholder="Angus Young"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="customerEmail">Email Address</label>
                    <input 
                      type="email" 
                      id="customerEmail"
                      className="form-control" 
                      placeholder="angus@gmail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Delivery Input Panels */}
                  {shippingOption === 'ship' ? (
                    <div>
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label htmlFor="addressAutocomplete">Find Shipping Address</label>
                        <input 
                          type="text" 
                          id="addressAutocomplete"
                          ref={autocompleteInputRef}
                          className="form-control" 
                          placeholder="Start typing your street address..."
                          defaultValue={shippingAddress.street}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                        />
                        <span className="shipping-hint">🔍 Search powered by Google Places for quick, accurate address entry.</span>
                      </div>

                      {/* Manual Address Fields for Autofill/Verification */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: '1 1 100%' }}>
                          <label>Street Address</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={shippingAddress.street}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                            placeholder="123 Rock Lane"
                          />
                        </div>
                        <div className="form-group" style={{ flex: '1 1 120px' }}>
                          <label>City</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={shippingAddress.city}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                            placeholder="San Francisco"
                          />
                        </div>
                        <div className="form-group" style={{ flex: '1 1 60px' }}>
                          <label>State</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={shippingAddress.state}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                            placeholder="CA"
                            maxLength={2}
                          />
                        </div>
                        <div className="form-group" style={{ flex: '1 1 90px' }}>
                          <label>ZIP Code</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={shippingAddress.zip}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                            placeholder="94103"
                          />
                        </div>
                      </div>

                      {/* Postage Quotes choices from API */}
                      <div style={{ marginTop: 24, marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', color: 'var(--yellow)' }}>
                          📬 Real-time Postage Options
                        </label>

                        {isLoadingRates ? (
                          <div className="postage-loader">
                            <span className="lightning-spinner">⚡</span>
                            <span>Crunching shipping logistics with Shippo...</span>
                          </div>
                        ) : ratesError ? (
                          <div style={{ padding: 14, border: '1px solid #ff43c8', borderRadius: 6, background: 'rgba(255,67,200,0.05)', fontSize: 13, color: 'var(--hot)' }}>
                            ⚠️ {ratesError} Enter your street, city, state, and ZIP fully to get postage rates.
                          </div>
                        ) : shippingRates.length > 0 ? (
                          <div>
                            {shippingRates.map((rate) => (
                              <div 
                                key={rate.id}
                                className={`rate-option ${selectedRate?.id === rate.id ? 'selected' : ''}`}
                                onClick={() => setSelectedRate(rate)}
                              >
                                <input 
                                  type="radio" 
                                  name="shipping_rate"
                                  checked={selectedRate?.id === rate.id}
                                  onChange={() => setSelectedRate(rate)}
                                />
                                <div className="rate-details">
                                  <div className="rate-title">{rate.serviceName} ({rate.provider})</div>
                                  <div className="rate-time">
                                    {rate.estimatedDays ? `Estimated delivery: ${rate.estimatedDays} days` : 'Standard Delivery'}
                                  </div>
                                </div>
                                <div className="rate-price">${parseFloat(rate.amount).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: 14, border: '1px dashed var(--border-pink)', borderRadius: 6, background: 'rgba(255,20,157,0.02)', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                            Please fill in your shipping address above to calculate postage quotes.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="form-group">
                        <label htmlFor="pickupDetails">Which Upcoming Show & Date?</label>
                        <textarea 
                          id="pickupDetails"
                          className="form-control" 
                          rows={3}
                          placeholder="e.g. DNA Lounge SF - June 20, 2026. We will hold your order at the merch table!"
                          value={pickupDetails}
                          onChange={(e) => setPickupDetails(e.target.value)}
                        />
                        <span className="shipping-hint" style={{ color: 'var(--yellow)' }}>⚡ No shipping fee! We'll have your items waiting for you at the merch table!</span>
                      </div>
                    </div>
                  )}

                  {/* Summary Calculations block */}
                  <div className="summary-block">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Postage / Shipping:</span>
                      <span>
                        {shippingOption === 'pickup' ? 'FREE' : (selectedRate ? `$${shipping.toFixed(2)}` : '$0.00')}
                      </span>
                    </div>
                    <div className="summary-row total-row">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {isCheckingOut && (
                    <div style={{ textAlign: 'center', color: 'var(--yellow)', margin: '15px 0', fontWeight: 'bold', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
                      ⚡ Processing Payment... Do not leave this page! ⚡
                    </div>
                  )}

                  {/* PayPal Buttons wrapper */}
                  <div style={{ marginTop: 24 }}>
                    {!isFormValid() ? (
                      <div className="checkout-prompt">
                        ✍️ Fill in your full name, email, and {shippingOption === 'ship' ? 'shipping address & postage choice' : 'pickup details'} to unlock PayPal checkout!
                      </div>
                    ) : !paypalLoaded ? (
                      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>
                        Loading payment gateway...
                      </div>
                    ) : (
                      <div ref={paypalRef}></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
