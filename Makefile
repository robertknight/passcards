TSC=tsc --noImplicitAny
TSC_NODE=$(TSC) -m commonjs
TSLINT=tslint
NODE=node
FOREACH_FILE=tr ' ' '\n' | xargs -l1

lib_srcs=$(shell find lib/ -name '*.ts')
app_srcs=$(wildcard *.ts)
all_srcs=$(lib_srcs) $(app_srcs)
test_files=$(shell find build/ -name '*_test.js')

all: $(all_srcs)
	@$(TSC_NODE) --outDir build $(all_srcs)

test: all
	@echo $(test_files) | $(FOREACH_FILE) $(NODE)

lint: $(all_srcs)
	@echo $(all_srcs) | $(FOREACH_FILE) $(TSLINT) -f

	
clean:
	rm -rf build/*
