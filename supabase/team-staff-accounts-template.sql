-- Team staff account profile mapping.
-- 1) Supabase Dashboard > Authentication > Users > Add user
--    Create these emails first and set team passwords manually.
-- 2) Run this SQL after the auth users exist.
-- 3) Staff login URL: https://project-q5ykg.vercel.app/?mode=staff

begin;

with team_accounts(email, display_name, role) as (
  values
    ('codi@facefilter.local', '코디팀', 'staff'),
    ('assi@facefilter.local', '어시팀', 'staff'),
    ('nurse@facefilter.local', '간호팀', 'staff'),
    ('skin@facefilter.local', '피부팀', 'staff'),
    ('consult@facefilter.local', '상담팀', 'staff')
)
insert into public.review_event_staff_profiles (user_id, display_name, role)
select auth_user.id, team_accounts.display_name, team_accounts.role
from team_accounts
join auth.users auth_user
  on lower(auth_user.email) = lower(team_accounts.email)
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role;

commit;

-- Optional check. Run separately if you want to confirm every team was connected.
with team_accounts(email, display_name) as (
  values
    ('codi@facefilter.local', '코디팀'),
    ('assi@facefilter.local', '어시팀'),
    ('nurse@facefilter.local', '간호팀'),
    ('skin@facefilter.local', '피부팀'),
    ('consult@facefilter.local', '상담팀')
)
select
  team_accounts.display_name,
  team_accounts.email,
  case
    when auth_user.id is null then 'AUTH USER MISSING'
    when profile.user_id is null then 'PROFILE MISSING'
    else profile.role
  end as status
from team_accounts
left join auth.users auth_user
  on lower(auth_user.email) = lower(team_accounts.email)
left join public.review_event_staff_profiles profile
  on profile.user_id = auth_user.id
order by team_accounts.display_name;
