include ../../common.mk

S3_PACKAGE_URL=https://s3.amazonaws.com/io.github.robertknight/passcards/builds/latest

XPI_PACKAGE_NAME=passcards@robertknight.github.io.xpi
XPI_PACKAGE=$(PKG_DIR)/$(XPI_PACKAGE_NAME)
XPI_UPDATE_LINK=$(S3_PACKAGE_URL)/$(XPI_PACKAGE_NAME)
XPI_UPDATE_RDF_URL=$(S3_PACKAGE_URL)/passcards.update.rdf

all: $(XPI_PACKAGE)

$(XPI_PACKAGE): build/xpi_content
	mkdir -p $(PKG_DIR)
	$(CFX) xpi --update-link=$(XPI_UPDATE_LINK) --update-url=$(XPI_UPDATE_RDF_URL) --output-file=$(XPI_PACKAGE)
	mv passcards.update.rdf $(PKG_DIR)

run: build/xpi_content
	$(CFX) run

build/xpi_content: lib/main.js data/index.html data/scripts/webui_bundle.js data/scripts/crypto_worker.js data/style/app.css data/panel.html data/scripts/panel_content.js data/scripts/page.js icons
	@mkdir -p build/xpi_content
	@touch build/xpi_content

lib/main.js: src/main.ts
	$(TSC) src/main.ts --outDir build/
	mkdir -p lib
	# Re-write 'rpc' require() to avoid error with 'cfx'
	# when trying to require() a dependency outside of the current
	# dir tree
	cp build/lib/net/rpc.js lib/
	cp build/addons/firefox/src/main.js lib/
	sed -i='' 's/..\/..\/..\/lib\/net\/rpc/.\/rpc/' lib/main.js

icons:
	mkdir -p data/icons
	cp ../../icons/*.png data/icons

data/scripts:
	mkdir -p data/scripts

data/style:
	mkdir -p data/style

data/index.html: ../../webui/index.html
	cp ../../webui/index.html data/

data/scripts/crypto_worker.js: data/scripts ../../webui/scripts/crypto_worker.js
	cp ../../webui/scripts/crypto_worker.js data/scripts/

data/scripts/webui_bundle.js: data/scripts ../../webui/scripts/webui_bundle.js
	cp ../../webui/scripts/webui_bundle.js data/scripts/

data/scripts/panel_content.js: data/scripts src/panel_content.ts
	$(TSC) --outDir build/ src/panel_content.ts 
	$(BROWSERIFY) --no-builtins build/addons/firefox/src/panel_content.js > data/scripts/panel_content.js

data/scripts/page.js: data/scripts ../../webui/scripts/page_bundle.js
	cp ../../webui/scripts/page_bundle.js data/scripts/

data/style/app.css: data/style ../../webui/style/app.css
	cp ../../webui/style/app.css data/style/

data/panel.html: src/panel.html
	cp src/panel.html data/

clean:
	rm -rf build/* data/* lib/*

