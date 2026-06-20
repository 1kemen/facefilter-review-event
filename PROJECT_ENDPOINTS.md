# 프로젝트 엔드포인트 정리

페이스필터의원 천호점 리뷰 이벤트 MVP의 운영 URL, 화면 진입 경로, 외부 연결 링크, Supabase RPC 엔드포인트를 정리한 문서입니다.

## 운영 웹 URL

| 구분 | URL | 용도 |
| --- | --- | --- |
| 고객 QR/기본 진입 | `https://project-q5ykg.vercel.app/` | 고객이 QR로 접속해 참여 정보 입력, 리뷰 작성, 상품뽑기, 결과 확인을 진행합니다. |
| 관리자 페이지 | `https://project-q5ykg.vercel.app/?mode=admin` | 관리자 로그인 후 참여자 관리, 감사로그, 상품설정을 확인합니다. |
| 직원 지급관리 페이지 | `https://project-q5ykg.vercel.app/?mode=staff` | 직원 로그인 후 현장 지급 관리, 대신뽑기, 지급완료, 차트번호/메모 입력을 처리합니다. |

## 고객 화면 상태 URL

| 파라미터 | 예시 | 설명 |
| --- | --- | --- |
| `flow` | `https://project-q5ykg.vercel.app/?flow=F-xxxx` | QR/재진입 흐름을 구분하는 클라이언트 세션 힌트입니다. 같은 링크에 여러 고객이 들어와도 앱은 개별 세션/참여자 정보를 생성합니다. |
| `mode` | `?mode=admin`, `?mode=staff` | 백오피스 화면 전환용입니다. 고객 QR에는 노출하지 않습니다. |

## 외부 연결 링크

| 구분 | 현재 값 | 연결 위치 |
| --- | --- | --- |
| 네이버 리뷰 | Supabase `review_event_settings.naver_review_url` 또는 앱 fallback | 고객의 `네이버 리뷰 작성하기` 버튼 |
| 카카오톡 채널 | `https://pf.kakao.com/_Rwxmdb` | 카톡 혜택 팝업/최종 화면의 채널 추가 버튼 |
| Vercel 프로젝트 | `project-q5ykg` | 정적 웹앱 배포 |
| Supabase 프로젝트 | `https://zvilysnkxofvjdxwixpn.supabase.co` | DB, Auth, RPC 백엔드 |

## Supabase REST/Auth 엔드포인트

프론트엔드는 `supabase/supabase-client.js`에서 아래 경로를 호출합니다.

| 유형 | 경로 | 용도 |
| --- | --- | --- |
| Auth 로그인 | `/auth/v1/token?grant_type=password` | 관리자/직원 이메일+비밀번호 로그인 |
| Auth 갱신 | `/auth/v1/token?grant_type=refresh_token` | 로그인 세션 갱신 |
| RPC | `/rest/v1/rpc/{function_name}` | 참여 등록, 상태 조회, 뽑기, 지급완료 등 핵심 로직 |
| Settings REST | `/rest/v1/review_event_settings?id=eq.default` | 카카오 채널 링크 등 설정 저장 |
| Prizes REST | `/rest/v1/review_event_prizes` | 관리자 상품 추가/수정/삭제 |

## 주요 RPC 함수

| 함수 | 호출 주체 | 용도 |
| --- | --- | --- |
| `ff_get_public_state` | 고객/공통 | 공개 상품, 설정 등 고객 화면 기본 상태 조회 |
| `ff_get_admin_state` | 관리자/직원 | 참여자, 감사로그, 상품, 설정 등 백오피스 상태 조회 |
| `ff_create_session` | 고객 | QR 접속 시 세션 생성 |
| `ff_get_session_state` | 고객 | 세션/참여자 재진입 상태 조회 |
| `ff_register_participant` | 고객 | 이름, 휴대폰 뒤 4자리, 네이버 리뷰 닉네임 기준 참여 등록/복귀 |
| `ff_mark_review_opened` | 고객 | 네이버 리뷰 버튼 클릭 기록 |
| `ff_set_photo_review_self_confirmed` | 고객 | 고객의 리뷰 작성 완료 클릭 기록 |
| `ff_mark_kakao_opened` | 고객 | 카카오 채널 배너 클릭 기록 |
| `ff_set_kakao_verified` | 고객/직원 보정 | 애프터케어 시트팩 혜택 적용 |
| `ff_run_draw` | 고객/관리자 | 물방울 선택 후 상품뽑기 확정 |
| `ff_staff_force_draw` | 직원 | 고객이 중간에 막혔을 때 리뷰 확인 후 직원 대신뽑기 |
| `ff_update_participant_staff_fields_v2` | 직원 | 담당자, 지급 메모, 고객 차트번호 저장 |
| `ff_complete_gift_v3` | 직원 | 지급완료 처리와 세션 만료 |
| `ff_delete_participant` | 관리자 | 테스트/오등록 참여자 삭제 |

## 주요 DB 테이블

| 테이블 | 역할 |
| --- | --- |
| `review_event_settings` | 기본 설정, 링크, 쿨다운 기간 |
| `review_event_sessions` | QR/브라우저 세션 |
| `review_event_participants` | 참여자 기본 정보, 진행 상태, 직원 기록 |
| `review_event_prizes` | 상품명, 설명, 확률 가중치, 활성 여부 |
| `review_event_draws` | 기본 뽑기 결과 |
| `review_event_audit_logs` | 등록/리뷰/뽑기/지급/삭제 감사 로그 |
| `review_event_staff_profiles` | 관리자/직원 권한 매핑 |

## 운영상 중요한 상태 기준

| 상태 | 기준 |
| --- | --- |
| 재참여 방지 | 네이버 리뷰 닉네임 기준 4주 제한, 같은 날 동일 이름+휴대폰 뒤 4자리 차단 |
| 복귀 허용 | 이름, 휴대폰 뒤 4자리, 네이버 리뷰 닉네임이 모두 같은 경우 기존 진행으로 복귀 |
| 뽑기 가능 | 네이버 리뷰 작성 완료 클릭 후 물방울 1개 선택 필요 |
| 뽑기 불변 | 결과 확정 후 새로고침/뒤로가기/재접속에도 같은 결과 유지 |
| 카톡 혜택 | 채널 배너 클릭 또는 이미 추가 버튼 클릭 시 혜택 적용 및 집계 |
| 세션 만료 | 직원이 지급완료 처리하면 고객 세션은 완료 상태로 고정 |
| 미완료 대응 | 직원이 실제 리뷰를 확인한 경우 메모를 남기고 대신뽑기 가능 |

## 배포/관리 참고

- Vercel 운영 배포는 `vercel deploy --prod`로 진행합니다.
- GitHub에는 `.tools/`, `.vercel/`, `.env*`, `node_modules/`가 올라가지 않도록 `.gitignore`에서 제외합니다.
- Supabase anon key는 프론트 공개키 성격이지만, service role key는 절대 저장소에 올리지 않습니다.
- SQL 패치는 `supabase/` 폴더에 보관하며, 운영 DB에는 Supabase SQL Editor에서 필요한 패치만 실행합니다.
