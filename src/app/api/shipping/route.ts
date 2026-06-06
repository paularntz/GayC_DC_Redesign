import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.addressTo || !body.cartItems) {
      return NextResponse.json(
        { error: 'Missing required fields: addressTo, cartItems' },
        { status: 400 }
      );
    }

    const { addressTo, cartItems } = body;

    // Estimate parcel specifications based on cart items
    let tShirtCount = 0;
    let otherCount = 0;

    cartItems.forEach((item: any) => {
      const qty = item.quantity || 1;
      if (item.category === 'T-Shirts') {
        tShirtCount += qty;
      } else {
        otherCount += qty;
      }
    });

    // Average weights: T-shirt = 0.5 lbs, small items = 0.1 lbs
    const estimatedWeight = Math.max(0.2, tShirtCount * 0.5 + otherCount * 0.1);

    // Box dimensions in inches
    let length = 10;
    let width = 8;
    let height = 3;

    if (estimatedWeight <= 0.5) {
      length = 6;
      width = 4;
      height = 1;
    } else if (estimatedWeight > 2.0) {
      length = 12;
      width = 10;
      height = 5;
    }

    const shippoApiKey = process.env.SHIPPO_API_KEY;

    // Check if Shippo is configured
    if (!shippoApiKey || shippoApiKey.includes('YOUR_SHIPPO_API_KEY_HERE')) {
      console.log('Shippo API Key not configured. Returning realistic mock rates.');
      
      // Calculate mock rates based on weight and distance/destination (mock)
      const baseGround = 4.25 + estimatedWeight * 1.5;
      const basePriority = 8.50 + estimatedWeight * 2.25;

      const mockRates = [
        {
          id: 'mock-rate-usps-ground',
          provider: 'USPS',
          serviceName: 'USPS Ground Advantage',
          amount: baseGround.toFixed(2),
          currency: 'USD',
          estimatedDays: 3,
        },
        {
          id: 'mock-rate-usps-priority',
          provider: 'USPS',
          serviceName: 'USPS Priority Mail',
          amount: basePriority.toFixed(2),
          currency: 'USD',
          estimatedDays: 2,
        }
      ];

      return NextResponse.json({
        rates: mockRates,
        weight: estimatedWeight,
        isMock: true,
      });
    }

    // Call real Shippo API
    // Shippo API expects address_from, address_to, and parcels
    const addressFrom = {
      name: 'GayC/DC Store',
      street1: '100 Golden Gate Ave',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US',
    };

    const shippoAddressTo = {
      name: addressTo.name || 'Valued Customer',
      street1: addressTo.street || addressTo.street1,
      city: addressTo.city,
      state: addressTo.state,
      zip: addressTo.zip,
      country: addressTo.country || 'US',
    };

    const response = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${shippoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from: addressFrom,
        address_to: shippoAddressTo,
        parcels: [
          {
            length: String(length),
            width: String(width),
            height: String(height),
            distance_unit: 'in',
            weight: String(estimatedWeight),
            mass_unit: 'lb',
          },
        ],
        async: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Shippo API error details:', errText);
      throw new Error(`Shippo API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Sort and filter rates
    const rawRates = data.rates || [];
    const formattedRates = rawRates.map((rate: any) => ({
      id: rate.object_id,
      provider: rate.provider,
      serviceName: rate.servicelevel?.name || rate.servicelevel?.token || 'Shipping Rate',
      amount: String(rate.amount),
      currency: rate.currency || 'USD',
      estimatedDays: rate.estimated_days || null,
    })).sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));

    return NextResponse.json({
      rates: formattedRates,
      weight: estimatedWeight,
      isMock: false,
    });

  } catch (error: any) {
    console.error('API Shipping route error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shipping rates from provider' },
      { status: 500 }
    );
  }
}
