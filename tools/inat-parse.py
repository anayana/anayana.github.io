#!/usr/bin/env python3
# Reads one iNaturalist answer on stdin and writes the usable photographs into
# <out>/found.tsv. A separate file and not a heredoc inside inat-fetch.sh: a
# heredoc IS stdin, so a script fed that way cannot also read the pipe - which
# is exactly how the first run came back with nothing at all.
import json, re, sys

key, want, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
OK = {'cc0': 'CC0', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA'}
try:
    d = json.load(sys.stdin)
except Exception as e:
    print('    iNaturalist did not answer with JSON: %s' % e)
    sys.exit(0)
print('    %s research-grade observations offered' % d.get('total_results', '?'))

rows, n = [], 0
for o in d.get('results', []):
    if n >= want:
        break
    for p in (o.get('photos') or []):
        # photo_license= filters the OBSERVATION; an observation can qualify on
        # its second picture while the first is all rights reserved. Every
        # picture is judged on its own licence here.
        lic = (p.get('license_code') or '').lower()
        if lic not in OK:
            continue
        url = (p.get('url') or '').replace('/square.', '/large.')
        if not url:
            continue
        att = (p.get('attribution') or '').strip()
        # "(c) Some Name, some rights reserved (CC BY)" -> "Some Name". A CC0
        # picture often carries no name at all, and then the credit comes from
        # the observer. What must never happen is a credit reading "no rights
        # reserved" as if that were somebody's name.
        m = re.match(r'^\(c\)\s*(.+?),\s*(?:some|no|all)\s+rights', att, re.I)
        who = (m.group(1) if m else att).strip()
        if not who or re.search(r'rights reserved|^uploaded by$', who, re.I):
            u = o.get('user') or {}
            who = (u.get('name') or u.get('login') or '').strip()
        if not who:
            print('    (skipped a %s picture: nobody to credit)' % OK[lic])
            continue
        n += 1
        rows.append([key + '-' + str(n), url, OK[lic], who, o.get('uri') or '',
                     str(o.get('id') or ''),
                     (o.get('species_guess') or '').replace('\t', ' ')])
        break

if not rows:
    print('    nothing with a usable licence and a readable author')
with open(out + '/found.tsv', 'a', encoding='utf-8') as f:
    for r in rows:
        f.write('\t'.join(r) + '\n')
        print('    %-16s %-10s %s' % (r[0], r[2], r[3]))
