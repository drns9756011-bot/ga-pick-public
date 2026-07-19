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
      eyebrow: "견적올리기 사용 안내",
      title: "견적서 사진을 올리고, 더 좋은 구매 조건을 비교하세요.",
      intro: "픽견적은 고객님이 이미 받은 견적서를 기준으로 가격, 배송, 설치, 카드 할인, 사은품 조건을 한곳에서 비교할 수 있도록 도와드립니다.",
      previewClass: "guide-customer-preview",
      steps: [
        ["1", "인적사항 입력", "성함과 휴대전화는 내 견적 조회와 본인 확인에 사용됩니다."],
        ["2", "구매사유 선택", "혼수, 신축입주, 이사, 인테리어 등 구매 목적을 선택하면 판매자가 상황에 맞춰 제안합니다."],
        ["3", "원하는 브랜드 선택", "LG전자, 삼성전자, 비교 견적 중 원하는 방향을 선택합니다."],
        ["4", "견적서 등록", "견적서 이미지는 최대 4장까지 올리고, 기존 견적 금액과 설치 지역을 입력합니다."],
      ],
      note: "견적 등록 후에는 성함과 휴대전화로 내 견적 확인에서 판매자 제안을 확인할 수 있습니다.",
    },
    seller: {
      eyebrow: "판매자 페이지 사용 안내",
      title: "고객님 견적을 확인하고 조건을 제안하세요.",
      intro: "판매자 페이지는 승인된 판매자만 이용할 수 있습니다. 고객님이 선택하기 전까지 연락처는 보호되며, 선택 후 상담이 이어집니다.",
      previewClass: "guide-seller-preview",
      steps: [
        ["1", "견적 목록 확인", "고객님 견적 탭에서 접수된 견적과 남은 응답 시간을 확인합니다."],
        ["2", "브랜드·지역 필터", "전체, LG전자, 삼성전자, 비교견적과 실제 접수된 지역 기준으로 빠르게 분류합니다."],
        ["3", "견적서 원본 확인", "견적서 이미지를 누르면 원본 크기로 확인할 수 있어 잘린 내용을 다시 볼 수 있습니다."],
        ["4", "제안 보내기", "제안 금액은 만원 단위로 입력하고, 배송·설치·혜택 조건을 함께 작성합니다."],
      ],
      note: "고객님이 내 제안을 선택하면 연락처가 공개되고, 선택받은 견적 탭에서 상담을 진행할 수 있습니다.",
    },
  };

  function makePreview(type) {
    if (type === "seller") {
      return `
        <div class="guide-screen ${guides[type].previewClass}" aria-label="픽견적 판매자 페이지 화면 예시">
          <div class="guide-topline">
            <span>픽견적</span>
            <small>판매자</small>
          </div>
          <div class="guide-tabs">
            <span class="is-active">고객님 견적</span>
            <span>제안한 견적</span>
            <span>선택받은 견적</span>
          </div>
          <div class="guide-filter-row">
            <span>전체</span>
            <span>LG전자</span>
            <span>대구</span>
          </div>
          <div class="guide-seller-grid">
            <div>
              <strong>견적번호 20260719-0001</strong>
              <small>대구 · LG전자 · 47시간 남음</small>
            </div>
            <div>
              <strong>고객님 견적서</strong>
              <small>이미지 확인 후 제안 금액 입력</small>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="guide-screen ${guides[type].previewClass}" aria-label="픽견적 견적올리기 페이지 화면 예시">
        <div class="guide-topline">
          <span>픽견적</span>
          <small>견적올리기</small>
        </div>
        <div class="guide-progress">
          <span class="is-active"></span>
          <span class="is-active"></span>
          <span></span>
          <span></span>
        </div>
        <div class="guide-form-card">
          <strong>구매사유를 선택해주세요.</strong>
          <p>혼수 · 신축입주 · 이사 · 인테리어 · 일반구매</p>
        </div>
        <div class="guide-form-card muted">
          <strong>견적서 이미지 등록</strong>
          <p>사진 최대 4장, 금액은 만원 단위 입력</p>
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
        <button class="page-guide-close" type="button" data-guide-close aria-label="안내 닫기">×</button>
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
              오늘은 그만보기
            </label>
            <button class="primary-btn full" type="button" data-guide-close>확인하고 시작하기</button>
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
