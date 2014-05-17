TMP_DIR_CMD=mktemp -d /tmp/onepass.XXXXX
TSC=tsc --noImplicitAny --sourcemap
TSC_NODE=$(TSC) -m commonjs
TSLINT=tslint
NODE=node
FOREACH_FILE=tr ' ' '\n' | xargs -n 1
ROOT_DIR=$(dir $(abspath package.json))
SILENCE_CMD=1>/dev/null 2>/dev/null
SILENCE_STDOUT=1>/dev/null

lib_srcs=$(shell find lib/ -name '*.ts')
cli_srcs=$(shell find cli/ -name '*.ts')
webui_srcs=$(shell find webui/ -name '*.ts')
all_srcs=$(lib_srcs) $(cli_srcs) $(webui_srcs)
test_files=$(shell find build/ -name '*_test.js')

# marker files used to trigger npm / Git submodule
# updates prior to build
submodule_marker=build/submodule_marker
nodemodule_marker=build/nodemodule_marker
deps=$(submodule_marker) $(nodemodule_marker)

all: build/current webui-build

build/current: $(lib_srcs) $(cli_srcs) $(webui_srcs) $(deps)
	@$(TSC_NODE) --outDir build $(lib_srcs) $(cli_srcs) $(webui_srcs)
	@touch build/current

webui-build: build/webui_bundle.js

build/webui_bundle.js: build/current
	browserify --entry build/webui/init.js --outfile build/webui_bundle.js

test: cli webui
	@echo $(test_files) | $(FOREACH_FILE) $(NODE)

lint_files=$(addprefix build/,$(subst .ts,.ts.lint, $(all_srcs)))
lint: $(lint_files)

build/%.ts.lint: %.ts
	$(TSLINT) -f $<
	@touch $@

$(submodule_marker): .gitmodules
	git submodule update --init
	@mkdir -p build && touch $(submodule_marker)

$(nodemodule_marker): package.json
	@mkdir -p build && touch $(nodemodule_marker)
	npm install .

test-package: all
	@cd `$(TMP_DIR_CMD)` \
	&& npm install --quiet $(ROOT_DIR) $(SILENCE_STDOUT) \
	&& ./node_modules/onepass-cli/1pass --help $(SILENCE_STDOUT) \
	&& echo npm package OK
	
clean:
	rm -rf build/*

PUBLISH_TMP_DIR=/tmp/publish
GIT_HEAD=$(shell git log --oneline -n1)

publish-app: webui-build
	rm -rf $(PUBLISH_TMP_DIR)
	git clone --no-checkout http://github.com/robertknight/1pass-web $(PUBLISH_TMP_DIR)
	cd $(PUBLISH_TMP_DIR) && git checkout gh-pages && git rm -rf app
	cd $(PUBLISH_TMP_DIR) && mkdir -p app/scripts
	cp build/webui_bundle.js $(PUBLISH_TMP_DIR)/app/scripts
	cp webui/*.html webui/*.css $(PUBLISH_TMP_DIR)/app/
	sed -e 's/\.\.\/build/scripts/' -i'' $(PUBLISH_TMP_DIR)/app/index.html
	cd $(PUBLISH_TMP_DIR) && git add . && git commit -m "Update build to '$(GIT_HEAD)'"
	cd $(PUBLISH_TMP_DIR) && git push
