const commercePage = document.body.dataset.commercePage || "shopping";

const defaultCategories = {
  subscription: ["TV", "냉장고", "김치냉장고", "세탁기·건조기", "정수기", "공기청정기", "주방가전", "에어컨", "청소기", "생활가전"],
  shopping: ["TV", "냉장고", "세탁기·건조기", "김치냉장고", "청소기", "주방가전"],
};

let commerceItems = [];
let sourceInfo = null;
let activeCategory = "전체";
let visibleCount = 24;

const categoryGrid = document.querySelector("#commerceCategories");
const productGrid = document.querySelector("#commerceProductGrid");
const searchInput = document.querySelector("#commerceSearch");
const brandFilter = document.querySelector("#commerceBrand");
const catalogSection = document.querySelector("#commerceCatalog");

const affiliateCards = [
  { name: "신한카드", spend: "월 130만원 이상", benefit: 30000 },
  { name: "우리카드", spend: "월 120만원 이상", benefit: 24000 },
  { name: "KB국민카드", spend: "월 80만원 이상", benefit: 25000 },
  { name: "우리 프리미엄카드", spend: "월 200만원 이상", benefit: 42000 },
  { name: "현대카드", spend: "월 120만원 이상", benefit: 16000 },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function productOptions(item) {
  if (Array.isArray(item.options) && item.options.length) return item.options;
  return [{
    label: [item.careType, item.careDetail, item.visitCycle ? `${item.visitCycle} 주기` : ""].filter(Boolean).join(" · ") || item.model,
    model: item.model,
    installationType: "",
    careType: item.careType || "",
    careDetail: item.careDetail || "",
    visitCycle: item.visitCycle || "",
    monthlyFee72: Number(item.monthlyFee72 || 0),
  }];
}

function productImageMarkup(item, className = "") {
  const image = item.imageUrl;
  const atlasMatch = /^atlas:(.+)#(\d+),(\d+)$/.exec(image || "");
  if (atlasMatch) return `<span class="commerce-product-atlas ${className}" role="img" aria-label="${escapeHtml(item.model)} 제품 이미지" style="--atlas-url:url('${escapeHtml(atlasMatch[1])}');--atlas-x:${Number(atlasMatch[2])};--atlas-y:${Number(atlasMatch[3])}"></span>`;
  if (image) return `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(item.model)} 제품 이미지" loading="lazy" data-product-image />`;
  return '<span class="commerce-product-image-missing">이미지 준비 중</span>';
}

function officialProductUrl(model) {
  const searchModel = String(model || "").split(".")[0];
  return `https://www.lge.co.kr/search/result?search=${encodeURIComponent(searchModel)}`;
}

function ensureProductModal() {
  let modal = document.querySelector("#commerceProductModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "commerceProductModal";
  modal.className = "commerce-product-modal";
  modal.hidden = true;
  modal.innerHTML = '<div class="commerce-product-modal-backdrop" aria-hidden="true"></div><section class="commerce-product-dialog" role="dialog" aria-modal="true" aria-labelledby="commerceProductModalTitle"><button class="commerce-product-modal-close" type="button" aria-label="상세보기 닫기">×</button><div id="commerceProductModalContent"></div></section>';
  document.body.append(modal);
  modal.querySelector(".commerce-product-modal-close").addEventListener("click", closeProductModal);
  return modal;
}

function closeProductModal() {
  const modal = document.querySelector("#commerceProductModal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("has-commerce-modal");
}

function renderProductModal(item, optionIndex = 0) {
  const modal = ensureProductModal();
  const options = productOptions(item);
  const selected = options[Math.max(0, Math.min(optionIndex, options.length - 1))];
  const care = [selected.installationType, selected.careType, selected.careDetail, selected.visitCycle ? `${selected.visitCycle} 주기` : ""].filter(Boolean).join(" · ") || "별도 관리 조건 없음";
  const maximum = Math.max(...affiliateCards.map((card) => card.benefit));
  modal.querySelector("#commerceProductModalContent").innerHTML = `
    <div class="commerce-detail-head">
      <div class="commerce-detail-image">${productImageMarkup(item, "commerce-detail-atlas")}</div>
      <div class="commerce-detail-summary">
        <span class="commerce-product-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</span>
        <h2 id="commerceProductModalTitle">${escapeHtml(item.sourceCategory || item.name)}</h2>
        <strong class="commerce-detail-model">${escapeHtml(selected.model)}</strong>
        ${options.length > 1 ? `<label class="commerce-detail-option">옵션 선택<select id="commerceDetailOption">${options.map((option, index) => `<option value="${index}"${index === optionIndex ? " selected" : ""}>${escapeHtml(option.label)} · 월 ${formatWon(option.monthlyFee72)}</option>`).join("")}</select></label>` : ""}
        <span class="commerce-contract-label">72개월 기준 월 구독료</span>
        <strong class="commerce-detail-price">월 ${formatWon(selected.monthlyFee72)}</strong>
      </div>
    </div>
    <div class="commerce-detail-sections">
      <section><h3>기본 정보</h3><dl><div><dt>모델명</dt><dd>${escapeHtml(selected.model)}</dd></div><div><dt>계약 기간</dt><dd>72개월</dd></div><div><dt>관리·설치 옵션</dt><dd>${escapeHtml(care)}</dd></div></dl><a class="commerce-official-link" href="${officialProductUrl(selected.model)}" target="_blank" rel="noopener noreferrer">LG전자 공식 제품 정보 보기</a></section>
      <section><div class="commerce-card-benefit-heading"><div><h3>제휴카드 최대 혜택</h3><p>월 최대 <strong>${formatWon(maximum)}</strong></p></div><span>최대 혜택</span></div><div class="commerce-card-benefits">${affiliateCards.map((card) => `<div><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.spend)}</span><b>월 ${formatWon(card.benefit)}</b></div>`).join("")}</div><p class="commerce-card-disclaimer">카드 발급, 전월 실적, 자동이체 등 적용 조건과 혜택은 카드사 정책에 따라 달라질 수 있습니다. 계약 전 최신 조건을 확인하세요.</p></section>
    </div>
    <div class="commerce-detail-actions"><a class="commerce-secondary" href="https://www.interbiz-portal.com/card-consulting" target="_blank" rel="noopener noreferrer">제휴카드 상담</a><a class="commerce-primary" href="https://pf.kakao.com/_PxlUfX" target="_blank" rel="noopener noreferrer">선택 옵션 상담하기</a></div>`;
  modal.querySelector("#commerceDetailOption")?.addEventListener("change", (event) => renderProductModal(item, Number(event.target.value || 0)));
  modal.hidden = false;
  document.body.classList.add("has-commerce-modal");
  modal.querySelector(".commerce-product-modal-close").focus();
}

function sortCommerceItems() {
  const order = defaultCategories.subscription;
  commerceItems.sort((a, b) => {
    const ai = order.indexOf(a.category);
    const bi = order.indexOf(b.category);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
      || String(a.sourceCategory || "").localeCompare(String(b.sourceCategory || ""), "ko")
      || String(a.model || "").localeCompare(String(b.model || ""), "en");
  });
}

function getCategoryList() {
  if (commercePage !== "subscription" || !commerceItems.length) return defaultCategories[commercePage] || defaultCategories.shopping;
  const order = defaultCategories.subscription;
  return [...new Set(commerceItems.map((item) => item.category).filter(Boolean))]
    .sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, "ko");
    });
}

function renderCategories() {
  if (!categoryGrid) return;
  const list = ["전체", ...getCategoryList()];
  categoryGrid.innerHTML = list.map((category, index) => `
    <button class="commerce-category${category === activeCategory ? " is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <b>${String(index + 1).padStart(2, "0")}</b>
      <strong>${escapeHtml(category)}</strong>
    </button>
  `).join("");
}

function filteredItems() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const brand = brandFilter?.value || "";
  return commerceItems.filter((item) => {
    const categoryMatches = activeCategory === "전체" || item.category === activeCategory;
    const brandMatches = !brand || item.brand === brand;
    const searchMatches = !query || `${item.brand} ${item.name} ${item.sourceCategory || ""} ${item.model || ""}`.toLowerCase().includes(query);
    return categoryMatches && brandMatches && searchMatches;
  });
}

function renderEmpty(isSubscription, message = "") {
  productGrid.innerHTML = `
    <div class="commerce-empty">
      <div>
        <span class="commerce-empty-mark">P</span>
        <h3>${message || (isSubscription ? "조건에 맞는 구독 상품이 없습니다." : "쇼핑 상품을 준비하고 있습니다.")}</h3>
        <p>${isSubscription ? "다른 품목이나 모델명으로 다시 검색해보세요." : "공식 상품 정보와 쿠팡 파트너스 링크가 확인된 제품부터 순차적으로 공개합니다."}</p>
        <a class="commerce-primary" href="${isSubscription ? "https://pf.kakao.com/_PxlUfX" : "/quote"}"${isSubscription ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${isSubscription ? "구독 상담 문의" : "가전 견적 비교하기"}</a>
      </div>
    </div>`;
}

function renderProducts() {
  if (!productGrid) return;
  const allItems = filteredItems();
  const items = allItems.slice(0, visibleCount);
  const isSubscription = commercePage === "subscription";

  if (!items.length) {
    renderEmpty(isSubscription, commerceItems.length ? "조건에 맞는 구독 상품이 없습니다." : "구독 상품을 불러오지 못했습니다.");
    updateCatalogMeta(0, 0);
    return;
  }

  productGrid.innerHTML = items.map((item) => {
    const itemIndex = commerceItems.indexOf(item);
    const options = productOptions(item);
    const selected = options[0];
    const care = [selected.installationType, selected.careType, selected.careDetail, selected.visitCycle ? `${selected.visitCycle} 주기` : ""].filter(Boolean).join(" · ");
    return `
      <article class="commerce-product-card" data-product-index="${itemIndex}">
        <button class="commerce-product-image" type="button" data-product-detail aria-label="${escapeHtml(item.sourceCategory || item.name)} 상세보기">${productImageMarkup(item)}</button>
        <div class="commerce-product-body">
          <span class="commerce-product-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.sourceCategory || item.name)}</h3>
          <strong class="commerce-product-model" data-card-model>${escapeHtml(selected.model)}</strong>
          ${options.length > 1 ? `<label class="commerce-card-option"><span>옵션</span><select data-card-option>${options.map((option, index) => `<option value="${index}">${escapeHtml(option.label)}</option>`).join("")}</select></label>` : ""}
          <p data-card-care>${escapeHtml(care || "72개월 구독")}</p>
          <span class="commerce-contract-label">72개월 기준 월 구독료</span>
          <strong class="commerce-product-price" data-card-price>월 ${formatWon(selected.monthlyFee72)}</strong>
          <span class="commerce-max-card-benefit">제휴카드 월 최대 42,000원 혜택</span>
          <button class="commerce-product-action" type="button" data-product-detail>상세보기</button>
        </div>
      </article>`;
  }).join("");

  productGrid.querySelectorAll("[data-product-image]").forEach((image) => {
    image.addEventListener("error", () => {
      image.parentElement.innerHTML = '<span class="commerce-product-image-missing">이미지 준비 중</span>';
    }, { once: true });
  });
  updateCatalogMeta(items.length, allItems.length);
}

productGrid?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-card-option]");
  if (!select) return;
  const card = select.closest("[data-product-index]");
  const item = commerceItems[Number(card?.dataset.productIndex)];
  const selected = productOptions(item)[Number(select.value || 0)];
  if (!card || !selected) return;
  card.querySelector("[data-card-model]").textContent = selected.model;
  card.querySelector("[data-card-care]").textContent = [selected.installationType, selected.careType, selected.careDetail, selected.visitCycle ? `${selected.visitCycle} 주기` : ""].filter(Boolean).join(" · ") || "72개월 구독";
  card.querySelector("[data-card-price]").textContent = `월 ${formatWon(selected.monthlyFee72)}`;
});

productGrid?.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-product-detail]");
  if (!trigger) return;
  const card = trigger.closest("[data-product-index]");
  const item = commerceItems[Number(card?.dataset.productIndex)];
  if (!item) return;
  renderProductModal(item, Number(card.querySelector("[data-card-option]")?.value || 0));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProductModal();
});

function ensureCatalogMeta() {
  let meta = document.querySelector("#commerceCatalogMeta");
  if (meta || !catalogSection) return meta;
  meta = document.createElement("div");
  meta.id = "commerceCatalogMeta";
  meta.className = "commerce-catalog-meta";
  catalogSection.append(meta);
  return meta;
}

function updateCatalogMeta(shown, total) {
  const meta = ensureCatalogMeta();
  if (!meta) return;
  const sourceDate = sourceInfo?.date ? ` · ${escapeHtml(sourceInfo.date)} 기준` : "";
  meta.innerHTML = `
    <p><strong>${total.toLocaleString("ko-KR")}개</strong> 상품 중 ${shown.toLocaleString("ko-KR")}개 표시${sourceDate}</p>
    ${shown < total ? '<button type="button" id="commerceLoadMore">상품 더 보기</button>' : ""}`;
  meta.querySelector("#commerceLoadMore")?.addEventListener("click", () => {
    visibleCount += 24;
    renderProducts();
  });
}

async function loadSubscriptionProducts() {
  const response = await fetch("/api/subscription-products", { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("subscription api unavailable");
  const payload = await response.json();
  if (!payload.ok || !Array.isArray(payload.items) || !payload.items.length) throw new Error("subscription data empty");
  commerceItems = payload.items;
  sourceInfo = payload.source || null;
  sortCommerceItems();
}

categoryGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category || "전체";
  visibleCount = 24;
  renderCategories();
  renderProducts();
  catalogSection?.scrollIntoView({ behavior: "smooth", block: "start" });
});
searchInput?.addEventListener("input", () => { visibleCount = 24; renderProducts(); });
brandFilter?.addEventListener("change", () => { visibleCount = 24; renderProducts(); });

async function initCommerce() {
  renderCategories();
  if (commercePage === "subscription") {
    try {
      await loadSubscriptionProducts();
    } catch (error) {
      commerceItems = [];
      sourceInfo = null;
    }
  }
  renderCategories();
  renderProducts();
}

initCommerce();
