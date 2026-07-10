(function () {
  const config = window.FACEFILTER_SUPABASE || {};
  let accessToken = "";

  function getBaseUrl() {
    return String(config.url || "").replace(/\/$/, "");
  }

  function isConfigured() {
    return Boolean(getBaseUrl() && config.anonKey);
  }

  function setAccessToken(token) {
    accessToken = token || "";
  }

  async function rpc(functionName, payload = {}) {
    if (!isConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    const response = await fetch(`${getBaseUrl()}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken || config.anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.message || data?.error || text || `Supabase RPC failed: ${functionName}`;
      throw new Error(message);
    }

    return data;
  }

  async function authRequest(path, payload = {}, token = "") {
    if (!isConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    const response = await fetch(`${getBaseUrl()}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token || accessToken || config.anonKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.msg || data?.message || data?.error_description || text || "Supabase Auth failed.";
      throw new Error(message);
    }

    return data;
  }

  async function restRequest(path, { method = "GET", body = null } = {}) {
    if (!isConfigured()) {
      throw new Error("Supabase is not configured.");
    }

    const response = await fetch(`${getBaseUrl()}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken || config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: body ? JSON.stringify(body) : null
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.message || data?.error || text || `Supabase REST failed: ${path}`;
      throw new Error(message);
    }

    return data;
  }

  window.FaceFilterSupabase = {
    isConfigured,
    setAccessToken,
    signInWithPassword: ({ email, password }) => authRequest("token?grant_type=password", {
      email,
      password
    }),
    refreshSession: ({ refreshToken }) => authRequest("token?grant_type=refresh_token", {
      refresh_token: refreshToken
    }),
    updateSettings: ({ kakaoChannelUrl }) => restRequest("review_event_settings?id=eq.default", {
      method: "PATCH",
      body: {
        kakao_channel_url: kakaoChannelUrl,
        updated_at: new Date().toISOString()
      }
    }),
    createPrize: ({ name, description, initialStock, weight }) => restRequest("review_event_prizes", {
      method: "POST",
      body: {
        name,
        description,
        initial_stock: initialStock,
        awarded_count: 0,
        weight,
        active: true,
        sort_order: 100
      }
    }),
    updatePrize: ({ id, name, description, initialStock, weight, active }) => restRequest(`review_event_prizes?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        name,
        description,
        initial_stock: initialStock,
        weight,
        active
      }
    }),
    deletePrize: ({ id }) => restRequest(`review_event_prizes?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),
    getPublicState: () => rpc("ff_get_public_state"),
    getAdminState: () => rpc("ff_get_admin_state"),
    createSession: ({ qrCode = null } = {}) => rpc("ff_create_session", {
      p_qr_code: qrCode,
      p_user_agent: navigator.userAgent
    }),
    getSessionState: ({ sessionId, participantId = null }) => rpc("ff_get_session_state", {
      p_session_id: sessionId,
      p_participant_id: participantId
    }),
    registerParticipant: ({ sessionId, customerName, phoneLast4, naverHandle, visitDate, deviceKey }) => rpc("ff_register_participant", {
      p_session_id: sessionId,
      p_customer_name: customerName,
      p_phone_last4: phoneLast4,
      p_naver_handle: naverHandle,
      p_visit_date: visitDate,
      p_device_key: deviceKey
    }),
    markReviewOpened: ({ sessionId, participantId }) => rpc("ff_mark_review_opened", {
      p_session_id: sessionId,
      p_participant_id: participantId
    }),
    setPhotoReviewDone: ({ sessionId, participantId, done }) => rpc("ff_set_photo_review_self_confirmed", {
      p_session_id: sessionId,
      p_participant_id: participantId,
      p_done: done
    }),
    markKakaoOpened: ({ sessionId, participantId }) => rpc("ff_mark_kakao_opened", {
      p_session_id: sessionId,
      p_participant_id: participantId
    }),
    setKakaoVerified: ({ sessionId, participantId }) => rpc("ff_set_kakao_verified", {
      p_session_id: sessionId,
      p_participant_id: participantId
    }),
    setGiftTeam: ({ participantId, team }) => rpc("ff_set_gift_team", {
      p_participant_id: participantId,
      p_team: team
    }),
    markGiftUsed: ({ participantId, staffName, team }) => rpc("ff_mark_gift_used", {
      p_participant_id: participantId,
      p_staff_name: staffName,
      p_team: team
    }),
    getGiftUsage: () => rpc("ff_get_gift_usage"),
    runDraw: ({ sessionId, participantId, dropChoice = null, drawType = "primary" }) => rpc("ff_run_draw", {
      p_session_id: sessionId,
      p_participant_id: participantId,
      p_drop_choice: dropChoice,
      p_draw_type: drawType
    }),
    staffForceDraw: async ({ participantId, staffMemo, dropChoice = null }) => {
      try {
        return await rpc("ff_staff_force_draw", {
          p_participant_id: participantId,
          p_staff_memo: staffMemo,
          p_drop_choice: dropChoice
        });
      } catch (error) {
        if (!String(error?.message || "").includes("ff_staff_force_draw")) throw error;
        return { ok: false, code: "sql_patch_required" };
      }
    },
    updateParticipantStaffFields: async ({ participantId, staffName = null, promoterName = staffName, giftStaffName = staffName, staffMemo = null, customerChartNo = null }) => {
      try {
        return await rpc("ff_update_participant_staff_fields_v2", {
          p_participant_id: participantId,
          p_promoter_name: promoterName,
          p_gift_staff_name: giftStaffName,
          p_staff_memo: staffMemo,
          p_customer_chart_no: customerChartNo
        });
      } catch (error) {
        if (!String(error?.message || "").includes("ff_update_participant_staff_fields_v2")) throw error;
        const legacyResult = await rpc("ff_update_participant_staff_fields", {
          p_participant_id: participantId,
          p_promoter_name: promoterName,
          p_gift_staff_name: giftStaffName,
          p_staff_memo: staffMemo
        });
        return { ...legacyResult, legacyChartField: true };
      }
    },
    completeGift: async ({ participantId, staffMemo = null, staffName = null, giftStaffName = staffName, promoterName = staffName, customerChartNo = null }) => {
      try {
        return await rpc("ff_complete_gift_v3", {
          p_participant_id: participantId,
          p_staff_memo: staffMemo,
          p_gift_staff_name: giftStaffName,
          p_promoter_name: promoterName,
          p_customer_chart_no: customerChartNo
        });
      } catch (error) {
        if (!String(error?.message || "").includes("ff_complete_gift_v3")) throw error;
        try {
          const v2Result = await rpc("ff_complete_gift_v2", {
            p_participant_id: participantId,
            p_staff_memo: staffMemo,
            p_gift_staff_name: giftStaffName,
            p_promoter_name: promoterName
          });
          return { ...v2Result, legacyChartField: true };
        } catch (legacyError) {
          if (!String(legacyError?.message || "").includes("ff_complete_gift_v2")) throw legacyError;
          const legacyResult = await rpc("ff_complete_gift", {
            p_participant_id: participantId,
            p_staff_memo: staffMemo
          });
          return { ...legacyResult, legacyStaffFields: true };
        }
      }
    },
    deleteParticipant: ({ participantId }) => rpc("ff_delete_participant", {
      p_participant_id: participantId
    })
  };
})();
