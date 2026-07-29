(function () {
  const form = document.querySelector("#requestForm");
  if (!form || form.dataset.wizardReady === "true") return;

  const PRODUCT_MODEL_CATALOG_URL = "assets/pickquote-product-model-map.json";
  const AI_QUOTE_NOTICE = "고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다.";

  function ensureHiddenField(name) {
    let field = form.querySelector(`[name="${name}"]`);
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.value = "";
      form.prepend(field);
    }
    return field;
  }

  const fields = {
    quoteType: form.querySelector('[name="quoteType"]'),
    items: form.querySelector('[name="items"]'),
    aiSituation: ensureHiddenField("aiSituation"),
    familyComposition: ensureHiddenField("familyComposition"),
    budgetStatus: ensureHiddenField("budgetStatus"),
    budgetRange: ensureHiddenField("budgetRange"),
    purchasePriority: ensureHiddenField("purchasePriority"),
    aiRequestSummary: ensureHiddenField("aiRequestSummary"),
    aiModelRecommendations: ensureHiddenField("aiModelRecommendations"),
    file: form.querySelector("#quoteImage"),
    customer: form.querySelector('[name="customer"]'),
    phone: form.querySelector('[name="phone"]'),
    purpose: form.querySelector('[name="purchasePurpose"]'),
    brand: form.querySelector('[name="desiredBrand"]'),
    price: form.querySelector('[name="price"]'),
    region: form.querySelector('[name="region"]'),
    installDate: form.querySelector('[name="installDate"]'),
    memo: form.querySelector('[name="memo"]'),
  };

  const uploadBox = form.querySelector(".upload-box");
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector("#requestFormMessage") || document.createElement("p");

  if (Object.values(fields).some((field) => !field) || !uploadBox || !submitButton) return;

  form.dataset.wizardReady = "true";
  form.noValidate = true;

  const quoteTypes = [
    {
      value: "with_quote",
      title: "견적서가 있어요",
      text: "받은 견적서 사진을 올려 판매자 제안가와 혜택을 비교합니다.",
    },
    {
      value: "without_quote",
      title: "견적서가 없어요",
      text: "품목과 상황을 선택하면 AI가 LG전자 후보 모델로 간이 견적서를 정리합니다.",
      badge: "AI 추천",
    },
  ];

  const purposes = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "여러 품목을 한 번에 비교하기 좋습니다.", badge: "특별혜택" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정과 설치 조건까지 함께 확인합니다.", badge: "특별혜택" },
    { value: "이사", title: "이사", text: "배송일과 설치 일정을 맞춰 비교합니다." },
    { value: "인테리어", title: "인테리어", text: "공간 구성과 설치 환경을 함께 반영합니다." },
    { value: "일반", title: "일반", text: "필요한 가전 조건을 빠르게 비교합니다." },
  ];

  const brands = [
    { value: "LG전자", title: "LG전자", text: "LG전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "삼성전자", title: "삼성전자", text: "삼성전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "비교견적", title: "비교견적", text: "LG와 삼성 조건을 함께 비교하고 싶어요." },
  ];

  const products = [
    { value: "TV", title: "TV", icon: "tv" },
    { value: "냉장고", title: "냉장고", icon: "fridge" },
    { value: "세탁기/건조기", title: "세탁기/건조기", icon: "washer" },
    { value: "청소기", title: "청소기", icon: "vacuum" },
    { value: "김치냉장고", title: "김치냉장고", icon: "kimchi" },
    { value: "에어컨", title: "에어컨", icon: "aircon" },
    { value: "식기세척기", title: "식기세척기", icon: "dishwasher" },
    { value: "인덕션/전기레인지", title: "인덕션/전기레인지", icon: "induction" },
    { value: "정수기", title: "정수기", icon: "water" },
    { value: "의류관리기", title: "의류관리기", icon: "styler" },
    { value: "오븐/전자레인지", title: "오븐/전자레인지", icon: "oven" },
    { value: "공기청정기", title: "공기청정기", icon: "purifier" },
    { value: "제습기", title: "제습기", icon: "purifier" },
    { value: "가습기", title: "가습기", icon: "water" },
    { value: "라이프스타일 TV", title: "라이프스타일 TV", icon: "lifestyle" },
  ];

  const optionSchema = {
    TV: [{ key: "size", title: "화면 크기", mode: "single", options: ["43인치", "55인치", "65인치", "75인치", "85인치", "85인치 ↑"] }],
    냉장고: [
      { key: "type", title: "설치 형태", mode: "single", options: ["빌트인(키친핏, 핏앤맥스)", "프리스탠딩(용량이 큼)"] },
      { key: "door", title: "도어 수", mode: "single", options: ["1도어", "2도어", "4도어", "모르겠어요"], optional: true },
    ],
    "세탁기/건조기": [
      { key: "type", title: "제품 형태", mode: "single", options: ["분리형(병렬/직렬/분리 설치 가능)", "복합형(콤보)", "일체형(원바디, 워시타워)"] },
    ],
    청소기: [{ key: "type", title: "종류", mode: "multi", options: ["무선청소기", "로봇청소기", "유선청소기"] }],
    김치냉장고: [
      { key: "type", title: "형태", mode: "single", options: ["뚜껑식", "스탠드"] },
      { key: "door", title: "스탠드 도어 수", mode: "single", options: ["4도어", "3도어", "1도어"], optional: true },
    ],
    에어컨: [
      { key: "type", title: "종류", mode: "single", options: ["스탠드", "벽걸이", "2IN1", "천장형"] },
      { key: "area", title: "냉방 면적", mode: "single", options: ["18평", "24평", "34평", "40평형 이상"], optional: true },
      { key: "rooms", title: "천장형 실 수", mode: "single", options: ["3실", "4실", "5실", "6실"], optional: true },
    ],
    식기세척기: [{ key: "install", title: "설치 형태", mode: "single", options: ["빌트인", "카운터탑", "프리스탠딩"] }],
    "인덕션/전기레인지": [
      { key: "install", title: "설치 형태", mode: "single", options: ["빌트인 O", "빌트인 X"] },
      { key: "burner", title: "화구 수", mode: "single", options: ["2구", "3구", "4구"], optional: true },
    ],
    정수기: [{ key: "type", title: "종류", mode: "single", options: ["냉온정수기", "얼음정수기", "냉정수기", "직수형"] }],
    의류관리기: [{ key: "size", title: "용량", mode: "single", options: ["3벌", "5벌", "대용량", "모르겠어요"] }],
    "오븐/전자레인지": [{ key: "type", title: "종류", mode: "multi", options: ["오븐", "전자레인지"] }],
    공기청정기: [{ key: "area", title: "사용 면적", mode: "single", options: ["10평 이하", "10평대", "20평대", "30평대 이상"] }],
    제습기: [{ key: "capacity", title: "용량", mode: "single", options: ["10L 이하", "10L대", "20L 이상", "모르겠어요"] }],
    가습기: [{ key: "type", title: "종류", mode: "single", options: ["초음파식", "가열식", "복합식", "대용량", "모르겠어요"] }],
    "라이프스타일 TV": [{ key: "type", title: "종류", mode: "single", options: ["이동형 TV", "스탠바이미류", "포터블 스크린", "모르겠어요"] }],
  };

  const aiSituations = ["혼수/웨딩", "신축 입주", "이사", "교체", "사업장/B2B"];
  const familyOptions = ["1인", "2인", "3~4인", "5인 이상", "아이 있음", "반려동물 있음"];
  const priorityOptions = ["총 구매가 절감", "배송/설치 일정", "카드 혜택", "사은품", "AS/보증", "공간/디자인", "상위 등급 제품"];

  const optionState = {};
  let currentStepIndex = 0;
  let activeOptionProduct = "";
  let modelCatalogPromise = null;
  let latestRecommendationRenderId = 0;

  function wrapHidden(field) {
    const holder = document.createElement("span");
    holder.className = "wizard-hidden-native";
    holder.appendChild(field);
    return holder;
  }

  function setNativeValue(field, value) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function cardList(items, name, type = "radio") {
    return items
      .map(
        (item) => `
        <label class="wizard-choice-card">
          <input type="${type}" name="${name}" value="${item.value}" ${type === "radio" ? "required" : ""} />
          <span class="wizard-choice-check" aria-hidden="true"></span>
          <span>
            <strong>${item.title}</strong>
            <small>${item.text}</small>
          </span>
          ${item.badge ? `<em>${item.badge}</em>` : ""}
        </label>`
      )
      .join("");
  }

  function productIcon(type) {
    const icons = {
      tv: "▰",
      fridge: "▥",
      washer: "◉",
      vacuum: "⌁",
      kimchi: "▤",
      aircon: "❄",
      dishwasher: "▣",
      induction: "◎",
      water: "◌",
      styler: "▯",
      oven: "▭",
      purifier: "◍",
      lifestyle: "▱",
    };
    return icons[type] || "P";
  }

  function productCard(product) {
    return `
      <label class="wizard-product-card" data-product-row="${product.value}">
        <input type="checkbox" name="wizardProductProxy" value="${product.value}" />
        <span class="wizard-product-check" aria-hidden="true"></span>
        <span class="wizard-product-icon">${productIcon(product.icon)}</span>
        <span class="wizard-product-main">
          <strong>${product.title}</strong>
          <small data-product-summary="${product.value}">선택 후 다음 단계에서 옵션을 고릅니다.</small>
        </span>
      </label>`;
  }

  function pillList(items, name, mode = "single") {
    const type = mode === "multi" ? "checkbox" : "radio";
    return items
      .map(
        (item) => `
        <label class="ai-pill">
          <input type="${type}" name="${name}" value="${item}" ${type === "radio" ? "required" : ""} />
          <span>${item}</span>
        </label>`
      )
      .join("");
  }

  function makeFieldRow(...nodes) {
    const row = document.createElement("div");
    row.className = "form-row";
    nodes.forEach((node) => row.appendChild(node));
    return row;
  }

  function closestLabel(field) {
    return field.closest("label");
  }

  function isWithoutQuote() {
    return (fields.quoteType.value || "") === "without_quote";
  }

  function isSamsungBrand() {
    return /삼성|samsung/i.test(fields.brand.value || "");
  }

  function shouldUseAiRecommendation() {
    return isWithoutQuote() && !isSamsungBrand();
  }

  async function fetchNaverLowestPrice(modelName) {
    const query = String(modelName || "").trim();
    if (!query) return 0;

    try {
      const response = await fetch(`/api/naver-shopping-lowest?query=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!payload?.ok || payload.confidence !== "exact-model-filtered") return 0;
      return Number(payload.lowestPrice || 0);
    } catch (error) {
      return 0;
    }
  }

  function applyAutoLowestPrice(groups) {
    const totalLowestPrice = groups
      .flatMap((group) => group.models || [])
      .reduce((sum, model) => sum + Number(model.naverLowestPrice || 0), 0);

    setNativeValue(fields.price, totalLowestPrice > 0 ? String(Math.ceil(totalLowestPrice / 10000)) : "0");
  }

  function selectedProducts() {
    return Array.from(wizard.querySelectorAll('[name="wizardProductProxy"]:checked')).map((input) => input.value);
  }

  function selectedValues(name) {
    return Array.from(wizard.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
  }

  function selectedOptionText(product) {
    const groups = optionSchema[product] || [];
    const state = optionState[product] || {};
    const parts = [];

    groups.forEach((group) => {
      const value = state[group.key];
      if (Array.isArray(value) && value.length) parts.push(value.join(", "));
      if (!Array.isArray(value) && value) parts.push(value);
    });

    return parts.join(" · ");
  }

  function loadModelCatalog() {
    if (!modelCatalogPromise) {
      modelCatalogPromise = fetch(PRODUCT_MODEL_CATALOG_URL, { cache: "force-cache" })
        .then((response) => (response.ok ? response.json() : {}))
        .catch(() => ({}));
    }
    return modelCatalogPromise;
  }

  function filterModelsByOptions(product, models) {
    const source = Array.isArray(models) ? models : [];
    const state = optionState[product] || {};

    if (product === "TV") {
      const sizeText = String(state.size || "");
      const targetSize = Number(sizeText.match(/\d+/)?.[0] || 0);
      if (!targetSize) return source;
      return source.filter((model) => {
        const modelSize = Number(String(model.modelName || "").match(/(^|[^0-9])([4-9][0-9])/)?.[2] || 0);
        if (!modelSize) return true;
        return sizeText.includes("↑") ? modelSize >= targetSize : Math.abs(modelSize - targetSize) <= 3;
      });
    }

    if (product === "냉장고") {
      const option = selectedOptionText(product);
      if (option.includes("빌트인")) return source.filter((model) => /오브제|빌트|키친|핏/i.test(`${model.productGroup} ${model.modelName}`));
      if (option.includes("프리스탠딩")) return source.filter((model) => !/김치|정수기/i.test(model.productGroup || ""));
    }

    if (product === "세탁기/건조기") {
      const option = selectedOptionText(product);
      if (option.includes("일체형")) return source.filter((model) => /워시|타워|원바디|일체/i.test(`${model.productGroup} ${model.modelName}`));
      if (option.includes("복합형")) return source.filter((model) => /콤보|세탁건조/i.test(`${model.productGroup} ${model.modelName}`));
    }

    if (product === "청소기") {
      const option = selectedOptionText(product);
      if (option.includes("로봇")) return source.filter((model) => /로봇/i.test(model.productGroup || ""));
      if (option.includes("무선")) return source.filter((model) => /청소기/i.test(model.productGroup || "") && !/로봇/i.test(model.productGroup || ""));
    }

    if (product === "김치냉장고") return source.filter((model) => /김치/i.test(model.productGroup || ""));
    if (product === "인덕션/전기레인지") return source.filter((model) => /인덕션|전기레인지/i.test(model.productGroup || ""));
    if (product === "오븐/전자레인지") return source.filter((model) => /오븐|전자레인지/i.test(model.productGroup || ""));
    if (product === "에어컨") {
      const option = selectedOptionText(product);
      if (option.includes("천장형")) return source.filter((model) => /천장|시스템/i.test(`${model.productGroup} ${model.modelName}`));
      if (option.includes("2IN1")) return source.filter((model) => /2in1|2IN1|투인원|멀티/i.test(`${model.productGroup} ${model.modelName}`));
    }

    return source;
  }

  async function buildAiModelRecommendations() {
    if (!shouldUseAiRecommendation()) return [];
    const catalog = await loadModelCatalog();

    const groups = selectedProducts().map((product) => {
      const productModels = catalog?.[product]?.models || [];
      const filteredModels = filterModelsByOptions(product, productModels);
      const candidates = filteredModels
        .slice()
        .sort((a, b) => Number(a.normalPrice || 0) - Number(b.normalPrice || 0))
        .slice(0, 3)
        .map((model) => ({ modelName: model.modelName }))
        .filter(Boolean);

      return {
        product,
        optionText: selectedOptionText(product) || "상세 옵션 미입력",
        models: candidates,
      };
    });

    for (const group of groups) {
      for (const model of group.models) {
        model.naverLowestPrice = await fetchNaverLowestPrice(model.modelName);
      }
    }

    return groups;
  }

  function recommendationsToText(groups) {
    if (!groups.length) return "";
    const rows = [AI_QUOTE_NOTICE];
    groups.forEach((group) => {
      rows.push(`[${group.product}] ${group.optionText}`);
      if (!group.models.length) {
        rows.push("- 추천 모델: 판매자 확인 필요");
        return;
      }
      group.models.forEach((model) => rows.push(`- ${model.modelName || model}`));
    });
    return rows.join("\n");
  }

  function hasRequiredOptions(product) {
    const groups = optionSchema[product] || [];
    const state = optionState[product] || {};
    return groups.every((group) => {
      if (group.optional) return true;
      const value = state[group.key];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }

  function syncProductSummaries() {
    products.forEach((product) => {
      const row = wizard.querySelector(`[data-product-row="${product.value}"]`);
      const summary = wizard.querySelector(`[data-product-summary="${product.value}"]`);
      const selected = selectedProducts().includes(product.value);
      const optionText = selectedOptionText(product.value);

      row?.classList.toggle("is-selected", selected);
      if (!summary) return;

      if (!selected) {
        summary.textContent = "선택 후 다음 단계에서 옵션을 고릅니다.";
        summary.classList.remove("is-complete");
        return;
      }

      summary.textContent = optionText || "선택됨 · 옵션 미선택";
      summary.classList.toggle("is-complete", Boolean(optionText));
    });
  }

  function syncItemsField() {
    if (!isWithoutQuote()) {
      fields.items.value = "견적서 첨부";
      return;
    }

    const rows = selectedProducts().map((product) => {
      const optionText = selectedOptionText(product) || "상세 옵션 미입력";
      return `[${product}] ${optionText}`;
    });

    fields.items.value = ["견적서 없음 · 선택 품목", "", ...rows].join("\n").trim();
    syncProductSummaries();
  }

  function syncAiFields() {
    if (!shouldUseAiRecommendation()) {
      fields.aiSituation.value = "";
      fields.familyComposition.value = "";
      fields.budgetStatus.value = "";
      fields.budgetRange.value = "";
      fields.purchasePriority.value = "";
      fields.aiRequestSummary.value = "";
      fields.aiModelRecommendations.value = "";
      if (isWithoutQuote()) setNativeValue(fields.price, "0");
      return;
    }

    const situation = wizard.querySelector('[name="aiSituationProxy"]:checked')?.value || "";
    const family = selectedValues("aiFamilyProxy");
    const budgetStatus = wizard.querySelector('[name="aiBudgetStatusProxy"]:checked')?.value || "";
    const budgetRange = wizard.querySelector('[name="aiBudgetRangeProxy"]')?.value.trim() || "";
    const priorities = selectedValues("aiPriorityProxy");
    const note = wizard.querySelector('[name="aiSituationNote"]')?.value.trim() || "";
    const budgetLabel = budgetStatus === "예산 확정" ? `정해진 예산 ${budgetRange || "미입력"}` : "예산 미정";

    fields.aiSituation.value = situation;
    fields.familyComposition.value = family.join(", ");
    fields.budgetStatus.value = budgetStatus;
    fields.budgetRange.value = budgetRange;
    fields.purchasePriority.value = priorities.join(", ");

    fields.aiRequestSummary.value = [
      "[AI 상담 요청]",
      `고객 상황: ${situation || "미입력"}`,
      `가족 구성: ${family.join(", ") || "미입력"}`,
      `예산: ${budgetLabel}`,
      `우선순위: ${priorities.join(", ") || "미입력"}`,
      note ? `생활/설치 메모: ${note}` : "",
      "AI 모델 추천 범위: LG전자 제품 기준",
      "요청 방식: AI가 추천한 모델명을 기준으로 판매자가 실제 판매 가능 여부와 최종 견적 조건을 확인합니다.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function reportFirstInvalid(fieldsToCheck) {
    for (const field of fieldsToCheck) {
      if (!field) continue;
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function selectedOptionCard(product) {
    const productData = products.find((item) => item.value === product);
    const optionText = selectedOptionText(product);
    return `
      <div class="wizard-product-card selected-option-card" data-selected-option-row="${product}">
        <div class="wizard-product-main">
          <strong>${productData?.title || product}</strong>
          <small class="${optionText ? "is-complete" : ""}">${optionText || "옵션 미선택"}</small>
        </div>
        <button type="button" class="secondary-btn option-select-btn" data-product-option="${product}">옵션 선택</button>
      </div>`;
  }

  function renderSelectedOptions() {
    const list = stepSelectedOptions.querySelector(".selected-option-list");
    const selected = selectedProducts();
    list.innerHTML = selected.length
      ? selected.map((product) => selectedOptionCard(product)).join("")
      : `<div class="empty-state"><strong>선택한 품목이 없습니다.</strong><p>이전 단계에서 품목을 선택해주세요.</p></div>`;
  }

  function storeOptionSelections() {
    if (!activeOptionProduct) return;
    const groups = optionSchema[activeOptionProduct] || [];
    optionState[activeOptionProduct] = optionState[activeOptionProduct] || {};

    groups.forEach((group) => {
      const checked = Array.from(optionContent.querySelectorAll(`[name="option-${group.key}"]:checked`)).map((input) => input.value);
      optionState[activeOptionProduct][group.key] = group.mode === "multi" ? checked : checked[0] || "";
    });
  }

  function optionGroupMarkup(product, group) {
    const value = optionState[product]?.[group.key];
    return `
      <section class="option-group">
        <h4>${group.title}${group.optional ? " <span>선택</span>" : ""}</h4>
        <div class="option-choice-list">
          ${group.options
            .map((option) => {
              const checked = Array.isArray(value) ? value.includes(option) : value === option;
              return `
                <label class="option-choice">
                  <input type="${group.mode === "multi" ? "checkbox" : "radio"}" name="option-${group.key}" value="${option}" ${checked ? "checked" : ""} />
                  <span>${option}</span>
                </label>`;
            })
            .join("")}
        </div>
      </section>`;
  }

  function openOptionModal(product) {
    activeOptionProduct = product;
    const productData = products.find((item) => item.value === product);
    const groups = optionSchema[product] || [];

    if (!groups.length) {
      alert("선택 가능한 옵션을 불러오지 못했습니다. 다시 선택해주세요.");
      return;
    }

    optionTitle.textContent = productData?.title || product;
    optionContent.innerHTML = groups.map((group) => optionGroupMarkup(product, group)).join("");
    optionModal.hidden = false;
  }

  function closeOptionModal() {
    activeOptionProduct = "";
    optionModal.hidden = true;
  }

  async function renderAiQuoteCard() {
    const renderId = ++latestRecommendationRenderId;
    syncAiFields();
    syncItemsField();

    if (!shouldUseAiRecommendation() || !selectedProducts().length || !aiQuoteCard || !aiQuoteList) {
      fields.aiModelRecommendations.value = "";
      if (aiQuoteCard) aiQuoteCard.hidden = true;
      return;
    }

    aiQuoteCard.hidden = false;
    aiQuoteList.innerHTML = `<p class="ai-recommendation-loading">선택한 품목 기준으로 LG전자 추천 모델을 정리하고 있습니다.</p>`;

    const groups = await buildAiModelRecommendations();
    if (renderId !== latestRecommendationRenderId) return;

    fields.aiModelRecommendations.value = recommendationsToText(groups);
    applyAutoLowestPrice(groups);
    aiQuoteList.innerHTML = groups
      .map((group) => {
        const modelItems = group.models.length
          ? group.models.map((model) => `<li>${model.modelName || model}</li>`).join("")
          : `<li>판매자 확인 필요</li>`;
        return `
          <section class="ai-quote-group">
            <div>
              <strong>${group.product}</strong>
              <span>${group.optionText}</span>
            </div>
            <ul>${modelItems}</ul>
          </section>`;
      })
      .join("");
  }

  const nativeFields = [
    fields.quoteType,
    fields.items,
    fields.aiSituation,
    fields.familyComposition,
    fields.budgetStatus,
    fields.budgetRange,
    fields.purchasePriority,
    fields.aiRequestSummary,
    fields.aiModelRecommendations,
    fields.price,
    fields.purpose,
    fields.brand,
  ];
  const hiddenNativeFields = nativeFields.map((field) => wrapHidden(field));

  const optionModal = document.createElement("div");
  optionModal.className = "option-sheet-modal";
  optionModal.hidden = true;
  optionModal.innerHTML = `
    <div class="option-sheet-panel" role="dialog" aria-modal="true">
      <button type="button" class="modal-close option-close" aria-label="닫기">×</button>
      <div class="option-sheet-handle"></div>
      <h3></h3>
      <div class="option-sheet-content"></div>
      <button type="button" class="primary-btn full option-confirm">확인</button>
    </div>
  `;
  document.body.appendChild(optionModal);

  const optionTitle = optionModal.querySelector("h3");
  const optionContent = optionModal.querySelector(".option-sheet-content");
  const optionCloseButton = optionModal.querySelector(".option-close");
  const optionConfirmButton = optionModal.querySelector(".option-confirm");

  const wizard = document.createElement("div");
  wizard.className = "quote-wizard";
  wizard.innerHTML = `
    <div class="wizard-topline">
      <button class="wizard-back" type="button" hidden>← 이전</button>
      <div class="wizard-progress" aria-label="견적 등록 단계"></div>
    </div>
  `;
  hiddenNativeFields.forEach((holder) => wizard.appendChild(holder));

  const stepQuoteType = document.createElement("section");
  stepQuoteType.className = "wizard-step";
  stepQuoteType.dataset.step = "quoteType";
  stepQuoteType.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 1</p>
      <h2>견적서가 있는지 먼저 선택해주세요.</h2>
      <p>견적서 유무에 따라 필요한 입력 단계가 달라집니다.</p>
    </div>
    <div class="wizard-choice-grid wizard-choice-grid-two">${cardList(quoteTypes, "wizardQuoteTypeProxy")}</div>
  `;

  const stepPersonal = document.createElement("section");
  stepPersonal.className = "wizard-step";
  stepPersonal.dataset.step = "personal";
  stepPersonal.hidden = true;
  stepPersonal.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 2</p>
      <h2>고객님 정보를 입력해주세요.</h2>
      <p>내 견적 확인과 알림 안내에 필요한 최소 정보만 받습니다.</p>
    </div>
  `;
  stepPersonal.append(makeFieldRow(closestLabel(fields.customer), closestLabel(fields.phone)));

  const stepPurpose = document.createElement("section");
  stepPurpose.className = "wizard-step";
  stepPurpose.dataset.step = "purpose";
  stepPurpose.hidden = true;
  stepPurpose.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 3</p>
      <h2>구매 목적을 선택해주세요.</h2>
      <p>목적에 맞춰 비교 조건을 정리합니다.</p>
    </div>
    <div class="wizard-choice-grid">${cardList(purposes, "wizardPurposeProxy")}</div>
  `;

  const stepBrand = document.createElement("section");
  stepBrand.className = "wizard-step";
  stepBrand.dataset.step = "brand";
  stepBrand.hidden = true;
  stepBrand.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 4</p>
      <h2>브랜드를 선택해주세요.</h2>
      <p>원하는 제안 방향을 판매자에게 전달합니다.</p>
    </div>
    <div class="wizard-choice-grid wizard-choice-grid-three">${cardList(brands, "wizardBrandProxy")}</div>
  `;

  const stepProducts = document.createElement("section");
  stepProducts.className = "wizard-step";
  stepProducts.dataset.step = "products";
  stepProducts.hidden = true;
  stepProducts.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 5</p>
      <h2>구매 예정 품목을 모두 선택해주세요.</h2>
      <p>견적서가 없는 고객님만 입력합니다. 견적서가 있으면 이 단계는 생략됩니다.</p>
    </div>
    <div class="wizard-product-list">${products.map((product) => productCard(product)).join("")}</div>
  `;

  const stepSelectedOptions = document.createElement("section");
  stepSelectedOptions.className = "wizard-step";
  stepSelectedOptions.dataset.step = "options";
  stepSelectedOptions.hidden = true;
  stepSelectedOptions.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 6</p>
      <h2>선택한 품목의 옵션을 골라주세요.</h2>
      <p>선택한 제품군만 표시됩니다.</p>
    </div>
    <div class="wizard-product-list selected-option-list"></div>
  `;

  const stepAiContext = document.createElement("section");
  stepAiContext.className = "wizard-step";
  stepAiContext.dataset.step = "aiContext";
  stepAiContext.hidden = true;
  stepAiContext.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">AI 간이 견적서</p>
      <h2>고객님 상황을 알려주세요.</h2>
      <p>AI 모델 추천은 LG전자 제품 기준으로만 제공됩니다. 금액은 표시하지 않고 모델명만 정리합니다.</p>
    </div>
    <div class="ai-intake-card">
      <section>
        <h3>구매 목적</h3>
        <div class="ai-pill-grid">${pillList(aiSituations, "aiSituationProxy")}</div>
      </section>
      <section>
        <h3>가족 구성</h3>
        <div class="ai-pill-grid">${pillList(familyOptions, "aiFamilyProxy", "multi")}</div>
      </section>
      <section>
        <h3>예산</h3>
        <div class="ai-pill-grid">
          <label class="ai-pill"><input type="radio" name="aiBudgetStatusProxy" value="예산 확정" /><span>정해진 예산이 있어요</span></label>
          <label class="ai-pill"><input type="radio" name="aiBudgetStatusProxy" value="예산 미정" /><span>아직 정하지 않았어요</span></label>
        </div>
        <input class="ai-budget-input" type="text" name="aiBudgetRangeProxy" placeholder="예: 1,000~1,500만원, 2,000만원 이하" />
      </section>
      <section>
        <h3>중요한 기준</h3>
        <div class="ai-pill-grid">${pillList(priorityOptions, "aiPriorityProxy", "multi")}</div>
      </section>
      <label class="ai-note-field">
        생활 패턴이나 설치 환경
        <textarea name="aiSituationNote" rows="3" placeholder="예: 거실 TV를 크게 보고 싶고, 배송은 입주일 이후로 맞추고 싶어요."></textarea>
      </label>
    </div>
    <div class="ai-quote-card" data-ai-quote-card hidden>
      <div class="ai-quote-head">
        <span>AI 추천 간이 견적서</span>
        <small>${AI_QUOTE_NOTICE}</small>
      </div>
      <div class="ai-quote-list" data-ai-quote-list></div>
    </div>
  `;

  const stepQuoteInfo = document.createElement("section");
  stepQuoteInfo.className = "wizard-step";
  stepQuoteInfo.dataset.step = "quoteInfo";
  stepQuoteInfo.hidden = true;
  stepQuoteInfo.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">마지막 단계</p>
      <h2>견적 정보를 등록해주세요.</h2>
      <p>금액은 만원 단위로 입력하고, 설치 예정일과 모델명 또는 요청사항을 남겨주세요.</p>
    </div>
  `;
  stepQuoteInfo.append(uploadBox);
  stepQuoteInfo.append(closestLabel(fields.region));
  stepQuoteInfo.append(closestLabel(fields.installDate));
  stepQuoteInfo.append(closestLabel(fields.memo));

  const navigation = document.createElement("div");
  navigation.className = "wizard-navigation";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "secondary-btn wizard-prev";
  prevButton.textContent = "이전";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "primary-btn wizard-next";
  nextButton.textContent = "다음";

  submitButton.classList.add("wizard-submit");
  submitButton.textContent = "견적 요청 등록";
  navigation.append(prevButton, nextButton, submitButton);

  wizard.append(stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepAiContext, stepQuoteInfo, navigation, message);
  form.replaceChildren(wizard);

  const allSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepAiContext, stepQuoteInfo];
  const compactSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepQuoteInfo];
  const manualWithoutQuoteSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuoteInfo];
  const progress = wizard.querySelector(".wizard-progress");
  const topBackButton = wizard.querySelector(".wizard-back");
  const aiQuoteCard = stepAiContext.querySelector("[data-ai-quote-card]");
  const aiQuoteList = stepAiContext.querySelector("[data-ai-quote-list]");

  function activeSteps() {
    if (!isWithoutQuote()) return compactSteps;
    return shouldUseAiRecommendation() ? allSteps : manualWithoutQuoteSteps;
  }

  function renderProgress(steps) {
    progress.style.setProperty("--wizard-step-count", String(steps.length));
    progress.innerHTML = steps.map((_, index) => `<span class="${index <= currentStepIndex ? "is-active" : ""}"></span>`).join("");
  }

  function updateQuoteInfoMode() {
    const hasQuote = !isWithoutQuote();
    uploadBox.hidden = !hasQuote;
    fields.file.required = hasQuote;
    if (hasQuote) setNativeValue(fields.price, "0");
    if (!hasQuote) fields.file.value = "";

    const uploadStrong = uploadBox.querySelector("strong");
    const uploadSmall = uploadBox.querySelector("small");
    if (uploadStrong) uploadStrong.textContent = "견적서 이미지 선택";
    if (uploadSmall) uploadSmall.textContent = "견적서가 있는 경우 최대 4장까지 등록할 수 있습니다.";
  }

  function renderStep() {
    const steps = activeSteps();
    currentStepIndex = Math.min(currentStepIndex, steps.length - 1);

    renderSelectedOptions();
    syncItemsField();
    syncAiFields();
    updateQuoteInfoMode();

    allSteps.forEach((step) => {
      step.hidden = !steps.includes(step) || step !== steps[currentStepIndex];
    });

    renderProgress(steps);
    prevButton.hidden = currentStepIndex === 0;
    topBackButton.hidden = currentStepIndex === 0;
    nextButton.hidden = currentStepIndex === steps.length - 1;
    submitButton.hidden = currentStepIndex !== steps.length - 1;
    navigation.classList.toggle("is-final", currentStepIndex === steps.length - 1);
    navigation.classList.toggle("has-prev", currentStepIndex > 0);
    message.textContent = "";

    if (steps[currentStepIndex] === stepAiContext) {
      renderAiQuoteCard();
    }
  }

  function validateAiContext() {
    syncAiFields();
    const situationInput = stepAiContext.querySelector('[name="aiSituationProxy"]:checked');
    const budgetInput = stepAiContext.querySelector('[name="aiBudgetStatusProxy"]:checked');
    if (!situationInput) {
      stepAiContext.querySelector('[name="aiSituationProxy"]')?.reportValidity();
      return false;
    }
    if (!selectedValues("aiFamilyProxy").length) {
      stepAiContext.querySelector('[name="aiFamilyProxy"]')?.reportValidity();
      return false;
    }
    if (!budgetInput) {
      stepAiContext.querySelector('[name="aiBudgetStatusProxy"]')?.reportValidity();
      return false;
    }
    if (!selectedValues("aiPriorityProxy").length) {
      stepAiContext.querySelector('[name="aiPriorityProxy"]')?.reportValidity();
      return false;
    }
    return true;
  }

  function validateCurrentStep() {
    const step = activeSteps()[currentStepIndex];

    if (step === stepQuoteType) {
      if (fields.quoteType.value) return true;
      stepQuoteType.querySelector('[name="wizardQuoteTypeProxy"]')?.reportValidity();
      return false;
    }

    if (step === stepPersonal) return reportFirstInvalid([fields.customer, fields.phone]);

    if (step === stepPurpose) {
      if (fields.purpose.value) return true;
      stepPurpose.querySelector('[name="wizardPurposeProxy"]')?.reportValidity();
      return false;
    }

    if (step === stepBrand) {
      if (fields.brand.value) return true;
      stepBrand.querySelector('[name="wizardBrandProxy"]')?.reportValidity();
      return false;
    }

    if (step === stepProducts) {
      if (selectedProducts().length) return true;
      stepProducts.querySelector('[name="wizardProductProxy"]')?.reportValidity();
      return false;
    }

    if (step === stepSelectedOptions) {
      const incomplete = selectedProducts().find((product) => !hasRequiredOptions(product));
      if (!incomplete) return true;
      openOptionModal(incomplete);
      return false;
    }

    if (step === stepAiContext) return validateAiContext();

    if (!isWithoutQuote() && !fields.file.files.length) {
      fields.file.reportValidity();
      alert("견적서가 있는 경우 견적서 이미지를 1장 이상 첨부해주세요.");
      return false;
    }

    syncItemsField();
    syncAiFields();
    if (!fields.price.value) setNativeValue(fields.price, "0");
    return reportFirstInvalid([fields.region, fields.installDate]);
  }

  stepQuoteType.addEventListener("change", (event) => {
    const input = event.target.closest('[name="wizardQuoteTypeProxy"]');
    if (!input) return;
    setNativeValue(fields.quoteType, input.value);
    currentStepIndex = Math.min(currentStepIndex, activeSteps().length - 1);
    renderStep();
  });

  stepPurpose.addEventListener("change", (event) => {
    const input = event.target.closest('[name="wizardPurposeProxy"]');
    if (input) setNativeValue(fields.purpose, input.value);
  });

  stepBrand.addEventListener("change", (event) => {
    const input = event.target.closest('[name="wizardBrandProxy"]');
    if (input) setNativeValue(fields.brand, input.value);
  });

  stepProducts.addEventListener("change", (event) => {
    if (!event.target.closest('[name="wizardProductProxy"]')) return;
    syncItemsField();
    syncProductSummaries();
    renderAiQuoteCard();
  });

  stepSelectedOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-option]");
    if (!button) return;
    openOptionModal(button.dataset.productOption);
  });

  stepAiContext.addEventListener("change", () => {
    syncAiFields();
    renderAiQuoteCard();
  });
  stepAiContext.addEventListener("input", () => {
    syncAiFields();
    renderAiQuoteCard();
  });

  optionContent.addEventListener("change", () => {
    storeOptionSelections();
    syncItemsField();
  });

  optionCloseButton.addEventListener("click", closeOptionModal);
  optionConfirmButton.addEventListener("click", () => {
    storeOptionSelections();
    syncItemsField();
    renderSelectedOptions();
    renderAiQuoteCard();
    closeOptionModal();
  });

  optionModal.addEventListener("click", (event) => {
    if (event.target === optionModal) closeOptionModal();
  });

  form.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" || event.target?.tagName === "TEXTAREA") return;

      const steps = activeSteps();
      if (currentStepIndex < steps.length - 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        nextButton.click();
      }
    },
    true
  );

  nextButton.addEventListener("click", async () => {
    if (!validateCurrentStep()) return;
    if (activeSteps()[currentStepIndex] === stepAiContext) {
      nextButton.disabled = true;
      try {
        await renderAiQuoteCard();
      } finally {
        nextButton.disabled = false;
      }
    }
    currentStepIndex = Math.min(currentStepIndex + 1, activeSteps().length - 1);
    renderStep();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function goPrevious() {
    currentStepIndex = Math.max(currentStepIndex - 1, 0);
    renderStep();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  prevButton.addEventListener("click", goPrevious);
  topBackButton.addEventListener("click", goPrevious);

  form.addEventListener(
    "submit",
    (event) => {
      const steps = activeSteps();

      if (currentStepIndex < steps.length - 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        nextButton.click();
        return;
      }

      if (!validateCurrentStep()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      syncItemsField();
      syncAiFields();
    },
    { capture: true }
  );

  fields.customer.placeholder = "예: 홍길동";
  fields.memo.placeholder = "모델명을 입력해주세요.";
  fields.price.required = false;
  setNativeValue(fields.price, "0");
  fields.file.required = false;
  renderStep();
})();
