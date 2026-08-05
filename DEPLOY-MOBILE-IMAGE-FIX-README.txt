픽견적 노출용 모바일 이미지 업로드 수정본

적용 내용
- Android WebView에서 JPG/PNG/WebP만 선택 및 등록
- HEIC/HEIF 또는 변환 실패 이미지는 견적 등록 전 차단
- 실제 파일 시그니처 검사 후 R2 저장
- R2 object_key를 우선 사용해 이미지 URL 복구
- 이미지 응답 Content-Type 자동 보정
- 72시간, 판매자 정보 마스킹, 방문/접속 기록, 언론보도 등 기존 기능 유지

배포 대상
- ga-pick.com 노출용 Cloudflare 프로젝트
