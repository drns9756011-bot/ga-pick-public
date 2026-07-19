const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function sellerName(row) {
  return [row.channel, row.branch].filter(Boolean).join(" ");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function normalizeSellerApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at || "",
    reviewedAt: row.reviewed_at || "",
    reviewMemo: row.review_memo || "",
    sellerId: row.seller_id,
    password: row.password,
    channel: row.channel,
    branch: row.branch,
    branchRegion: row.branch_region,
    manager: row.manager,
    managerPosition: row.manager_position || "",
    phone: row.phone,
    cardImage: row.card_image || "",
    cardImageKey: row.card_image_key || "",
    memo: row.memo || "",
    consent: parseJson(row.consent_json, {}),
  };
}

function normalizeApprovedSeller(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    sellerId: row.seller_id,
    password: row.password,
    channel: row.channel,
    branch: row.branch,
    branchRegion: row.branch_region,
    manager: row.manager,
    managerPosition: row.manager_position || "",
    phone: row.phone,
    cardImage: row.card_image || "",
    cardImageKey: row.card_image_key || "",
    memo: row.memo || "",
    consent: parseJson(row.consent_json, {}),
    requestedAt: row.requested_at || "",
    reviewedAt: row.reviewed_at || "",
    reviewMemo: row.review_memo || "",
    approvedAt: row.approved_at || "",
  };
}

const MASTER_SELLER = {
  id: "master-pickgj",
  status: "approved",
  sellerId: "pickgj",
  password: "qwer1234!!",
  channel: "픽견적",
  branch: "마스터 관리자",
  branchRegion: "전국",
  manager: "마스터",
  managerPosition: "관리자",
  phone: "010-0000-0000",
  cardImage: "",
  cardImageKey: "",
  memo: "운영자 마스터 계정",
  consent: { systemAccount: true },
};

async function ensureMasterSeller(env) {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id FROM approved_sellers WHERE seller_id = ? LIMIT 1")
    .bind(MASTER_SELLER.sellerId)
    .first();

  if (existing) return;

  await env.DB.prepare(
    `INSERT INTO approved_sellers
      (id, status, seller_id, password, channel, branch, branch_region, manager, manager_position, phone,
       card_image, card_image_key, memo, consent_json, requested_at, reviewed_at, review_memo, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      MASTER_SELLER.id,
      MASTER_SELLER.status,
      MASTER_SELLER.sellerId,
      MASTER_SELLER.password,
      MASTER_SELLER.channel,
      MASTER_SELLER.branch,
      MASTER_SELLER.branchRegion,
      MASTER_SELLER.manager,
      MASTER_SELLER.managerPosition,
      MASTER_SELLER.phone,
      MASTER_SELLER.cardImage,
      MASTER_SELLER.cardImageKey,
      MASTER_SELLER.memo,
      JSON.stringify(MASTER_SELLER.consent),
      now,
      now,
      "마스터 계정 자동 등록",
      now
    )
    .run();
}

function normalizeMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    type: row.type,
    targetRole: row.target_role || "",
    targetName: row.target_name || "",
    targetPhone: row.target_phone || "",
    title: row.title,
    body: row.body,
    relatedId: row.related_id || "",
    createdAt: row.created_at || "",
    sentAt: row.sent_at || "",
    canceledAt: row.canceled_at || "",
  };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function normalizeCustomerQuote(row, images = []) {
  if (!row) return null;
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customer: row.customer,
    phone: row.phone,
    items: row.items,
    purchasePurpose: row.purchase_purpose || "",
    price: Number(row.price || 0),
    region: row.region || "",
    memo: row.memo || "",
    status: row.status || "open",
    selectedBidId: row.selected_bid_id || null,
    saleCompletedAt: row.sale_completed_at || "",
    thumbnailImage: row.thumbnail_image || "",
    thumbnailImageKey: row.thumbnail_image_key || "",
    quoteExpiresAt: row.quote_expires_at || "",
    fullImagesExpiresAt: row.full_images_expires_at || "",
    personalExpiresAt: row.personal_expires_at || "",
    createdAt: row.created_at || "",
    consent: parseJson(row.consent_json, {}),
    image: images[0]?.url || row.thumbnail_image || "",
    images: images.length ? images.map((image) => image.url) : row.thumbnail_image ? [row.thumbnail_image] : [],
  };
}

async function ensureCustomerQuoteColumns(env) {
  const statements = [
    "ALTER TABLE customer_quotes ADD COLUMN thumbnail_image TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN thumbnail_image_key TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN quote_expires_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN full_images_expires_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN personal_expires_at TEXT DEFAULT ''",
    "ALTER TABLE quote_images ADD COLUMN image_type TEXT DEFAULT 'full'",
    "ALTER TABLE quote_images ADD COLUMN expires_at TEXT DEFAULT ''",
  ];

  await Promise.all(
    statements.map(async (statement) => {
      try {
        await env.DB.prepare(statement).run();
      } catch (error) {
        // Column already exists on databases that were migrated earlier.
      }
    })
  );
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function dataUrlInfo(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1];
  const base64 = match[2];
  const ext = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[contentType] || "bin";
  return { contentType, base64, ext };
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function saveDataUrlToR2(env, dataUrl, prefix, id) {
  const info = dataUrlInfo(dataUrl);
  if (!info || !env.FILES) return { url: dataUrl || "", key: "" };

  const key = `${prefix}/${id}.${info.ext}`;
  await env.FILES.put(key, base64ToArrayBuffer(info.base64), {
    httpMetadata: { contentType: info.contentType },
  });
  return { key, url: `/api/files/${key}` };
}

async function queueAlimtalk(env, message) {
  const now = new Date().toISOString();
  const id = createId("talk");
  await env.DB.prepare(
    `INSERT INTO alimtalk_queue
      (id, status, type, target_role, target_name, target_phone, title, body, related_id, created_at, sent_at, canceled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      message.status || "ready",
      message.type || "notice",
      message.targetRole || "",
      message.targetName || "",
      message.targetPhone || "",
      message.title || "알림",
      message.body || "",
      message.relatedId || "",
      now,
      "",
      ""
    )
    .run();
}

async function getSellerApplications(env) {
  const result = await env.DB.prepare("SELECT * FROM seller_applications ORDER BY requested_at DESC").all();
  return json({ ok: true, rows: result.results.map(normalizeSellerApplication) });
}

async function createSellerApplication(env, request) {
  const body = await request.json();
  if (!body.sellerId || !body.branch || !body.manager || !body.phone) {
    return json({ ok: false, message: "판매자 아이디, 지점명, 매니저 이름, 연락처가 필요합니다." }, 400);
  }

  const id = body.id || createId("seller");
  const now = body.requestedAt || new Date().toISOString();
  const savedCard = await saveDataUrlToR2(env, body.cardImage, "seller-cards", id);
  const cardImage = savedCard.url || body.cardImage || "";
  const cardImageKey = savedCard.key || body.cardImageKey || "";

  const duplicate = await env.DB.prepare(
    "SELECT id FROM seller_applications WHERE seller_id = ? OR phone = ? LIMIT 1"
  )
    .bind(body.sellerId, body.phone)
    .first();

  if (duplicate && duplicate.id !== id) {
    return json({ ok: false, message: "이미 접수된 판매자 신청입니다." }, 409);
  }

  await env.DB.prepare(
    `INSERT OR REPLACE INTO seller_applications
      (id, status, requested_at, reviewed_at, review_memo, seller_id, password, channel, branch, branch_region,
       manager, manager_position, phone, card_image, card_image_key, memo, consent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.status || "pending",
      now,
      body.reviewedAt || "",
      body.reviewMemo || "",
      body.sellerId,
      body.password || "",
      body.channel || "",
      body.branch || "",
      body.branchRegion || "",
      body.manager || "",
      body.managerPosition || "",
      body.phone || "",
      cardImage,
      cardImageKey,
      body.memo || "",
      JSON.stringify(body.consent || {})
    )
    .run();

  const row = normalizeSellerApplication(
    await env.DB.prepare("SELECT * FROM seller_applications WHERE id = ?").bind(id).first()
  );

  await queueAlimtalk(env, {
    type: "seller-application-received",
    targetRole: "seller",
    targetName: row.manager,
    targetPhone: row.phone,
    title: "판매자 등록 신청 접수 안내",
    body: `${sellerName(row)} 등록 신청이 접수되었습니다. 관리자 검토 후 승인 또는 반려 안내를 발송합니다.`,
    relatedId: row.id,
  });

  return json({ ok: true, row }, 201);
}

async function updateSellerApplication(env, request, id) {
  const body = await request.json();
  const row = normalizeSellerApplication(
    await env.DB.prepare("SELECT * FROM seller_applications WHERE id = ?").bind(id).first()
  );
  if (!row) return json({ ok: false, message: "신청 정보를 찾을 수 없습니다." }, 404);

  const status = body.status || row.status;
  const reviewMemo = body.reviewMemo || row.reviewMemo || "";
  const reviewedAt = new Date().toISOString();

  await env.DB.prepare(
    "UPDATE seller_applications SET status = ?, reviewed_at = ?, review_memo = ? WHERE id = ?"
  )
    .bind(status, reviewedAt, reviewMemo, id)
    .run();

  const updated = {
    ...row,
    status,
    reviewedAt,
    reviewMemo,
  };

  if (status === "approved") {
    const approvedAt = reviewedAt;
    await env.DB.prepare(
      `INSERT OR REPLACE INTO approved_sellers
        (id, status, seller_id, password, channel, branch, branch_region, manager, manager_position, phone,
         card_image, card_image_key, memo, consent_json, requested_at, reviewed_at, review_memo, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        updated.id,
        "approved",
        updated.sellerId,
        updated.password,
        updated.channel,
        updated.branch,
        updated.branchRegion,
        updated.manager,
        updated.managerPosition,
        updated.phone,
        updated.cardImage,
        updated.cardImageKey || "",
        updated.memo,
        JSON.stringify(updated.consent || {}),
        updated.requestedAt,
        reviewedAt,
        reviewMemo,
        approvedAt
      )
      .run();

    await queueAlimtalk(env, {
      type: "seller-approved",
      targetRole: "seller",
      targetName: updated.manager,
      targetPhone: updated.phone,
      title: "판매자 등록 승인 안내",
      body: `${sellerName(updated)} 등록이 승인되었습니다. 신청하신 아이디(${updated.sellerId})로 판매자 페이지에 로그인할 수 있습니다.`,
      relatedId: updated.id,
    });
  }

  if (status === "rejected") {
    await queueAlimtalk(env, {
      type: "seller-rejected",
      targetRole: "seller",
      targetName: updated.manager,
      targetPhone: updated.phone,
      title: "판매자 등록 반려 안내",
      body: `${sellerName(updated)} 등록 신청이 반려되었습니다. 사유: ${reviewMemo || "등록 정보 확인이 필요합니다."}`,
      relatedId: updated.id,
    });
  }

  return json({ ok: true, row: updated });
}

async function getApprovedSellers(env) {
  await ensureMasterSeller(env);
  const result = await env.DB.prepare("SELECT * FROM approved_sellers ORDER BY approved_at DESC").all();
  return json({ ok: true, rows: result.results.map(normalizeApprovedSeller) });
}

async function getQuoteImages(env, quoteId, includeFull = true) {
  const now = new Date().toISOString();
  const sql = includeFull
    ? `SELECT * FROM quote_images
       WHERE quote_id = ? AND (expires_at = '' OR expires_at >= ?)
       ORDER BY sort_order ASC`
    : `SELECT * FROM quote_images
       WHERE quote_id = ? AND image_type = 'thumbnail' AND (expires_at = '' OR expires_at >= ?)
       ORDER BY sort_order ASC`;
  const result = await env.DB.prepare(sql).bind(quoteId, now).all();
  return result.results || [];
}

async function getCustomerQuotes(env, request) {
  await ensureCustomerQuoteColumns(env);
  const url = new URL(request.url);
  const customer = String(url.searchParams.get("customer") || "").trim();
  const phone = normalizePhone(url.searchParams.get("phone"));
  const quoteNumber = String(url.searchParams.get("quoteNumber") || "").trim();
  const scope = String(url.searchParams.get("scope") || "seller");
  const now = new Date().toISOString();

  let rows = [];
  if (scope === "lookup" && customer && phone) {
    const result = quoteNumber
      ? await env.DB.prepare(
          `SELECT * FROM customer_quotes
           WHERE customer = ? AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = ? AND quote_number = ? AND (personal_expires_at = '' OR personal_expires_at >= ?)
           ORDER BY created_at DESC`
        )
          .bind(customer, phone, quoteNumber, now)
          .all()
      : await env.DB.prepare(
          `SELECT * FROM customer_quotes
           WHERE customer = ? AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = ? AND (personal_expires_at = '' OR personal_expires_at >= ?)
           ORDER BY created_at DESC`
        )
          .bind(customer, phone, now)
          .all();
    rows = result.results || [];
  } else {
    const result = await env.DB.prepare(
      `SELECT * FROM customer_quotes
       WHERE status = 'open' AND (quote_expires_at = '' OR quote_expires_at >= ?)
       ORDER BY created_at DESC`
    )
      .bind(now)
      .all();
    rows = result.results || [];
  }

  const normalized = [];
  for (const row of rows) {
    const includeFull = scope === "lookup" || (row.full_images_expires_at && row.full_images_expires_at >= now);
    const images = await getQuoteImages(env, row.id, includeFull);
    normalized.push(normalizeCustomerQuote(row, images));
  }

  return json({ ok: true, rows: normalized });
}

async function createCustomerQuote(env, request) {
  await ensureCustomerQuoteColumns(env);
  const body = await request.json();
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];

  if (!body.quoteNumber || !body.customer || !body.phone || !body.items || !images.length) {
    return json({ ok: false, message: "고객명, 연락처, 품목, 견적서 이미지가 필요합니다." }, 400);
  }

  const id = body.id || createId("quote");
  const createdAt = body.createdAt || new Date().toISOString();
  const quoteExpiresAt = addHours(createdAt, 48);
  const fullImagesExpiresAt = addDays(createdAt, 7);
  const personalExpiresAt = addDays(createdAt, 365);

  const thumbnailDataUrl = body.thumbnailImage || images[0];
  const thumbnail = await saveDataUrlToR2(env, thumbnailDataUrl, "quote-thumbnails", `${id}-thumb`);
  const thumbnailUrl = thumbnail.url || thumbnailDataUrl || "";
  const thumbnailKey = thumbnail.key || "";

  await env.DB.prepare(
    `INSERT INTO customer_quotes
      (id, quote_number, customer, phone, items, purchase_purpose, price, region, memo, status,
       selected_bid_id, sale_completed_at, thumbnail_image, thumbnail_image_key, quote_expires_at,
       full_images_expires_at, personal_expires_at, created_at, consent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.quoteNumber,
      body.customer,
      body.phone,
      body.items,
      body.purchasePurpose || "",
      Number(body.price || 0),
      body.region || "",
      body.memo || "",
      "open",
      "",
      "",
      thumbnailUrl,
      thumbnailKey,
      quoteExpiresAt,
      fullImagesExpiresAt,
      personalExpiresAt,
      createdAt,
      JSON.stringify(body.consent || {})
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO quote_images (id, quote_id, object_key, url, image_type, sort_order, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(createId("qimg"), id, thumbnailKey, thumbnailUrl, "thumbnail", 0, personalExpiresAt, createdAt)
    .run();

  for (let index = 0; index < images.length; index += 1) {
    const saved = await saveDataUrlToR2(env, images[index], "quote-originals", `${id}-${index + 1}`);
    await env.DB.prepare(
      `INSERT INTO quote_images (id, quote_id, object_key, url, image_type, sort_order, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        createId("qimg"),
        id,
        saved.key || "",
        saved.url || images[index],
        "full",
        index + 1,
        fullImagesExpiresAt,
        createdAt
      )
      .run();
  }

  await queueAlimtalk(env, {
    type: "customer-quote-received",
    targetRole: "customer",
    targetName: body.customer,
    targetPhone: body.phone,
    title: "견적 요청 접수 안내",
    body: `${body.customer} 고객님, 견적 요청이 정상 접수되었습니다. 견적번호: ${body.quoteNumber}`,
    relatedId: id,
  });

  const row = await env.DB.prepare("SELECT * FROM customer_quotes WHERE id = ?").bind(id).first();
  const savedImages = await getQuoteImages(env, id, true);
  return json({ ok: true, row: normalizeCustomerQuote(row, savedImages) }, 201);
}

async function getAlimtalk(env) {
  const result = await env.DB.prepare("SELECT * FROM alimtalk_queue ORDER BY created_at DESC").all();
  return json({ ok: true, rows: result.results.map(normalizeMessage) });
}

async function createAlimtalk(env, request) {
  const body = await request.json();
  await queueAlimtalk(env, body);
  return getAlimtalk(env);
}

async function updateAlimtalk(env, request, id) {
  const body = await request.json();
  const existing = await env.DB.prepare("SELECT id FROM alimtalk_queue WHERE id = ?").bind(id).first();
  if (!existing) return json({ ok: false, message: "알림톡 정보를 찾을 수 없습니다." }, 404);

  await env.DB.prepare(
    "UPDATE alimtalk_queue SET status = ?, sent_at = ?, canceled_at = ? WHERE id = ?"
  )
    .bind(body.status || "ready", body.sentAt || "", body.canceledAt || "", id)
    .run();

  const row = normalizeMessage(
    await env.DB.prepare("SELECT * FROM alimtalk_queue WHERE id = ?").bind(id).first()
  );
  return json({ ok: true, row });
}

async function getFile(env, key) {
  if (!env.FILES) return json({ ok: false, message: "R2 바인딩이 필요합니다." }, 500);
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}

async function uploadFile(env, request) {
  const body = await request.json();
  const id = body.id || createId("upload");
  const prefix = body.prefix || "uploads";
  const saved = await saveDataUrlToR2(env, body.dataUrl, prefix, id);
  if (!saved.key) return json({ ok: false, message: "저장할 이미지 데이터가 필요합니다." }, 400);
  return json({ ok: true, key: saved.key, url: saved.url });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const pathParts = Array.isArray(params.path) ? params.path : [];
  const path = pathParts.join("/");
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });
  if (!env.DB) return json({ ok: false, message: "D1 DB 바인딩(DB)이 필요합니다." }, 500);

  if (path === "seller-applications" && method === "GET") return getSellerApplications(env);
  if (path === "seller-applications" && method === "POST") return createSellerApplication(env, request);
  if (path.startsWith("seller-applications/") && method === "PATCH") {
    return updateSellerApplication(env, request, decodeURIComponent(pathParts.slice(1).join("/")));
  }

  if (path === "approved-sellers" && method === "GET") return getApprovedSellers(env);

  if (path === "customer-quotes" && method === "GET") return getCustomerQuotes(env, request);
  if (path === "customer-quotes" && method === "POST") return createCustomerQuote(env, request);

  if (path === "alimtalk" && method === "GET") return getAlimtalk(env);
  if (path === "alimtalk" && method === "POST") return createAlimtalk(env, request);
  if (path.startsWith("alimtalk/") && method === "PATCH") {
    return updateAlimtalk(env, request, decodeURIComponent(pathParts.slice(1).join("/")));
  }

  if (path === "uploads" && method === "POST") return uploadFile(env, request);
  if (path.startsWith("files/") && method === "GET") return getFile(env, decodeURIComponent(pathParts.slice(1).join("/")));

  if (path === "send-mail" && method === "POST") {
    return json({ ok: false, message: "정식 서비스 메일 발송은 별도 메일 API 연동이 필요합니다." }, 501);
  }

  return json({ ok: false, message: "API를 찾을 수 없습니다." }, 404);
}
