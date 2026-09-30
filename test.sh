#!/usr/bin/env bash
# 忘忧小卖部 · 跑一遍冒烟测试
#
#   ./test.sh            跑测试
#   ./test.sh -v         连跳过的也一起看
#
# 只需要 Python 3。不需要装任何东西。
set -e
cd "$(dirname "$0")"

PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done

if [ -z "$PY" ]; then
  echo "没找到 Python。装一个（macOS: brew install python3 / Debian: sudo apt install python3）就能跑测试。"
  exit 1
fi

exec "$PY" test.py "$@"
