all: lib/main.js data/index.html data/scripts/webui_bundle.js data/scripts/crypto_worker.js data/style/app.css data/panel.html data/scripts/panel_content.js

lib/main.js: src/main.ts
	tsc src/main.ts --outDir lib

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
	tsc -m commonjs --outDir build/ src/panel_content.ts 
	browserify --no-builtins build/addons/firefox/src/panel_content.js > data/scripts/panel_content.js

data/style/app.css: data/style ../../webui/style/app.css
	cp ../../webui/style/app.css data/style/

data/panel.html: src/panel.html
	cp src/panel.html data/

clean:
	rm -rf data/*
	rm -rf lib/*
