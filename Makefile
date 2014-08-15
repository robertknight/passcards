include common.mk

lib_srcs=$(shell find lib/ -name '*.ts')
cli_srcs=$(shell find cli/ -name '*.ts')
webui_srcs=$(shell find webui/ -name '*.ts')
firefox_addon_srcs=$(shell find addons/firefox/src -name '*.ts')
all_srcs=$(lib_srcs) $(cli_srcs) $(webui_srcs) $(addon_srcs)
test_files=$(shell find build/ -name '*_test.js')
webui_script_dir=webui/scripts
webui_css_dir=webui/style

# marker files used to trigger npm / Git submodule
# updates prior to build
submodule_marker=build/submodule_marker
nodemodule_marker=build/nodemodule_marker
dropboxjs_lib=node_modules/dropbox/lib/dropbox.js
xpi_file=addons/firefox/passcards@robertknight.github.io.xpi

deps=$(submodule_marker) $(nodemodule_marker) $(dropboxjs_lib)

all: build/current webui-build

build/current: $(lib_srcs) $(cli_srcs) $(webui_srcs) $(deps)
	@$(TSC) --outDir build $(lib_srcs) $(cli_srcs) $(webui_srcs) && touch build/current

webui-build: $(webui_script_dir)/webui_bundle.js $(webui_script_dir)/crypto_worker.js $(webui_css_dir)/app.css

$(webui_script_dir)/webui_bundle.js: build/current
	mkdir -p $(webui_script_dir)
	browserify --entry build/webui/init.js --outfile $(webui_script_dir)/webui_bundle.js

$(webui_script_dir)/crypto_worker.js: build/current
	mkdir -p $(webui_script_dir)
	browserify --entry build/lib/crypto_worker.js --outfile $(webui_script_dir)/crypto_worker.js

$(webui_css_dir)/app.css: webui/app.less
	mkdir -p $(webui_css_dir)
	lessc webui/app.less > $(webui_css_dir)/app.css

# pbkdf2_bundle.js is a require()-able bundle
# of the PBKDF2 implementation for use in Web Workers
# in the browser
build/lib/crypto/pbkdf2_bundle.js: build/current
	browserify --require ./build/lib/crypto/pbkdf2.js:pbkdf2 --outfile build/lib/crypto/pbkdf2_bundle.js

test: cli webui build/lib/crypto/pbkdf2_bundle.js
	@echo $(test_files) | $(FOREACH_FILE) $(NODE)

lint_files=$(addprefix build/,$(subst .ts,.ts.lint, $(all_srcs)))
lint: $(lint_files)

build/%.ts.lint: %.ts
	$(TSLINT) -f $<
	@mkdir -p $(dir $@)
	@touch $@

$(submodule_marker): .gitmodules
	git submodule update --init
	@mkdir -p build && touch $(submodule_marker)

$(nodemodule_marker): package.json
	@mkdir -p build && touch $(nodemodule_marker)
	@echo "Installing package dependencies..."
	# --ignore-scripts is used to prevent running of the 'prepublish'
	# script here, since that runs 'make all' and is intended to
	# be used before actually publishing the app
	@npm install --ignore-scripts
	
node_modules/dropbox/lib/dropbox.js: node_modules/dropbox/package.json
	# Build dropbox-js. As long as we are using a fork of dropbox-js,
	# we'll need to run this to build Dropbox before using it
	@echo "Building dropbox-js..."
	@(cd ./node_modules/dropbox && npm install --quiet . $(SILENCE_STDOUT))

test-package: all
	@cd `$(TMP_DIR_CMD)` \
	&& npm install --quiet $(ROOT_DIR) $(SILENCE_STDOUT) \
	&& ./node_modules/passcards/passcards --help $(SILENCE_STDOUT) \
	&& echo npm package OK
	
clean:
	rm -rf build/*
	rm -rf webui/scripts/*

PUBLISH_TMP_DIR=/tmp/publish
GIT_HEAD=$(shell git log --oneline -n1)

publish-app: webui-build
	rm -rf $(PUBLISH_TMP_DIR)
	git clone --no-checkout http://github.com/robertknight/passcards $(PUBLISH_TMP_DIR)
	cd $(PUBLISH_TMP_DIR) && git checkout gh-pages && git rm -rf app
	cd $(PUBLISH_TMP_DIR) && mkdir -p app/scripts && mkdir -p app/style
	cp webui/*.html $(PUBLISH_TMP_DIR)/app/
	cp webui/scripts/*.js $(PUBLISH_TMP_DIR)/app/scripts/
	cp webui/style/*.css $(PUBLISH_TMP_DIR)/app/style/
	cd $(PUBLISH_TMP_DIR) && git add . && git commit -m "Update build to '$(GIT_HEAD)'"
	cd $(PUBLISH_TMP_DIR) && git push

publish-app-s3: webui-build
	 s3cmd --acl-public -c $(S3_CONFIG_FILE) sync webui/ s3://$(S3_PATH)

xpi: webui-build
	cd addons/firefox && make
