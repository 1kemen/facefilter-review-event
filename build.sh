#!/bin/sh
# FACE FILTER 리뷰이벤트 빌드 스크립트
# 필수 파일은 public/으로 복사, 선택 파일(이미지/보조 스크립트)은 없어도 빌드 안 죽게 처리
set -e
mkdir -p public/supabase
cp index.html styles.css app.js supabase-config.js public/
cp supabase/supabase-client.js public/supabase/
# 선택 파일 (없어도 빌드 계속)
for f in pepili.png pepili-smile.png ff-enhance.js; do
  [ -f "$f" ] && cp "$f" public/ || true
done
echo "build complete"
