const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SOLAPI_DEFAULTS = {
  SOLAPI_CHANNEL_ID: "KA01PF260720091629575EzVmd2YRyU7",
  SOLAPI_FROM: "01066312323",
  SOLAPI_ADMIN_PHONE: "01066312323",
  SOLAPI_TEMPLATE_CUSTOMER_QUOTE_RECEIVED: "KA01TP260721025042754h4ZUWHp0Vl8",
  SOLAPI_TEMPLATE_CUSTOMER_QUOTE_CLOSED: "KA01TP2607210258227887LLx9OshNug",
  SOLAPI_TEMPLATE_CUSTOMER_BID_RECEIVED: "KA01TP260721025517053z5NPvs1ZUIX",
  SOLAPI_TEMPLATE_ADMIN_SELLER_APPLICATION: "KA01TP2607210300081256MK0cxuHata",
  SOLAPI_TEMPLATE_SELLER_BID_SELECTED: "KA01TP260721133628815TgDs1sAwUhc",
  SOLAPI_TEMPLATE_SELLER_APPROVED: "KA01TP2607211355258674q0EFuag5GE",
};

const PUBLIC_API_VERSION = "20260723-seller-admin-alert-trace";

function solapiValue(env, key) {
  return String(env?.[key] || SOLAPI_DEFAULTS[key] || "").trim();
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function quoteDateKey() {
  return todayKey().replace(/-/g, "");
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    request.headers.get("X-Real-IP") ||
    "unknown"
  );
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sellerName(row) {
  return [row.channel, row.branch].filter(Boolean).join(" ");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function formatAlimtalkPrice(value) {
  const amount = Number(value || 0);
  if (!amount) return "";
  if (amount >= 10000) return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString("ko-KR")}만원`;
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
  await ensureSellerColumns(env);
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
    templateId: row.template_id || "",
    variables: parseJson(row.variables_json, {}),
    solapiGroupId: row.solapi_group_id || "",
    solapiMessageId: row.solapi_message_id || "",
    errorMessage: row.error_message || "",
    solapiResponse: parseJson(row.solapi_response_json, null),
    createdAt: row.created_at || "",
    sentAt: row.sent_at || "",
    canceledAt: row.canceled_at || "",
  };
}

async function ensureAlimtalkColumns(env) {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS alimtalk_queue (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'ready',
        type TEXT NOT NULL,
        target_role TEXT DEFAULT '',
        target_name TEXT DEFAULT '',
        target_phone TEXT DEFAULT '',
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        related_id TEXT DEFAULT '',
        template_id TEXT DEFAULT '',
        variables_json TEXT DEFAULT '{}',
        solapi_group_id TEXT DEFAULT '',
        solapi_message_id TEXT DEFAULT '',
        error_message TEXT DEFAULT '',
        solapi_response_json TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        sent_at TEXT DEFAULT '',
        canceled_at TEXT DEFAULT ''
      )`
    ).run();
  } catch (error) {
    // Existing production databases may already have this table with a legacy shape.
  }

  const statements = [
    "ALTER TABLE alimtalk_queue ADD COLUMN template_id TEXT DEFAULT ''",
    "ALTER TABLE alimtalk_queue ADD COLUMN variables_json TEXT DEFAULT '{}'",
    "ALTER TABLE alimtalk_queue ADD COLUMN solapi_group_id TEXT DEFAULT ''",
    "ALTER TABLE alimtalk_queue ADD COLUMN solapi_message_id TEXT DEFAULT ''",
    "ALTER TABLE alimtalk_queue ADD COLUMN error_message TEXT DEFAULT ''",
    "ALTER TABLE alimtalk_queue ADD COLUMN solapi_response_json TEXT DEFAULT ''",
  ];

  for (const statement of statements) {
    try {
      await env.DB.prepare(statement).run();
    } catch (error) {
      // Column already exists on databases that were migrated earlier.
    }
  }
}

async function insertAlimtalkRow(env, row) {
  await ensureAlimtalkColumns(env);
  const valuesByColumn = {
    id: row.id,
    status: row.status,
    type: row.type,
    target_role: row.targetRole,
    target_name: row.targetName,
    target_phone: row.targetPhone,
    title: row.title,
    body: row.body,
    related_id: row.relatedId,
    template_id: row.templateId,
    variables_json: row.variablesJson,
    solapi_group_id: "",
    solapi_message_id: "",
    error_message: "",
    solapi_response_json: "",
    created_at: row.createdAt,
    sent_at: "",
    canceled_at: "",
  };
  const tableInfo = await env.DB.prepare("PRAGMA table_info(alimtalk_queue)").all();
  const columns = (tableInfo.results || [])
    .map((info) => info.name)
    .filter((name) => Object.prototype.hasOwnProperty.call(valuesByColumn, name));
  if (!columns.includes("id")) throw new Error("알림톡 큐 테이블에 id 컬럼이 없습니다.");

  const placeholders = columns.map(() => "?").join(", ");
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  return env.DB.prepare(`INSERT INTO alimtalk_queue (${quotedColumns}) VALUES (${placeholders})`)
    .bind(...columns.map((column) => valuesByColumn[column]))
    .run();
}

async function updateAlimtalkDeliveryResult(env, id, result, options = {}) {
  const sentAt = result.ok && result.queueStatus === "sent" ? new Date().toISOString() : "";
  const status = result.ok ? result.queueStatus || "accepted" : result.skipped ? "ready" : "failed";
  await ensureAlimtalkColumns(env);
  const valuesByColumn = {
    status,
    sent_at: sentAt,
    canceled_at: options.canceledAt,
    template_id: options.templateId,
    solapi_group_id: result.groupId || "",
    solapi_message_id: result.messageId || "",
    error_message: result.error || "",
    solapi_response_json: JSON.stringify(result.payload || {}),
  };
  const tableInfo = await env.DB.prepare("PRAGMA table_info(alimtalk_queue)").all();
  const assignments = [];
  const values = [];
  for (const info of tableInfo.results || []) {
    if (info.name === "id") continue;
    if (!Object.prototype.hasOwnProperty.call(valuesByColumn, info.name)) continue;
    const value = valuesByColumn[info.name];
    if (value === undefined) continue;
    assignments.push(`"${info.name}" = ?`);
    values.push(value);
  }
  if (!assignments.length) return;
  await env.DB.prepare(`UPDATE alimtalk_queue SET ${assignments.join(", ")} WHERE id = ?`).bind(...values, id).run();
}

async function updateAlimtalkStatusResult(env, id, status, sentAt, errorMessage, payload) {
  await ensureAlimtalkColumns(env);
  const valuesByColumn = {
    status,
    sent_at: sentAt,
    error_message: errorMessage,
    solapi_response_json: JSON.stringify(payload || {}),
  };
  const tableInfo = await env.DB.prepare("PRAGMA table_info(alimtalk_queue)").all();
  const assignments = [];
  const values = [];
  for (const info of tableInfo.results || []) {
    if (!Object.prototype.hasOwnProperty.call(valuesByColumn, info.name)) continue;
    assignments.push(`"${info.name}" = ?`);
    values.push(valuesByColumn[info.name]);
  }
  if (!assignments.length) return;
  await env.DB.prepare(`UPDATE alimtalk_queue SET ${assignments.join(", ")} WHERE id = ?`).bind(...values, id).run();
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
  const fullImages = images.filter((image) => image.image_type !== "thumbnail");
  const displayImages = fullImages.length ? fullImages : row.thumbnail_image ? [{ url: row.thumbnail_image }] : [];
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customer: row.customer,
    phone: row.phone,
    items: row.items,
    purchasePurpose: row.purchase_purpose || "",
    desiredBrand: row.desired_brand || "",
    price: Number(row.price || 0),
    region: row.region || "",
    memo: row.memo || "",
    status: row.status || "open",
    selectedBidId: row.selected_bid_id || null,
    contactReleaseScope: row.contact_release_scope || "selected",
    contactReleasedBidIds: parseJson(row.contact_released_bid_ids, []),
    submissionCount: Number(row.submission_count || 1),
    previousLowestPrice: Number(row.previous_lowest_price || 0),
    rankNoticeQueuedAt: row.rank_notice_queued_at || "",
    saleCompletedAt: row.sale_completed_at || "",
    thumbnailImage: row.thumbnail_image || "",
    thumbnailImageKey: row.thumbnail_image_key || "",
    quoteExpiresAt: row.quote_expires_at || "",
    fullImagesExpiresAt: row.full_images_expires_at || "",
    personalExpiresAt: row.personal_expires_at || "",
    createdAt: row.created_at || "",
    consent: parseJson(row.consent_json, {}),
    image: displayImages[0]?.url || row.thumbnail_image || "",
    images: displayImages.map((image) => image.url),
  };
}

function hideSellerOnlyQuoteFields(quote) {
  if (!quote) return quote;
  const safeQuote = { ...quote };
  delete safeQuote.submissionCount;
  delete safeQuote.previousLowestPrice;
  delete safeQuote.rankNoticeQueuedAt;
  return safeQuote;
}

function normalizeBid(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestId: row.quote_id,
    quoteId: row.quote_id,
    sellerId: row.seller_id,
    seller: row.seller || "",
    channel: row.channel || "",
    branch: row.branch || "",
    manager: row.manager || "",
    managerPosition: row.manager_position || "",
    phone: row.phone || "",
    cardImage: row.card_image || "",
    price: Number(row.price || 0),
    benefits: row.benefits || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

async function ensureCustomerQuoteColumns(env) {
  const statements = [
    "ALTER TABLE customer_quotes ADD COLUMN thumbnail_image TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN thumbnail_image_key TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN quote_expires_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN full_images_expires_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN personal_expires_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN desired_brand TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN contact_release_scope TEXT DEFAULT 'selected'",
    "ALTER TABLE customer_quotes ADD COLUMN contact_released_bid_ids TEXT DEFAULT '[]'",
    "ALTER TABLE customer_quotes ADD COLUMN submission_count INTEGER DEFAULT 1",
    "ALTER TABLE customer_quotes ADD COLUMN previous_lowest_price INTEGER DEFAULT 0",
    "ALTER TABLE customer_quotes ADD COLUMN rank_notice_queued_at TEXT DEFAULT ''",
    "ALTER TABLE customer_quotes ADD COLUMN sale_completed_at TEXT DEFAULT ''",
    "ALTER TABLE quote_images ADD COLUMN image_type TEXT DEFAULT 'full'",
    "ALTER TABLE quote_images ADD COLUMN expires_at TEXT DEFAULT ''",
  ];

  for (const statement of statements) {
    try {
      await env.DB.prepare(statement).run();
    } catch (error) {
      // Column already exists on databases that were migrated earlier.
    }
  }
}

async function ensureSellerColumns(env) {
  const statements = [
    "ALTER TABLE seller_applications ADD COLUMN reviewed_at TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN review_memo TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN password TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN channel TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN branch_region TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN manager_position TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN card_image TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN card_image_key TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN memo TEXT DEFAULT ''",
    "ALTER TABLE seller_applications ADD COLUMN consent_json TEXT DEFAULT '{}'",
    "ALTER TABLE approved_sellers ADD COLUMN branch_region TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN manager_position TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN card_image TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN card_image_key TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN memo TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN consent_json TEXT DEFAULT '{}'",
    "ALTER TABLE approved_sellers ADD COLUMN requested_at TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN reviewed_at TEXT DEFAULT ''",
    "ALTER TABLE approved_sellers ADD COLUMN review_memo TEXT DEFAULT ''",
  ];

  for (const statement of statements) {
    try {
      await env.DB.prepare(statement).run();
    } catch (error) {
      // Column already exists on databases that were migrated earlier.
    }
  }
}

async function createUniqueQuoteNumber(env, preferred) {
  const requested = String(preferred || "").trim();
  if (requested) {
    const duplicate = await env.DB.prepare("SELECT id FROM customer_quotes WHERE quote_number = ? LIMIT 1")
      .bind(requested)
      .first();
    if (!duplicate) return requested;
  }

  const match = requested.match(/^(\d{8})-\d{4}$/);
  const dateKey = match?.[1] || quoteDateKey();
  const result = await env.DB.prepare(
    "SELECT quote_number FROM customer_quotes WHERE quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1"
  )
    .bind(`${dateKey}-%`)
    .first();
  const lastSequence = Number(String(result?.quote_number || "").split("-")[1] || 0);
  return `${dateKey}-${String(lastSequence + 1).padStart(4, "0")}`;
}

async function getPreviousQuoteStats(env, customer, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!customer || !normalizedPhone) return { submissionCount: 1, previousLowestPrice: 0 };

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM customer_quotes
     WHERE customer = ? AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = ?`
  )
    .bind(customer, normalizedPhone)
    .first();

  const previousQuote = await env.DB.prepare(
    `SELECT id
     FROM customer_quotes
     WHERE customer = ? AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = ?
     ORDER BY created_at DESC
     LIMIT 1`
  )
    .bind(customer, normalizedPhone)
    .first();

  let previousLowestPrice = 0;
  if (previousQuote?.id) {
    const lowest = await env.DB.prepare("SELECT MIN(price) AS lowest FROM bids WHERE quote_id = ?")
      .bind(previousQuote.id)
      .first();
    previousLowestPrice = Number(lowest?.lowest || 0);
  }

  return {
    submissionCount: Number(countRow?.total || 0) + 1,
    previousLowestPrice,
  };
}

async function getBidsForQuote(env, quoteId) {
  const result = await env.DB.prepare("SELECT * FROM bids WHERE quote_id = ? ORDER BY price ASC, created_at ASC")
    .bind(quoteId)
    .all();
  return (result.results || []).map(normalizeBid);
}

async function closeExpiredQuotes(env) {
  await ensureCustomerQuoteColumns(env);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `SELECT * FROM customer_quotes
     WHERE quote_expires_at != ''
       AND quote_expires_at < ?
       AND (rank_notice_queued_at = '' OR rank_notice_queued_at IS NULL)`
  )
    .bind(now)
    .all();

  const rows = result.results || [];
  for (const quote of rows) {
    await queueAlimtalk(env, {
      type: "customer-quote-closed",
      targetRole: "customer",
      targetName: quote.customer,
      targetPhone: quote.phone,
      title: "견적 비교 시간이 종료되었습니다",
      body: `${quote.customer} 고객님의 견적 비교 시간이 종료되었습니다. 견적번호 ${quote.quote_number}의 제안 내역을 확인해 주세요.`,
      relatedId: quote.id,
      variables: {
        "#{고객명}": quote.customer,
        "#{견적번호}": quote.quote_number,
      },
    });
    await env.DB.prepare("UPDATE customer_quotes SET status = 'closed', rank_notice_queued_at = ? WHERE id = ?")
      .bind(now, quote.id)
      .run();
  }
}

async function ensureGuideDismissalTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS guide_dismissals (
      id TEXT PRIMARY KEY,
      guide_type TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      dismiss_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_guide_dismissals_lookup ON guide_dismissals(guide_type, ip_hash, dismiss_date)"
  ).run();
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

function getSolapiConfig(env) {
  return {
    apiKey: String(env.SOLAPI_API_KEY || "").trim(),
    apiSecret: String(env.SOLAPI_API_SECRET || "").trim(),
    channelId: solapiValue(env, "SOLAPI_CHANNEL_ID"),
    from: normalizePhone(solapiValue(env, "SOLAPI_FROM")),
    adminPhone: normalizePhone(solapiValue(env, "SOLAPI_ADMIN_PHONE")),
  };
}

function createSolapiSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createHmacSha256Hex(secret, text) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSolapiAuthorization(config) {
  const date = new Date().toISOString();
  const salt = createSolapiSalt();
  const signature = await createHmacSha256Hex(config.apiSecret, date + salt);
  return `HMAC-SHA256 apiKey=${config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function getSolapiTemplateId(env, type) {
  const templates = {
    "customer-quote-received": solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_RECEIVED"),
    "customer-bid-received": solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_BID_RECEIVED"),
    "customer-quote-closed": solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_CLOSED"),
    "seller-bid-selected": solapiValue(env, "SOLAPI_TEMPLATE_SELLER_BID_SELECTED"),
    "seller-approved": solapiValue(env, "SOLAPI_TEMPLATE_SELLER_APPROVED"),
    "seller-application-received": solapiValue(env, "SOLAPI_TEMPLATE_ADMIN_SELLER_APPLICATION"),
  };
  return templates[type] || "";
}

function getSolapiMissingKeys(config, message, templateId) {
  return [
    ["SOLAPI_API_KEY", config.apiKey],
    ["SOLAPI_API_SECRET", config.apiSecret],
    ["SOLAPI_CHANNEL_ID", config.channelId],
    ["SOLAPI_FROM", config.from],
    ["templateId", templateId],
    ["targetPhone", normalizePhone(message.targetPhone)],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function createSolapiMessageBody(config, message, templateId) {
  const variables = {};
  Object.entries(message.variables || {}).forEach(([key, value]) => {
    variables[key] = String(value ?? "");
  });

  return {
    messages: [
      {
        type: "ATA",
        to: normalizePhone(message.targetPhone),
        from: config.from,
        kakaoOptions: {
          pfId: config.channelId,
          templateId,
          variables,
          disableSms: false,
        },
      },
    ],
    strict: false,
    allowDuplicates: Boolean(message.allowDuplicates),
    showMessageList: true,
  };
}

function parseSolapiSendResult(response, payload) {
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload.errorMessage || payload.message || "솔라피 발송에 실패했습니다.",
      payload,
    };
  }

  const firstMessage = payload.messageList?.[0] || payload.messages?.[0] || {};
  const failedMessage = payload.failedMessageList?.[0] || {};
  const failedCount = Number(
    payload.groupInfo?.failedCount ||
      payload.failedCount ||
      payload.groupInfo?.count?.registeredFailed ||
      payload.groupInfo?.count?.sentFailed ||
      payload.failedMessageList?.length ||
      0
  );
  const firstStatusCode = String(firstMessage.statusCode || failedMessage.statusCode || "");
  const groupStatus = String(payload.groupInfo?.status || "").toUpperCase();
  const sentSuccessCount = Number(payload.groupInfo?.count?.sentSuccess || payload.sentSuccess || 0);
  const nonSuccessStatusMessage =
    firstMessage.statusMessage && firstStatusCode && !firstStatusCode.startsWith("2")
      ? firstMessage.statusMessage
      : "";
  const firstError =
    failedMessage.statusMessage ||
    failedMessage.errorMessage ||
    failedMessage.errorCode ||
    nonSuccessStatusMessage ||
    firstMessage.errorMessage ||
    firstMessage.errorCode ||
    firstMessage.reason ||
    "";
  if (failedCount > 0 || firstError) {
    return {
      ok: false,
      status: response.status,
      error: firstError || "솔라피에서 발송 실패 응답을 반환했습니다.",
      payload,
      groupId: payload.groupInfo?.groupId || payload.groupId || "",
      messageId: firstMessage.messageId || failedMessage.messageId || firstMessage.message_id || "",
    };
  }

  let queueStatus = "accepted";
  if (firstStatusCode === "4000" || sentSuccessCount > 0) {
    queueStatus = "sent";
  } else if (groupStatus === "SENDING" || firstStatusCode === "2000" || firstStatusCode.startsWith("3")) {
    queueStatus = "sending";
  } else if (groupStatus === "COMPLETE") {
    queueStatus = "accepted";
  }

  return {
    ok: true,
    queueStatus,
    payload,
    groupId: payload.groupInfo?.groupId || payload.groupInfo?._id || payload.groupId || "",
    messageId: firstMessage.messageId || firstMessage.message_id || "",
  };
}

async function sendSolapiAlimtalk(env, message, templateId) {
  const config = getSolapiConfig(env);
  const missingKeys = getSolapiMissingKeys(config, message, templateId);
  if (missingKeys.length) {
    return {
      ok: false,
      skipped: true,
      error: `솔라피 설정 누락: ${missingKeys.join(", ")}`,
    };
  }

  const authorization = await createSolapiAuthorization(config);
  const response = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createSolapiMessageBody(config, message, templateId)),
  });
  const payload = await response.json().catch(() => ({}));
  return parseSolapiSendResult(response, payload);
}

async function sendSolapiTextMessage(env, message) {
  const config = getSolapiConfig(env);
  const missingKeys = [
    ["SOLAPI_API_KEY", config.apiKey],
    ["SOLAPI_API_SECRET", config.apiSecret],
    ["SOLAPI_FROM", config.from],
    ["targetPhone", normalizePhone(message.targetPhone)],
    ["body", message.body],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length) {
    return {
      ok: false,
      skipped: true,
      error: `문자 발송 설정 누락: ${missingKeys.join(", ")}`,
    };
  }

  const authorization = await createSolapiAuthorization(config);
  const response = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          type: "LMS",
          to: normalizePhone(message.targetPhone),
          from: config.from,
          text: message.body,
        },
      ],
      strict: false,
      allowDuplicates: true,
      showMessageList: true,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  return parseSolapiSendResult(response, payload);
}

async function queueAlimtalk(env, message) {
  await ensureAlimtalkColumns(env);
  const now = new Date().toISOString();
  const id = createId("talk");
  const templateId = message.templateId || getSolapiTemplateId(env, message.type || "notice");
  const variablesJson = JSON.stringify(message.variables || {});
  await insertAlimtalkRow(env, {
    id,
    status: message.status || "ready",
    type: message.type || "notice",
    targetRole: message.targetRole || "",
    targetName: message.targetName || "",
    targetPhone: message.targetPhone || "",
    title: message.title || "알림",
    body: message.body || "",
    relatedId: message.relatedId || "",
    templateId,
    variablesJson,
    createdAt: now,
  });

  let result;
  try {
    result = await sendSolapiAlimtalk(env, message, templateId);
  } catch (error) {
    result = {
      ok: false,
      error: error?.message || "알림톡 발송 처리 중 오류가 발생했습니다.",
    };
  }
  await updateAlimtalkDeliveryResult(env, id, result);

  return { id, ...result };
}

async function queueTextMessage(env, message) {
  await ensureAlimtalkColumns(env);
  const now = new Date().toISOString();
  const id = createId("talk");
  await insertAlimtalkRow(env, {
    id,
    status: message.status || "ready",
    type: message.type || "sms-notice",
    targetRole: message.targetRole || "",
    targetName: message.targetName || "",
    targetPhone: message.targetPhone || "",
    title: message.title || "문자 알림",
    body: message.body || "",
    relatedId: message.relatedId || "",
    templateId: "",
    variablesJson: JSON.stringify(message.variables || {}),
    createdAt: now,
  });

  let result;
  try {
    result = await sendSolapiTextMessage(env, message);
  } catch (error) {
    result = {
      ok: false,
      error: error?.message || "문자 발송 처리 중 오류가 발생했습니다.",
    };
  }
  await updateAlimtalkDeliveryResult(env, id, result);

  return { id, ...result };
}

async function queueSellerApplicationAdminAlert(env, row) {
  await ensureAlimtalkColumns(env);
  const message = {
    type: "seller-application-received",
    targetRole: "admin",
    targetName: "관리자",
    targetPhone: solapiValue(env, "SOLAPI_ADMIN_PHONE") || "01066312323",
    title: "판매자 등록 요청이 접수되었습니다",
    body: `${sellerName(row)} ${row.manager} 매니저의 판매자 등록 요청이 접수되었습니다.`,
    relatedId: row.id,
    templateId: solapiValue(env, "SOLAPI_TEMPLATE_ADMIN_SELLER_APPLICATION") || "KA01TP2607210300081256MK0cxuHata",
    allowDuplicates: true,
    variables: {
      "#{채널}": row.channel,
      "#{지점명}": row.branch,
      "#{매니저명}": row.manager,
      "#{연락처}": formatPhoneNumber(row.phone),
    },
  };
  const id = createId("talk");
  const now = new Date().toISOString();
  const variablesJson = JSON.stringify(message.variables || {});

  try {
    await env.DB.prepare(
      `INSERT INTO alimtalk_queue
        (id, status, type, target_role, target_name, target_phone, title, body, related_id,
         template_id, variables_json, solapi_group_id, solapi_message_id, error_message,
         created_at, sent_at, canceled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        "ready",
        message.type,
        message.targetRole,
        message.targetName,
        message.targetPhone,
        message.title,
        message.body,
        message.relatedId,
        message.templateId,
        variablesJson,
        "",
        "",
        "",
        now,
        "",
        ""
      )
      .run();
  } catch (insertError) {
    const fallbackId = createId("talk");
    const errorMessage = `판매자 등록 알림톡 큐 저장 실패: ${insertError?.message || "unknown"}`;
    await env.DB.prepare(
      `INSERT INTO alimtalk_queue
        (id, status, type, target_role, target_name, target_phone, title, body, related_id, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        fallbackId,
        "failed",
        message.type,
        message.targetRole,
        message.targetName,
        message.targetPhone,
        message.title,
        message.body,
        message.relatedId,
        errorMessage,
        now
      )
      .run();
    return { id: fallbackId, ok: false, error: errorMessage };
  }

  let result;
  try {
    result = await sendSolapiAlimtalk(env, message, message.templateId);
  } catch (error) {
    result = {
      ok: false,
      error: error?.message || "판매자 등록 관리자 알림톡 발송 처리 중 오류가 발생했습니다.",
    };
  }

  const sentAt = result.ok && result.queueStatus === "sent" ? new Date().toISOString() : "";
  await env.DB.prepare(
    `UPDATE alimtalk_queue
     SET status = ?, sent_at = ?, solapi_group_id = ?, solapi_message_id = ?, error_message = ?
     WHERE id = ?`
  )
    .bind(
      result.ok ? result.queueStatus || "accepted" : result.skipped ? "ready" : "failed",
      sentAt,
      result.groupId || "",
      result.messageId || "",
      result.error || "",
      id
    )
    .run();

  return { id, ...result };
}

async function getSellerApplications(env) {
  await ensureSellerColumns(env);
  const result = await env.DB.prepare("SELECT * FROM seller_applications ORDER BY requested_at DESC").all();
  return json({ ok: true, rows: result.results.map(normalizeSellerApplication) });
}

async function traceSellerAdminAlert(env, sellerId, message) {
  await env.DB.prepare("UPDATE seller_applications SET review_memo = ? WHERE id = ?")
    .bind(message, sellerId)
    .run();
}

async function createSellerApplication(env, request) {
  await ensureSellerColumns(env);
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
    "SELECT id FROM seller_applications WHERE (seller_id = ? OR phone = ?) AND status IN ('pending', 'approved') LIMIT 1"
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

  await traceSellerAdminAlert(env, row.id, "관리자 알림톡 처리 시작");
  const adminAlert = await queueSellerApplicationAdminAlert(env, row).catch((error) => ({
    ok: false,
    error: error?.message || "판매자 등록 관리자 알림톡 처리 중 오류가 발생했습니다.",
  }));
  await traceSellerAdminAlert(
    env,
    row.id,
    adminAlert.ok
      ? `관리자 알림톡 처리 완료: ${adminAlert.id || ""}`
      : `관리자 알림톡 처리 실패: ${adminAlert.error || "unknown"}`
  );

  return json({ ok: true, row, adminAlert }, 201);
}

async function updateSellerApplication(env, request, id) {
  await ensureSellerColumns(env);
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
  await ensureSellerColumns(env);
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
  await closeExpiredQuotes(env);
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
    const quote = normalizeCustomerQuote(row, images);
    normalized.push(scope === "lookup" ? hideSellerOnlyQuoteFields(quote) : quote);
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
  const quoteNumber = await createUniqueQuoteNumber(env, body.quoteNumber);
  const quoteExpiresAt = addHours(createdAt, 48);
  const fullImagesExpiresAt = addDays(createdAt, 7);
  const personalExpiresAt = addDays(createdAt, 365);
  const previousStats = await getPreviousQuoteStats(env, String(body.customer || "").trim(), body.phone);

  const thumbnailDataUrl = body.thumbnailImage || images[0];
  const thumbnail = await saveDataUrlToR2(env, thumbnailDataUrl, "quote-thumbnails", `${id}-thumb`);
  const thumbnailUrl = thumbnail.url || thumbnailDataUrl || "";
  const thumbnailKey = thumbnail.key || "";

  await env.DB.prepare(
    `INSERT INTO customer_quotes
      (id, quote_number, customer, phone, items, purchase_purpose, desired_brand, price, region, memo, status,
       selected_bid_id, contact_release_scope, contact_released_bid_ids, submission_count, previous_lowest_price,
       rank_notice_queued_at, sale_completed_at, thumbnail_image, thumbnail_image_key, quote_expires_at,
       full_images_expires_at, personal_expires_at, created_at, consent_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      quoteNumber,
      body.customer,
      body.phone,
      body.items,
      body.purchasePurpose || "",
      body.desiredBrand || "",
      Number(body.price || 0),
      body.region || "",
      body.memo || "",
      "open",
      "",
      "selected",
      "[]",
      previousStats.submissionCount,
      previousStats.previousLowestPrice,
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
    relatedId: id,
    title: "견적 요청이 접수되었습니다",
    body: `${body.customer} 고객님의 견적 요청이 정상 접수되었습니다. 견적번호: ${quoteNumber}`,
    variables: {
      "#{고객명}": body.customer,
      "#{견적번호}": quoteNumber,
    },
  });

  const row = await env.DB.prepare("SELECT * FROM customer_quotes WHERE id = ?").bind(id).first();
  const savedImages = await getQuoteImages(env, id, true);
  return json({ ok: true, row: hideSellerOnlyQuoteFields(normalizeCustomerQuote(row, savedImages)) }, 201);
}

async function getBids(env, request) {
  await closeExpiredQuotes(env);
  const url = new URL(request.url);
  const quoteId = String(url.searchParams.get("quoteId") || "").trim();
  const sellerId = String(url.searchParams.get("sellerId") || "").trim();
  let sql = "SELECT * FROM bids";
  const bindings = [];
  const where = [];

  if (quoteId) {
    where.push("quote_id = ?");
    bindings.push(quoteId);
  }
  if (sellerId) {
    where.push("seller_id = ?");
    bindings.push(sellerId);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY price ASC, created_at ASC";

  const statement = env.DB.prepare(sql);
  const result = bindings.length ? await statement.bind(...bindings).all() : await statement.all();
  return json({ ok: true, rows: (result.results || []).map(normalizeBid) });
}

async function upsertBid(env, request) {
  await closeExpiredQuotes(env);
  const body = await request.json();
  if (!body.requestId || !body.sellerId || !body.price) {
    return json({ ok: false, message: "견적, 판매자, 제안 금액이 필요합니다." }, 400);
  }

  const quote = await env.DB.prepare("SELECT * FROM customer_quotes WHERE id = ?").bind(body.requestId).first();
  if (!quote) return json({ ok: false, message: "고객 견적을 찾을 수 없습니다." }, 404);
  if (quote.selected_bid_id) return json({ ok: false, message: "이미 선택된 견적은 제안 금액을 수정할 수 없습니다." }, 400);
  if (quote.quote_expires_at && quote.quote_expires_at < new Date().toISOString()) {
    return json({ ok: false, message: "견적 제안 가능 시간이 종료되었습니다." }, 400);
  }

  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM bids WHERE quote_id = ? AND seller_id = ? LIMIT 1")
    .bind(body.requestId, body.sellerId)
    .first();

  if (existing) {
    await env.DB.prepare(
      `UPDATE bids
       SET seller = ?, channel = ?, branch = ?, manager = ?, manager_position = ?, phone = ?,
           card_image = ?, price = ?, benefits = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        body.seller || "",
        body.channel || "",
        body.branch || "",
        body.manager || "",
        body.managerPosition || "",
        body.phone || "",
        body.cardImage || "",
        Number(body.price || 0),
        body.benefits || "",
        now,
        existing.id
      )
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO bids
        (id, quote_id, seller_id, seller, channel, branch, manager, manager_position, phone,
         card_image, price, benefits, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.id || createId("bid"),
        body.requestId,
        body.sellerId,
        body.seller || "",
        body.channel || "",
        body.branch || "",
        body.manager || "",
        body.managerPosition || "",
        body.phone || "",
        body.cardImage || "",
        Number(body.price || 0),
        body.benefits || "",
        now,
        now
      )
      .run();

    await queueAlimtalk(env, {
      type: "customer-bid-received",
      targetRole: "customer",
      targetName: quote.customer,
      targetPhone: quote.phone,
      relatedId: quote.id,
      title: "새로운 판매자 제안이 도착했습니다",
      body: `${quote.customer} 고객님의 견적번호 ${quote.quote_number}에 새로운 판매자 제안이 도착했습니다.`,
      variables: {
        "#{고객명}": quote.customer,
        "#{견적번호}": quote.quote_number,
        "#{제안금액}": formatAlimtalkPrice(body.price),
      },
    });
  }

  const row = await env.DB.prepare("SELECT * FROM bids WHERE quote_id = ? AND seller_id = ? LIMIT 1")
    .bind(body.requestId, body.sellerId)
    .first();
  return json({ ok: true, row: normalizeBid(row) }, existing ? 200 : 201);
}

async function selectBid(env, request) {
  await ensureCustomerQuoteColumns(env);
  const body = await request.json();
  const quoteId = String(body.requestId || "").trim();
  const bidId = String(body.bidId || "").trim();
  const scope = body.contactReleaseScope === "top3" ? "top3" : "selected";
  if (!quoteId || !bidId) return json({ ok: false, message: "선택할 견적 정보가 필요합니다." }, 400);

  const quote = await env.DB.prepare("SELECT * FROM customer_quotes WHERE id = ?").bind(quoteId).first();
  if (!quote) return json({ ok: false, message: "고객 견적을 찾을 수 없습니다." }, 404);
  if (quote.selected_bid_id && quote.selected_bid_id !== bidId) {
    return json({ ok: false, message: "이미 선택한 견적은 변경할 수 없습니다." }, 400);
  }

  const quoteBids = await getBidsForQuote(env, quoteId);
  const selectedBid = quoteBids.find((bid) => bid.id === bidId);
  if (!selectedBid) return json({ ok: false, message: "선택할 판매자 제안을 찾을 수 없습니다." }, 404);

  const releasedBidIds =
    scope === "top3"
      ? Array.from(new Set([...quoteBids.slice(0, 3).map((bid) => bid.id), bidId]))
      : [bidId];
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE customer_quotes
     SET selected_bid_id = ?, contact_release_scope = ?, contact_released_bid_ids = ?
     WHERE id = ?`
  )
    .bind(bidId, scope, JSON.stringify(releasedBidIds), quoteId)
    .run();

  for (const bid of quoteBids.filter((item) => releasedBidIds.includes(item.id))) {
    await queueAlimtalk(env, {
      type: "seller-bid-selected",
      targetRole: "seller",
      targetName: bid.manager || bid.seller,
      targetPhone: bid.phone,
      relatedId: quoteId,
      title: "고객님이 제안을 선택했습니다",
      body: `${bid.manager || "매니저"}님, 견적번호 ${quote.quote_number}에서 고객님 연락처 공개 대상 제안으로 선택되었습니다.`,
      variables: {
        "#{매니저명}": bid.manager || bid.seller || "",
        "#{견적번호}": quote.quote_number,
        "#{고객명}": quote.customer,
        "#{고객연락처}": formatPhoneNumber(quote.phone),
      },
    });
  }

  const row = await env.DB.prepare("SELECT * FROM customer_quotes WHERE id = ?").bind(quoteId).first();
  const images = await getQuoteImages(env, quoteId, true);
  return json({ ok: true, row: hideSellerOnlyQuoteFields(normalizeCustomerQuote(row, images)), releasedBidIds, selectedAt: now });
}

async function getAlimtalk(env) {
  await ensureAlimtalkColumns(env);
  const result = await env.DB.prepare("SELECT * FROM alimtalk_queue ORDER BY created_at DESC").all();
  return json({ ok: true, rows: result.results.map(normalizeMessage) });
}

async function getAlimtalkDebug(env) {
  await ensureAlimtalkColumns(env);
  const schema = await env.DB.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'alimtalk_queue'"
  ).first();
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM alimtalk_queue").first();
  const recent = await env.DB.prepare(
    "SELECT id, status, type, target_role, title, template_id, error_message, created_at, sent_at FROM alimtalk_queue ORDER BY created_at DESC LIMIT 5"
  ).all();
  const latestSeller = await env.DB.prepare(
    "SELECT id, status, review_memo, channel, branch, manager, phone, requested_at FROM seller_applications ORDER BY requested_at DESC LIMIT 1"
  ).first();
  return json({
    ok: true,
    version: PUBLIC_API_VERSION,
    tableSql: schema?.sql || "",
    count: count?.count || 0,
    recent: recent.results || [],
    latestSeller,
  });
}

async function createAlimtalk(env, request) {
  const body = await request.json();
  if (String(body.type || "").includes("sms")) {
    await queueTextMessage(env, body);
  } else {
    await queueAlimtalk(env, body);
  }
  return getAlimtalk(env);
}

async function updateAlimtalk(env, request, id) {
  await ensureAlimtalkColumns(env);
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

async function deleteAlimtalk(env, id) {
  await ensureAlimtalkColumns(env);
  const existing = await env.DB.prepare("SELECT id FROM alimtalk_queue WHERE id = ?").bind(id).first();
  if (!existing) return json({ ok: false, message: "알림톡 정보를 찾을 수 없습니다." }, 404);

  await env.DB.prepare("DELETE FROM alimtalk_queue WHERE id = ?").bind(id).run();
  return json({ ok: true, id });
}

async function resendAlimtalk(env, id) {
  await ensureAlimtalkColumns(env);
  const row = normalizeMessage(
    await env.DB.prepare("SELECT * FROM alimtalk_queue WHERE id = ?").bind(id).first()
  );
  if (!row) return json({ ok: false, message: "알림톡 정보를 찾을 수 없습니다." }, 404);

  const templateId = row.templateId || getSolapiTemplateId(env, row.type || "notice");
  const isTextMessage = String(row.type || "").includes("sms");
  const result = await (isTextMessage ? sendSolapiTextMessage(env, row) : sendSolapiAlimtalk(env, row, templateId)).catch(
    (error) => ({
      ok: false,
      error: error?.message || "솔라피 재발송 처리 중 오류가 발생했습니다.",
    })
  );
  await updateAlimtalkDeliveryResult(env, id, result, { canceledAt: "", templateId });

  const updated = normalizeMessage(
    await env.DB.prepare("SELECT * FROM alimtalk_queue WHERE id = ?").bind(id).first()
  );
  return json({
    ok: Boolean(result.ok),
    row: updated,
    message: result.ok ? "알림톡을 재발송했습니다." : result.error || "알림톡 재발송에 실패했습니다.",
  });
}

function getSolapiStatusFromMessage(message) {
  const statusCode = String(message?.statusCode || "");
  const reason = message?.reason || message?.statusMessage || message?.errorMessage || "";
  if (statusCode === "4000") return { status: "sent", error: "" };
  if (statusCode === "2000") return { status: "accepted", error: "" };
  if (statusCode.startsWith("3000")) return { status: "sending", error: "" };
  if (statusCode) return { status: "failed", error: reason || `솔라피 상태 코드 ${statusCode}` };
  return { status: "accepted", error: reason || "" };
}

async function refreshAlimtalkStatus(env, id) {
  try {
    await ensureAlimtalkColumns(env);
    const row = normalizeMessage(
      await env.DB.prepare("SELECT * FROM alimtalk_queue WHERE id = ?").bind(id).first()
    );
    if (!row) return json({ ok: false, message: "알림톡 정보를 찾을 수 없습니다." }, 404);
    if (!row.solapiGroupId) {
      return json({ ok: false, row, message: "솔라피 그룹 ID가 없어 상태를 조회할 수 없습니다." }, 400);
    }

    const config = getSolapiConfig(env);
    if (!config.apiKey || !config.apiSecret) {
      return json({ ok: false, row, message: "솔라피 API 키 또는 시크릿이 설정되지 않았습니다." }, 400);
    }

    const authorization = await createSolapiAuthorization(config);
    const response = await fetch(
      `https://api.solapi.com/messages/v4/groups/${encodeURIComponent(row.solapiGroupId)}/messages?limit=20`,
      { method: "GET", headers: { Authorization } }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.errorMessage || payload.message || "솔라피 상태 조회에 실패했습니다.";
      return json({ ok: false, row, message, solapiResponse: payload }, response.status);
    }

    const messageList = payload.messageList || {};
    const messages = Array.isArray(messageList) ? messageList : Object.values(messageList || {});
    const solapiMessage =
      messages.find((message) => message.messageId === row.solapiMessageId) || messages[0] || {};
    const next = getSolapiStatusFromMessage(solapiMessage);
    const sentAt = next.status === "sent" ? new Date().toISOString() : row.sentAt || "";

    await updateAlimtalkStatusResult(env, id, next.status, sentAt, next.error, { ...payload, latestMessage: solapiMessage });

    const updated = normalizeMessage(
      await env.DB.prepare("SELECT * FROM alimtalk_queue WHERE id = ?").bind(id).first()
    );
    return json({ ok: true, row: updated, latestMessage: solapiMessage });
  } catch (error) {
    return json(
      {
        ok: false,
        message: error?.message || "솔라피 상태 조회 처리 중 오류가 발생했습니다.",
      },
      500
    );
  }
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

function sanitizeGuideType(value) {
  const type = String(value || "");
  return ["customer", "seller"].includes(type) ? type : "";
}

async function getGuideDismissal(env, request) {
  await ensureGuideDismissalTable(env);
  const url = new URL(request.url);
  const guideType = sanitizeGuideType(url.searchParams.get("guideType"));
  if (!guideType) return json({ ok: false, dismissed: false, message: "guideType is required" }, 400);

  const ipHash = await sha256Hex(`${getClientIp(request)}:${guideType}`);
  const dismissDate = todayKey();
  const row = await env.DB.prepare(
    "SELECT id FROM guide_dismissals WHERE guide_type = ? AND ip_hash = ? AND dismiss_date = ? LIMIT 1"
  )
    .bind(guideType, ipHash, dismissDate)
    .first();

  return json({ ok: true, dismissed: Boolean(row), dismissDate });
}

async function saveGuideDismissal(env, request) {
  await ensureGuideDismissalTable(env);
  const body = await request.json().catch(() => ({}));
  const guideType = sanitizeGuideType(body.guideType);
  if (!guideType) return json({ ok: false, message: "guideType is required" }, 400);

  const ipHash = await sha256Hex(`${getClientIp(request)}:${guideType}`);
  const dismissDate = todayKey();
  const now = new Date().toISOString();
  const id = `guide-${guideType}-${dismissDate}-${ipHash.slice(0, 16)}`;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO guide_dismissals
      (id, guide_type, ip_hash, dismiss_date, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, guideType, ipHash, dismissDate, now)
    .run();

  return json({ ok: true, dismissed: true, dismissDate });
}

function getSolapiHealth(env) {
  const templates = {
    customerQuoteReceived: solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_RECEIVED"),
    customerQuoteClosed: solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_CLOSED"),
    customerBidReceived: solapiValue(env, "SOLAPI_TEMPLATE_CUSTOMER_BID_RECEIVED"),
    adminSellerApplication: solapiValue(env, "SOLAPI_TEMPLATE_ADMIN_SELLER_APPLICATION"),
    sellerBidSelected: solapiValue(env, "SOLAPI_TEMPLATE_SELLER_BID_SELECTED"),
    sellerApproved: solapiValue(env, "SOLAPI_TEMPLATE_SELLER_APPROVED"),
  };
  return json({
    ok: true,
    version: PUBLIC_API_VERSION,
    hasApiKey: Boolean(env.SOLAPI_API_KEY),
    hasApiSecret: Boolean(env.SOLAPI_API_SECRET),
    hasChannelId: Boolean(solapiValue(env, "SOLAPI_CHANNEL_ID")),
    hasFrom: Boolean(solapiValue(env, "SOLAPI_FROM")),
    hasAdminPhone: Boolean(solapiValue(env, "SOLAPI_ADMIN_PHONE")),
    templates,
    missing: [
      !env.SOLAPI_API_KEY && "SOLAPI_API_KEY",
      !env.SOLAPI_API_SECRET && "SOLAPI_API_SECRET",
      !solapiValue(env, "SOLAPI_CHANNEL_ID") && "SOLAPI_CHANNEL_ID",
      !solapiValue(env, "SOLAPI_FROM") && "SOLAPI_FROM",
      !templates.customerQuoteReceived && "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_RECEIVED",
      !templates.customerQuoteClosed && "SOLAPI_TEMPLATE_CUSTOMER_QUOTE_CLOSED",
      !templates.customerBidReceived && "SOLAPI_TEMPLATE_CUSTOMER_BID_RECEIVED",
      !templates.adminSellerApplication && "SOLAPI_TEMPLATE_ADMIN_SELLER_APPLICATION",
      !templates.sellerBidSelected && "SOLAPI_TEMPLATE_SELLER_BID_SELECTED",
      !templates.sellerApproved && "SOLAPI_TEMPLATE_SELLER_APPROVED",
    ].filter(Boolean),
  });
}

async function getSolapiAuthTest(env) {
  const config = getSolapiConfig(env);
  if (!config.apiKey || !config.apiSecret) {
    return json({ ok: false, message: "SOLAPI_API_KEY 또는 SOLAPI_API_SECRET이 없습니다." }, 500);
  }

  const authorization = await createSolapiAuthorization(config);
  const response = await fetch("https://api.solapi.com/messages/v4/list?limit=1", {
    method: "GET",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  return json({
    ok: response.ok,
    status: response.status,
    message: response.ok ? "솔라피 인증이 정상입니다." : payload.errorMessage || payload.message || "솔라피 인증 테스트에 실패했습니다.",
    errorCode: payload.errorCode || "",
    hasApiKey: Boolean(config.apiKey),
    hasApiSecret: Boolean(config.apiSecret),
    hasChannelId: Boolean(config.channelId),
    hasFrom: Boolean(config.from),
  }, response.ok ? 200 : 502);
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
  if (path === "bids" && method === "GET") return getBids(env, request);
  if (path === "bids" && method === "POST") return upsertBid(env, request);
  if (path === "bid-selection" && method === "POST") return selectBid(env, request);

  if (path === "guide-dismissal" && method === "GET") return getGuideDismissal(env, request);
  if (path === "guide-dismissal" && method === "POST") return saveGuideDismissal(env, request);
  if (path === "solapi-health" && method === "GET") return getSolapiHealth(env);
  if (path === "solapi-auth-test" && method === "GET") return getSolapiAuthTest(env);

  if (path === "alimtalk" && method === "GET") return getAlimtalk(env);
  if (path === "alimtalk-debug" && method === "GET") return getAlimtalkDebug(env);
  if (path === "alimtalk" && method === "POST") return createAlimtalk(env, request);
  if (path.startsWith("alimtalk/") && path.endsWith("/resend") && method === "POST") {
    return resendAlimtalk(env, decodeURIComponent(pathParts.slice(1, -1).join("/")));
  }
  if (path.startsWith("alimtalk/") && path.endsWith("/refresh") && method === "POST") {
    return refreshAlimtalkStatus(env, decodeURIComponent(pathParts.slice(1, -1).join("/")));
  }
  if (path.startsWith("alimtalk/") && method === "DELETE") {
    return deleteAlimtalk(env, decodeURIComponent(pathParts.slice(1).join("/")));
  }
  if (path.startsWith("alimtalk/") && method === "PATCH") {
    return updateAlimtalk(env, request, decodeURIComponent(pathParts.slice(1).join("/")));
  }

  if (path === "uploads" && method === "POST") return uploadFile(env, request);
  if (path.startsWith("files/") && method === "GET") return getFile(env, decodeURIComponent(pathParts.slice(1).join("/")));

  return json({ ok: false, message: "API를 찾을 수 없습니다." }, 404);
}
