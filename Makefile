TSC=tsc --noImplicitAny
TSC_NODE=$(TSC) -m commonjs
TSLINT=tslint
NODE=node

lib_srcs=$(shell find lib/ -name '*.ts')
app_srcs=$(wildcard *.ts)
all_srcs=$(lib_srcs) $(app_srcs)
test_files=$(shell find build/ -name '*_test.js')

all: $(all_srcs)
	$(TSC_NODE) --outDir build $(all_srcs)

test: all
	$(NODE) $(test_files)

lint: $(all_srcs)
	@echo $(all_srcs) | tr ' ' '\n' | xargs -l1 tslint -f

	
clean:
	rm -rf build/*
