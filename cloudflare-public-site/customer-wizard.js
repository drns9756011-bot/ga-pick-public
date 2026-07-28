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
    { value: "with_quote", title: "寃ъ쟻?쒓? ?덉뼱??!", text: "諛쏆븘??寃ъ쟻???ъ쭊??湲곗??쇰줈 ?먮ℓ???쒖븞??鍮꾧탳?⑸땲??" },
    {
      value: "without_quote",
      title: "寃ъ쟻?쒓? ?놁뼱??!",
      text: "?쒗뭹援곌낵 ?щ쭩 ?덉궛?쇰줈 ?쒖븞諛쏆뒿?덈떎. 寃ъ쟻?쒓? ?덈뒗 ?붿껌蹂대떎 ?쒖븞 議곌굔???쒗븳???앷만 ???덉뒿?덈떎.",
      badge: "?쒗븳 ?덈궡",
    },
  ];

  const purposeOptions = [
    { value: "?⑤뵫,?쇱닔 ?밸퀎?쒗깮", title: "?⑤뵫,?쇱닔", text: "?щ윭 ?덈ぉ????踰덉뿉 鍮꾧탳?⑸땲??", badge: "?밸퀎?쒗깮" },
    { value: "?좎텞?낆＜ ?밸퀎?쒗깮", title: "?좎텞?낆＜", text: "?낆＜ ?쇱젙??留욎텣 議곌굔??鍮꾧탳?⑸땲??", badge: "?밸퀎?쒗깮" },
    { value: "?댁궗", title: "?댁궗", text: "?댁궗 ?좎쭨? ?ㅼ튂 ?섍꼍??留욌뒗 議곌굔??鍮꾧탳?⑸땲??" },
    { value: "?명뀒由ъ뼱", title: "?명뀒由ъ뼱", text: "怨듦컙 ?꾩꽦 ?쇱젙??留욎떠 ?꾩슂??媛?꾩쓣 ?쒖븞諛쏆뒿?덈떎." },
    { value: "?쇰컲", title: "?쇰컲援щℓ", text: "?꾩슂???쒗뭹??媛寃⑷낵 ?쒗깮??李⑤텇??鍮꾧탳?⑸땲??" },
  ];

  const brandOptions = [
    { value: "LG?꾩옄", title: "LG?꾩옄", text: "LG?꾩옄 ?쒗뭹 以묒떖?쇰줈 ?쒖븞??諛쏄퀬 ?띠뼱??" },
    { value: "?쇱꽦?꾩옄", title: "?쇱꽦?꾩옄", text: "?쇱꽦?꾩옄 ?쒗뭹 以묒떖?쇰줈 ?쒖븞??諛쏄퀬 ?띠뼱??" },
    { value: "鍮꾧탳寃ъ쟻", title: "鍮꾧탳寃ъ쟻", text: "LG? ?쇱꽦 議곌굔???④퍡 鍮꾧탳?섍퀬 ?띠뼱??" },
  ];

  const productOptions = [
    { value: "TV", title: "TV", icon: "tv", optionButton: true },
    { value: "?됱옣怨?, title: "?됱옣怨?, icon: "fridge", optionButton: true },
    { value: "?명긽湲?嫄댁“湲?, title: "?명긽湲?嫄댁“湲?, icon: "washer", optionButton: true },
    { value: "泥?냼湲?, title: "泥?냼湲?, icon: "vacuum", optionButton: true },
    { value: "源移섎깋?κ퀬", title: "源移섎깋?κ퀬", icon: "kimchi", optionButton: true },
    { value: "?먯뼱而?, title: "?먯뼱而?, icon: "aircon", optionButton: true },
    { value: "?앷린?몄쿃湲?, title: "?앷린?몄쿃湲?, icon: "dishwasher", optionButton: true },
    { value: "?몃뜒???꾧린?덉씤吏", title: "?몃뜒???꾧린?덉씤吏", icon: "induction", optionButton: true },
    { value: "?ㅻ툙/?꾩옄?덉씤吏", title: "?ㅻ툙/?꾩옄?덉씤吏", icon: "oven", optionButton: true },
    { value: "?뺤닔湲?, title: "?뺤닔湲?, icon: "water", optionButton: true },
    { value: "?섎쪟愿由ш린", title: "?섎쪟愿由ш린", icon: "styler", optionButton: true },
    { value: "怨듦린泥?젙湲?, title: "怨듦린泥?젙湲?, icon: "purifier", optionButton: true },
    { value: "?쇱씠?꾩뒪???TV", title: "?쇱씠?꾩뒪???TV", icon: "lifestyle", optionButton: true },
  ];

  const productOptionSchema = {
    TV: [{ key: "size", title: "?몄튂", mode: "single", options: ["43?몄튂", "55?몄튂", "65?몄튂", "75?몄튂", "85?몄튂", "85?몄튂 ??] }],
    "?명긽湲?嫄댁“湲?: [
      {
        key: "type",
        title: "?ㅼ튂/?쒗뭹 ?뺥깭",
        mode: "single",
        options: ["遺꾨━??蹂묐젹?ㅼ튂 諛?吏곷젹?ㅼ튂, 遺꾨━?ㅼ튂 媛??", "蹂듯빀??肄ㅻ낫)", "?쇱껜???먮컮?? ?뚯떆???"],
      },
    ],
    ?됱옣怨? [
      { key: "install", title: "?ㅼ튂?뺥깭", mode: "single", options: ["鍮뚰듃???ㅼ튇?? ?륁븻留μ뒪)", "?꾨━?ㅽ깲???⑸웾????", "紐⑤Ⅴ寃좎뼱??] },
    ],
    泥?냼湲? [{ key: "type", title: "醫낅쪟", mode: "multi", options: ["臾댁꽑泥?냼湲?, "濡쒕큸泥?냼湲?, "?좎꽑泥?냼湲?] }],
    "?ㅻ툙/?꾩옄?덉씤吏": [{ key: "type", title: "醫낅쪟", mode: "multi", options: ["?ㅻ툙", "?꾩옄?덉씤吏"] }],
    "?몃뜒???꾧린?덉씤吏": [
      { key: "install", title: "?ㅼ튂?뺥깭", mode: "single", options: ["鍮뚰듃??O", "鍮뚰듃??X"] },
      { key: "burner", title: "?붽뎄??, mode: "single", options: ["2援?, "3援?, "4援?] },
    ],
    源移섎깋?κ퀬: [
      { key: "type", title: "?뺥깭", mode: "single", options: ["?쒓퍚??, "?ㅽ깲??] },
      { key: "door", title: "?ㅽ깲???꾩뼱??, mode: "single", options: ["4?꾩뼱", "3?꾩뼱", "1?꾩뼱"], dependsOn: { key: "type", value: "?ㅽ깲?? } },
    ],
    ?먯뼱而? [
      { key: "type", title: "醫낅쪟", mode: "single", options: ["?ㅽ깲??, "踰쎄구??, "2IN1", "泥쒖옣??] },
      { key: "area", title: "?됰갑硫댁쟻", mode: "single", options: ["18??, "24??, "34??, "40?됲삎 ?댁긽"], excludeWhen: { key: "type", value: "泥쒖옣?? } },
      { key: "room", title: "泥쒖옣???ㅼ닔", mode: "single", options: ["3??, "4??, "5??, "6??], dependsOn: { key: "type", value: "泥쒖옣?? } },
    ],
    ?앷린?몄쿃湲? [{ key: "install", title: "?ㅼ튂?뺥깭", mode: "single", options: ["鍮뚰듃??, "移댁슫?고깙", "?꾨━?ㅽ깲??] }],
    怨듦린泥?젙湲? [{ key: "area", title: "?ъ슜硫댁쟻", mode: "single", options: ["10???댄븯", "10?됰?", "20?됰?", "30?됰? ?댁긽"] }],
    ?뺤닔湲? [{ key: "type", title: "醫낅쪟", mode: "single", options: ["?됱삩?뺤닔湲?, "?됱젙?섍린", "?뺤닔?꾩슜", "?쇱쓬?뺤닔湲?] }],
    ?섎쪟愿由ш린: [{ key: "size", title: "?⑸웾", mode: "single", options: ["3踰??댄븯", "5踰?, "??⑸웾"] }],
    "?쇱씠?꾩뒪???TV": [{ key: "type", title: "醫낅쪟", mode: "single", options: ["?ㅽ깲諛붿씠誘?, "?대룞??TV", "???꾨젅???꾪듃 TV", "?ы꽣釉??ㅽ겕由?] }],
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
            <small data-product-summary="${option.value}">?좏깮 ???ㅼ쓬 ?④퀎?먯꽌 ?곸꽭 ?듭뀡??怨좊쫭?덈떎.</small>
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
            <small class="${optionText ? "is-complete" : ""}">${optionText || "?곸꽭 ?듭뀡???좏깮?댁＜?몄슂."}</small>
          </span>
        </div>
        <button class="product-option-btn" type="button" data-product-option="${product}">
          ${optionText ? "?듭뀡 蹂寃? : "?듭뀡 ?좏깮"}
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
      summary.textContent = isSelected ? "?좏깮?? : "?좏깮 ???ㅼ쓬 ?④퀎?먯꽌 ?곸꽭 ?듭뀡??怨좊쫭?덈떎.";
      summary.classList.toggle("is-complete", isSelected);
    });
  }

  function renderSelectedOptionStep() {
    const products = selectedProducts();
    const list = stepSelectedOptions.querySelector(".selected-option-list");
    if (!list) return;
    list.innerHTML = products.length
      ? products.map((product) => selectedOptionCard(product)).join("")
      : `<div class="empty-state compact-empty"><strong>?좏깮???쒗뭹援곗씠 ?놁뒿?덈떎.</strong><p>?댁쟾 ?④퀎?먯꽌 援щℓ ?덉젙 ?덈ぉ???좏깮?댁＜?몄슂.</p></div>`;
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
    itemsInput.value = "寃ъ쟻??泥⑤?";
  }

  function makeOptionModal() {
    const modal = document.createElement("div");
    modal.className = "product-option-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="product-option-panel" role="dialog" aria-modal="true" aria-labelledby="productOptionTitle">
        <div class="product-option-handle"></div>
        <div class="product-option-head">
          <h3 id="productOptionTitle">?듭뀡 ?좏깮</h3>
          <button type="button" class="product-option-close" aria-label="?듭뀡 ?リ린">횞</button>
        </div>
        <div class="product-option-content"></div>
        <div class="product-option-actions">
          <button type="button" class="primary-btn full product-option-confirm">?뺤씤</button>
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
        <b>??/b>
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

  resetSelectOptions(purposeSelect, "援щℓ?ъ쑀 ?좏깮", purposeOptions.map((option) => ({
    value: option.value,
    label: option.title,
  })));
  resetSelectOptions(brandSelect, "釉뚮옖???좏깮", brandOptions.map((option) => ({
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
    <button class="wizard-back" type="button" data-wizard-prev aria-label="?댁쟾 ?④퀎">??/button>
    <div class="wizard-progress" aria-label="寃ъ쟻 ?깅줉 ?④퀎"></div>
  `;

  const stepQuoteType = document.createElement("section");
  stepQuoteType.className = "wizard-step";
  stepQuoteType.dataset.step = "quote-type";
  stepQuoteType.innerHTML = `
    <div class="wizard-step-head">
      <p class="eyebrow">Step 1</p>
      <h2>寃ъ쟻?쒓? ?덉쑝?좉???</h2>
      <p>寃ъ쟻??蹂댁쑀 ?щ????곕씪 ?낅젰 ?④퀎媛 ?щ씪吏묐땲??</p>
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
      <h2>?몄쟻?ы빆???낅젰?댁＜?몄슂.</h2>
      <p>寃ъ쟻 ?뺤씤???ъ슜???깊븿怨??곕씫泥섏엯?덈떎.</p>
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
      <h2>援щℓ?ъ쑀瑜??좏깮?댁＜?몄슂.</h2>
      <p>援щℓ 紐⑹쟻???곕씪 鍮꾧탳?댁빞 ???쒗깮怨??ㅼ튂 議곌굔???щ씪吏????덉뒿?덈떎.</p>
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
      <h2>釉뚮옖?쒕? ?좏깮?댁＜?몄슂.</h2>
      <p>LG?꾩옄, ?쇱꽦?꾩옄, 鍮꾧탳寃ъ쟻 以?寃ъ쟻??諛쏆쓣 諛⑺뼢???좏깮?⑸땲??</p>
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
      <h2>援щℓ ?덉젙 ?덈ぉ??紐⑤몢 ?좏깮?댁＜?몄슂.</h2>
      <p>?꾩슂???쒗뭹援곕쭔 癒쇱? ?좏깮?댁＜?몄슂. ?곸꽭 ?듭뀡? ?ㅼ쓬 ?④퀎?먯꽌 ?좏깮?⑸땲??</p>
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
      <h2>?좏깮???쒗뭹???듭뀡??怨⑤씪二쇱꽭??</h2>
      <p>?좏깮???쒗뭹援곕쭔 ?쒖떆?⑸땲?? ?먮ℓ?먭? ?뺥솗???쒖븞?????덈룄濡??곸꽭 議곌굔???④꺼二쇱꽭??</p>
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
      <h2>寃ъ쟻 ?뺣낫瑜??깅줉?댁＜?몄슂.</h2>
      <p>湲덉븸? 留뚯썝 ?⑥쐞濡??낅젰?섍퀬, ?ㅼ튂 ?덉젙?쇨낵 紐⑤뜽紐낆쓣 ?④퍡 ?④꺼二쇱꽭??</p>
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
  prevButton.textContent = "?댁쟾";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "primary-btn wizard-next";
  nextButton.textContent = "?ㅼ쓬";

  submitButton.classList.add("wizard-submit");
  navigation.append(prevButton, nextButton, submitButton);

  wizard.append(stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuote, navigation, message);
  form.replaceChildren(wizard);

  const allSteps = [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepProducts, stepSelectedOptions, stepQuote];
  const topBackButton = wizard.querySelector("[data-wizard-prev]");
  const progress = wizard.querySelector(".wizard-progress");
  let currentStep = 0;

  function activeSteps() {
    return isWithoutQuoteSelected()
      ? allSteps
      : [stepQuoteType, stepPersonal, stepPurpose, stepBrand, stepQuote];
  }

  function getSelectedQuoteType() {
    const checkedProxy = stepQuoteType.querySelector('[name="wizardQuoteTypeProxy"]:checked');
    return checkedProxy?.value || quoteTypeInput.value || "";
  }

  function isWithoutQuoteSelected() {
    return getSelectedQuoteType() === "without_quote";
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
    const selectedQuoteType = getSelectedQuoteType();
    quoteTypeInput.value = selectedQuoteType;
    if (selectedQuoteType === "with_quote" && !document.querySelector("#quoteImage")?.files?.length) {
      document.querySelector("#quoteImage")?.reportValidity();
      alert("寃ъ쟻?쒓? ?덈뒗 寃쎌슦 寃ъ쟻???대?吏瑜?1???댁긽 泥⑤??댁＜?몄슂.");
      return false;
    }
    syncItemsField();
    return validateFields([priceInput, regionInput, installDateInput]);
  }

  function updateQuoteStepMode() {
    const hasQuote = !isWithoutQuoteSelected();
    uploadBox.hidden = !hasQuote;
    const quoteImage = document.querySelector("#quoteImage");
    if (quoteImage) quoteImage.required = hasQuote;
    if (!hasQuote && quoteImage) quoteImage.value = "";
    const priceLabelText = Array.from(priceLabel.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (priceLabelText) priceLabelText.textContent = hasQuote ? "湲곗〈 寃ъ쟻 湲덉븸(留뚯썝)" : "?щ쭩 ?덉궛(留뚯썝)";
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

