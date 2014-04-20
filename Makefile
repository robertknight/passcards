TSC=tsc --noImplicitAny

build/cli.js: *.ts lib/crypto/*.ts
	$(TSC) --outDir build -m commonjs cli.ts
