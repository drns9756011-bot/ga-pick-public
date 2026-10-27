import { ensureLeadSchema } from './assigned-leads.js';

export async function getLeadAvailability(env, sellerId) {
  await ensureLeadSchema(env);
  const checkedAt = new Date().toISOString();
  // Historical recipients still consume capacity, including revoked assignments.
  const row = await env.DB.prepare(`SELECT count(*) AS available_count FROM assigned_leads l
    WHERE l.expires_at > ?
      AND (SELECT count(*) FROM lead_assignments a WHERE a.lead_id = l.id) < 3
      AND NOT EXISTS (SELECT 1 FROM lead_assignments own WHERE own.lead_id = l.id AND own.seller_id = ?)`)
    .bind(checkedAt, sellerId).first();
  return new Response(JSON.stringify({ ok: true, availableCount: Number(row?.available_count || 0), checkedAt }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
