/* =====================================================================
   FACE FILTER 리뷰이벤트 — 디자인 개편 보조 스크립트
   app.js를 수정하지 않고, 화면 변화를 "관찰"해서 시각 보강만 한다.
   - 세그먼트 진행바의 현재 단계 라벨 강조
   안전성: app.js의 동작(클래스 토글)을 읽기만 하며, 절대 변경하지 않는다.
   문제가 생기면 index.html에서 이 스크립트 한 줄만 빼면 원복된다.
   ===================================================================== */
(function () {
  "use strict";

  function syncProgressLabels() {
    var labels = document.getElementById("wizard-progress-labels");
    if (!labels) return;
    // 현재 활성 위저드 페이지의 단계 키를 읽는다 (app.js가 .is-active를 건다)
    var activePage = document.querySelector(".wizard-page.is-active[data-wizard-step]");
    var activeKey = activePage ? activePage.getAttribute("data-wizard-step") : null;
    var spans = labels.querySelectorAll("[data-step-label]");
    spans.forEach(function (span) {
      span.classList.toggle("is-current", span.getAttribute("data-step-label") === activeKey);
    });
  }

  function init() {
    syncProgressLabels();
    // 위저드 페이지들의 class 변화를 감시 → app.js가 단계 바꿀 때마다 라벨 동기화
    var pages = document.querySelectorAll(".wizard-page[data-wizard-step]");
    if (!pages.length) return;
    var observer = new MutationObserver(syncProgressLabels);
    pages.forEach(function (page) {
      observer.observe(page, { attributes: true, attributeFilter: ["class", "hidden"] });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
