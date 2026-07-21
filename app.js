const requests = [];
const bids = [];
const managerReviews = [];

let selectedRequestId = 0;
let uploadedImages = [];
let businessCardImage = "";
let activeSellerId = "";
let activeSellerTab = "all";
let activeSellerBrandFilter = "all";
let activeSellerRegionFilter = "all";
let pendingQuoteFormData = null;
let pendingBidSelection = null;

const ADMIN_EMAIL = "di02013@naver.com";
const STORAGE_KEYS = {
  sellerApplications: "pickquoteSellerApplications",
  approvedSellers: "pickquoteApprovedSellers",
  alimtalkQueue: "pickquoteAlimtalkQueue",
};
const registeredSellerPhones = new Set();
const sellerAccounts = new Map();
hydrateApprovedSellerAccounts();
const money = new Intl.NumberFormat("ko-KR");

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll("[data-view]");
const requestForm = document.querySelector("#requestForm");
const requestFormMessage = document.querySelector("#requestFormMessage");
const lookupForm = document.querySelector("#lookupForm");
const lookupResults = document.querySelector("#lookupResults");
const sellerLoginForm = document.querySelector("#sellerLoginForm");
const sellerLoginMessage = document.querySelector("#sellerLoginMessage");
const bidForm = document.querySelector("#bidForm");
const bidFormMessage = document.querySelector("#bidFormMessage");
const sellerRegisterForm = document.querySelector("#sellerRegisterForm");
const regionChangeForm = document.querySelector("#regionChangeForm");
const quoteImage = document.querySelector("#quoteImage");
const businessCardInput = document.querySelector("#businessCardImage");
const imagePreview = document.querySelector("#imagePreview");
const businessCardPreview = document.querySelector("#businessCardPreview");
const previewTitle = document.querySelector("#previewTitle");
const previewMeta = document.querySelector("#previewMeta");
const sellerRegisterTitle = document.querySelector("#sellerRegisterTitle");
const sellerRegisterMeta = document.querySelector("#sellerRegisterMeta");
const sellerMailPanel = document.querySelector("#sellerMailPanel");
const sellerMailPreview = document.querySelector("#sellerMailPreview");
const sellerMailLink = document.querySelector("#sellerMailLink");
const sellerAdminReviewLink = document.querySelector("#sellerAdminReviewLink");
const regionChangePreview = document.querySelector("#regionChangePreview");
const regionChangeMailLink = document.querySelector("#regionChangeMailLink");
const sellerQuoteWorkspace = document.querySelector("#sellerQuoteWorkspace");
const sellerRegionPanel = document.querySelector("#sellerRegionPanel");
const requestList = document.querySelector("#requestList");
const sellerTabs = document.querySelectorAll("[data-seller-tab]");
const selectedStatus = document.querySelector("#selectedStatus");
const selectedTitle = document.querySelector("#selectedTitle");
const selectedInfo = document.querySelector("#selectedInfo");
const sellerImage = document.querySelector("#sellerImage");
const securityBlanket = document.querySelector("#securityBlanket");
const privacyConsentModal = document.querySelector("#privacyConsentModal");
const collectionConsent = document.querySelector("#collectionConsent");
const thirdPartyConsent = document.querySelector("#thirdPartyConsent");
const consentMessage = document.querySelector("#consentMessage");
const cancelConsentBtn = document.querySelector("#cancelConsentBtn");
const confirmConsentBtn = document.querySelector("#confirmConsentBtn");
const bidSelectConfirmModal = document.querySelector("#bidSelectConfirmModal");
const bidSelectConfirmSummary = document.querySelector("#bidSelectConfirmSummary");
const cancelBidSelectBtn = document.querySelector("#cancelBidSelectBtn");
const confirmBidSelectBtn = document.querySelector("#confirmBidSelectBtn");
const quoteImageModal = document.querySelector("#quoteImageModal");
const quoteImageModalImg = document.querySelector("#quoteImageModalImg");
const closeQuoteImageModal = document.querySelector("#closeQuoteImageModal");
const openSellerAccountModal = document.querySelector("#openSellerAccountModal");
const sellerAccountModal = document.querySelector("#sellerAccountModal");
const closeSellerAccountModal = document.querySelector("#closeSellerAccountModal");
const accountTabs = document.querySelectorAll("[data-account-tab]");
const accountPanels = document.querySelectorAll("[data-account-panel]");
const sellerFindIdForm = document.querySelector("#sellerFindIdForm");
const sellerResetPasswordForm = document.querySelector("#sellerResetPasswordForm");
const findIdMessage = document.querySelector("#findIdMessage");
const resetPasswordMessage = document.querySelector("#resetPasswordMessage");
const managerReviewModal = document.querySelector("#managerReviewModal");
const closeManagerReviewModalBtn = document.querySelector("#closeManagerReviewModal");
const managerReviewTitle = document.querySelector("#managerReviewTitle");
const managerReviewList = document.querySelector("#managerReviewList");
const serverLoadingModal = document.querySelector("#serverLoadingModal");
const serverLoadingTitle = document.querySelector("#serverLoadingTitle");
const serverLoadingText = document.querySelector("#serverLoadingText");

let securityBlanketTimer;
let serverLoadingCount = 0;

function formatPrice(value) {
  return `${money.format(Number(value || 0))}원`;
}

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function normalizeMoney(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function parseMoney(value) {
  return Number(normalizeMoney(value));
}

function parseManwon(value) {
  return parseMoney(value) * 10000;
}

function formatManwonInput(value) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return String(Math.round(amount / 10000));
}

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createQuoteNumber() {
  const dateKey = formatDateKey();
  const lastSequence = requests.reduce((max, request) => {
    const quoteNumber = String(request.quoteNumber || "");
    if (!quoteNumber.startsWith(`${dateKey}-`)) return max;
    const sequence = Number(quoteNumber.split("-")[1]);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return `${dateKey}-${String(lastSequence + 1).padStart(4, "0")}`;
}

function getQuoteDeadline(request) {
  if (request?.quoteExpiresAt) return new Date(request.quoteExpiresAt);
  if (request?.quote_expires_at) return new Date(request.quote_expires_at);
  if (!request?.createdAt) return null;
  const deadline = new Date(request.createdAt);
  deadline.setHours(deadline.getHours() + 48);
  return deadline;
}

function getQuoteRemainingLabel(request) {
  const deadline = getQuoteDeadline(request);
  if (!deadline || Number.isNaN(deadline.getTime())) return "남은 시간 확인중";

  const remainingMs = deadline.getTime() - Date.now();
  if (remainingMs <= 0) return "견적 마감";

  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

function isQuoteExpired(request) {
  const deadline = getQuoteDeadline(request);
  return Boolean(deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() <= Date.now());
}

function formatPhoneNumber(value) {
  const digits = normalizePhone(value).slice(0, 11);

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.startsWith("010") || digits.startsWith("011") || digits.startsWith("016") || digits.startsWith("017") || digits.startsWith("018") || digits.startsWith("019")) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function normalizeName(value) {
  return String(value || "").replace(/\s/g, "").trim();
}

function createLightweightImage(dataUrl, maxWidth = 720, quality = 0.72) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve("");
      return;
    }

    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskPhone(value) {
  const digits = normalizePhone(value);
  if (digits.length < 8) return "연락처 비공개";
  if (digits.startsWith("02")) return `02-****-${digits.slice(-4)}`;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskCustomerName(value) {
  const name = String(value || "").trim();
  if (name.length <= 1) return name || "고객님";
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}*${name.slice(-1)}`;
}

function formatSellerDisplayName(channel, branch) {
  return [channel, branch].filter(Boolean).join(" ");
}

function formatManagerDisplayName(manager, position) {
  return [manager || "담당 매니저", position].filter(Boolean).join(" ");
}

function starText(rating) {
  return "★".repeat(Number(rating || 0)) + "☆".repeat(5 - Number(rating || 0));
}

function getReviewsForBid(bid) {
  return managerReviews.filter((review) => {
    if (bid.sellerId && review.sellerId) return review.sellerId === bid.sellerId;
    return review.seller === bid.seller && review.manager === bid.manager;
  });
}

function openManagerReviewModal(bidId) {
  const bid = bids.find((item) => item.id === Number(bidId));
  if (!bid) return;

  const sellerDisplayName = formatSellerDisplayName(bid.channel, bid.branch) || bid.seller;
  const managerDisplayName = formatManagerDisplayName(bid.manager, bid.managerPosition);
  const safeSeller = escapeHTML(sellerDisplayName);
  const safeManager = escapeHTML(managerDisplayName);
  const reviews = getReviewsForBid(bid);
  managerReviewTitle.textContent = `${sellerDisplayName} · ${managerDisplayName}`;
  managerReviewList.innerHTML = reviews.length
    ? reviews
        .map((review) => {
          return `
            <article class="manager-review-item">
              <div class="manager-review-top">
                <strong>${escapeHTML(review.customer)}</strong>
                <span class="review-stars">${starText(review.rating)}</span>
              </div>
              <p>${escapeHTML(review.content)}</p>
              <small>${escapeHTML(review.createdAt || "")}</small>
            </article>
          `;
        })
        .join("")
    : `
      <div class="empty-state compact-empty">
        <strong>아직 등록된 후기가 없습니다.</strong>
        <p>${safeSeller} ${safeManager}의 첫 후기를 기다리고 있습니다.</p>
      </div>
    `;
  managerReviewModal.hidden = false;
}

function closeManagerReviewModal() {
  managerReviewModal.hidden = true;
}

function setRequestFormMessage(message, type = "normal") {
  requestFormMessage.textContent = message;
  requestFormMessage.dataset.type = type;
}

function setSellerLoginMessage(message, type = "normal") {
  sellerLoginMessage.textContent = message;
  sellerLoginMessage.dataset.type = type;
}

function setBidFormMessage(message, type = "normal") {
  bidFormMessage.textContent = message;
  bidFormMessage.dataset.type = type;
}

function setConsentMessage(message, type = "normal") {
  consentMessage.textContent = message;
  consentMessage.dataset.type = type;
}

function setFindIdMessage(message, type = "normal") {
  findIdMessage.textContent = message;
  findIdMessage.dataset.type = type;
}

function setResetPasswordMessage(message, type = "normal") {
  resetPasswordMessage.textContent = message;
  resetPasswordMessage.dataset.type = type;
}

function showServerLoading(title = "로딩중입니다.", text = "서버와 연결하고 있습니다. 잠시만 기다려주세요.") {
  serverLoadingCount += 1;
  if (serverLoadingTitle) serverLoadingTitle.textContent = title;
  if (serverLoadingText) serverLoadingText.textContent = text;
  if (serverLoadingModal) serverLoadingModal.hidden = false;
}

function hideServerLoading(force = false) {
  serverLoadingCount = force ? 0 : Math.max(0, serverLoadingCount - 1);
  if (serverLoadingCount === 0 && serverLoadingModal) {
    serverLoadingModal.hidden = true;
  }
}

function readStorageArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeStorageArray(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function canUseApiServer() {
  return window.location.protocol !== "file:";
}

async function apiJson(path, options = {}) {
  if (!canUseApiServer()) return null;
  const { loadingTitle, loadingText, showLoading = true, ...fetchOptions } = options;

  if (showLoading) {
    showServerLoading(loadingTitle || "로딩중입니다.", loadingText || "서버와 연결하고 있습니다. 잠시만 기다려주세요.");
  }
  try {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
      ...fetchOptions,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: payload?.message || "서버 저장 요청에 실패했습니다.",
      };
    }
    return payload;
  } catch (error) {
    console.warn("API 요청에 실패했습니다.", error);
    return {
      ok: false,
      message: "서버와 연결하지 못했습니다. 배포 상태 또는 네트워크를 확인해주세요.",
    };
  } finally {
    if (showLoading) hideServerLoading();
  }
}

async function syncApprovedSellersFromServer() {
  const result = await apiJson("/api/approved-sellers", {
    loadingTitle: "판매자 정보를 확인 중입니다.",
    loadingText: "승인된 판매자 계정을 서버에서 불러오고 있습니다.",
  });
  if (!result?.ok || !Array.isArray(result.rows)) return;

  writeStorageArray(STORAGE_KEYS.approvedSellers, result.rows);
  hydrateApprovedSellerAccounts();
}

async function saveSellerApplicationToServer(application) {
  return apiJson("/api/seller-applications", {
    method: "POST",
    loadingTitle: "판매자 등록 요청을 저장 중입니다.",
    loadingText: "입력하신 정보를 서버에 안전하게 저장하고 있습니다.",
    body: JSON.stringify(application),
  });
}

function replaceRequests(rows) {
  requests.splice(0, requests.length, ...rows);
}

async function syncCustomerQuotesFromServer() {
  const result = await apiJson("/api/customer-quotes", {
    loadingTitle: "고객님 견적을 불러오는 중입니다.",
    loadingText: "48시간 이내 접수된 견적을 서버에서 확인하고 있습니다.",
  });

  if (!result?.ok || !Array.isArray(result.rows)) return;
  replaceRequests(result.rows);
}

async function lookupCustomerQuotesFromServer(customer, phone, quoteNumber = "") {
  const params = new URLSearchParams({
    scope: "lookup",
    customer,
    phone,
  });
  if (quoteNumber) params.set("quoteNumber", quoteNumber);

  const result = await apiJson(`/api/customer-quotes?${params.toString()}`, {
    loadingTitle: "내 견적을 조회 중입니다.",
    loadingText: "입력하신 성함과 연락처로 서버에서 견적을 확인하고 있습니다.",
  });

  return result?.ok && Array.isArray(result.rows) ? result.rows : [];
}

async function saveCustomerQuoteToServer(quote) {
  return apiJson("/api/customer-quotes", {
    method: "POST",
    loadingTitle: "견적 요청을 서버에 저장 중입니다.",
    loadingText: "대표 이미지는 1년, 전체 견적 이미지는 7일 기준으로 저장하고 있습니다.",
    body: JSON.stringify(quote),
  });
}

function getSellerApplications() {
  return readStorageArray(STORAGE_KEYS.sellerApplications);
}

function setSellerApplications(rows) {
  writeStorageArray(STORAGE_KEYS.sellerApplications, rows);
}

function getApprovedSellerRows() {
  return readStorageArray(STORAGE_KEYS.approvedSellers);
}

function hydrateApprovedSellerAccounts() {
  getApprovedSellerRows().forEach((seller) => {
    if (!seller?.sellerId || sellerAccounts.has(seller.sellerId)) return;
    sellerAccounts.set(seller.sellerId, {
      password: seller.password,
      channel: seller.channel,
      branch: seller.branch,
      branchRegion: seller.branchRegion,
      manager: seller.manager,
      managerPosition: seller.managerPosition,
      phone: seller.phone,
      cardImage: seller.cardImage || "",
      consent: seller.consent,
    });
    registeredSellerPhones.add(normalizePhone(seller.phone));
  });
}

function hasPendingSellerApplication(sellerId, phone) {
  const normalizedPhone = normalizePhone(phone);
  return getSellerApplications().some((application) => {
    return (
      application.status === "pending" &&
      (application.sellerId === sellerId || normalizePhone(application.phone) === normalizedPhone)
    );
  });
}

function queueAlimtalkMessage(message) {
  const queue = readStorageArray(STORAGE_KEYS.alimtalkQueue);
  queue.unshift({
    id: `talk-${Date.now()}`,
    status: "ready",
    createdAt: new Date().toISOString(),
    ...message,
  });
  writeStorageArray(STORAGE_KEYS.alimtalkQueue, queue);
}

function findSellerByProfile({ channel, branch, manager, phone, sellerId = "" }) {
  const normalizedBranch = normalizeName(branch);
  const normalizedManager = normalizeName(manager);
  const normalizedPhone = normalizePhone(phone);
  const normalizedSellerId = sellerId.trim();

  return Array.from(sellerAccounts.entries()).find(([id, account]) => {
    const isSameProfile =
      account.channel === channel &&
      normalizeName(account.branch) === normalizedBranch &&
      normalizeName(account.manager) === normalizedManager &&
      normalizePhone(account.phone) === normalizedPhone;

    if (!normalizedSellerId) return isSameProfile;
    return isSameProfile && id === normalizedSellerId;
  });
}

function openAccountRecoveryModal() {
  sellerAccountModal.hidden = false;
  setFindIdMessage("");
  setResetPasswordMessage("");
}

function closeAccountRecoveryModal() {
  sellerAccountModal.hidden = true;
  sellerFindIdForm.reset();
  sellerResetPasswordForm.reset();
}

function setAccountTab(tabName) {
  accountTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.accountTab === tabName);
  });
  accountPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.accountPanel === tabName);
  });
  setFindIdMessage("");
  setResetPasswordMessage("");
}

function getSelectedRequest() {
  if (selectedRequestId === null) return null;
  return requests.find((request) => request.id === selectedRequestId) || requests[0] || null;
}

function getBidsForRequest(requestId) {
  return bids
    .filter((bid) => bid.requestId === requestId)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
}

function setView(view) {
  if (view === "seller" && !activeSellerId) {
    view = "sellerLogin";
    setSellerLoginMessage("판매자 페이지는 로그인 후 이용할 수 있습니다.", "error");
  }

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === view);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-current", button.dataset.view === view);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function quoteImageMarkup(request, label) {
  const images = Array.isArray(request.images) && request.images.length ? request.images : request.image ? [request.image] : [];

  if (images.length) {
    return `
      <div class="quote-image-grid image-count-${Math.min(images.length, 4)}">
        ${images
          .slice(0, 4)
          .map((image, index) => {
            return `<img src="${image}" alt="${escapeHTML(`${label} ${index + 1}`)}" />`;
          })
          .join("")}
      </div>
    `;
  }

  return "<span>등록된 견적서 이미지가 없습니다.</span>";
}

function canActiveSellerSeeCustomerPhone(request) {
  const selectedBid = bids.find((bid) => bid.id === request.selectedBidId);
  return Boolean(selectedBid && selectedBid.sellerId === activeSellerId);
}

function getActiveSellerBid(request) {
  return bids.find((bid) => bid.requestId === request.id && bid.sellerId === activeSellerId);
}

function normalizeSellerRegionCategory(region) {
  const text = String(region || "").replace(/\s+/g, " ").trim();
  if (!text) return "기타";

  const normalized = text
    .replace(/특별자치시/g, "")
    .replace(/특별자치도/g, "")
    .replace(/광역시/g, "")
    .replace(/특별시/g, "")
    .replace(/자치시/g, "")
    .replace(/자치도/g, "")
    .replace(/시$/g, "")
    .trim();

  const firstToken = normalized.split(" ")[0] || text.split(" ")[0] || "기타";
  const aliases = [
    ["서울", ["서울", "서울시"]],
    ["부산", ["부산", "부산시"]],
    ["대구", ["대구", "대구시"]],
    ["인천", ["인천", "인천시"]],
    ["광주", ["광주", "광주시"]],
    ["대전", ["대전", "대전시"]],
    ["울산", ["울산", "울산시"]],
    ["세종", ["세종", "세종시"]],
    ["경기", ["경기", "경기도"]],
    ["강원", ["강원", "강원도"]],
    ["충북", ["충북", "충청북도"]],
    ["충남", ["충남", "충청남도"]],
    ["전북", ["전북", "전라북도"]],
    ["전남", ["전남", "전라남도"]],
    ["경북", ["경북", "경상북도"]],
    ["경남", ["경남", "경상남도"]],
    ["제주", ["제주", "제주도"]],
  ];

  const compact = text.replace(/\s+/g, "");
  const matched = aliases.find(([, names]) => names.some((name) => compact.startsWith(name)));
  return matched ? matched[0] : firstToken;
}

function getSellerBrandValue(request) {
  return request.desiredBrand || "미선택";
}

function getSelectedBid(request) {
  return bids.find((bid) => bid.id === request.selectedBidId) || null;
}

function isSaleCompletedForBid(request, bid) {
  return Boolean(request.saleCompletedAt && request.saleCompletedBidId === bid?.id);
}

function getFilteredSellerRequests() {
  let filteredRequests;

  if (activeSellerTab === "proposed") {
    filteredRequests = requests.filter((request) => getActiveSellerBid(request) && !canActiveSellerSeeCustomerPhone(request));
  } else if (activeSellerTab === "selected") {
    filteredRequests = requests.filter((request) => canActiveSellerSeeCustomerPhone(request));
  } else {
    filteredRequests = requests;
  }

  if (activeSellerBrandFilter !== "all") {
    filteredRequests = filteredRequests.filter((request) => getSellerBrandValue(request) === activeSellerBrandFilter);
  }

  if (activeSellerRegionFilter !== "all") {
    filteredRequests = filteredRequests.filter((request) => normalizeSellerRegionCategory(request.region) === activeSellerRegionFilter);
  }

  return filteredRequests;
}

function getSellerRequestsForDynamicRegion() {
  const savedRegionFilter = activeSellerRegionFilter;
  activeSellerRegionFilter = "all";
  const filteredRequests = getFilteredSellerRequests();
  activeSellerRegionFilter = savedRegionFilter;
  return filteredRequests;
}

function getAvailableSellerRegions() {
  return Array.from(new Set(getSellerRequestsForDynamicRegion().map((request) => normalizeSellerRegionCategory(request.region))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function renderSellerFilterBar() {
  if (!requestList) return;

  let filterBar = document.querySelector("#sellerFilterBar");
  if (!filterBar) {
    filterBar = document.createElement("div");
    filterBar.id = "sellerFilterBar";
    filterBar.className = "seller-filter-bar";
  }
  requestList.prepend(filterBar);

  const availableRegions = getAvailableSellerRegions();
  if (activeSellerRegionFilter !== "all" && !availableRegions.includes(activeSellerRegionFilter)) {
    activeSellerRegionFilter = "all";
  }

  const brandOptions = [
    ["all", "전체"],
    ["LG전자", "LG전자"],
    ["삼성전자", "삼성전자"],
    ["비교 견적", "비교견적"],
  ];

  const regionOptions = [["all", "전체 지역"], ...availableRegions.map((region) => [region, region])];

  const makeButtons = (items, activeValue, filterName) =>
    items
      .map(([value, label]) => `
        <button type="button" class="${value === activeValue ? "is-active" : ""}" data-seller-filter="${filterName}" data-filter-value="${escapeHTML(value)}">
          ${escapeHTML(label)}
        </button>
      `)
      .join("");

  filterBar.innerHTML = `
    <div class="seller-filter-group">
      <span>브랜드</span>
      <div>${makeButtons(brandOptions, activeSellerBrandFilter, "brand")}</div>
    </div>
    <div class="seller-filter-group">
      <span>지역</span>
      <div>${makeButtons(regionOptions, activeSellerRegionFilter, "region")}</div>
    </div>
  `;
}

function syncSelectedRequestWithTab() {
  const filteredRequests = getFilteredSellerRequests();

  if (!filteredRequests.length) {
    selectedRequestId = null;
    return filteredRequests;
  }

  if (!filteredRequests.some((request) => request.id === selectedRequestId)) {
    selectedRequestId = filteredRequests[0]?.id || 0;
  }

  return filteredRequests;
}

function syncRegionChangeForm() {
  const account = sellerAccounts.get(activeSellerId);
  if (!account) return;

  regionChangeForm.elements.changeBranch.value = account.branch;
  regionChangeForm.elements.changeManager.value = account.manager;
  regionChangeForm.elements.currentRegion.value = account.branchRegion;
}

function setBidFormEnabled(isEnabled) {
  bidForm.hidden = !isEnabled;
  Array.from(bidForm.elements).forEach((element) => {
    if (element.name === "branchName" || element.name === "managerName" || element.name === "managerPhone") {
      element.readOnly = true;
      element.disabled = false;
      return;
    }

    element.disabled = !isEnabled;
  });
}

function syncBidFormForRequest(request) {
  const account = sellerAccounts.get(activeSellerId);
  const sellerBid = request ? getActiveSellerBid(request) : null;

  bidForm.elements.branchName.value = account?.branch || "등록 지점";
  bidForm.elements.managerName.value = account?.manager || "담당 매니저";
  bidForm.elements.managerPhone.value = account?.phone ? formatPhoneNumber(account.phone) : "";
  bidForm.elements.bidPrice.value = sellerBid ? formatManwonInput(sellerBid.price) : "";
  bidForm.elements.benefits.value = sellerBid ? sellerBid.benefits : "";
  bidForm.querySelector("button[type='submit']").textContent = sellerBid
    ? "제안 내용 수정"
    : "고객님에게 제안 보내기";
}

function renderRequests() {
  const isRegionTab = activeSellerTab === "region";
  sellerQuoteWorkspace.hidden = isRegionTab;
  sellerRegionPanel.hidden = !isRegionTab;

  if (isRegionTab) {
    sellerTabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.sellerTab === activeSellerTab);
    });
    syncRegionChangeForm();
    return;
  }

  requestList.innerHTML = "";
  const filteredRequests = syncSelectedRequestWithTab();

  sellerTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.sellerTab === activeSellerTab);
  });

  if (!filteredRequests.length) {
    const currentFilterBar = document.querySelector("#sellerFilterBar");
    const emptyLabel =
      activeSellerTab === "proposed"
        ? "선택 대기 중인 제안 견적이 없습니다."
        : activeSellerTab === "selected"
          ? "아직 고객님에게 선택받은 견적이 없습니다."
          : "등록된 고객님 견적이 없습니다.";
    requestList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>${emptyLabel}</strong>
        <p>해당하는 견적이 생기면 이 탭에 표시됩니다.</p>
      </div>
    `;
    if (currentFilterBar) requestList.prepend(currentFilterBar);
    return;
  }

  filteredRequests.forEach((request) => {
    const sellerBid = getActiveSellerBid(request);
    const isSelectedByCustomer = canActiveSellerSeeCustomerPhone(request);
    const isSaleCompleted = Boolean(request.saleCompletedAt && request.saleCompletedBidId === sellerBid?.id);
    const safeItems = escapeHTML(request.items);
    const safeCustomer = escapeHTML(request.customer);
    const safeRegion = escapeHTML(request.region);
    const safePurchasePurpose = escapeHTML(request.purchasePurpose || "미선택");
    const safeDesiredBrand = escapeHTML(request.desiredBrand || "미선택");
    const safeQuoteNumber = escapeHTML(request.quoteNumber || "번호 없음");
    const safeRemaining = escapeHTML(getQuoteRemainingLabel(request));
    const expired = isQuoteExpired(request);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `request-item${request.id === selectedRequestId ? " is-active" : ""}`;
    item.innerHTML = `
      <strong>${safeItems}</strong>
      <span>${safeCustomer} · ${safeRegion}</span>
      <span>견적번호 ${safeQuoteNumber}</span>
      <span>구매 목적 ${safePurchasePurpose}</span>
      <span>원하는 브랜드 ${safeDesiredBrand}</span>
      <span>기존 견적 ${formatPrice(request.price)}</span>
      ${sellerBid ? `<span>내 제안 ${formatPrice(sellerBid.price)}</span>` : ""}
      ${isSelectedByCustomer ? `<span class="request-badge">선택받음</span>` : ""}
      ${isSaleCompleted ? `<span class="request-badge done">판매완료</span>` : ""}
    `;
    item.addEventListener("click", () => {
      selectedRequestId = request.id;
      setBidFormMessage("");
      renderRequests();
      renderSelectedRequest();
    });
    requestList.appendChild(item);
  });
}

function renderSelectedRequest() {
  const request = getSelectedRequest();
  if (!request) {
    selectedStatus.textContent = "선택 대기";
    selectedTitle.textContent = "표시할 견적이 없습니다.";
    selectedInfo.innerHTML = "현재 탭에 해당하는 고객님 견적이 없습니다.";
    sellerImage.innerHTML = "<span>등록된 견적서 이미지가 없습니다.</span>";
    syncBidFormForRequest(null);
    setBidFormEnabled(false);
    return;
  }

  setBidFormEnabled(true);
  syncBidFormForRequest(request);
  const visiblePhone = canActiveSellerSeeCustomerPhone(request) ? request.phone : maskPhone(request.phone);
  const safeCustomer = escapeHTML(request.customer);
  const safeItems = escapeHTML(request.items);
  const safePhone = escapeHTML(visiblePhone);
  const safePurchasePurpose = escapeHTML(request.purchasePurpose || "미선택");
  const safeDesiredBrand = escapeHTML(request.desiredBrand || "미선택");
  const safeRegion = escapeHTML(request.region);
  const safeQuoteNumber = escapeHTML(request.quoteNumber || "번호 없음");
  const safeMemo = escapeHTML(request.memo || "추가 요청사항 없음");
  const activeSellerBid = getActiveSellerBid(request);
  const isSelectedSeller = canActiveSellerSeeCustomerPhone(request);
  const isSaleCompleted = isSaleCompletedForBid(request, activeSellerBid);
  selectedStatus.textContent = isSaleCompleted ? "판매완료" : isSelectedSeller ? "선택받음" : "응답 가능";
  selectedTitle.textContent = request.items;
  selectedInfo.innerHTML = `
    <div class="seller-summary-grid">
      <div><span>견적번호</span><strong>${safeQuoteNumber}</strong></div>
      <div><span>고객님</span><strong>${safeCustomer}</strong></div>
      <div><span>연락처</span><strong>${safePhone}</strong></div>
      <div><span>구매 목적</span><strong>${safePurchasePurpose}</strong></div>
      <div><span>원하는 브랜드</span><strong>${safeDesiredBrand}</strong></div>
      <div><span>설치 지역</span><strong>${safeRegion}</strong></div>
      <div><span>기존 견적</span><strong>${formatPrice(request.price)}</strong></div>
    </div>
    <div class="seller-request-note">
      <span>요청사항</span>
      <p>${safeMemo}</p>
    </div>
    <p class="privacy-note">${
      isSaleCompleted
        ? `판매완료 처리되었습니다. 고객님에게 후기 요청 알림톡 발송 상태: ${
            request.reviewNotificationSentAt ? "발송 완료" : "발송 대기"
          }`
        : isSelectedSeller
        ? "고객님이 내 제안을 선택해 연락처가 공개되었습니다."
        : "연락처는 고객님이 제안을 선택한 후 공개됩니다."
    }</p>
    ${
      isSelectedSeller
        ? `<div class="sale-complete-panel">
            <strong>${isSaleCompleted ? "판매완료 처리됨" : "판매가 완료되었나요?"}</strong>
            <p>${
              isSaleCompleted
                ? "정식 서비스에서는 이 시점에 고객님께 카카오 알림톡으로 후기 작성 링크가 발송됩니다."
                : "선택받은 견적에서 판매완료를 누르면 고객님 후기 작성 안내가 열립니다."
            }</p>
            <button class="primary-btn full sale-complete-btn" type="button" data-request-id="${request.id}" ${
              isSaleCompleted ? "disabled" : ""
            }>
              ${isSaleCompleted ? "판매완료 완료" : "판매완료 처리"}
            </button>
          </div>`
        : ""
    }
  `;
  sellerImage.innerHTML = quoteImageMarkup(request, `${request.customer} 고객님이 올린 견적서`);
}

function renderBidCards(request) {
  const rows = getBidsForRequest(request.id);

  if (!rows.length) {
    return `
      <div class="empty-state compact-empty">
        <strong>아직 도착한 판매자 제안이 없습니다.</strong>
        <p>판매자가 제안을 보내면 이 영역에 카드로 표시됩니다.</p>
      </div>
    `;
  }

  return rows
    .map((bid, index) => {
      const saving = Math.max(0, request.price - bid.price);
      const isSelected = request.selectedBidId === bid.id;
      const isLockedBySelection = Boolean(request.selectedBidId);
      const isSaleCompleted = isSaleCompletedForBid(request, bid);
      const sellerDisplayName = formatSellerDisplayName(bid.channel, bid.branch) || bid.seller;
      const managerDisplayName = formatManagerDisplayName(bid.manager, bid.managerPosition);
      const safeSeller = escapeHTML(sellerDisplayName);
      const safeManager = escapeHTML(managerDisplayName);
      const safePhone = escapeHTML(bid.phone || "연락처 확인 필요");
      const safeBenefits = escapeHTML(bid.benefits);
      const reviews = getReviewsForBid(bid);
      const averageRating = reviews.length
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
        : 0;
      const selectedReview = managerReviews.find(
        (review) => review.requestId === request.id && review.bidId === bid.id
      );
      return `
        <article class="seller-bid-card${isSelected ? " is-selected" : ""}">
          <div class="bid-card-visual">
            <button class="heart-btn" type="button" aria-label="관심 제안">♡</button>
            <div class="bid-card-thumb${isSelected ? "" : " is-private-card"}">
              ${
                bid.cardImage
                  ? `<img src="${bid.cardImage}" alt="${safeSeller} 매니저 명함" />`
                  : `<div class="manager-card-placeholder">
                      <strong>${safeManager}</strong>
                      <span>${safeSeller}</span>
                      <small>${safePhone}</small>
                    </div>`
              }
              ${isSelected ? "" : `<div class="private-card-overlay">선택 후 명함 공개</div>`}
            </div>
          </div>
          <div class="bid-card-body">
            <div class="bid-card-top">
              <span class="status">${isSaleCompleted ? "판매완료" : isSelected ? "선택됨" : index === 0 ? "추천" : "검토"}</span>
              <span class="saving-text">${formatPrice(saving)} 절감</span>
            </div>
            <h3>${safeSeller}</h3>
            <p class="manager-line">${safeManager}</p>
            <button class="review-summary-btn" type="button" data-review-bid-id="${bid.id}">
              <span class="review-stars">${reviews.length ? starText(Math.round(averageRating)) : "☆☆☆☆☆"}</span>
              <strong>${reviews.length ? averageRating.toFixed(1) : "0.0"}</strong>
              <span>후기 ${reviews.length}개 보기</span>
            </button>
            <p class="bid-price">${formatPrice(bid.price)}</p>
            <p class="original-price-line">내가 올린 견적 ${formatPrice(request.price)}</p>
            <p class="bid-benefits">${safeBenefits}</p>
            <div class="bid-tags">
              <span>${index === 0 ? "최저가" : "비교견적"}</span>
              <span>설치 상담</span>
              <span>조건 확인</span>
              ${isSaleCompleted ? "<span>후기 요청 완료</span>" : ""}
            </div>
            <button class="${isSelected ? "primary-btn" : "secondary-btn"} full select-bid-btn" type="button" data-request-id="${
              request.id
            }" data-bid-id="${bid.id}" ${isLockedBySelection && !isSelected ? "disabled" : ""}>
              ${isSelected ? "선택 완료" : isLockedBySelection ? "선택 변경 불가" : "이 제안 선택"}
            </button>
            ${
              isSelected
                ? selectedReview
                  ? `<div class="review-complete-box">
                      <span class="review-stars">${starText(selectedReview.rating)}</span>
                      <strong>후기가 등록되었습니다.</strong>
                      <p>${escapeHTML(selectedReview.content)}</p>
                    </div>`
                  : isSaleCompleted
                    ? `<form class="manager-review-form" data-review-form data-request-id="${request.id}" data-bid-id="${bid.id}">
                      <strong>${safeManager} 후기 작성</strong>
                      <p class="review-guide">판매완료 후 발송된 후기 요청 안내를 통해 작성하는 화면입니다.</p>
                      <label>
                        별점
                        <select name="rating" required>
                          <option value="5">★★★★★ 아주 만족</option>
                          <option value="4">★★★★ 만족</option>
                          <option value="3">★★★ 보통</option>
                          <option value="2">★★ 아쉬움</option>
                          <option value="1">★ 불만족</option>
                        </select>
                      </label>
                      <label>
                        후기
                        <textarea name="content" rows="3" placeholder="상담, 가격, 배송, 설치 조건에 대한 후기를 남겨주세요." required></textarea>
                      </label>
                      <button class="secondary-btn full" type="submit">후기 등록</button>
                    </form>`
                    : `<div class="review-wait-box">
                        <strong>판매완료 후 후기 작성 가능</strong>
                        <p>판매자가 판매완료를 누르면 고객님에게 후기 요청 알림톡을 보내는 구조입니다.</p>
                      </div>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function resetCustomerForm() {
  requestForm.reset();
  uploadedImages = [];
  imagePreview.innerHTML = "<span>이미지 미리보기</span>";
  previewTitle.textContent = "견적 요청서가 여기에 표시됩니다.";
  previewMeta.textContent = "등록 후 판매자 페이지와 내 견적 확인 페이지에서 볼 수 있습니다.";
  setRequestFormMessage("");
}

async function createCustomerRequestOnServer(formData) {
  showServerLoading("견적 요청을 등록 중입니다.", "견적서 이미지와 입력 내용을 처리하고 있습니다.");
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  const newRequest = {
    id: Date.now(),
    quoteNumber: createQuoteNumber(),
    customer: formData.get("customer").trim(),
    phone: formatPhoneNumber(formData.get("phone")),
    items: formData.get("items").trim(),
    purchasePurpose: formData.get("purchasePurpose"),
    desiredBrand: formData.get("desiredBrand"),
    price: parseManwon(formData.get("price")),
    region: formData.get("region").trim(),
    memo: formData.get("memo").trim(),
    image: uploadedImages[0] || "",
    images: uploadedImages.slice(0, 4),
    selectedBidId: null,
    saleCompletedAt: "",
    saleCompletedBidId: null,
    reviewNotificationSentAt: "",
    consent: {
      collectionUse: true,
      thirdPartyProvision: true,
      agreedAt: new Date().toISOString(),
    },
  };

  requests.unshift(newRequest);
  selectedRequestId = newRequest.id;
  renderRequests();
  renderSelectedRequest();
  renderLookupResults([newRequest]);
  resetCustomerForm();
  setView("lookup");
  hideServerLoading();
}

function openConsentModal(formData) {
  pendingQuoteFormData = formData;
  collectionConsent.checked = false;
  thirdPartyConsent.checked = false;
  setConsentMessage("");
  privacyConsentModal.hidden = false;
}

function closeConsentModal() {
  pendingQuoteFormData = null;
  privacyConsentModal.hidden = true;
}

async function createCustomerRequest(formData) {
  const quoteNumber = createQuoteNumber();
  const thumbnailImage = await createLightweightImage(uploadedImages[0]);
  const newRequest = {
    id: `quote-${Date.now()}`,
    quoteNumber,
    customer: formData.get("customer").trim(),
    phone: formatPhoneNumber(formData.get("phone")),
    items: formData.get("items").trim(),
    purchasePurpose: formData.get("purchasePurpose"),
    desiredBrand: formData.get("desiredBrand"),
    price: parseManwon(formData.get("price")),
    region: formData.get("region").trim(),
    memo: formData.get("memo").trim(),
    image: uploadedImages[0] || "",
    images: uploadedImages.slice(0, 4),
    thumbnailImage,
    selectedBidId: null,
    saleCompletedAt: "",
    saleCompletedBidId: null,
    reviewNotificationSentAt: "",
    consent: {
      collectionUse: true,
      thirdPartyProvision: true,
      agreedAt: new Date().toISOString(),
      retention: {
        fullQuoteImagesDays: 7,
        representativeImageDays: 365,
        customerInfoDays: 365,
        quoteReceiveHours: 48,
      },
    },
  };

  let savedRequest = newRequest;
  if (canUseApiServer()) {
    const serverResult = await saveCustomerQuoteToServer(newRequest);
    if (!serverResult?.ok || !serverResult.row) {
      setRequestFormMessage(serverResult?.message || "견적 요청을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", "error");
      return;
    }
    savedRequest = serverResult.row;
  }

  requests.unshift(savedRequest);
  selectedRequestId = savedRequest.id;
  renderRequests();
  renderSelectedRequest();
  renderLookupResults([savedRequest]);
  resetCustomerForm();
  setView("lookup");
}

function openBidSelectConfirmModal(request, bid) {
  const sellerDisplayName = formatSellerDisplayName(bid.channel, bid.branch) || bid.seller;
  const managerDisplayName = formatManagerDisplayName(bid.manager, bid.managerPosition);
  pendingBidSelection = {
    requestId: request.id,
    bidId: bid.id,
  };
  bidSelectConfirmSummary.innerHTML = `
    <div><span>선택 견적</span><strong>${escapeHTML(sellerDisplayName)}</strong></div>
    <div><span>담당</span><strong>${escapeHTML(managerDisplayName)}</strong></div>
    <div><span>제안 금액</span><strong>${formatPrice(bid.price)}</strong></div>
  `;
  bidSelectConfirmModal.hidden = false;
}

function closeBidSelectConfirmModal() {
  pendingBidSelection = null;
  bidSelectConfirmModal.hidden = true;
  bidSelectConfirmSummary.innerHTML = "";
}

function confirmBidSelection() {
  if (!pendingBidSelection) return;

  const request = requests.find((item) => item.id === pendingBidSelection.requestId);
  const bid = bids.find((item) => item.id === pendingBidSelection.bidId);
  if (!request || !bid) {
    closeBidSelectConfirmModal();
    return;
  }

  if (request.selectedBidId && request.selectedBidId !== bid.id) {
    closeBidSelectConfirmModal();
    renderLookupResults([request]);
    return;
  }

  request.selectedBidId = bid.id;
  selectedRequestId = request.id;
  closeBidSelectConfirmModal();
  renderLookupResults([request]);
  renderRequests();
  renderSelectedRequest();
}

function renderLookupResults(matches, label = "내 견적") {
  if (!matches.length) {
    lookupResults.innerHTML = `
      <div class="empty-state">
        <strong>조회된 견적이 없습니다.</strong>
        <p>고객님 성함과 연락처가 견적 등록 때 입력한 내용과 같은지 확인해주세요.</p>
      </div>
    `;
    return;
  }

  lookupResults.innerHTML = matches
    .map((request) => {
      const safeCustomer = escapeHTML(request.customer);
      const safePhone = escapeHTML(request.phone);
      const safeItems = escapeHTML(request.items);
      const safePurchasePurpose = escapeHTML(request.purchasePurpose || "미선택");
      const safeRegion = escapeHTML(request.region);
      const safeQuoteNumber = escapeHTML(request.quoteNumber || "번호 없음");
      const safeMemo = escapeHTML(request.memo || "추가 요청사항 없음");
      return `
        <article class="lookup-card">
          <div class="preview-image lookup-image">
            ${quoteImageMarkup(request, `${request.customer} 고객님의 견적서`)}
          </div>
          <div class="lookup-body">
            <span class="status">${label}</span>
            <h2>${safeItems}</h2>
            <dl class="quote-summary">
              <div><dt>견적번호</dt><dd>${safeQuoteNumber}</dd></div>
              <div><dt>고객님 성함</dt><dd>${safeCustomer}</dd></div>
              <div><dt>연락처</dt><dd>${safePhone}</dd></div>
              <div><dt>구매 목적</dt><dd>${safePurchasePurpose}</dd></div>
              <div><dt>기존 견적</dt><dd>${formatPrice(request.price)}</dd></div>
              <div><dt>설치 지역</dt><dd>${safeRegion}</dd></div>
              <div><dt>요청사항</dt><dd>${safeMemo}</dd></div>
            </dl>
            <div class="bid-card-toolbar">
              <strong>${getBidsForRequest(request.id).length}개 제안</strong>
              <span>낮은 금액순</span>
            </div>
            <div class="seller-bid-grid">
              ${renderBidCards(request)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function showSecurityBlanket(duration = 1800) {
  securityBlanket.classList.add("is-active");
  window.clearTimeout(securityBlanketTimer);

  if (duration) {
    securityBlanketTimer = window.setTimeout(() => {
      securityBlanket.classList.remove("is-active");
    }, duration);
  }
}

function hideSecurityBlanket() {
  window.clearTimeout(securityBlanketTimer);
  securityBlanket.classList.remove("is-active");
}

function openQuoteImageModal(src, alt) {
  quoteImageModalImg.src = src;
  quoteImageModalImg.alt = alt;
  quoteImageModal.hidden = false;
}

function closeQuoteImagePreview() {
  quoteImageModal.hidden = true;
  quoteImageModalImg.removeAttribute("src");
}

function buildMailtoLink(subject, body) {
  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function sendAdminMail(subject, body, fallbackLink) {
  fallbackLink.hidden = true;
  fallbackLink.textContent = "자동 메일 발송 중...";
  fallbackLink.href = "#";

  if (window.location.protocol === "file:") {
    fallbackLink.href = buildMailtoLink(subject, body);
    fallbackLink.textContent = "요청 접수 준비 중";
    fallbackLink.hidden = false;
    return false;
  }

  try {
    const response = await fetch("/api/send-mail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, body }),
    });

    if (!response.ok) throw new Error("mail request failed");

    fallbackLink.textContent = "요청 접수가 완료되었습니다.";
    fallbackLink.removeAttribute("href");
    fallbackLink.hidden = false;
    return true;
  } catch (error) {
    fallbackLink.href = buildMailtoLink(subject, body);
    fallbackLink.textContent = "요청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.";
    fallbackLink.hidden = false;
    return false;
  }
}

document.querySelectorAll("input, textarea, select").forEach((field) => {
  field.lang = "ko";
  field.autocapitalize = "off";
  field.spellcheck = false;
});

document.querySelectorAll("[data-phone-input]").forEach((field) => {
  field.type = "text";
  field.addEventListener("input", () => {
    field.value = formatPhoneNumber(field.value);
  });
  field.addEventListener("blur", () => {
    field.value = formatPhoneNumber(field.value);
  });
});

document.querySelectorAll("[data-money-input]").forEach((field) => {
  field.type = "text";
  field.addEventListener("input", () => {
    field.value = normalizeMoney(field.value);
  });
});

const koreanInputNames = new Set([
  "customer",
  "lookupCustomer",
  "items",
  "region",
  "memo",
  "benefits",
  "nextBranch",
  "changeReason",
  "branch",
  "manager",
  "managerPosition",
  "sellerMemo",
  "findBranch",
  "findManager",
  "resetBranch",
  "resetManager",
]);

document.querySelectorAll("input, textarea").forEach((field) => {
  if (!koreanInputNames.has(field.name) || field.readOnly) return;

  field.lang = "ko";
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.spellcheck = false;
});

navButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setView(button.dataset.view);
  });
});

sellerTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeSellerTab = tab.dataset.sellerTab;
    setBidFormMessage("");
    renderRequests();
    renderSelectedRequest();
  });
});

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-seller-filter]");
  if (!filterButton) return;

  const filterType = filterButton.dataset.sellerFilter;
  const filterValue = filterButton.dataset.filterValue || "all";

  if (filterType === "brand") {
    activeSellerBrandFilter = filterValue;
    activeSellerRegionFilter = "all";
  }

  if (filterType === "region") {
    activeSellerRegionFilter = filterValue;
  }

  setBidFormMessage("");
  renderRequests();
  renderSelectedRequest();
});

quoteImage.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 4);

  if (!files.length) {
    uploadedImages = [];
    imagePreview.innerHTML = "<span>이미지 미리보기</span>";
    return;
  }

  uploadedImages = await Promise.all(
    files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.readAsDataURL(file);
      });
    })
  );

  imagePreview.innerHTML = `
    <div class="quote-image-grid image-count-${uploadedImages.length}">
      ${uploadedImages
        .map((image, index) => `<img src="${image}" alt="업로드한 견적서 미리보기 ${index + 1}" />`)
        .join("")}
    </div>
  `;

  setRequestFormMessage(
    event.target.files.length > 4 ? "견적서 이미지는 최대 4장까지 등록됩니다. 앞의 4장만 반영했습니다." : ""
  );
});

businessCardInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    businessCardImage = reader.result;
    businessCardPreview.innerHTML = `<img src="${businessCardImage}" alt="첨부한 지점 명함 미리보기" />`;
  });
  reader.readAsDataURL(file);
});

sellerImage.addEventListener("click", (event) => {
  const image = event.target.closest("img");
  if (!image) return;

  openQuoteImageModal(image.src, image.alt || "견적서 원본 이미지");
});

closeQuoteImageModal.addEventListener("click", closeQuoteImagePreview);

quoteImageModal.addEventListener("click", (event) => {
  if (event.target === quoteImageModal) {
    closeQuoteImagePreview();
  }
});

openSellerAccountModal.addEventListener("click", openAccountRecoveryModal);
closeSellerAccountModal.addEventListener("click", closeAccountRecoveryModal);
closeManagerReviewModalBtn.addEventListener("click", closeManagerReviewModal);

sellerAccountModal.addEventListener("click", (event) => {
  if (event.target === sellerAccountModal) {
    closeAccountRecoveryModal();
  }
});

managerReviewModal.addEventListener("click", (event) => {
  if (event.target === managerReviewModal) {
    closeManagerReviewModal();
  }
});

accountTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setAccountTab(tab.dataset.accountTab);
  });
});

sellerFindIdForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(sellerFindIdForm);
  const match = findSellerByProfile({
    channel: formData.get("findChannel"),
    branch: formData.get("findBranch"),
    manager: formData.get("findManager"),
    phone: formData.get("findPhone"),
  });

  if (!match) {
    setFindIdMessage("일치하는 판매자 계정을 찾을 수 없습니다.", "error");
    return;
  }

  setFindIdMessage(`등록된 아이디는 ${match[0]} 입니다.`);
});

sellerResetPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(sellerResetPasswordForm);
  const match = findSellerByProfile({
    channel: formData.get("resetChannel"),
    branch: formData.get("resetBranch"),
    manager: formData.get("resetManager"),
    phone: formData.get("resetPhone"),
    sellerId: formData.get("resetSellerId"),
  });

  if (!match) {
    setResetPasswordMessage("입력한 정보와 일치하는 판매자 계정이 없습니다.", "error");
    return;
  }

  const nextPassword = formData.get("newPassword");
  if (String(nextPassword).length < 4) {
    setResetPasswordMessage("새 비밀번호는 4자리 이상으로 입력해주세요.", "error");
    return;
  }

  match[1].password = nextPassword;
  sellerResetPasswordForm.reset();
  setResetPasswordMessage("비밀번호가 새 비밀번호로 재설정되었습니다.");
});

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(requestForm);
  const customerPhone = normalizePhone(formData.get("phone"));
  const quotePrice = parseManwon(formData.get("price"));

  if (!uploadedImages.length) {
    setRequestFormMessage("견적서 이미지를 1장 이상 첨부해주세요.", "error");
    quoteImage.closest(".upload-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (customerPhone.length < 9) {
    setRequestFormMessage("연락처를 정확히 입력해주세요.", "error");
    requestForm.elements.phone.focus();
    return;
  }

  if (!quotePrice) {
    setRequestFormMessage("기존 견적 금액을 만원 단위로 입력해주세요.", "error");
    requestForm.elements.price.focus();
    return;
  }

  if (registeredSellerPhones.has(customerPhone)) {
    setRequestFormMessage(
      "판매자로 등록된 연락처로는 견적을 등록할 수 없습니다. 다른 고객님 연락처를 입력해주세요.",
      "error"
    );
    return;
  }

  openConsentModal(formData);
});

cancelConsentBtn.addEventListener("click", closeConsentModal);

privacyConsentModal.addEventListener("click", (event) => {
  if (event.target === privacyConsentModal) {
    closeConsentModal();
  }
});

cancelBidSelectBtn.addEventListener("click", closeBidSelectConfirmModal);
confirmBidSelectBtn.addEventListener("click", confirmBidSelection);

bidSelectConfirmModal.addEventListener("click", (event) => {
  if (event.target === bidSelectConfirmModal) {
    closeBidSelectConfirmModal();
  }
});

confirmConsentBtn.addEventListener("click", () => {
  if (!collectionConsent.checked || !thirdPartyConsent.checked) {
    setConsentMessage("필수 동의 항목을 모두 체크해야 견적 요청을 등록할 수 있습니다.", "error");
    return;
  }

  if (pendingQuoteFormData) {
    createCustomerRequestOnServer(pendingQuoteFormData);
  }

  closeConsentModal();
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(lookupForm);
  const customer = normalizeName(formData.get("lookupCustomer"));
  const phone = normalizePhone(formData.get("lookupPhone"));
  const serverMatches = canUseApiServer() ? await lookupCustomerQuotesFromServer(formData.get("lookupCustomer").trim(), phone) : [];
  const matches = serverMatches.length
    ? serverMatches
    : requests.filter((request) => {
        return normalizeName(request.customer) === customer && normalizePhone(request.phone) === phone;
      });

  renderLookupResults(matches);
});

lookupResults.addEventListener("click", (event) => {
  const lookupImage = event.target.closest(".lookup-image img");
  if (lookupImage) {
    openQuoteImageModal(lookupImage.src, lookupImage.alt || "견적서 원본 이미지");
    return;
  }

  const reviewButton = event.target.closest("[data-review-bid-id]");
  if (reviewButton) {
    openManagerReviewModal(reviewButton.dataset.reviewBidId);
    return;
  }

  const button = event.target.closest(".select-bid-btn");
  if (!button || button.disabled) return;

  const request = requests.find((item) => item.id === Number(button.dataset.requestId));
  const bid = bids.find((item) => item.id === Number(button.dataset.bidId));
  if (!request) return;
  if (!bid) return;
  if (request.selectedBidId && request.selectedBidId !== bid.id) return;
  if (request.selectedBidId === bid.id) return;

  openBidSelectConfirmModal(request, bid);
});

lookupResults.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-review-form]");
  if (!form) return;
  event.preventDefault();

  const request = requests.find((item) => item.id === Number(form.dataset.requestId));
  const bid = bids.find((item) => item.id === Number(form.dataset.bidId));
  if (!request || !bid || request.selectedBidId !== bid.id) return;

  const formData = new FormData(form);
  const content = formData.get("content").trim();
  const rating = Number(formData.get("rating"));
  if (!content || !rating) return;

  const existingReview = managerReviews.find(
    (review) => review.requestId === request.id && review.bidId === bid.id
  );
  const nextReview = {
    id: existingReview?.id || Date.now(),
    requestId: request.id,
    bidId: bid.id,
    sellerId: bid.sellerId,
    seller: bid.seller,
    manager: bid.manager || "담당 매니저",
    customer: maskCustomerName(request.customer),
    rating,
    content,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (existingReview) {
    Object.assign(existingReview, nextReview);
  } else {
    managerReviews.unshift(nextReview);
  }

  renderLookupResults([request]);
});

sellerQuoteWorkspace.addEventListener("click", (event) => {
  const button = event.target.closest(".sale-complete-btn");
  if (!button || button.disabled) return;

  const request = requests.find((item) => item.id === Number(button.dataset.requestId));
  const selectedBid = request ? getSelectedBid(request) : null;
  if (!request || !selectedBid || selectedBid.sellerId !== activeSellerId) {
    setBidFormMessage("선택받은 견적만 판매완료 처리할 수 있습니다.", "error");
    return;
  }

  const completedAt = new Date().toISOString();
  request.saleCompletedAt = completedAt;
  request.saleCompletedBidId = selectedBid.id;
  request.reviewNotificationSentAt = completedAt;
  setBidFormMessage(
    "판매완료 처리되었습니다. 정식 서비스에서는 고객님께 카카오 알림톡 후기 요청이 발송됩니다."
  );
  renderRequests();
  renderSelectedRequest();
});

sellerLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await syncApprovedSellersFromServer();
  await syncCustomerQuotesFromServer();
  hydrateApprovedSellerAccounts();
  const formData = new FormData(sellerLoginForm);
  const loginId = formData.get("loginId").trim();
  const loginPassword = formData.get("loginPassword");
  const account = sellerAccounts.get(loginId);

  if (!account || account.password !== loginPassword) {
    setSellerLoginMessage("아이디 또는 비밀번호가 일치하지 않습니다.", "error");
    return;
  }

  activeSellerId = loginId;
  activeSellerTab = "all";
  setSellerLoginMessage("");
  setBidFormMessage("");
  sellerLoginForm.reset();
  bidForm.elements.branchName.value = account.branch;
  bidForm.elements.managerName.value = account.manager;
  bidForm.elements.managerPhone.value = formatPhoneNumber(account.phone);
  renderRequests();
  renderSelectedRequest();
  setView("seller");
});

bidForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedRequestId) return;

  const formData = new FormData(bidForm);
  const account = sellerAccounts.get(activeSellerId);
  const branchName = account?.branch || "등록 지점";
  const channelName = account?.channel || "판매자";
  const request = getSelectedRequest();
  const existingBid = request ? getActiveSellerBid(request) : null;
  const bidPrice = parseManwon(formData.get("bidPrice"));
  const benefits = formData.get("benefits").trim();

  if (!request) {
    setBidFormMessage("제안할 고객님 견적을 먼저 선택해주세요.", "error");
    return;
  }

  if (!bidPrice) {
    setBidFormMessage("제안 금액을 만원 단위로 입력해주세요.", "error");
    bidForm.elements.bidPrice.focus();
    return;
  }

  if (!benefits) {
    setBidFormMessage("제공 조건을 입력해주세요.", "error");
    bidForm.elements.benefits.focus();
    return;
  }

  const nextBid = {
    seller: formatSellerDisplayName(channelName, branchName),
    price: bidPrice,
    benefits,
    channel: channelName,
    branch: branchName,
    manager: account?.manager || "담당 매니저",
    managerPosition: account?.managerPosition || "",
    phone: account?.phone ? formatPhoneNumber(account.phone) : "",
    cardImage: account?.cardImage || "",
  };

  if (existingBid) {
    Object.assign(existingBid, nextBid);
  } else {
    bids.push({
      id: Date.now(),
      requestId: selectedRequestId,
      sellerId: activeSellerId,
      ...nextBid,
    });
  }

  bidForm.reset();
  renderRequests();
  syncBidFormForRequest(getSelectedRequest());
  renderSelectedRequest();
  setBidFormMessage(existingBid ? "제안 내용이 수정되었습니다." : "고객님에게 제안이 전달되었습니다.");
});

sellerRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(sellerRegisterForm);
  const sellerChannel = formData.get("sellerChannel");
  const branch = formData.get("branch").trim();
  const branchRegion = formData.get("branchRegion");
  const sellerId = formData.get("sellerId").trim();
  const sellerPassword = formData.get("sellerPassword");
  const manager = formData.get("manager").trim();
  const managerPosition = formData.get("managerPosition").trim();
  const sellerPhone = formatPhoneNumber(formData.get("sellerPhone"));
  const normalizedSellerPhone = normalizePhone(sellerPhone);
  const sellerMemo = formData.get("sellerMemo").trim() || "추가 메모 없음";

  hydrateApprovedSellerAccounts();

  if (sellerAccounts.has(sellerId)) {
    sellerRegisterTitle.textContent = "이미 사용 중인 판매자 아이디입니다.";
    sellerRegisterMeta.textContent = "다른 아이디로 다시 신청해주세요.";
    return;
  }

  if (registeredSellerPhones.has(normalizedSellerPhone)) {
    sellerRegisterTitle.textContent = "이미 등록된 판매자 연락처입니다.";
    sellerRegisterMeta.textContent = "다른 연락처를 입력하거나 계정 찾기를 이용해주세요.";
    return;
  }

  if (!canUseApiServer() && hasPendingSellerApplication(sellerId, sellerPhone)) {
    sellerRegisterTitle.textContent = "이미 검토 대기 중인 신청입니다.";
    sellerRegisterMeta.textContent = "관리자 승인 또는 반려 후 다시 신청할 수 있습니다.";
    return;
  }

  const submitButton = sellerRegisterForm.querySelector('button[type="submit"]');
  const originalSubmitText = submitButton?.textContent || "판매자 등록 요청";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "서버에 저장 중입니다...";
  }
  sellerRegisterTitle.textContent = "판매자 등록 요청을 저장 중입니다.";
  sellerRegisterMeta.textContent = "잠시만 기다려주세요. 정상 저장 후 관리자 페이지에서 확인할 수 있습니다.";

  const mailBody = [
    "[픽견적 판매자 등록 요청]",
    "",
    `채널: ${sellerChannel}`,
    `근무지점: ${branch}`,
    `해당 지점 지역: ${branchRegion}`,
    `판매자 아이디: ${sellerId}`,
    `매니저 이름: ${manager}`,
    `직책: ${managerPosition}`,
    `연락처: ${sellerPhone}`,
    `추가 메모: ${sellerMemo}`,
    "",
    "지점 명함 이미지: 실제 서비스에서는 첨부파일 또는 서버 저장 URL로 함께 전달됩니다.",
  ].join("\n");

  const applications = getSellerApplications();
  const application = {
    id: `seller-${Date.now()}`,
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedAt: "",
    reviewMemo: "",
    sellerId,
    password: sellerPassword,
    channel: sellerChannel,
    branch,
    branchRegion,
    manager,
    managerPosition,
    phone: sellerPhone,
    cardImage: businessCardImage,
    consent: {
      privacyUse: true,
      customerDisclosure: true,
      agreedAt: new Date().toISOString(),
    },
    memo: sellerMemo,
  };
  applications.unshift(application);
  setSellerApplications(applications);
  const serverResult = await saveSellerApplicationToServer(application);
  if (canUseApiServer() && !serverResult?.ok) {
    applications.shift();
    setSellerApplications(applications);
    sellerRegisterTitle.textContent = "??? ?? ??? ???? ?????.";
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalSubmitText;
    }
    sellerRegisterTitle.textContent = "판매자 등록 요청을 저장하지 못했습니다.";
    sellerRegisterMeta.textContent = serverResult?.message || "잠시 후 다시 시도해주세요. 문제가 계속되면 운영자에게 문의해주세요.";
    return;
  }
  queueAlimtalkMessage({
    type: "seller-application-received",
    targetRole: "seller",
    targetName: manager,
    targetPhone: sellerPhone,
    title: "판매자 등록 요청 접수 안내",
    body: `${formatSellerDisplayName(sellerChannel, branch)} 등록 요청이 접수되었습니다. 관리자 검토 후 승인 또는 반려 안내를 발송합니다.`,
    relatedId: application.id,
  });

  sellerRegisterTitle.textContent = "판매자 등록 요청이 접수되었습니다.";
  sellerRegisterMeta.textContent = `${formatSellerDisplayName(sellerChannel, branch)} · 관리자 승인 대기`;
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = originalSubmitText;
  }
  sellerRegisterForm.reset();
  businessCardImage = "";
  businessCardPreview.innerHTML = "";
  sellerRegisterTitle.textContent = "정상적으로 완료되었습니다.";
  sellerRegisterMeta.textContent = `${formatSellerDisplayName(sellerChannel, branch)} 등록 요청이 저장되었습니다. 관리자 검토 후 승인 또는 반려 안내가 진행됩니다.`;
  sellerMailPreview.textContent = "";
  sellerMailPreview.hidden = true;
  sellerAdminReviewLink.hidden = true;
  sellerMailLink.hidden = true;
  sellerMailPanel.hidden = false;
  sellerMailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

regionChangeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = sellerAccounts.get(activeSellerId);
  if (!account) {
    setView("sellerLogin");
    return;
  }

  const formData = new FormData(regionChangeForm);
  const branch = account.branch;
  const manager = account.manager;
  const currentRegion = account.branchRegion;
  const nextRegion = formData.get("nextRegion");
  const nextBranch = formData.get("nextBranch").trim();
  const reason = formData.get("changeReason").trim();
  const mailBody = [
    "[픽견적 판매자 매니저 정보 변경 신청]",
    "",
    `판매자 아이디: ${activeSellerId}`,
    `근무지점: ${branch}`,
    `매니저 이름: ${manager}`,
    `현재 지역: ${currentRegion}`,
    `변경 희망 지점: ${nextBranch}`,
    `변경 희망 지역: ${nextRegion}`,
    `변경 사유: ${reason}`,
    "",
    "관리자 검토 후 승인 시 등록 지점 및 판매 가능 지역 등 매니저 정보가 변경됩니다.",
  ].join("\n");

  regionChangePreview.textContent = mailBody;
  regionChangePreview.hidden = false;
  await sendAdminMail("[픽견적] 판매자 매니저 정보 변경 신청", mailBody, regionChangeMailLink);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !privacyConsentModal.hidden) {
    closeConsentModal();
    return;
  }

  if (event.key === "Escape" && !bidSelectConfirmModal.hidden) {
    closeBidSelectConfirmModal();
    return;
  }

  if (event.key === "Escape" && !sellerAccountModal.hidden) {
    closeAccountRecoveryModal();
    return;
  }

  if (event.key === "Escape" && !managerReviewModal.hidden) {
    closeManagerReviewModal();
    return;
  }

  if (event.key === "Escape" && !quoteImageModal.hidden) {
    closeQuoteImagePreview();
    return;
  }

  const key = event.key.toLowerCase();
  const isPrintScreen = event.key === "PrintScreen";
  const isSnippingShortcut = event.metaKey && event.shiftKey && key === "s";
  const isCaptureShortcut = event.ctrlKey && event.shiftKey && (key === "s" || key === "p");

  if (isPrintScreen || isSnippingShortcut || isCaptureShortcut) {
    showSecurityBlanket();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    showSecurityBlanket(0);
    return;
  }

  hideSecurityBlanket();
});

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("blur", () => showSecurityBlanket(0));
window.addEventListener("focus", hideSecurityBlanket);
window.addEventListener("beforeprint", () => showSecurityBlanket(0));
window.addEventListener("afterprint", hideSecurityBlanket);

createCustomerRequestOnServer = async function createCustomerRequestOnServerClean(formData) {
  await createCustomerRequest(formData);
};

renderRequests = function renderRequestsClean() {
  const isRegionTab = activeSellerTab === "region";
  sellerQuoteWorkspace.hidden = isRegionTab;
  sellerRegionPanel.hidden = !isRegionTab;
  const filterBar = document.querySelector("#sellerFilterBar");
  if (filterBar) filterBar.hidden = isRegionTab;

  if (isRegionTab) {
    sellerTabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.sellerTab === activeSellerTab);
    });
    syncRegionChangeForm();
    return;
  }

  requestList.innerHTML = "";
  renderSellerFilterBar();
  const filteredRequests = syncSelectedRequestWithTab();

  sellerTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.sellerTab === activeSellerTab);
  });

  if (!filteredRequests.length) {
    const currentFilterBar = document.querySelector("#sellerFilterBar");
    const emptyLabel =
      activeSellerTab === "proposed"
        ? "선택 대기 중인 제안 견적이 없습니다."
        : activeSellerTab === "selected"
          ? "아직 고객님에게 선택받은 견적이 없습니다."
          : "등록된 고객님 견적이 없습니다.";
    requestList.innerHTML = `
      <div class="empty-state compact-empty">
        <strong>${emptyLabel}</strong>
        <p>해당하는 견적이 생기면 이곳에 표시됩니다.</p>
      </div>
    `;
    if (currentFilterBar) requestList.prepend(currentFilterBar);
    return;
  }

  filteredRequests.forEach((request) => {
    const sellerBid = getActiveSellerBid(request);
    const isSelectedByCustomer = canActiveSellerSeeCustomerPhone(request);
    const isSaleCompleted = Boolean(request.saleCompletedAt && request.saleCompletedBidId === sellerBid?.id);
    const safeItems = escapeHTML(request.items);
    const safeCustomer = escapeHTML(request.customer);
    const safeRegion = escapeHTML(request.region);
    const safePurchasePurpose = escapeHTML(request.purchasePurpose || "미선택");
    const safeQuoteNumber = escapeHTML(request.quoteNumber || "번호 없음");
    const safeRemaining = escapeHTML(getQuoteRemainingLabel(request));
    const expired = isQuoteExpired(request);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `request-item${request.id === selectedRequestId ? " is-active" : ""}`;
    item.innerHTML = `
      <strong>${safeItems}</strong>
      <span>${safeCustomer} · ${safeRegion}</span>
      <span>견적번호 ${safeQuoteNumber}</span>
      <span class="${expired ? "deadline-expired" : "deadline-live"}">남은 시간 ${safeRemaining}</span>
      <span>구매 목적 ${safePurchasePurpose}</span>
      <span>기존 견적 ${formatPrice(request.price)}</span>
      ${sellerBid ? `<span>내 제안 ${formatPrice(sellerBid.price)}</span>` : ""}
      ${isSelectedByCustomer ? `<span class="request-badge">선택받음</span>` : ""}
      ${isSaleCompleted ? `<span class="request-badge done">판매완료</span>` : ""}
    `;
    item.addEventListener("click", () => {
      selectedRequestId = request.id;
      setBidFormMessage("");
      renderRequests();
      renderSelectedRequest();
    });
    requestList.appendChild(item);
  });
};

renderSelectedRequest = function renderSelectedRequestClean() {
  const request = getSelectedRequest();
  if (!request) {
    selectedStatus.textContent = "선택 대기";
    selectedTitle.textContent = "표시할 견적이 없습니다.";
    selectedInfo.innerHTML = "현재 탭에 해당하는 고객님 견적이 없습니다.";
    sellerImage.innerHTML = "<span>등록된 견적서 이미지가 없습니다.</span>";
    syncBidFormForRequest(null);
    setBidFormEnabled(false);
    return;
  }

  setBidFormEnabled(true);
  syncBidFormForRequest(request);

  const visiblePhone = canActiveSellerSeeCustomerPhone(request) ? request.phone : maskPhone(request.phone);
  const safeCustomer = escapeHTML(request.customer);
  const safePhone = escapeHTML(visiblePhone);
  const safePurchasePurpose = escapeHTML(request.purchasePurpose || "미선택");
  const safeRegion = escapeHTML(request.region);
  const safeQuoteNumber = escapeHTML(request.quoteNumber || "번호 없음");
  const safeMemo = escapeHTML(request.memo || "추가 요청사항 없음");
  const safeRemaining = escapeHTML(getQuoteRemainingLabel(request));
  const expired = isQuoteExpired(request);
  const activeSellerBid = getActiveSellerBid(request);
  const isSelectedSeller = canActiveSellerSeeCustomerPhone(request);
  const isSaleCompleted = isSaleCompletedForBid(request, activeSellerBid);

  selectedStatus.textContent = isSaleCompleted ? "판매완료" : isSelectedSeller ? "선택받음" : expired ? "견적 마감" : "응답 가능";
  selectedTitle.textContent = request.items;
  selectedInfo.innerHTML = `
    <div class="seller-summary-grid">
      <div><span>견적번호</span><strong>${safeQuoteNumber}</strong></div>
      <div><span>고객님</span><strong>${safeCustomer}</strong></div>
      <div><span>연락처</span><strong>${safePhone}</strong></div>
      <div><span>구매 목적</span><strong>${safePurchasePurpose}</strong></div>
      <div><span>설치 지역</span><strong>${safeRegion}</strong></div>
      <div><span>기존 견적</span><strong>${formatPrice(request.price)}</strong></div>
      <div><span>견적 가능 시간</span><strong class="${expired ? "deadline-expired" : "deadline-live"}">${safeRemaining}</strong></div>
    </div>
    <div class="seller-request-note">
      <span>요청사항</span>
      <p>${safeMemo}</p>
    </div>
    <p class="privacy-note">${
      isSaleCompleted
        ? `판매완료 처리되었습니다. 고객님에게 후기 요청 알림톡 발송 상태: ${
            request.reviewNotificationSentAt ? "발송 완료" : "발송 대기"
          }`
        : isSelectedSeller
        ? "고객님이 이 제안을 선택해 연락처가 공개되었습니다."
        : "연락처는 고객님이 제안을 선택한 뒤 공개됩니다."
    }</p>
    ${
      isSelectedSeller
        ? `<div class="sale-complete-panel">
            <strong>${isSaleCompleted ? "판매완료 처리됨" : "판매가 완료되었나요?"}</strong>
            <p>${
              isSaleCompleted
                ? "정식 서비스에서는 이 시점에 고객님께 카카오 알림톡으로 후기 작성 링크가 발송됩니다."
                : "선택받은 견적에서 판매완료를 누르면 고객님 후기 작성 안내가 열립니다."
            }</p>
            <button class="primary-btn full sale-complete-btn" type="button" data-request-id="${request.id}" ${
              isSaleCompleted ? "disabled" : ""
            }>
              ${isSaleCompleted ? "판매완료 완료" : "판매완료 처리"}
            </button>
          </div>`
        : ""
    }
  `;
  sellerImage.innerHTML = quoteImageMarkup(request, `${request.customer} 고객님이 올린 견적서`);
};

renderRequests();
renderSelectedRequest();
renderLookupResults([], "성함과 휴대전화로 등록한 견적을 조회하세요.");

