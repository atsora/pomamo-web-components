#! /bin/sh
for i in libraries/*.js
do
  sh ./graph/update-graphs.sh $i
done

for i in x-*/x-*.js
do
  sh ./graph/update-graphs.sh $i
done

