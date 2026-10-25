export const HOME_CASES_SQL = `
  WITH ranked_prices AS (
    SELECT quote_id, price, channel,
      ROW_NUMBER() OVER (
        PARTITION BY quote_id, COALESCE(NULLIF(TRIM(seller_id), ''), seller || '|' || COALESCE(manager, ''))
        ORDER BY price, id
      ) AS seller_rank
    FROM bids WHERE price > 0
  ), seller_prices AS (
    SELECT quote_id, price, channel FROM ranked_prices WHERE seller_rank = 1
  ), summaries AS (
    SELECT quote_id, COUNT(*) AS bid_count, MIN(price) AS lowest,
      json_group_array(json_object('price', price, 'channel', channel)) AS prices
    FROM seller_prices GROUP BY quote_id
  )
  SELECT q.items, q.quote_type, q.purchase_purpose, q.region, q.price,
    s.bid_count, s.prices
  FROM customer_quotes q JOIN summaries s ON s.quote_id = q.id
  WHERE q.price > s.lowest AND q.price > 0
    AND q.customer NOT LIKE '%테스트%'
    AND (q.personal_expires_at = '' OR q.personal_expires_at >= ?)
  ORDER BY s.bid_count DESC, (q.price - s.lowest) DESC, q.created_at DESC
  LIMIT 8
`;

const PUBLIC_CHANNELS = new Set([
  'LG전자 BEST SHOP', '롯데하이마트', '삼성스토어',
  '이마트(LG)', '이마트(삼성)', '전자랜드(LG)', '전자랜드(삼성)',
]);

export function publicCaseBids(prices) {
  return JSON.parse(prices).filter(bid => Number(bid.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3)
    .map(bid => ({ price: Number(bid.price), channel: PUBLIC_CHANNELS.has(bid.channel) ? bid.channel : '판매 채널' }));
}

export async function getHomeCases(request, env, context) {
  // This cache contains public display fields only, never full quotes or seller identities.
  const cache = globalThis.caches?.default;
  const key = new Request(new URL('/api/home-cases?schema=channels-v1', request.url));
  const hit = await cache?.match(key);
  if (hit) return hit;
  const result = await env.DB.prepare(HOME_CASES_SQL).bind(new Date().toISOString()).all();
  const cases = (result.results || []).map(row => ({
    request: {
      items: row.items, quoteType: row.quote_type, purchasePurpose: row.purchase_purpose,
      region: row.region, price: Number(row.price),
    },
    bidCount: Number(row.bid_count),
    quoteBids: publicCaseBids(row.prices),
  }));
  const response = new Response(JSON.stringify({ ok: true, cases }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
  if (cache && cases.length) {
    const pending = cache.put(key, response.clone()).catch(() => {});
    if (context.waitUntil) context.waitUntil(pending);
    else await pending;
  }
  return response;
}
