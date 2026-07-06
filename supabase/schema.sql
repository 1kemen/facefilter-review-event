-- Face Filter review event MVP -> Supabase backend
-- Run this once in the Supabase SQL editor for the production project.
-- Never expose the service_role key in the browser. The customer QR page should use the anon key only.

begin;

create extension if not exists pgcrypto with schema extensions;
set local search_path = public, extensions;

create table if not exists public.review_event_settings (
  id text primary key default 'default' check (id = 'default'),
  clinic_name text not null default 'FACE FILTER 천호점',
  naver_review_url text,
  kakao_channel_url text,
  cooldown_days integer not null default 28 check (cooldown_days between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into public.review_event_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.review_event_staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('owner', 'staff', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.review_event_sessions (
  id uuid primary key default gen_random_uuid(),
  qr_code text,
  user_agent text,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.review_event_prizes (
  id uuid primary key default gen_random_uuid(),
  prize_key text unique,
  name text not null,
  description text,
  initial_stock integer not null default 0 check (initial_stock >= 0),
  awarded_count integer not null default 0 check (awarded_count >= 0),
  weight integer not null default 0 check (weight >= 0),
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (awarded_count <= initial_stock)
);

create table if not exists public.review_event_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_event_sessions(id) on delete restrict,
  customer_name text not null,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  naver_handle text not null,
  naver_key text not null,
  visit_date date not null default current_date,
  chart_code text unique,
  device_key text,
  consent_at timestamptz not null default now(),
  review_opened_at timestamptz,
  review_status text not null default 'none' check (review_status in ('none', 'self_confirmed', 'approved', 'rejected')),
  review_evidence jsonb,
  kakao_opened_at timestamptz,
  kakao_verified boolean not null default false,
  kakao_verified_at timestamptz,
  gift_status text not null default 'not_ready' check (gift_status in ('not_ready', 'waiting', 'done', 'canceled')),
  gift_completed_at timestamptz,
  promoter_name text,
  gift_staff_name text,
  customer_chart_no text,
  staff_memo text,
  flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_event_draws (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.review_event_participants(id) on delete cascade,
  type text not null default 'primary' check (type = 'primary'),
  status text not null default 'active' check (status in ('active', 'replaced', 'canceled')),
  prize_id uuid not null references public.review_event_prizes(id) on delete restrict,
  prize_name text not null,
  prize_description text,
  previous_draw_id uuid references public.review_event_draws(id) on delete set null,
  confirm_code text not null unique,
  drop_choice integer check (drop_choice between 1 and 5),
  random_proof text not null,
  drawn_at timestamptz not null default now()
);

create unique index if not exists review_event_draws_one_primary_idx on public.review_event_draws (participant_id) where type = 'primary';

create unique index if not exists review_event_draws_one_active_idx on public.review_event_draws (participant_id) where status = 'active';

create index if not exists review_event_participants_naver_key_idx on public.review_event_participants (naver_key, visit_date desc);

create index if not exists review_event_participants_session_idx on public.review_event_participants (session_id);

create table if not exists public.review_event_audit_logs (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_type text not null default 'system' check (actor_type in ('customer', 'staff', 'system')),
  action text not null,
  subject_table text,
  subject_id uuid,
  session_id uuid references public.review_event_sessions(id) on delete set null,
  participant_id uuid references public.review_event_participants(id) on delete set null,
  detail jsonb not null default '{}',
  previous_hash text not null,
  hash text not null
);

create or replace function public.ff_normalize_key(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(value, ''), '\s+', '', 'g'));
$$;

create or replace function public.ff_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ff_keep_saved_staff_names()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(old.promoter_name, '')), '') is not null
    and new.promoter_name is distinct from old.promoter_name then
    new.promoter_name := old.promoter_name;
  end if;

  if nullif(btrim(coalesce(old.gift_staff_name, '')), '') is not null
    and new.gift_staff_name is distinct from old.gift_staff_name then
    new.gift_staff_name := old.gift_staff_name;
  end if;

  return new;
end;
$$;

drop trigger if exists review_event_settings_updated_at on public.review_event_settings;
create trigger review_event_settings_updated_at
before update on public.review_event_settings
for each row execute function public.ff_set_updated_at();

drop trigger if exists review_event_participants_keep_saved_staff_names on public.review_event_participants;
create trigger review_event_participants_keep_saved_staff_names
before update of promoter_name, gift_staff_name on public.review_event_participants
for each row execute function public.ff_keep_saved_staff_names();

drop trigger if exists review_event_prizes_updated_at on public.review_event_prizes;
create trigger review_event_prizes_updated_at
before update on public.review_event_prizes
for each row execute function public.ff_set_updated_at();

drop trigger if exists review_event_participants_updated_at on public.review_event_participants;
create trigger review_event_participants_updated_at
before update on public.review_event_participants
for each row execute function public.ff_set_updated_at();

create or replace function public.ff_is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.review_event_staff_profiles profile
    where profile.user_id = auth.uid()
      and profile.role in ('owner', 'staff')
  );
$$;

create or replace function public.ff_is_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.review_event_staff_profiles profile
    where profile.user_id = auth.uid()
      and profile.role = 'owner'
  );
$$;

create or replace function public.ff_write_audit(
  p_actor_type text,
  p_action text,
  p_subject_table text default null,
  p_subject_id uuid default null,
  p_session_id uuid default null,
  p_participant_id uuid default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_at timestamptz := now();
  v_previous_hash text;
  v_hash text;
begin
  perform pg_advisory_xact_lock(260529718::bigint);

  select hash
  into v_previous_hash
  from public.review_event_audit_logs
  order by id desc
  limit 1;

  v_previous_hash := coalesce(v_previous_hash, 'GENESIS');
  v_hash := encode(
    digest(
      v_previous_hash || '|' || v_at::text || '|' || coalesce(p_action, '') || '|' ||
      coalesce(p_subject_id::text, '-') || '|' || coalesce(p_detail::text, '{}'),
      'sha256'
    ),
    'hex'
  );

  insert into public.review_event_audit_logs (
    occurred_at,
    actor_type,
    action,
    subject_table,
    subject_id,
    session_id,
    participant_id,
    detail,
    previous_hash,
    hash
  )
  values (
    v_at,
    coalesce(p_actor_type, 'system'),
    p_action,
    p_subject_table,
    p_subject_id,
    p_session_id,
    p_participant_id,
    coalesce(p_detail, '{}'::jsonb),
    v_previous_hash,
    v_hash
  );
end;
$$;

create or replace function public.ff_participant_payload(p_participant_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participant', to_jsonb(p),
    'draws', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.drawn_at)
      from public.review_event_draws d
      where d.participant_id = p.id
    ), '[]'::jsonb),
    'activeDraw', (
      select to_jsonb(d)
      from public.review_event_draws d
      where d.participant_id = p.id
        and d.status = 'active'
      order by d.drawn_at desc
      limit 1
    )
  )
  from public.review_event_participants p
  where p.id = p_participant_id;
$$;

create or replace function public.ff_get_public_state()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with available as (
    select id, name, description, weight, sort_order
    from public.review_event_prizes
    where active = true
      and weight > 0
      and awarded_count < initial_stock
  ),
  total as (
    select coalesce(sum(weight), 0) as weight_sum
    from available
  )
  select jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'clinicName', clinic_name,
        'naverReviewUrl', coalesce(naver_review_url, ''),
        'kakaoChannelUrl', coalesce(kakao_channel_url, ''),
        'cooldownDays', cooldown_days
      )
      from public.review_event_settings
      where id = 'default'
    ),
    'prizes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', available.id,
          'name', available.name,
          'description', coalesce(available.description, ''),
          'weight', available.weight,
          'percent', case
            when total.weight_sum > 0 then round((available.weight::numeric / total.weight_sum::numeric) * 100, 2)
            else 0
          end
        )
        order by available.sort_order, available.name
      )
      from available, total
    ), '[]'::jsonb)
  );
$$;

create or replace function public.ff_create_session(
  p_qr_code text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  insert into public.review_event_sessions (qr_code, user_agent)
  values (nullif(btrim(p_qr_code), ''), left(nullif(btrim(p_user_agent), ''), 500))
  returning id into v_session_id;

  perform public.ff_write_audit(
    'customer',
    'session_created',
    'review_event_sessions',
    v_session_id,
    v_session_id,
    null,
    jsonb_build_object('qrCode', p_qr_code is not null)
  );

  return v_session_id;
end;
$$;

create or replace function public.ff_register_participant(
  p_session_id uuid,
  p_customer_name text,
  p_phone_last4 text,
  p_naver_handle text,
  p_visit_date date default current_date,
  p_device_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.review_event_sessions%rowtype;
  v_name text;
  v_phone text;
  v_naver_handle text;
  v_naver_key text;
  v_cooldown_days integer;
  v_basis_date date;
  v_next_date date;
  v_existing public.review_event_participants%rowtype;
  v_participant public.review_event_participants%rowtype;
  v_flags text[] := '{}';
  v_chart_code text;
  v_resume_allowed boolean := false;
begin
  select * into v_session
  from public.review_event_sessions
  where id = p_session_id
    and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_session', 'message', '세션이 만료되었습니다.');
  end if;

  v_name := left(nullif(btrim(regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g')), ''), 80);
  v_phone := regexp_replace(coalesce(p_phone_last4, ''), '\D', '', 'g');
  v_naver_handle := left(nullif(btrim(regexp_replace(coalesce(p_naver_handle, ''), '\s+', ' ', 'g')), ''), 120);
  v_naver_key := public.ff_normalize_key(v_naver_handle);

  if v_name is null or v_phone !~ '^[0-9]{4}$' or v_naver_key = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', '이름, 휴대폰 뒤 4자리, 리뷰 닉네임을 확인해 주세요.');
  end if;

  perform pg_advisory_xact_lock(hashtext('review-event-register:' || v_naver_key)::bigint);
  perform pg_advisory_xact_lock(hashtext('review-event-register-name-phone:' || public.ff_normalize_key(v_name) || ':' || v_phone)::bigint);

  select cooldown_days into v_cooldown_days
  from public.review_event_settings
  where id = 'default';

  select *
  into v_existing
  from public.review_event_participants p
  where p.visit_date = coalesce(p_visit_date, current_date)
    and (
      p.naver_key = v_naver_key
      or (
        public.ff_normalize_key(p.customer_name) = public.ff_normalize_key(v_name)
        and p.phone_last4 = v_phone
      )
    )
  order by p.created_at desc
  limit 1;

  if found then
    v_resume_allowed := public.ff_normalize_key(v_existing.customer_name) = public.ff_normalize_key(v_name)
      and v_existing.phone_last4 = v_phone
      and v_existing.naver_key = v_naver_key;

    perform public.ff_write_audit(
      'customer',
      'duplicate_registration_blocked',
      'review_event_participants',
      v_existing.id,
      p_session_id,
      case when v_resume_allowed and v_existing.gift_status <> 'done' then v_existing.id else null end,
      jsonb_build_object(
        'visitDate', p_visit_date,
        'resumeAllowed', v_resume_allowed,
        'existingGiftStatus', v_existing.gift_status,
        'completedPayloadBlocked', v_resume_allowed and v_existing.gift_status = 'done'
      )
    );

    if v_resume_allowed and v_existing.gift_status = 'done' then
      return jsonb_build_object(
        'ok', false,
        'code', 'already_completed',
        'message', '이미 지급완료된 참여입니다. 추가 확인은 직원에게 문의해 주세요.',
        'payload', null
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'code', 'duplicate_today',
      'message', case
        when v_resume_allowed then '이미 등록된 참여 이력이 있습니다.'
        else '기존 화면 복귀는 이름, 휴대폰 뒤 4자리, 리뷰 닉네임이 모두 같을 때만 가능합니다.'
      end,
      'payload', case when v_resume_allowed then public.ff_participant_payload(v_existing.id) else null end
    );
  end if;

  select coalesce(gift_completed_at::date, visit_date)
  into v_basis_date
  from public.review_event_participants p
  where p.naver_key = v_naver_key
  order by coalesce(gift_completed_at::date, visit_date) desc
  limit 1;

  if v_basis_date is not null then
    v_next_date := v_basis_date + v_cooldown_days;
    if coalesce(p_visit_date, current_date) < v_next_date then
      perform public.ff_write_audit(
        'customer',
        'naver_cooldown_blocked',
        'review_event_participants',
        null,
        p_session_id,
        null,
        jsonb_build_object('nextEligibleDate', v_next_date, 'cooldownDays', v_cooldown_days)
      );

      return jsonb_build_object(
        'ok', false,
        'code', 'cooldown',
        'message', '리뷰 닉네임당 4주 간격으로 참여할 수 있습니다.',
        'nextEligibleDate', v_next_date
      );
    end if;
  end if;

  if exists (
    select 1
    from public.review_event_participants p
    where public.ff_normalize_key(p.customer_name) = public.ff_normalize_key(v_name)
      and p.phone_last4 = v_phone
  ) then
    v_flags := array_append(v_flags, '동일 이름/휴대폰 뒤 4자리 참여 이력이 있습니다.');
  end if;

  if p_device_key is not null and (
    select count(*)
    from public.review_event_participants p
    where p.device_key = p_device_key
      and p.created_at > now() - interval '10 minutes'
  ) >= 2 then
    v_flags := array_append(v_flags, '같은 기기에서 짧은 시간 내 반복 참여가 감지되었습니다.');
  end if;

  insert into public.review_event_participants (
    session_id,
    customer_name,
    phone_last4,
    naver_handle,
    naver_key,
    visit_date,
    device_key,
    flags
  )
  values (
    p_session_id,
    v_name,
    v_phone,
    v_naver_handle,
    v_naver_key,
    coalesce(p_visit_date, current_date),
    nullif(p_device_key, ''),
    v_flags
  )
  returning * into v_participant;

  v_chart_code := 'QR-' || to_char(v_participant.visit_date, 'YYMMDD') || '-' ||
    v_phone || '-' || upper(right(replace(v_participant.id::text, '-', ''), 3));

  update public.review_event_participants
  set chart_code = v_chart_code
  where id = v_participant.id
  returning * into v_participant;

  perform public.ff_write_audit(
    'customer',
    'participant_created',
    'review_event_participants',
    v_participant.id,
    p_session_id,
    v_participant.id,
    jsonb_build_object('chartCode', v_chart_code, 'flags', v_flags)
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'created',
    'payload', public.ff_participant_payload(v_participant.id)
  );
end;
$$;

create or replace function public.ff_mark_review_opened(
  p_session_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
    and session_id = p_session_id
  for update;

  if not found or v_participant.gift_status = 'done' then
    return jsonb_build_object('ok', false, 'code', 'not_available');
  end if;

  update public.review_event_participants
  set review_opened_at = coalesce(review_opened_at, now())
  where id = p_participant_id;

  perform public.ff_write_audit('customer', 'review_link_opened', 'review_event_participants', p_participant_id, p_session_id, p_participant_id, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_set_photo_review_self_confirmed(
  p_session_id uuid,
  p_participant_id uuid,
  p_done boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
  v_has_draw boolean;
begin
  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
    and session_id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_participant.gift_status = 'done' then
    return jsonb_build_object('ok', false, 'code', 'session_closed');
  end if;

  if p_done and v_participant.review_opened_at is null then
    return jsonb_build_object('ok', false, 'code', 'review_link_required');
  end if;

  select exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
  ) into v_has_draw;

  if v_has_draw and p_done = false then
    return jsonb_build_object('ok', false, 'code', 'draw_already_fixed');
  end if;

  update public.review_event_participants
  set review_status = case when p_done then 'self_confirmed' else 'none' end,
      review_evidence = case
        when p_done then jsonb_build_object('source', 'customer_self_confirmed', 'submittedAt', now())
        else null
      end
  where id = p_participant_id
    and session_id = p_session_id;

  perform public.ff_write_audit(
    'customer',
    case when p_done then 'photo_review_self_confirmed' else 'photo_review_unchecked' end,
    'review_event_participants',
    p_participant_id,
    p_session_id,
    p_participant_id,
    '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_set_kakao_verified(
  p_session_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.review_event_participants
  set kakao_verified = true,
      kakao_verified_at = coalesce(kakao_verified_at, now())
  where id = p_participant_id
    and session_id = p_session_id
    and gift_status <> 'done';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_available');
  end if;

  perform public.ff_write_audit(
    'customer',
    'kakao_channel_confirmed',
    'review_event_participants',
    p_participant_id,
    p_session_id,
    p_participant_id,
    jsonb_build_object('source', 'customer_channel_action')
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_mark_kakao_opened(
  p_session_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.review_event_participants
  set kakao_opened_at = coalesce(kakao_opened_at, now())
  where id = p_participant_id
    and session_id = p_session_id
    and gift_status <> 'done';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_available');
  end if;

  perform public.ff_write_audit(
    'customer',
    'kakao_channel_link_opened',
    'review_event_participants',
    p_participant_id,
    p_session_id,
    p_participant_id,
    '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_run_draw(
  p_session_id uuid,
  p_participant_id uuid,
  p_drop_choice integer default null,
  p_draw_type text default 'primary'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session_status text;
  v_participant public.review_event_participants%rowtype;
  v_prize public.review_event_prizes%rowtype;
  v_total_weight integer;
  v_ticket double precision;
  v_confirm_code text;
  v_draw public.review_event_draws%rowtype;
begin
  if coalesce(p_draw_type, 'primary') <> 'primary' then
    return jsonb_build_object('ok', false, 'code', 'extra_draw_removed');
  end if;

  if p_drop_choice is not null and (p_drop_choice < 1 or p_drop_choice > 5) then
    return jsonb_build_object('ok', false, 'code', 'invalid_drop_choice');
  end if;

  if p_drop_choice is null and not public.ff_is_staff() then
    return jsonb_build_object('ok', false, 'code', 'invalid_drop_choice_required');
  end if;

  select status into v_session_status
  from public.review_event_sessions
  where id = p_session_id;

  if v_session_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'code', 'session_closed');
  end if;

  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
    and session_id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  perform pg_advisory_xact_lock(260529717::bigint);

  if v_participant.gift_status = 'done' then
    return jsonb_build_object('ok', false, 'code', 'gift_completed');
  end if;

  if v_participant.review_status not in ('self_confirmed', 'approved') then
    return jsonb_build_object('ok', false, 'code', 'review_required');
  end if;

  if exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and type = 'primary'
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_drawn', 'payload', public.ff_participant_payload(p_participant_id));
  end if;

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.review_event_prizes
  where active = true
    and weight > 0
    and awarded_count < initial_stock;

  if v_total_weight <= 0 then
    return jsonb_build_object('ok', false, 'code', 'no_prizes_available');
  end if;

  v_ticket := random() * v_total_weight;

  for v_prize in
    select *
    from public.review_event_prizes
    where active = true
      and weight > 0
      and awarded_count < initial_stock
    order by sort_order, name
    for update
  loop
    v_ticket := v_ticket - v_prize.weight;
    if v_ticket <= 0 then
      exit;
    end if;
  end loop;

  if v_prize.id is null then
    return jsonb_build_object('ok', false, 'code', 'draw_failed');
  end if;

  update public.review_event_prizes
  set awarded_count = awarded_count + 1
  where id = v_prize.id
  returning * into v_prize;

  v_confirm_code := 'RE-' || upper(left(replace(p_participant_id::text, '-', ''), 4)) || '-' ||
    lpad((floor(random() * 9000) + 1000)::integer::text, 4, '0');

  insert into public.review_event_draws (
    participant_id,
    type,
    status,
    prize_id,
    prize_name,
    prize_description,
    previous_draw_id,
    confirm_code,
    drop_choice,
    random_proof
  )
  values (
    p_participant_id,
    'primary',
    'active',
    v_prize.id,
    v_prize.name,
    v_prize.description,
    null,
    v_confirm_code,
    p_drop_choice,
    encode(digest(p_participant_id::text || '|' || v_prize.id::text || '|' || now()::text || '|' || random()::text, 'sha256'), 'hex')
  )
  returning * into v_draw;

  update public.review_event_participants
  set gift_status = 'waiting'
  where id = p_participant_id;

  perform public.ff_write_audit(
    'customer',
    'draw_completed',
    'review_event_draws',
    v_draw.id,
    p_session_id,
    p_participant_id,
    jsonb_build_object(
      'prizeId', v_prize.id,
      'prizeName', v_prize.name,
      'confirmCode', v_confirm_code,
      'dropChoice', p_drop_choice
    )
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'draw_completed',
    'draw', to_jsonb(v_draw),
    'payload', public.ff_participant_payload(p_participant_id)
  );
end;
$$;

create or replace function public.ff_get_session_state(
  p_session_id uuid,
  p_participant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.review_event_sessions%rowtype;
begin
  select * into v_session
  from public.review_event_sessions
  where id = p_session_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'session_not_found');
  end if;

  if p_participant_id is not null and not exists (
    select 1
    from public.review_event_participants
    where id = p_participant_id
      and session_id = p_session_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'participant_not_in_session');
  end if;

  return jsonb_build_object(
    'ok', true,
    'session', to_jsonb(v_session),
    'publicState', public.ff_get_public_state(),
    'payload', case when p_participant_id is null then null else public.ff_participant_payload(p_participant_id) end
  );
end;
$$;

create or replace function public.ff_get_admin_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if not public.ff_is_staff() then
    return jsonb_build_object('ok', false, 'code', 'not_staff');
  end if;

  return jsonb_build_object(
    'ok', true,
    'staffProfile', (
      select to_jsonb(profile)
      from public.review_event_staff_profiles profile
      where profile.user_id = auth.uid()
      limit 1
    ),
    'publicState', public.ff_get_public_state(),
    'prizes', coalesce((
      select jsonb_agg(to_jsonb(prize) order by prize.sort_order, prize.name)
      from public.review_event_prizes prize
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(public.ff_participant_payload(p.id) order by p.created_at desc)
      from public.review_event_participants p
      where p.created_at > v_now - interval '90 days'
    ), '[]'::jsonb),
    'auditLogs', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.id desc)
      from (
        select *
        from public.review_event_audit_logs
        order by id desc
        limit 500
      ) a
    ), '[]'::jsonb),
    'maintenance', jsonb_build_object(
      'generatedAt', v_now,
      'retention', jsonb_build_object(
        'participantDays', 90,
        'sessionDays', 30,
        'auditDays', 180
      ),
      'participants', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where created_at < v_now - interval '90 days'),
          'oldestAt', min(created_at),
          'latestAt', max(created_at)
        )
        from public.review_event_participants
      ),
      'sessions', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where created_at < v_now - interval '30 days'),
          'oldestAt', min(created_at),
          'latestAt', max(created_at)
        )
        from public.review_event_sessions
      ),
      'auditLogs', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where occurred_at < v_now - interval '180 days'),
          'oldestAt', min(occurred_at),
          'latestAt', max(occurred_at)
        )
        from public.review_event_audit_logs
      )
    )
  );
end;
$$;

create or replace function public.ff_update_participant_staff_fields(
  p_participant_id uuid,
  p_promoter_name text default null,
  p_gift_staff_name text default null,
  p_staff_memo text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  update public.review_event_participants
  set promoter_name = nullif(btrim(coalesce(p_promoter_name, '')), ''),
      gift_staff_name = nullif(btrim(coalesce(p_gift_staff_name, '')), ''),
      staff_memo = nullif(btrim(coalesce(p_staff_memo, '')), '')
  where id = p_participant_id
  returning * into v_participant;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  perform public.ff_write_audit(
    'staff',
    'staff_record_updated',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object(
      'promoterName', v_participant.promoter_name,
      'giftStaffName', v_participant.gift_staff_name,
      'staffUid', auth.uid()
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_complete_gift(
  p_participant_id uuid,
  p_staff_memo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  if not exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'draw_required');
  end if;

  update public.review_event_participants
  set gift_status = 'done',
      gift_completed_at = coalesce(gift_completed_at, now()),
      staff_memo = nullif(btrim(p_staff_memo), '')
  where id = p_participant_id
  returning * into v_participant;

  update public.review_event_sessions
  set status = 'closed',
      closed_at = coalesce(closed_at, now())
  where id = v_participant.session_id;

  perform public.ff_write_audit(
    'staff',
    'gift_completed',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object('staffUid', auth.uid())
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_complete_gift_v2(
  p_participant_id uuid,
  p_staff_memo text default null,
  p_gift_staff_name text default null,
  p_promoter_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  if not exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'draw_required');
  end if;

  update public.review_event_participants
  set gift_status = 'done',
      gift_completed_at = coalesce(gift_completed_at, now()),
      promoter_name = nullif(btrim(coalesce(p_promoter_name, promoter_name, '')), ''),
      gift_staff_name = nullif(btrim(coalesce(p_gift_staff_name, gift_staff_name, '')), ''),
      staff_memo = nullif(btrim(coalesce(p_staff_memo, staff_memo, '')), '')
  where id = p_participant_id
  returning * into v_participant;

  update public.review_event_sessions
  set status = 'closed',
      closed_at = coalesce(closed_at, now())
  where id = v_participant.session_id;

  perform public.ff_write_audit(
    'staff',
    'gift_completed',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object(
      'staffUid', auth.uid(),
      'promoterName', v_participant.promoter_name,
      'giftStaffName', v_participant.gift_staff_name
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_delete_participant(
  p_participant_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
  v_adjustments jsonb := '[]'::jsonb;
begin
  if not public.ff_is_owner() then
    raise exception 'owner permission required';
  end if;

  select *
  into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  with prize_counts as (
    select prize_id, count(*)::integer as draw_count
    from public.review_event_draws
    where participant_id = p_participant_id
      and status = 'active'
    group by prize_id
  ),
  updated as (
    update public.review_event_prizes prize
    set awarded_count = greatest(prize.awarded_count - prize_counts.draw_count, 0)
    from prize_counts
    where prize.id = prize_counts.prize_id
    returning prize.id, prize.name, prize_counts.draw_count
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'prizeId', id,
      'prizeName', name,
      'count', draw_count
    )),
    '[]'::jsonb
  )
  into v_adjustments
  from updated;

  delete from public.review_event_participants
  where id = p_participant_id;

  perform public.ff_write_audit(
    'staff',
    'participant_deleted',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    null,
    jsonb_build_object(
      'customerName', v_participant.customer_name,
      'chartCode', v_participant.chart_code,
      'naverHandle', v_participant.naver_handle,
      'adjustedPrizes', v_adjustments,
      'staffUid', auth.uid()
    )
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'participant_deleted',
    'deletedId', p_participant_id
  );
end;
$$;

alter table public.review_event_settings enable row level security;
alter table public.review_event_staff_profiles enable row level security;
alter table public.review_event_sessions enable row level security;
alter table public.review_event_prizes enable row level security;
alter table public.review_event_participants enable row level security;
alter table public.review_event_draws enable row level security;
alter table public.review_event_audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists "staff can manage settings" on public.review_event_settings;
drop policy if exists "owners can manage settings" on public.review_event_settings;
create policy "owners can manage settings"
on public.review_event_settings
for all
to authenticated
using (public.ff_is_owner())
with check (public.ff_is_owner());

drop policy if exists "staff can read staff profiles" on public.review_event_staff_profiles;
create policy "staff can read staff profiles"
on public.review_event_staff_profiles
for select
to authenticated
using (public.ff_is_staff() or user_id = auth.uid());

drop policy if exists "owners can manage staff profiles" on public.review_event_staff_profiles;
create policy "owners can manage staff profiles"
on public.review_event_staff_profiles
for all
to authenticated
using (public.ff_is_owner())
with check (public.ff_is_owner());

drop policy if exists "staff can manage sessions" on public.review_event_sessions;
create policy "staff can manage sessions"
on public.review_event_sessions
for all
to authenticated
using (public.ff_is_staff())
with check (public.ff_is_staff());

drop policy if exists "staff can manage prizes" on public.review_event_prizes;
drop policy if exists "owners can manage prizes" on public.review_event_prizes;
create policy "owners can manage prizes"
on public.review_event_prizes
for all
to authenticated
using (public.ff_is_owner())
with check (public.ff_is_owner());

drop policy if exists "staff can manage participants" on public.review_event_participants;
create policy "staff can manage participants"
on public.review_event_participants
for all
to authenticated
using (public.ff_is_staff())
with check (public.ff_is_staff());

drop policy if exists "staff can manage draws" on public.review_event_draws;
create policy "staff can manage draws"
on public.review_event_draws
for all
to authenticated
using (public.ff_is_staff())
with check (public.ff_is_staff());

drop policy if exists "staff can read audit logs" on public.review_event_audit_logs;
create policy "staff can read audit logs"
on public.review_event_audit_logs
for select
to authenticated
using (public.ff_is_staff());

grant execute on function public.ff_get_public_state() to anon, authenticated;
revoke execute on function public.ff_write_audit(text, text, text, uuid, uuid, uuid, jsonb) from public;
revoke execute on function public.ff_participant_payload(uuid) from public;
grant execute on function public.ff_create_session(text, text) to anon, authenticated;
grant execute on function public.ff_register_participant(uuid, text, text, text, date, text) to anon, authenticated;
grant execute on function public.ff_mark_review_opened(uuid, uuid) to anon, authenticated;
grant execute on function public.ff_set_photo_review_self_confirmed(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.ff_mark_kakao_opened(uuid, uuid) to anon, authenticated;
grant execute on function public.ff_set_kakao_verified(uuid, uuid) to anon, authenticated;
grant execute on function public.ff_run_draw(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function public.ff_get_session_state(uuid, uuid) to anon, authenticated;
grant execute on function public.ff_get_admin_state() to authenticated;
grant execute on function public.ff_update_participant_staff_fields(uuid, text, text, text) to authenticated;
grant execute on function public.ff_complete_gift(uuid, text) to authenticated;
grant execute on function public.ff_complete_gift_v2(uuid, text, text, text) to authenticated;
revoke execute on function public.ff_delete_participant(uuid) from public;
grant execute on function public.ff_delete_participant(uuid) to authenticated;

insert into public.review_event_prizes (prize_key, name, description, initial_stock, awarded_count, weight, sort_order)
values
  ('pico-toning', '피코슈어토닝 1000샷', '색소 고민 부위에 사용하는 레이저 토닝 혜택', 4, 0, 8, 10),
  ('facefit', '페이스핏 윤곽 3cc', '라인 정리를 위한 윤곽 관리 혜택', 5, 0, 10, 20),
  ('injection', '염증주사 1개', '국소 트러블 진정에 사용하는 주사 혜택', 20, 0, 34, 30),
  ('basic-care', '베이직 스킨케어', '피부 컨디션을 정돈하는 기본 관리 혜택', 14, 0, 24, 40),
  ('mask-pack', '마스크팩', '홈케어용 진정 마스크팩 증정', 30, 0, 24, 50)
on conflict (prize_key) do update
set name = excluded.name,
    description = excluded.description,
    initial_stock = greatest(public.review_event_prizes.awarded_count, excluded.initial_stock),
    weight = excluded.weight,
    sort_order = excluded.sort_order,
    active = true;

commit;
