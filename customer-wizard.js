(function () {
  const form = document.querySelector("#requestForm");
  if (!form || form.dataset.wizardReady === "true") return;

  const fields = {
    quoteType: form.querySelector('[name="quoteType"]'),
    items: form.querySelector('[name="items"]'),
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
      text: "받은 견적서 사진을 기준으로 판매자 제안을 비교합니다.",
    },
    {
      value: "without_quote",
      title: "견적서가 없어요",
      text: "품목과 예산으로 먼저 요청합니다. 견적서가 없는 경우 제안 범위에 제한이 생길 수 있습니다.",
      badge: "제한 안내",
    },
  ];

  const purposes = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "여러 품목을 한 번에 비교합니다.", badge: "특별혜택" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정에 맞춘 조건을 비교합니다.", badge: "특별혜택" },
    { value: "이사", title: "이사", text: "이사 일정과 설치 조건에 맞춰 비교합니다." },
    { value: "인테리어", title: "인테리어", text: "공간 완성 일정에 맞춘 제안을 받습니다." },
    { value: "일반", title: "일반", text: "필요한 제품의 가격과 혜택을 비교합니다." },
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
      { key: "door", title: "도어 수", mode: "single", options: ["1도어", "2도어", "4도어", "잘 모르겠어요"], optional: true },
    ],
    "세탁기/건조기": [
      {
        key: "type",
        title: "제품 형태",
        mode: "single",
        options: ["분리형(병렬설치 및 직렬설치, 분리설치 가능)", "복합형(콤보)", "일체형(원바디, 워시타워)"],
      },
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
    의류관리기: [{ key: "size", title: "용량", mode: "single", options: ["3벌", "5벌", "대용량", "잘 모르겠어요"] }],
    "오븐/전자레인지": [{ key: "type", title: "종류", mode: "multi", options: ["오븐", "전자레인지"] }],
    공기청정기: [{ key: "area", title: "사용 면적", mode: "single", options: ["10평 이하", "10평대", "20평대", "30평대 이상"] }],
    제습기: [{ key: "capacity", title: "용량", mode: "single", options: ["10L 이하", "10L대", "20L 이상", "잘 모르겠어요"] }],
    가습기: [{ key: "type", title: "종류", mode: "single", options: ["초음파식", "가열식", "복합식", "대용량", "잘 모르겠어요"] }],
    "라이프스타일 TV": [{ key: "type", title: "종류", mode: "single", options: ["이동형 TV", "스탠바이미류", "포터블 스크린", "잘 모르겠어요"] }],
  };

  const optionState = {};
  let currentStepIndex = 0;
  let activeOptionProduct = "";

  function wrapHidden(field) {
    const holder = document.createElement("span");
    holder.className = "wizard-hidden-native";
    holder.appendChild(field);
    return holder;
  }

  function closestLabel(field) {
    return field.closest("label");
  }

  function makeFieldRow(...nodes) {
    const row = document.createElement("div");
    row.className = "form-row wizard-field-row";
    nodes.filter(Boolean).forEach((node) => row.appendChild(node));
    return row;
  }

  function optionCard(option, inputName) {
    return `
      <label class="wizard-option-card">
        <input type="radio" name="${inputName}" value="${option.value}" required />
        <span class="wizard-radio"></span>
        <span>
          <strong>${option.title}</strong>
          ${option.text ? `<small>${option.text}</small>` : ""}
        </span>
        ${option.badge ? `<em>${option.badge}</em>` : ""}
      </label>
    `;
  }

  function productCard(product) {
    return `
      <div class="wizard-product-card" data-product-row="${product.value}">
        <label class="wizard-product-main">
          <input type="checkbox" name="wizardProductProxy" value="${product.value}" />
          <span class="wizard-check"></span>
          <span class="product-thumb product-thumb-${product.icon}" aria-hidden="true"></span>
          <span class="product-copy">
            <strong>${product.title}</strong>
            <small data-product-summary="${product.value}">선택 후 다음 단계에서 상세 옵션을 고릅니다.</small>
          </span>
        </label>
      </div>
    `;
  }

  function selectedProducts() {
    return Array.from(wizard.querySelectorAll('[name="wizardProductProxy"]:checked')).map((input) => input.value);
  }

  function getSelectedQuoteType() {
    const proxy = stepQuoteType.querySelector('[name="wizardQuoteTypeProxy"]:checked');
    return proxy?.value || fields.quoteType.value || "";
  }

  function isWithoutQuote() {
    return getSelectedQuoteType() === "without_quote";
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
        summary.textContent = "선택 후 다음 단계에서 상세 옵션을 고릅니다.";
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

  function setNativeValue(field, value) {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
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
          <span class="wizard-check fixed-check"></span>
          <span class="product-thumb product-thumb-${productData?.icon || "tv"}" aria-hidden="true"></span>
          <span class="product-copy">
            <strong>${product}</strong>
            <small class="${optionText ? "is-complete" : ""}">${optionText || "상세 옵션을 선택해주세요."}</small>
          </span>
        </div>
        <button class="product-option-btn" type="button" data-product-option="${product}">
          ${optionText ? "옵션 변경" : "옵션 선택"}
        </button>
      </div>
    `;
  }

  function renderSelectedOptions() {
    const list = stepSelectedOptions.querySelector(".selected-option-list");
    const selected = selectedProducts();

    list.innerHTML = selected.length
      ? selected.map((product) => selectedOptionCard(product)).join("")
      : `<div class="empty-state compact-empty"><strong>선택된 품목이 없습니다.</strong><p>이전 단계에서 구매 예정 품목을 선택해주세요.</p></div>`;
  }

  function createProductOptionModal() {
    const modal = document.createElement("div");
    modal.className = "product-option-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="product-option-panel" role="dialog" aria-modal="true" aria-labelledby="productOptionTitle">
        <div class="product-option-handle"></div>
        <div class="product-option-head">
          <h3 id="productOptionTitle">옵션 선택</h3>
          <button type="button" class="product-option-close" aria-label="옵션 닫기">×</button>
        </div>
        <div class="product-option-content"></div>
        <div class="product-option-actions">
          <button type="button" class="primary-btn full product-option-confirm">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  const optionModal = createProductOptionModal();
  const optionTitle = optionModal.querySelector("#productOptionTitle");
  const optionContent = optionModal.querySelector(".product-option-content");
  const optionCloseButton = optionModal.querySelector(".product-option-close");
  const optionConfirmButton = optionModal.querySelector(".product-option-confirm");

  function optionInputMarkup(product, group, option) {
    const state = optionState[product] || {};
    const value = state[group.key];
    const checked = Array.isArray(value) ? value.includes(option) : value === option;
    return `
      <label class="product-option-row">
        <input type="${group.mode === "multi" ? "checkbox" : "radio"}" name="option-${group.key}" value="${option}" ${checked ? "checked" : ""} />
        <span>${option}</span>
        <b>✓</b>
      </label>
    `;
  }

  function renderOptionModal(product) {
    const groups = optionSchema[product] || [];
    optionTitle.textContent = product;
    optionContent.innerHTML = groups
      .map(
        (group) => `
          <section class="product-option-group" data-option-group="${group.key}" data-option-mode="${group.mode}">
            <h4>${group.title}${group.optional ? " · 선택" : ""}</h4>
            ${group.options.map((option) => optionInputMarkup(product, group, option)).join("")}
          </section>
        `
      )
      .join("");
  }

  function openOptionModal(product) {
    activeOptionProduct = product;
    optionState[product] ||= {};
    renderOptionModal(product);
    optionModal.hidden = false;
  }

  function closeOptionModal() {
    optionModal.hidden = true;
    activeOptionProduct = "";
  }

  function storeOptionSelections() {
    if (!activeOptionProduct) return;
    const state = optionState[activeOptionProduct] || {};

    optionContent.querySelectorAll(".product-option-group").forEach((groupNode) => {
      const key = groupNode.dataset.optionGroup;
      const mode = groupNode.dataset.optionMode;
      const values = Array.from(groupNode.querySelectorAll("input:checked")).map((input) => input.value);
      state[key] = mode === "multi" ? values : values[0] || "";
    });

    optionState[activeOptionProduct] = state;
  }

  const wizard = document.createElement("div");
  wizard.className = "customer-wizard";
  wizard.innerHTML = `
    <button class="wizard-back" type="button" aria-label="이전 단계">←</button>
    <div class="wizard-progress" aria-label="견적 등록 단계"></div>
  `;

  const stepQuoteType = document.createElement("section");
  stepQuoteType.className = "wizard-step";
  stepQuoteType.dataset.step = "quoteType";
  stepQuoteType.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 1</p>
      <h2>견적서가 있으신가요?</h2>
      <p>견적서 유무에 따라 필요한 입력 단계만 보여드립니다.</p>
    </div>
    <div class="wizard-option-grid quote-type-grid">
      ${quoteTypes.map((option) => optionCard(option, "wizardQuoteTypeProxy")).join("")}
    </div>
  `;
  stepQuoteType.append(wrapHidden(fields.quoteType), wrapHidden(fields.items));

  const stepPersonal = document.createElement("section");
  stepPersonal.className = "wizard-step";
  stepPersonal.dataset.step = "personal";
  stepPersonal.hidden = true;
  stepPersonal.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 2</p>
      <h2>고객님 정보를 입력해주세요.</h2>
      <p>견적 등록과 내 견적 확인에만 사용하는 필수 정보입니다.</p>
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
      <h2>구매사유를 선택해주세요.</h2>
      <p>구매 상황에 따라 배송, 설치, 혜택 조건을 더 정확히 비교할 수 있습니다.</p>
    </div>
    <div class="wizard-option-grid">
      ${purposes.map((option) => optionCard(option, "wizardPurposeProxy")).join("")}
    </div>
  `;
  stepPurpose.append(wrapHidden(fields.purpose));

  const stepBrand = document.createElement("section");
  stepBrand.className = "wizard-step";
  stepBrand.dataset.step = "brand";
  stepBrand.hidden = true;
  stepBrand.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 4</p>
      <h2>브랜드를 선택해주세요.</h2>
      <p>특정 브랜드만 받을지, 브랜드별 조건을 함께 비교할지 선택합니다.</p>
    </div>
    <div class="wizard-option-grid brand-grid">
      ${brands.map((option) => optionCard(option, "wizardBrandProxy")).join("")}
    </div>
  `;
  stepBrand.append(wrapHidden(fields.brand));

  const stepProducts = document.createElement("section");
  stepProducts.className = "wizard-step";
  stepProducts.dataset.step = "products";
  stepProducts.hidden = true;
  stepProducts.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 5</p>
      <h2>구매 예정 품목을 모두 선택해주세요.</h2>
      <p>견적서가 없는 고객님은 판매자가 이해할 수 있도록 품목을 먼저 선택합니다.</p>
    </div>
    <div class="wizard-product-list">
      ${products.map((product) => productCard(product)).join("")}
    </div>
  `;

  const stepSelectedOptions = document.createElement("section");
  stepSelectedOptions.className = "wizard-step";
  stepSelectedOptions.dataset.step = "options";
  stepSelectedOptions.hidden = true;
  stepSelectedOptions.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 6</p>
      <h2>선택한 품목의 옵션을 골라주세요.</h2>
      <p>선택한 제품군만 표시됩니다. 판매자가 보기 쉬운 견적 요청서로 정리됩니다.</p>
    </div>
    <div class="wizard-product-list selected-option-list"></div>
  `;

  const stepQuoteInfo = document.createElement("section");
  stepQuoteInfo.className = "wizard-step";
  stepQuoteInfo.dataset.step = "quoteInfo";
  stepQuoteInfo.hidden = true;
  stepQuoteInfo.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">마지막 단계</p>
      <h2>견적 정보를 등록해주세요.</h2>
      <p>금액은 만원 단위로 입력하고, 설치 예정일과 모델명 또는 요청사항을 함께 남겨주세요.</p>
    </div>
  `;
  stepQuoteInfo.append(uploadBox);
  stepQuoteInfo.append(makeFieldRow(closestLabel(fields.price), closestLabel(fields.region)));
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

  wizard.append(stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuoteInfo, navigation, message);
  form.replaceChildren(wizard);

  const allSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuoteInfo];
  const compactSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepQuoteInfo];
  const progress = wizard.querySelector(".wizard-progress");
  const topBackButton = wizard.querySelector(".wizard-back");

  function activeSteps() {
    return isWithoutQuote() ? allSteps : compactSteps;
  }

  function renderProgress(steps) {
    progress.style.setProperty("--wizard-step-count", String(steps.length));
    progress.innerHTML = steps.map((_, index) => `<span class="${index <= currentStepIndex ? "is-active" : ""}"></span>`).join("");
  }

  function updateQuoteInfoMode() {
    const hasQuote = !isWithoutQuote();
    uploadBox.hidden = !hasQuote;
    fields.file.required = hasQuote;
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

    if (!isWithoutQuote() && !fields.file.files.length) {
      fields.file.reportValidity();
      alert("견적서가 있는 경우 견적서 이미지를 1장 이상 첨부해주세요.");
      return false;
    }

    syncItemsField();
    return reportFirstInvalid([fields.price, fields.region, fields.installDate]);
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
  });

  stepSelectedOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-option]");
    if (!button) return;
    openOptionModal(button.dataset.productOption);
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
    closeOptionModal();
  });

  optionModal.addEventListener("click", (event) => {
    if (event.target === optionModal) closeOptionModal();
  });

  nextButton.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
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

  form.addEventListener("submit", (event) => {
    if (!validateCurrentStep()) {
      event.preventDefault();
      return;
    }
    syncItemsField();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      Object.keys(optionState).forEach((key) => delete optionState[key]);
      currentStepIndex = 0;
      renderStep();
    }, 0);
  });

  renderStep();
})();
