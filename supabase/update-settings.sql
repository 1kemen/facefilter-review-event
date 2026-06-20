-- Face Filter review event production settings
-- Run this in Supabase SQL Editor after schema.sql has succeeded.

update public.review_event_settings
set naver_review_url = 'https://map.naver.com/p/entry/place/1958856197?placePath=/review?additionalHeight=76&entry=plt&fromPanelNum=1&locale=ko&svcName=map_pcv5&timestamp=202605291743&entry=plt&fromPanelNum=1&locale=ko&svcName=map_pcv5&timestamp=202605291743&searchType=place&lng=127.1273340&lat=37.5382236&c=15.00,0,0,0,dh',
    kakao_channel_url = 'https://pf.kakao.com/_Rwxmdb',
    updated_at = now()
where id = 'default';

-- After creating the admin user in Supabase Auth, run the insert below with the real auth.users.id.
-- select id, email from auth.users where email = 'hayashisan229@gmail.com';
-- insert into public.review_event_staff_profiles (user_id, display_name, role)
-- values ('PASTE_AUTH_USER_ID_HERE', '페이스필터 천호 관리자', 'owner')
-- on conflict (user_id) do update
-- set display_name = excluded.display_name,
--     role = excluded.role;
