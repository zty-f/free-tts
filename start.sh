#!/bin/sh
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
cd "$ROOT" || exit 1
PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/node@22/bin"
export PATH
if ! command -v node >/dev/null 2>&1; then
  echo "free-tts: 请先安装 Node.js 24 LTS：https://nodejs.org/zh-cn/download"
  printf '按回车关闭…'; read -r reply
  exit 1
fi
node scripts/start.mjs --open
code=$?
if [ "$code" -ne 0 ]; then printf '启动失败，按回车关闭…'; read -r reply; fi
exit "$code"
