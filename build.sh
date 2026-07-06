#!/bin/sh
# FACE FILTER review event build script.
# Copy required static files into public/ for Vercel. Optional assets may be absent.
set -e
mkdir -p public/supabase
cp index.html styles.css app.js supabase-config.js public/
cp supabase/supabase-client.js public/supabase/
for f in pepili.png pepili-smile.png ff-enhance.js; do
  [ -f "$f" ] && cp "$f" public/ || true
done
echo "build complete"
