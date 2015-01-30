include ../../common.mk

ZIP_PACKAGE=$(PKG_DIR)/passcards.zip

all: $(ZIP_PACKAGE)

zip: $(ZIP_PACKAGE)

$(ZIP_PACKAGE): data/dist scripts
	@rm -f $(ZIP_PACKAGE)
	@zip --quiet --exclude '.*' -r $(ZIP_PACKAGE) .

webui_build_dir=$(PWD)/../../webui/dist

data/dist: $(webui_build_dir)
	ln -s -f $(webui_build_dir) $@

scripts: $(webui_build_dir)/scripts/*.js src/*.js
	@mkdir -p data/scripts
	@cp src/*.js data/scripts
	@cp $(NODE_MODULE_DIR)/dropbox/lib/dropbox.js data/scripts

clean:
	@rm -rf data/dist
	@rm -rf data/scripts
