all: test

TSC_NODE_CMD=tsc --noImplicitAny -m commonjs
NODE_CMD=node

test: *.ts
	$(TSC_NODE_CMD) --outDir build/ *.ts
	$(NODE_CMD) build/sha1opt_test.js

clean:
	rm *.js
