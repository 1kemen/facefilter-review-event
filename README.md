# 피부과 리뷰이벤트 MVP

배너 QR을 찍은 고객이 포토리뷰 완료 후 미니게임 상품뽑기 결과를 직원에게 보여주는 웹앱입니다. 카카오톡 플친 추가는 시트팩 1장 추가증정 혜택으로 운영합니다.

## 실행

운영 사이트: <https://project-q5ykg.vercel.app>

화면은 정적 HTML/CSS/JS이고 데이터는 Supabase가 처리합니다. `index.html`을 파일로 직접 열면 Supabase 호출이 막히므로, 로컬에서 확인할 때는 이 폴더를 정적 서버로 띄웁니다.

```sh
npx serve .
```

배포는 `vercel.json`의 `sh build.sh`가 필요한 파일만 `public/`으로 복사하는 구조입니다. 자세한 내용은 `VERCEL_DEPLOY.md`를 참고하세요.

## 포함된 흐름

1. 고객이 이름, 휴대폰 뒤 4자리, 네이버 리뷰 닉네임을 입력하고 개인정보 저장에 동의합니다.
2. 방문일은 시스템이 오늘 날짜로 자동 저장합니다.
3. `리뷰 작성하기`로 네이버 리뷰 페이지에 다녀온 뒤, 돌아와서 `리뷰 작성 완료`를 누릅니다.
4. 고객이 공개된 상품 확률을 확인하고 물방울 1개를 고릅니다.
5. `n번 물방울로 뽑기` 버튼을 한 번 더 눌러야 결과가 확정됩니다.
6. 선택사항으로 카카오톡 플친 추가 혜택을 확인합니다.
7. 고객이 결과 화면과 네이버 리뷰 화면을 함께 직원에게 보여줍니다.
8. 직원이 확인 후 증정 완료 처리하고 차트 메모를 복사합니다.

리뷰 페이지에 다녀오다 화면을 놓쳐도, QR을 다시 찍고 같은 정보를 넣으면 진행 상태가 복구됩니다.

## 어뷰징 방어 모델

- 같은 네이버 ID 또는 리뷰 닉네임은 마지막 참여일 기준 28일 이후 다시 참여할 수 있습니다.
- 같은 날 동일 네이버 ID 또는 같은 휴대폰/기기 조합은 기존 참여 내역으로 연결합니다.
- 포토리뷰 완료 체크 전 뽑기를 차단합니다.
- 카카오톡 플친 추가는 선택사항이며 완료 고객에게 시트팩 1장을 추가 증정합니다.
- 물방울을 누르는 것만으로는 결과가 확정되지 않고, 확정 버튼을 한 번 더 눌러야 합니다.
- 리뷰 작성 완료와 물방울 번호가 없으면 서버에서 뽑기를 거절합니다.
- 이미 당첨된 고객은 새로고침하거나 다시 클릭해도 기존 결과만 유지합니다.
- 지급완료된 참여자는 같은 정보로 다시 입력해도 결과 화면이 다시 열리지 않습니다.
- 뽑기 클릭 연타를 쿨다운과 진행 잠금으로 방어합니다.
- 재고가 0개인 상품은 자동으로 후보에서 제외합니다.
- 관리자는 상품명, 상품 설명, 재고, 확률 가중치를 수정하거나 새 상품을 추가할 수 있습니다.
- 고객에게는 상품명, 상품 설명, 공개 확률만 표시하며 재고 수량은 노출하지 않습니다.
- 네이버 ID 또는 리뷰 닉네임은 4주 참여 제한과 직원 확인을 위한 최소 식별값으로 사용합니다.
- 동일 이름과 휴대폰 뒤 4자리 재등장은 확인 필요 플래그로 표시합니다.
- 같은 기기에서 짧은 시간 내 반복 뽑기가 감지되면 확인 필요 플래그를 남깁니다.
- 감사 로그는 단순 해시 체인으로 훼손 여부를 확인할 수 있습니다.

감사 로그에 남는 사건은 아래와 같습니다.

```text
session_created                      participant_created
duplicate_registration_blocked       naver_cooldown_blocked
review_link_opened                   photo_review_auto_confirmed
review_approved_by_staff_override    kakao_channel_link_opened
kakao_channel_confirmed              draw_completed
staff_force_draw_completed           gift_completed
staff_record_updated                 participant_deleted
```

## 저장 구조

참여자 등록, 뽑기 확정, 지급 처리, 감사 로그는 모두 Supabase에서 처리합니다. 클라이언트는 아래 함수를 호출할 뿐이고, 결과는 서버 트랜잭션에서 확정됩니다.

| 하는 일 | 함수 |
| --- | --- |
| 참여자 등록·중복 검사 | `ff_register_participant`, `ff_normalize_key` |
| 세션 생성·복구 | `ff_create_session`, `ff_get_session_state` |
| 리뷰 작성 완료 처리 | `ff_mark_review_opened`, `ff_set_photo_review_self_confirmed` |
| 상품뽑기 확정·재고 차감 | `ff_run_draw` |
| 카카오 채널 혜택 기록 | `ff_mark_kakao_opened`, `ff_set_kakao_verified` |
| 직원 지급 처리 | `ff_complete_gift`, `ff_update_participant_staff_fields` |
| 권한 판별 | `ff_is_owner`, `ff_is_staff` |
| 감사 로그 | `ff_write_audit` |

테이블 7개에 RLS가 걸려 있습니다. 스키마는 `supabase/schema.sql`, 이후 변경은 `supabase/patch-*.sql`에 순서대로 들어 있습니다.

`localStorage`는 세션 손잡이와 화면 상태 정도만 들고 있고, 참여 기록의 원본이 아닙니다.

## 아직 남은 것

- 카카오톡 채널 추가 여부는 실제 채널 API로 확인하는 것이 아니라 고객이 누른 기록(`source: customer_channel_action`)입니다. 실제 관계 확인은 붙어 있지 않습니다.
- 초기 기획에 있던 `설문조사 완료 후 1회 재뽑기` 흐름은 구현되어 있지 않습니다. 화면·서버·감사 로그 어디에도 없습니다.
