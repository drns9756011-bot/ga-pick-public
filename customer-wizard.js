(() => {
  const form = document.querySelector("#requestForm");
  if (!form) return;

  const field = (name) => form.querySelector(`[name="${name}"]`);
  const fields = {
    quoteType: field("quoteType"),
    items: field("items"),
    aiSituation: field("aiSituation"),
    familyComposition: field("familyComposition"),
    budgetStatus: field("budgetStatus"),
    budgetRange: field("budgetRange"),
    purchasePriority: field("purchasePriority"),
    aiRequestSummary: field("aiRequestSummary"),
    aiModelRecommendations: ensureHiddenField("aiModelRecommendations"),
    image: field("quoteImage"),
    customer: field("customer"),
    phone: field("phone"),
    purpose: field("purchasePurpose"),
    brand: field("desiredBrand"),
    price: field("price"),
    region: field("region"),
    installDate: field("installDate"),
    memo: field("memo"),
  };

  const message = form.querySelector("#requestFormMessage") || document.createElement("p");
  const previewTitle = document.querySelector("#previewTitle");
  const previewMeta = document.querySelector("#previewMeta");
  const imagePreview = document.querySelector("#imagePreview");

  const state = {
    stepIndex: 0,
    selectedProducts: [],
    productOptions: {},
    aiContext: {
      situation: "",
      family: [],
      budgetStatus: "",
      budgetRange: "",
      priorities: [],
      note: "",
    },
    catalog: null,
    recommendationGroups: [],
    recommending: false,
  };

  const quoteTypes = [
    {
      value: "with_quote",
      title: "견적서가 있어요",
      text: "받은 견적서 사진을 올려 판매자 제안가와 혜택을 비교합니다.",
      badge: "정확한 견적 가능",
    },
    {
      value: "without_quote",
      title: "견적서가 없어요",
      text: "품목과 상황을 선택하면 AI가 LG전자 후보 모델로 간이 견적서를 정리합니다.",
      badge: "",
    },
  ];

  const purposeOptions = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "혼수 패키지 조건과 카드 혜택을 함께 비교합니다.", badge: "혜택 비교" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정에 맞춘 배송, 설치 조건을 확인합니다.", badge: "혜택 비교" },
    { value: "이사", title: "이사", text: "이사 일정에 맞춰 필요한 품목을 비교합니다." },
    { value: "인테리어", title: "인테리어", text: "공간과 빌트인 조건을 기준으로 비교합니다." },
    { value: "일반", title: "일반", text: "교체와 단품 구매 조건을 비교합니다." },
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
    { value: "정수기", title: "정수기", icon: "정" },
    { value: "의류관리기", title: "의류관리기", icon: "의" },
    { value: "오븐/전자레인지", title: "오븐/전자레인지", icon: "오" },
    { value: "공기청정기", title: "공기청정기", icon: "공" },
    { value: "제습기", title: "제습기", icon: "제" },
    { value: "가습기", title: "가습기", icon: "가" },
    { value: "라이프스타일 TV", title: "라이프스타일 TV", icon: "라" },
  ];

  const optionSchema = {
    TV: [
      { key: "size", title: "화면 크기", type: "single", values: ["43인치", "55인치", "65인치", "75인치", "85인치", "85인치 ↑"] },
    ],
    냉장고: [
      { key: "type", title: "설치 형태", type: "single", values: ["빌트인(키친핏, 핏앤맥스)", "프리스탠딩(용량이 큼)", "모르겠어요"] },
      { key: "door", title: "도어 수", type: "single", values: ["1도어", "2도어", "4도어", "모르겠어요"] },
    ],
    "세탁기/건조기": [
      { key: "type", title: "설치 형태", type: "single", values: ["분리형(병렬/직렬/분리 설치 가능)", "복합형(콤보)", "일체형(원바디, 워시타워)", "모르겠어요"] },
    ],
    청소기: [
      { key: "type", title: "종류", type: "multi", values: ["무선청소기", "로봇청소기", "유선청소기"] },
    ],
    김치냉장고: [
      { key: "type", title: "형태", type: "single", values: ["뚜껑식", "스탠드", "모르겠어요"] },
      { key: "door", title: "스탠드 도어", type: "single", values: ["4도어", "3도어", "1도어", "모르겠어요"] },
    ],
    에어컨: [
      { key: "type", title: "종류", type: "single", values: ["스탠드", "벽걸이", "2IN1", "천장형", "모르겠어요"] },
      { key: "area", title: "냉방 면적", type: "single", values: ["18평", "24평", "34평", "40평형 이상", "모르겠어요"] },
      { key: "rooms", title: "천장형 실 수", type: "single", values: ["3실", "4실", "5실", "6실", "모르겠어요"] },
    ],
    식기세척기: [
      { key: "install", title: "설치 형태", type: "single", values: ["빌트인", "카운터탑", "프리스탠딩", "모르겠어요"] },
    ],
    "인덕션/전기레인지": [
      { key: "install", title: "설치 형태", type: "single", values: ["빌트인 O", "빌트인 X", "모르겠어요"] },
      { key: "burner", title: "화구 수", type: "single", values: ["2구", "3구", "4구", "모르겠어요"] },
    ],
    정수기: [
      { key: "type", title: "종류", type: "single", values: ["냉온정수기", "얼음정수기", "냉정수기", "직수형", "모르겠어요"] },
    ],
    의류관리기: [
      { key: "size", title: "용량", type: "single", values: ["3벌", "5벌", "대용량", "모르겠어요"] },
    ],
    "오븐/전자레인지": [
      { key: "type", title: "종류", type: "multi", values: ["오븐", "전자레인지"] },
    ],
    공기청정기: [
      { key: "area", title: "사용 면적", type: "single", values: ["10평 이하", "10평대", "20평대", "30평대 이상", "모르겠어요"] },
    ],
    제습기: [
      { key: "capacity", title: "용량", type: "single", values: ["10L 이하", "10L대", "20L 이상", "모르겠어요"] },
    ],
    가습기: [
      { key: "type", title: "종류", type: "single", values: ["초음파식", "가열식", "복합식", "대용량", "모르겠어요"] },
    ],
    "라이프스타일 TV": [
      { key: "type", title: "형태", type: "single", values: ["이동형 TV", "스탠바이미류", "포터블 스크린", "모르겠어요"] },
    ],
  };

  const aiSituations = ["혼수/웨딩", "신축 입주", "이사", "교체", "사업장/B2B"];
  const familyOptions = ["1인", "2인", "3~4인", "5인 이상", "아이 있음", "반려동물 있음"];
  const priorityOptions = ["가격", "설치 일정", "배송", "카드 혜택", "공간 맞춤", "프리미엄"];

  const steps = [
    { key: "quoteType", render: renderQuoteType, validate: validateQuoteType },
    { key: "personal", render: renderPersonal, validate: validatePersonal },
    { key: "purpose", render: renderPurpose, validate: validatePurpose },
    { key: "brand", render: renderBrand, validate: validateBrand },
    { key: "products", render: renderProducts, validate: validateProducts, show: isWithoutQuote },
    { key: "options", render: renderOptions, validate: validateOptions, show: isWithoutQuote },
    { key: "ai", render: renderAiContext, validate: validateAiContext, show: shouldUseAiRecommendation },
    { key: "quoteInfo", render: renderQuoteInfo, validate: validateQuoteInfo },
  ];

  installWizard();

  function installWizard() {
    const wizard = document.createElement("div");
    wizard.className = "customer-wizard quote-wizard";
    form.prepend(wizard);
    form.dataset.wizardReady = "true";
    form._wizardSubmitAllowed = false;

    bindNativeFields();
    hideNativeFields();
    render();
    syncAllFields();
  }

  function ensureHiddenField(name) {
    let input = field(name);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.prepend(input);
    }
    return input;
  }

  function bindNativeFields() {
    fields.phone?.addEventListener("input", () => {
      fields.phone.value = formatPhoneInput(fields.phone.value);
    });

    form.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" || event.target?.tagName === "TEXTAREA") return;
        if (!isFinalVisibleStep()) {
          event.preventDefault();
          move(1);
        }
      },
      true
    );

    form.addEventListener(
      "submit",
      (event) => {
        syncAllFields();
        if (!isFinalVisibleStep()) {
          event.preventDefault();
          move(1);
          return;
        }
        if (!validateCurrentStep()) {
          event.preventDefault();
          return;
        }
        form._wizardSubmitAllowed = true;
      },
      true
    );
  }

  function hideNativeFields() {
    [
      fields.image?.closest(".upload-box"),
      fields.customer?.closest("label"),
      fields.phone?.closest("label"),
      fields.purpose?.closest("label"),
      fields.brand?.closest("label"),
      fields.price?.closest("label"),
      fields.region?.closest("label"),
      fields.installDate?.closest("label"),
      fields.memo?.closest("label"),
    ]
      .filter(Boolean)
      .forEach((element) => {
        element.classList.add("wizard-native-hidden");
      });
  }

  function visibleSteps() {
    return steps.filter((step) => !step.show || step.show());
  }

  function currentStep() {
    const list = visibleSteps();
    state.stepIndex = Math.min(state.stepIndex, list.length - 1);
    return list[state.stepIndex];
  }

  function isFinalVisibleStep() {
    return state.stepIndex === visibleSteps().length - 1;
  }

  function render() {
    const step = currentStep();
    const list = visibleSteps();
    const wizard = form.querySelector(".customer-wizard");
    wizard.innerHTML = `
      <div class="wizard-progress" aria-label="견적 등록 진행 단계">
        ${list.map((_, index) => `<span class="${index <= state.stepIndex ? "is-active" : ""}"></span>`).join("")}
      </div>
      <div class="wizard-step-label">Step ${state.stepIndex + 1}</div>
      <div class="wizard-step" data-step="${step.key}">${step.render()}</div>
      <div class="wizard-actions">
        ${state.stepIndex > 0 ? '<button type="button" class="wizard-back">이전</button>' : ""}
        <button type="${isFinalVisibleStep() ? "submit" : "button"}" class="wizard-next primary-btn">${isFinalVisibleStep() ? "견적 요청 등록" : "다음"}</button>
      </div>
    `;

    wizard.querySelector(".wizard-back")?.addEventListener("click", () => move(-1));
    wizard.querySelector(".wizard-next")?.addEventListener("click", (event) => {
      if (!isFinalVisibleStep()) {
        event.preventDefault();
        move(1);
      }
    });

    bindStepEvents(wizard, step.key);
    updateNativeRequirement();
    updatePreview();
  }

  function move(delta) {
    if (delta > 0 && !validateCurrentStep()) return;
    state.stepIndex = Math.max(0, Math.min(visibleSteps().length - 1, state.stepIndex + delta));
    render();
  }

  function validateCurrentStep() {
    clearMessage();
    syncAllFields();
    const step = currentStep();
    const ok = step.validate();
    updatePreview();
    return ok;
  }

  function setMessage(text) {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = text ? "error" : "";
  }

  function clearMessage() {
    setMessage("");
  }

  function renderQuoteType() {
    return `
      <h3>견적서가 있는지 먼저 선택해주세요.</h3>
      <p>견적서 유무에 따라 필요한 입력 단계가 달라집니다.</p>
      <div class="wizard-choice-grid wizard-choice-grid-two">
        ${quoteTypes.map((item) => choiceCard(item, "wizardQuoteTypeProxy", fields.quoteType.value)).join("")}
      </div>
    `;
  }

  function renderPersonal() {
    return `
      <h3>고객님 정보를 입력해주세요.</h3>
      <p>내 견적 확인과 알림 안내에 필요한 최소 정보만 받습니다.</p>
      <div class="wizard-field-grid">
        <label>고객님 성함<input type="text" data-wizard-field="customer" value="${escapeHtml(fields.customer.value)}" placeholder="예: 홍길동" /></label>
        <label>연락처<input type="text" data-wizard-field="phone" value="${escapeHtml(fields.phone.value)}" placeholder="010-0000-0000" /></label>
      </div>
    `;
  }

  function renderPurpose() {
    return `
      <h3>구매 목적을 선택해주세요.</h3>
      <p>목적에 따라 비교해야 할 혜택과 일정 조건이 달라집니다.</p>
      <div class="wizard-choice-grid">${purposeOptions.map((item) => choiceCard(item, "wizardPurposeProxy", fields.purpose.value)).join("")}</div>
    `;
  }

  function renderBrand() {
    return `
      <h3>브랜드를 선택해주세요.</h3>
      <p>LG전자와 비교견적은 견적서가 없을 때 AI가 LG전자 후보 모델을 정리합니다. 삼성전자는 직접 입력 기준으로 접수됩니다.</p>
      <div class="wizard-choice-grid wizard-choice-grid-three">${brandOptions.map((item) => choiceCard(item, "wizardBrandProxy", fields.brand.value)).join("")}</div>
    `;
  }

  function renderProducts() {
    return `
      <h3>구매 예정 품목을 모두 선택해주세요.</h3>
      <p>견적서가 없는 고객님은 선택한 품목 기준으로 판매자에게 요청이 전달됩니다.</p>
      <div class="wizard-product-list">
        ${productOptions
          .map((product) => {
            const checked = state.selectedProducts.includes(product.value);
            return `
              <button type="button" class="wizard-product-card ${checked ? "is-selected" : ""}" data-product="${escapeHtml(product.value)}">
                <span class="wizard-checkbox" aria-hidden="true">${checked ? "✓" : ""}</span>
                <span class="product-thumb"><span>${escapeHtml(product.icon)}</span></span>
                <strong>${escapeHtml(product.title)}</strong>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderOptions() {
    return `
      <h3>선택한 품목의 옵션을 확인해주세요.</h3>
      <p>옵션을 모르시면 해당 품목은 옵션 미선택 상태로 접수할 수 있습니다.</p>
      <div class="wizard-option-list">
        ${state.selectedProducts
          .map((product) => {
            const summary = productOptionSummary(product);
            return `
              <div class="wizard-option-row">
                <div>
                  <strong>${escapeHtml(product)}</strong>
                  <span>${escapeHtml(summary || "옵션 미선택")}</span>
                </div>
                <button type="button" class="secondary-btn wizard-open-option" data-product="${escapeHtml(product)}">옵션 선택</button>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderAiContext() {
    return `
      <h3>AI 추천에 필요한 상황을 알려주세요.</h3>
      <p>AI 모델 추천은 LG전자 후보 모델 기준으로만 제공됩니다.</p>
      <div class="wizard-choice-block">
        <h4>구매 목적</h4>
        <div class="wizard-chip-grid">${aiSituations.map((item) => chip(item, "ai-situation", state.aiContext.situation === item)).join("")}</div>
      </div>
      <div class="wizard-choice-block">
        <h4>가족 구성</h4>
        <div class="wizard-chip-grid">${familyOptions.map((item) => chip(item, "ai-family", state.aiContext.family.includes(item))).join("")}</div>
      </div>
      <div class="wizard-choice-block">
        <h4>예산</h4>
        <div class="wizard-chip-grid">
          ${["예산 확정", "예산 미정"].map((item) => chip(item, "ai-budget-status", state.aiContext.budgetStatus === item)).join("")}
        </div>
        <input class="wizard-inline-input" type="text" data-ai-budget-range value="${escapeHtml(state.aiContext.budgetRange)}" placeholder="예: 1,000만원대, 2,000만원 이하" />
      </div>
      <div class="wizard-choice-block">
        <h4>중요한 조건</h4>
        <div class="wizard-chip-grid">${priorityOptions.map((item) => chip(item, "ai-priority", state.aiContext.priorities.includes(item))).join("")}</div>
      </div>
      <label class="wizard-wide-label">추가 상황
        <textarea data-ai-note rows="4" placeholder="예: 34평 신축 입주, 주방은 키친핏 선호, 11월 설치 예정">${escapeHtml(state.aiContext.note)}</textarea>
      </label>
    `;
  }

  function renderQuoteInfo() {
    const showUpload = isWithQuote();
    const showAiNotice = shouldUseAiRecommendation();
    return `
      <h3>${showUpload ? "견적서 이미지와 설치 정보를 확인해주세요." : "설치 정보와 요청사항을 확인해주세요."}</h3>
      <p>${showAiNotice ? "AI가 추천 모델명을 정리하고 네이버 최저가를 기준가로 저장합니다. 견적서에는 금액 없이 모델명만 표시됩니다." : "판매자가 확인할 설치 일정과 요청사항을 입력해주세요."}</p>
      ${showUpload ? renderUploadBox() : ""}
      ${showAiNotice ? renderRecommendationPanel() : ""}
      <div class="wizard-field-grid">
        <label>설치 지역<input type="text" data-wizard-field="region" value="${escapeHtml(fields.region.value)}" placeholder="서울 송파구" /></label>
        <label>설치 예정일<input type="text" data-wizard-field="installDate" value="${escapeHtml(fields.installDate.value)}" placeholder="예: 8월 말, 2026년 8월 15일" /></label>
      </div>
      <label class="wizard-wide-label">추가 요청사항
        <textarea data-wizard-field="memo" rows="4" placeholder="모델명을 입력해주세요.">${escapeHtml(fields.memo.value)}</textarea>
      </label>
    `;
  }

  function renderUploadBox() {
    const count = fields.image?.files?.length || 0;
    return `
      <label class="upload-box wizard-upload-proxy" for="quoteImage">
        <span class="upload-icon">+</span>
        <strong>견적서 이미지 선택</strong>
        <small>견적서가 있는 경우 최소 1장, 최대 4장까지 등록해야 합니다. 현재 ${count}장 선택됨</small>
      </label>
    `;
  }

  function renderRecommendationPanel() {
    const loading = state.recommending ? "<p>AI가 모델 후보를 정리하고 있습니다.</p>" : "";
    const body = state.recommendationGroups.length
      ? state.recommendationGroups
          .map(
            (group) => `
              <div class="ai-recommendation-group">
                <strong>[${escapeHtml(group.product)}]</strong>
                <span>${escapeHtml(group.optionSummary || "상세 옵션 미입력")}</span>
                <ul>${group.models.map((model) => `<li>${escapeHtml(model.modelName)}</li>`).join("")}</ul>
              </div>
            `
          )
          .join("")
      : "<p>마지막 단계에서 AI 추천 모델이 자동으로 정리됩니다.</p>";
    return `<div class="ai-recommendation-panel"><b>AI 추천 간이 견적서</b>${loading || body}</div>`;
  }

  function bindStepEvents(root, key) {
    root.querySelectorAll("input[data-choice-name]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.name === "wizardQuoteTypeProxy") {
          fields.quoteType.value = input.value;
          if (input.value === "with_quote") {
            state.selectedProducts = [];
            state.productOptions = {};
            clearAiRecommendation();
          }
        }
        if (input.name === "wizardPurposeProxy") fields.purpose.value = input.value;
        if (input.name === "wizardBrandProxy") {
          fields.brand.value = input.value;
          clearAiRecommendation();
        }
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll("[data-wizard-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const target = field(input.dataset.wizardField);
        if (!target) return;
        target.value = input.dataset.wizardField === "phone" ? formatPhoneInput(input.value) : input.value;
        if (input.dataset.wizardField === "phone") input.value = target.value;
        updatePreview();
      });
    });

    root.querySelectorAll(".wizard-product-card").forEach((button) => {
      button.addEventListener("click", () => {
        const product = button.dataset.product;
        if (state.selectedProducts.includes(product)) {
          state.selectedProducts = state.selectedProducts.filter((item) => item !== product);
          delete state.productOptions[product];
        } else {
          state.selectedProducts.push(product);
        }
        clearAiRecommendation();
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll(".wizard-open-option").forEach((button) => {
      button.addEventListener("click", () => openOptionModal(button.dataset.product));
    });

    root.querySelectorAll("[data-ai-situation]").forEach((button) => {
      button.addEventListener("click", () => {
        state.aiContext.situation = button.dataset.aiSituation;
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll("[data-ai-family]").forEach((button) => {
      button.addEventListener("click", () => toggleArray(state.aiContext.family, button.dataset.aiFamily));
    });

    root.querySelectorAll("[data-ai-budget-status]").forEach((button) => {
      button.addEventListener("click", () => {
        state.aiContext.budgetStatus = button.dataset.aiBudgetStatus;
        syncAllFields();
        render();
      });
    });

    root.querySelector("[data-ai-budget-range]")?.addEventListener("input", (event) => {
      state.aiContext.budgetRange = event.target.value;
      syncAllFields();
    });

    root.querySelectorAll("[data-ai-priority]").forEach((button) => {
      button.addEventListener("click", () => toggleArray(state.aiContext.priorities, button.dataset.aiPriority));
    });

    root.querySelector("[data-ai-note]")?.addEventListener("input", (event) => {
      state.aiContext.note = event.target.value;
      syncAllFields();
    });

    if (key === "quoteInfo" && shouldUseAiRecommendation() && !state.recommending && !state.recommendationGroups.length) {
      runAiRecommendation();
    }
  }

  function toggleArray(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) array.splice(index, 1);
    else array.push(value);
    syncAllFields();
    render();
  }

  function choiceCard(item, name, currentValue) {
    const checked = currentValue === item.value;
    return `
      <label class="wizard-choice-card ${checked ? "is-selected" : ""}">
        <input type="radio" name="${name}" value="${escapeHtml(item.value)}" ${checked ? "checked" : ""} data-choice-name="${name}" />
        <span class="wizard-radio" aria-hidden="true">${checked ? "✓" : ""}</span>
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.text || "")}</small>
        </span>
        ${item.badge ? `<em>${escapeHtml(item.badge)}</em>` : ""}
      </label>
    `;
  }

  function chip(label, name, selected) {
    const attr = `data-${name}="${escapeHtml(label)}"`;
    return `<button type="button" class="wizard-chip ${selected ? "is-selected" : ""}" ${attr}>${escapeHtml(label)}</button>`;
  }

  function openOptionModal(product) {
    const schema = optionSchema[product] || [];
    const draft = { ...(state.productOptions[product] || {}) };
    const modal = document.createElement("div");
    modal.className = "option-modal is-open";
    modal.innerHTML = `
      <div class="option-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(product)} 옵션 선택">
        <button type="button" class="option-close" aria-label="닫기">×</button>
        <h3>${escapeHtml(product)}</h3>
        <div class="option-section-wrap">
          ${schema.map((section) => renderOptionSection(product, section, draft)).join("")}
        </div>
        <div class="option-actions">
          <button type="button" class="secondary-btn option-clear">옵션 초기화</button>
          <button type="button" class="primary-btn option-save">확인</button>
        </div>
      </div>
    `;
    document.body.append(modal);
    document.body.classList.add("modal-open");

    const close = () => {
      modal.remove();
      document.body.classList.remove("modal-open");
    };
    modal.querySelector(".option-close").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector(".option-clear").addEventListener("click", () => {
      delete state.productOptions[product];
      clearAiRecommendation();
      syncAllFields();
      close();
      render();
    });
    modal.querySelector(".option-save").addEventListener("click", () => {
      const next = {};
      schema.forEach((section) => {
        const checked = [...modal.querySelectorAll(`[name="option-${section.key}"]:checked`)].map((input) => input.value);
        next[section.key] = section.type === "multi" ? checked : checked[0] || "";
      });
      state.productOptions[product] = next;
      clearAiRecommendation();
      syncAllFields();
      close();
      render();
    });
  }

  function renderOptionSection(product, section, draft) {
    const values = Array.isArray(draft[section.key]) ? draft[section.key] : [draft[section.key]].filter(Boolean);
    return `
      <section class="option-section">
        <h4>${escapeHtml(section.title)}</h4>
        ${section.values
          .map((value) => {
            const checked = values.includes(value);
            return `
              <label class="option-row">
                <span>${escapeHtml(value)}</span>
                <input type="${section.type === "multi" ? "checkbox" : "radio"}" name="option-${section.key}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} />
                <b aria-hidden="true">${checked ? "✓" : ""}</b>
              </label>
            `;
          })
          .join("")}
      </section>
    `;
  }

  function validateQuoteType() {
    if (fields.quoteType.value) return true;
    setMessage("견적서 유무를 선택해주세요.");
    return false;
  }

  function validatePersonal() {
    if (!fields.customer.value.trim()) {
      setMessage("고객님 성함을 입력해주세요.");
      return false;
    }
    if (onlyDigits(fields.phone.value).length < 9) {
      setMessage("연락처를 정확히 입력해주세요.");
      return false;
    }
    return true;
  }

  function validatePurpose() {
    if (fields.purpose.value) return true;
    setMessage("구매 목적을 선택해주세요.");
    return false;
  }

  function validateBrand() {
    if (fields.brand.value) return true;
    setMessage("브랜드를 선택해주세요.");
    return false;
  }

  function validateProducts() {
    if (state.selectedProducts.length) return true;
    setMessage("견적서가 없는 경우 구매 예정 품목을 선택해주세요.");
    return false;
  }

  function validateOptions() {
    return true;
  }

  function validateAiContext() {
    if (!shouldUseAiRecommendation()) return true;
    if (!state.aiContext.situation) {
      setMessage("AI 추천을 위해 구매 목적을 선택해주세요.");
      return false;
    }
    if (!state.aiContext.family.length) {
      setMessage("AI 추천을 위해 가족 구성을 선택해주세요.");
      return false;
    }
    if (!state.aiContext.budgetStatus) {
      setMessage("AI 추천을 위해 예산 여부를 선택해주세요.");
      return false;
    }
    return true;
  }

  function validateQuoteInfo() {
    if (isWithQuote() && (!fields.image.files || !fields.image.files.length)) {
      setMessage("견적서가 있는 경우 견적서 이미지를 최소 1장 첨부해주세요.");
      return false;
    }
    if (!fields.region.value.trim()) {
      setMessage("설치 지역을 입력해주세요.");
      return false;
    }
    if (!fields.installDate.value.trim()) {
      setMessage("설치 예정일을 입력해주세요.");
      return false;
    }
    syncAllFields();
    return true;
  }

  function isWithQuote() {
    return fields.quoteType.value === "with_quote";
  }

  function isWithoutQuote() {
    return fields.quoteType.value === "without_quote";
  }

  function shouldUseAiRecommendation() {
    return isWithoutQuote() && fields.brand.value !== "삼성전자";
  }

  function updateNativeRequirement() {
    if (fields.image) fields.image.required = isWithQuote();
    if (fields.price) fields.price.required = false;
  }

  function syncAllFields() {
    fields.items.value = buildItemsValue();
    fields.aiSituation.value = state.aiContext.situation;
    fields.familyComposition.value = state.aiContext.family.join(", ");
    fields.budgetStatus.value = state.aiContext.budgetStatus;
    fields.budgetRange.value = state.aiContext.budgetRange;
    fields.purchasePriority.value = state.aiContext.priorities.join(", ");
    fields.aiRequestSummary.value = buildAiSummary();
    if (!shouldUseAiRecommendation()) fields.aiModelRecommendations.value = "";
    if (isWithQuote()) {
      fields.items.value = "견적서 첨부";
      fields.price.value = "0";
    }
    updateNativeRequirement();
  }

  function buildItemsValue() {
    if (isWithQuote()) return "견적서 첨부";
    return state.selectedProducts
      .map((product) => {
        const summary = productOptionSummary(product);
        return summary ? `${product} (${summary})` : product;
      })
      .join(", ");
  }

  function productOptionSummary(product) {
    const options = state.productOptions[product] || {};
    const parts = [];
    Object.values(options).forEach((value) => {
      if (Array.isArray(value)) parts.push(...value.filter(Boolean));
      else if (value) parts.push(value);
    });
    return parts.filter((item) => item !== "모르겠어요").join(" · ");
  }

  function buildAiSummary() {
    if (!shouldUseAiRecommendation()) return "";
    const lines = [
      "고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다.",
      state.aiContext.situation ? `구매 목적: ${state.aiContext.situation}` : "",
      state.aiContext.family.length ? `가족 구성: ${state.aiContext.family.join(", ")}` : "",
      state.aiContext.budgetStatus ? `예산: ${state.aiContext.budgetStatus}${state.aiContext.budgetRange ? ` (${state.aiContext.budgetRange})` : ""}` : "",
      state.aiContext.priorities.length ? `중요 조건: ${state.aiContext.priorities.join(", ")}` : "",
      state.aiContext.note ? `추가 상황: ${state.aiContext.note}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  function clearAiRecommendation() {
    state.recommendationGroups = [];
    fields.aiModelRecommendations.value = "";
    if (isWithoutQuote()) fields.price.value = "0";
  }

  async function runAiRecommendation() {
    state.recommending = true;
    render();
    try {
      const groups = await buildAiModelRecommendations();
      state.recommendationGroups = groups;
      fields.aiModelRecommendations.value = recommendationsToText(groups);
      applyAutoLowestPrice(groups);
    } catch (error) {
      console.warn("AI recommendation failed", error);
      fields.aiModelRecommendations.value = fallbackRecommendationText();
      fields.price.value = "0";
    } finally {
      state.recommending = false;
      syncAllFields();
      render();
    }
  }

  async function loadCatalog() {
    if (state.catalog) return state.catalog;
    const response = await fetch("/assets/pickquote-product-model-map.json", { cache: "force-cache" });
    if (!response.ok) throw new Error("catalog load failed");
    state.catalog = await response.json();
    return state.catalog;
  }

  async function buildAiModelRecommendations() {
    const catalog = await loadCatalog();
    const groups = [];
    for (const product of state.selectedProducts) {
      const models = Array.isArray(catalog?.[product]?.models) ? catalog[product].models : [];
      const filtered = filterModelsByProductOptions(product, models).slice(0, 3);
      const enriched = [];
      for (const model of filtered) {
        const lowest = await fetchLowestPrice(model.modelName);
        enriched.push({ ...model, naverLowestPrice: lowest || 0 });
      }
      groups.push({
        product,
        optionSummary: productOptionSummary(product),
        models: enriched.length ? enriched : [{ modelName: "판매자 상담 후 모델 확정", normalPrice: 0, naverLowestPrice: 0 }],
      });
    }
    return groups;
  }

  function filterModelsByProductOptions(product, models) {
    const options = state.productOptions[product] || {};
    const normalized = models
      .filter((model) => model && model.modelName)
      .sort((a, b) => Number(a.normalPrice || 0) - Number(b.normalPrice || 0));
    const matchers = [];

    if (product === "TV" && options.size) {
      const size = options.size.match(/\d+/)?.[0];
      if (size) matchers.push((name) => name.includes(size));
    }
    if (product === "냉장고" && options.type) {
      if (options.type.includes("빌트인")) matchers.push((name) => /빌트|키친|핏|오브제|스템/i.test(name));
      if (options.type.includes("프리스탠딩")) matchers.push((name) => !/김치|정수기/i.test(name));
    }
    if (product === "세탁기/건조기" && options.type) {
      if (options.type.includes("일체형")) matchers.push((name) => /워시|타워|원바디|일체/i.test(name));
      if (options.type.includes("복합형")) matchers.push((name) => /콤보|세탁건조/i.test(name));
    }
    if (product === "청소기" && Array.isArray(options.type) && options.type.length) {
      matchers.push((name) => options.type.some((type) => name.includes(type.replace("청소기", ""))));
    }
    if (product === "김치냉장고") matchers.push((name) => /김치/i.test(name));
    if (product === "에어컨" && options.type) {
      if (options.type === "천장형") matchers.push((name) => /천장|시스템/i.test(name));
      if (options.type === "2IN1") matchers.push((name) => /2IN1|2in1|투인원|멀티/i.test(name));
    }
    if (product === "식기세척기") matchers.push((name) => /식기|식세/i.test(name));
    if (product === "인덕션/전기레인지") matchers.push((name) => /인덕션|전기레인지|하이라이트/i.test(name));
    if (product === "오븐/전자레인지") matchers.push((name) => /오븐|전자레인지/i.test(name));
    if (product === "공기청정기") matchers.push((name) => /공기|퓨리|청정/i.test(name));
    if (product === "라이프스타일 TV") matchers.push((name) => /스탠바이미|이동|포터블|라이프/i.test(name));

    const matched = matchers.length ? normalized.filter((model) => matchers.every((matcher) => matcher(model.modelName))) : normalized;
    return matched.length ? matched : normalized;
  }

  async function fetchLowestPrice(modelName) {
    try {
      const response = await fetch(`/api/naver-shopping-lowest?query=${encodeURIComponent(modelName)}`, { cache: "no-store" });
      if (!response.ok) return 0;
      const data = await response.json();
      if (!data.ok || data.confidence !== "exact-model-filtered") return 0;
      return Number(data.lowestPrice || 0);
    } catch {
      return 0;
    }
  }

  function recommendationsToText(groups) {
    const lines = ["고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다."];
    groups.forEach((group) => {
      lines.push("");
      lines.push(`[${group.product}]${group.optionSummary ? ` ${group.optionSummary}` : ""}`);
      group.models.forEach((model) => lines.push(`- ${model.modelName}`));
    });
    return lines.join("\n").trim();
  }

  function fallbackRecommendationText() {
    const lines = ["고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다."];
    state.selectedProducts.forEach((product) => {
      lines.push("");
      lines.push(`[${product}]${productOptionSummary(product) ? ` ${productOptionSummary(product)}` : ""}`);
      lines.push("- 판매자 상담 후 모델 확정");
    });
    return lines.join("\n").trim();
  }

  function applyAutoLowestPrice(groups) {
    const total = groups.reduce((sum, group) => {
      const prices = group.models.map((model) => Number(model.naverLowestPrice || 0)).filter((price) => price > 100000);
      return sum + (prices[0] || 0);
    }, 0);
    fields.price.value = total ? String(Math.ceil(total / 10000)) : "0";
  }

  function updatePreview() {
    if (previewTitle) previewTitle.textContent = buildItemsValue() || "견적 요청서가 여기에 표시됩니다.";
    if (previewMeta) {
      const brand = fields.brand.value || "브랜드 미선택";
      const region = fields.region.value || "지역 미입력";
      const type = isWithoutQuote() ? "견적서 없음" : isWithQuote() ? "견적서 있음" : "견적서 유무 미선택";
      previewMeta.textContent = `${type} · ${brand} · ${region}`;
    }
    if (imagePreview && isWithoutQuote()) {
      imagePreview.innerHTML = "<span>견적서 없이 AI 추천 정보로 접수됩니다.</span>";
    }
  }

  function formatPhoneInput(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.startsWith("02")) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
