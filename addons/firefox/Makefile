include ../../common.mk

S3_PACKAGE_URL=https://s3.amazonaws.com/io.github.robertknight/passcards/builds/latest

XPI_PACKAGE_NAME=passcards@robertknight.github.io.xpi
XPI_PACKAGE=$(PKG_DIR)/$(XPI_PACKAGE_NAME)
XPI_UPDATE_LINK=$(S3_PACKAGE_URL)/$(XPI_PACKAGE_NAME)
XPI_UPDATE_RDF_URL=$(S3_PACKAGE_URL)/passcards.update.rdf

webui_build_dir=$(PWD)/../../webui/dist
webui_app_srcs=$(shell find $(webui_build_dir))
script_build_dir=$(webui_build_dir)/scripts

all: $(XPI_PACKAGE)

$(XPI_PACKAGE): build/xpi_content
	mkdir -p $(PKG_DIR)
	$(CFX) xpi --update-link=$(XPI_UPDATE_LINK) --update-url=$(XPI_UPDATE_RDF_URL) --output-file=$@
	mv passcards.update.rdf $(PKG_DIR)

run: build/xpi_content
	(export PASSCARDS_ENV='development' && $(CFX) run)

build/xpi_content: lib/main.js \
				   data/dist \
				   data/scripts/panel_content.js \
                   data/index.html
	@mkdir -p $@
	@touch $@

lib/main.js: src/main.ts
	$(TSC) src/main.ts --outDir build/
	mkdir -p lib
	# Re-write 'rpc' require() to avoid error with 'cfx'
	# when trying to require() a dependency outside of the current
	# dir tree
	cp build/lib/net/rpc.js lib/
	cp build/addons/firefox/src/main.js $@
	sed -i='' 's/..\/..\/..\/lib\/net\/rpc/.\/rpc/' $@

data/dist: $(webui_app_srcs)
	mkdir -p data
	rm -rf $@
	cp -R $(webui_build_dir) $@

data/scripts:
	mkdir -p $@

data/index.html: ../../webui/index.html
	mkdir -p data
	cp ../../webui/index.html $@

data/scripts/panel_content.js: data/scripts src/panel_content.ts
	$(TSC) --outDir build/ src/panel_content.ts 
	$(BROWSERIFY) --no-builtins build/addons/firefox/src/panel_content.js > $@

clean:
	rm -rf build data lib

