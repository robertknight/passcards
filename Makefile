TSC=tsc --noImplicitAny
TSC_NODE=$(TSC) -m commonjs
NODE=node

ts_srcs=$(wildcard *.ts lib/*.ts lib/crypto/*.ts)
test_files=$(shell find build/ -name '*_test.js')

all: $(ts_srcs)
	$(TSC_NODE) --outDir build $(ts_srcs)

test: all
	$(NODE) $(test_files)
	
clean:
	rm -rf build/*
