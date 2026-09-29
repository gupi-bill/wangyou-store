#!/usr/bin/env bash
# 实在存不了数据的时候，用这个。
# 会在本目录起一个本地服务器，然后用浏览器打开。
set -e
PORT="${1:-8123}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "忘忧小卖部  →  http://localhost:$PORT"
echo "关掉这个窗口就等于关门。Ctrl+C 即可。"
echo

if command -v python3 >/dev/null 2>&1; then
  (sleep 1
   if command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true
   elif command -v open      >/dev/null 2>&1; then open      "http://localhost:$PORT" >/dev/null 2>&1 || true
   fi) &
  exec python3 -m http.server "$PORT" --directory "$DIR"
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "$PORT" "$DIR"
else
  echo "找不到 python3 也没有 npx。那就直接双击 index.html 吧，它也能开门。"
  exit 1
fi
