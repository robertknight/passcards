build/cli.js: *.ts
	tsc --outDir build -m commonjs cli.ts
