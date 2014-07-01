all: lib/main.js data/index.html data/scripts/webui_bundle.js data/scripts/crypto_worker.js data/style/app.css data/panel.html data/test.js

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

data/style/app.css: data/style ../../webui/style/app.css
	cp ../../webui/style/app.css data/style/

data/panel.html: src/panel.html
	cp src/panel.html data/

data/test.js: src/test.js
	browserify src/test.js > data/test.js

clean:
	rm -rf data/*
	rm -rf lib/*
