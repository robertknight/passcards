include common.mk

lib_srcs=$(shell find lib -name '*.ts')
cli_srcs=$(shell find cli -name '*.ts')
webui_srcs=$(shell find webui -name '*.ts')
firefox_addon_srcs=$(shell find addons/firefox/src -name '*.ts')
all_srcs=$(lib_srcs) $(cli_srcs) $(webui_srcs) $(addon_srcs)
test_files=$(shell find build -name '*_test.js')

webui_dist_dir=webui/dist
webui_script_dir=$(webui_dist_dir)/scripts
webui_css_dir=$(webui_dist_dir)/style
webui_icon_dir=$(webui_dist_dir)/icons

# marker files used to trigger npm / Git submodule
# updates prior to build
submodule_marker=build/submodule_marker
nodemodule_marker=build/nodemodule_marker
dropboxjs_lib=node_modules/dropbox/lib/dropbox.js
typedreact_lib=node_modules/typed-react/typed-react.d.ts
xpi_file=addons/firefox/passcards@robertknight.github.io.xpi

deps=$(submodule_marker) $(nodemodule_marker) $(dropboxjs_lib) $(typedreact_lib) typings/DefinitelyTyped

all: build/current webui-build

build/current: $(lib_srcs) $(cli_srcs) $(webui_srcs) $(deps)
	@$(TSC) --outDir build $(lib_srcs) $(cli_srcs) $(webui_srcs) && touch $@

webui-build: $(webui_script_dir)/platform_bundle.js \
             $(webui_script_dir)/webui_bundle.js \
             $(webui_script_dir)/page_bundle.js \
             $(webui_script_dir)/crypto_worker.js \
             $(webui_css_dir)/app.css \
             webui-icons

typings/DefinitelyTyped: tsd.json
	@echo "Installing TypeScript type definitions"
	@$(TSD) reinstall
	@touch typings/DefinitelyTyped

$(webui_script_dir)/platform_bundle.js: package.json utils/create-external-modules-bundle.js
	@echo "Building external modules bundle"
	@mkdir -p $(webui_script_dir)
	@./utils/create-external-modules-bundle.js build/webui/app.js > $@

$(webui_script_dir)/webui_bundle.js: build/current
	@echo "Building web app bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --no-builtins --no-bundle-external --entry build/webui/init.js --outfile $@

$(webui_script_dir)/page_bundle.js: build/current
	@echo "Building page autofill bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) build/webui/page.js --outfile $@

$(webui_script_dir)/crypto_worker.js: build/current
	@echo "Building crypto bundle"
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --entry build/lib/crypto_worker.js --outfile $@

build/webui/theme.css: build/current
	@echo "Generating theme CSS"
	@$(NODE_BIN_DIR)/ts-style build/webui/theme.js build/webui/controls/*.js build/webui/*_view.js > $@

$(webui_css_dir)/app.css: webui/app.css build/webui/theme.css
	@echo "Generating web app stylesheet"
	@mkdir -p $(webui_css_dir)
	@cp webui/app.css $(webui_css_dir)
	@cat build/webui/theme.css >> $@
	@$(NODE_BIN_DIR)/autoprefixer $@

controls-demo: $(webui_script_dir)/controls_bundle.js $(webui_css_dir)/controls_demo_theme.css

$(webui_script_dir)/controls_bundle.js: build/current
	@mkdir -p $(webui_script_dir)
	@$(BROWSERIFY) --no-builtins --no-bundle-external --entry build/webui/controls/demo.js --outfile $@

$(webui_css_dir)/controls_demo_theme.css: build/current
	@echo "Generating controls demo theme CSS"
	@mkdir -p $(webui_css_dir)
	@$(NODE_BIN_DIR)/ts-style build/webui/controls/demo.js > $@
	@$(NODE_BIN_DIR)/autoprefixer $@

webui-icons:
	@mkdir -p ${webui_icon_dir}
	@cp icons/* ${webui_icon_dir}

# pbkdf2_bundle.js is a require()-able bundle
# of the PBKDF2 implementation for use in Web Workers
# in the browser
build/lib/crypto/pbkdf2_bundle.js: build/current
	$(BROWSERIFY) --require ./build/lib/crypto/pbkdf2.js:pbkdf2 --outfile $@

test: cli webui build/lib/crypto/pbkdf2_bundle.js
	@echo $(test_files) | $(FOREACH_FILE) $(NODE)

lint_files=$(addprefix build/,$(subst .ts,.ts.lint, $(all_srcs)))
lint: $(lint_files)

build/%.ts.lint: %.ts
	$(TSLINT) -f $< || true
	@mkdir -p $(dir $@)
	@touch $@

$(submodule_marker): .gitmodules
	git submodule update --init
	@mkdir -p build && touch $(submodule_marker)

$(nodemodule_marker): package.json
	@mkdir -p build && touch $(nodemodule_marker)
	@echo "Installing npm dependencies..."
	@# --ignore-scripts is used to prevent running of the 'prepublish'
	@# script here, since that runs 'make all' and is intended to
	@# be used before actually publishing the app
	@npm install --ignore-scripts
	
node_modules/dropbox/lib/dropbox.js: node_modules/dropbox/package.json
	@# Build dropbox-js. As long as we are using a fork of dropbox-js,
	@# we'll need to run this to build Dropbox before using it
	@echo "Building dropbox-js..."
	@(cd ./node_modules/dropbox && npm install --quiet . $(SILENCE_STDOUT))

node_modules/typed-react/typed-react.d.ts: node_modules/typed-react/package.json
	@echo "Building typed-react..."
	@# copy the access token used by TSD to avoid hitting GitHub's request
	@# rate limit
	@cp .tsdrc ./node_modules/typed-react
	@(cd ./node_modules/typed-react && npm install --quiet . $(SILENCE_STDOUT) && npm run typings && npm run bundle)

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
	@cd addons/firefox && make clean
	@cd addons/chrome && make clean

firefox-addon: webui-build
	cd addons/firefox && make

chrome-extension: webui-build
	cd addons/chrome && make

publish-chrome-extension: chrome-extension
	./utils/publish-chrome-extension.js pkg/passcards.zip

update-manifest-versions:
	$(UPDATE_MANIFEST) package.json
	$(UPDATE_MANIFEST) addons/chrome/manifest.json
	$(UPDATE_MANIFEST) addons/firefox/package.json
