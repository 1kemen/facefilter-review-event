const STORAGE_KEY = "skinReviewEventMvp.v8";
const SESSION_KEY_BASE = "skinReviewEventMvp.session.v1";
const ADMIN_AUTH_KEY = "skinReviewEventMvp.adminAuth.v1";
const DRAW_COOLDOWN_MS = 1600;
const REVIEW_DRAW_WAIT_MS = 10000;
const NAVER_COOLDOWN_DAYS = 28;
const DRAW_CHOICES = 5;
const CUSTOMER_SESSION_MAX_AGE_MS = 18 * 60 * 60 * 1000;
const DATA_RETENTION_LIMITS = {
  participantDays: 90,
  sessionDays: 30,
  auditDays: 180,
  participantCount: 3000,
  sessionCount: 10000,
  auditCount: 50000
};
const APP_MODE = getAppMode();
const CLIENT_FLOW_ID = ensureClientFlowId();
const SESSION_KEY = `${SESSION_KEY_BASE}.${CLIENT_FLOW_ID}`;
const CUSTOMER_STEPS = [
  { key: "register", label: "참여 정보" },
  { key: "review", label: "포토리뷰" },
  { key: "draw", label: "상품뽑기" },
  { key: "final", label: "직원 확인" }
];

const INLINE_ICONS = {
  dot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path></svg>`,
  gift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M20 12v8H4v-8"></path><path d="M2 7h20v5H2Z"></path><path d="M12 22V7"></path><path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5c0 1.7-2 2.5-2 2.5"></path><path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5c0 1.7 2 2.5 2 2.5"></path></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"></path></svg>`,
  return: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.2 6.5"></path><path d="M3 12a9 9 0 0 1 15.2-6.5"></path><path d="M18 3v4h-4"></path><path d="M6 21v-4h4"></path></svg>`,
  userCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="m16 11 2 2 4-4"></path></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M9 12l2 2 4-4"></path></svg>`
};

const defaultPrizes = [
  { id: "pico-toning", name: "피코슈어토닝 1000샷", description: "색소 고민 부위에 사용하는 레이저 토닝 혜택", initialStock: 4, awarded: 0, weight: 8 },
  { id: "facefit", name: "페이스핏 윤곽 3cc", description: "라인 정리를 위한 윤곽 관리 혜택", initialStock: 5, awarded: 0, weight: 10 },
  { id: "injection", name: "염증주사 1개", description: "국소 트러블 진정에 사용하는 주사 혜택", initialStock: 20, awarded: 0, weight: 34 },
  { id: "basic-care", name: "베이직 스킨케어", description: "피부 컨디션을 정돈하는 기본 관리 혜택", initialStock: 14, awarded: 0, weight: 24 },
  { id: "mask-pack", name: "마스크팩", description: "홈케어용 진정 마스크팩 증정", initialStock: 30, awarded: 0, weight: 24 }
];

const guardrails = [
  ["고객 입력 최소화", "필수값은 이름, 휴대폰 뒤 4자리, 네이버 리뷰 닉네임 세 칸으로 제한합니다. 닉네임을 모르면 네이버 ID를 입력할 수 있습니다."],
  ["리뷰 완료 후 뽑기", "네이버 리뷰 화면을 열고 리뷰 작성 완료 버튼을 눌러야 미니게임 버튼이 열립니다."],
  ["네이버 4주 제한", "같은 리뷰 닉네임/ID는 마지막 참여일 기준 28일 이후 다시 참여할 수 있습니다."],
  ["당일 중복 차단", "같은 날 동일 리뷰 닉네임/ID 또는 같은 휴대폰/기기 조합은 기존 참여 내역으로 연결합니다."],
  ["결과 고정", "뽑기 결과가 확정되면 새로고침, 뒤로가기, 버튼 연타에도 같은 결과만 유지됩니다."],
  ["재고 기반 확률", "재고가 0개인 상품은 후보에서 제외하고 당첨 즉시 재고를 차감합니다."],
  ["카톡 채널 안내", "카카오톡 채널 추가는 선택사항이며 공지사항과 케어 안내를 받을 수 있습니다."],
  ["직원 최종 확인", "고객은 결과 화면과 실제 리뷰 화면을 함께 보여주고, 직원이 확인 후 지급완료 처리합니다."],
  ["의심 플래그", "동일 이름/전화 또는 같은 기기 반복 참여는 자동으로 확인 필요 표시가 붙습니다."],
  ["감사 로그", "등록, 리뷰 링크 열기, 뽑기, 지급완료는 해시 체인 로그로 남겨 운영 중 변경 흔적을 확인합니다."]
];

const dom = {};
let state = loadState();
let sessionState = loadSessionState();
let adminAuth = loadAdminAuth();
let selectedParticipantId = sessionState.selectedParticipantId || null;
let pendingReviewUrl = "";
let drawInProgress = false;
let supabaseReady = false;
let reviewGateTimer = 0;

document.addEventListener("DOMContentLoaded", async () => {
  bindDom();
  configureAppMode();
  setDefaultVisitDate();
  bindEvents();
  prepareCustomerSessionForEntry();
  await initializeRemoteBackend();
  renderAll();
});

window.addEventListener("pageshow", (event) => {
  if (!event.persisted || isBackofficeMode()) return;
  sessionState = loadSessionState();
  selectedParticipantId = sessionState.selectedParticipantId || null;
  prepareCustomerSessionForEntry();
  renderAll();
});

function bindDom() {
  dom.tabs = [...document.querySelectorAll(".tab")];
  dom.panels = [...document.querySelectorAll(".tab-panel")];
  dom.registrationForm = document.querySelector("#registration-form");
  dom.registrationMessage = document.querySelector("#registration-message");
  dom.phoneLast4 = document.querySelector("#phone-last4");
  dom.adminAuthCard = document.querySelector("#admin-auth-card");
  dom.adminLoginForm = document.querySelector("#admin-login-form");
  dom.adminEmail = document.querySelector("#admin-email");
  dom.adminPassword = document.querySelector("#admin-password");
  dom.adminAuthStatus = document.querySelector("#admin-auth-status");
  dom.adminAuthMessage = document.querySelector("#admin-auth-message");
  dom.adminSessionActions = document.querySelector("#admin-session-actions");
  dom.refreshAdminData = document.querySelector("#refresh-admin-data");
  dom.adminLogout = document.querySelector("#admin-logout");
  dom.adminProtected = [...document.querySelectorAll("[data-admin-protected]")];
  dom.ownerOnly = [...document.querySelectorAll("[data-owner-only]")];
  dom.adminTabLabel = document.querySelector("#admin-tab-label");
  dom.adminLoginKicker = document.querySelector("#admin-login-kicker");
  dom.adminLoginTitle = document.querySelector("#admin-login-title");
  dom.adminPanelKicker = document.querySelector("#admin-panel-kicker");
  dom.adminPanelTitle = document.querySelector("#admin-panel-title");
  dom.maintenanceCard = document.querySelector("#maintenance-card");
  dom.selectedCustomer = document.querySelector("#selected-customer");
  dom.selectedStatus = document.querySelector("#selected-status");
  dom.openReview = document.querySelector("#open-review");
  dom.reviewOpenStatus = document.querySelector("#review-open-status");
  dom.photoReviewDone = document.querySelector("#photo-review-done");
  dom.verifyKakao = document.querySelector("#verify-kakao");
  dom.kakaoBanner = document.querySelector("#kakao-banner");
  dom.alreadyKakao = document.querySelector("#already-kakao");
  dom.kakaoBenefitModal = document.querySelector("#kakao-benefit-modal");
  dom.customerHelpModal = document.querySelector("#customer-help-modal");
  dom.reviewExitModal = document.querySelector("#review-exit-modal");
  dom.closeReviewExit = document.querySelector("#close-review-exit");
  dom.confirmReviewExit = document.querySelector("#confirm-review-exit");
  dom.openCustomerHelp = document.querySelector("#open-customer-help");
  dom.closeCustomerHelp = document.querySelector("#close-customer-help");
  dom.customerHelpPrimary = document.querySelector("#customer-help-primary");
  dom.closeKakaoBenefit = document.querySelector("#close-kakao-benefit");
  dom.skipKakaoBenefit = document.querySelector("#skip-kakao-benefit");
  dom.kakaoBenefitStatus = document.querySelector("#kakao-benefit-status");
  dom.runDraw = document.querySelector("#run-draw");
  dom.miniGame = document.querySelector("#mini-game");
  dom.drawResult = document.querySelector("#draw-result");
  dom.customerPrizeOdds = document.querySelector("#customer-prize-odds");
  dom.wizardPages = [...document.querySelectorAll("[data-wizard-step]")];
  dom.wizardProgress = document.querySelector("#wizard-progress");
  dom.wizardStepLabel = document.querySelector("#wizard-step-label");
  dom.finalSummary = document.querySelector("#final-summary");
  dom.statsGrid = document.querySelector("#stats-grid");
  dom.searchInput = document.querySelector("#search-input");
  dom.statusFilter = document.querySelector("#status-filter");
  dom.participantTable = document.querySelector("#participant-table");
  dom.detailPanel = document.querySelector("#detail-panel");
  dom.auditTable = document.querySelector("#audit-table");
  dom.auditHealth = document.querySelector("#audit-health");
  dom.guardrailGrid = document.querySelector("#guardrail-grid");
  dom.channelForm = document.querySelector("#channel-form");
  dom.kakaoChannelUrl = document.querySelector("#kakao-channel-url");
  dom.prizeForm = document.querySelector("#prize-form");
  dom.prizeTable = document.querySelector("#prize-table");
  dom.exportCsv = document.querySelector("#export-csv");
  dom.resetDemo = document.querySelector("#reset-demo");
}

function getAppMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "staff") return "staff";
  return params.get("mode") === "admin" || params.get("admin") === "1" ? "admin" : "customer";
}

function ensureClientFlowId() {
  if (isBackofficeMode()) return APP_MODE;

  const params = new URLSearchParams(window.location.search);
  const existingFlowId = cleanText(params.get("flow"));
  if (existingFlowId && isOwnedClientFlow(existingFlowId)) return existingFlowId;

  const flowId = createId("F");
  markOwnedClientFlow(flowId);
  params.set("flow", flowId);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
  return flowId;
}

function getOwnedFlowKey(flowId) {
  return `${SESSION_KEY_BASE}.ownedFlow.${flowId}`;
}

function isOwnedClientFlow(flowId) {
  try {
    return sessionStorage.getItem(getOwnedFlowKey(flowId)) === "1";
  } catch {
    return true;
  }
}

function markOwnedClientFlow(flowId) {
  try {
    sessionStorage.setItem(getOwnedFlowKey(flowId), "1");
  } catch {
    // Storage can be restricted in some in-app browsers; continue with URL flow.
  }
}

function configureAppMode() {
  document.body.dataset.appMode = APP_MODE;
  if (APP_MODE === "customer") {
    document.querySelector(".tabs").hidden = true;
    dom.tabs.forEach((tab) => {
      tab.hidden = tab.dataset.tab !== "customer";
    });
    dom.panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== "customer";
    });
    setActiveTab("customer");
    return;
  }

  const staffMode = APP_MODE === "staff";
  document.querySelector(".tabs").hidden = staffMode;
  dom.tabs.forEach((tab) => {
    tab.hidden = staffMode ? tab.dataset.tab !== "admin" : tab.dataset.tab === "customer";
  });
  dom.panels.forEach((panel) => {
    panel.hidden = staffMode ? panel.dataset.panel !== "admin" : panel.dataset.panel === "customer";
  });
  if (dom.adminTabLabel) dom.adminTabLabel.textContent = staffMode ? "지급관리" : "관리자";
  if (dom.adminLoginKicker) dom.adminLoginKicker.textContent = staffMode ? "Staff Login" : "Admin Login";
  if (dom.adminLoginTitle) dom.adminLoginTitle.textContent = staffMode ? "직원 로그인" : "관리자 로그인";
  if (dom.adminPanelKicker) dom.adminPanelKicker.textContent = staffMode ? "Staff" : "Admin";
  if (dom.adminPanelTitle) dom.adminPanelTitle.textContent = staffMode ? "현장 지급 관리" : "참여자 관리";
  setActiveTab("admin");
}

function setDefaultVisitDate() {
  const input = document.querySelector("#visit-date");
  if (input && !input.value) input.value = getTodayDateKey();
}

function bindEvents() {
  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  dom.registrationForm.addEventListener("submit", handleRegistration);
  dom.phoneLast4.addEventListener("input", enforcePhoneLast4Digits);
  dom.adminLoginForm?.addEventListener("submit", handleAdminLogin);
  dom.refreshAdminData?.addEventListener("click", refreshAdminState);
  dom.adminLogout?.addEventListener("click", handleAdminLogout);
  dom.openReview.addEventListener("click", openReviewGuide);
  dom.photoReviewDone?.addEventListener("click", confirmPhotoReviewDone);
  dom.verifyKakao?.addEventListener("click", verifyKakaoChannel);
  dom.openCustomerHelp?.addEventListener("click", openCustomerHelpModal);
  dom.closeCustomerHelp?.addEventListener("click", closeCustomerHelpModal);
  dom.customerHelpPrimary?.addEventListener("click", closeCustomerHelpModal);
  dom.closeReviewExit?.addEventListener("click", closeReviewExitModal);
  dom.confirmReviewExit?.addEventListener("click", confirmReviewExit);
  dom.kakaoBanner.addEventListener("click", openKakaoChannel);
  dom.alreadyKakao?.addEventListener("click", confirmExistingKakaoChannel);
  dom.closeKakaoBenefit.addEventListener("click", closeKakaoBenefitModal);
  dom.skipKakaoBenefit.addEventListener("click", closeKakaoBenefitModal);
  dom.runDraw.addEventListener("click", () => runDraw());
  dom.channelForm.addEventListener("submit", saveChannelSettings);
  dom.prizeForm.addEventListener("submit", addPrize);
  dom.searchInput.addEventListener("input", renderParticipantTable);
  dom.statusFilter.addEventListener("change", renderParticipantTable);
  dom.exportCsv.addEventListener("click", exportCsv);
  dom.resetDemo.addEventListener("click", resetDemoData);
}

function enforcePhoneLast4Digits(event) {
  const input = event.target;
  const onlyDigits = input.value.replace(/\D/g, "").slice(0, 4);
  if (input.value !== onlyDigits) input.value = onlyDigits;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();
  try {
    const parsed = JSON.parse(raw);
    return {
      participants: Array.isArray(parsed.participants) ? parsed.participants.map(normalizeParticipant) : [],
      prizes: Array.isArray(parsed.prizes) && parsed.prizes.length ? parsed.prizes.map(normalizePrize) : structuredClone(defaultPrizes),
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      maintenance: normalizeMaintenance(parsed.maintenance),
      settings: normalizeSettings(parsed.settings),
      ui: parsed.ui || {}
    };
  } catch {
    return createDefaultState();
  }
}

function loadSessionState() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    const session = createSessionState();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      sessionToken: parsed.sessionToken || createId("S"),
      supabaseSessionId: parsed.supabaseSessionId || null,
      selectedParticipantId: parsed.selectedParticipantId || null,
      customerStep: CUSTOMER_STEPS.some((step) => step.key === parsed.customerStep) ? parsed.customerStep : "register",
      closedAt: parsed.closedAt || null,
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    const session = createSessionState();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }
}

function loadAdminAuth() {
  const raw = localStorage.getItem(ADMIN_AUTH_KEY);
  if (!raw) return { accessToken: "", refreshToken: "", email: "", expiresAt: 0, userId: "" };
  try {
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed.accessToken || "",
      refreshToken: parsed.refreshToken || "",
      email: parsed.email || "",
      expiresAt: Number(parsed.expiresAt) || 0,
      userId: parsed.userId || ""
    };
  } catch {
    return { accessToken: "", refreshToken: "", email: "", expiresAt: 0, userId: "" };
  }
}

function createSessionState() {
  const now = new Date().toISOString();
  return {
    sessionToken: createId("S"),
    supabaseSessionId: null,
    selectedParticipantId: null,
    customerStep: "register",
    closedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function normalizeParticipant(participant) {
  return {
    ...participant,
    chartNo: participant.chartNo || participant.customerCode || "QR-UNKNOWN",
    customerChartNo: participant.customerChartNo || "",
    naverId: participant.naverId || "",
    sessionToken: participant.sessionToken || null,
    reviewOpenedAt: participant.reviewOpenedAt || null,
    reviewStatus: participant.reviewStatus || "none",
    reviewEvidence: participant.reviewEvidence || null,
    kakaoOpenedAt: participant.kakaoOpenedAt || null,
    giftStatus: participant.giftStatus || "not_ready",
    promoterName: participant.promoterName || "",
    giftStaffName: participant.giftStaffName || "",
    staffMemo: participant.staffMemo || "",
    drawIntent: getValidDropChoice(participant.drawIntent),
    flags: Array.isArray(participant.flags) ? participant.flags : []
  };
}

function normalizePrize(prize) {
  return {
    id: prize.id || createId("PR"),
    name: cleanText(prize.name) || "이벤트 상품",
    description: cleanText(prize.description),
    initialStock: Math.max(Number(prize.initialStock) || 0, Number(prize.awarded) || 0),
    awarded: Math.max(Number(prize.awarded) || 0, 0),
    weight: Math.max(Number(prize.weight) || 0, 0),
    active: prize.active !== false
  };
}

function normalizeSettings(settings = {}) {
  return {
    kakaoChannelUrl: cleanText(settings.kakaoChannelUrl || "")
  };
}

function normalizeMaintenance(maintenance = {}) {
  return {
    generatedAt: maintenance.generatedAt || maintenance.generated_at || null,
    retention: {
      participantDays: Number(maintenance.retention?.participantDays || maintenance.retention?.participant_days || DATA_RETENTION_LIMITS.participantDays),
      sessionDays: Number(maintenance.retention?.sessionDays || maintenance.retention?.session_days || DATA_RETENTION_LIMITS.sessionDays),
      auditDays: Number(maintenance.retention?.auditDays || maintenance.retention?.audit_days || DATA_RETENTION_LIMITS.auditDays)
    },
    participants: normalizeMaintenanceBucket(maintenance.participants),
    sessions: normalizeMaintenanceBucket(maintenance.sessions),
    auditLogs: normalizeMaintenanceBucket(maintenance.auditLogs || maintenance.audit_logs)
  };
}

function normalizeMaintenanceBucket(bucket = {}) {
  return {
    total: Number(bucket.total || 0),
    oldCount: Number(bucket.oldCount || bucket.old_count || 0),
    oldestAt: bucket.oldestAt || bucket.oldest_at || null,
    latestAt: bucket.latestAt || bucket.latest_at || null
  };
}

function createDefaultState() {
  return {
    participants: [],
    prizes: structuredClone(defaultPrizes),
    audit: [],
    staffProfile: null,
    maintenance: null,
    settings: normalizeSettings(),
    ui: {}
  };
}

function saveState() {
  saveSessionState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAdminAuth() {
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(adminAuth));
}

function clearAdminAuth() {
  adminAuth = { accessToken: "", refreshToken: "", email: "", expiresAt: 0, userId: "" };
  localStorage.removeItem(ADMIN_AUTH_KEY);
  window.FaceFilterSupabase?.setAccessToken?.("");
}

function saveSessionState() {
  sessionState.selectedParticipantId = selectedParticipantId;
  sessionState.updatedAt = new Date().toISOString();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionState));
}

function prepareCustomerSessionForEntry() {
  if (isBackofficeMode()) return;
  if (sessionState.closedAt || isCustomerSessionStateExpired(sessionState)) resetCustomerSessionState();
}

function resetCustomerSessionState() {
  sessionState = createSessionState();
  selectedParticipantId = null;
  saveSessionState();
}

function isCustomerSessionStateExpired(session = sessionState, now = Date.now()) {
  return isTimestampOutsideToday(session?.createdAt, now) || isTimestampOlderThan(session?.createdAt, CUSTOMER_SESSION_MAX_AGE_MS, now);
}

function isRemoteCustomerSessionExpired(remoteSession, now = Date.now()) {
  const createdAt = remoteSession?.created_at || remoteSession?.createdAt;
  return isTimestampOutsideToday(createdAt, now) || isTimestampOlderThan(createdAt, CUSTOMER_SESSION_MAX_AGE_MS, now);
}

function isTimestampOlderThan(value, maxAgeMs, now = Date.now()) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp > maxAgeMs;
}

function isTimestampOutsideToday(value, now = Date.now()) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return false;
  return formatDateKey(date) !== formatDateKey(new Date(now));
}

function setCustomerStep(stepKey) {
  sessionState.customerStep = CUSTOMER_STEPS.some((step) => step.key === stepKey) ? stepKey : "register";
}

function setSelectedParticipant(participantId, stepKey = null) {
  selectedParticipantId = participantId || null;
  if (stepKey) setCustomerStep(stepKey);
}

function closeCurrentSession() {
  sessionState.closedAt = new Date().toISOString();
  setCustomerStep("final");
}

function isSessionClosed(participant = getSelectedParticipant()) {
  return Boolean(sessionState.closedAt || participant?.giftStatus === "done");
}

function isSupabaseEnabled() {
  return Boolean(window.FaceFilterSupabase?.isConfigured?.());
}

function isBackofficeMode() {
  return APP_MODE === "admin" || APP_MODE === "staff";
}

function isOwnerUser() {
  return state.staffProfile?.role === "owner";
}

async function initializeRemoteBackend() {
  if (!isSupabaseEnabled()) return;

  try {
    const publicState = await window.FaceFilterSupabase.getPublicState();
    applyRemotePublicState(publicState);

    if (isBackofficeMode()) {
      await initializeAdminAuth();
      supabaseReady = true;
      saveState();
      return;
    }

    await ensureRemoteSession();
    const remote = await window.FaceFilterSupabase.getSessionState({
      sessionId: sessionState.supabaseSessionId,
      participantId: selectedParticipantId || null
    });
    if (remote.session?.status === "closed" || isRemoteCustomerSessionExpired(remote.session) || isStaleRemoteSessionResult(remote)) {
      resetCustomerSessionState();
      await ensureRemoteSession({ forceNew: true });
      supabaseReady = true;
      state.participants = [];
      state.audit = [];
      saveState();
      return;
    }
    if (isCompletedRemoteParticipant(remote)) {
      resetCustomerSessionState();
      await ensureRemoteSession({ forceNew: true });
      supabaseReady = true;
      state.participants = [];
      state.audit = [];
      saveState();
      return;
    }
    supabaseReady = true;
    state.participants = [];
    state.audit = [];
    applyRemoteResult(remote);
    saveState();
  } catch (error) {
    supabaseReady = false;
    console.error(error);
    toast("Supabase 연결을 확인해 주세요.");
  }
}

function isCompletedRemoteParticipant(result) {
  return result?.payload?.participant?.gift_status === "done";
}

async function initializeAdminAuth() {
  if (!isAdminSignedIn()) {
    window.FaceFilterSupabase?.setAccessToken?.("");
    renderAdminAuth();
    return;
  }

  try {
    await ensureAdminAccessToken();
    await refreshAdminState({ silent: true });
  } catch (error) {
    console.error(error);
    clearAdminAuth();
    renderAdminAuth();
    setMessage(dom.adminAuthMessage, "관리자 세션이 만료되었습니다. 다시 로그인해 주세요.", "pending");
  }
}

function isAdminSignedIn() {
  return Boolean(adminAuth.accessToken || adminAuth.refreshToken);
}

function isLiveAdminReady() {
  return APP_MODE === "admin" && isSupabaseEnabled() && Boolean(adminAuth.accessToken);
}

function applyAuthSession(response) {
  const session = response?.session || response || {};
  const user = session.user || response?.user || {};
  adminAuth = {
    accessToken: session.access_token || "",
    refreshToken: session.refresh_token || adminAuth.refreshToken || "",
    email: user.email || adminAuth.email || "",
    userId: user.id || adminAuth.userId || "",
    expiresAt: Date.now() + Math.max(Number(session.expires_in) || 3600, 60) * 1000
  };
  if (!adminAuth.accessToken) {
    throw new Error("Admin access token was not returned.");
  }
  window.FaceFilterSupabase?.setAccessToken?.(adminAuth.accessToken);
  saveAdminAuth();
}

async function ensureAdminAccessToken() {
  if (!isSupabaseEnabled()) throw new Error("Supabase is not configured.");
  if (adminAuth.accessToken && adminAuth.expiresAt - 60000 > Date.now()) {
    window.FaceFilterSupabase.setAccessToken(adminAuth.accessToken);
    return adminAuth.accessToken;
  }
  if (!adminAuth.refreshToken) throw new Error("Admin session is missing.");
  const session = await window.FaceFilterSupabase.refreshSession({ refreshToken: adminAuth.refreshToken });
  applyAuthSession(session);
  return adminAuth.accessToken;
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!isSupabaseEnabled()) {
    setMessage(dom.adminAuthMessage, "Supabase 설정을 먼저 확인해 주세요.", "danger");
    return;
  }

  const form = new FormData(dom.adminLoginForm);
  const email = cleanText(form.get("email"));
  const password = String(form.get("password") || "");
  if (!email || !password) {
    setMessage(dom.adminAuthMessage, "이메일과 비밀번호를 입력해 주세요.", "danger");
    return;
  }

  const submitButton = dom.adminLoginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setMessage(dom.adminAuthMessage, "로그인 확인 중입니다.", "pending");
  try {
    const session = await window.FaceFilterSupabase.signInWithPassword({ email, password });
    applyAuthSession(session);
    dom.adminPassword.value = "";
    const loaded = await refreshAdminState({ silent: true });
    if (loaded) {
      renderAll();
      setMessage(dom.adminAuthMessage, `${adminAuth.email} 로그인 완료`, "success");
    }
  } catch (error) {
    console.error(error);
    clearAdminAuth();
    renderAll();
    setMessage(dom.adminAuthMessage, getAuthFailureMessage(error), "danger");
  } finally {
    submitButton.disabled = false;
  }
}

function getAuthFailureMessage(error) {
  const message = String(error?.message || error?.error_description || "");
  if (/invalid login credentials/i.test(message)) {
    return "로그인 실패: Auth 계정이 없거나 비밀번호가 맞지 않습니다. Supabase Authentication에서 계정 생성/비밀번호를 확인해 주세요.";
  }
  if (/email not confirmed|not confirmed|email.*confirm/i.test(message)) {
    return "로그인 실패: 이메일 인증 완료 상태가 아닙니다. Supabase Authentication에서 Confirm 처리해 주세요.";
  }
  return "로그인에 실패했습니다. 계정 생성, 비밀번호, 이메일 인증 완료 상태를 확인해 주세요.";
}

function handleAdminLogout() {
  clearAdminAuth();
  state.participants = [];
  state.audit = [];
  selectedParticipantId = null;
  saveState();
  renderAll();
  setMessage(dom.adminAuthMessage, "로그아웃되었습니다.", "pending");
}

async function refreshAdminState(options = {}) {
  if (!isBackofficeMode() || !isSupabaseEnabled() || !isAdminSignedIn()) {
    renderAdminAuth();
    return false;
  }

  try {
    await ensureAdminAccessToken();
    const result = await window.FaceFilterSupabase.getAdminState();
    if (!result.ok) {
      if (result.code === "not_staff") {
        clearAdminAuth();
        setMessage(dom.adminAuthMessage, "로그인은 됐지만 관리자 권한이 연결되지 않았습니다. owner 등록 SQL을 다시 실행해 주세요.", "danger");
      } else {
        setMessage(dom.adminAuthMessage, "관리자 데이터를 불러오지 못했습니다.", "danger");
      }
      renderAll();
      return false;
    }
    applyAdminState(result);
    saveState();
    renderAll();
    if (!options.silent) toast("관리자 데이터를 새로고침했습니다.");
    return true;
  } catch (error) {
    console.error(error);
    setMessage(dom.adminAuthMessage, "관리자 데이터 연결에 실패했습니다.", "danger");
    renderAdminAuth();
    return false;
  }
}

function applyAdminState(result) {
  if (result.publicState) applyRemotePublicState(result.publicState);
  state.staffProfile = normalizeStaffProfile(result.staffProfile || {
    role: APP_MODE === "admin" ? "owner" : "staff",
    display_name: adminAuth.email || ""
  });
  if (Array.isArray(result.prizes)) {
    state.prizes = result.prizes.map(mapAdminPrize).filter(Boolean);
  }
  if (Array.isArray(result.participants)) {
    state.participants = result.participants
      .map((payload) => mapRemoteParticipant(payload))
      .filter(Boolean);
  }
  if (Array.isArray(result.auditLogs)) {
    state.audit = result.auditLogs.map(mapRemoteAuditLog).filter(Boolean).reverse();
  }
  state.maintenance = normalizeMaintenance(result.maintenance || buildLocalMaintenanceSummary());
}

function normalizeStaffProfile(profile = {}) {
  return {
    userId: profile.user_id || profile.userId || adminAuth.userId || "",
    displayName: cleanText(profile.display_name || profile.displayName || adminAuth.email || ""),
    role: cleanText(profile.role || (APP_MODE === "admin" ? "owner" : "staff")) || "staff"
  };
}

function mapAdminPrize(prize) {
  if (!prize) return null;
  return normalizePrize({
    id: prize.id,
    name: prize.name,
    description: prize.description || "",
    initialStock: prize.initial_stock ?? prize.initialStock ?? 0,
    awarded: prize.awarded_count ?? prize.awarded ?? 0,
    weight: prize.weight ?? 0,
    active: prize.active !== false
  });
}

function mapRemoteAuditLog(log) {
  if (!log) return null;
  return {
    id: log.id || createId("A"),
    at: log.occurred_at || log.at || new Date().toISOString(),
    action: log.action || "",
    subjectId: log.subject_id || log.participant_id || "-",
    detail: log.detail || {},
    previousHash: log.previous_hash || "",
    hash: log.hash || ""
  };
}

async function ensureRemoteSession(options = {}) {
  if (options.forceNew || sessionState.closedAt) resetCustomerSessionState();
  if (sessionState.supabaseSessionId) return sessionState.supabaseSessionId;
  const qrCode = new URLSearchParams(window.location.search).get("qr");
  const sessionId = await window.FaceFilterSupabase.createSession({ qrCode });
  sessionState.supabaseSessionId = sessionId;
  saveSessionState();
  return sessionId;
}

function isStaleRemoteSessionResult(result) {
  return ["invalid_session", "session_closed", "session_not_found", "participant_not_in_session"].includes(result?.code);
}

function applyRemoteResult(result, preferredStep = null) {
  if (!result) return null;
  if (result.publicState) applyRemotePublicState(result.publicState);
  if (result.session?.status === "closed" && !isBackofficeMode()) closeCurrentSession();
  if (!result.payload) return null;

  const participant = mapRemoteParticipant(result.payload);
  if (!participant) return null;
  if (!isBackofficeMode() && participant.sessionToken) {
    sessionState.supabaseSessionId = participant.sessionToken;
  }
  const existing = getParticipant(participant.id);
  if (existing?.kakaoOpenedAt && !participant.kakaoOpenedAt) {
    participant.kakaoOpenedAt = existing.kakaoOpenedAt;
  }
  upsertParticipant(participant);
  setSelectedParticipant(participant.id, preferredStep || getSuggestedWizardStep(participant));
  if (participant.giftStatus === "done" && !isBackofficeMode()) closeCurrentSession();
  return participant;
}

function applyRemotePublicState(publicState = {}) {
  const settings = publicState.settings || {};
  state.settings = {
    ...state.settings,
    kakaoChannelUrl: cleanText(settings.kakaoChannelUrl || settings.kakao_channel_url || ""),
    naverReviewUrl: cleanText(settings.naverReviewUrl || settings.naver_review_url || "")
  };

  if (Array.isArray(publicState.prizes)) {
    state.prizes = publicState.prizes.map((prize, index) => ({
      id: prize.id,
      name: cleanText(prize.name) || "이벤트 상품",
      description: cleanText(prize.description || ""),
      initialStock: 1,
      awarded: 0,
      weight: Math.max(Number(prize.weight) || 0, 0),
      active: true,
      sortOrder: index
    }));
  }
}

function mapRemoteParticipant(payload) {
  const source = payload.participant;
  if (!source) return null;
  const draws = Array.isArray(payload.draws) ? payload.draws.map(mapRemoteDraw) : [];
  const primaryDraw = draws.find((draw) => draw.type === "primary") || null;
  const activeDraw = payload.activeDraw ? mapRemoteDraw(payload.activeDraw) : primaryDraw;

  return normalizeParticipant({
    id: source.id,
    customerName: source.customer_name,
    chartNo: source.chart_code || "QR-UNKNOWN",
    customerChartNo: source.customer_chart_no || "",
    phoneLast4: source.phone_last4,
    naverId: source.naver_handle,
    receiptNo: "",
    visitDate: source.visit_date,
    uniqueKey: `${source.visit_date}:${source.naver_key}`,
    sessionToken: source.session_id,
    deviceKey: source.device_key,
    createdAt: source.created_at,
    updatedAt: source.updated_at,
    kakaoVerified: Boolean(source.kakao_verified),
    kakaoVerifiedAt: source.kakao_verified_at,
    kakaoOpenedAt: source.kakao_opened_at,
    reviewOpenedAt: source.review_opened_at,
    reviewStatus: source.review_status || "none",
    reviewEvidence: source.review_evidence,
    draw: activeDraw,
    giftStatus: source.gift_status || "not_ready",
    giftCompletedAt: source.gift_completed_at,
    promoterName: source.promoter_name || "",
    giftStaffName: source.gift_staff_name || "",
    staffMemo: source.staff_memo || "",
    lastDrawAttemptAt: null,
    flags: Array.isArray(source.flags) ? source.flags : []
  });
}

function mapRemoteDraw(draw) {
  if (!draw) return null;
  return {
    id: draw.id,
    type: draw.type,
    prizeId: draw.prize_id,
    prizeName: draw.prize_name,
    prizeDescription: draw.prize_description || "",
    confirmCode: draw.confirm_code,
    dropChoice: draw.drop_choice,
    drawnAt: draw.drawn_at,
    randomProof: draw.random_proof
  };
}

function upsertParticipant(participant) {
  const index = state.participants.findIndex((item) => item.id === participant.id);
  if (index >= 0) {
    state.participants.splice(index, 1, participant);
  } else {
    state.participants.unshift(participant);
  }
}

function getRemoteParticipantRequest(participant = getSelectedParticipant()) {
  return {
    sessionId: participant?.sessionToken || sessionState.supabaseSessionId,
    participantId: participant?.id || selectedParticipantId
  };
}

function getValidDropChoice(value) {
  const choice = Number(value);
  return Number.isInteger(choice) && choice >= 1 && choice <= DRAW_CHOICES ? choice : null;
}

function getRemoteErrorMessage(code) {
  const messages = {
    invalid_session: "세션이 만료되었습니다.",
    session_closed: "이미 완료된 참여입니다.",
    review_link_required: "네이버 리뷰 작성하기를 먼저 눌러주세요.",
    review_required: "네이버 리뷰 작성하기 버튼을 먼저 눌러주세요.",
    review_wait_required: "잠시 후 상품뽑기가 열립니다.",
    already_drawn: "이미 뽑기 결과가 확정되었습니다.",
    extra_draw_removed: "추가 뽑기는 사용하지 않습니다.",
    invalid_drop_choice_required: "물방울을 선택한 뒤 상품뽑기를 눌러주세요.",
    no_prizes_available: "현재 뽑기 가능한 상품이 없습니다.",
    gift_completed: "이미 지급 완료된 참여입니다.",
    already_completed: "이미 지급완료된 참여입니다. 직원에게 문의해 주세요.",
    staff_memo_required: "대신뽑기 사유를 지급 메모에 남겨주세요.",
    sql_patch_required: "대신뽑기 SQL 패치를 먼저 실행해 주세요."
  };
  return messages[code] || "요청을 처리하지 못했습니다.";
}

function addAudit(action, subjectId, detail = {}) {
  const previousHash = state.audit.length ? state.audit[state.audit.length - 1].hash : "GENESIS";
  const entry = {
    id: createId("A"),
    at: new Date().toISOString(),
    action,
    subjectId: subjectId || "-",
    detail,
    previousHash
  };
  entry.hash = stableHash(`${previousHash}|${entry.at}|${entry.action}|${entry.subjectId}|${JSON.stringify(entry.detail)}`);
  state.audit.push(entry);
}

function validateLocalAuditChain() {
  let previousHash = "GENESIS";
  for (const entry of state.audit) {
    const expected = stableHash(`${previousHash}|${entry.at}|${entry.action}|${entry.subjectId}|${JSON.stringify(entry.detail)}`);
    if (entry.previousHash !== previousHash || entry.hash !== expected) return false;
    previousHash = entry.hash;
  }
  return true;
}

function getAuditHealth() {
  if (!state.audit.length) return { label: "로그 대기", tone: "muted" };

  const hashedEntries = state.audit.filter((entry) => entry.hash);
  if (!hashedEntries.length) return { label: "서버 로그 확인", tone: "done" };

  const serverHashLike = hashedEntries.some((entry) => String(entry.hash).length > 16);
  if (!serverHashLike) {
    return validateLocalAuditChain()
      ? { label: "해시 체인 정상", tone: "done" }
      : { label: "로그 연결 확인 필요", tone: "pending" };
  }

  for (let index = 1; index < hashedEntries.length; index += 1) {
    const previousEntry = hashedEntries[index - 1];
    const entry = hashedEntries[index];
    if (entry.previousHash && entry.previousHash !== previousEntry.hash) {
      return { label: "로그 연결 확인 필요", tone: "pending" };
    }
  }

  const firstPreviousHash = hashedEntries[0].previousHash;
  if (firstPreviousHash && firstPreviousHash !== "GENESIS") {
    return { label: "최근 로그 확인", tone: "done" };
  }

  return { label: "서버 로그 정상", tone: "done" };
}

async function handleRegistration(event) {
  event.preventDefault();
  const form = new FormData(dom.registrationForm);
  const customerName = cleanText(form.get("customerName"));
  const phoneLast4 = String(form.get("phoneLast4") || "").replace(/\D/g, "");
  const naverId = cleanText(form.get("naverId"));
  const receiptNo = cleanText(form.get("receiptNo"));
  const visitDate = form.get("visitDate") || getTodayDateKey();
  const consent = form.get("consent") === "on";
  const deviceKey = getDeviceKey();
  const naverKey = normalizeKey(naverId);

  if (!customerName || phoneLast4.length !== 4 || !naverKey || !visitDate || !consent) {
    setMessage(dom.registrationMessage, "이름, 휴대폰 뒤 4자리, 네이버 리뷰 닉네임, 동의 여부를 확인해 주세요. 닉네임을 모르면 네이버 ID를 입력해 주세요.", "danger");
    return;
  }

  if (isInitialLikeName(customerName)) {
    setMessage(dom.registrationMessage, "이니셜이 아닌 실제 이름으로 입력해 주세요.", "danger");
    return;
  }

  if (isSupabaseEnabled()) {
    const submitButton = dom.registrationForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    setMessage(dom.registrationMessage, "참여 정보를 저장 중입니다.", "pending");

    try {
      await ensureRemoteSession();
      let result = await window.FaceFilterSupabase.registerParticipant({
        sessionId: sessionState.supabaseSessionId,
        customerName,
        phoneLast4,
        naverHandle: naverId,
        visitDate,
        deviceKey
      });

      if (isStaleRemoteSessionResult(result)) {
        await ensureRemoteSession({ forceNew: true });
        result = await window.FaceFilterSupabase.registerParticipant({
          sessionId: sessionState.supabaseSessionId,
          customerName,
          phoneLast4,
          naverHandle: naverId,
          visitDate,
          deviceKey
        });
      }

      if (isMismatchedDuplicatePayload(result, { customerName, phoneLast4, naverId })) {
        selectedParticipantId = null;
        state.participants = [];
        saveState();
        renderAll();
        setMessage(dom.registrationMessage, "기존 화면 복귀는 이름, 휴대폰 뒤 4자리, 리뷰 닉네임이 모두 같을 때만 가능합니다.", "pending");
        return;
      }

      if (result?.code === "already_completed" || (result?.code === "duplicate_today" && isCompletedRemoteParticipant(result))) {
        selectedParticipantId = null;
        state.participants = [];
        resetCustomerSessionState();
        saveState();
        renderAll();
        setMessage(dom.registrationMessage, "이미 지급완료된 참여입니다. 추가 확인이 필요하면 직원에게 문의해 주세요.", "pending");
        return;
      }

      const participant = result.payload ? applyRemoteResult(result, result.code === "created" ? "review" : null) : null;
      saveState();
      renderAll();

      if (result.ok) {
        dom.registrationForm.reset();
        setDefaultVisitDate();
        setMessage(dom.registrationMessage, "참여가 시작되었습니다.", "success");
      } else if (result.code === "duplicate_today" && participant) {
        dom.registrationForm.reset();
        setDefaultVisitDate();
        setMessage(dom.registrationMessage, "기존 참여 내역으로 이어갑니다.", "success");
      } else {
        setMessage(dom.registrationMessage, result.message || "참여 정보를 확인해 주세요.", "pending");
        if (participant) setCustomerStep(getSuggestedWizardStep(participant));
      }
    } catch (error) {
      console.error(error);
      setMessage(dom.registrationMessage, "DB 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "danger");
    } finally {
      submitButton.disabled = false;
    }
    return;
  }

  const sameDayDuplicate = state.participants.find((person) => {
    const sameDay = person.visitDate === visitDate;
    const sameNaver = normalizeKey(person.naverId) === naverKey;
    const sameName = normalizeKey(person.customerName) === normalizeKey(customerName);
    const samePhone = person.phoneLast4 === phoneLast4;
    return sameDay && sameName && samePhone && sameNaver;
  });

  if (sameDayDuplicate) {
    setSelectedParticipant(sameDayDuplicate.id, getSuggestedWizardStep(sameDayDuplicate));
    addAudit("duplicate_registration_blocked", sameDayDuplicate.id, { visitDate, phoneLast4, naverId: maskNaverId(naverId) });
    saveState();
    renderAll();
    setMessage(dom.registrationMessage, "이미 등록된 참여 내역을 불러왔습니다. 기존 결과가 있으면 그대로 유지됩니다.", "pending");
    return;
  }

  const cooldown = getNaverCooldown(naverKey, visitDate);
  if (cooldown.blocked) {
    setSelectedParticipant(cooldown.participant.id, getSuggestedWizardStep(cooldown.participant));
    addAudit("naver_cooldown_blocked", cooldown.participant.id, {
      naverId: maskNaverId(naverId),
      nextEligibleDate: cooldown.nextEligibleDate,
      remainingDays: cooldown.remainingDays
    });
    saveState();
    renderAll();
    setMessage(dom.registrationMessage, `이 리뷰 닉네임/ID는 4주 간격 참여 대상입니다. ${cooldown.nextEligibleDate} 이후 다시 참여 가능합니다.`, "pending");
    return;
  }

  const id = createId("P");
  const customerCode = createCustomerCode(id, visitDate, phoneLast4);
  const possibleMatches = state.participants.filter((person) => (
    normalizeKey(person.customerName) === normalizeKey(customerName) && person.phoneLast4 === phoneLast4
  ));
  const recentDeviceRuns = state.participants.filter((person) => (
    person.deviceKey === deviceKey && minutesBetween(person.createdAt, new Date().toISOString()) < 10
  ));
  const flags = [];
  if (possibleMatches.length) flags.push("동일 이름/휴대폰 뒤 4자리로 기존 참여 이력이 있습니다.");
  if (recentDeviceRuns.length >= 2) flags.push("같은 기기에서 짧은 시간 내 반복 참여가 감지되었습니다.");

  const participant = {
    id,
    customerName,
    chartNo: customerCode,
    customerChartNo: "",
    phoneLast4,
    naverId,
    receiptNo,
    visitDate,
    uniqueKey: `${visitDate}:${naverKey}`,
    sessionToken: sessionState.sessionToken,
    deviceKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kakaoOpenedAt: null,
    kakaoVerified: false,
    kakaoVerifiedAt: null,
    promoterName: "",
    giftStaffName: "",
    staffMemo: "",
    reviewOpenedAt: null,
    reviewStatus: "none",
    reviewEvidence: null,
    draw: null,
    giftStatus: "not_ready",
    giftCompletedAt: null,
    lastDrawAttemptAt: null,
    flags
  };

  state.participants.unshift(participant);
  setSelectedParticipant(participant.id, "review");
  addAudit("participant_created", participant.id, {
    customerCode,
    phoneLast4,
    naverId: maskNaverId(naverId),
    sessionToken: maskSessionToken(sessionState.sessionToken),
    flags
  });
  saveState();
  dom.registrationForm.reset();
  setDefaultVisitDate();
  renderAll();
  setMessage(dom.registrationMessage, "참여가 시작되었습니다.", "success");
}

function isMismatchedDuplicatePayload(result, input) {
  if (result?.code !== "duplicate_today" || !result.payload?.participant) return false;
  const participant = result.payload.participant;
  const sameName = normalizeKey(participant.customer_name) === normalizeKey(input.customerName);
  const samePhone = String(participant.phone_last4 || "") === String(input.phoneLast4 || "");
  const sameNaver = normalizeKey(participant.naver_handle) === normalizeKey(input.naverId);
  return !(sameName && samePhone && sameNaver);
}

async function openReviewGuide() {
  const participant = getSelectedParticipant();
  if (!participant) return;
  if (isSessionClosed(participant)) return;

  const reviewUrl = getReviewTargetUrl();
  if (!reviewUrl) {
    toast("네이버 리뷰 링크가 설정되지 않았습니다.");
    return;
  }
  participant.reviewOpenedAt = participant.reviewOpenedAt || new Date().toISOString();
  participant.updatedAt = new Date().toISOString();
  saveState();
  renderAll();

  if (isSupabaseEnabled()) {
    try {
      await ensureRemoteSession();
      const result = await window.FaceFilterSupabase.markReviewOpened(getRemoteParticipantRequest(participant));
      applyRemoteResult(result, "review");
      saveState();
      renderAll();
      openReviewExitModal(reviewUrl);
    } catch (error) {
      console.error(error);
      saveState();
      renderAll();
      openReviewExitModal(reviewUrl);
    }
    return;
  }

  participant.reviewOpenedAt = participant.reviewOpenedAt || new Date().toISOString();
  participant.updatedAt = new Date().toISOString();
  addAudit("review_link_opened", participant.id, { source: "qr_customer" });
  saveState();
  renderAll();
  openReviewExitModal(reviewUrl);
}

function getReviewTargetUrl() {
  const configuredUrl = cleanText(state.settings?.naverReviewUrl);
  if (!configuredUrl) return "";
  if (!isMobileBrowser()) return configuredUrl;
  return getMobileNaverReviewUrl(configuredUrl);
}

function getMobileNaverReviewUrl(url) {
  const placeId = extractNaverPlaceId(url);
  if (!placeId) return url;
  return `https://m.place.naver.com/hospital/${placeId}/review/visitor`;
}

function extractNaverPlaceId(url) {
  const clean = cleanText(url);
  const patterns = [
    /\/entry\/place\/(\d+)/,
    /\/place\/(\d+)/,
    /\/hospital\/(\d+)/,
    /\/restaurant\/(\d+)/,
    /placeId=(\d+)/
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function openReviewExitModal(reviewUrl) {
  pendingReviewUrl = cleanText(reviewUrl);
  if (!dom.reviewExitModal || !pendingReviewUrl) {
    openReviewTarget(pendingReviewUrl);
    return;
  }
  dom.reviewExitModal.hidden = false;
}

function closeReviewExitModal() {
  pendingReviewUrl = "";
  if (dom.reviewExitModal) dom.reviewExitModal.hidden = true;
}

function confirmReviewExit() {
  const reviewUrl = pendingReviewUrl || getReviewTargetUrl();
  closeReviewExitModal();
  openReviewTarget(reviewUrl);
}

async function confirmPhotoReviewDone() {
  const participant = getSelectedParticipant();
  if (!participant || isSessionClosed(participant)) return;
  if (!participant.reviewOpenedAt) {
    toast("먼저 네이버 리뷰 작성하기를 눌러주세요.");
    return;
  }

  if (isSupabaseEnabled()) {
    try {
      await ensureRemoteSession();
      const result = await window.FaceFilterSupabase.setPhotoReviewDone({
        ...getRemoteParticipantRequest(participant),
        done: true
      });
      if (!result.ok) {
        toast(getRemoteErrorMessage(result.code));
        return;
      }
      applyRemoteResult(result, "draw");
      saveState();
      renderAll();
      toast("리뷰 작성 완료 확인");
    } catch (error) {
      console.error(error);
      toast("DB 연결 중 오류가 발생했습니다.");
    }
    return;
  }

  participant.reviewStatus = "self_confirmed";
  participant.reviewEvidence = {
    naverId: participant.naverId,
    mode: "customer_done_button",
    submittedAt: new Date().toISOString()
  };
  participant.updatedAt = new Date().toISOString();
  addAudit("photo_review_self_confirmed", participant.id, { source: "customer_done_button" });
  setCustomerStep("draw");
  saveState();
  renderAll();
  toast("리뷰 작성 완료 확인");
}

function openPendingReviewWindow(reviewUrl) {
  if (!reviewUrl) return null;
  try {
    const pendingWindow = window.open("about:blank", "_blank");
    if (!pendingWindow) return null;
    pendingWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>네이버 리뷰 열기</title>
          <style>
            body {
              display: grid;
              min-height: 100vh;
              margin: 0;
              place-items: center;
              background: #f6f7f5;
              color: #202120;
              font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;
            }
            main {
              width: min(320px, calc(100vw - 40px));
              text-align: center;
              line-height: 1.55;
            }
            strong {
              display: block;
              margin-bottom: 8px;
              font-size: 1.15rem;
            }
            span {
              color: #747873;
              font-size: 0.92rem;
            }
          </style>
        </head>
        <body>
          <main>
            <strong>네이버 리뷰 페이지로 이동 중입니다.</strong>
            <span>리뷰 작성 후 이벤트 화면으로 돌아와 상품뽑기를 진행해 주세요.</span>
          </main>
        </body>
      </html>
    `);
    pendingWindow.document.close();
    return pendingWindow;
  } catch {
    return null;
  }
}

function openReviewTarget(reviewUrl, pendingWindow = null) {
  if (!reviewUrl) return;

  if (pendingWindow && !pendingWindow.closed) {
    try {
      pendingWindow.location.replace(reviewUrl);
      pendingWindow.focus();
      return;
    } catch {
      // Fall through to direct navigation.
    }
  }

  const opened = window.open(reviewUrl, "_blank");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // Ignore opener restrictions.
    }
    return;
  }

  window.location.assign(reviewUrl);
}

function openExternalUrl(url) {
  const targetUrl = cleanText(url);
  if (!targetUrl) return false;
  const opened = window.open(targetUrl, "_blank", "noopener");
  if (!opened && isMobileBrowser()) {
    window.location.href = targetUrl;
    return false;
  }
  return Boolean(opened);
}

function closePendingReviewWindow(pendingWindow) {
  if (!pendingWindow || pendingWindow.closed) return;
  try {
    pendingWindow.close();
  } catch {
    // Ignore browser-specific close restrictions.
  }
}

function openCustomerHelpModal() {
  dom.customerHelpModal.hidden = false;
}

function closeCustomerHelpModal() {
  dom.customerHelpModal.hidden = true;
}

async function verifyKakaoChannel() {
  const participant = getSelectedParticipant();
  if (!participant) return;
  if (isSessionClosed(participant)) return;
  if (participant.kakaoVerified) {
    toast("이미 카카오톡 채널 추가가 확인되었습니다.");
    return;
  }
  if (!hasKakaoChannelOpened(participant)) {
    if (dom.verifyKakao) dom.verifyKakao.hidden = true;
    toast("카카오톡 채널 배너를 먼저 눌러주세요.");
    renderAll();
    return;
  }

  await applyKakaoBenefit(participant);
}

async function applyKakaoBenefit(participant, { closeModal = true } = {}) {
  if (!participant || participant.kakaoVerified) return true;

  participant.kakaoOpenedAt = participant.kakaoOpenedAt || new Date().toISOString();
  participant.kakaoVerified = true;
  participant.kakaoVerifiedAt = participant.kakaoVerifiedAt || new Date().toISOString();
  participant.updatedAt = new Date().toISOString();

  if (isSupabaseEnabled()) {
    try {
      await ensureRemoteSession();
      const result = await window.FaceFilterSupabase.setKakaoVerified(getRemoteParticipantRequest(participant));
      if (!result.ok) {
        participant.kakaoVerified = false;
        toast("카카오톡 채널 추가 상태를 저장하지 못했습니다.");
        renderAll();
        return false;
      }
      applyRemoteResult(result, "final");
    } catch (error) {
      console.error(error);
      participant.kakaoVerified = false;
      toast("DB 연결 중 오류가 발생했습니다.");
      renderAll();
      return false;
    }
  } else {
    addAudit("kakao_channel_confirmed", participant.id, { source: "customer_channel_action" });
  }

  setCustomerStep("final");
  saveState();
  if (closeModal) closeKakaoBenefitModal();
  renderAll();
  toast("카카오톡 채널 추가 완료");
  return true;
}

async function openKakaoChannel() {
  const participant = getSelectedParticipant();
  if (!participant) return;
  if (isSessionClosed(participant)) return;
  const kakaoChannelUrl = state.settings?.kakaoChannelUrl;
  addAudit("kakao_channel_link_opened", participant.id, { hasKakaoChannelUrl: Boolean(kakaoChannelUrl) });

  if (!kakaoChannelUrl) {
    saveState();
    toast("관리자 화면에서 카카오톡 채널 링크를 먼저 저장해 주세요.");
    return;
  }

  participant.kakaoOpenedAt = participant.kakaoOpenedAt || new Date().toISOString();
  participant.updatedAt = new Date().toISOString();
  saveState();
  renderAll();
  const applied = await applyKakaoBenefit(participant);
  if (!applied) return;
  openExternalUrl(kakaoChannelUrl);
  persistKakaoOpened(participant);
}

async function confirmExistingKakaoChannel() {
  const participant = getSelectedParticipant();
  if (!participant) return;
  if (isSessionClosed(participant)) return;
  addAudit("kakao_already_added_clicked", participant.id, { source: "already_added_button" });
  await applyKakaoBenefit(participant);
}

async function persistKakaoOpened(participant) {
  if (!participant || !isSupabaseEnabled() || !window.FaceFilterSupabase?.markKakaoOpened) return;
  try {
    await ensureRemoteSession();
    const result = await window.FaceFilterSupabase.markKakaoOpened(getRemoteParticipantRequest(participant));
    if (result?.ok) {
      applyRemoteResult(result, getWizardStepKey());
      saveState();
      renderAll();
    }
  } catch (error) {
    console.warn("카카오톡 채널 열기 기록 저장 실패", error);
  }
}

function openKakaoBenefitModal() {
  const participant = getSelectedParticipant();
  if (!participant || participant.kakaoVerified || isSessionClosed(participant)) return;
  dom.kakaoBenefitModal.hidden = false;
  if (dom.verifyKakao) {
    dom.verifyKakao.hidden = true;
    dom.verifyKakao.disabled = true;
  }
  dom.kakaoBenefitStatus.textContent = "";
}

function closeKakaoBenefitModal() {
  dom.kakaoBenefitModal.hidden = true;
}

async function saveChannelSettings(event) {
  event.preventDefault();
  const form = new FormData(dom.channelForm);
  const kakaoChannelUrl = cleanText(form.get("kakaoChannelUrl"));
  if (isLiveAdminReady()) {
    try {
      await ensureAdminAccessToken();
      await window.FaceFilterSupabase.updateSettings({ kakaoChannelUrl });
      await refreshAdminState({ silent: true });
      toast("링크 설정이 DB에 저장되었습니다.");
    } catch (error) {
      console.error(error);
      toast("링크 저장에 실패했습니다.");
    }
    return;
  }

  state.settings.kakaoChannelUrl = kakaoChannelUrl;
  addAudit("settings_links_updated", "-", {
    hasKakaoChannelUrl: Boolean(kakaoChannelUrl)
  });
  saveState();
  renderAll();
  toast("링크 설정이 저장되었습니다.");
}

function runAdminDraw(participantId) {
  setSelectedParticipant(participantId);
  runDraw();
}

async function runStaffForceDraw(participantId) {
  const participant = getParticipant(participantId);
  const check = canStaffOverrideDraw(participant);
  if (!check.ok) {
    toast(check.reason);
    return;
  }

  setSelectedParticipant(participantId);
  renderAll();

  const memo = getStaffOverrideMemo(participant);
  if (!memo) {
    toast("대신뽑기 사유를 지급 메모에 남겨주세요.");
    return;
  }

  const confirmed = window.confirm("네이버 포토리뷰 작성 화면을 직접 확인했나요?\n확인한 경우에만 대신뽑기를 진행합니다.");
  if (!confirmed) return;

  if (isSupabaseEnabled()) {
    try {
      await ensureAdminAccessToken();
      const result = await window.FaceFilterSupabase.staffForceDraw({
        participantId,
        staffMemo: memo,
        dropChoice: null
      });
      if (!result.ok) {
        toast(getRemoteErrorMessage(result.code));
        return;
      }
      applyRemoteResult(result, "final");
      saveState();
      renderAll();
      if (!isBackofficeMode()) openKakaoBenefitModal();
      toast("직원 확인 후 대신뽑기를 완료했습니다.");
    } catch (error) {
      console.error(error);
      toast("대신뽑기 처리 중 오류가 발생했습니다.");
    }
    return;
  }

  participant.reviewStatus = "approved";
  participant.reviewEvidence = {
    ...(participant.reviewEvidence || {}),
    staffOverride: true,
    staffOverrideAt: new Date().toISOString(),
    staffOverrideMemo: memo
  };
  participant.staffMemo = memo;
  addAudit("staff_review_override", participant.id, { memo });
  const result = executeDraw(participant, null);
  saveState();
  renderAll();
  if (result.ok && !isBackofficeMode()) openKakaoBenefitModal();
  toast(result.ok ? "직원 확인 후 대신뽑기를 완료했습니다." : result.message);
}

function getStaffOverrideMemo(participant) {
  const typedMemo = cleanText(document.querySelector("#staff-memo")?.value || "");
  const existingMemo = cleanText(participant?.staffMemo || "");
  if (typedMemo) return typedMemo;
  if (existingMemo) return existingMemo;
  const prompted = window.prompt("특이사항 메모를 입력해 주세요.", "네이버 리뷰 작성 화면 직접 확인 후 대신뽑기");
  return cleanText(prompted || "");
}

function selectDropChoice(dropChoice) {
  const participant = getSelectedParticipant();
  if (!participant || drawInProgress || isSessionClosed(participant)) return;
  const selectedDrop = getValidDropChoice(dropChoice);
  if (!selectedDrop) return;

  const check = canDraw(participant);
  if (!check.ok) {
    toast(check.reason);
    return;
  }

  participant.drawIntent = selectedDrop;
  participant.updatedAt = new Date().toISOString();
  saveState();
  renderAll();
}

function runDraw(dropChoice = null) {
  const participant = getSelectedParticipant();
  if (!participant || drawInProgress) return;
  if (isSessionClosed(participant)) return;
  const selectedDrop = getValidDropChoice(dropChoice) || getValidDropChoice(participant.drawIntent);

  const check = canDraw(participant);
  if (!check.ok) {
    addAudit("draw_blocked", participant.id, { reason: check.reason });
    saveState();
    renderAll();
    toast(check.reason);
    return;
  }

  if (!selectedDrop) {
    toast("물방울을 먼저 선택해 주세요.");
    return;
  }

  const now = Date.now();
  if (participant.lastDrawAttemptAt && now - participant.lastDrawAttemptAt < DRAW_COOLDOWN_MS) {
    toast("뽑기 요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.");
    return;
  }

  drawInProgress = true;
  participant.lastDrawAttemptAt = now;
  participant.drawIntent = selectedDrop;
  dom.runDraw.disabled = true;
  dom.miniGame.classList.add("is-spinning");
  dom.drawResult.hidden = false;
  dom.drawResult.textContent = selectedDrop
    ? `${selectedDrop}번 선택 중`
    : "확인 중";
  saveState();

  window.setTimeout(async () => {
    const current = getSelectedParticipant();
    const result = isSupabaseEnabled()
      ? await executeRemoteDraw(current, selectedDrop)
      : executeDraw(current, selectedDrop);
    drawInProgress = false;
    dom.miniGame.classList.remove("is-spinning");
    saveState();
    renderAll();
    if (result.ok) openKakaoBenefitModal();
    toast(result.message);
  }, 700);
}

async function executeRemoteDraw(participant, dropChoice = null) {
  if (!participant) return { ok: false, message: "참여자를 찾을 수 없습니다." };
  try {
    await ensureRemoteSession();
    const result = await window.FaceFilterSupabase.runDraw({
      ...getRemoteParticipantRequest(participant),
      dropChoice,
      drawType: "primary"
    });
    applyRemoteResult(result, "final");
    const waitMessage = result.code === "review_wait_required" && result.waitSeconds
      ? `${Number(result.waitSeconds)}초 후 상품뽑기가 열립니다.`
      : "";
    return {
      ok: Boolean(result.ok),
      message: result.ok ? "상품 확인 완료" : waitMessage || getRemoteErrorMessage(result.code)
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "DB 연결 중 오류가 발생했습니다." };
  }
}

function canDraw(participant) {
  if (!participant) return { ok: false, reason: "참여자를 먼저 등록해 주세요." };
  if (participant.draw) return { ok: false, reason: `이미 ${participant.draw.prizeName} 당첨 결과가 확정되어 있습니다.` };
  if (!participant.reviewOpenedAt) {
    return { ok: false, reason: "네이버 리뷰 작성하기 버튼을 먼저 눌러주세요." };
  }
  if (!isReviewComplete(participant)) {
    return { ok: false, reason: "리뷰 작성 완료 버튼을 누르면 상품뽑기가 열립니다." };
  }
  const available = getAvailablePrizes();
  if (!available.length) return { ok: false, reason: "현재 뽑기 가능한 상품이 없습니다." };
  return { ok: true };
}

function canStaffOverrideDraw(participant) {
  if (!isBackofficeMode()) return { ok: false, reason: "직원 화면에서만 대신뽑기가 가능합니다." };
  if (!participant) return { ok: false, reason: "참여자를 먼저 선택해 주세요." };
  if (participant.giftStatus === "done") return { ok: false, reason: "이미 지급완료된 참여입니다." };
  if (participant.draw) return { ok: false, reason: "이미 뽑기 결과가 확정되어 있습니다." };
  if (isReviewComplete(participant)) return { ok: false, reason: "리뷰 완료 상태는 일반 뽑기를 사용해 주세요." };
  const available = getAvailablePrizes();
  if (!available.length) return { ok: false, reason: "현재 뽑기 가능한 상품이 없습니다." };
  return { ok: true };
}

function executeDraw(participant, dropChoice = null) {
  if (!participant) return { ok: false, message: "참여자를 찾을 수 없습니다." };
  const precheck = canDraw(participant);
  if (!precheck.ok) return { ok: false, message: precheck.reason };

  const recentSameDeviceDraws = state.participants.filter((person) => (
    person.id !== participant.id &&
    person.deviceKey === participant.deviceKey &&
    person.draw &&
    minutesBetween(person.draw.drawnAt, new Date().toISOString()) < 10
  ));
  if (recentSameDeviceDraws.length >= 2 && !participant.flags.includes("같은 기기에서 10분 내 반복 뽑기가 감지되었습니다.")) {
    participant.flags.push("같은 기기에서 10분 내 반복 뽑기가 감지되었습니다.");
  }

  const prize = pickWeightedPrize();
  if (!prize) return { ok: false, message: "상품 후보가 없습니다." };

  prize.awarded += 1;
  const drawRecord = {
    id: createId("D"),
    type: "primary",
    prizeId: prize.id,
    prizeName: prize.name,
    prizeDescription: prize.description || "",
    confirmCode: createConfirmCode(participant.id),
    dropChoice,
    drawnAt: new Date().toISOString(),
    randomProof: stableHash(`${participant.id}|${prize.id}|${dropChoice || "auto"}|${Date.now()}|${secureRandomInt(1000000)}`)
  };
  participant.draw = drawRecord;
  setCustomerStep("final");
  participant.giftStatus = "waiting";
  participant.updatedAt = new Date().toISOString();
  addAudit("draw_completed", participant.id, {
    prizeId: prize.id,
    prizeName: prize.name,
    confirmCode: drawRecord.confirmCode,
    dropChoice,
    remaining: getRemaining(prize)
  });
  return { ok: true, message: "상품 확인 완료" };
}

function pickWeightedPrize() {
  const available = getAvailablePrizes();
  const totalWeight = available.reduce((sum, prize) => sum + Number(prize.weight), 0);
  let ticket = secureRandomFloat() * totalWeight;
  for (const prize of available) {
    ticket -= Number(prize.weight);
    if (ticket <= 0) return prize;
  }
  return available[available.length - 1];
}

async function completeGift(participantId) {
  const participant = getParticipant(participantId);
  if (!participant || !participant.draw || participant.giftStatus === "done") return;
  const staffFields = getStaffRecordFormValues(participant);

  if (isSupabaseEnabled()) {
    try {
      if (isBackofficeMode()) await ensureAdminAccessToken();
      const result = await window.FaceFilterSupabase.completeGift({
        participantId,
        staffMemo: staffFields.staffMemo,
        staffName: staffFields.staffName,
        giftStaffName: staffFields.staffName,
        promoterName: staffFields.staffName,
        customerChartNo: staffFields.customerChartNo
      });
      if (!result.ok) {
        toast("지급 완료 처리에 실패했습니다.");
        return;
      }
      const updated = applyRemoteResult(result, "final");
      if (updated?.id === selectedParticipantId) closeCurrentSession();
      saveState();
      renderAll();
      toast(result.legacyStaffFields
        ? "지급완료 처리됨. 담당자 저장은 SQL 패치 실행 후 가능합니다."
        : result.legacyChartField
          ? "지급완료 처리됨. 고객 차트번호 저장은 SQL 패치 실행 후 가능합니다."
        : "직원 확인 및 증정 완료 처리되었습니다.");
    } catch (error) {
      console.error(error);
      toast("관리자 로그인 연동 후 지급 완료 처리가 가능합니다.");
    }
    return;
  }

  participant.giftStatus = "done";
  participant.giftCompletedAt = new Date().toISOString();
  participant.promoterName = staffFields.staffName;
  participant.giftStaffName = staffFields.staffName;
  participant.customerChartNo = staffFields.customerChartNo;
  participant.staffMemo = staffFields.staffMemo;
  participant.updatedAt = new Date().toISOString();
  if (participant.id === selectedParticipantId && !isBackofficeMode()) closeCurrentSession();
  addAudit("gift_completed", participant.id, {
    prizeName: participant.draw.prizeName,
    confirmCode: participant.draw.confirmCode,
    staffName: getParticipantStaffName(participant),
    staffCheck: "review_screen_and_result_screen"
  });
  saveState();
  renderAll();
  toast("직원 확인 및 증정 완료 처리되었습니다.");
}

async function saveStaffRecord(participantId) {
  const participant = getParticipant(participantId);
  if (!participant) return;
  const staffFields = getStaffRecordFormValues(participant);

  if (isSupabaseEnabled()) {
    try {
      await ensureAdminAccessToken();
      const result = await window.FaceFilterSupabase.updateParticipantStaffFields({
        participantId,
        staffName: staffFields.staffName,
        promoterName: staffFields.staffName,
        giftStaffName: staffFields.staffName,
        customerChartNo: staffFields.customerChartNo,
        staffMemo: staffFields.staffMemo
      });
      if (!result.ok) {
        toast("담당자 기록 저장에 실패했습니다.");
        return;
      }
      applyRemoteResult(result, getWizardStepKey());
      saveState();
      renderAll();
      toast(result.legacyChartField ? "담당자 기록 저장됨. 고객 차트번호 저장은 SQL 패치 실행 후 가능합니다." : "담당자 기록을 저장했습니다.");
    } catch (error) {
      console.error(error);
      toast("담당자 기록 SQL 패치를 먼저 실행해 주세요.");
    }
    return;
  }

  participant.promoterName = staffFields.staffName;
  participant.giftStaffName = staffFields.staffName;
  participant.customerChartNo = staffFields.customerChartNo;
  participant.staffMemo = staffFields.staffMemo;
  participant.updatedAt = new Date().toISOString();
  addAudit("staff_record_updated", participant.id, staffFields);
  saveState();
  renderAll();
  toast("담당자 기록을 저장했습니다.");
}

function getStaffRecordFormValues(participant) {
  const defaultStaffName = getDefaultStaffName();
  const existingStaffName = getParticipantStaffName(participant);
  const enteredStaffName = cleanText(document.querySelector("#staff-name")?.value || "");
  const staffName = existingStaffName || enteredStaffName || defaultStaffName;
  return {
    staffName,
    promoterName: staffName,
    giftStaffName: staffName,
    customerChartNo: cleanText(document.querySelector("#customer-chart-no")?.value || participant.customerChartNo || ""),
    staffMemo: cleanText(document.querySelector("#staff-memo")?.value || participant.staffMemo || "")
  };
}

function getDefaultStaffName() {
  return cleanText(state.staffProfile?.displayName || adminAuth.email || "");
}

function getParticipantStaffName(participant) {
  return cleanText(participant?.giftStaffName || participant?.promoterName || "");
}

async function deleteParticipant(participantId) {
  const participant = getParticipant(participantId);
  if (!participant) return;

  const ok = window.confirm(`${participant.customerName} 참여 내역을 삭제할까요?\n테스트 또는 오등록 내역만 삭제해 주세요.`);
  if (!ok) return;

  if (isLiveAdminReady()) {
    try {
      await ensureAdminAccessToken();
      const result = await window.FaceFilterSupabase.deleteParticipant({ participantId });
      if (!result.ok) {
        toast("참여 내역 삭제에 실패했습니다.");
        return;
      }
      if (selectedParticipantId === participantId) selectedParticipantId = null;
      await refreshAdminState({ silent: true });
      saveState();
      renderAll();
      toast("참여 내역을 삭제했습니다.");
    } catch (error) {
      console.error(error);
      const message = String(error?.message || "");
      toast(message.includes("ff_delete_participant") || message.includes("Could not find")
        ? "삭제 기능 SQL 패치를 먼저 실행해 주세요."
        : "관리자 로그인 상태에서만 참여 내역 삭제가 가능합니다.");
    }
    return;
  }

  if (participant.draw?.prizeId) {
    const prize = state.prizes.find((item) => item.id === participant.draw.prizeId);
    if (prize) prize.awarded = Math.max(Number(prize.awarded) - 1, 0);
  }

  state.participants = state.participants.filter((item) => item.id !== participantId);
  if (selectedParticipantId === participantId) selectedParticipantId = null;
  addAudit("participant_deleted", participantId, {
    customerName: participant.customerName,
    chartCode: participant.chartNo,
    prizeName: participant.draw?.prizeName || null
  });
  saveState();
  renderAll();
  toast("참여 내역을 삭제했습니다.");
}

function copyChartMemo(participantId) {
  const participant = getParticipant(participantId);
  if (!participant) return;
  const memo = createChartMemo(participant);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(memo).then(() => toast("차트 메모가 복사되었습니다."));
  } else {
    toast("차트 메모를 선택해서 복사해 주세요.");
  }
}

function getInlineIcon(name) {
  return INLINE_ICONS[name] || INLINE_ICONS.dot;
}

function toClassToken(value) {
  return String(value || "default").replace(/[^a-z0-9-]/gi, "") || "default";
}

function renderStatusPill(status) {
  const tone = toClassToken(status?.tone || "default");
  const key = toClassToken(status?.key || tone);
  const icon = status?.icon || getDefaultStatusIcon(status);
  return `
    <span class="status-pill ${tone} status-${key}">
      ${getInlineIcon(icon)}
      <span>${escapeHtml(status?.label || "-")}</span>
    </span>
  `;
}

function renderProgressHint(insight) {
  const tone = toClassToken(insight?.tone || "default");
  const key = toClassToken(insight?.key || tone);
  const icon = insight?.icon || getDefaultProgressIcon(insight);
  return `
    <span class="progress-hint ${tone} progress-${key}">
      ${getInlineIcon(icon)}
      <span>${escapeHtml(insight?.label || "-")}</span>
    </span>
  `;
}

function setStatusPillElement(element, status) {
  if (!element) return;
  const tone = toClassToken(status?.tone || "default");
  const key = toClassToken(status?.key || tone);
  const icon = status?.icon || getDefaultStatusIcon(status);
  element.className = `status-pill ${tone} status-${key}`;
  element.innerHTML = `${getInlineIcon(icon)}<span>${escapeHtml(status?.label || "-")}</span>`;
}

function getDefaultStatusIcon(status) {
  if (status?.tone === "done") return "check";
  if (status?.tone === "danger") return "alert";
  if (status?.tone === "pending") return "clock";
  if (status?.key === "staff-wait") return "userCheck";
  return "dot";
}

function getDefaultProgressIcon(insight) {
  if (insight?.key === "review-open") return "open";
  if (insight?.key === "review-return") return "return";
  if (insight?.key === "draw-ready") return "gift";
  if (insight?.key === "staff-wait") return "userCheck";
  if (insight?.key === "completed") return "check";
  if (insight?.tone === "danger") return "alert";
  return "dot";
}

function renderAll() {
  renderAdminAuth();
  renderCustomerFlow();
  renderStats();
  renderMaintenance();
  renderParticipantTable();
  renderDetailPanel();
  renderAudit();
  renderGuardrails();
  renderChannelSettings();
  renderPrizeTable();
}

function renderAdminAuth() {
  if (!dom.adminAuthCard) return;
  const backofficeMode = isBackofficeMode();
  const signedIn = backofficeMode && Boolean(adminAuth.accessToken);
  const ownerVisible = signedIn && isOwnerUser() && APP_MODE === "admin";
  dom.adminAuthCard.hidden = !backofficeMode;
  dom.adminProtected.forEach((element) => {
    element.hidden = !signedIn;
  });
  dom.ownerOnly.forEach((element) => {
    element.hidden = !ownerVisible;
  });
  dom.adminLoginForm.hidden = signedIn;
  dom.adminSessionActions.hidden = !signedIn;
  setStatusPillElement(dom.adminAuthStatus, signedIn
    ? { label: "로그인됨", tone: "done", key: "signed-in", icon: "check" }
    : { label: "로그인 필요", tone: "muted", key: "signed-out", icon: "shield" });
  if (signedIn && !dom.adminAuthMessage.textContent) {
    const roleLabel = isOwnerUser() ? "관리자" : "현장직원";
    setMessage(dom.adminAuthMessage, `${adminAuth.email || roleLabel} 계정으로 접속 중입니다.`, "success");
  }
}

function renderCustomerFlow() {
  if (isBackofficeMode()) {
    renderBackofficeCustomerGuard();
    return;
  }

  const participant = getSelectedParticipant();
  const hasParticipant = Boolean(participant);
  const sessionClosed = isSessionClosed(participant);
  const status = participant ? getParticipantStatus(participant) : { label: "미선택", tone: "muted" };
  const reviewStatusText = getReviewOpenStatusText(participant);

  if (sessionClosed) {
    closeReviewExitModal();
    closeKakaoBenefitModal();
    setCustomerStep("final");
  }

  dom.openReview.disabled = !hasParticipant || sessionClosed;
  dom.reviewOpenStatus.textContent = reviewStatusText;
  dom.reviewOpenStatus.hidden = !reviewStatusText;
  if (dom.photoReviewDone) {
    const showReviewDone = Boolean(hasParticipant && participant.reviewOpenedAt && !isReviewComplete(participant) && !participant.draw && !sessionClosed);
    dom.photoReviewDone.hidden = !showReviewDone;
    dom.photoReviewDone.disabled = !showReviewDone;
  }
  if (dom.verifyKakao) {
    dom.verifyKakao.hidden = true;
    dom.verifyKakao.disabled = true;
    dom.verifyKakao.textContent = participant?.kakaoVerified ? "채널 추가 완료" : "카카오톡 채널 추가";
    dom.verifyKakao.classList.toggle("is-confirmed", Boolean(participant?.kakaoVerified));
  }
  dom.kakaoBanner.classList.toggle("is-confirmed", Boolean(participant?.kakaoVerified));
  dom.kakaoBenefitStatus.textContent = participant?.kakaoVerified
    ? "카카오톡 채널 추가 완료"
    : "";
  const selectedDropChoice = getValidDropChoice(participant?.drawIntent);
  dom.runDraw.disabled = !hasParticipant || sessionClosed || !canDraw(participant).ok || !selectedDropChoice || drawInProgress;
  dom.runDraw.textContent = selectedDropChoice ? `${selectedDropChoice}번 물방울로 뽑기` : "물방울을 먼저 선택하세요";
  setStatusPillElement(dom.selectedStatus, status);
  renderCustomerPrizeOdds();
  renderMiniGame(participant);
  renderFinalSummary(participant);
  renderWizard(participant);
  scheduleReviewGateRefresh(participant, sessionClosed);

  if (!participant) {
    dom.selectedCustomer.textContent = "배너 QR을 찍은 고객이 간단 참여를 시작하면 여기에 진행 상태가 표시됩니다.";
    dom.drawResult.hidden = true;
    return;
  }

  dom.selectedCustomer.innerHTML = `
    <strong>${escapeHtml(participant.customerName)}</strong>
    <span class="muted-text">확인코드 ${escapeHtml(participant.chartNo)} · 휴대폰 ${escapeHtml(participant.phoneLast4)} · 방문 ${escapeHtml(participant.visitDate)}</span>
        <span class="muted-text">리뷰 닉네임/ID: ${escapeHtml(participant.naverId)}</span>
    ${participant.flags.length ? `<ul class="flag-list">${participant.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : ""}
  `;

  if (participant.draw) {
    dom.drawResult.hidden = false;
    dom.drawResult.innerHTML = renderDrawResultCard(participant, participant.draw, "Result");
  } else {
    dom.drawResult.hidden = true;
    dom.drawResult.textContent = "";
  }
}

function renderBackofficeCustomerGuard() {
  closeReviewExitModal();
  closeKakaoBenefitModal();
  if (dom.selectedStatus) {
    dom.selectedStatus.hidden = false;
    setStatusPillElement(dom.selectedStatus, { label: "관리자 모드", tone: "muted", key: "backoffice", icon: "shield" });
  }
  if (dom.wizardProgress) dom.wizardProgress.style.width = "0%";
  if (dom.wizardStepLabel) dom.wizardStepLabel.textContent = "고객 화면 분리";
  if (dom.selectedCustomer) {
    dom.selectedCustomer.hidden = false;
    dom.selectedCustomer.innerHTML = `
      <strong>고객 화면은 별도 QR 링크에서만 사용합니다.</strong>
      <span class="muted-text">관리자/직원 화면에서는 실제 참여자 결과를 고객 화면으로 미리보지 않습니다.</span>
    `;
  }
  dom.wizardPages?.forEach((page) => {
    page.hidden = true;
    page.classList.remove("is-active");
  });
  if (dom.drawResult) {
    dom.drawResult.hidden = true;
    dom.drawResult.textContent = "";
  }
  if (dom.finalSummary) {
    dom.finalSummary.innerHTML = "";
  }
}

function renderWizard(participant) {
  let stepKey = getWizardStepKey();
  const sessionClosed = isSessionClosed(participant);
  if (!participant && stepKey !== "register") {
    stepKey = "register";
    setCustomerStep(stepKey);
  }
  if (participant && stepKey === "register" && isDrawGateReady(participant)) {
    stepKey = getSuggestedWizardStep(participant);
    setCustomerStep(stepKey);
  }
  if (participant && sessionClosed) {
    stepKey = "final";
    setCustomerStep(stepKey);
  }
  let stepIndex = getWizardStepIndex(stepKey);
  const unlockedIndex = getUnlockedWizardIndex(participant);
  if (stepIndex > unlockedIndex) {
    stepIndex = unlockedIndex;
    stepKey = CUSTOMER_STEPS[stepIndex].key;
    setCustomerStep(stepKey);
  }
  const step = CUSTOMER_STEPS[stepIndex];

  dom.wizardPages.forEach((page) => {
    const isActive = page.dataset.wizardStep === stepKey;
    page.classList.toggle("is-active", isActive);
    page.hidden = !isActive;
  });

  dom.wizardProgress.style.width = sessionClosed ? "100%" : `${((stepIndex + 1) / CUSTOMER_STEPS.length) * 100}%`;
  dom.wizardStepLabel.textContent = step.label;
}

function renderFinalSummary(participant) {
  if (!dom.finalSummary) return;

  if (!participant) {
    dom.finalSummary.innerHTML = `
      <div class="empty-detail">결과가 표시됩니다.</div>
    `;
    return;
  }

  if (!participant.draw) {
    dom.finalSummary.innerHTML = `
      <div class="final-summary-grid">
        <div><span>고객</span><strong>${escapeHtml(participant.customerName)}</strong></div>
        <div><span>리뷰</span><strong>${escapeHtml(participant.naverId)}</strong></div>
      </div>
    `;
    return;
  }

  const sessionClosed = isSessionClosed(participant);
  dom.finalSummary.innerHTML = `
    ${sessionClosed ? `
      <div class="session-complete">
        <strong>증정 완료</strong>
        <span>직원 확인이 완료되었습니다.</span>
      </div>
    ` : ""}
    <div class="staff-checklist" aria-label="직원에게 보여줄 것">
      <p class="section-kicker">직원 확인용</p>
      <strong>리뷰 화면과 결과 화면을 보여주세요</strong>
      <div class="staff-check-chips">
        <span><b>1</b>네이버 포토리뷰</span>
        <span><b>2</b>이벤트 결과</span>
      </div>
    </div>
    <div class="result-card final-result-card">
      <div class="final-prize-head">
        <p class="section-kicker">당첨 상품</p>
        <span>확인코드 ${escapeHtml(participant.draw.confirmCode)}</span>
      </div>
      <strong>${escapeHtml(participant.draw.prizeName)}</strong>
      ${participant.draw.prizeDescription ? `<small>${escapeHtml(participant.draw.prizeDescription)}</small>` : ""}
      <dl>
        <div><dt>고객</dt><dd>${escapeHtml(participant.customerName)}</dd></div>
        <div><dt>리뷰</dt><dd>${escapeHtml(participant.naverId)}</dd></div>
        <div><dt>카톡채널</dt><dd>${participant.kakaoVerified ? "추가 완료" : "미추가"}</dd></div>
      </dl>
    </div>
    ${!sessionClosed && !participant.kakaoVerified ? `
      <button class="secondary-action final-benefit-action" type="button" data-final-action="kakao-benefit">
        카카오톡 채널 추가하기
      </button>
    ` : ""}
  `;

  dom.finalSummary.querySelector("[data-final-action='kakao-benefit']")?.addEventListener("click", openKakaoChannel);
}

function getWizardStepKey() {
  const key = sessionState.customerStep || "register";
  return CUSTOMER_STEPS.some((step) => step.key === key) ? key : "register";
}

function getWizardStepIndex(stepKey) {
  return Math.max(CUSTOMER_STEPS.findIndex((step) => step.key === stepKey), 0);
}

function getSuggestedWizardStep(participant) {
  if (!participant) return "register";
  if (!isDrawGateReady(participant)) return "review";
  if (!participant.draw) return "draw";
  return "final";
}

function isDrawGateReady(participant) {
  return Boolean(isReviewComplete(participant));
}

function isReviewAutoReady(participant, now = Date.now()) {
  if (!participant?.reviewOpenedAt) return false;
  return getReviewGateRemainingMs(participant, now) <= 0;
}

function getReviewGateRemainingMs(participant, now = Date.now()) {
  if (!participant?.reviewOpenedAt) return REVIEW_DRAW_WAIT_MS;
  const openedAt = Date.parse(participant.reviewOpenedAt);
  if (!Number.isFinite(openedAt)) return REVIEW_DRAW_WAIT_MS;
  return Math.max(REVIEW_DRAW_WAIT_MS - (now - openedAt), 0);
}

function formatReviewWait(ms) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 0) return "";
  return `${seconds}초 후 상품뽑기가 열립니다.`;
}

function scheduleReviewGateRefresh(participant, sessionClosed) {
  window.clearTimeout(reviewGateTimer);
  reviewGateTimer = 0;
}

function hasKakaoChannelOpened(participant) {
  return Boolean(participant?.kakaoOpenedAt || participant?.kakaoVerified);
}

function getReviewOpenStatusText(participant) {
  if (!participant) return "";
  if (participant.draw || isReviewComplete(participant)) return "";
  return "";
}

function getUnlockedWizardIndex(participant) {
  if (!participant) return 0;
  if (!isDrawGateReady(participant)) return 1;
  if (!participant.draw) return 2;
  return 3;
}

function renderDrawResultCard(participant, drawRecord, label) {
  return `
    <div class="result-card">
      <p class="section-kicker">당첨 상품</p>
      <strong>${escapeHtml(drawRecord.prizeName)}</strong>
      ${drawRecord.prizeDescription ? `<small>${escapeHtml(drawRecord.prizeDescription)}</small>` : ""}
      <span>확인코드 ${escapeHtml(drawRecord.confirmCode)}</span>
      <dl>
        <div><dt>리뷰</dt><dd>${escapeHtml(participant.naverId)}</dd></div>
        <div><dt>물방울</dt><dd>${escapeHtml(drawRecord.dropChoice ? `${drawRecord.dropChoice}번` : "랜덤")}</dd></div>
        <div><dt>카톡채널</dt><dd>${participant.kakaoVerified ? "추가 완료" : "미추가"}</dd></div>
        <div><dt>지급</dt><dd>${participant.giftStatus === "done" ? "완료" : "직원 확인 전"}</dd></div>
      </dl>
    </div>
  `;
}

function renderCustomerPrizeOdds() {
  const odds = getPrizeOdds();
  if (!odds.length) {
    dom.customerPrizeOdds.innerHTML = `
      <div class="odds-heading">
        <span>오늘의 상품</span>
        <strong>준비 중</strong>
      </div>
      <p class="muted-text">현재 뽑기 가능한 상품 재고가 없습니다.</p>
    `;
    return;
  }

  dom.customerPrizeOdds.innerHTML = `
    <div class="odds-heading">
      <span>상품 확률 안내</span>
    </div>
    <div class="odds-list">
      ${odds.map((item) => `
        <div class="odds-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
          </div>
          <em>${item.percentLabel}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMiniGame(participant) {
  const ready = Boolean(participant && canDraw(participant).ok && !drawInProgress);
  const alreadyDrawn = Boolean(participant?.draw);
  const selectedDrop = getValidDropChoice(participant?.drawIntent);

  if (alreadyDrawn) {
    dom.miniGame.innerHTML = `
      <div class="mini-game-complete">
        <span></span>
        <strong>${escapeHtml(participant.draw.dropChoice ? `${participant.draw.dropChoice}번 물방울 선택` : "랜덤 물방울 선택")}</strong>
      </div>
    `;
    return;
  }

  dom.miniGame.innerHTML = Array.from({ length: DRAW_CHOICES }, (_, index) => {
    const number = index + 1;
    const selected = selectedDrop === number;
    return `
      <button class="drop-choice ${selected ? "is-selected" : ""}" type="button" data-drop="${number}" aria-pressed="${selected ? "true" : "false"}" ${ready ? "" : "disabled"}>
        <span></span>
        <em>${number}</em>
      </button>
    `;
  }).join("");

  dom.miniGame.querySelectorAll(".drop-choice").forEach((button) => {
    button.addEventListener("click", () => selectDropChoice(Number(button.dataset.drop)));
  });
}

function renderChannelSettings() {
  dom.kakaoChannelUrl.value = state.settings?.kakaoChannelUrl || "";
}

function renderStats() {
  const stats = [
    ["전체 참여", state.participants.length],
    ["리뷰 링크 열림", state.participants.filter((p) => p.reviewOpenedAt).length],
    ["카톡 채널 추가", state.participants.filter((p) => p.kakaoVerified).length],
    ["직원 확인 대기", state.participants.filter((p) => p.draw && p.giftStatus !== "done").length],
    ["증정 완료", state.participants.filter((p) => p.giftStatus === "done").length]
  ];

  dom.statsGrid.innerHTML = stats.map(([label, value]) => `
    <article class="stat-card">
      <p>${label}</p>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderMaintenance() {
  if (!dom.maintenanceCard) return;
  const maintenance = normalizeMaintenance(state.maintenance || buildLocalMaintenanceSummary());
  const health = getMaintenanceHealth(maintenance);
  const participantDays = maintenance.retention.participantDays;
  const sessionDays = maintenance.retention.sessionDays;
  const auditDays = maintenance.retention.auditDays;
  const rows = [
    {
      label: `참여자 개인정보 ${participantDays}일`,
      current: `${maintenance.participants.total.toLocaleString("ko-KR")}건`,
      issue: maintenance.participants.oldCount
        ? `${maintenance.participants.oldCount.toLocaleString("ko-KR")}건 초과`
        : "정상",
      danger: maintenance.participants.oldCount > 0
    },
    {
      label: `QR 세션 ${sessionDays}일`,
      current: `${maintenance.sessions.total.toLocaleString("ko-KR")}건`,
      issue: maintenance.sessions.oldCount
        ? `${maintenance.sessions.oldCount.toLocaleString("ko-KR")}건 초과`
        : "정상",
      danger: maintenance.sessions.oldCount > 0
    },
    {
      label: `감사로그 ${auditDays}일`,
      current: `${maintenance.auditLogs.total.toLocaleString("ko-KR")}건`,
      issue: maintenance.auditLogs.oldCount
        ? `${maintenance.auditLogs.oldCount.toLocaleString("ko-KR")}건 초과`
        : "정상",
      danger: maintenance.auditLogs.oldCount > 0
    }
  ];

  dom.maintenanceCard.innerHTML = `
    <div class="panel-heading compact-heading">
      <div>
        <p class="section-kicker">Data Care</p>
        <h2>데이터 보관 레드라인</h2>
      </div>
      ${renderStatusPill(health)}
    </div>
    <div class="maintenance-grid">
      ${rows.map((row) => `
        <div class="maintenance-item ${row.danger ? "is-danger" : ""}">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.current)}</strong>
          <em>${escapeHtml(row.issue)}</em>
        </div>
      `).join("")}
    </div>
    <p class="helper-copy maintenance-copy">
      월간 집계 후 초과 데이터가 보이면 정리 SQL을 실행하세요. 화면 조회는 최근 90일/최근 로그 500개 중심이라 당장 느려지지는 않지만, 개인정보는 오래 보관하지 않는 쪽이 안전합니다.
    </p>
  `;
}

function buildLocalMaintenanceSummary() {
  const now = Date.now();
  const participantCutoff = now - DATA_RETENTION_LIMITS.participantDays * 86400000;
  const auditCutoff = now - DATA_RETENTION_LIMITS.auditDays * 86400000;
  const participantTimes = state.participants.map((item) => Date.parse(item.createdAt)).filter(Number.isFinite);
  const auditTimes = state.audit.map((item) => Date.parse(item.at)).filter(Number.isFinite);

  return {
    generatedAt: new Date().toISOString(),
    retention: {
      participantDays: DATA_RETENTION_LIMITS.participantDays,
      sessionDays: DATA_RETENTION_LIMITS.sessionDays,
      auditDays: DATA_RETENTION_LIMITS.auditDays
    },
    participants: {
      total: state.participants.length,
      oldCount: participantTimes.filter((time) => time < participantCutoff).length,
      oldestAt: participantTimes.length ? new Date(Math.min(...participantTimes)).toISOString() : null,
      latestAt: participantTimes.length ? new Date(Math.max(...participantTimes)).toISOString() : null
    },
    sessions: {
      total: 0,
      oldCount: 0,
      oldestAt: null,
      latestAt: null
    },
    auditLogs: {
      total: state.audit.length,
      oldCount: auditTimes.filter((time) => time < auditCutoff).length,
      oldestAt: auditTimes.length ? new Date(Math.min(...auditTimes)).toISOString() : null,
      latestAt: auditTimes.length ? new Date(Math.max(...auditTimes)).toISOString() : null
    }
  };
}

function getMaintenanceHealth(maintenance) {
  const needsCleanup = maintenance.participants.oldCount > 0
    || maintenance.sessions.oldCount > 0
    || maintenance.auditLogs.oldCount > 0;
  if (needsCleanup) {
    return { label: "정리 필요", tone: "danger", key: "maintenance-danger", icon: "alert" };
  }

  const highVolume = maintenance.participants.total >= DATA_RETENTION_LIMITS.participantCount
    || maintenance.sessions.total >= DATA_RETENTION_LIMITS.sessionCount
    || maintenance.auditLogs.total >= DATA_RETENTION_LIMITS.auditCount;
  if (highVolume) {
    return { label: "점검 권장", tone: "pending", key: "maintenance-warning", icon: "clock" };
  }

  return { label: "정상", tone: "done", key: "maintenance-ok", icon: "check" };
}

function renderParticipantTable() {
  const query = normalizeKey(dom.searchInput.value || "");
  const filter = dom.statusFilter.value;
  const participants = state.participants.filter((participant) => {
    const haystack = normalizeKey(`${participant.customerName} ${participant.chartNo} ${participant.customerChartNo || ""} ${participant.phoneLast4} ${participant.naverId || ""}`);
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = filter === "all" || getStatusKey(participant) === filter || (filter === "flagged" && participant.flags.length);
    return matchesQuery && matchesFilter;
  });

  if (!participants.length) {
    dom.participantTable.innerHTML = `<tr><td colspan="5" class="muted-text">조건에 맞는 참여자가 없습니다.</td></tr>`;
    return;
  }

  dom.participantTable.innerHTML = participants.map((participant) => {
    const status = getParticipantStatus(participant);
    const reviewText = getReviewLabel(participant.reviewStatus);
    const stopInsight = getParticipantStopInsight(participant);
    const prizeText = participant.draw
      ? `${escapeHtml(participant.draw.prizeName)}<br><span class="muted-text">${escapeHtml(participant.draw.confirmCode)}</span>`
      : "-";
    return `
      <tr class="${participant.id === selectedParticipantId ? "is-selected" : ""}" data-participant-row="${participant.id}">
        <td>
          <div class="identity">
            <strong>${escapeHtml(participant.customerName)}</strong>
            <span>${escapeHtml(participant.chartNo)} · ${escapeHtml(participant.phoneLast4)}</span>
            <span>리뷰 ${escapeHtml(participant.naverId)}</span>
          </div>
        </td>
        <td>${renderStatusPill(status)}</td>
        <td>
          <div class="progress-cell">
            <strong>${escapeHtml(reviewText)}</strong>
            ${renderProgressHint(stopInsight)}
          </div>
        </td>
        <td>${prizeText}</td>
        <td>
          <div class="row-actions">
            <button class="small-action" type="button" data-action="select" data-id="${participant.id}">선택</button>
            ${canDraw(participant).ok ? `<button class="small-action" type="button" data-action="draw" data-id="${participant.id}">뽑기</button>` : ""}
            ${canStaffOverrideDraw(participant).ok ? `<button class="small-action warning-action" type="button" data-action="force-draw" data-id="${participant.id}">대신뽑기</button>` : ""}
            ${participant.draw && participant.giftStatus !== "done" ? `<button class="small-action" type="button" data-action="gift" data-id="${participant.id}">지급완료</button>` : ""}
            ${APP_MODE === "admin" ? `<button class="small-action danger-action compact-danger" type="button" data-action="delete" data-id="${participant.id}">삭제</button>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  dom.participantTable.querySelectorAll("[data-participant-row]").forEach((row) => {
    row.addEventListener("click", () => handleParticipantAction("select", row.dataset.participantRow));
  });

  dom.participantTable.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handleParticipantAction(button.dataset.action, button.dataset.id);
    });
  });
}

function handleParticipantAction(action, id) {
  if (action === "select") {
    setSelectedParticipant(id, getSuggestedWizardStep(getParticipant(id)));
    if (!isBackofficeMode()) setActiveTab("customer");
    saveState();
    renderAll();
  }
  if (action === "draw") runAdminDraw(id);
  if (action === "force-draw") runStaffForceDraw(id);
  if (action === "gift") completeGift(id);
  if (action === "delete") deleteParticipant(id);
}

function renderDetailPanel() {
  const participant = getSelectedParticipant();
  if (!participant) {
    dom.detailPanel.innerHTML = `<div class="empty-detail">참여자를 선택하면 상세 정보가 표시됩니다.</div>`;
    return;
  }

  const chartMemo = createChartMemo(participant);
  const status = getParticipantStatus(participant);
  const savedStaffName = getParticipantStaffName(participant);
  const staffNameLocked = Boolean(savedStaffName);
  const staffNameValue = savedStaffName || getDefaultStaffName();
  const stopInsight = getParticipantStopInsight(participant);
  dom.detailPanel.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="section-kicker">Staff Check</p>
        <h2>${escapeHtml(participant.customerName)}</h2>
      </div>
      ${renderStatusPill(status)}
    </div>
    <div class="detail-block">
      <h3>고객 확인 정보</h3>
      <div class="detail-meta">
        <span>확인코드: ${escapeHtml(participant.chartNo)}</span>
        ${participant.customerChartNo ? `<span>고객 차트번호: ${escapeHtml(participant.customerChartNo)}</span>` : ""}
        <span>휴대폰 뒤 4자리: ${escapeHtml(participant.phoneLast4)}</span>
        <span>리뷰 닉네임/ID: ${escapeHtml(participant.naverId)}</span>
        <span>등록일시: ${formatDateTime(participant.createdAt)}</span>
      </div>
      ${participant.flags.length ? `<ul class="flag-list">${participant.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="detail-block">
      <h3>완료 상태</h3>
      <div class="detail-meta">
        <span class="detail-progress-line">진행 위치: ${renderProgressHint(stopInsight)}</span>
        <span>직원 대응: ${escapeHtml(stopInsight.action)}</span>
        <span>포토리뷰: ${getReviewLabel(participant.reviewStatus)}</span>
        <span>카톡 채널 추가: ${participant.kakaoVerified ? "완료" : "미추가"}</span>
        <span>당첨상품: ${escapeHtml(participant.draw?.prizeName || "-")}</span>
        <span>결과 확인코드: ${escapeHtml(participant.draw?.confirmCode || "-")}</span>
      </div>
    </div>
    <div class="detail-block staff-record-block">
      <h3>현장 기록</h3>
      <div class="staff-record-grid">
        <label class="${staffNameLocked ? "is-locked" : ""}">
          담당자
          <input id="staff-name" type="text" value="${escapeHtml(staffNameValue)}" placeholder="예: 데스크 홍길동" ${staffNameLocked ? "disabled" : ""}>
        </label>
        <label>
          고객 차트번호
          <input id="customer-chart-no" type="text" value="${escapeHtml(participant.customerChartNo || "")}" placeholder="차트번호 입력">
        </label>
        ${staffNameLocked ? `<p class="field-lock-note">담당자는 저장 후 수정할 수 없습니다.</p>` : ""}
        <label class="wide-field">
          지급 메모
          <textarea id="staff-memo" rows="3" placeholder="특이사항이 있으면 입력">${escapeHtml(participant.staffMemo || "")}</textarea>
        </label>
        ${canStaffOverrideDraw(participant).ok ? `<p class="field-lock-note override-note">리뷰 화면을 직원이 직접 확인한 경우, 특이사항 메모를 남긴 뒤 대신뽑기할 수 있습니다.</p>` : ""}
      </div>
      <div class="stock-log">
        <strong>증정/재고 소진 내역</strong>
        ${participant.giftStatus === "done" ? `
          <p>${escapeHtml(formatDateTime(participant.giftCompletedAt))} · ${escapeHtml(participant.draw?.prizeName || "-")} 지급완료</p>
          <small>담당자 ${escapeHtml(getParticipantStaffName(participant) || "-")}</small>
        ` : `
          <p>${participant.draw ? `${escapeHtml(participant.draw.prizeName)} 지급 대기` : "당첨 결과가 나오면 지급 기록을 남길 수 있습니다."}</p>
          <small>지급완료 처리 시 내역에 자동 기록됩니다.</small>
        `}
      </div>
      <div class="row-actions">
        <button class="small-action" type="button" data-detail-action="save-staff-record">${staffNameLocked ? "메모 저장" : "담당자 저장"}</button>
        ${canStaffOverrideDraw(participant).ok ? `<button class="small-action warning-action" type="button" data-detail-action="force-draw">리뷰 확인 후 대신뽑기</button>` : ""}
        ${participant.draw && participant.giftStatus !== "done" ? `<button class="primary-action compact-primary" type="button" data-detail-action="gift">지급완료</button>` : ""}
      </div>
    </div>
    <div class="detail-block">
      <h3>차트 메모</h3>
      <pre class="chart-memo">${escapeHtml(chartMemo)}</pre>
      <div class="row-actions">
        <button class="small-action" type="button" data-detail-action="copy">메모 복사</button>
        ${APP_MODE === "admin" ? `<button class="small-action danger-action compact-danger" type="button" data-detail-action="delete">참여내역 삭제</button>` : ""}
      </div>
    </div>
  `;

  dom.detailPanel.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.detailAction === "copy") copyChartMemo(participant.id);
      if (button.dataset.detailAction === "save-staff-record") saveStaffRecord(participant.id);
      if (button.dataset.detailAction === "force-draw") runStaffForceDraw(participant.id);
      if (button.dataset.detailAction === "gift") completeGift(participant.id);
      if (button.dataset.detailAction === "delete") deleteParticipant(participant.id);
    });
  });
}

function renderAudit() {
  const health = getAuditHealth();
  setStatusPillElement(dom.auditHealth, {
    ...health,
    key: health.tone === "done" ? "audit-ok" : health.tone === "pending" ? "audit-warning" : "audit-wait",
    icon: health.tone === "done" ? "check" : health.tone === "pending" ? "alert" : "shield"
  });

  if (!state.audit.length) {
    dom.auditTable.innerHTML = `<tr><td colspan="5" class="muted-text">아직 로그가 없습니다.</td></tr>`;
    return;
  }

  dom.auditTable.innerHTML = state.audit.slice().reverse().map((entry) => `
    <tr>
      <td>${formatDateTime(entry.at)}</td>
      <td>${escapeHtml(entry.action)}</td>
      <td>${escapeHtml(entry.subjectId)}</td>
      <td>${escapeHtml(JSON.stringify(entry.detail))}</td>
      <td><span class="muted-text">${escapeHtml(String(entry.hash || "-").slice(0, 12))}</span></td>
    </tr>
  `).join("");
}

function renderGuardrails() {
  dom.guardrailGrid.innerHTML = guardrails.map(([title, description]) => `
    <article class="guardrail">
      <strong>${title}</strong>
      <span>${description}</span>
    </article>
  `).join("");
}

function renderPrizeTable() {
  dom.prizeTable.innerHTML = state.prizes.map((prize) => `
    <tr>
      <td><input class="prize-name-input" type="text" value="${escapeHtml(prize.name)}" data-prize-field="name" data-prize-id="${prize.id}"></td>
      <td><input class="prize-description-input" type="text" value="${escapeHtml(prize.description || "")}" placeholder="고객에게 보일 설명" data-prize-field="description" data-prize-id="${prize.id}"></td>
      <td><input class="prize-input" type="number" min="${prize.awarded}" step="1" value="${prize.initialStock}" data-prize-field="initialStock" data-prize-id="${prize.id}"></td>
      <td>${prize.awarded}</td>
      <td><input class="prize-input" type="number" min="0" step="1" value="${prize.weight}" data-prize-field="weight" data-prize-id="${prize.id}"></td>
      <td><strong>${getPrizeProbability(prize)}</strong></td>
      <td>
        <div class="row-actions">
          <button class="small-action" type="button" data-prize-action="save" data-prize-id="${prize.id}">저장</button>
          <button class="small-action" type="button" data-prize-action="remove" data-prize-id="${prize.id}">${prize.awarded ? "중단" : "삭제"}</button>
        </div>
      </td>
    </tr>
  `).join("");

  dom.prizeTable.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.prizeAction === "save") savePrize(button.dataset.prizeId);
      if (button.dataset.prizeAction === "remove") removePrize(button.dataset.prizeId);
    });
  });
}

async function addPrize(event) {
  event.preventDefault();
  const form = new FormData(dom.prizeForm);
  const name = cleanText(form.get("prizeName"));
  const description = cleanText(form.get("prizeDescription"));
  const initialStock = Math.max(Number(form.get("prizeStock")) || 0, 1);
  const weight = Math.max(Number(form.get("prizeWeight")) || 0, 1);

  if (!name) {
    toast("상품명을 입력해 주세요.");
    return;
  }

  if (isLiveAdminReady()) {
    try {
      await ensureAdminAccessToken();
      await window.FaceFilterSupabase.createPrize({ name, description, initialStock, weight });
      dom.prizeForm.reset();
      document.querySelector("#new-prize-stock").value = "1";
      document.querySelector("#new-prize-weight").value = "10";
      await refreshAdminState({ silent: true });
      toast("새 상품이 DB에 추가되었습니다.");
    } catch (error) {
      console.error(error);
      toast("상품 추가에 실패했습니다.");
    }
    return;
  }

  const prize = {
    id: createId("PR"),
    name,
    description,
    initialStock,
    awarded: 0,
    weight,
    active: true
  };
  state.prizes.push(prize);
  addAudit("prize_created", prize.id, { name, description, initialStock, weight });
  dom.prizeForm.reset();
  document.querySelector("#new-prize-stock").value = "1";
  document.querySelector("#new-prize-weight").value = "10";
  saveState();
  renderAll();
  toast("새 상품이 추가되었습니다.");
}

async function savePrize(prizeId) {
  const prize = state.prizes.find((item) => item.id === prizeId);
  if (!prize) return;
  const nameInput = dom.prizeTable.querySelector(`[data-prize-id="${prizeId}"][data-prize-field="name"]`);
  const descriptionInput = dom.prizeTable.querySelector(`[data-prize-id="${prizeId}"][data-prize-field="description"]`);
  const stockInput = dom.prizeTable.querySelector(`[data-prize-id="${prizeId}"][data-prize-field="initialStock"]`);
  const weightInput = dom.prizeTable.querySelector(`[data-prize-id="${prizeId}"][data-prize-field="weight"]`);
  const nextName = cleanText(nameInput.value);
  const nextDescription = cleanText(descriptionInput.value);
  const nextStock = Math.max(Number(stockInput.value), prize.awarded);
  const nextWeight = Math.max(Number(weightInput.value), 0);
  if (!nextName) {
    toast("상품명은 비워둘 수 없습니다.");
    return;
  }
  const nextActive = Number.isFinite(nextStock) ? nextStock > prize.awarded && nextWeight > 0 : prize.active;

  if (isLiveAdminReady()) {
    try {
      await ensureAdminAccessToken();
      await window.FaceFilterSupabase.updatePrize({
        id: prizeId,
        name: nextName,
        description: nextDescription,
        initialStock: Number.isFinite(nextStock) ? nextStock : prize.initialStock,
        weight: Number.isFinite(nextWeight) ? nextWeight : prize.weight,
        active: nextActive
      });
      await refreshAdminState({ silent: true });
      toast("상품 설정이 DB에 저장되었습니다.");
    } catch (error) {
      console.error(error);
      toast("상품 저장에 실패했습니다.");
    }
    return;
  }

  prize.name = nextName;
  prize.description = nextDescription;
  prize.initialStock = Number.isFinite(nextStock) ? nextStock : prize.initialStock;
  prize.weight = Number.isFinite(nextWeight) ? nextWeight : prize.weight;
  prize.active = nextActive;
  addAudit("prize_updated", prize.id, {
    name: prize.name,
    description: prize.description,
    initialStock: prize.initialStock,
    weight: prize.weight,
    active: prize.active
  });
  saveState();
  renderAll();
  toast("상품 설정이 저장되었습니다.");
}

async function removePrize(prizeId) {
  const prize = state.prizes.find((item) => item.id === prizeId);
  if (!prize) return;

  if (isLiveAdminReady()) {
    try {
      await ensureAdminAccessToken();
      if (prize.awarded > 0) {
        await window.FaceFilterSupabase.updatePrize({
          id: prizeId,
          name: prize.name,
          description: prize.description || "",
          initialStock: prize.awarded,
          weight: 0,
          active: false
        });
      } else {
        await window.FaceFilterSupabase.deletePrize({ id: prizeId });
      }
      await refreshAdminState({ silent: true });
      toast(prize.awarded > 0 ? "상품을 뽑기 후보에서 중단했습니다." : "상품을 삭제했습니다.");
    } catch (error) {
      console.error(error);
      toast("상품 삭제/중단에 실패했습니다.");
    }
    return;
  }

  if (prize.awarded > 0) {
    prize.active = false;
    prize.weight = 0;
    prize.initialStock = prize.awarded;
    addAudit("prize_deactivated", prize.id, { name: prize.name, awarded: prize.awarded });
    toast("이미 당첨 이력이 있어 삭제 대신 뽑기 후보에서 중단했습니다.");
  } else {
    state.prizes = state.prizes.filter((item) => item.id !== prizeId);
    addAudit("prize_deleted", prize.id, { name: prize.name });
    toast("상품이 삭제되었습니다.");
  }

  saveState();
  renderAll();
}

function resetDemoData() {
  const ok = window.confirm("데모 데이터를 초기화할까요? 현재 참여자와 로그가 모두 삭제됩니다.");
  if (!ok) return;
  state = createDefaultState();
  sessionState = createSessionState();
  selectedParticipantId = null;
  addAudit("demo_reset", "-", { by: "admin" });
  saveState();
  renderAll();
  toast("데모 데이터가 초기화되었습니다.");
}

function exportCsv() {
  const rows = [
    ["고객명", "확인코드", "고객 차트번호", "휴대폰뒤4자리", "리뷰닉네임/ID", "포토리뷰", "진행 위치", "카톡채널추가", "최종상품", "결과코드", "증정상태", "담당자", "지급메모", "플래그", "등록일시"],
    ...state.participants.map((participant) => [
      participant.customerName,
      participant.chartNo,
      participant.customerChartNo || "",
      participant.phoneLast4,
      participant.naverId || "",
      getReviewLabel(participant.reviewStatus),
      getParticipantStopInsight(participant).label,
      participant.kakaoVerified ? "완료" : "",
      participant.draw?.prizeName || "",
      participant.draw?.confirmCode || "",
      participant.giftStatus === "done" ? "증정완료" : participant.draw ? "직원확인대기" : "",
      getParticipantStaffName(participant),
      participant.staffMemo || "",
      participant.flags.join(" / "),
      formatDateTime(participant.createdAt)
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `review-event-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setActiveTab(tabName) {
  dom.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
  dom.panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tabName));
}

function getSelectedParticipant() {
  return selectedParticipantId ? getParticipant(selectedParticipantId) : null;
}

function getParticipant(id) {
  return state.participants.find((participant) => participant.id === id);
}

function getParticipantStatus(participant) {
  if (participant.flags.length && !participant.draw) {
    return { label: "확인 필요", tone: "pending", key: "flagged", icon: "alert" };
  }
  if (participant.giftStatus === "done") {
    return { label: "증정 완료", tone: "done", key: "gifted", icon: "check" };
  }
  if (participant.draw) {
    return { label: "직원 확인 대기", tone: "pending", key: "staff-wait", icon: "userCheck" };
  }
  if (isReviewComplete(participant) && participant.kakaoVerified) {
    return { label: "뽑기 가능 + 카톡 채널", tone: "", key: "draw-ready-plus", icon: "chat" };
  }
  if (isReviewComplete(participant)) {
    return { label: "리뷰 완료", tone: "", key: "review-complete", icon: "check" };
  }
  if (participant.kakaoVerified) {
    return { label: "카톡 채널 추가", tone: "", key: "kakao-benefit", icon: "chat" };
  }
  return { label: "등록", tone: "muted", key: "registered", icon: "dot" };
}

function getStatusKey(participant) {
  if (participant.giftStatus === "done") return "gifted";
  if (participant.draw) return "drawn";
  if (isReviewComplete(participant)) return "selfConfirmed";
  return "registered";
}

function getParticipantStopInsight(participant) {
  if (!participant) {
    return { label: "-", action: "-", tone: "muted", key: "empty", icon: "dot" };
  }

  if (participant.giftStatus === "done") {
    return {
      label: "지급완료",
      action: "추가 대응 없음",
      tone: "done",
      key: "completed",
      icon: "check"
    };
  }

  if (participant.draw) {
    return {
      label: "직원 확인 대기",
      action: "결과 화면과 네이버 리뷰 화면 확인 후 지급완료 처리",
      tone: "pending",
      key: "staff-wait",
      icon: "userCheck"
    };
  }

  if (isReviewComplete(participant)) {
    return {
      label: "뽑기 전",
      action: "고객에게 상품뽑기 진행 안내",
      tone: "pending",
      key: "draw-ready",
      icon: "gift"
    };
  }

  if (participant.reviewOpenedAt) {
    return {
      label: "리뷰 작성/복귀 전",
      action: "QR 재진입 또는 이벤트 화면 복귀 후 상품뽑기 안내",
      tone: "danger",
      key: "review-return",
      icon: "return"
    };
  }

  return {
    label: "리뷰 열기 전",
    action: "네이버 리뷰 열기부터 다시 안내",
    tone: "muted",
    key: "review-open",
    icon: "open"
  };
}

function getReviewLabel(status) {
  const map = {
    none: "미완료",
    self_confirmed: "리뷰 진행 확인",
    pending: "확인 대기",
    approved: "직원 승인",
    rejected: "반려"
  };
  return map[status] || status;
}

function isReviewComplete(participant) {
  return participant?.reviewStatus === "self_confirmed" || participant?.reviewStatus === "approved";
}

function createChartMemo(participant) {
  const lines = [
    `${formatDate(new Date())} 리뷰이벤트 QR 참여`,
    `고객: ${participant.customerName} / 확인코드: ${participant.chartNo}`,
    `고객 차트번호: ${participant.customerChartNo || "-"}`,
    `휴대폰 뒤 4자리: ${participant.phoneLast4}`,
    `리뷰 닉네임/ID: ${participant.naverId}`,
    `포토리뷰: ${getReviewLabel(participant.reviewStatus)}`,
    `카카오톡 채널 추가: ${participant.kakaoVerified ? "완료" : "미추가"}`,
    `당첨상품: ${participant.draw?.prizeName || "미진행"}`,
    `결과코드: ${participant.draw?.confirmCode || "-"}`,
    `담당자: ${getParticipantStaffName(participant) || "-"}`,
    `지급상태: ${participant.giftStatus === "done" ? "지급완료" : participant.draw ? "직원 확인 대기" : "미지급"}`
  ];
  if (participant.staffMemo) lines.push(`지급메모: ${participant.staffMemo}`);
  if (participant.flags.length) lines.push(`확인사항: ${participant.flags.join(" / ")}`);
  return lines.join("\n");
}

function getRemaining(prize) {
  return Math.max(Number(prize.initialStock) - Number(prize.awarded), 0);
}

function getAvailablePrizes() {
  return state.prizes.filter((prize) => prize.active !== false && getRemaining(prize) > 0 && Number(prize.weight) > 0);
}

function getPrizeOdds() {
  const available = getAvailablePrizes();
  const totalWeight = available.reduce((sum, prize) => sum + Number(prize.weight), 0);
  if (!totalWeight) return [];

  return available.map((prize) => {
    const percent = (Number(prize.weight) / totalWeight) * 100;
    return {
      id: prize.id,
      name: prize.name,
      description: prize.description || "",
      remaining: getRemaining(prize),
      percent,
      percentLabel: formatPercent(percent)
    };
  });
}

function getPrizeProbability(prize) {
  const odds = getPrizeOdds().find((item) => item.id === prize.id);
  return odds ? odds.percentLabel : "0%";
}

function getNaverCooldown(naverKey, visitDate) {
  const currentDate = parseDateKey(visitDate);
  const latest = state.participants
    .filter((participant) => normalizeKey(participant.naverId) === naverKey)
    .map((participant) => ({
      participant,
      basisDate: getParticipantCooldownDate(participant)
    }))
    .filter((item) => item.basisDate)
    .sort((a, b) => parseDateKey(b.basisDate) - parseDateKey(a.basisDate))[0];

  if (!latest) return { blocked: false };

  const latestDate = parseDateKey(latest.basisDate);
  const nextEligibleDate = formatDateKey(addDays(latestDate, NAVER_COOLDOWN_DAYS));
  const remainingDays = Math.ceil((parseDateKey(nextEligibleDate) - currentDate) / 86400000);

  if (remainingDays > 0) {
    return {
      blocked: true,
      participant: latest.participant,
      nextEligibleDate,
      remainingDays
    };
  }

  return { blocked: false };
}

function getParticipantCooldownDate(participant) {
  if (participant.giftCompletedAt) return participant.giftCompletedAt.slice(0, 10);
  if (participant.draw?.drawnAt) return participant.draw.drawnAt.slice(0, 10);
  if (participant.visitDate) return participant.visitDate;
  return participant.createdAt ? participant.createdAt.slice(0, 10) : "";
}

function createCustomerCode(id, visitDate, phoneLast4) {
  const datePart = visitDate.replaceAll("-", "").slice(2);
  const suffix = id.split("-").pop().slice(-3).toUpperCase();
  return `QR-${datePart}-${phoneLast4}-${suffix}`;
}

function createConfirmCode(participantId) {
  const suffix = participantId.split("-").pop().slice(-4).toUpperCase();
  return `RE-${suffix}-${secureRandomInt(9000) + 1000}`;
}

function getDeviceKey() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join("|");
  return stableHash(raw);
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

function secureRandomFloat() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 0xffffffff;
}

function secureRandomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function stableHash(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${secureRandomInt(100000).toString(36)}`;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isInitialLikeName(value) {
  const name = cleanText(value);
  if (!name) return true;
  const compact = name.replace(/\s+/g, "");
  return /[ㄱ-ㅎㅏ-ㅣ]/.test(compact) || /^[가-힣]$/.test(compact);
}

function maskNaverId(value) {
  const clean = cleanText(value);
  if (!clean) return "";
  if (clean.length <= 2) return `${clean[0]}*`;
  return `${clean.slice(0, 2)}***`;
}

function maskSessionToken(value) {
  const clean = cleanText(value);
  if (!clean) return "";
  return `${clean.slice(0, 8)}...`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value < 1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function minutesBetween(isoA, isoB) {
  return Math.abs(new Date(isoB).getTime() - new Date(isoA).getTime()) / 60000;
}

function setMessage(element, text, tone) {
  element.textContent = text;
  element.style.color = tone === "danger" ? "var(--danger)" : tone === "pending" ? "var(--gold)" : "var(--accent)";
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.appendChild(element);
  window.setTimeout(() => element.remove(), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
