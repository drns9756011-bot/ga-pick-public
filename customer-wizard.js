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
    { value: "with_quote", title: "견적서가 있어요!!", text: "받아둔 견적서 사진을 기준으로 더 좋은 조건을 비교합니다." },
    {
      value: "without_quote",
      title: "견적서가 없어요!!",
      text: "제품군과 예산을 기준으로 제안받습니다. 견적 조건에 제한이 생길 수 있습니다.",
      badge: "제한 있음",
    },
  ];

  const purposeOptions = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "여러 품목을 한 번에 비교해 큰 혜택을 받기 좋아요.", badge: "특별혜택" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정에 맞춘 배송, 설치 조건을 함께 확인해요.", badge: "특별혜택" },
    { value: "이사", title: "이사", text: "이사 날짜와 설치 환경에 맞는 조건을 비교해요." },
    { value: "인테리어", title: "인테리어", text: "공간 완성 일정에 맞춰 필요한 가전을 제안받아요." },
    { value: "일반", title: "일반구매", text: "필요한 제품의 가격과 혜택을 차분히 비교해요." },
  ];

  const brandOptions = [
    { value: "LG전자", title: "LG전자", text: "LG전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "삼성전자", title: "삼성전자", text: "삼성전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "비교견적", title: "비교견적", text: "LG와 삼성 조건을 함께 비교하고 싶어요." },
  ];

  const productOptions = [
    { value: "TV", title: "TV", icon: "TV" },
    { value: "냉장고", title: "냉장고", icon: "냉" },
    { value: "세탁기/건조기", title: "세탁기/건조기", icon: "세" },
    { value: "청소기", title: "청소기", icon: "청" },
    { value: "김치냉장고", title: "김치냉장고", icon: "김" },
    { value: "에어컨", title: "에어컨", icon: "에" },
    { value: "식기세척기", title: "식기세척기", icon: "식" },
    { value: "인덕션/전기레인지", title: "인덕션/전기레인지", icon: "인" },
    { value: "공기청정기", title: "공기청정기", icon: "공" },
    { value: "정수기", title: "정수기", icon: "정" },
    { value: "의류관리기", title: "의류관리기", icon: "의" },
    { value: "오븐/전자레인지", title: "오븐/전자레인지", icon: "오" },
  ];

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

  function optionCard(option, inputName, type = "radio") {
    return `
      <label class="wizard-option-card${type === "checkbox" ? " product-card" : ""}">
        <input type="${type}" name="${inputName}" value="${option.value}" />
        <span class="${type === "checkbox" ? "wizard-check" : "wizard-radio"}"></span>
        ${option.icon ? `<b class="product-icon">${option.icon}</b>` : ""}
        <span>
          <strong>${option.title}</strong>
          ${option.text ? `<small>${option.text}</small>` : ""}
        </span>
        ${option.badge ? `<em>${option.badge}</em>` : ""}
      </label>
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

  function syncItemsField() {
    const quoteType = quoteTypeInput.value;
    if (quoteType === "without_quote") {
      itemsInput.value = selectedProducts().join(", ");
      return;
    }
    itemsInput.value = "견적서 첨부";
  }

  resetSelectOptions(purposeSelect, "구매사유 선택", purposeOptions.map((option) => ({
    value: option.value,
    label: option.badge ? `${option.title} - ${option.badge}` : option.title,
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
      <p>구매 목적에 따라 받을 수 있는 혜택과 조건이 달라질 수 있습니다.</p>
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
      <p>견적서가 없는 경우 필요한 제품군을 기준으로 판매자가 제안합니다.</p>
    </div>
    <div class="wizard-option-grid product-grid">
      ${productOptions.map((option) => optionCard(option, "wizardProductProxy", "checkbox")).join("")}
    </div>
  `;

  const stepQuote = document.createElement("section");
  stepQuote.className = "wizard-step";
  stepQuote.dataset.step = "quote";
  stepQuote.hidden = true;
  stepQuote.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 6</p>
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

  wizard.append(stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepQuote, navigation, message);
  form.replaceChildren(wizard);

  const allSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepQuote];
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

  stepProducts.querySelectorAll('[name="wizardProductProxy"]').forEach((input) => {
    input.addEventListener("change", syncItemsField);
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
      if (itemsInput.value) return true;
      stepProducts.querySelector('[name="wizardProductProxy"]')?.reportValidity();
      return false;
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
    progress.innerHTML = steps.map((_, index) => `<span class="${index <= currentStep ? "is-active" : ""}"></span>`).join("");
  }

  function renderStep() {
    const steps = activeSteps();
    if (currentStep >= steps.length) currentStep = steps.length - 1;
    updateQuoteStepMode();
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
      currentStep = 0;
      syncItemsField();
      renderStep();
    }, 0);
  });

  renderStep();
})();
