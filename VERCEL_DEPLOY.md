# Vercel 배포 가이드

이 프로젝트는 정적 HTML/CSS/JS 앱입니다. Vercel은 화면 파일만 호스팅하고, 고객 참여 데이터와 뽑기 확정은 Supabase가 처리합니다.

## 추천 운영 구조

- 고객 QR URL: `https://배포주소.vercel.app/`
- 관리자 임시 URL: `https://배포주소.vercel.app/?mode=admin`
- DB/API: Supabase

고객 QR에는 기본 URL만 넣습니다. 기본 URL에서는 관리자, 감사로그, 상품설정 탭이 보이지 않습니다.

## 가장 쉬운 배포 방법

1. Vercel에 로그인합니다.
2. Add New Project를 누릅니다.
3. 이 폴더를 GitHub 저장소로 연결하거나, Vercel CLI로 배포합니다.
4. Framework Preset은 `Other` 또는 정적 사이트로 둡니다.
5. Build Command와 Output Directory는 `vercel.json` 설정을 사용합니다.
7. 배포 후 나온 Production URL을 QR 주소로 사용합니다.

## 배포 후 확인할 것

1. 고객 URL 접속 시 고객 화면만 보이는지 확인합니다.
2. 테스트 참여 등록이 Supabase에 저장되는지 확인합니다.
3. 포토리뷰 완료 체크 후 뽑기가 1회만 확정되는지 확인합니다.
4. 새로고침해도 같은 결과가 유지되는지 확인합니다.
5. `?mode=admin` URL에서 관리자 화면이 보이는지 확인합니다.

## QR 생성

Vercel Production URL이 확정되면 그 URL로 QR을 생성합니다.

예:

```text
https://facefilter-review.vercel.app/
```

정식 도메인을 연결할 경우 QR은 최종 도메인으로 다시 생성하는 것이 좋습니다.
