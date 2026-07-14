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

        // 이번 슬롯 렌더에 대한 진행 가드 (자동/엔터/버튼 중복 advance 방지)
        var advanced = false;
        function tryAdvance() {
          if (advanced || state.idx !== currentIndex) return;
          if (slot.type === "tel") {
            var onlyDigits = (slot.el.value || "").replace(/\D/g, "").slice(0, 4);
            if (slot.el.value !== onlyDigits) slot.el.value = onlyDigits;
          }
          if (commit(slot)) { advanced = true; advance(); }
          else { err.style.display = "block"; err.textContent = slot.type === "tel" ? "숫자 4자리로 입력해 주세요." : "입력해 주세요."; }
        }

        // 기존 리스너 제거를 위해 input을 깨끗한 복제본으로 교체
        // (요소를 재사용하면 이전 슬롯의 리스너가 누적되어 오작동)
        var prevValue = slot.el.value;
        var prevChecked = slot.el.checked;
        var fresh = slot.el.cloneNode(true);
        fresh.value = prevValue; // 타이핑한 값은 프로퍼티라 별도 복사
        fresh.checked = prevChecked;
        slot.el.parentNode.replaceChild(fresh, slot.el);
        slot.el = fresh; // 슬롯 참조 갱신 (FormData는 name 속성으로 읽으므로 유지됨)

        if (slot.type === "tel") {
          var hintp = document.createElement("div");
          hintp.className = "ff-slot-hint";
          hintp.textContent = "4자리를 입력하면 자동으로 넘어가요";
          card.appendChild(hintp);
          slot.el.oninput = function () {
            err.style.display = "none";
            var onlyDigits = (slot.el.value || "").replace(/\D/g, "").slice(0, 4);
            if (slot.el.value !== onlyDigits) slot.el.value = onlyDigits;
            if (/^[0-9]{4}$/.test((slot.el.value || "").trim())) {
              setTimeout(tryAdvance, 200);
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
          nextBtn.addEventListener("click", tryAdvance);
        }
        slot.el.onkeydown = function (e) {
          if (e.key === "Enter") { e.preventDefault(); tryAdvance(); }
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

  /* ---------- 3. 등급별 결과 화면 이펙트 ---------- */
  // 상품명 → 등급 매핑 (부분 일치). 매핑에 없으면 'low'로 안전 처리.
  function prizeTier(name) {
    var n = (name || "").replace(/\s/g, "");
    if (/피코|페이스핏/.test(n)) return "high";
    if (/베이직스킨케어|스킨케어/.test(n)) return "mid";
    return "low"; // 염증주사, 마스크팩, 기타
  }

  function clearEffectLayer() {
    var old = document.getElementById("ff-fx-layer");
    if (old) old.parentNode.removeChild(old);
  }

  function runConfetti(canvas) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var colors = ["#9a8357", "#c9b896", "#d8c79f", "#e7e8e4", "#ffffff", "#a9aba6"];
    var parts = [];
    for (var i = 0; i < 56; i++) {
      parts.push({ x: W / 2 + (Math.random() - 0.5) * 90, y: H * 0.32,
        vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 9 - 3, g: 0.28,
        s: Math.random() * 5 + 3, c: colors[~~(Math.random() * colors.length)],
        r: Math.random() * 3, vr: (Math.random() - 0.5) * 0.3, life: 0 });
    }
    var frame = 0;
    function tick() {
      ctx.clearRect(0, 0, W, H); frame++; var alive = false;
      parts.forEach(function (p) {
        p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        var op = Math.max(0, 1 - p.life / 95); if (op > 0) alive = true;
        ctx.save(); ctx.globalAlpha = op; ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      });
      if (alive && frame < 130) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    }
    tick();
  }

  function runSparkle(canvas) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var stars = [];
    for (var i = 0; i < 13; i++) {
      stars.push({ x: W * 0.28 + Math.random() * W * 0.44, y: H * 0.18 + Math.random() * H * 0.3,
        s: Math.random() * 2.5 + 1, sp: 0.08 + Math.random() * 0.06, delay: Math.random() * 30 });
    }
    var frame = 0;
    function tick() {
      ctx.clearRect(0, 0, W, H); frame++;
      stars.forEach(function (st) {
        if (frame < st.delay) return;
        var tw = (Math.sin((frame - st.delay) * st.sp) + 1) / 2;
        ctx.save(); ctx.globalAlpha = tw * 0.9; ctx.fillStyle = "#c9b896";
        ctx.translate(st.x, st.y); var r = st.s * (0.6 + tw * 0.6);
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
          var a = k * Math.PI / 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.32, Math.sin(a + Math.PI / 4) * r * 0.32);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      });
      if (frame < 160) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    }
    tick();
  }

  function reorderResult(summary, card) {
    // A안: 축하존(상품 카드)을 맨 위로, 직원 확인용(staff-checklist)을 아래로
    if (card.getAttribute("data-ff-reordered") === "1") return;
    var staff = summary.querySelector(".staff-checklist");
    var sessionDone = summary.querySelector(".session-complete");
    if (sessionDone) {
      if (sessionDone.nextSibling !== card) summary.insertBefore(card, sessionDone.nextSibling);
    } else {
      if (summary.firstChild !== card) summary.insertBefore(card, summary.firstChild);
    }
    if (staff && staff !== card.nextSibling) {
      summary.insertBefore(staff, card.nextSibling);
    }
    card.setAttribute("data-ff-reordered", "1");
  }

  function applyResultEffect() {
    var summary = document.getElementById("final-summary");
    if (!summary) return;
    var card = summary.querySelector(".final-result-card");
    if (!card) { clearEffectLayer(); return; }
    reorderResult(summary, card);
    var nameEl = card.querySelector("strong");
    if (!nameEl) return;

    // PASS 6: 티켓 발급 푸터 (1회만)
    if (!card.querySelector(".ff-ticket-foot")) {
      var foot = document.createElement("div");
      foot.className = "ff-ticket-foot";
      var now = new Date();
      var pad = function (n) { return (n < 10 ? "0" : "") + n; };
      foot.innerHTML =
        "<span>FACE FILTER 천호점</span>" +
        "<span>발급 " + now.getFullYear() + "." + pad(now.getMonth() + 1) + "." + pad(now.getDate()) +
        " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + "</span>";
      card.appendChild(foot);
    }
    // PASS 6: 캡처 안내 (1회만, 카드 바로 아래)
    if (!summary.querySelector(".ff-capture-hint")) {
      var hint = document.createElement("p");
      hint.className = "ff-capture-hint";
      hint.textContent = "직원 확인 전까지 이 화면을 캡처해 두면 안전해요";
      if (card.nextSibling) summary.insertBefore(hint, card.nextSibling);
      else summary.appendChild(hint);
    }
    // PASS 6: 카톡채널 상태값 톤 구분 (미추가=조용히 / 추가 완료=골드 체크)
    card.querySelectorAll("dl dd").forEach(function (dd) {
      var t = (dd.textContent || "").trim();
      if (t === "미추가") dd.classList.add("ff-dd-quiet");
      else if (t.indexOf("추가") !== -1 && t.indexOf("완료") !== -1) dd.classList.add("ff-dd-done");
    });

    var prizeName = nameEl.textContent || "";
    var tier = prizeTier(prizeName);

    // 이미 같은 등급으로 처리했으면 중복 실행 방지
    if (card.getAttribute("data-ff-tier") === tier && document.getElementById("ff-fx-layer")) return;
    card.setAttribute("data-ff-tier", tier);
    summary.setAttribute("data-ff-tier", tier);
    clearEffectLayer();

    // PASS 3: 첫 노출 시 서스펜스 홀드(두구두구) 후 공개.
    // 홀드 동안 콘텐츠는 CSS(.ff-revealing)로 가려지고, 해제 시 .ff-revealed가 등장 모션 트리거.
    if (!summary.hasAttribute("data-ff-revealed")) {
      summary.setAttribute("data-ff-revealed", "1");
      summary.classList.add("ff-revealing");
      setTimeout(function () {
        summary.classList.remove("ff-revealing");
        summary.classList.add("ff-revealed");
        applyResultEffect(); // 홀드 해제 후 등급 이펙트(컨페티 등) 재실행
      }, 1250);
      summary.classList.remove("ff-tier-high", "ff-tier-mid", "ff-tier-low");
      summary.classList.add("ff-tier-" + tier);
      return; // 이펙트는 공개 시점에 실행
    }

    // 등급 클래스 부여 (CSS가 글로우/크기/배지 처리)
    summary.classList.remove("ff-tier-high", "ff-tier-mid", "ff-tier-low");
    summary.classList.add("ff-tier-" + tier);

    // 배지 문구 삽입 (상/중만, 카드 위에)
    var badgeText = tier === "high" ? "\u2726 특별 상품 당첨!" : tier === "mid" ? "당첨!" : "선물이 준비됐어요";
    var head = card.querySelector(".final-prize-head");

    // 페필이 축하존: 결과 카드 최상단에 페필이 + 배지 삽입
    var pep = card.querySelector(".ff-result-pep");
    if (!pep) {
      pep = document.createElement("div");
      pep.className = "ff-result-pep";
      pep.innerHTML = '<div class="ff-result-pep-img"></div>';
      card.insertBefore(pep, card.firstChild);
    }

    var existingBadge = card.querySelector(".ff-prize-badge");
    if (!existingBadge) {
      var badge = document.createElement("div");
      badge.className = "ff-prize-badge";
      badge.textContent = badgeText;
      // 배지는 페필이 다음, 헤더 앞에
      if (head) card.insertBefore(badge, head);
      else card.insertBefore(badge, pep.nextSibling);
    } else {
      existingBadge.textContent = badgeText;
    }

    // 컨페티/스파클 캔버스 (상/중)
    if (tier === "high" || tier === "mid") {
      var layer = document.createElement("div");
      layer.id = "ff-fx-layer";
      layer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden;";
      var rect = summary.getBoundingClientRect();
      var cv = document.createElement("canvas");
      cv.width = Math.max(300, Math.round(rect.width));
      cv.height = Math.max(300, Math.round(rect.height));
      cv.style.cssText = "width:100%;height:100%;";
      layer.appendChild(cv);
      // summary가 static이면 relative로
      if (getComputedStyle(summary).position === "static") summary.style.position = "relative";
      summary.appendChild(layer);
      if (tier === "high") { runConfetti(cv); runSparkle(cv); }
      else runSparkle(cv);
    }
  }

  /* ---------- 4. 확률표 접기 (기본 접힘, 헤딩 클릭 시 펼침) ---------- */
  function setupOddsFold() {
    var odds = document.getElementById("customer-prize-odds");
    if (!odds) return;
    // app.js가 다시 그릴 수 있으므로 매번 상태 확인
    var heading = odds.querySelector(".odds-heading");
    var list = odds.querySelector(".odds-list");
    if (!heading || !list) return;
    if (heading.dataset.ffFold === "1") return;
    heading.dataset.ffFold = "1";

    // 헤딩에 토글 화살표 추가
    if (!heading.querySelector(".ff-odds-toggle")) {
      var toggle = document.createElement("span");
      toggle.className = "ff-odds-toggle";
      toggle.textContent = "확률 보기 ▾";
      heading.appendChild(toggle);
    }
    // 기본 접힘
    odds.classList.add("ff-odds-collapsed");
    heading.style.cursor = "pointer";
    heading.setAttribute("role", "button");
    heading.addEventListener("click", function () {
      var collapsed = odds.classList.toggle("ff-odds-collapsed");
      var t = heading.querySelector(".ff-odds-toggle");
      if (t) t.textContent = collapsed ? "확률 보기 ▾" : "접기 ▴";
    });
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
    // 결과 화면 감시 → 등급 이펙트
    var summary = document.getElementById("final-summary");
    if (summary) {
      var fxObserver = new MutationObserver(function () {
        if (window.__ffApplying) return;
        window.__ffApplying = true;
        try { applyResultEffect(); } finally {
          setTimeout(function () { window.__ffApplying = false; }, 0);
        }
      });
      fxObserver.observe(summary, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      window.__ffApplying = true;
      try { applyResultEffect(); } finally { setTimeout(function () { window.__ffApplying = false; }, 0); }
    }

    // 확률표 접기 (app.js가 다시 그릴 수 있으므로 감시)
    var oddsEl = document.getElementById("customer-prize-odds");
    if (oddsEl) {
      setupOddsFold();
      var oddsObserver = new MutationObserver(function () { setupOddsFold(); });
      oddsObserver.observe(oddsEl, { childList: true });
    }

    // ── 네이버 검수 원클릭 (관리자 참여자 표) ─────────────────────────
    // 각 행에 "N 검수" 버튼: 클릭 시 리뷰 닉네임 클립보드 복사 + 플레이스 리뷰 페이지 새 탭
    var NAVER_REVIEW_URL = "https://m.place.naver.com/hospital/1958856197/review/visitor?reviewSort=recent";

    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      return Promise.resolve();
    }

    function enhanceAdminTable() {
      var table = document.getElementById("participant-table");
      if (!table) return;
      table.querySelectorAll("tr[data-participant-row]").forEach(function (row) {
        var actions = row.querySelector(".row-actions");
        if (!actions || actions.querySelector(".ff-naver-audit")) return;
        var spans = row.querySelectorAll(".identity span");
        var nick = "";
        spans.forEach(function (s) {
          var t = (s.textContent || "").trim();
          if (t.indexOf("리뷰 ") === 0) nick = t.slice(3).trim();
        });
        if (!nick) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "small-action ff-naver-audit";
        btn.innerHTML = '<b>N</b>검수';
        btn.title = "닉네임 복사 + 네이버 리뷰 열기";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          copyText(nick).then(function () {
            var old = btn.innerHTML;
            btn.innerHTML = "복사됨 ✓";
            btn.classList.add("is-copied");
            setTimeout(function () { btn.innerHTML = old; btn.classList.remove("is-copied"); }, 1400);
          });
          window.open(NAVER_REVIEW_URL, "_blank", "noopener");
        });
        actions.appendChild(btn);
      });
    }

    var adminTable = document.getElementById("participant-table");
    if (adminTable) {
      enhanceAdminTable();
      var adminObserver = new MutationObserver(function () { enhanceAdminTable(); });
      adminObserver.observe(adminTable, { childList: true, subtree: true });
    }

    // ── 지급/사용 팀 추적 ──────────────────────────────────────────────
    var FF_TEAMS = ["코디팀", "어시팀", "피부팀", "간호팀"];

    // 문서 레벨 캡처 가드: "사용처리 폼이 열려 있는 행"에서 폼 바깥을
    // 클릭(여백·빗맞은 탭 포함)해도 행 select → 탭 전환이 발동하지 않게 차단.
    // 폼 내부 타깃은 통과시켜 자체 핸들러(확인/취소/입력)가 정상 작동한다.
    ["click", "mousedown", "pointerdown", "touchstart"].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest(".ff-use-form")) return;                 // 폼 내부: 통과
        var row = t.closest("tr[data-participant-row]");
        if (row && row.querySelector(".ff-use-form")) {
          e.stopPropagation();                                  // 폼 열린 행의 외부 조작 차단
        }
      }, true);
    });

    // 재렌더 생존: 열려 있던 사용처리 폼 상태를 기억했다가 복원
    var ffOpenUseState = null; // { pid, team, staff }

    // 계정 기반 팀 자동 감지: 프로필 표시명 → 로그인 이메일 → 저장값 순
    function ffDetectTeam() {
      var KW = [
        ["코디", "코디팀"], ["codi", "코디팀"], ["coordi", "코디팀"],
        ["어시", "어시팀"], ["assi", "어시팀"],
        ["간호", "간호팀"], ["nurse", "간호팀"], ["ganho", "간호팀"], ["khanhou", "간호팀"],
        ["피부", "피부팀"], ["skin", "피부팀"], ["pibu", "피부팀"], ["pb1", "피부팀"]
      ];
      function match(s) {
        if (!s) return null;
        s = String(s).toLowerCase();
        for (var i = 0; i < KW.length; i++) {
          if (s.indexOf(KW[i][0]) !== -1) return KW[i][1];
        }
        return null;
      }
      try {
        var st = JSON.parse(localStorage.getItem("skinReviewEventMvp.v8") || "{}");
        var byName = match(st && st.staffProfile && st.staffProfile.display_name);
        if (byName) return byName;
      } catch (e) {}
      try {
        var au = JSON.parse(localStorage.getItem("skinReviewEventMvp.adminAuth.v1") || "{}");
        var byEmail = match(au && au.email);
        if (byEmail) return byEmail;
      } catch (e) {}
      return null;
    }

    function ffGetTeam() {
      var sel = document.getElementById("ff-gift-team");
      // 잠금(기록완료) 상태의 select는 '그 레코드의 저장팀'이므로 처리자 팀으로 쓰지 않음
      return (sel && !sel.disabled && sel.value) || ffDetectTeam() || localStorage.getItem("ff_gift_team") || "코디팀";
    }

    // 현재 상세패널에 떠 있는 참여자 id (선택 행 → 앱 상태 순으로 조회)
    function ffSelectedPid() {
      var row = document.querySelector("tr[data-participant-row].is-selected");
      if (row) return row.getAttribute("data-participant-row");
      try {
        var st = JSON.parse(localStorage.getItem("skinReviewEventMvp.v8") || "{}");
        return (st && st.selectedParticipantId) || null;
      } catch (e) { return null; }
    }

    // 레코드에 저장된 담당 팀 (usageCache의 giftTeam). 캐시 없으면 로드 트리거.
    function ffSavedTeamFor(pid) {
      if (!pid) return null;
      var cache = window.__ffUsageCache;
      if (!cache) {
        if (window.__ffLoadUsage) window.__ffLoadUsage(); // 로드 완료 시 옵저버가 재동기화
        return null;
      }
      var item = cache.get(pid);
      return (item && item.giftTeam) || null;
    }

    // 담당자명 입력 옆 팀 드롭다운
    // - 지급 기록 완료(잠금) 레코드: **저장된 팀**을 표시 (뷰어 계정과 무관)
    // - 신규 입력: 계정 자동 감지 → 기기 마지막 선택 → 코디팀
    function injectTeamSelect() {
      var staffInput = document.getElementById("staff-name");
      if (staffInput && !document.getElementById("ff-gift-team")) {
        var sel = document.createElement("select");
        sel.id = "ff-gift-team";
        sel.className = "ff-team-select";
        sel.setAttribute("aria-label", "담당 팀");
        var isLocked = Boolean(staffInput.disabled);
        var recordTeam = isLocked ? ffSavedTeamFor(ffSelectedPid()) : null;
        var auto = isLocked ? null : ffDetectTeam();
        var initial = recordTeam || auto ||
          (isLocked ? null : localStorage.getItem("ff_gift_team")) || "코디팀";
        FF_TEAMS.forEach(function (t) {
          var o = document.createElement("option");
          o.value = t; o.textContent = t + (auto === t ? " (자동)" : "");
          if (t === initial) o.selected = true;
          sel.appendChild(o);
        });
        // 저장된 팀이 표준 목록 밖이어도 그대로 표시
        if (recordTeam && FF_TEAMS.indexOf(recordTeam) === -1) {
          var extra = document.createElement("option");
          extra.value = recordTeam; extra.textContent = recordTeam;
          extra.selected = true;
          sel.appendChild(extra);
        }
        if (auto) {
          localStorage.setItem("ff_gift_team", auto);
          sel.classList.add("is-auto");
          sel.title = "계정(" + auto + ") 기준 자동 선택됨 — 필요 시 변경 가능";
        }
        sel.addEventListener("change", function () {
          if (!sel.disabled) localStorage.setItem("ff_gift_team", sel.value);
        });
        staffInput.insertAdjacentElement("afterend", sel);
      }
      // 잠금 동기화: 담당자명이 저장돼 잠기면(disabled) 팀·차트번호도 함께 잠금.
      // 메모만 수정 가능 상태로 유지.
      var staff = document.getElementById("staff-name");
      var team = document.getElementById("ff-gift-team");
      var chart = document.getElementById("customer-chart-no");
      var locked = Boolean(staff && staff.disabled);
      if (team && team.disabled !== locked) {
        team.disabled = locked;
        team.title = locked ? "지급 기록 후에는 팀을 수정할 수 없습니다" : "";
      }
      // 잠금 레코드는 저장된 팀으로 상시 재동기화
      // (usageCache 지연 로드·재렌더 후에도 뷰어 값이 아닌 기록값 유지)
      if (team && locked) {
        var savedTeam = ffSavedTeamFor(ffSelectedPid());
        if (savedTeam && team.value !== savedTeam) {
          if (!Array.prototype.some.call(team.options, function (o) { return o.value === savedTeam; })) {
            var op = document.createElement("option");
            op.value = savedTeam; op.textContent = savedTeam;
            team.appendChild(op);
          }
          team.value = savedTeam;
          team.classList.remove("is-auto");
          team.title = "지급 당시 기록된 팀: " + savedTeam;
        }
      }
      if (chart && locked && !chart.disabled) {
        chart.disabled = true;
        chart.title = "지급 기록 후에는 차트번호를 수정할 수 없습니다";
      }
    }
    injectTeamSelect();
    window.__ffSyncTeamSelect = injectTeamSelect; // usageCache 로드 후 재동기화 훅
    var bodyObserver = new MutationObserver(function () { injectTeamSelect(); });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // 지급 완료 래퍼: 성공 시 팀 기록 (마스크팩은 서버에서 자동 사용 처리)
    // 담당자 저장으로 이미 팀이 기록된 건(select 잠금 상태)은 덮어쓰지 않는다.
    if (window.FaceFilterSupabase && window.FaceFilterSupabase.completeGift && !window.FaceFilterSupabase.__ffGiftWrapped) {
      var origCompleteGift = window.FaceFilterSupabase.completeGift.bind(window.FaceFilterSupabase);
      window.FaceFilterSupabase.completeGift = async function (args) {
        var sel = document.getElementById("ff-gift-team");
        var unlockedTeam = (sel && !sel.disabled) ? sel.value : null; // 미저장 상태에서 바로 지급하는 경우
        var result = await origCompleteGift(args);
        try {
          if (unlockedTeam) {
            await window.FaceFilterSupabase.setGiftTeam({
              participantId: args.participantId,
              team: unlockedTeam
            });
          } else if (!ffSavedTeamFor(args.participantId)) {
            // 레거시 보정: 저장팀 기록이 전혀 없는 옛 레코드만 뷰어 기준으로 채움
            await window.FaceFilterSupabase.setGiftTeam({
              participantId: args.participantId,
              team: ffDetectTeam() || localStorage.getItem("ff_gift_team") || "코디팀"
            });
          }
        } catch (e) {
          console.warn("[ff] 지급 팀 기록 실패:", e && e.message);
        }
        return result;
      };
      window.FaceFilterSupabase.__ffGiftWrapped = true;
    }

    // 담당자 저장 래퍼: 최초 저장 성공 시 그 순간 선택돼 있던 팀을 함께 기록
    // (기존엔 지급완료 시점에만 팀이 기록돼, 저장자≠지급자일 때 팀이 어긋났음)
    if (window.FaceFilterSupabase && window.FaceFilterSupabase.updateParticipantStaffFields && !window.FaceFilterSupabase.__ffStaffWrapped) {
      var origUpdateStaff = window.FaceFilterSupabase.updateParticipantStaffFields.bind(window.FaceFilterSupabase);
      window.FaceFilterSupabase.updateParticipantStaffFields = async function (args) {
        var sel = document.getElementById("ff-gift-team");
        var wasUnlocked = Boolean(sel && !sel.disabled); // 최초 저장(팀 선택 가능 상태)일 때만
        var chosenTeam = wasUnlocked ? sel.value : null;
        var result = await origUpdateStaff(args);
        if (result && result.ok && chosenTeam && args && args.staffName) {
          try {
            await window.FaceFilterSupabase.setGiftTeam({
              participantId: args.participantId,
              team: chosenTeam
            });
            if (window.__ffLoadUsage) window.__ffLoadUsage(); // 캐시 갱신 → 표시 동기화
          } catch (e) {
            console.warn("[ff] 담당자 저장 팀 기록 실패:", e && e.message);
          }
        }
        return result;
      };
      window.FaceFilterSupabase.__ffStaffWrapped = true;
    }

    // 관리자 행: 내원형 상품 [사용처리] 버튼
    function enhanceUsageButtons() {
      var table = document.getElementById("participant-table");
      if (!table) return;
      table.querySelectorAll("tr[data-participant-row]").forEach(function (row) {
        var actions = row.querySelector(".row-actions");
        if (!actions || actions.querySelector(".ff-use-gift")) return;
        var pid = row.getAttribute("data-participant-row");
        var rowText = row.textContent || "";
        var lc = row.getAttribute("data-ff-lifecycle");
        // 지급된 건만 — 수명주기 배지로 라벨이 치환된 뒤에도 인식되도록 속성 병행 확인
        if (rowText.indexOf("지급완료") === -1 && lc !== "사용대기" && lc !== "사용완료") return;
        var cells = row.querySelectorAll("td");
        var prize = cells.length >= 4 ? (cells[3].textContent || "").trim() : "";
        if (!prize || prize === "-" || prize.indexOf("마스크팩") !== -1) return; // 내원형만
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "small-action ff-use-gift";
        btn.textContent = "사용처리";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          openUseForm(actions, btn, pid, prize);
        });
        actions.appendChild(btn);
        // 재렌더 복원: 이 행의 폼이 열려 있던 상태였다면 값 포함 재생성
        if (ffOpenUseState && ffOpenUseState.pid === pid) {
          openUseForm(actions, btn, pid, prize, ffOpenUseState);
        }
      });
    }

    function openUseForm(actions, btn, pid, prize, restore) {
      if (actions.querySelector(".ff-use-form")) return;
      var form = document.createElement("div");
      form.className = "ff-use-form";
      // 폼 내부의 모든 상호작용(셀렉트·입력 포함)이 행 클릭(참여자 선택)으로
      // 전파돼 재렌더 → 폼이 닫히는 문제 방지: 컨테이너 레벨에서 전면 차단
      ["click", "mousedown", "pointerdown", "touchstart", "change", "focusin"].forEach(function (ev) {
        form.addEventListener(ev, function (e) { e.stopPropagation(); });
      });
      var initTeam = (restore && restore.team) || ffGetTeam();
      var opts = FF_TEAMS.map(function (t) {
        return '<option value="' + t + '"' + (t === initTeam ? " selected" : "") + ">" + t + "</option>";
      }).join("");
      form.innerHTML =
        '<select class="ff-use-team">' + opts + "</select>" +
        '<input class="ff-use-staff" type="text" placeholder="처리 담당자" />' +
        '<button type="button" class="small-action ff-use-ok">확인</button>' +
        '<button type="button" class="small-action ff-use-cancel">취소</button>';
      actions.appendChild(form);
      if (restore && restore.staff) form.querySelector(".ff-use-staff").value = restore.staff;
      ffOpenUseState = { pid: pid, team: initTeam, staff: (restore && restore.staff) || "" };
      form.querySelector(".ff-use-team").addEventListener("change", function () {
        if (ffOpenUseState) ffOpenUseState.team = this.value;
      });
      form.querySelector(".ff-use-staff").addEventListener("input", function () {
        if (ffOpenUseState) ffOpenUseState.staff = this.value;
      });
      form.querySelector(".ff-use-cancel").addEventListener("click", function (e) {
        e.stopPropagation(); ffOpenUseState = null; form.remove();
      });
      form.querySelector(".ff-use-ok").addEventListener("click", async function (e) {
        e.stopPropagation();
        var team = form.querySelector(".ff-use-team").value;
        var staff = (form.querySelector(".ff-use-staff").value || "").trim();
        if (!staff) { form.querySelector(".ff-use-staff").focus(); return; }
        try {
          var res = await window.FaceFilterSupabase.markGiftUsed({ participantId: pid, staffName: staff, team: team });
          if (res && res.ok) {
            ffOpenUseState = null;
            form.remove();
            btn.textContent = "사용완료 ✓";
            btn.disabled = true;
            btn.classList.add("is-used");
            if (window.__ffLoadUsage) window.__ffLoadUsage();
          } else if (res && res.code === "already_used") {
            ffOpenUseState = null;
            form.remove();
            btn.textContent = "이미 사용처리됨";
            btn.disabled = true;
            btn.classList.add("is-used");
          } else {
            alert("사용처리 실패: " + ((res && res.code) || "unknown"));
          }
        } catch (err) {
          alert("사용처리 실패: " + (err && err.message));
        }
      });
    }

    if (adminTable) {
      enhanceUsageButtons();
      new MutationObserver(function () { enhanceUsageButtons(); })
        .observe(adminTable, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// =====================================================================
// PASS 9.3 — 상단 헤더 접힘 (스크롤 다운 시 숨김 / 업 시 복귀)
// =====================================================================
(function () {
  var topbar = document.querySelector(".topbar");
  if (!topbar) return;
  var lastY = window.scrollY || 0;
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var delta = y - lastY;
      if (y > 72 && delta > 4) {
        topbar.classList.add("ff-topbar-folded");   // 내림: 접기
      } else if (delta < -4 || y <= 72) {
        topbar.classList.remove("ff-topbar-folded"); // 올림/최상단: 복귀
      }
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
})();

// =====================================================================
// PASS 10 — 지급/사용 현황 페이지 + 표 사용상태 반영
// 읽기 경로(ff_get_gift_usage)로 사용처리 상태를 화면에 지속 반영한다.
// =====================================================================
(function () {
  var usageCache = null;   // Map<participantId, item>
  var loading = false;

  function isInstant(name) { return (name || "").indexOf("마스크팩") !== -1; }

  function fmtTime(iso) {
    if (!iso) return "-";
    var d = new Date(iso);
    if (isNaN(d)) return "-";
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return (d.getMonth() + 1) + "." + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  async function loadUsage() {
    if (loading) return usageCache;
    if (!window.FaceFilterSupabase || !window.FaceFilterSupabase.getGiftUsage) return null;
    loading = true;
    try {
      var res = await window.FaceFilterSupabase.getGiftUsage();
      if (res && res.ok && Array.isArray(res.items)) {
        usageCache = new Map(res.items.map(function (it) { return [it.id, it]; }));
        window.__ffUsageCache = usageCache;
        annotateRows();
        renderUsagePage();
        if (window.__ffApplyLifecycle) window.__ffApplyLifecycle();
        if (window.__ffSyncTeamSelect) window.__ffSyncTeamSelect(); // 잠금 레코드 팀 표시 재동기화
      }
    } catch (e) {
      console.warn("[ff] 지급/사용 조회 실패:", e && e.message);
    } finally {
      loading = false;
    }
    return usageCache;
  }
  window.__ffLoadUsage = loadUsage; // 사용처리 성공 후 갱신용

  // 표의 각 행에 사용 상태 반영: 사용완료면 버튼 → 상태 칩
  function annotateRows() {
    if (!usageCache) return;
    var table = document.getElementById("participant-table");
    if (!table) return;
    table.querySelectorAll("tr[data-participant-row]").forEach(function (row) {
      var pid = row.getAttribute("data-participant-row");
      var item = usageCache.get(pid);
      if (!item || !item.usedAt) return;
      var actions = row.querySelector(".row-actions");
      if (!actions) return;
      var btn = actions.querySelector(".ff-use-gift");
      if (btn && !btn.classList.contains("is-used")) {
        btn.textContent = "사용완료 ✓";
        btn.disabled = true;
        btn.classList.add("is-used");
        btn.title = (item.usedTeam || "") + " · " + (item.usedStaff || "") + " · " + fmtTime(item.usedAt);
      }
    });
  }

  // 지급/사용 현황 페이지 렌더
  function renderUsagePage() {
    var root = document.getElementById("ff-usage-root");
    if (!root || !usageCache) return;
    var items = Array.from(usageCache.values());
    if (!items.length) {
      root.innerHTML = '<p class="empty-detail">아직 지급 완료된 참여자가 없습니다.</p>';
      return;
    }
    var used = items.filter(function (i) { return i.usedAt; });
    var pending = items.filter(function (i) { return !i.usedAt && !isInstant(i.prizeName); });

    // 팀별 요약
    var teamCount = {};
    used.forEach(function (i) {
      var t = i.usedTeam || "(미지정)";
      teamCount[t] = (teamCount[t] || 0) + 1;
    });
    var summary = Object.keys(teamCount).map(function (t) {
      return '<span class="ff-usage-chip"><b>' + t + "</b>" + teamCount[t] + "건</span>";
    }).join("");

    function rowsHtml(list, showUsed) {
      return list.map(function (i) {
        return "<tr>" +
          "<td><strong>" + (i.customerName || "-") + "</strong><br><small>" + (i.naverHandle || "") + " · " + (i.phoneLast4 || "") + "</small></td>" +
          "<td>" + (i.prizeName || "-") + (isInstant(i.prizeName) ? ' <em class="ff-tag-instant">즉시</em>' : "") + "</td>" +
          "<td>" + (i.giftTeam || "-") + "<br><small>" + fmtTime(i.giftAt) + "</small></td>" +
          (showUsed
            ? "<td>" + (i.usedTeam || "-") + " · " + (i.usedStaff || "-") + "<br><small>" + fmtTime(i.usedAt) + "</small></td>"
            : "") +
          "</tr>";
      }).join("");
    }

    root.innerHTML =
      '<div class="ff-usage-summary">' +
        '<span class="ff-usage-chip is-total"><b>사용완료</b>' + used.length + "건</span>" +
        summary +
        '<span class="ff-usage-chip is-pending"><b>미사용 시술권</b>' + pending.length + "건</span>" +
      "</div>" +
      '<h3 class="ff-usage-h">사용완료 (' + used.length + ")</h3>" +
      '<div class="table-wrap"><table class="ff-usage-table"><thead><tr>' +
      "<th>고객</th><th>상품</th><th>지급</th><th>사용</th></tr></thead><tbody>" +
      rowsHtml(used, true) + "</tbody></table></div>" +
      '<h3 class="ff-usage-h">미사용 시술권 — 내원 대기 (' + pending.length + ")</h3>" +
      '<input type="search" class="ff-usage-search" id="ff-usage-search" placeholder="고객명 · 휴대폰 뒤 4자리 · 닉네임으로 검색" />' +
      '<div class="table-wrap"><table class="ff-usage-table" id="ff-pending-table"><thead><tr>' +
      "<th>고객</th><th>상품</th><th>지급</th><th></th></tr></thead><tbody>" +
      pending.map(function (i) {
        return '<tr data-ff-usage-row="' + i.id + '" data-ff-search="' +
          ((i.customerName || "") + " " + (i.phoneLast4 || "") + " " + (i.naverHandle || "")).toLowerCase() + '">' +
          "<td><strong>" + (i.customerName || "-") + "</strong><br><small>" + (i.naverHandle || "") + " · " + (i.phoneLast4 || "") + "</small></td>" +
          "<td>" + (i.prizeName || "-") + "</td>" +
          "<td>" + (i.giftTeam || "-") + "<br><small>" + fmtTime(i.giftAt) + "</small></td>" +
          '<td class="ff-usage-act"><button type="button" class="small-action ff-usage-use" data-id="' + i.id + '">사용처리</button></td>' +
          "</tr>";
      }).join("") + "</tbody></table></div>";

    // 검색 필터
    var search = document.getElementById("ff-usage-search");
    if (search) {
      search.addEventListener("input", function () {
        var q = search.value.trim().toLowerCase();
        document.querySelectorAll("#ff-pending-table tbody tr").forEach(function (tr) {
          tr.style.display = !q || (tr.getAttribute("data-ff-search") || "").indexOf(q) !== -1 ? "" : "none";
        });
      });
    }
    // 즉석 사용처리 (미니폼 인라인)
    root.querySelectorAll(".ff-usage-use").forEach(function (b) {
      b.addEventListener("click", function () {
        var cell = b.closest(".ff-usage-act");
        if (cell.querySelector(".ff-use-form")) return;
        var teams = ["코디팀", "어시팀", "피부팀", "간호팀"];
        var def = localStorage.getItem("ff_gift_team") || "코디팀";
        var f = document.createElement("div");
        f.className = "ff-use-form";
        f.innerHTML = '<select class="ff-use-team">' +
          teams.map(function (t) { return '<option' + (t === def ? " selected" : "") + ">" + t + "</option>"; }).join("") +
          '</select><input class="ff-use-staff" type="text" placeholder="처리 담당자" />' +
          '<button type="button" class="small-action ff-use-ok">확인</button>' +
          '<button type="button" class="small-action ff-use-cancel">취소</button>';
        cell.appendChild(f);
        f.querySelector(".ff-use-cancel").addEventListener("click", function () { f.remove(); });
        f.querySelector(".ff-use-ok").addEventListener("click", async function () {
          var staff = f.querySelector(".ff-use-staff").value.trim();
          if (!staff) { f.querySelector(".ff-use-staff").focus(); return; }
          try {
            var r = await window.FaceFilterSupabase.markGiftUsed({
              participantId: b.getAttribute("data-id"),
              staffName: staff,
              team: f.querySelector(".ff-use-team").value
            });
            if (r && (r.ok || r.code === "already_used")) loadUsage();
            else alert("사용처리 실패: " + ((r && r.code) || "unknown"));
          } catch (err) { alert("사용처리 실패: " + (err && err.message)); }
        });
      });
    });
  }

  // 트리거: 탭 클릭 / 새로고침 버튼 / 표 갱신
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-tab="usage"]') || t.closest("#ff-usage-refresh")) {
      loadUsage();
    }
  });
  var tableEl = document.getElementById("participant-table");
  if (tableEl) {
    new MutationObserver(function () {
      if (usageCache) annotateRows();
      else if (tableEl.querySelector("tr")) loadUsage(); // 최초 데이터 로드 시 1회
    }).observe(tableEl, { childList: true, subtree: true });
  }
})();

// =====================================================================
// PASS 11 — 상품 수명주기 배지 + 미사용 고객 빠른 처리
// 상태 언어: 증정완료(즉시형 종결) / 사용대기(내원형, 골드) / 사용완료(종결)
// =====================================================================
(function () {
  function isInstant(name) { return (name || "").indexOf("마스크팩") !== -1; }
  function cache() {
    // PASS 10의 usageCache 접근 (전역 로더가 관리)
    return window.__ffUsageCache || null;
  }

  // ---------- 1) 리뷰 칸 배지 치환 ----------
  function applyLifecycleBadges() {
    var uc = cache();
    var table = document.getElementById("participant-table");
    if (!table) return;
    table.querySelectorAll("tr[data-participant-row]").forEach(function (row) {
      var pid = row.getAttribute("data-participant-row");
      var hint = row.querySelector(".progress-hint");
      if (!hint) return;
      var label = hint.querySelector("span:last-child");
      if (!label) return;
      var current = (label.textContent || "").trim();
      // "지급완료" 상태만 수명주기 배지로 치환 (그 외 진행 단계는 app.js 원문 유지)
      var isGiftDone = current === "지급완료" || hint.hasAttribute("data-ff-lifecycle");
      if (!isGiftDone) return;
      var cells = row.querySelectorAll("td");
      var prize = cells.length >= 4 ? (cells[3].textContent || "").trim() : "";
      var item = uc ? uc.get(pid) : null;
      var next;
      if (isInstant(prize)) next = "증정완료";
      else if (item && item.usedAt) next = "사용완료";
      else next = "사용대기";
      if (current !== next) label.textContent = next;
      hint.setAttribute("data-ff-lifecycle", next);
      row.setAttribute("data-ff-lifecycle", next);
    });
  }

  // ---------- 1.5) 사용대기 행 지급 경과일 (D+N) ----------
  function applyDplusTags() {
    var uc = cache();
    if (!uc) return;
    var table = document.getElementById("participant-table");
    if (!table) return;
    table.querySelectorAll('tr[data-ff-lifecycle="사용대기"]').forEach(function (row) {
      var pid = row.getAttribute("data-participant-row");
      var it = uc.get(pid);
      if (!it || !it.giftAt) return;
      var hint = row.querySelector(".progress-hint");
      if (!hint || hint.querySelector(".ff-dplus")) return;
      var days = Math.floor((Date.now() - new Date(it.giftAt).getTime()) / 86400000);
      if (days < 1) return;
      var em = document.createElement("em");
      em.className = "ff-dplus";
      em.textContent = "D+" + days;
      if (days >= 30) em.classList.add("is-stale");
      hint.appendChild(em);
    });
  }

  // ---------- 2) 미사용 작업대: 필터 토글 + 즉석 검색 + 정렬 ----------
  var filterOn = false;
  var quickQuery = "";
  var sortMode = "default"; // default | gift_old | gift_new | name

  function pendingCount() {
    var uc = cache();
    if (!uc) return null;
    var n = 0;
    uc.forEach(function (it) { if (!it.usedAt && !isInstant(it.prizeName)) n++; });
    return n;
  }

  function applyView() {
    var table = document.getElementById("participant-table");
    if (!table) return;
    var uc = cache();
    var rows = Array.from(table.querySelectorAll("tr[data-participant-row]"));
    // 원본 순서 기억 (기본 정렬 복원용)
    rows.forEach(function (row, i) {
      if (!row.hasAttribute("data-ff-order")) row.setAttribute("data-ff-order", String(i));
    });
    var q = quickQuery.trim().toLowerCase();
    rows.forEach(function (row) {
      var okFilter = !filterOn || row.getAttribute("data-ff-lifecycle") === "사용대기";
      var okQuery = !q || (row.textContent || "").toLowerCase().indexOf(q) !== -1;
      row.style.display = okFilter && okQuery ? "" : "none";
    });
    // 정렬 (DOM 재배열)
    var keyed = rows.map(function (row) {
      var pid = row.getAttribute("data-participant-row");
      var it = uc ? uc.get(pid) : null;
      return {
        row: row,
        order: parseInt(row.getAttribute("data-ff-order") || "0", 10),
        giftAt: it && it.giftAt ? new Date(it.giftAt).getTime() : 0,
        name: (row.querySelector(".identity strong") || {}).textContent || ""
      };
    });
    keyed.sort(function (a, b) {
      if (sortMode === "gift_old") return (a.giftAt || 9e15) - (b.giftAt || 9e15);
      if (sortMode === "gift_new") return (b.giftAt || 0) - (a.giftAt || 0);
      if (sortMode === "name") return a.name.localeCompare(b.name, "ko");
      return a.order - b.order;
    });
    var tbody = rows[0] && rows[0].parentElement;
    if (tbody) {
      var target = keyed.map(function (k) { return k.row; });
      var changed = target.some(function (row, i) { return row !== rows[i]; });
      if (changed) target.forEach(function (row) { tbody.appendChild(row); });
    }
  }

  function toggleLabel() {
    var n = pendingCount();
    var cnt = n != null ? " (" + n + "명)" : "";
    return filterOn
      ? "◷ 시술권 미사용 고객님만 보는 중" + cnt + " — 전체 보기"
      : "◷ 시술권 미사용 고객님만 보기" + cnt;
  }

  function injectFilterToggle() {
    var wrap = document.querySelector(".participant-table-wrap");
    if (!wrap || document.getElementById("ff-pending-filter")) return;
    var bar = document.createElement("div");
    bar.className = "ff-pending-bar";
    bar.innerHTML =
      '<button type="button" id="ff-pending-filter" class="ff-pending-toggle"></button>' +
      '<input type="search" id="ff-quick-search" class="ff-quick-search" placeholder="이 목록에서 검색 (이름·뒤4자리·닉네임)" />' +
      '<select id="ff-sort-mode" class="ff-sort-select" aria-label="정렬">' +
        '<option value="default">기본 순서</option>' +
        '<option value="gift_old">지급 오래된순</option>' +
        '<option value="gift_new">지급 최신순</option>' +
        '<option value="name">이름 가나다순</option>' +
      "</select>";
    // 바 내부 조작이 행 클릭으로 새지 않게
    ["click", "mousedown", "pointerdown", "change", "focusin"].forEach(function (ev) {
      bar.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    wrap.parentElement.insertBefore(bar, wrap);

    var btn = bar.querySelector("#ff-pending-filter");
    btn.textContent = toggleLabel();
    btn.addEventListener("click", function () {
      filterOn = !filterOn;
      btn.classList.toggle("is-on", filterOn);
      btn.textContent = toggleLabel();
      applyView();
    });
    bar.querySelector("#ff-quick-search").addEventListener("input", function () {
      quickQuery = this.value;
      applyView();
    });
    bar.querySelector("#ff-sort-mode").addEventListener("change", function () {
      sortMode = this.value;
      applyView();
    });
  }

  // ---------- 3) 차트 기입 리마인드 (내원형 지급 안내) ----------
  function injectChartReminder() {
    var block = document.querySelector(".staff-record-block");
    if (!block || block.querySelector(".ff-chart-reminder")) return;
    var p = document.createElement("p");
    p.className = "ff-chart-reminder";
    p.textContent = "시술권 지급 시 고객 차트에 기입해 주세요. 사용 처리는 재내원 시 이 화면에서 합니다.";
    block.appendChild(p);
  }

  // ---------- 훅: 표 변화·usage 로드 후 일괄 적용 ----------
  var ffApplying = false;
  function applyAll() {
    if (ffApplying) return;          // 자기 DOM 변경이 옵저버를 되깨우는 순환 차단
    ffApplying = true;
    try {
      applyLifecycleBadges();
      injectFilterToggle();
      injectChartReminder();
      applyDplusTags();
      applyView();
      var btn = document.getElementById("ff-pending-filter");
      if (btn) btn.textContent = toggleLabel();
    } finally {
      setTimeout(function () { ffApplying = false; }, 0);
    }
  }
  window.__ffApplyLifecycle = applyAll;

  var table = document.getElementById("participant-table");
  if (table) new MutationObserver(applyAll).observe(table, { childList: true, subtree: true });
  new MutationObserver(function () { injectChartReminder(); })
    .observe(document.body, { childList: true, subtree: true });
  applyAll();
})();
