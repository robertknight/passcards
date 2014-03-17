build/cli.js: *.ts
	tsc --noImplicitAny --outDir build -m commonjs cli.ts
