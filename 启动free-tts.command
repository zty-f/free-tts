#!/bin/sh
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
exec /bin/sh "$ROOT/start.sh"
