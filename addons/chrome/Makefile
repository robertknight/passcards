include ../../common.mk

ADDON_BUILD_DIR=../../build/addons
CHROME_ZIP_PACKAGE=$(PKG_DIR)/passcards.zip

all: $(CHROME_ZIP_PACKAGE) build-firefox-extension

$(CHROME_ZIP_PACKAGE): build-chrome-extension
	@mkdir -p $(PKG_DIR)
	@rm -f $(CHROME_ZIP_PACKAGE)
	@cd $(ADDON_BUILD_DIR)/chrome && zip --quiet -r $(CHROME_ZIP_PACKAGE) .

webui_src_dir=$(PWD)/../../webui
webui_build_dir=$(webui_src_dir)/dist
webui_app_srcs=$(shell find $(webui_build_dir))

.PHONY: build-shared
build-shared:
	@mkdir -p $(ADDON_BUILD_DIR)/shared/data

	@cp $(webui_src_dir)/auth.html $(ADDON_BUILD_DIR)/shared/data/auth.html
	@cp -R $(webui_build_dir) $(ADDON_BUILD_DIR)/shared/data
	@mkdir -p $(ADDON_BUILD_DIR)/shared/data/scripts
	@cp src/*.js $(ADDON_BUILD_DIR)/shared/data/scripts
	@cp data/*.html $(ADDON_BUILD_DIR)/shared/data 

.PHONY: build-chrome-extension
build-chrome-extension: build-shared
	@echo "Building Chrome extension"
	
	@rm -rf $(ADDON_BUILD_DIR)/chrome
	@cp -R $(ADDON_BUILD_DIR)/shared $(ADDON_BUILD_DIR)/chrome
	@./utils/generate-manifest.js chrome manifest.json.mustache $(ADDON_BUILD_DIR)/chrome/manifest.json

.PHONY: build-firefox-extension
build-firefox-extension: build-shared
	@echo "Building Firefox extension"

	@rm -rf $(ADDON_BUILD_DIR)/firefox
	@cp -R $(ADDON_BUILD_DIR)/shared $(ADDON_BUILD_DIR)/firefox
	@./utils/generate-manifest.js firefox manifest.json.mustache $(ADDON_BUILD_DIR)/firefox/manifest.json

clean:
	@rm -rf $(ADDON_BUILD_DIR)/*
