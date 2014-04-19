TSC=tsc --noImplicitAny

build/cli.js: *.ts
	$(TSC) --outDir build -m commonjs cli.ts
