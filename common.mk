BROWSERIFY=browserify
FOREACH_FILE=tr ' ' '\n' | xargs -n 1
JPM=jpm
NODE=node
ROOT_DIR=$(dir $(abspath package.json))
SILENCE_CMD=1>/dev/null 2>/dev/null
SILENCE_STDOUT=1>/dev/null
TMP_DIR_CMD=mktemp -d /tmp/onepass.XXXXX
TSC=tsc -m commonjs --noImplicitAny --sourcemap
TSLINT=tslint

# CFX tool for building and testing Firefox addons
CFX=cfx
