#!/bin/sh

SRCS=`find lib webui extensions -name '*.ts'`

./node_modules/.bin/prettier \
  --parser typescript \
  --tab-width 4 \
  --single-quote \
  --trailing-comma es5 \
  --write $SRCS
