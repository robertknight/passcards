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

webext_common_args=-s build/extensions/firefox -a pkg

deps=$(nodemodule_marker)

all: $(compiled_js_files) webui-build

$(compiled_js_files): $(all_srcs) $(deps)
	@$(TSC)

webui-build: $(webui_script_dir)/platform_bundle.js \
             $(webui_script_dir)/webui_bundle.js \
             $(webui_script_dir)/page_bundle.js \
             $(webui_script_dir)/auth_receiver.js \
             $(webui_css_dir)/app.css \
             webui-icons

$(webui_script_dir)/platform_bundle.js: package.json utils/create-external-modules-bundle.js
	@echo "Building external modules bundle"
	@mkdir -p $(webui_script_dir)
	@./utils/create-external-modules-bundle.js build/webui/app.js | ./utils/minify > $@

$(webui_script_dir)/webui_bundle.js: $(compiled_js_files)
	@echo "Building web app bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) -t envify --debug --no-builtins --no-bundle-external \
		--entry build/webui/init.js | ./utils/minify > $@

$(webui_script_dir)/auth_receiver.js: $(compiled_js_files)
	cp build/webui/auth_receiver.js $@

$(webui_script_dir)/page_bundle.js: $(compiled_js_files)
	@echo "Building page autofill bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) build/webui/page.js --outfile $@

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

test: cli webui
	@$(NODE) ./utils/run-tests.js

.PHONY: lint
lint:
	@$(NODE_BIN_DIR)/tslint --project tsconfig.json

$(nodemodule_marker): package.json
	@$(NODE_BIN_DIR)/check-dependencies
	@mkdir -p build && touch $(nodemodule_marker)

test-package: all
	cd `$(TMP_DIR_CMD)` \
	&& npm install $(ROOT_DIR) \
	&& ./node_modules/passcards/passcards --help $(SILENCE_STDOUT) \
	&& echo npm package OK

format: $(all_srcs)
	./utils/format.sh

clean:
	@rm -rf build/*
	@rm -rf webui/scripts/*
	@cd extensions/chrome && make clean

chrome-extension: webui-build
	cd extensions/chrome && make

firefox-extension: chrome-extension
	@$(NODE_BIN_DIR)/web-ext build $(webext_common_args)

test-firefox-extension: chrome-extension
	@$(NODE_BIN_DIR)/web-ext run $(webext_common_args)

sign-firefox-extension: chrome-extension
	@$(NODE_BIN_DIR)/web-ext sign $(webext_common_args) \
		--api-key $(FIREFOX_AMO_KEY) --api-secret $(FIREFOX_AMO_SECRET)
	@./extensions/chrome/utils/generate-webext-update-manifest.js pkg/ pkg/passcards.update.json
	# Copy extension to a fixed, version-independent path.  Note that this needs
	# to be done _after_ the update manifest is generated.
	cp pkg/*.xpi pkg/passcards@robertknight.github.io.xpi

publish-chrome-extension: chrome-extension
	@$(NODE_BIN_DIR)/webstore upload --source pkg/passcards.zip --auto-publish \
		--extension-id $(CHROME_EXT_APP_ID) \
		--client-id $(CHROME_EXT_CLIENT_ID) \
		--client-secret $(CHROME_EXT_CLIENT_SECRET) \
		--refresh-token $(CHROME_EXT_REFRESH_TOKEN)

publish-passcards-cli: webui-build
	echo '//registry.npmjs.org/:_authToken=$${NPM_AUTH_TOKEN}' > .npmrc
	npm publish

update-package-version:
	./utils/update-package-version.js
