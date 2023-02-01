#/bin/sh

# - Remove any previous ascii graph
sed -i '/^@g .*$/d' $1

# - Update the graphs

TMP=`mktemp -d`
rmdir $TMP
cp -r about/graphimages $TMP
sed -i 's/^/@g /g' $TMP/*.ascii

DIRESC=`echo $TMP | sed 's!/!\\\\/!g'`

INCL="#n
/^.*@graph .*$/ {
  =;
    s/^\(.*@graph  *\([^ ]*\) *\)$/{a\1\nr ${DIRESC}\/\2\.ascii/p;
      a\
	        d}
      }"

TMP=`mktemp`
rm -f $TMP
cp -r about/graphimages $TMP
sed -i 's/^/@g/g' $TMP/*.ascii

sed -n "$INCL" $1 | sed 'N;N;N;s/\n{/{/g' | sed -i -f - $1

rm -rf $TMP
