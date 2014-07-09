TSC=tsc -m commonjs --noImplicitAny

all: lib/main.js data/index.html data/scripts/webui_bundle.js data/scripts/crypto_worker.js data/style/app.css data/panel.html data/scripts/panel_content.js data/scripts/page.js data/icon-32.png data/icon-64.png

lib/main.js: src/main.ts
	$(TSC) src/main.ts --outDir lib/

data/scripts:
	mkdir -p data/scripts

data/style:
	mkdir -p data/style

data/icon-32.png: ../../icons/icon-32.png
	cp ../../icons/icon-32.png data/

data/icon-64.png: ../../icons/icon-64.png
	cp ../../icons/icon-64.png data/

data/index.html: ../../webui/index.html
	cp ../../webui/index.html data/

data/scripts/crypto_worker.js: data/scripts ../../webui/scripts/crypto_worker.js
	cp ../../webui/scripts/crypto_worker.js data/scripts/

data/scripts/webui_bundle.js: data/scripts ../../webui/scripts/webui_bundle.js
	cp ../../webui/scripts/webui_bundle.js data/scripts/

data/scripts/panel_content.js: data/scripts src/panel_content.ts
	$(TSC) --outDir build/ src/panel_content.ts 
	browserify --no-builtins build/addons/firefox/src/panel_content.js > data/scripts/panel_content.js

data/scripts/page.js: data/scripts src/page.ts
	$(TSC) --outDir build/ src/page.ts
	browserify --no-builtins build/addons/firefox/src/page.js > data/scripts/page.js

data/style/app.css: data/style ../../webui/style/app.css
	cp ../../webui/style/app.css data/style/

data/panel.html: src/panel.html
	cp src/panel.html data/

clean:
	rm -rf data/*
	rm -rf lib/*
