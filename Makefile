TSC=tsc --noImplicitAny
TSC_NODE=$(TSC) -m commonjs
NODE=node

lib_srcs=$(shell find lib/ -name '*.ts')
app_srcs=$(wildcard *.ts)
test_files=$(shell find build/ -name '*_test.js')

all: $(lib_srcs)
	$(TSC_NODE) --outDir build $(lib_srcs) $(app_srcs)

test: all
	$(NODE) $(test_files)
	
clean:
	rm -rf build/*
