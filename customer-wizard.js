(function () {
  const form = document.querySelector("#requestForm");
  if (!form || form.dataset.wizardReady === "true") return;

  const uploadBox = form.querySelector(".upload-box");
  const customerInput = form.querySelector('[name="customer"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const itemsInput = form.querySelector('[name="items"]');
  const purposeSelect = form.querySelector('[name="purchasePurpose"]');
  const brandSelect = form.querySelector('[name="desiredBrand"]');
  const priceInput = form.querySelector('[name="price"]');
  const regionInput = form.querySelector('[name="region"]');
  const memoInput = form.querySelector('[name="memo"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector("#requestFormMessage");

  if (!uploadBox || !customerInput || !phoneInput || !itemsInput || !purposeSelect || !brandSelect || !priceInput || !regionInput || !submitButton) {
    return;
  }

  form.dataset.wizardReady = "true";
  form.noValidate = true;

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
    { value: "비교 견적", title: "비교 견적", text: "LG와 삼성 조건을 함께 비교하고 싶어요." },
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

  function optionCard(option, inputName) {
    return `
      <label class="wizard-option-card">
        <input type="radio" name="${inputName}" value="${option.value}" />
        <span class="wizard-radio"></span>
        <span>
          <strong>${option.title}</strong>
          <small>${option.text}</small>
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

  resetSelectOptions(purposeSelect, "구매사유 선택", purposeOptions.map((option) => ({
    value: option.value,
    label: option.badge ? `${option.title} - ${option.badge}` : option.title,
  })));
  resetSelectOptions(brandSelect, "원하는 브랜드 선택", brandOptions.map((option) => ({
    value: option.value,
    label: option.title,
  })));

  const customerLabel = closestLabel(customerInput);
  const phoneLabel = closestLabel(phoneInput);
  const itemsLabel = closestLabel(itemsInput);
  const purposeLabel = closestLabel(purposeSelect);
  const priceLabel = closestLabel(priceInput);
  const regionLabel = closestLabel(regionInput);
  const memoLabel = closestLabel(memoInput);

  const brandLabel = document.createElement("label");
  brandLabel.className = "wizard-hidden-native";
  brandLabel.appendChild(brandSelect);

  purposeLabel.classList.add("wizard-hidden-native");

  const wizard = document.createElement("div");
  wizard.className = "customer-wizard";
  wizard.innerHTML = `
    <button class="wizard-back" type="button" data-wizard-prev aria-label="이전 단계">←</button>
    <div class="wizard-progress" aria-label="견적 등록 단계">
      <span class="is-active"></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  const stepPersonal = document.createElement("section");
  stepPersonal.className = "wizard-step";
  stepPersonal.dataset.step = "0";
  stepPersonal.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 1</p>
      <h2>인적사항을 입력해주세요.</h2>
      <p>견적 확인에 사용할 성함과 연락처입니다.</p>
    </div>
  `;
  stepPersonal.appendChild(makeRow(customerLabel, phoneLabel));

  const stepPurpose = document.createElement("section");
  stepPurpose.className = "wizard-step";
  stepPurpose.dataset.step = "1";
  stepPurpose.hidden = true;
  stepPurpose.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 2</p>
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
  stepBrand.dataset.step = "2";
  stepBrand.hidden = true;
  stepBrand.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 3</p>
      <h2>원하는 브랜드를 선택해주세요.</h2>
      <p>특정 브랜드만 받을지, 브랜드별 조건을 함께 비교할지 선택합니다.</p>
    </div>
    <div class="wizard-option-grid brand-grid">
      ${brandOptions.map((option) => optionCard(option, "wizardBrandProxy")).join("")}
    </div>
  `;
  stepBrand.appendChild(brandLabel);

  const stepQuote = document.createElement("section");
  stepQuote.className = "wizard-step";
  stepQuote.dataset.step = "3";
  stepQuote.hidden = true;
  stepQuote.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 4</p>
      <h2>견적서와 구매 정보를 등록해주세요.</h2>
      <p>견적서 이미지는 최대 4장까지, 금액은 만원 단위로 입력합니다.</p>
    </div>
  `;
  stepQuote.appendChild(uploadBox);
  stepQuote.appendChild(itemsLabel);
  stepQuote.appendChild(makeRow(priceLabel, regionLabel));
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

  wizard.append(stepPersonal, stepPurpose, stepBrand, stepQuote, navigation, message);
  form.replaceChildren(wizard);

  const steps = [stepPersonal, stepPurpose, stepBrand, stepQuote];
  const progressBars = Array.from(wizard.querySelectorAll(".wizard-progress span"));
  const topBackButton = wizard.querySelector("[data-wizard-prev]");
  let currentStep = 0;

  function setChoice(select, value) {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  stepPurpose.querySelectorAll('[name="wizardPurposeProxy"]').forEach((input) => {
    input.addEventListener("change", () => setChoice(purposeSelect, input.value));
  });

  stepBrand.querySelectorAll('[name="wizardBrandProxy"]').forEach((input) => {
    input.addEventListener("change", () => setChoice(brandSelect, input.value));
  });

  function validateStep() {
    if (currentStep === 0) return validateFields([customerInput, phoneInput]);
    if (currentStep === 1) {
      if (purposeSelect.value) return true;
      stepPurpose.querySelector('[name="wizardPurposeProxy"]')?.reportValidity();
      return false;
    }
    if (currentStep === 2) {
      if (brandSelect.value) return true;
      stepBrand.querySelector('[name="wizardBrandProxy"]')?.reportValidity();
      return false;
    }
    return validateFields([itemsInput, priceInput, regionInput]);
  }

  function renderStep() {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });
    progressBars.forEach((bar, index) => {
      bar.classList.toggle("is-active", index <= currentStep);
    });

    prevButton.hidden = currentStep === 0;
    topBackButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    navigation.classList.toggle("is-final", currentStep === steps.length - 1);
  }

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
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
  }, true);

  renderStep();
})();
