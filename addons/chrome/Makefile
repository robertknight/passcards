include ../../common.mk

ZIP_PACKAGE=$(PKG_DIR)/passcards.zip

all: $(ZIP_PACKAGE)

zip: $(ZIP_PACKAGE)

$(ZIP_PACKAGE): data/dist scripts
	@rm -f $(ZIP_PACKAGE)
	@zip --quiet --exclude '.*' -r $(ZIP_PACKAGE) .

webui_build_dir=$(PWD)/../../webui/dist
webui_app_srcs=$(shell find $(webui_build_dir))

data/dist: $(webui_app_srcs)
	mkdir -p data
	rm -rf $@
	cp -R $(webui_build_dir) $@

scripts: src/*.js
	@mkdir -p data/scripts
	@cp src/*.js data/scripts
	@cp $(NODE_MODULE_DIR)/dropbox/lib/dropbox.js data/scripts

clean:
	@rm -rf data/dist
	@rm -rf data/scripts
