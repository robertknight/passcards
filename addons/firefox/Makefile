all: lib/main.js data/webui_bundle.js data/app.css data/panel.html

lib/main.js: src/main.ts
	tsc src/main.ts --outDir lib

data/webui_bundle.js: ../../webui/scripts/webui_bundle.js
	cp ../../webui/scripts/webui_bundle.js data/

data/app.css: ../../webui/style/app.css
	cp ../../webui/style/app.css data/

data/panel.html: src/panel.html
	cp data/panel.html src/
