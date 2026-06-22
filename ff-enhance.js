/* =====================================================================
   FACE FILTER 리뷰이벤트 — 디자인 개편 보조 스크립트 (v2)
   app.js를 수정하지 않고, 화면 변화를 "관찰/포장"해서 UX만 보강한다.

   포함 기능:
   1. 세그먼트 진행바 현재 단계 라벨 강조
   2. STEP 01 인트로 화면 + 토스식 슬롯 입력
      - 기존 #registration-form 의 input(id/name/required) 100% 유지
      - 슬롯은 시각적 포장일 뿐, 최종 제출은 기존 submit 버튼을 그대로 트리거
   안전성: app.js의 제출 로직(FormData 기반)·검증·id를 일절 변경하지 않는다.
   롤백: index.html에서 이 스크립트 한 줄만 빼면 기존 폼이 그대로 동작.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. 진행바 라벨 강조 ---------- */
  function syncProgressLabels() {
    var labels = document.getElementById("wizard-progress-labels");
    if (!labels) return;
    var activePage = document.querySelector(".wizard-page.is-active[data-wizard-step]");
    var activeKey = activePage ? activePage.getAttribute("data-wizard-step") : null;
    labels.querySelectorAll("[data-step-label]").forEach(function (span) {
      span.classList.toggle("is-current", span.getAttribute("data-step-label") === activeKey);
    });
  }

  /* ---------- 2. STEP 01 인트로 + 슬롯 입력 ---------- */
  function setupSlotForm() {
    var form = document.getElementById("registration-form");
    if (!form || form.dataset.ffSlot === "1") return;
    form.dataset.ffSlot = "1";

    var nameInput = form.querySelector("#customer-name");
    var phoneInput = form.querySelector("#phone-last4");
    var nickInput = form.querySelector("#naver-id");
    var consentInput = form.querySelector("#consent");
    var submitBtn = form.querySelector("button[type='submit']");
    if (!nameInput || !phoneInput || !nickInput || !consentInput || !submitBtn) return;

    var slots = [
      { key: "name", el: nameInput, q: "이름을 알려주세요", label: "이름", type: "text" },
      { key: "phone", el: phoneInput, q: "휴대폰 뒤 4자리는요?", label: "휴대폰 뒤 4자리", type: "tel" },
      { key: "nick", el: nickInput, q: "네이버 리뷰 닉네임을 입력해 주세요", label: "리뷰 닉네임", type: "text" },
      { key: "consent", el: consentInput, q: "마지막으로 동의가 필요해요", label: "동의", type: "consent" }
    ];

    // 원래 폼 본문을 통째로 숨김 (input은 DOM에 남아 FormData 정상 동작)
    var originalNodes = Array.prototype.slice.call(form.childNodes);
    var originalWrap = document.createElement("div");
    originalWrap.className = "ff-slot-originaldom";
    originalWrap.style.display = "none";
    originalNodes.forEach(function (n) { originalWrap.appendChild(n); });
    form.appendChild(originalWrap);

    // 인트로 화면
    var intro = document.createElement("div");
    intro.className = "ff-intro";
    intro.innerHTML =
      '<div class="ff-intro-hero">' +
      '  <div class="ff-intro-pep"></div>' +
      '  <h3 class="ff-intro-title">리뷰 남기고<br>페필이 선물 받아가세요</h3>' +
      '  <p class="ff-intro-sub">참여는 30초면 끝나요</p>' +
      '</div>' +
      '<div class="ff-intro-steps">' +
      '  <div class="ff-intro-step"><b>&#9312;</b><span>리뷰 작성</span></div>' +
      '  <div class="ff-intro-step"><b>&#9313;</b><span>페필이 뽑기</span></div>' +
      '  <div class="ff-intro-step"><b>&#9314;</b><span>선물 받기</span></div>' +
      '</div>' +
      '<button type="button" class="primary-action ff-intro-start">참여 시작</button>';
    form.appendChild(intro);

    // 슬롯 컨테이너
    var slotWrap = document.createElement("div");
    slotWrap.className = "ff-slotwrap";
    slotWrap.style.display = "none";
    slotWrap.innerHTML =
      '<div class="ff-slot-head">' +
      '  <span class="ff-slot-eyebrow">STEP 01 &middot; 참여 정보</span>' +
      '  <span class="ff-slot-count"></span>' +
      '</div>' +
      '<div class="ff-slot-chips"></div>' +
      '<div class="ff-slot-active"></div>';
    form.appendChild(slotWrap);

    var state = { idx: 0 };
    var chipsEl = slotWrap.querySelector(".ff-slot-chips");
    var activeEl = slotWrap.querySelector(".ff-slot-active");
    var countEl = slotWrap.querySelector(".ff-slot-count");

    function value(slot) {
      if (slot.type === "consent") return slot.el.checked ? "동의함" : "";
      return (slot.el.value || "").trim();
    }
    function commit(slot) {
      if (slot.type === "consent") return slot.el.checked;
      var v = (slot.el.value || "").trim();
      if (!v) return false;
      if (slot.type === "tel" && !/^[0-9]{4}$/.test(v)) return false;
      return true;
    }
    function renderChips() {
      chipsEl.innerHTML = "";
      for (var i = 0; i < state.idx; i++) {
        (function (i) {
          var s = slots[i];
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "ff-chip";
          chip.innerHTML = '<span class="ff-chip-label">' + s.label + '</span>' +
            '<span class="ff-chip-val">' + (value(s) || "&mdash;") + '</span>' +
            '<span class="ff-chip-edit">수정</span>';
          chip.addEventListener("click", function () { state.idx = i; renderSlot(true); });
          chipsEl.appendChild(chip);
        })(i);
      }
    }
    function advance() {
      if (state.idx >= slots.length - 1) { submitBtn.click(); return; }
      state.idx++;
      renderSlot(true);
    }
    function stashInputs() {
      // 모든 input을 보관함으로 되돌려 DOM에 항상 살아있게 한다 (FormData 보장)
      slots.forEach(function (s) {
        if (s.el && s.el.parentNode !== originalWrap) {
          originalWrap.appendChild(s.el);
        }
      });
    }

    function renderSlot(animate) {
      renderChips();
      countEl.textContent = (state.idx + 1) + " / " + slots.length;
      var slot = slots[state.idx];
      var currentIndex = state.idx;
      stashInputs();
      activeEl.innerHTML = "";

      var card = document.createElement("div");
      card.className = "ff-slot-card";
      var q = document.createElement("div");
      q.className = "ff-slot-q";
      q.textContent = slot.q;
      card.appendChild(q);
      var err = document.createElement("div");
      err.className = "ff-slot-err";
      err.style.display = "none";

      if (slot.type === "consent") {
        var consentBox = document.createElement("button");
        consentBox.type = "button";
        consentBox.className = "ff-consent" + (slot.el.checked ? " is-on" : "");
        consentBox.innerHTML = '<span class="ff-consent-box"></span><span>이벤트 정보 저장에 동의합니다.</span>';
        consentBox.addEventListener("click", function () {
          slot.el.checked = !slot.el.checked;
          consentBox.classList.toggle("is-on", slot.el.checked);
          if (slot.el.checked) { err.style.display = "none"; setTimeout(advance, 280); }
        });
        card.appendChild(consentBox);
        card.appendChild(err);
        var hintc = document.createElement("div");
        hintc.className = "ff-slot-hint";
        hintc.textContent = "체크하면 다음 단계로 넘어가요";
        card.appendChild(hintc);
      } else {
        var holder = document.createElement("div");
        holder.className = "ff-slot-inputholder";
        slot.el.classList.add("ff-slot-input");
        holder.appendChild(slot.el);
        card.appendChild(holder);
        card.appendChild(err);

        if (slot.type === "tel") {
          var hintp = document.createElement("div");
          hintp.className = "ff-slot-hint";
          hintp.textContent = "4자리를 입력하면 자동으로 넘어가요";
          card.appendChild(hintp);
          slot.el.oninput = function () {
            err.style.display = "none";
            if (/^[0-9]{4}$/.test((slot.el.value || "").trim())) {
              setTimeout(function () {
                if (state.idx === currentIndex && commit(slot)) advance();
              }, 180);
            }
          };
        } else {
          var nextBtn = document.createElement("button");
          nextBtn.type = "button";
          nextBtn.className = "ff-slot-next";
          nextBtn.textContent = (state.idx === slots.length - 1) ? "다음 단계로" : "확인";
          nextBtn.disabled = !(slot.el.value || "").trim();
          card.appendChild(nextBtn);
          slot.el.oninput = function () {
            err.style.display = "none";
            nextBtn.disabled = !(slot.el.value || "").trim();
          };
          nextBtn.addEventListener("click", function () {
            if (commit(slot)) advance();
            else { err.style.display = "block"; err.textContent = "입력해 주세요."; }
          });
        }
        slot.el.onkeydown = function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            if (state.idx === currentIndex && commit(slot)) advance();
            else { err.style.display = "block"; err.textContent = slot.type === "tel" ? "숫자 4자리로 입력해 주세요." : "입력해 주세요."; }
          }
        };
      }

      activeEl.appendChild(card);
      if (animate) {
        card.style.opacity = "0";
        card.style.transform = "translateY(16px)";
        requestAnimationFrame(function () {
          card.style.transition = "opacity .35s cubic-bezier(.2,.8,.2,1), transform .35s cubic-bezier(.2,.8,.2,1)";
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        });
      }
      if (slot.type !== "consent") { try { slot.el.focus(); } catch (e) {} }
    }

    intro.querySelector(".ff-intro-start").addEventListener("click", function () {
      intro.style.display = "none";
      slotWrap.style.display = "block";
      state.idx = 0;
      renderSlot(true);
    });

    // app.js가 #registration-message에 띄우는 에러를 슬롯 화면에도 노출
    // (이름이 이니셜 같거나 검증 실패 시 사용자가 이유를 알 수 있게)
    var msgEl = form.querySelector("#registration-message");
    if (msgEl) {
      var slotMsg = document.createElement("p");
      slotMsg.className = "ff-slot-message";
      slotMsg.style.display = "none";
      slotWrap.appendChild(slotMsg);
      var msgObserver = new MutationObserver(function () {
        var text = (msgEl.textContent || "").trim();
        // app.js는 setMessage에서 inline color로 톤을 표현(danger=빨강, pending=골드, 기타=accent)
        var rgb = window.getComputedStyle(msgEl).color.replace(/\s/g, "");
        // --danger 계열(붉은색): R이 크고 G/B가 작은 색을 danger로 간주
        var m = rgb.match(/rgba?\((\d+),(\d+),(\d+)/);
        var isDanger = false;
        if (m) {
          var r = +m[1], g = +m[2], bl = +m[3];
          isDanger = (r > 120 && g < 110 && bl < 110);
        }
        if (text && slotWrap.style.display !== "none") {
          slotMsg.textContent = text;
          slotMsg.className = "ff-slot-message" + (isDanger ? " is-danger" : "");
          slotMsg.style.display = "block";
        } else {
          slotMsg.style.display = "none";
        }
      });
      msgObserver.observe(msgEl, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    }
  }

  function init() {
    syncProgressLabels();
    setupSlotForm();
    var pages = document.querySelectorAll(".wizard-page[data-wizard-step]");
    if (pages.length) {
      var observer = new MutationObserver(function () { syncProgressLabels(); });
      pages.forEach(function (page) {
        observer.observe(page, { attributes: true, attributeFilter: ["class", "hidden"] });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
