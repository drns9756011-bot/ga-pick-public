(function () {
  const form = document.querySelector("#requestForm");
  if (!form || form.dataset.wizardReady === "true") return;

  const uploadBox = form.querySelector(".upload-box");
  const quoteTypeInput = form.querySelector('[name="quoteType"]');
  const customerInput = form.querySelector('[name="customer"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const itemsInput = form.querySelector('[name="items"]');
  const purposeSelect = form.querySelector('[name="purchasePurpose"]');
  const brandSelect = form.querySelector('[name="desiredBrand"]');
  const priceInput = form.querySelector('[name="price"]');
  const regionInput = form.querySelector('[name="region"]');
  const installDateInput = form.querySelector('[name="installDate"]');
  const memoInput = form.querySelector('[name="memo"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector("#requestFormMessage");

  if (
    !uploadBox ||
    !quoteTypeInput ||
    !customerInput ||
    !phoneInput ||
    !itemsInput ||
    !purposeSelect ||
    !brandSelect ||
    !priceInput ||
    !regionInput ||
    !installDateInput ||
    !memoInput ||
    !submitButton
  ) {
    return;
  }

  form.dataset.wizardReady = "true";
  form.noValidate = true;

  const quoteTypeOptions = [
    { value: "with_quote", title: "견적서가 있어요!!", text: "받아둔 견적서 사진을 기준으로 판매자 제안을 비교합니다." },
    {
      value: "without_quote",
      title: "견적서가 없어요!!",
      text: "제품군과 희망 예산으로 제안받습니다. 견적서가 있는 요청보다 제안 조건에 제한이 생길 수 있습니다.",
      badge: "제한 안내",
    },
  ];

  const purposeOptions = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "여러 품목을 한 번에 비교합니다.", badge: "특별혜택" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정에 맞춘 조건을 비교합니다.", badge: "특별혜택" },
    { value: "이사", title: "이사", text: "이사 날짜와 설치 환경에 맞는 조건을 비교합니다." },
    { value: "인테리어", title: "인테리어", text: "공간 완성 일정에 맞춰 필요한 가전을 제안받습니다." },
    { value: "일반", title: "일반구매", text: "필요한 제품의 가격과 혜택을 차분히 비교합니다." },
  ];

  const brandOptions = [
    { value: "LG전자", title: "LG전자", text: "LG전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "삼성전자", title: "삼성전자", text: "삼성전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "비교견적", title: "비교견적", text: "LG와 삼성 조건을 함께 비교하고 싶어요." },
  ];

  const productOptions = [
    { value: "TV", title: "TV", icon: "tv", optionButton: true },
    { value: "냉장고", title: "냉장고", icon: "fridge", optionButton: true },
    { value: "세탁기/건조기", title: "세탁기/건조기", icon: "washer", optionButton: true },
    { value: "청소기", title: "청소기", icon: "vacuum", optionButton: true },
    { value: "김치냉장고", title: "김치냉장고", icon: "kimchi", optionButton: true },
    { value: "에어컨", title: "에어컨", icon: "aircon", optionButton: true },
    { value: "식기세척기", title: "식기세척기", icon: "dishwasher", optionButton: true },
    { value: "인덕션/전기레인지", title: "인덕션/전기레인지", icon: "induction", optionButton: true },
    { value: "오븐/전자레인지", title: "오븐/전자레인지", icon: "oven", optionButton: true },
    { value: "정수기", title: "정수기", icon: "water", optionButton: true },
    { value: "의류관리기", title: "의류관리기", icon: "styler", optionButton: true },
    { value: "공기청정기", title: "공기청정기", icon: "purifier", optionButton: true },
    { value: "라이프스타일 TV", title: "라이프스타일 TV", icon: "lifestyle", optionButton: true },
  ];

  const productOptionSchema = {
    TV: [{ key: "size", title: "인치", mode: "single", options: ["43인치", "55인치", "65인치", "75인치", "85인치", "85인치 ↑"] }],
    "세탁기/건조기": [
      {
        key: "type",
        title: "설치/제품 형태",
        mode: "single",
        options: ["분리형(병렬설치 및 직렬설치, 분리설치 가능)", "복합형(콤보)", "일체형(원바디, 워시타워)"],
      },
    ],
    냉장고: [
      { key: "install", title: "설치형태", mode: "single", options: ["빌트인(키친핏, 핏앤맥스)", "프리스탠딩(용량이 큼)", "모르겠어요"] },
    ],
    청소기: [{ key: "type", title: "종류", mode: "multi", options: ["무선청소기", "로봇청소기", "유선청소기"] }],
    "오븐/전자레인지": [{ key: "type", title: "종류", mode: "multi", options: ["오븐", "전자레인지"] }],
    "인덕션/전기레인지": [
      { key: "install", title: "설치형태", mode: "single", options: ["빌트인 O", "빌트인 X"] },
      { key: "burner", title: "화구수", mode: "single", options: ["2구", "3구", "4구"] },
    ],
    김치냉장고: [
      { key: "type", title: "형태", mode: "single", options: ["뚜껑식", "스탠드"] },
      { key: "door", title: "스탠드 도어수", mode: "single", options: ["4도어", "3도어", "1도어"], dependsOn: { key: "type", value: "스탠드" } },
    ],
    에어컨: [
      { key: "type", title: "종류", mode: "single", options: ["스탠드", "벽걸이", "2IN1", "천장형"] },
      { key: "area", title: "냉방면적", mode: "single", options: ["18평", "24평", "34평", "40평형 이상"], excludeWhen: { key: "type", value: "천장형" } },
      { key: "room", title: "천장형 실수", mode: "single", options: ["3실", "4실", "5실", "6실"], dependsOn: { key: "type", value: "천장형" } },
    ],
    식기세척기: [{ key: "install", title: "설치형태", mode: "single", options: ["빌트인", "카운터탑", "프리스탠딩"] }],
    공기청정기: [{ key: "area", title: "사용면적", mode: "single", options: ["10평 이하", "10평대", "20평대", "30평대 이상"] }],
    정수기: [{ key: "type", title: "종류", mode: "single", options: ["냉온정수기", "냉정수기", "정수전용", "얼음정수기"] }],
    의류관리기: [{ key: "size", title: "용량", mode: "single", options: ["3벌 이하", "5벌", "대용량"] }],
    "라이프스타일 TV": [{ key: "type", title: "종류", mode: "single", options: ["스탠바이미", "이동형 TV", "더 프레임/아트 TV", "포터블 스크린"] }],
  };

  const productOptionState = {};
  let activeOptionProduct = "";

  function resetSelectOptions(select, placeholder, options) {
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    options.forEach((option) => {
      const optionNode = document.createElement("option");
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      select.appendChild(optionNode);
    });
  }

  function closestLabel(element) {
    return element.closest("label");
  }

  function makeRow(...labels) {
    const row = document.createElement("div");
    row.className = "form-row wizard-field-row";
    labels.filter(Boolean).forEach((label) => row.appendChild(label));
    return row;
  }

  function optionCard(option, inputName) {
    return `
      <label class="wizard-option-card">
        <input type="radio" name="${inputName}" value="${option.value}" />
        <span class="wizard-radio"></span>
        <span>
          <strong>${option.title}</strong>
          ${option.text ? `<small>${option.text}</small>` : ""}
        </span>
        ${option.badge ? `<em>${option.badge}</em>` : ""}
      </label>
    `;
  }

  function productCard(option) {
    return `
      <div class="wizard-product-card" data-product-row="${option.value}">
        <label class="wizard-product-main">
          <input type="checkbox" name="wizardProductProxy" value="${option.value}" />
          <span class="wizard-check"></span>
          <span class="product-thumb product-thumb-${option.icon}" aria-hidden="true"></span>
          <span class="product-copy">
            <strong>${option.title}</strong>
            <small data-product-summary="${option.value}">선택 후 다음 단계에서 상세 옵션을 고릅니다.</small>
          </span>
        </label>
      </div>
    `;
  }

  function selectedOptionCard(product) {
    const option = productOptions.find((item) => item.value === product);
    const icon = option?.icon || "tv";
    const optionText = getProductOptionText(product);
    return `
      <div class="wizard-product-card selected-option-card" data-selected-option-row="${product}">
        <div class="wizard-product-main">
          <span class="wizard-check fixed-check"></span>
          <span class="product-thumb product-thumb-${icon}" aria-hidden="true"></span>
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

  function validateFields(fields) {
    for (const field of fields) {
      if (!field) continue;
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function selectedProducts() {
    return Array.from(wizard.querySelectorAll('[name="wizardProductProxy"]:checked')).map((input) => input.value);
  }

  function shouldShowGroup(group, selections) {
    if (group.dependsOn && selections[group.dependsOn.key] !== group.dependsOn.value) return false;
    if (group.excludeWhen && selections[group.excludeWhen.key] === group.excludeWhen.value) return false;
    return true;
  }

  function getProductOptionText(product) {
    const schema = productOptionSchema[product] || [];
    const selections = productOptionState[product] || {};
    const parts = [];
    schema.forEach((group) => {
      if (!shouldShowGroup(group, selections)) return;
      const value = selections[group.key];
      if (Array.isArray(value) && value.length) parts.push(value.join(", "));
      if (!Array.isArray(value) && value) parts.push(value);
    });
    return parts.join(" / ");
  }

  function hasRequiredProductOptions(product) {
    const schema = productOptionSchema[product] || [];
    const selections = productOptionState[product] || {};
    return schema.every((group) => {
      if (!shouldShowGroup(group, selections)) return true;
      const value = selections[group.key];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }

  function syncProductSummaries() {
    productOptions.forEach((product) => {
      const summary = wizard.querySelector(`[data-product-summary="${product.value}"]`);
      const row = Array.from(wizard.querySelectorAll("[data-product-row]")).find((node) => node.dataset.productRow === product.value);
      if (!summary) return;
      const optionText = getProductOptionText(product.value);
      const isSelected = selectedProducts().includes(product.value);
      if (row) row.classList.toggle("is-selected", isSelected);
      summary.textContent = isSelected ? "선택됨" : "선택 후 다음 단계에서 상세 옵션을 고릅니다.";
      summary.classList.toggle("is-complete", isSelected);
    });
  }

  function renderSelectedOptionStep() {
    const products = selectedProducts();
    const list = stepSelectedOptions.querySelector(".selected-option-list");
    if (!list) return;
    list.innerHTML = products.length
      ? products.map((product) => selectedOptionCard(product)).join("")
      : `<div class="empty-state compact-empty"><strong>선택한 제품군이 없습니다.</strong><p>이전 단계에서 구매 예정 품목을 선택해주세요.</p></div>`;
  }

  function syncItemsField() {
    if (quoteTypeInput.value === "without_quote") {
      itemsInput.value = selectedProducts()
        .map((product) => {
          const optionText = getProductOptionText(product);
          return optionText ? `${product} (${optionText})` : product;
        })
        .join(", ");
      syncProductSummaries();
      return;
    }
    itemsInput.value = "견적서 첨부";
  }

  function makeOptionModal() {
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

  const optionModal = makeOptionModal();
  const optionTitle = optionModal.querySelector("#productOptionTitle");
  const optionContent = optionModal.querySelector(".product-option-content");
  const optionClose = optionModal.querySelector(".product-option-close");
  const optionConfirm = optionModal.querySelector(".product-option-confirm");

  function optionInputMarkup(product, group, option) {
    const state = productOptionState[product] || {};
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
    const schema = productOptionSchema[product] || [];
    const state = productOptionState[product] || {};
    optionTitle.textContent = product;
    optionContent.innerHTML = schema
      .filter((group) => shouldShowGroup(group, state))
      .map((group) => {
        return `
          <section class="product-option-group" data-option-group="${group.key}" data-option-mode="${group.mode}">
            <h4>${group.title}</h4>
            ${group.options.map((option) => optionInputMarkup(product, group, option)).join("")}
          </section>
        `;
      })
      .join("");
  }

  function openOptionModal(product) {
    activeOptionProduct = product;
    if (!productOptionState[product]) productOptionState[product] = {};
    renderOptionModal(product);
    optionModal.hidden = false;
  }

  function closeOptionModal() {
    optionModal.hidden = true;
    activeOptionProduct = "";
  }

  function storeModalSelections() {
    if (!activeOptionProduct) return;
    const state = productOptionState[activeOptionProduct] || {};
    optionContent.querySelectorAll(".product-option-group").forEach((groupNode) => {
      const key = groupNode.dataset.optionGroup;
      const mode = groupNode.dataset.optionMode;
      const checked = Array.from(groupNode.querySelectorAll("input:checked")).map((input) => input.value);
      state[key] = mode === "multi" ? checked : checked[0] || "";
    });
    productOptionState[activeOptionProduct] = state;
    renderOptionModal(activeOptionProduct);
  }

  resetSelectOptions(purposeSelect, "구매사유 선택", purposeOptions.map((option) => ({
    value: option.value,
    label: option.title,
  })));
  resetSelectOptions(brandSelect, "브랜드 선택", brandOptions.map((option) => ({
    value: option.value,
    label: option.title,
  })));

  const customerLabel = closestLabel(customerInput);
  const phoneLabel = closestLabel(phoneInput);
  const purposeLabel = closestLabel(purposeSelect);
  const priceLabel = closestLabel(priceInput);
  const regionLabel = closestLabel(regionInput);
  const installDateLabel = closestLabel(installDateInput);
  const memoLabel = closestLabel(memoInput);

  const quoteTypeHolder = document.createElement("label");
  quoteTypeHolder.className = "wizard-hidden-native";
  quoteTypeHolder.appendChild(quoteTypeInput);

  const itemsHolder = document.createElement("label");
  itemsHolder.className = "wizard-hidden-native";
  itemsHolder.appendChild(itemsInput);

  const brandLabel = document.createElement("label");
  brandLabel.className = "wizard-hidden-native";
  brandLabel.appendChild(brandSelect);

  purposeLabel.classList.add("wizard-hidden-native");

  const wizard = document.createElement("div");
  wizard.className = "customer-wizard";
  wizard.innerHTML = `
    <button class="wizard-back" type="button" data-wizard-prev aria-label="이전 단계">←</button>
    <div class="wizard-progress" aria-label="견적 등록 단계"></div>
  `;

  const stepQuoteType = document.createElement("section");
  stepQuoteType.className = "wizard-step";
  stepQuoteType.dataset.step = "quote-type";
  stepQuoteType.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 1</p>
      <h2>견적서가 있으신가요?</h2>
      <p>견적서 보유 여부에 따라 입력 단계가 달라집니다.</p>
    </div>
    <div class="wizard-option-grid quote-type-grid">
      ${quoteTypeOptions.map((option) => optionCard(option, "wizardQuoteTypeProxy")).join("")}
    </div>
  `;
  stepQuoteType.append(quoteTypeHolder, itemsHolder);

  const stepPersonal = document.createElement("section");
  stepPersonal.className = "wizard-step";
  stepPersonal.dataset.step = "personal";
  stepPersonal.hidden = true;
  stepPersonal.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 2</p>
      <h2>인적사항을 입력해주세요.</h2>
      <p>견적 확인에 사용할 성함과 연락처입니다.</p>
    </div>
  `;
  stepPersonal.appendChild(makeRow(customerLabel, phoneLabel));

  const stepPurpose = document.createElement("section");
  stepPurpose.className = "wizard-step";
  stepPurpose.dataset.step = "purpose";
  stepPurpose.hidden = true;
  stepPurpose.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 3</p>
      <h2>구매사유를 선택해주세요.</h2>
      <p>구매 목적에 따라 비교해야 할 혜택과 설치 조건이 달라질 수 있습니다.</p>
    </div>
    <div class="wizard-option-grid">
      ${purposeOptions.map((option) => optionCard(option, "wizardPurposeProxy")).join("")}
    </div>
  `;
  stepPurpose.appendChild(purposeLabel);

  const stepBrand = document.createElement("section");
  stepBrand.className = "wizard-step";
  stepBrand.dataset.step = "brand";
  stepBrand.hidden = true;
  stepBrand.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 4</p>
      <h2>브랜드를 선택해주세요.</h2>
      <p>LG전자, 삼성전자, 비교견적 중 견적을 받을 방향을 선택합니다.</p>
    </div>
    <div class="wizard-option-grid brand-grid">
      ${brandOptions.map((option) => optionCard(option, "wizardBrandProxy")).join("")}
    </div>
  `;
  stepBrand.appendChild(brandLabel);

  const stepProducts = document.createElement("section");
  stepProducts.className = "wizard-step";
  stepProducts.dataset.step = "products";
  stepProducts.hidden = true;
  stepProducts.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 5</p>
      <h2>구매 예정 품목을 모두 선택해주세요.</h2>
      <p>필요한 제품군만 먼저 선택해주세요. 상세 옵션은 다음 단계에서 선택합니다.</p>
    </div>
    <div class="wizard-product-list">
      ${productOptions.map((option) => productCard(option)).join("")}
    </div>
  `;

  const stepSelectedOptions = document.createElement("section");
  stepSelectedOptions.className = "wizard-step";
  stepSelectedOptions.dataset.step = "selected-options";
  stepSelectedOptions.hidden = true;
  stepSelectedOptions.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 6</p>
      <h2>선택한 제품의 옵션을 골라주세요.</h2>
      <p>선택한 제품군만 표시됩니다. 판매자가 정확히 제안할 수 있도록 상세 조건을 남겨주세요.</p>
    </div>
    <div class="wizard-product-list selected-option-list"></div>
  `;

  const stepQuote = document.createElement("section");
  stepQuote.className = "wizard-step";
  stepQuote.dataset.step = "quote";
  stepQuote.hidden = true;
  stepQuote.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 7</p>
      <h2>견적 정보를 등록해주세요.</h2>
      <p>금액은 만원 단위로 입력하고, 설치 예정일과 모델명을 함께 남겨주세요.</p>
    </div>
  `;
  stepQuote.appendChild(uploadBox);
  stepQuote.appendChild(makeRow(priceLabel, regionLabel));
  stepQuote.appendChild(installDateLabel);
  stepQuote.appendChild(memoLabel);

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
  navigation.append(prevButton, nextButton, submitButton);

  wizard.append(stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuote, navigation, message);
  form.replaceChildren(wizard);

  const allSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuote];
  const topBackButton = wizard.querySelector("[data-wizard-prev]");
  const progress = wizard.querySelector(".wizard-progress");
  let currentStep = 0;

  function activeSteps() {
    return quoteTypeInput.value === "without_quote"
      ? allSteps
      : [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepQuote];
  }

  function setChoice(input, value) {
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  stepQuoteType.querySelectorAll('[name="wizardQuoteTypeProxy"]').forEach((input) => {
    input.addEventListener("change", () => {
      setChoice(quoteTypeInput, input.value);
      syncItemsField();
      renderStep();
    });
  });

  stepPurpose.querySelectorAll('[name="wizardPurposeProxy"]').forEach((input) => {
    input.addEventListener("change", () => setChoice(purposeSelect, input.value));
  });

  stepBrand.querySelectorAll('[name="wizardBrandProxy"]').forEach((input) => {
    input.addEventListener("change", () => setChoice(brandSelect, input.value));
  });

  stepProducts.addEventListener("change", (event) => {
    const input = event.target.closest('[name="wizardProductProxy"]');
    if (!input) return;
    syncItemsField();
  });

  stepSelectedOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-option]");
    if (!button) return;
    const product = button.dataset.productOption;
    openOptionModal(product);
    syncItemsField();
  });

  optionContent.addEventListener("change", storeModalSelections);
  optionClose.addEventListener("click", closeOptionModal);
  optionConfirm.addEventListener("click", () => {
    storeModalSelections();
    syncItemsField();
    renderSelectedOptionStep();
    closeOptionModal();
  });
  optionModal.addEventListener("click", (event) => {
    if (event.target === optionModal) closeOptionModal();
  });

  function validateStep() {
    const step = activeSteps()[currentStep];
    if (step === stepQuoteType) {
      if (quoteTypeInput.value) return true;
      stepQuoteType.querySelector('[name="wizardQuoteTypeProxy"]')?.reportValidity();
      return false;
    }
    if (step === stepPersonal) return validateFields([customerInput, phoneInput]);
    if (step === stepPurpose) {
      if (purposeSelect.value) return true;
      stepPurpose.querySelector('[name="wizardPurposeProxy"]')?.reportValidity();
      return false;
    }
    if (step === stepBrand) {
      if (brandSelect.value) return true;
      stepBrand.querySelector('[name="wizardBrandProxy"]')?.reportValidity();
      return false;
    }
    if (step === stepProducts) {
      syncItemsField();
      const products = selectedProducts();
      if (!products.length) {
        stepProducts.querySelector('[name="wizardProductProxy"]')?.reportValidity();
        return false;
      }
      return true;
    }
    if (step === stepSelectedOptions) {
      syncItemsField();
      const products = selectedProducts();
      const incompleteProduct = products.find((product) => !hasRequiredProductOptions(product));
      if (incompleteProduct) {
        openOptionModal(incompleteProduct);
        return false;
      }
      return true;
    }
    if (quoteTypeInput.value === "with_quote" && !document.querySelector("#quoteImage")?.files?.length) {
      document.querySelector("#quoteImage")?.reportValidity();
      alert("견적서가 있는 경우 견적서 이미지를 1장 이상 첨부해주세요.");
      return false;
    }
    syncItemsField();
    return validateFields([priceInput, regionInput, installDateInput]);
  }

  function updateQuoteStepMode() {
    const hasQuote = quoteTypeInput.value !== "without_quote";
    uploadBox.hidden = !hasQuote;
    const quoteImage = document.querySelector("#quoteImage");
    if (quoteImage) quoteImage.required = hasQuote;
    if (!hasQuote && quoteImage) quoteImage.value = "";
    const priceLabelText = Array.from(priceLabel.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (priceLabelText) priceLabelText.textContent = hasQuote ? "기존 견적 금액(만원)" : "희망 예산(만원)";
  }

  function renderProgress(steps) {
    progress.style.setProperty("--wizard-step-count", String(steps.length));
    progress.innerHTML = steps.map((_, index) => `<span class="${index <= currentStep ? "is-active" : ""}"></span>`).join("");
  }

  function renderStep() {
    const steps = activeSteps();
    if (currentStep >= steps.length) currentStep = steps.length - 1;
    updateQuoteStepMode();
    renderSelectedOptionStep();
    allSteps.forEach((step) => {
      step.hidden = !steps.includes(step) || step !== steps[currentStep];
    });
    renderProgress(steps);
    prevButton.hidden = currentStep === 0;
    topBackButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    navigation.classList.toggle("is-final", currentStep === steps.length - 1);
  }

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    currentStep = Math.min(currentStep + 1, activeSteps().length - 1);
    renderStep();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const goPrev = () => {
    currentStep = Math.max(currentStep - 1, 0);
    renderStep();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  prevButton.addEventListener("click", goPrev);
  topBackButton.addEventListener("click", goPrev);

  form.addEventListener("submit", (event) => {
    if (!validateStep()) {
      event.preventDefault();
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      Object.keys(productOptionState).forEach((key) => delete productOptionState[key]);
      currentStep = 0;
      syncItemsField();
      renderStep();
    }, 0);
  });

  renderStep();
})();
