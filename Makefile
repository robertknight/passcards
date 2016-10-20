include common.mk

all_srcs:=$(shell ./utils/tsproject.js inputs)
compiled_js_files:=$(shell ./utils/tsproject.js outputs)
test_files:=$(shell find build -name '*_test.js')

webui_dist_dir=webui/dist
webui_script_dir=$(webui_dist_dir)/scripts
webui_css_dir=$(webui_dist_dir)/style
webui_icon_dir=$(webui_dist_dir)/icons

# marker files used to trigger npm updates prior to build
nodemodule_marker=build/nodemodule_marker

firefox_extension_id=passcards@robertknight.github.io
webext_common_args=-s addons/chrome -a pkg

deps=$(nodemodule_marker)

all: $(compiled_js_files) webui-build

$(compiled_js_files): $(all_srcs) $(deps)
	@$(TSC)

webui-build: $(webui_script_dir)/platform_bundle.js \
             $(webui_script_dir)/webui_bundle.js \
             $(webui_script_dir)/page_bundle.js \
             $(webui_script_dir)/crypto_worker.js \
             $(webui_script_dir)/auth_receiver.js \
             $(webui_css_dir)/app.css \
             webui-icons

$(webui_script_dir)/platform_bundle.js: package.json utils/create-external-modules-bundle.js
	@echo "Building external modules bundle"
	@mkdir -p $(webui_script_dir)
	@./utils/create-external-modules-bundle.js build/webui/app.js > $@

$(webui_script_dir)/webui_bundle.js: $(compiled_js_files)
	@echo "Building web app bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --no-builtins --no-bundle-external --entry build/webui/init.js --outfile $@

$(webui_script_dir)/auth_receiver.js: $(compiled_js_files)
	cp build/webui/auth_receiver.js $@

$(webui_script_dir)/page_bundle.js: $(compiled_js_files)
	@echo "Building page autofill bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) build/webui/page.js --outfile $@

$(webui_script_dir)/crypto_worker.js: $(compiled_js_files)
	@echo "Building crypto bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --entry build/lib/crypto_worker.js --outfile $@

build/webui/theme.css: $(compiled_js_files)
	@echo "Generating theme CSS"
	@$(NODE_BIN_DIR)/ts-style build/webui/theme.js build/webui/controls/*.js build/webui/*_view.js > $@

$(webui_css_dir)/app.css: webui/app.css build/webui/theme.css
	@echo "Generating web app stylesheet"
	@mkdir -p $(webui_css_dir)
	@cp webui/app.css $(webui_css_dir)
	@cat build/webui/theme.css >> $@
	@$(NODE_BIN_DIR)/autoprefixer $@

controls-demo: $(webui_script_dir)/controls_bundle.js $(webui_css_dir)/controls_demo_theme.css

$(webui_script_dir)/controls_bundle.js: $(compiled_js_files)
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --no-builtins --no-bundle-external --entry build/webui/controls/demo.js --outfile $@

$(webui_css_dir)/controls_demo_theme.css: $(compiled_js_files)
	@echo "Generating controls demo theme CSS"
	@mkdir -p $(webui_css_dir)
	@$(NODE_BIN_DIR)/ts-style build/webui/controls/demo.js > $@
	@$(NODE_BIN_DIR)/autoprefixer $@

webui-icons:
	@mkdir -p ${webui_icon_dir}
	@cp -R icons/* ${webui_icon_dir}

# pbkdf2_bundle.js is a require()-able bundle
# of the PBKDF2 implementation for use in Web Workers
# in the browser
build/lib/crypto/pbkdf2_bundle.js: $(compiled_js_files)
	$(BROWSERIFY) --require ./build/lib/crypto/pbkdf2.js:pbkdf2 --outfile $@

test: cli webui build/lib/crypto/pbkdf2_bundle.js
	@$(NODE) ./utils/run-tests.js

lint_files=$(addprefix build/,$(subst .ts,.ts.lint, $(all_srcs)))
lint: $(lint_files)

$(lint_files): build/lint_marker

build/lint_marker: $(all_srcs)
	$(TSLINT) $?
	@mkdir -p $(dir $@)
	@touch $@

$(nodemodule_marker): package.json
	@$(NODE_BIN_DIR)/check-dependencies
	@mkdir -p build && touch $(nodemodule_marker)

test-package: all
	cd `$(TMP_DIR_CMD)` \
	&& npm install $(ROOT_DIR) \
	&& ./node_modules/passcards/passcards --help $(SILENCE_STDOUT) \
	&& echo npm package OK
	
format: $(all_srcs)
	./utils/format-source.js

clean:
	@rm -rf build/*
	@rm -rf webui/scripts/*
	@cd addons/chrome && make clean

chrome-extension: webui-build
	cd addons/chrome && make

firefox-extension: chrome-extension
	@$(NODE_BIN_DIR)/web-ext build $(webext_common_args)

test-firefox-extension: chrome-extension
	@$(NODE_BIN_DIR)/web-ext run $(webext_common_args)

sign-firefox-extension: chrome-extension
	@./utils/web-ext.js sign $(webext_common_args) \
		--id $(firefox_extension_id) \
		--api-key $(FIREFOX_AMO_KEY) --api-secret $(FIREFOX_AMO_SECRET)

publish-chrome-extension: chrome-extension
	./utils/publish-chrome-extension.js pkg/passcards.zip

publish-passcards-cli: webui-build
	echo '//registry.npmjs.org/:_authToken=$${NPM_AUTH_TOKEN}' > .npmrc
	npm -dd publish

update-manifest-versions:
	$(UPDATE_MANIFEST) package.json
	$(UPDATE_MANIFEST) addons/chrome/manifest.json
