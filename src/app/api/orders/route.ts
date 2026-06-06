import { NextResponse } from 'next/server';
import { saveMerchOrder } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (
      !body ||
      !body.paypalOrderId ||
      !body.customerName ||
      !body.customerEmail ||
      !body.items ||
      body.subtotal === undefined ||
      body.shipping === undefined ||
      body.total === undefined ||
      !body.status
    ) {
      return NextResponse.json(
        { error: 'Missing required order fields: paypalOrderId, customerName, customerEmail, items, subtotal, shipping, total, status' },
        { status: 400 }
      );
    }

    const orderData = {
      paypalOrderId: String(body.paypalOrderId).slice(0, 100),
      paypalPaymentId: body.paypalPaymentId ? String(body.paypalPaymentId).slice(0, 100) : undefined,
      customerName: String(body.customerName).slice(0, 150),
      customerEmail: String(body.customerEmail).slice(0, 150),
      shippingAddress: body.shippingAddress ? String(body.shippingAddress).slice(0, 1000) : undefined,
      itemsSummary: JSON.stringify(body.items),
      subtotal: Number(body.subtotal),
      shipping: Number(body.shipping),
      total: Number(body.total),
      status: String(body.status).slice(0, 50),
    };

    const result = await saveMerchOrder(orderData);
    if (result.stored) {
      return NextResponse.json({ success: true, message: 'Order recorded successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to record order in database' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Orders route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
