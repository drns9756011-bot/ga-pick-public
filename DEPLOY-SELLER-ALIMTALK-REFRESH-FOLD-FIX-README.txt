픽견적 노출용 배포본
작성일: 2026-08-05

[판매자 신규 견적 알림톡]
템플릿 ID: KA01TP260805074550965Bb2zfMAs16w
대상: 승인 판매자 중 유효한 휴대전화 번호가 있는 계정
발송 시점: 신규·재등록 구분 없이 고객 견적 저장 완료 직후
변수:
- #{견적번호}
- #{구매목적}
- #{브랜드}
동일 번호의 승인 계정이 여러 개면 한 번만 발송합니다.

[새로고침·Android Fold 이전 화면 문제]
원인:
- /quote, /my-quote, /seller, /seller/register 경로마다 과거 index.html 복사본이 남아 있었습니다.
- 브라우저 새로고침이나 폴드 펼침으로 WebView가 재생성되면 현재 URL의 과거 HTML이 직접 열릴 수 있었습니다.

수정:
- 모든 앱 경로를 최신 루트 index.html 하나로 통일했습니다.
- 하위 경로 index.html도 최신 파일과 동일하게 동기화했습니다.
- Worker 라우팅, Pages fallback, HTML no-store를 함께 적용했습니다.
- 현재 URL에 맞는 화면을 다시 복원합니다.

배포 위치:
ga-pick.com 노출용 Cloudflare 프로젝트
