const commercePage = document.body.dataset.commercePage || "shopping";

const defaultCategories = {
  subscription: ["TV", "냉장고", "김치냉장고", "세탁기·건조기", "정수기", "공기청정기", "주방가전", "에어컨", "청소기", "생활가전"],
  shopping: ["TV", "냉장고", "세탁기·건조기", "김치냉장고", "청소기", "주방가전"],
};

let commerceItems = [];
let sourceInfo = null;
let activeCategory = "전체";
let activeSort = "recommended";
let visibleCount = 24;
let consultationState = { item: null, option: null, verificationId: "", verificationToken: "", verifiedPhone: "" };
const subscriptionCacheKey = "pickquoteSubscriptionCatalogV3Popularity";
const subscriptionCacheMaxAgeMs = 6 * 60 * 60 * 1000;

const categoryGrid = document.querySelector("#commerceCategories");
const productGrid = document.querySelector("#commerceProductGrid");
const searchInput = document.querySelector("#commerceSearch");
const brandFilter = document.querySelector("#commerceBrand");
const sortFilter = document.querySelector("#commerceSort");
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

function minimumMonthlyFee(item) {
  return Number(productOptions(item)[0]?.monthlyFee72 || item?.monthlyFee72 || 0);
}

function applySubscriptionPayload(payload) {
  if (!payload?.ok || !Array.isArray(payload.items) || !payload.items.length) return false;
  commerceItems = payload.items;
  sourceInfo = payload.source || null;
  sortCommerceItems();
  return true;
}

function readSubscriptionCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(subscriptionCacheKey) || "null");
    if (!cached || Date.now() - Number(cached.savedAt || 0) > subscriptionCacheMaxAgeMs) return null;
    return cached.payload || null;
  } catch {
    return null;
  }
}

function writeSubscriptionCache(payload) {
  try {
    sessionStorage.setItem(subscriptionCacheKey, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    // 저장 공간이 제한된 환경에서는 서버 데이터만 사용합니다.
  }
}

function productOptions(item) {
  const options = Array.isArray(item.options) && item.options.length ? item.options : [{
    label: [item.careType, item.careDetail, item.visitCycle ? `${item.visitCycle} 주기` : ""].filter(Boolean).join(" · ") || item.model,
    model: item.model,
    installationType: "",
    careType: item.careType || "",
    careDetail: item.careDetail || "",
    visitCycle: item.visitCycle || "",
    monthlyFee72: Number(item.monthlyFee72 || 0),
  }];
  return [...options].sort((a, b) =>
    Number(a.monthlyFee72 || 0) - Number(b.monthlyFee72 || 0)
      || String(a.label || "").localeCompare(String(b.label || ""), "ko")
  );
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

function consultationPartnerName() {
  return String(sourceInfo?.consultationPartner || "전자랜드(상담 배정 지점)");
}

function consultationConsentVersion() {
  return String(sourceInfo?.consultationConsentVersion || "20260820-subscription-partner-v1");
}

async function consultationApi(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) throw new Error(payload?.message || "서버 요청을 처리하지 못했습니다.");
  return payload;
}

function ensureConsultationModal() {
  let modal = document.querySelector("#subscriptionConsultationModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "subscriptionConsultationModal";
  modal.className = "subscription-consultation-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="subscription-consultation-backdrop" aria-hidden="true"></div>
    <section class="subscription-consultation-dialog" role="dialog" aria-modal="true" aria-labelledby="subscriptionConsultationTitle">
      <div class="subscription-consultation-head">
        <div><span>가전 구독 상담</span><h2 id="subscriptionConsultationTitle">인증 후 상담을 신청하세요.</h2></div>
        <button type="button" class="subscription-consultation-close" aria-label="상담 신청 닫기">×</button>
      </div>
      <form id="subscriptionConsultationForm" novalidate>
        <div id="subscriptionConsultationProduct"></div>
        <input class="subscription-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <div class="subscription-consultation-fields">
          <label><span>고객명</span><input name="customerName" maxlength="30" autocomplete="name" required /></label>
          <label class="subscription-interest-field" hidden><span>관심 제품</span><input name="interestProduct" maxlength="160" placeholder="예: TV, 냉장고, 정수기" /></label>
          <label class="subscription-phone-field"><span>휴대전화</span><div><input name="customerPhone" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" required /><button type="button" data-request-consultation-code>인증번호 받기</button></div></label>
          <label class="subscription-code-field" hidden><span>인증번호</span><div><input name="verificationCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6자리" /><button type="button" data-verify-consultation-code>인증 확인</button></div></label>
          <label><span>거주·설치 지역</span><input name="customerRegion" maxlength="80" placeholder="예: 서울 송파구" required /></label>
          <label><span>상담 희망 시간</span><select name="preferredTime" required><option value="">선택해주세요</option><option>오전 9시~12시</option><option>오후 12시~3시</option><option>오후 3시~6시</option><option>오후 6시~8시</option><option>시간 무관</option></select></label>
          <label class="subscription-consultation-memo"><span>문의 내용 <small>선택</small></span><textarea name="memo" maxlength="600" placeholder="설치 환경이나 궁금한 조건을 적어주세요."></textarea></label>
        </div>
        <p class="subscription-verification-status" id="subscriptionVerificationStatus">휴대전화 인증이 필요합니다.</p>
        <div class="subscription-consent-box">
          <label class="subscription-consent-all"><input type="checkbox" data-consultation-consent-all /><span>필수 동의 전체 선택</span></label>
          <details open><summary><label><input type="checkbox" name="collectionConsent" required /><span>[필수] 개인정보 수집·이용 동의</span></label></summary><dl><div><dt>목적</dt><dd>가전 구독 상담 접수, 휴대전화 본인확인, 상담 연결 및 민원 처리</dd></div><div><dt>항목</dt><dd>이름, 휴대전화번호, 지역, 관심 제품·모델·옵션, 상담 희망 시간, 문의 내용</dd></div><div><dt>보유기간</dt><dd>상담 접수일로부터 90일 또는 동의 철회 시까지. 관계 법령상 보존 의무가 있는 경우 해당 기간</dd></div><div><dt>거부권</dt><dd>동의를 거부할 수 있으나 필수 정보이므로 구독 상담 신청이 제한됩니다.</dd></div></dl></details>
          <details open><summary><label><input type="checkbox" name="thirdPartyConsent" required /><span>[필수] 개인정보 제3자 제공 동의</span></label></summary><dl><div><dt>제공받는 자</dt><dd data-consultation-partner></dd></div><div><dt>제공 목적</dt><dd>가전 구독 상품 상담, 견적 안내, 계약 체결, 배송·설치 및 계약 관련 고객 응대</dd></div><div><dt>제공 항목</dt><dd>이름, 휴대전화번호, 지역, 관심 제품·모델·옵션, 상담 희망 시간, 문의 내용</dd></div><div><dt>보유기간</dt><dd>상담 미진행 시 제공일로부터 30일. 계약 체결 시 계약 및 관계 법령상 의무 이행에 필요한 기간</dd></div><div><dt>거부권</dt><dd>동의를 거부할 수 있으나 제휴업체 상담 및 계약 연결이 제한됩니다.</dd></div></dl></details>
          <p class="subscription-consent-note">각 동의는 구독 상담에 필요한 필수 동의이며, 광고성 정보 수신 동의에는 사용되지 않습니다.</p>
        </div>
        <p class="subscription-consultation-message" id="subscriptionConsultationMessage" role="status"></p>
        <button class="commerce-primary subscription-consultation-submit" type="submit" disabled>인증하고 상담 신청하기</button>
      </form>
    </section>`;
  document.body.append(modal);
  modal.querySelector(".subscription-consultation-close").addEventListener("click", closeSubscriptionConsultation);
  const form = modal.querySelector("#subscriptionConsultationForm");
  form.addEventListener("input", handleConsultationFormChange);
  form.addEventListener("change", handleConsultationFormChange);
  form.addEventListener("submit", submitSubscriptionConsultation);
  modal.querySelector("[data-request-consultation-code]").addEventListener("click", requestConsultationCode);
  modal.querySelector("[data-verify-consultation-code]").addEventListener("click", verifyConsultationCode);
  return modal;
}

function normalizedConsultationPhone(form) {
  return String(new FormData(form).get("customerPhone") || "").replace(/\D/g, "");
}

function setConsultationMessage(message, type = "") {
  const node = document.querySelector("#subscriptionConsultationMessage");
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
}

function updateConsultationSubmitState() {
  const modal = document.querySelector("#subscriptionConsultationModal");
  const form = modal?.querySelector("form");
  if (!form) return;
  const verified = Boolean(consultationState.verificationToken && consultationState.verifiedPhone === normalizedConsultationPhone(form));
  const agreed = form.elements.collectionConsent.checked && form.elements.thirdPartyConsent.checked;
  form.querySelector("[type=submit]").disabled = !(verified && agreed);
  const status = modal.querySelector("#subscriptionVerificationStatus");
  status.textContent = verified ? "휴대전화 인증이 완료되었습니다." : "휴대전화 인증이 필요합니다.";
  status.dataset.verified = verified ? "true" : "false";
}

function handleConsultationFormChange(event) {
  const form = event.currentTarget;
  if (event.target.matches("[data-consultation-consent-all]")) {
    form.elements.collectionConsent.checked = event.target.checked;
    form.elements.thirdPartyConsent.checked = event.target.checked;
  }
  if (event.target.name === "collectionConsent" || event.target.name === "thirdPartyConsent") {
    form.querySelector("[data-consultation-consent-all]").checked = form.elements.collectionConsent.checked && form.elements.thirdPartyConsent.checked;
  }
  if (event.target.name === "customerPhone" && normalizedConsultationPhone(form) !== consultationState.verifiedPhone) {
    consultationState.verificationId = "";
    consultationState.verificationToken = "";
  }
  updateConsultationSubmitState();
}

async function requestConsultationCode() {
  const modal = ensureConsultationModal();
  const form = modal.querySelector("form");
  const phone = normalizedConsultationPhone(form);
  if (!/^01\d{8,9}$/.test(phone)) return setConsultationMessage("휴대전화번호를 정확히 입력해주세요.", "error");
  const button = modal.querySelector("[data-request-consultation-code]");
  button.disabled = true;
  setConsultationMessage("인증번호를 발송하고 있습니다.");
  try {
    const result = await consultationApi("/api/quote-phone-verifications/request", { phone });
    consultationState.verificationId = result.verificationId;
    consultationState.verificationToken = "";
    consultationState.verifiedPhone = "";
    modal.querySelector(".subscription-code-field").hidden = false;
    setConsultationMessage("인증번호를 발송했습니다. 5분 안에 입력해주세요.", "success");
    window.setTimeout(() => { button.disabled = false; button.textContent = "인증번호 다시 받기"; }, 60000);
  } catch (error) {
    button.disabled = false;
    setConsultationMessage(error.message, "error");
  }
}

async function verifyConsultationCode() {
  const modal = ensureConsultationModal();
  const form = modal.querySelector("form");
  const code = String(new FormData(form).get("verificationCode") || "").replace(/\D/g, "");
  if (!consultationState.verificationId || code.length !== 6) return setConsultationMessage("6자리 인증번호를 입력해주세요.", "error");
  const button = modal.querySelector("[data-verify-consultation-code]");
  button.disabled = true;
  try {
    const result = await consultationApi("/api/quote-phone-verifications/verify", { verificationId: consultationState.verificationId, code });
    consultationState.verificationToken = result.verificationToken;
    consultationState.verifiedPhone = normalizedConsultationPhone(form);
    setConsultationMessage("휴대전화 인증이 완료되었습니다.", "success");
    updateConsultationSubmitState();
  } catch (error) {
    setConsultationMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function openSubscriptionConsultation(item = null, option = null) {
  closeProductModal();
  const modal = ensureConsultationModal();
  const form = modal.querySelector("form");
  form.reset();
  consultationState = { item, option, verificationId: "", verificationToken: "", verifiedPhone: "" };
  const selected = option || (item ? productOptions(item)[0] : null);
  consultationState.option = selected;
  modal.querySelector("[data-consultation-partner]").textContent = consultationPartnerName();
  modal.querySelector(".subscription-interest-field").hidden = Boolean(item);
  form.elements.interestProduct.required = !item;
  modal.querySelector("#subscriptionConsultationProduct").innerHTML = item ? `
    <div class="subscription-selected-product"><span>선택한 상품</span><strong>${escapeHtml(item.sourceCategory || item.name)}</strong><b>${escapeHtml(selected?.model || item.model)}</b><small>${selected?.monthlyFee72 ? `72개월 기준 월 ${formatWon(selected.monthlyFee72)}` : ""}</small></div>` :
    '<div class="subscription-selected-product"><span>관심 제품</span><strong>상담받을 제품을 입력해주세요.</strong></div>';
  modal.querySelector(".subscription-code-field").hidden = true;
  modal.querySelector("[data-request-consultation-code]").disabled = false;
  modal.querySelector("[data-request-consultation-code]").textContent = "인증번호 받기";
  modal.hidden = false;
  document.body.classList.add("has-commerce-modal");
  setConsultationMessage("");
  updateConsultationSubmitState();
  form.elements.customerName.focus();
}

function closeSubscriptionConsultation() {
  const modal = document.querySelector("#subscriptionConsultationModal");
  if (!modal || modal.hidden) return;
  const completed = Boolean(modal.querySelector(".subscription-consultation-success"));
  modal.hidden = true;
  document.body.classList.remove("has-commerce-modal");
  if (completed) modal.remove();
}

async function submitSubscriptionConsultation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  updateConsultationSubmitState();
  const submit = form.querySelector("[type=submit]");
  if (submit.disabled) return setConsultationMessage("휴대전화 인증과 필수 동의를 완료해주세요.", "error");
  const data = new FormData(form);
  const item = consultationState.item;
  const option = consultationState.option;
  submit.disabled = true;
  submit.textContent = "상담 신청 접수 중";
  try {
    const result = await consultationApi("/api/subscription-consultations", {
      website: data.get("website"),
      productModel: item?.model || "",
      productName: item ? (item.sourceCategory || item.name) : data.get("interestProduct"),
      optionModel: option?.model || "",
      optionLabel: option?.label || "",
      monthlyFee72: Number(option?.monthlyFee72 || 0),
      customerName: data.get("customerName"),
      customerPhone: normalizedConsultationPhone(form),
      customerRegion: data.get("customerRegion"),
      preferredTime: data.get("preferredTime"),
      memo: data.get("memo"),
      phoneVerificationId: consultationState.verificationId,
      phoneVerificationToken: consultationState.verificationToken,
      consentVersion: consultationConsentVersion(),
      consent: { collection: true, thirdParty: true, partnerName: consultationPartnerName() },
    });
    form.innerHTML = `<div class="subscription-consultation-success"><b>접수 완료</b><h3>${escapeHtml(result.message)}</h3><p>${escapeHtml(consultationPartnerName())} 상담 연결을 위해 접수 내용을 확인한 뒤 연락드립니다.</p><button type="button" class="commerce-primary" data-close-consultation-success>확인</button></div>`;
    form.querySelector("[data-close-consultation-success]").addEventListener("click", closeSubscriptionConsultation);
  } catch (error) {
    submit.disabled = false;
    submit.textContent = "인증하고 상담 신청하기";
    setConsultationMessage(error.message, "error");
  }
}

function renderProductModal(item, optionIndex = 0, cardIndex = -1) {
  const modal = ensureProductModal();
  const options = productOptions(item);
  const selected = options[Math.max(0, Math.min(optionIndex, options.length - 1))];
  const care = [selected.installationType, selected.careType, selected.careDetail, selected.visitCycle ? `${selected.visitCycle} 주기` : ""].filter(Boolean).join(" · ") || "별도 관리 조건 없음";
  const maximum = Math.max(...affiliateCards.map((card) => card.benefit));
  const maximumCardIndex = affiliateCards.findIndex((card) => card.benefit === maximum);
  const activeCardIndex = cardIndex >= 0 && affiliateCards[cardIndex] ? cardIndex : maximumCardIndex;
  const activeCard = affiliateCards[activeCardIndex];
  const baseFee = Number(selected.monthlyFee72 || 0);
  const appliedBenefit = Math.min(baseFee, Number(activeCard.benefit || 0));
  const estimatedFee = Math.max(0, baseFee - appliedBenefit);
  modal.querySelector("#commerceProductModalContent").innerHTML = `
    <div class="commerce-detail-head">
      <div class="commerce-detail-image">${productImageMarkup(item, "commerce-detail-atlas")}</div>
      <div class="commerce-detail-summary">
        <span class="commerce-product-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</span>
        <h2 id="commerceProductModalTitle">${escapeHtml(item.sourceCategory || item.name)}</h2>
        <strong class="commerce-detail-model">${escapeHtml(selected.model)}</strong>
        ${options.length > 1 ? `<label class="commerce-detail-option">옵션 선택<select id="commerceDetailOption">${options.map((option, index) => `<option value="${index}"${index === optionIndex ? " selected" : ""}>${escapeHtml(option.label)} · 월 ${formatWon(option.monthlyFee72)}</option>`).join("")}</select></label>` : ""}
        <div class="commerce-price-comparison" aria-label="제휴카드 적용 전후 월 구독료 비교">
          <div><span>제휴카드 미적용</span><strong>월 ${formatWon(baseFee)}</strong><small>72개월 기준 기본 구독료</small></div>
          <div class="is-applied"><span>제휴카드 적용 예상</span><strong>월 ${formatWon(estimatedFee)}</strong><small>${escapeHtml(activeCard.name)} 최대 혜택 -${formatWon(appliedBenefit)}</small></div>
        </div>
        <label class="commerce-affiliate-selector">적용할 제휴카드<select id="commerceAffiliateCard">${affiliateCards.map((card, index) => `<option value="${index}"${index === activeCardIndex ? " selected" : ""}>${escapeHtml(card.name)} · 최대 ${formatWon(card.benefit)} 할인</option>`).join("")}</select></label>
      </div>
    </div>
    <div class="commerce-detail-sections">
      <section><h3>기본 정보</h3><dl><div><dt>모델명</dt><dd>${escapeHtml(selected.model)}</dd></div><div><dt>계약 기간</dt><dd>72개월</dd></div><div><dt>관리·설치 옵션</dt><dd>${escapeHtml(care)}</dd></div></dl><a class="commerce-official-link" href="${officialProductUrl(selected.model)}" target="_blank" rel="noopener noreferrer">LG전자 공식 제품 정보 보기</a></section>
      <section><div class="commerce-card-benefit-heading"><div><h3>제휴카드 최대 혜택</h3><p>월 최대 <strong>${formatWon(maximum)}</strong></p></div><span>최대 혜택</span></div><div class="commerce-card-benefits">${affiliateCards.map((card) => `<div><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.spend)}</span><b>월 ${formatWon(card.benefit)}</b></div>`).join("")}</div><p class="commerce-card-disclaimer">표시된 적용 금액은 카드별 최대 할인액을 단순 차감한 예상 금액입니다. 카드 발급, 전월 실적, 자동이체, 할인 한도 등 실제 적용 조건은 카드사 정책에 따라 달라질 수 있으므로 계약 전 최신 조건을 확인하세요.</p></section>
    </div>
    <div class="commerce-detail-actions"><a class="commerce-secondary" href="https://www.interbiz-portal.com/card-consulting" target="_blank" rel="noopener noreferrer">제휴카드 상담</a><button class="commerce-primary" type="button" data-subscription-consult-modal>선택 옵션 상담 신청</button></div>`;
  modal.querySelector("#commerceDetailOption")?.addEventListener("change", (event) => renderProductModal(item, Number(event.target.value || 0), activeCardIndex));
  modal.querySelector("#commerceAffiliateCard")?.addEventListener("change", (event) => renderProductModal(item, optionIndex, Number(event.target.value || 0)));
  modal.querySelector("[data-subscription-consult-modal]")?.addEventListener("click", () => openSubscriptionConsultation(item, selected));
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
      <small>${(category === "전체" ? commerceItems.length : commerceItems.filter((item) => item.category === category).length).toLocaleString("ko-KR")}개 상품</small>
    </button>
  `).join("");
}

function filteredItems() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const brand = brandFilter?.value || "";
  const filtered = commerceItems.filter((item) => {
    const categoryMatches = activeCategory === "전체" || item.category === activeCategory;
    const brandMatches = !brand || item.brand === brand;
    const searchMatches = !query || `${item.brand} ${item.name} ${item.sourceCategory || ""} ${item.model || ""}`.toLowerCase().includes(query);
    return categoryMatches && brandMatches && searchMatches;
  });

  if (activeSort === "price-asc") {
    return filtered.sort((a, b) => minimumMonthlyFee(a) - minimumMonthlyFee(b));
  }
  if (activeSort === "price-desc") {
    return filtered.sort((a, b) => minimumMonthlyFee(b) - minimumMonthlyFee(a));
  }
  if (activeSort === "best") {
    return filtered.sort((a, b) =>
      Number(b.quoteInclusionCount || 0) - Number(a.quoteInclusionCount || 0)
        || minimumMonthlyFee(a) - minimumMonthlyFee(b)
    );
  }
  return filtered;
}

function renderEmpty(isSubscription, message = "") {
  productGrid.innerHTML = `
    <div class="commerce-empty">
      <div>
        <span class="commerce-empty-mark">P</span>
        <h3>${message || (isSubscription ? "조건에 맞는 구독 상품이 없습니다." : "쇼핑 상품을 준비하고 있습니다.")}</h3>
        <p>${isSubscription ? "다른 품목이나 모델명으로 다시 검색해보세요." : "공식 상품 정보와 쿠팡 파트너스 링크가 확인된 제품부터 순차적으로 공개합니다."}</p>
        ${isSubscription ? '<button class="commerce-primary" type="button" data-subscription-consult>구독 상담 신청</button>' : '<a class="commerce-primary" href="/quote">가전 견적 비교하기</a>'}
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
        <button class="commerce-product-image" type="button" data-product-detail aria-label="${escapeHtml(item.sourceCategory || item.name)} 상세보기">${item.isBest ? '<span class="commerce-best-badge">BEST</span>' : ""}${productImageMarkup(item)}</button>
        <div class="commerce-product-body">
          <span class="commerce-product-meta">${escapeHtml(item.brand)} · ${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.sourceCategory || item.name)}</h3>
          <strong class="commerce-product-model" data-card-model>${escapeHtml(selected.model)}</strong>
          ${options.length > 1 ? `<label class="commerce-card-option"><span>옵션 · 월 구독료 낮은 순</span><select data-card-option>${options.map((option, index) => `<option value="${index}">${escapeHtml(option.label)}</option>`).join("")}</select></label>` : ""}
          <p data-card-care>${escapeHtml(care || "72개월 구독")}</p>
          <span class="commerce-contract-label">72개월 기준 월 구독료${options.length > 1 ? " · 최저 옵션 우선" : ""}</span>
          <strong class="commerce-product-price" data-card-price>월 ${formatWon(selected.monthlyFee72)}</strong>
          <span class="commerce-max-card-benefit">제휴카드 월 최대 42,000원 혜택</span>
          ${item.isBest ? `<span class="commerce-best-proof">${Number(item.quoteInclusionCount || 0) > 0 ? `엘플랜 견적 ${Number(item.quoteInclusionCount || 0).toLocaleString("ko-KR")}건 포함` : "카테고리 대표 상품"}</span>` : ""}
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
  if (event.key === "Escape") {
    closeProductModal();
    closeSubscriptionConsultation();
  }
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-subscription-consult]");
  if (trigger) openSubscriptionConsultation();
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
  const response = await fetch("/api/subscription-products?v=20260820-lplan-best", { headers: { Accept: "application/json" }, cache: "reload" });
  if (!response.ok) throw new Error("subscription api unavailable");
  const payload = await response.json();
  if (!applySubscriptionPayload(payload)) throw new Error("subscription data empty");
  writeSubscriptionCache(payload);
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
sortFilter?.addEventListener("change", () => {
  activeSort = sortFilter.value || "recommended";
  visibleCount = 24;
  renderProducts();
});

async function initCommerce() {
  renderCategories();
  if (commercePage === "subscription") {
    const cachedPayload = readSubscriptionCache();
    const hasCachedCatalog = applySubscriptionPayload(cachedPayload);
    if (hasCachedCatalog) {
      renderCategories();
      renderProducts();
    }
    try {
      await loadSubscriptionProducts();
    } catch (error) {
      if (!hasCachedCatalog) {
        commerceItems = [];
        sourceInfo = null;
      }
    }
  }
  renderCategories();
  renderProducts();
}

initCommerce();
