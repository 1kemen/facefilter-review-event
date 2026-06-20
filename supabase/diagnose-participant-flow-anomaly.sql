-- Diagnose a participant who appeared to jump from registration to final/staff-check.
-- Replace the values in target_input, then run the whole file in Supabase SQL Editor.

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
),
draws as (
  select d.*
  from public.review_event_draws d
  where d.participant_id in (select id from target)
),
audit as (
  select a.*
  from public.review_event_audit_logs a
  where a.participant_id in (select id from target)
     or a.subject_id in (select id from target)
     or a.session_id in (select session_id from target)
)
select
  '01_PARTICIPANT' as section,
  p.id,
  p.session_id,
  p.chart_code,
  p.customer_name,
  p.phone_last4,
  p.naver_handle,
  p.created_at,
  p.review_opened_at,
  p.review_status,
  p.kakao_opened_at,
  p.kakao_verified,
  p.kakao_verified_at,
  p.gift_status,
  p.gift_completed_at,
  p.gift_staff_name,
  p.customer_chart_no,
  p.staff_memo,
  p.flags
from target p;

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
),
draws as (
  select d.*
  from public.review_event_draws d
  where d.participant_id in (select id from target)
)
select
  '02_DRAW' as section,
  d.id,
  d.participant_id,
  d.type,
  d.status,
  d.prize_name,
  d.confirm_code,
  d.drop_choice,
  d.drawn_at
from draws d
order by d.drawn_at asc;

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
),
audit as (
  select a.*
  from public.review_event_audit_logs a
  where a.participant_id in (select id from target)
     or a.subject_id in (select id from target)
     or a.session_id in (select session_id from target)
)
select
  '03_TIMELINE' as section,
  a.occurred_at,
  a.actor_type,
  a.action,
  a.subject_table,
  a.subject_id,
  a.participant_id,
  a.session_id,
  a.detail,
  left(a.hash, 12) as hash_prefix
from audit a
order by a.occurred_at asc, a.id asc;

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
),
audit as (
  select a.*
  from public.review_event_audit_logs a
  where a.participant_id in (select id from target)
     or a.subject_id in (select id from target)
     or a.session_id in (select session_id from target)
),
marks as (
  select
    min(occurred_at) filter (where action = 'participant_created') as participant_created_at,
    min(occurred_at) filter (where action = 'review_link_opened') as review_link_opened_at,
    min(occurred_at) filter (where action in ('photo_review_self_confirmed', 'photo_review_auto_confirmed', 'review_approved_by_staff_override')) as review_confirmed_at,
    min(occurred_at) filter (where action = 'review_approved_by_staff_override') as staff_override_at,
    min(occurred_at) filter (where action = 'draw_completed') as draw_completed_at,
    min(occurred_at) filter (where action = 'kakao_bonus_verified') as kakao_verified_at,
    min(occurred_at) filter (where action = 'gift_completed') as gift_completed_at,
    count(*) filter (where action = 'duplicate_registration_blocked') as duplicate_registration_count,
    count(*) filter (where action = 'staff_force_draw_completed') as staff_force_draw_count
  from audit
)
select
  '04_DIAGNOSIS' as section,
  participant_created_at,
  review_link_opened_at,
  review_confirmed_at,
  staff_override_at,
  draw_completed_at,
  kakao_verified_at,
  gift_completed_at,
  duplicate_registration_count,
  staff_force_draw_count,
  case
    when draw_completed_at is null then 'NO_DRAW: final screen should not appear unless stale browser state exists'
    when staff_force_draw_count > 0 or staff_override_at is not null then 'STAFF_OVERRIDE: staff force draw or review override created the final result'
    when review_confirmed_at is null and draw_completed_at is not null then 'ABNORMAL: draw exists without review confirmation audit'
    when review_link_opened_at is null and draw_completed_at is not null then 'ABNORMAL: draw exists without review link opened audit'
    when draw_completed_at < review_confirmed_at then 'ABNORMAL: draw happened before review confirmation'
    when gift_completed_at is not null and gift_completed_at < draw_completed_at then 'ABNORMAL: gift completed before draw'
    else 'ORDER_OK: server timeline is consistent; customer likely saw a resumed/continued existing in-progress flow'
  end as diagnosis
from marks;

-- Check whether the currently installed draw RPC includes the 10-second auto review gate.
-- If this returns false, run supabase/patch-auto-draw-after-review-open.sql.
select
  '05_FUNCTION_CHECK' as section,
  pg_get_functiondef('public.ff_run_draw(uuid,uuid,integer,text)'::regprocedure) like '%auto_after_review_open%' as draw_rpc_has_auto_review_gate,
  pg_get_functiondef('public.ff_register_participant(uuid,text,text,text,date,text)'::regprocedure) like '%already_completed%' as register_rpc_blocks_completed_resume;
