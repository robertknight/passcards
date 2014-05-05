TSC=tsc --noImplicitAny --sourcemap
TSC_NODE=$(TSC) -m commonjs
TSLINT=tslint
NODE=node
FOREACH_FILE=tr ' ' '\n' | xargs -l1
ROOT_DIR=$(dir $(abspath package.json))
SILENCE_CMD=1>/dev/null 2>/dev/null
SILENCE_STDOUT=1>/dev/null

lib_srcs=$(shell find lib/ -name '*.ts')
app_srcs=$(wildcard *.ts)
all_srcs=$(lib_srcs) $(app_srcs)
test_files=$(shell find build/ -name '*_test.js')

all: build/cli.js

build/cli.js: $(all_srcs)
	@$(TSC_NODE) --outDir build $(all_srcs)

test: build/cli.js
	@echo $(test_files) | $(FOREACH_FILE) $(NODE)

LINT_FILES=$(addprefix build/,$(subst .ts,.ts.lint, $(all_srcs)))
lint: $(LINT_FILES)

build/%.ts.lint: %.ts
	$(TSLINT) -f $<
	@touch $@

test-package: all
	@cd `mktemp -d` \
	&& npm install --quiet $(ROOT_DIR) $(SILENCE_STDOUT) \
	&& ./node_modules/onepass-cli/1pass --help $(SILENCE_STDOUT)
	
clean:
	rm -rf build/*
