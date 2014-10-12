include ../../common.mk

ZIP_PACKAGE=$(PKG_DIR)/passcards.zip

all: $(ZIP_PACKAGE)

zip: $(ZIP_PACKAGE)

$(ZIP_PACKAGE): scripts style icons
	@rm -f $(ZIP_PACKAGE)
	@zip --quiet --exclude '.*' -r $(ZIP_PACKAGE) .

scripts: ../../webui/scripts/*.js src/*.js
	@mkdir -p data/scripts
	@cp src/*.js data/scripts
	@cp ../../webui/scripts/*.js data/scripts
	@cp $(NODE_MODULE_DIR)/dropbox/lib/dropbox.js data/scripts

style: ../../webui/style/*.css
	@mkdir -p data/style
	@cp ../../webui/style/*.css data/style

icons: ../../icons/*
	@mkdir -p data/icons
	@cp ../../icons/* data/icons

clean:
	@rm -rf data/icons
	@rm -rf data/scripts
	@rm -rf data/style
