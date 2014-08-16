NODE_MODULE_DIR=../../node_modules

all: scripts style icons

scripts: ../../webui/scripts/*.js
	mkdir -p data/scripts
	cp ../../webui/scripts/*.js data/scripts
	cp $(NODE_MODULE_DIR)/dropbox/lib/dropbox.js data/scripts

style: ../../webui/style/*.css
	mkdir -p data/style
	cp ../../webui/style/*.css data/style

icons: ../../icons/*.png
	mkdir -p data/icons
	cp ../../icons/*.png data/icons

clean:
	rm -rf data/icons
	rm -rf data/scripts
	rm -rf data/style
