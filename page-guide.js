(function () {
  const guideState = {
    activeType: "",
    customerShown: false,
    sellerShown: false,
  };

  function todayKey() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function localDismissKey(type) {
    return `pickquoteGuideDismissed:${type}:${todayKey()}`;
  }

  function isLocalDismissed(type) {
    return localStorage.getItem(localDismissKey(type)) === "1";
  }

  function saveLocalDismissal(type) {
    localStorage.setItem(localDismissKey(type), "1");
  }

  async function isServerDismissed(type) {
    if (window.location.protocol === "file:") return isLocalDismissed(type);
    try {
      const response = await fetch(`/api/guide-dismissal?guideType=${encodeURIComponent(type)}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      return Boolean(payload.ok && payload.dismissed);
    } catch (error) {
      return isLocalDismissed(type);
    }
  }

  async function saveDismissal(type) {
    saveLocalDismissal(type);
    if (window.location.protocol === "file:") return;

    try {
      await fetch("/api/guide-dismissal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideType: type }),
      });
    } catch (error) {
      // Local dismissal still prevents repeat display on this browser for today.
    }
  }

  const guides = {
    customer: {
      eyebrow: "寃ъ쟻?щ━湲??ъ슜 ?덈궡",
      title: "寃ъ쟻???ъ쭊???щ━怨? ??醫뗭? 援щℓ 議곌굔??鍮꾧탳?섏꽭??",
      intro: "?쎄껄?곸? 怨좉컼?섏씠 ?대? 諛쏆? 寃ъ쟻?쒕? 湲곗??쇰줈 媛寃? 諛곗넚, ?ㅼ튂, 移대뱶 ?좎씤, ?ъ???議곌굔???쒓납?먯꽌 鍮꾧탳?????덈룄濡??꾩??쒕┰?덈떎.",
      previewClass: "guide-customer-preview",
      steps: [
        ["1", "?몄쟻?ы빆 ?낅젰", "?깊븿怨??대??꾪솕????寃ъ쟻 議고쉶? 蹂몄씤 ?뺤씤???ъ슜?⑸땲??"],
        ["2", "援щℓ?ъ쑀 ?좏깮", "?쇱닔, ?좎텞?낆＜, ?댁궗, ?명뀒由ъ뼱 ??援щℓ 紐⑹쟻???좏깮?섎㈃ ?먮ℓ?먭? ?곹솴??留욎떠 ?쒖븞?⑸땲??"],
        ["3", "釉뚮옖???좏깮", "LG?꾩옄, ?쇱꽦?꾩옄, 鍮꾧탳寃ъ쟻 以?寃ъ쟻??諛쏆쓣 諛⑺뼢???좏깮?⑸땲??"],
        ["4", "寃ъ쟻???깅줉", "寃ъ쟻???대?吏??理쒕? 4?κ퉴吏 ?щ━怨? 湲곗〈 寃ъ쟻 湲덉븸怨??ㅼ튂 吏??쓣 ?낅젰?⑸땲??"],
      ],
      note: "寃ъ쟻 ?깅줉 ?꾩뿉???깊븿怨??대??꾪솕濡???寃ъ쟻 ?뺤씤?먯꽌 ?먮ℓ???쒖븞???뺤씤?????덉뒿?덈떎.",
    },
    seller: {
      eyebrow: "?먮ℓ???섏씠吏 ?ъ슜 ?덈궡",
      title: "怨좉컼??寃ъ쟻???뺤씤?섍퀬 議곌굔???쒖븞?섏꽭??",
      intro: "?먮ℓ???섏씠吏???뱀씤???먮ℓ?먮쭔 ?댁슜?????덉뒿?덈떎. 怨좉컼?섏씠 ?좏깮?섍린 ?꾧퉴吏 ?곕씫泥섎뒗 蹂댄샇?섎ŉ, ?좏깮 ???곷떞???댁뼱吏묐땲??",
      previewClass: "guide-seller-preview",
      steps: [
        ["1", "寃ъ쟻 紐⑸줉 ?뺤씤", "怨좉컼??寃ъ쟻 ??뿉???묒닔??寃ъ쟻怨??⑥? ?묐떟 ?쒓컙???뺤씤?⑸땲??"],
        ["2", "釉뚮옖?쑣룹????꾪꽣", "?꾩껜, LG?꾩옄, ?쇱꽦?꾩옄, 鍮꾧탳寃ъ쟻怨??ㅼ젣 ?묒닔??吏??湲곗??쇰줈 鍮좊Ⅴ寃?遺꾨쪟?⑸땲??"],
        ["3", "寃ъ쟻???먮낯 ?뺤씤", "寃ъ쟻???대?吏瑜??꾨Ⅴ硫??먮낯 ?ш린濡??뺤씤?????덉뼱 ?섎┛ ?댁슜???ㅼ떆 蹂????덉뒿?덈떎."],
        ["4", "?쒖븞 蹂대궡湲?, "?쒖븞 湲덉븸? 留뚯썝 ?⑥쐞濡??낅젰?섍퀬, 諛곗넚쨌?ㅼ튂쨌?쒗깮 議곌굔???④퍡 ?묒꽦?⑸땲??"],
      ],
      note: "怨좉컼?섏씠 ???쒖븞???좏깮?섎㈃ ?곕씫泥섍? 怨듦컻?섍퀬, ?좏깮諛쏆? 寃ъ쟻 ??뿉???곷떞??吏꾪뻾?????덉뒿?덈떎.",
    },
  };

  function makePreview(type) {
    if (type === "seller") {
      return `
        <div class="guide-screen ${guides[type].previewClass}" aria-label="?쎄껄???먮ℓ???섏씠吏 ?붾㈃ ?덉떆">
          <div class="guide-topline">
            <span>?쎄껄??/span>
            <small>?먮ℓ??/small>
          </div>
          <div class="guide-tabs">
            <span class="is-active">怨좉컼??寃ъ쟻</span>
            <span>?쒖븞??寃ъ쟻</span>
            <span>?좏깮諛쏆? 寃ъ쟻</span>
          </div>
          <div class="guide-filter-row">
            <span>?꾩껜</span>
            <span>LG?꾩옄</span>
            <span>?援?/span>
          </div>
          <div class="guide-seller-grid">
            <div>
              <strong>寃ъ쟻踰덊샇 20260719-0001</strong>
              <small>?援?쨌 LG?꾩옄 쨌 47?쒓컙 ?⑥쓬</small>
            </div>
            <div>
              <strong>怨좉컼??寃ъ쟻??/strong>
              <small>?대?吏 ?뺤씤 ???쒖븞 湲덉븸 ?낅젰</small>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="guide-screen ${guides[type].previewClass}" aria-label="?쎄껄??寃ъ쟻?щ━湲??섏씠吏 ?붾㈃ ?덉떆">
        <div class="guide-topline">
          <span>?쎄껄??/span>
          <small>寃ъ쟻?щ━湲?/small>
        </div>
        <div class="guide-progress">
          <span class="is-active"></span>
          <span class="is-active"></span>
          <span></span>
          <span></span>
        </div>
        <div class="guide-form-card">
          <strong>援щℓ?ъ쑀瑜??좏깮?댁＜?몄슂.</strong>
          <p>?쇱닔 쨌 ?좎텞?낆＜ 쨌 ?댁궗 쨌 ?명뀒由ъ뼱 쨌 ?쇰컲援щℓ</p>
        </div>
        <div class="guide-form-card muted">
          <strong>寃ъ쟻???대?吏 ?깅줉</strong>
          <p>?ъ쭊 理쒕? 4?? 湲덉븸? 留뚯썝 ?⑥쐞 ?낅젰</p>
        </div>
      </div>
    `;
  }

  function openGuide(type) {
    const guide = guides[type];
    if (!guide) return;
    guideState.activeType = type;

    let modal = document.querySelector("#pageGuideModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "pageGuideModal";
      modal.className = "page-guide-modal";
      modal.hidden = true;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="page-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="pageGuideTitle">
        <button class="page-guide-close" type="button" data-guide-close aria-label="?덈궡 ?リ린">횞</button>
        <div class="page-guide-layout">
          ${makePreview(type)}
          <div class="page-guide-copy">
            <p class="eyebrow">${guide.eyebrow}</p>
            <h2 id="pageGuideTitle">${guide.title}</h2>
            <p>${guide.intro}</p>
            <ol class="page-guide-steps">
              ${guide.steps
                .map(([number, title, text]) => `
                  <li>
                    <span>${number}</span>
                    <div>
                      <strong>${title}</strong>
                      <p>${text}</p>
                    </div>
                  </li>
                `)
                .join("")}
            </ol>
            <p class="page-guide-note">${guide.note}</p>
            <label class="page-guide-today">
              <input type="checkbox" id="pageGuideTodayDismiss" />
              ?ㅻ뒛? 洹몃쭔蹂닿린
            </label>
            <button class="primary-btn full" type="button" data-guide-close>?뺤씤?섍퀬 ?쒖옉?섍린</button>
          </div>
        </div>
      </div>
    `;
    modal.hidden = false;
  }

  async function closeGuide() {
    const type = guideState.activeType;
    const dismissToday = document.querySelector("#pageGuideTodayDismiss")?.checked;
    if (type && dismissToday) await saveDismissal(type);

    const modal = document.querySelector("#pageGuideModal");
    if (modal) modal.hidden = true;
  }

  function getActivePageName() {
    return document.querySelector(".page.is-active")?.dataset.page || "";
  }

  async function maybeOpenGuide() {
    const page = getActivePageName();

    if (page === "customer" && !guideState.customerShown) {
      guideState.customerShown = true;
      if (await isServerDismissed("customer")) return;
      window.setTimeout(() => openGuide("customer"), 180);
      return;
    }

    if ((page === "seller" || page === "sellerLogin") && !guideState.sellerShown) {
      guideState.sellerShown = true;
      if (await isServerDismissed("seller")) return;
      window.setTimeout(() => openGuide("seller"), 180);
    }
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-guide-close]")) {
      closeGuide();
      return;
    }

    if (event.target.id === "pageGuideModal") {
      closeGuide();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGuide();
  });

  const observer = new MutationObserver(maybeOpenGuide);
  document.querySelectorAll(".page").forEach((page) => {
    observer.observe(page, { attributes: true, attributeFilter: ["class"] });
  });

  window.addEventListener("load", maybeOpenGuide);
})();

