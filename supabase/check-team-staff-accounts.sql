-- Check team staff auth users and staff profile mapping.

with team_accounts(email, display_name) as (
  values
    ('codi@facefilter.local', '코디팀'),
    ('assi@facefilter.local', '어시팀'),
    ('nurse@facefilter.local', '간호팀'),
    ('skin@facefilter.local', '피부팀'),
    ('consult@facefilter.local', '상담팀')
)
select
  team_accounts.display_name as team,
  team_accounts.email,
  auth_user.id as auth_user_id,
  auth_user.email_confirmed_at,
  profile.role,
  case
    when auth_user.id is null then '1_AUTH_USER_MISSING'
    when auth_user.email_confirmed_at is null then '2_EMAIL_NOT_CONFIRMED'
    when profile.user_id is null then '3_STAFF_PROFILE_MISSING'
    when profile.role not in ('owner', 'staff') then '4_INVALID_ROLE'
    else 'OK'
  end as login_ready_status
from team_accounts
left join auth.users auth_user
  on lower(auth_user.email) = lower(team_accounts.email)
left join public.review_event_staff_profiles profile
  on profile.user_id = auth_user.id
order by team_accounts.display_name;
