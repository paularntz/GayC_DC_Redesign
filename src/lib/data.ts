import { createClient } from '@libsql/client';
import fallback from '@/data/siteData.json';

export type SiteData = typeof fallback;

function hasTurso() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getDb() {
  if (!hasTurso()) return null;
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function getSiteData(): Promise<SiteData> {
  const db = getDb();
  if (!db) {
    console.log('No Turso configuration found, using local fallback data.');
    return fallback as SiteData;
  }
  try {
    const result = await db.execute({
      sql: 'select payload from site_content where slug = ?',
      args: ['main'],
    });
    const payload = result.rows[0]?.payload;
    if (typeof payload === 'string') {
      return JSON.parse(payload) as SiteData;
    }
  } catch (error) {
    console.error('Turso read failed, using static fallback:', error);
  }
  return fallback as SiteData;
}

export async function saveContactSubmission(input: { name: string; email: string; message: string }) {
  const db = getDb();
  if (!db) {
    console.log('Skipping contact submission save, db not configured.', input);
    return { stored: false };
  }
  try {
    await db.execute({
      sql: `insert into contact_submissions (name, email, message, created_at) values (?, ?, ?, datetime('now'))`,
      args: [input.name, input.email, input.message],
    });
    return { stored: true };
  } catch (err) {
    console.error('Failed to save contact submission:', err);
    return { stored: false };
  }
}

export async function saveMerchOrder(input: {
  paypalOrderId: string;
  paypalPaymentId?: string;
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  itemsSummary: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
}) {
  const db = getDb();
  if (!db) {
    console.log('Skipping merch order save, db not configured.', input);
    return { stored: true };
  }
  try {
    await db.execute({
      sql: `insert into merch_orders (
        paypal_order_id, 
        paypal_payment_id, 
        customer_name, 
        customer_email, 
        shipping_address, 
        items_summary, 
        subtotal, 
        shipping, 
        total, 
        status, 
        created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        input.paypalOrderId,
        input.paypalPaymentId || null,
        input.customerName,
        input.customerEmail,
        input.shippingAddress || null,
        input.itemsSummary,
        input.subtotal,
        input.shipping,
        input.total,
        input.status,
      ],
    });
    return { stored: true };
  } catch (err) {
    console.error('Failed to save merch order:', err);
    return { stored: false };
  }
}
