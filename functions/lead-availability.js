import { ensureLeadSchema } from './assigned-leads.js';
import { paidAssignment } from './lead-payments.js';

const schemas = new WeakMap();
export async function ensureLeadWaitingSchema(env) {
  if (!schemas.has(env.DB)) {
    const pending = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_waiting_batches (
        id TEXT PRIMARY KEY, initial_quantity INTEGER NOT NULL CHECK(initial_quantity >= 0),
        remaining INTEGER NOT NULL CHECK(remaining >= 0 AND remaining <= initial_quantity), created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TRIGGER IF NOT EXISTS consume_waiting_lead_on_registration
        AFTER INSERT ON assigned_leads BEGIN
          UPDATE lead_waiting_batches SET remaining = remaining - 1
          WHERE id = (SELECT id FROM lead_waiting_batches WHERE remaining > 0 ORDER BY created_at, id LIMIT 1);
        END`),
    ]).catch(error => { schemas.delete(env.DB); throw error; });
    schemas.set(env.DB, pending);
  }
  await schemas.get(env.DB);
}

export async function getLeadAvailability(env, sellerId) {
  await ensureLeadSchema(env);
  await ensureLeadWaitingSchema(env);
  const checkedAt = new Date().toISOString();
  // Historical recipients still consume capacity, including revoked assignments.
  const row = await env.DB.prepare(`SELECT
    (SELECT count(*) FROM assigned_leads l
    WHERE l.expires_at > ?
      AND (SELECT count(*) FROM lead_assignments a WHERE a.lead_id = l.id) < 3
      AND NOT EXISTS (SELECT 1 FROM lead_assignments own WHERE own.lead_id = l.id AND own.seller_id = ?)) AS available_count,
    (SELECT COALESCE(SUM(remaining), 0) FROM lead_waiting_batches) AS waiting_count,
    (SELECT count(*) FROM lead_assignments a JOIN assigned_leads l ON l.id = a.lead_id
      WHERE a.seller_id = ? AND a.revoked_at = '' AND l.expires_at > ? AND ${paidAssignment('a')}) AS assigned_count,
    (SELECT count(*) FROM lead_orders WHERE seller_id = ? AND status = 'paid' AND mode = 'live') AS paid_orders,
    (SELECT MAX(0, COALESCE(SUM(o.quantity - (SELECT count(*) FROM lead_credit_usage u WHERE u.order_id = o.id)), 0))
      FROM lead_orders o WHERE o.seller_id = ? AND o.status = 'paid' AND o.mode = 'live') AS unassigned_count`)
    .bind(checkedAt, sellerId, sellerId, checkedAt, sellerId, sellerId).first();
  return new Response(JSON.stringify({
    ok: true, availableCount: Number(row?.available_count || 0), waitingCount: Number(row?.waiting_count || 0),
    assignedCount: Number(row?.assigned_count || 0), unassignedCount: Number(row?.unassigned_count || 0),
    hasPurchased: Boolean(row?.paid_orders || row?.assigned_count), checkedAt,
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
