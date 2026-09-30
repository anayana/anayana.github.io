#!/usr/bin/env python3
# =============================================================================
# ONE CREDIT FILE PER SOURCE, ONE photos.js
#
# The pictures come from two places now: Wikimedia Commons (photo-fetch.sh)
# and iNaturalist (inat-fetch.sh). Each writes only its own credits file, and
# this puts them together into vta/photos.js. That way fetching from one source
# again cannot silently drop the other source's pictures - which is exactly
# what would have happened when photo-fetch.sh wrote photos.js by itself.
#
# A key present in both wins for iNaturalist last, because that is the file
# that was written most recently by hand-picking. Every entry must have a file,
# a licence, an author and a page, or it is left out: a picture nobody can be
# credited for does not ship.
# =============================================================================
import json, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'vta/photos.js'
SRC = [('Wikimedia Commons', 'vta/cases/credits.json'),
       ('iNaturalist',       'vta/cases/credits-inat.json')]

need = ('licence', 'by', 'page')
all_e, seen = {}, []
for name, path in SRC:
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding='utf-8'))
    n = 0
    for k, v in d.items():
        if not all(v.get(x) for x in need):
            print('left out %s from %s: no %s' % (k, name,
                  ', '.join(x for x in need if not v.get(x))))
            continue
        if not os.path.exists(os.path.join('vta/cases', k + '.jpg')):
            print('left out %s from %s: no picture on disk' % (k, name))
            continue
        v = dict(v); v['source'] = name
        all_e[k] = v
        n += 1
    seen.append('%s %d' % (name, n))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* Written by tools/photo-merge.py from the credits files the\n'
            '   fetchers left behind (%s). Every picture\n'
            '   here is somebody else\'s work: the app shows the name and the\n'
            '   licence under it and links the source page. Not edited by hand -\n'
            '   if a credit is wrong here, it is wrong at the source. */\n'
            % ', '.join(seen))
    f.write('const CASE_PHOTOS = ' + json.dumps(all_e, ensure_ascii=False,
                                                indent=2, sort_keys=True) + ';\n')
print('photos.js: %d pictures (%s)' % (len(all_e), ', '.join(seen)))
