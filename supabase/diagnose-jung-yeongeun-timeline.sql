-- Diagnose the reported "registration -> final completed screen" case.
-- Target: 정영은 / phone last4 6746 / naver yeongeun0316 / chart QR-260616-6746-2AD

with target as (
  select *
  from public.review_event_participants
  where chart_code = 'QR-260616-6746-2AD'
     or (
       customer_name = '정영은'
       and phone_last4 = '6746'
       and naver_key = public.ff_normalize_key('yeongeun0316')
     )
  order by created_at desc
)
select
  id,
  session_id,
  chart_code,
  customer_name,
  phone_last4,
  naver_handle,
  visit_date,
  created_at,
  review_opened_at,
  review_status,
  kakao_opened_at,
  kakao_verified,
  kakao_verified_at,
  gift_status,
  gift_completed_at,
  promoter_name,
  gift_staff_name,
  customer_chart_no,
  staff_memo,
  flags
from target;

with target as (
  select *
  from public.review_event_participants
  where chart_code = 'QR-260616-6746-2AD'
     or (
       customer_name = '정영은'
       and phone_last4 = '6746'
       and naver_key = public.ff_normalize_key('yeongeun0316')
     )
),
target_ids as (
  select id, session_id from target
)
select
  a.occurred_at,
  a.actor_type,
  a.action,
  a.subject_table,
  a.subject_id,
  a.participant_id,
  a.session_id,
  a.detail,
  left(a.hash, 12) as hash_prefix
from public.review_event_audit_logs a
where a.participant_id in (select id from target_ids)
   or a.subject_id in (select id from target_ids)
   or a.session_id in (select session_id from target_ids)
order by a.occurred_at asc, a.id asc;

-- Key check:
-- If you see duplicate_registration_blocked AFTER gift_completed with:
--   detail->>'resumeAllowed' = 'true'
-- then the customer re-entered the same details and the system resumed the already completed participant.
with target as (
  select *
  from public.review_event_participants
  where chart_code = 'QR-260616-6746-2AD'
     or (
       customer_name = '정영은'
       and phone_last4 = '6746'
       and naver_key = public.ff_normalize_key('yeongeun0316')
     )
),
audit as (
  select a.*
  from public.review_event_audit_logs a
  where a.participant_id in (select id from target)
     or a.subject_id in (select id from target)
     or a.session_id in (select session_id from target)
),
gift as (
  select min(occurred_at) as gift_completed_at
  from audit
  where action = 'gift_completed'
),
post_gift_duplicate as (
  select count(*) as count_after_gift
  from audit, gift
  where action = 'duplicate_registration_blocked'
    and occurred_at > gift.gift_completed_at
    and detail->>'resumeAllowed' = 'true'
)
select
  (select gift_completed_at from gift) as first_gift_completed_log_at,
  count_after_gift as duplicate_resume_after_gift_count,
  case
    when count_after_gift > 0 then 'LIKELY_CAUSE: completed participant was resumed after gift completion'
    else 'No post-gift duplicate resume found in this participant/session log window'
  end as diagnosis
from post_gift_duplicate;
