# Supabase 전환 작업 노트

이 MVP는 현재 브라우저 저장소로만 동작합니다. 실제 서비스에서는 같은 QR을 여러 명이 동시에 열어도 각 고객에게 독립 세션을 발급하고, 뽑기 결과는 Supabase DB 함수에서 한 번만 확정되도록 옮기는 구조가 맞습니다.

## 1. Supabase 프로젝트 생성

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 [supabase/schema.sql](./supabase/schema.sql)을 실행합니다.
3. Project Settings > API에서 Project URL과 anon public key를 확인합니다.
4. [supabase-config.js](./supabase-config.js)에 값을 넣습니다.

```js
window.FACEFILTER_SUPABASE = {
  url: "https://프로젝트-ref.supabase.co",
  anonKey: "public-anon-key"
};
```

service_role key는 절대 고객 브라우저 코드에 넣으면 안 됩니다.

관리자 화면을 실제로 쓰려면 Supabase Auth에서 직원 계정을 만든 뒤, SQL Editor에서 첫 owner를 1명 등록해야 합니다.

```sql
insert into public.review_event_staff_profiles (user_id, display_name, role)
values ('Supabase Auth user id', '원내 관리자', 'owner');
```

## 2. 현재 설계 기준

- 고객 QR 화면: anon key로 RPC만 호출합니다.
- 상품뽑기/재뽑기: `ff_run_draw` DB 함수에서 트랜잭션으로 확정합니다.
- 4주 참여 제한: `ff_register_participant`에서 리뷰 닉네임 기준으로 차단합니다.
- 같은 QR 동시 접속: `ff_create_session`이 접속마다 새 세션 UUID를 발급합니다.
- 지급 완료: `ff_complete_gift`가 참여 세션을 `closed`로 닫습니다.
- 감사로그: `review_event_audit_logs`에 해시 체인 형태로 쌓입니다.
- 고객에게 상품 재고 수량은 반환하지 않고, 공개 확률만 반환합니다.

## 3. 앱 연결 단계

브라우저 호출 래퍼는 [supabase/supabase-client.js](./supabase/supabase-client.js)에 준비되어 있습니다.

다음 구현 단계는 `app.js`의 localStorage 저장/조회 부분을 아래 RPC 호출로 교체하는 것입니다.

- 시작: `FaceFilterSupabase.createSession()`
- 공개 설정/확률: `FaceFilterSupabase.getPublicState()`
- 참여 등록: `FaceFilterSupabase.registerParticipant(...)`
- 리뷰 열기: `FaceFilterSupabase.markReviewOpened(...)`
- 리뷰 완료 체크: `FaceFilterSupabase.setPhotoReviewDone(...)`
- 뽑기: `FaceFilterSupabase.runDraw(...)`
- 플친 혜택 체크: `FaceFilterSupabase.setKakaoVerified(...)`
- 설문 완료: `FaceFilterSupabase.setSurveyCompleted(...)`
- 재뽑기: `FaceFilterSupabase.runDraw({ drawType: "reroll" })`
- 지급 완료: `FaceFilterSupabase.completeGift(...)`

## 4. 운영 전에 필요한 추가 작업

- 관리자 화면은 Supabase Auth 로그인 뒤에만 접근하게 분리합니다.
- QR URL은 고객 화면만 보이게 하고, 관리자/감사로그/상품설정 탭은 admin URL에서만 보이게 합니다.
- 개인정보 처리방침과 이벤트 유의사항을 QR 시작 화면 하단에 짧게 연결합니다.
- 테스트 DB에서 동시에 2명 이상 접속, 새로고침, 뒤로가기, 같은 닉네임 4주 제한, 재뽑기 1회 제한을 검증합니다.

## 5. 현재 운영 링크

- 네이버 리뷰: `https://map.naver.com/p/entry/place/1958856197?placePath=/review?additionalHeight=76&entry=plt&fromPanelNum=1&locale=ko&svcName=map_pcv5&timestamp=202605291743&entry=plt&fromPanelNum=1&locale=ko&svcName=map_pcv5&timestamp=202605291743&searchType=place&lng=127.1273340&lat=37.5382236&c=15.00,0,0,0,dh`
- 설문조사: `https://forms.gle/Jj2GrjzVKAJ15YX47`
- 관리자 이메일: `hayashisan229@gmail.com`
- 카카오톡 채널: `https://pf.kakao.com/_Rwxmdb`

위 값은 [supabase/update-settings.sql](./supabase/update-settings.sql)로 DB에 반영합니다.
