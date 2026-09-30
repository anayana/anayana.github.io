#!/usr/bin/env python3
# =============================================================================
# THE PICTURE THAT WAS LOOKED AT GOES IN
#
# Run after somebody has actually opened the candidates in vta/cases/cand/:
#
#   python3 tools/inat-pick.py ganoderma=ganoderma-2 mistletoe=mistletoe-pine-1
#
# It moves that candidate to vta/cases/<case>.jpg, carries its credit over into
# vta/cases/credits-inat.json and rebuilds vta/photos.js. A candidate whose
# credit is not in credits-cand.json is refused: a picture nobody can be
# credited for does not ship, and neither does one that was never reviewed.
# =============================================================================
import json, os, shutil, subprocess, sys

CAND = 'vta/cases/cand'
OUT = 'vta/cases'
CRED = os.path.join(OUT, 'credits-inat.json')

pairs = [a.split('=', 1) for a in sys.argv[1:] if '=' in a]
if not pairs:
    sys.exit('nothing picked: give case=candidate pairs')

cand = json.load(open(os.path.join(CAND, 'credits-cand.json'), encoding='utf-8'))
have = json.load(open(CRED, encoding='utf-8')) if os.path.exists(CRED) else {}

for case, name in pairs:
    src = os.path.join(CAND, name + '.jpg')
    if name not in cand:
        sys.exit('%s has no credit - refused' % name)
    if not os.path.exists(src):
        sys.exit('%s is not in %s - refused' % (name, CAND))
    shutil.copyfile(src, os.path.join(OUT, case + '.jpg'))
    have[case] = cand[name]
    print('%-14s <- %-18s %s / %s' % (case, name, cand[name]['licence'], cand[name]['by']))

json.dump(have, open(CRED, 'w', encoding='utf-8'), ensure_ascii=False, indent=1,
          sort_keys=True)
subprocess.check_call([sys.executable, 'tools/photo-merge.py', 'vta/photos.js'])
print('candidates left in %s - delete the directory once the picks are committed' % CAND)
