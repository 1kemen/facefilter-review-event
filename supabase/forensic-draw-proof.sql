-- One-screen proof for "Did this customer really draw, or did the app jump to final?"
-- Replace target_input values and run in Supabase SQL Editor.

with target_input as (
  select
    'QR-260616-6746-2AD'::text as chart_code,
    '정영은'::text as customer_name,
    '6746'::text as phone_last4,
    'yeongeun0316'::text as naver_handle
),
target as (
  select p.*
  from public.review_event_participants p, target_input t
  where p.chart_code = t.chart_code
     or (
       public.ff_normalize_key(p.customer_name) = public.ff_normalize_key(t.customer_name)
       and p.phone_last4 = t.phone_last4
       and p.naver_key = public.ff_normalize_key(t.naver_handle)
     )
  order by p.created_at desc
  limit 1
),
draw as (
  select d.*
  from public.review_event_draws d
  where d.participant_id = (select id from target)
  order by d.drawn_at asc
  limit 1
),
audit as (
  select a.*
  from public.review_event_audit_logs a
  where a.participant_id = (select id from target)
     or a.subject_id = (select id from target)
     or a.session_id = (select session_id from target)
),
important as (
  select
    min(occurred_at) filter (where action = 'participant_created') as registered_at,
    min(occurred_at) filter (where action = 'review_link_opened') as review_opened_at,
    min(occurred_at) filter (where action in ('photo_review_self_confirmed', 'photo_review_auto_confirmed')) as customer_review_confirmed_at,
    min(occurred_at) filter (where action = 'review_approved_by_staff_override') as staff_review_override_at,
    min(occurred_at) filter (where action = 'draw_completed') as draw_completed_at,
    min(occurred_at) filter (where action = 'staff_force_draw_completed') as staff_force_draw_at,
    min(occurred_at) filter (where action = 'kakao_bonus_verified') as kakao_bonus_at,
    min(occurred_at) filter (where action = 'gift_completed') as gift_completed_at,
    jsonb_agg(
      jsonb_build_object(
        'at', occurred_at,
        'actor', actor_type,
        'action', action,
        'detail', detail
      )
      order by occurred_at, id
    ) filter (
      where action in (
        'participant_created',
        'review_link_opened',
        'photo_review_self_confirmed',
        'photo_review_auto_confirmed',
        'review_approved_by_staff_override',
        'draw_completed',
        'staff_force_draw_completed',
        'kakao_bonus_verified',
        'gift_completed',
        'duplicate_registration_blocked'
      )
    ) as evidence_timeline
  from audit
)
select
  target.chart_code as 확인코드,
  target.customer_name as 고객명,
  target.phone_last4 as 휴대폰뒤4자리,
  target.naver_handle as 네이버닉네임,
  target.created_at as 고객정보등록시각,
  important.review_opened_at as 리뷰링크오픈시각,
  important.customer_review_confirmed_at as 고객리뷰확인시각,
  important.staff_review_override_at as 직원리뷰확인시각,
  draw.drawn_at as 뽑기확정시각,
  draw.drop_choice as 고객선택물방울,
  draw.prize_name as 당첨상품,
  draw.confirm_code as 결과확인코드,
  important.staff_force_draw_at as 직원대신뽑기시각,
  target.kakao_verified as 카톡혜택적용,
  important.gift_completed_at as 지급완료시각,
  case
    when draw.id is null then
      'FINAL_WITHOUT_SERVER_DRAW: DB에 뽑기 기록이 없습니다. 고객이 본 최종화면은 브라우저 잔여상태/화면착각/프론트 표시 문제 가능성이 큽니다.'
    when important.staff_force_draw_at is not null or important.staff_review_override_at is not null then
      'STAFF_HANDLED_DRAW: 직원이 리뷰 확인 후 대신뽑기 또는 리뷰승인을 진행했습니다.'
    when important.draw_completed_at is not null and draw.drop_choice between 1 and 5 then
      'CUSTOMER_DRAW_CONFIRMED: 서버에 고객 뽑기 결과가 확정되어 있습니다. 물방울 선택값도 남아 있습니다.'
    when important.draw_completed_at is not null then
      'DRAW_CONFIRMED_WITHOUT_DROP_CHOICE: 서버에 뽑기 결과가 있지만 물방울 선택값이 없습니다. 랜덤/직원/예외 버튼 경로를 확인하세요.'
    else
      'DRAW_ROW_EXISTS_BUT_AUDIT_MISSING: 뽑기 테이블에는 결과가 있으나 감사로그가 누락되었습니다. DB 직접 수정 또는 과거 패치 전 기록을 의심하세요.'
  end as 판정,
  important.evidence_timeline as 증거타임라인
from target
left join draw on true
left join important on true;
