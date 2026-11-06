#!/usr/bin/env python3
"""Build structured JSON for the web edition from pandoc JSON ASTs of the four FINAL docx files.

Outputs (in data/):
  fs.json        Factual Summary: parts > sections > blocks (numbered paragraphs with anchors)
  exhibits.json  Evidence Bundle: 170 exhibits with ordered fields + computed backlinks
  il.json        Individual Liability: 16 profiles with [x.y.z] paragraphs
  tm.json        Translated Materials: 27 entries
  persons.json   derived person index
  meta.json      counts, section names, build info
"""
import json, re, html, sys, os, collections, hashlib, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == 'tools' else HERE   # run from the repo root or from tools/
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'data')
os.makedirs(OUT, exist_ok=True)

def load(name):
    with open(os.path.join(SRC, name + '.json'), encoding='utf-8') as f:
        return json.load(f)['blocks']

# ---------------------------------------------------------------- inlines
def inl_text(inlines):
    out = []
    for x in inlines:
        t = x['t']
        if t == 'Str': out.append(x['c'])
        elif t in ('Space', 'SoftBreak'): out.append(' ')
        elif t == 'LineBreak': out.append('\n')
        elif t in ('Emph', 'Strong', 'Underline', 'Strikeout', 'SmallCaps'):
            out.append(inl_text(x['c']))
        elif t == 'Span': out.append(inl_text(x['c'][1]))
        elif t == 'Link': out.append(inl_text(x['c'][1]))
        elif t == 'Quoted':
            q = '"' if x['c'][0]['t'] == 'DoubleQuote' else "'"
            out.append(q + inl_text(x['c'][1]) + q)
        elif t == 'Code': out.append(x['c'][1])
    return ''.join(out)

def inl_html(inlines, images=None):
    out = []
    for x in inlines:
        t = x['t']
        if t == 'Str': out.append(html.escape(x['c'], quote=False))
        elif t in ('Space', 'SoftBreak'): out.append(' ')
        elif t == 'LineBreak': out.append('<br>')
        elif t == 'Emph': out.append('<i>' + inl_html(x['c'], images) + '</i>')
        elif t == 'Strong': out.append('<b>' + inl_html(x['c'], images) + '</b>')
        elif t in ('Underline', 'Strikeout', 'SmallCaps'): out.append(inl_html(x['c'], images))
        elif t == 'Span': out.append(inl_html(x['c'][1], images))
        elif t == 'Link':
            url = x['c'][2][0]
            txt = inl_html(x['c'][1], images)
            out.append('<a href="%s" target="_blank" rel="noopener">%s</a>' % (html.escape(url, quote=True), txt))
        elif t == 'Image':
            src = os.path.basename(x['c'][2][0])
            if images is not None: images.append(src)
            out.append('<span class="img-slot" data-src="%s"></span>' % html.escape(src))
        elif t == 'Quoted':
            q = ('“', '”') if x['c'][0]['t'] == 'DoubleQuote' else ('‘', '’')
            out.append(q[0] + inl_html(x['c'][1], images) + q[1])
        elif t == 'Code': out.append('<code>' + html.escape(x['c'][1]) + '</code>')
    return ''.join(out)

def split_lines(inlines):
    """Split an inline list at LineBreaks -> list of (text, html, images)."""
    groups = [[]]
    for x in inlines:
        if x['t'] == 'LineBreak': groups.append([])
        else: groups[-1].append(x)
    # Strong/Emph wrapping a LineBreak: flatten one level if the break is inside a Strong
    flat = []
    for g in groups:
        sub = [[]]
        for x in g:
            if x['t'] in ('Strong', 'Emph') and any(y['t'] == 'LineBreak' for y in x['c']):
                parts = [[]]
                for y in x['c']:
                    if y['t'] == 'LineBreak': parts.append([])
                    else: parts[-1].append(y)
                sub[-1].append({'t': x['t'], 'c': parts[0]})
                for pp in parts[1:]:
                    sub.append([{'t': x['t'], 'c': pp}] if pp else [])
            else:
                sub[-1].append(x)
        flat.extend(sub)
    out = []
    for g in flat:
        imgs = []
        out.append((clean(inl_text(g)), inl_html(g, imgs).strip(), imgs))
    return out

def clean(s):
    s = s.replace('​', '').replace(' ', ' ')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r' *\n *', '\n', s)
    return s.strip()

def is_bold_para(inl):
    return any(x['t'] == 'Strong' for x in inl) and all(x['t'] in ('Strong', 'Space') for x in inl)

# ---------------------------------------------------------------- citations
EXID = r'[A-G]\d{1,2}(?:\s*\([a-c]\))?'
RANGE = EXID + r'(?:\s*[–\-—]\s*(?:[A-G])?\d{1,2})?'
CITE_RE = re.compile(r'EXHIBITS?\s+(' + RANGE + r'(?:\s*(?:,|&(?:amp;)?|and|,\s*and)\s*' + RANGE + r')*)')
EXTOK_RE = re.compile(r'([A-G])(\d{1,2})(?:\s*\(([a-c])\))?(?:\s*[–\-—]\s*([A-G])?(\d{1,2}))?')

def expand_citation_list(s):
    ids = []
    for m in EXTOK_RE.finditer(s):
        letter, n1, sub, l2, n2 = m.groups()
        n1 = int(n1)
        if n2:
            for n in range(n1, int(n2) + 1): ids.append('%s%d' % (letter, n))
        else:
            ids.append('%s%d' % (letter, n1))
    return ids

def find_citations(text):
    ids = []
    for m in CITE_RE.finditer(text):
        ids.extend(expand_citation_list(m.group(1)))
    return list(dict.fromkeys(ids))

def linkify_exhibits(h, valid):
    """Turn exhibit ids inside 'EXHIBIT ...' citation runs into anchors."""
    def repl_run(m):
        run = m.group(1)
        head = m.group(0)[:len(m.group(0)) - len(run)]
        def repl_tok(t):
            letter, n1, sub, l2, n2 = t.groups()
            a = '%s%s' % (letter, n1)
            s = t.group(0)
            if n2:
                b = '%s%s' % (l2 or letter, n2)
                dash = re.search(r'\s*[–\-—]\s*', s).group(0)
                left, right = s.split(dash, 1)
                la = '<a class="ex" data-ex="%s" href="#ex-%s">%s</a>' % (a, a, left) if a in valid else left
                ra = '<a class="ex" data-ex="%s" href="#ex-%s">%s</a>' % (b, b, right) if b in valid else right
                return '<span class="exr">' + la + dash.strip() + ra + '</span>'
            return '<a class="ex" data-ex="%s" href="#ex-%s">%s</a>' % (a, a, s) if a in valid else s
        return head + EXTOK_RE.sub(repl_tok, run)
    return CITE_RE.sub(repl_run, h)

PART_RE = re.compile(r'\bPart (\d{1,2})\b(?! of the Act)')
def linkify_parts(h):
    return PART_RE.sub(lambda m: '<a class="xpart" href="#fs-part-%s">Part %s</a>' % (m.group(1), m.group(1)), h)

def linkify_all(h, valid):
    return linkify_parts(linkify_exhibits(h, valid))

URL_RE = re.compile(r'(https?://[^\s<>"\]\)]+[^\s<>"\]\).,;:])')
def linkify_urls(h):
    if '<a ' in h: return h
    return URL_RE.sub(lambda m: '<a href="%s" target="_blank" rel="noopener">%s</a>' % (m.group(1), m.group(1)), h)

# ---------------------------------------------------------------- generic helpers
def unwrap(blocks):
    """Flatten BlockQuotes (Word indentation) -> yields (block, quoted_flag)."""
    for b in blocks:
        if b['t'] == 'BlockQuote':
            for inner, _ in unwrap(b['c']): yield inner, True
        else:
            yield b, False

def list_to_child(b):
    if b['t'] == 'BulletList':
        return {'k': 'ul', 'items': [item_to_obj(it) for it in b['c']]}
    if b['t'] == 'OrderedList':
        attrs, items = b['c']
        return {'k': 'ol', 'style': attrs[1]['t'], 'start': attrs[0], 'items': [item_to_obj(it) for it in items]}
    return None

def item_to_obj(item_blocks):
    texts = []; nested = []
    for ib, _q in unwrap(item_blocks):
        if ib['t'] in ('Para', 'Plain'): texts.append(inl_html(ib['c']))
        elif ib['t'] in ('BulletList', 'OrderedList'): nested.append(list_to_child(ib))
    return {'html': '<br>'.join(texts), 'children': nested}

def child_cites(c):
    return find_citations(json.dumps(c, ensure_ascii=False))

# ---------------------------------------------------------------- FS
def parse_fs():
    blocks = load('FS')
    doc = {'title': None, 'subtitle': None, 'parts': []}
    st = {'part': None, 'sec': None, 'last': None}
    order = []

    def container():
        if st['part'] is None:
            st['part'] = {'id': 'front', 'num': None, 'title': 'Front matter', 'sections': []}
            doc['parts'].append(st['part'])
        if st['sec'] is None:
            st['sec'] = {'id': st['part']['id'], 'letter': None, 'title': None, 'blocks': []}
            st['part']['sections'].append(st['sec'])
        return st['sec']

    def new_part(title):
        m = re.match(r'Part (\d+)\.\s*(.*)', title)
        if m: pid, num, ttl = 'part-' + m.group(1), int(m.group(1)), m.group(2)
        else: pid, num, ttl = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-'), None, title
        st['part'] = {'id': pid, 'num': num, 'title': ttl, 'sections': []}
        doc['parts'].append(st['part']); st['sec'] = None

    def new_section(title):
        m = re.match(r'([A-Z])\.\s*(.*)', title)
        letter = m.group(1) if m else None
        st['sec'] = {'id': st['part']['id'] + ('-' + letter.lower() if letter else ''), 'letter': letter,
                     'title': m.group(2) if m else title, 'blocks': []}
        st['part']['sections'].append(st['sec'])

    def add_numbered(num, inlines):
        txt = clean(inl_text(inlines))
        p = {'k': 'p', 'n': num, 'text': txt, 'html': inl_html(inlines), 'cites': find_citations(txt), 'children': []}
        container()['blocks'].append(p); st['last'] = p; order.append(p)
        return p

    def attach(child):
        p = st['last']
        if p is None:
            container()['blocks'].append({'k': 'p', 'n': None, 'text': '', 'html': child.get('html', ''), 'cites': [], 'children': []})
            return
        p['children'].append(child)
        extra = child_cites(child)
        if extra: p['cites'] = list(dict.fromkeys(p['cites'] + extra))
        if 'html' in child and child['k'] in ('p', 'quote'):
            p['text'] += '\n' + clean(re.sub(r'<[^>]+>', '', child['html']))
        if 'items' in child:
            p['text'] += '\n' + '\n'.join(clean(re.sub(r'<[^>]+>', '', it['html'])) for it in child['items'])

    for b, quoted in unwrap(blocks):
        t = b['t']
        if t == 'Header':
            level = b['c'][0]; title = clean(inl_text(b['c'][2]))
            if not title: continue
            if level == 1: new_part(title)
            else: new_section(title)
            continue
        if t == 'RawBlock': continue
        if t == 'Para':
            inl = b['c']; txt = clean(inl_text(inl))
            if not txt: continue
            if doc['title'] is None and txt.startswith('Report on'): doc['title'] = txt; continue
            if txt == 'FACTUAL SUMMARY': doc['subtitle'] = txt; continue
            if is_bold_para(inl) and len(txt) < 160 and not quoted:
                container()['blocks'].append({'k': 'h3', 'title': txt, 'id': None}); continue
            kind = 'quote' if txt[:1] in '"“' else 'p'
            attach({'k': kind, 'html': inl_html(inl)})
            continue
        if t == 'OrderedList':
            attrs, items = b['c']
            start, style = attrs[0], attrs[1]['t']
            if style == 'Decimal':
                for i, item in enumerate(items):
                    inner = list(unwrap(item))
                    first = next((x for x, _ in inner if x['t'] in ('Para', 'Plain')), None)
                    p = add_numbered(start + i, first['c'] if first else [])
                    for x, _ in inner:
                        if x is first: continue
                        if x['t'] in ('Para', 'Plain'):
                            attach({'k': 'p', 'html': inl_html(x['c'])})
                        else:
                            c = list_to_child(x)
                            if c: attach(c)
            else:
                attach(list_to_child(b))
            continue
        if t == 'BulletList':
            attach(list_to_child(b)); continue
        print('FS: unhandled block', t, file=sys.stderr)

    nums = [p['n'] for p in order]
    gaps = [(a, b) for a, b in zip(nums, nums[1:]) if b != a + 1]
    print('FS paragraphs:', len(nums), 'first', nums[0], 'last', nums[-1], 'gaps', gaps, file=sys.stderr)
    for part in doc['parts']:
        for sec in part['sections']:
            k = 0
            for bl in sec['blocks']:
                if bl['k'] == 'h3':
                    k += 1; bl['id'] = '%s-%d' % (sec['id'], k)
    return doc, order

# ---------------------------------------------------------------- field-style documents (EB, TM)
LABELS = ['Title', 'Source', 'Date', 'Document Type', 'Summary', 'Relevance', 'Hyperlink', 'Reference Number',
          'Relevant Section(s)', 'Relevant Paragraph(s)', 'Relevant Article(s)', 'Relevant Rule(s)', 'Related Material',
          'Citation', 'Video Recording', 'Video', 'Case Number', 'Case Numbers', 'Index', 'Article', 'Author',
          'Date of sentence', 'Date of conviction']
WEAK_LABELS = {'Video', 'Article', 'Index', 'Citation', 'Author', 'Case Number', 'Case Numbers', 'Title'}
LABEL_RE = re.compile(r'^(' + '|'.join(re.escape(l) for l in LABELS) +
                      r'|Internet Archive Wayback Machine \([^)]*\)|Archive\.today Webpage Capture \([^)]*\)'
                      r'|B2 \([abc]\) Hyperlink|E9\([ab]\))\s*:\s*(.*)$', re.S)

def strip_label_html(h, label):
    return re.sub(r'^\s*(?:<b>)?\s*' + re.escape(html.escape(label, quote=False)) + r'\s*:\s*(?:</b>)?\s*(?:<br>)?\s*', '', h, count=1).strip()

class FieldCollector:
    def __init__(self):
        self.fields = []; self.cur = None
    def feed_para(self, inl):
        for txt, h, imgs in split_lines(inl):
            if not txt and not imgs: continue
            m = LABEL_RE.match(txt) if txt else None
            if m and m.group(1) in WEAK_LABELS and len(m.group(2).strip()) > 60 and not m.group(2).strip().startswith('http'):
                m = None  # e.g. a Title beginning "Video: Taxi rams into ..."
            if m and m.group(1) in ('Date of conviction', 'Date of sentence') and self.cur and self.cur['label'] == 'Date':
                m = None  # sub-lines of the Date field
            if m:
                label, rest = m.group(1), m.group(2).strip()
                self.cur = {'label': label, 'text': rest, 'html': strip_label_html(h, label) if rest else ''}
                self.fields.append(self.cur)
                if imgs: self.cur['images'] = list(imgs)
            else:
                if self.cur is None:
                    self.cur = {'label': '', 'text': txt, 'html': h}; self.fields.append(self.cur)
                else:
                    if txt:
                        self.cur['text'] = (self.cur['text'] + '\n' + txt) if self.cur['text'] else txt
                        self.cur['html'] = (self.cur['html'] + '<br>' + h) if self.cur['html'] else h
                if imgs: self.cur['images'] = self.cur.get('images', []) + list(imgs)
    def end_para(self):
        # paragraph boundary inside a multi-paragraph field -> blank line
        if self.cur is not None and self.cur['html']:
            self.cur['html'] += '<br><br>'
    def done(self):
        for f in self.fields:
            f['html'] = re.sub(r'<(b|i)>\s*</\1>', '', f['html'])
            f['html'] = re.sub(r'(?:<br>\s*){3,}', '<br><br>', f['html'])
            f['html'] = re.sub(r'(<br>)+$', '', f['html']).strip()
            f['text'] = f['text'].strip()
        return self.fields

def first_field(fields, label):
    for f in fields:
        if f['label'] == label and f['text']: return f['text']
    return ''

# ---------------------------------------------------------------- EB
def parse_eb():
    blocks = load('EB')
    exhibits = []; index = {}
    cur = None; fc = None
    for b, _q in unwrap(blocks):
        t = b['t']
        if t == 'Header':
            title = clean(inl_text(b['c'][2]))
            if not title: continue
            if title.startswith('Index of Evidence Bundle'):
                cur = None; continue
            m = re.match(r'EXHIBIT\s+([A-G]\d{1,2})(.*)$', title)
            if m:
                if cur is not None: cur['fields'] = fc.done()
                cur = {'id': m.group(1), 'section': m.group(1)[0], 'heading': title, 'suffix': clean(m.group(2))}
                exhibits.append(cur); fc = FieldCollector()
                continue
            print('EB: odd header', title, file=sys.stderr); continue
        if t != 'Para':
            print('EB: block', t, file=sys.stderr); continue
        if cur is None:
            m = re.match(r'^([A-G])\s*-\s*(.*)$', clean(inl_text(b['c'])))
            if m: index[m.group(1)] = m.group(2)
            continue
        fc.feed_para(b['c']); fc.end_para()
    if cur is not None: cur['fields'] = fc.done()
    valid = set(e['id'] for e in exhibits)
    for ex in exhibits:
        f = ex['fields']
        # Published image names follow the exhibit, never the docx media name (which changes whenever the file is re-saved):
        # an image inside a sub-part field such as "E9(a)" becomes E9a.jpg; a lone image in an exhibit becomes <id>.jpg.
        n_imgs = sum(len(fld.get('images', [])) for fld in f)
        for fld in f:
            if not fld.get('images'): continue
            m = re.match(r'^([A-G]\d{1,2})\(([a-z])\)$', fld['label'])
            for i, old in enumerate(list(fld['images'])):
                new = ('%s%s.jpg' % (m.group(1), m.group(2))) if m else ('%s%s.jpg' % (ex['id'], '' if n_imgs == 1 else chr(97 + i)))
                fld['images'][i] = new
                fld['html'] = fld['html'].replace('data-src="%s"' % html.escape(old), 'data-src="%s"' % new)
        ex['title'] = first_field(f, 'Title') or first_field(f, 'E9(a)')
        ex['source'] = first_field(f, 'Source')
        ex['date'] = first_field(f, 'Date')
        ex['type'] = first_field(f, 'Document Type')
        ex['summary'] = first_field(f, 'Summary')
        ex['relevance'] = first_field(f, 'Relevance')
        links = []
        for fld in f:
            lab = fld['label']
            if ('Hyperlink' in lab or lab.startswith('Internet Archive') or lab.startswith('Archive.today')
                    or lab in ('Video Recording', 'Video', 'Related Material')):
                for u in URL_RE.findall(fld['text'] or ''):
                    links.append({'label': lab, 'url': u})
            fld['html'] = linkify_urls(fld['html'])
            if not ('Hyperlink' in lab or lab.startswith('Internet Archive') or lab.startswith('Archive.today')):
                fld['html'] = linkify_exhibits(fld['html'], valid)
        ex['links'] = links
        ex['primary_url'] = next((l['url'] for l in links if l['label'].endswith('Hyperlink')), links[0]['url'] if links else '')
        ex['year'] = parse_year(ex['date'])
        ex['sortdate'] = parse_sortdate(ex['date'])
        ex['refs'] = [r for r in find_citations(ex['summary'] + ' ' + ex['relevance']) if r != ex['id']]
        ex['images'] = [i for fld in f for i in fld.get('images', [])]
    exhibits.sort(key=lambda e: (e['id'][0], int(e['id'][1:])))
    print('EB exhibits:', len(exhibits), file=sys.stderr)
    return exhibits, index

MONTHS = {m: i for i, m in enumerate(['january','february','march','april','may','june','july','august','september','october','november','december'], 1)}
def parse_year(d):
    m = re.search(r'\b(1[89]|20)\d{2}\b', d or '')
    return int(m.group(0)) if m else None
def parse_sortdate(d):
    d = (d or '').strip()
    m = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+((?:1[89]|20)\d{2})', d)
    if m and m.group(2).lower() in MONTHS:
        return '%s-%02d-%02d' % (m.group(3), MONTHS[m.group(2).lower()], int(m.group(1)))
    m = re.search(r'([A-Za-z]+)\s+((?:1[89]|20)\d{2})', d)
    if m and m.group(1).lower() in MONTHS:
        return '%s-%02d' % (m.group(2), MONTHS[m.group(1).lower()])
    m = re.search(r'((?:1[89]|20)\d{2})', d)
    return m.group(1) if m else ''

# ---------------------------------------------------------------- IL
ILNUM_RE = re.compile(r'^\[(\d+(?:\.\d+)*)\]\s*(.*)$', re.S)
def parse_il(valid):
    blocks = load('IL')
    persons = []
    st = {'p': None, 'sec': None, 'case': None, 'last': None}
    title = None; subtitle = None
    def slug(name):
        s = re.sub(r'\(.*?\)', '', name)
        return re.sub(r"[^A-Za-z]+", '-', s).strip('-').lower()
    def target():
        if st['case']: return st['case']['blocks']
        if st['sec']: return st['sec']['blocks']
        return None
    def attach(child):
        lp = st['last']
        if lp is None: return False
        lp['children'].append(child)
        extra = child_cites(child)
        if extra: lp['cites'] = list(dict.fromkeys(lp['cites'] + extra))
        if 'html' in child: lp['text'] += '\n' + clean(re.sub(r'<[^>]+>', '', child['html']))
        return True
    for b, quoted in unwrap(blocks):
        t = b['t']
        if t == 'Header': continue
        if t in ('BulletList', 'OrderedList'):
            attach(list_to_child(b)); continue
        if t != 'Para': print('IL block', t, file=sys.stderr); continue
        inl = b['c']; txt = clean(inl_text(inl)); h = inl_html(inl)
        if not txt: continue
        if title is None and txt.startswith('Report on'): title = txt; continue
        if txt == 'SUMMARY OF INDIVIDUAL LIABILITY': subtitle = txt; continue
        m = re.match(r'^Summary of (.+?) and (His|Her) Suspected Involvement', txt)
        if m:
            name = m.group(1)
            st['p'] = {'id': slug(name), 'name': name, 'heading': txt, 'gender': 'm' if m.group(2) == 'His' else 'f',
                       'sections': [], 'info': {}, 'positions': []}
            persons.append(st['p']); st['sec'] = st['case'] = st['last'] = None
            continue
        bold = is_bold_para(inl)
        m = re.match(r'^(\d)\.\s+(.*)$', txt)
        if m and bold and len(txt) < 60:
            st['sec'] = {'num': int(m.group(1)), 'title': m.group(2), 'blocks': []}
            st['p']['sections'].append(st['sec']); st['case'] = None
            continue
        m = re.match(r'^(\d\.\d+)\s*[-–]\s*(.*)$', txt)
        if m and bold:
            st['case'] = {'k': 'case', 'num': m.group(1), 'title': m.group(2), 'blocks': []}
            st['sec']['blocks'].append(st['case'])
            continue
        m = re.match(r'^(Name|Date of Birth|Place of Birth)\s*:\s*(.*)$', txt)
        if m:
            st['p']['info'][m.group(1)] = m.group(2).strip(); continue
        m = ILNUM_RE.match(txt)
        if m:
            num = m.group(1)
            body_h = re.sub(r'^\s*(?:<b>)?\s*\[' + re.escape(num) + r'\]\s*(?:</b>)?\s*', '', h, count=1).strip()
            p = {'k': 'p', 'n': num, 'text': m.group(2).strip(), 'html': body_h, 'cites': find_citations(txt), 'children': []}
            target().append(p); st['last'] = p
            continue
        if st['sec'] and st['sec']['num'] == 2 and st['sec']['title'].lower().startswith('position'):
            st['p']['positions'].append(txt); continue
        kind = 'quote' if (quoted or txt[:1] in '"“') else 'p'
        if not attach({'k': kind, 'html': h}):
            tg = target()
            if tg is not None: tg.append({'k': 'p', 'n': None, 'text': txt, 'html': h, 'cites': find_citations(txt), 'children': []})
            else: print('IL stray para:', txt[:80], file=sys.stderr)
    def walk(bl):
        for x in bl:
            if x['k'] == 'case': walk(x['blocks']); continue
            x['html'] = linkify_all(x['html'], valid)
            for c in x['children']:
                if 'html' in c: c['html'] = linkify_all(c['html'], valid)
                for it in c.get('items', []): it['html'] = linkify_all(it['html'], valid)
    for p in persons:
        for s in p['sections']: walk(s['blocks'])
    print('IL persons:', len(persons), file=sys.stderr)
    return {'title': title, 'subtitle': subtitle, 'persons': persons}

# ---------------------------------------------------------------- TM
def parse_tm(valid):
    blocks = load('TM')
    entries = []; cur = None; mode = 'fields'; fc = None
    title = None; subtitle = None
    def sink():
        return cur['original'] if mode == 'original' else cur['body']
    for b, quoted in unwrap(blocks):
        t = b['t']
        if t == 'Header':
            ttl = clean(inl_text(b['c'][2]))
            if not ttl: continue
            m = re.match(r'EXHIBIT\s+([A-G]\d{1,2})', ttl)
            if m:
                if cur is not None: cur['fields'] = fc.done()
                cur = {'id': m.group(1), 'heading': ttl, 'body': [], 'original': [], 'marker': None, 'original_marker': None}
                entries.append(cur); mode = 'fields'; fc = FieldCollector()
            continue
        if cur is None:
            if t == 'Para':
                txt = clean(inl_text(b['c']))
                if txt.startswith('Report on'): title = txt
                elif txt == 'TRANSLATED MATERIALS': subtitle = txt
            continue
        if t in ('OrderedList', 'BulletList'):
            sink().append(list_to_child(b)); continue
        if t != 'Para': print('TM block', t, file=sys.stderr); continue
        inl = b['c']; txt = clean(inl_text(inl)); h = inl_html(inl)
        if not txt: continue
        bold = is_bold_para(inl)
        if re.match(r'^Translation of .*:$', txt):
            mode = 'body'; cur['marker'] = txt.rstrip(':'); continue
        if txt == 'Original Text:' or re.match(r'^Transcript of the video in Cantonese:$', txt):
            mode = 'original'; cur['original_marker'] = txt.rstrip(':'); continue
        if mode == 'fields':
            fc.feed_para(inl); fc.end_para(); continue
        kind = 'h' if (bold and len(txt) < 140) else ('quote' if quoted else 'p')
        sink().append({'k': kind, 'html': h, 'text': txt})
    if cur is not None: cur['fields'] = fc.done()
    for e in entries:
        for fld in e['fields']: fld['html'] = linkify_urls(fld['html'])
        e['title'] = first_field(e['fields'], 'Title'); e['source'] = first_field(e['fields'], 'Source')
        e['date'] = first_field(e['fields'], 'Date'); e['type'] = first_field(e['fields'], 'Document Type')
        e['words'] = sum(len(b.get('text', '').split()) for b in e['body'])
        e['has_original'] = bool(e['original'])
    print('TM entries:', len(entries), file=sys.stderr)
    return {'title': title, 'subtitle': subtitle, 'entries': entries}


# ---------------------------------------------------------------- main
def main():
    exhibits, index = parse_eb()
    valid = set(e['id'] for e in exhibits)
    fs, fs_order = parse_fs()
    for part in fs['parts']:
        for sec in part['sections']:
            for bl in sec['blocks']:
                if bl['k'] != 'p': continue
                bl['html'] = linkify_all(bl['html'], valid)
                for c in bl['children']:
                    if 'html' in c: c['html'] = linkify_all(c['html'], valid)
                    for it in c.get('items', []):
                        it['html'] = linkify_all(it['html'], valid)
                        for cc in it.get('children', []):
                            for it2 in cc.get('items', []): it2['html'] = linkify_all(it2['html'], valid)
    il = parse_il(valid)
    tm = parse_tm(valid)

    back = collections.defaultdict(lambda: {'fs': [], 'il': [], 'tm': [], 'eb': []})
    unknown = collections.Counter()
    fs_index = {}
    for part in fs['parts']:
        for sec in part['sections']:
            for bl in sec['blocks']:
                if bl['k'] == 'p' and bl['n'] is not None:
                    fs_index[bl['n']] = {'part': part['num'], 'section': sec['id']}
                    for c in bl['cites']:
                        if c in valid: back[c]['fs'].append(bl['n'])
                        else: unknown['FS ¶%s → %s' % (bl['n'], c)] += 1
    for p in il['persons']:
        def walk(bl, case=None):
            for x in bl:
                if x['k'] == 'case': walk(x['blocks'], x); continue
                if x.get('n'):
                    for c in x['cites']:
                        if c in valid: back[c]['il'].append({'person': p['id'], 'name': p['name'], 'n': x['n'], 'case': case['title'] if case else None})
                        else: unknown['IL %s [%s] → %s' % (p['id'], x['n'], c)] += 1
        for s in p['sections']: walk(s['blocks'])
    for e in tm['entries']:
        if e['id'] in valid: back[e['id']]['tm'].append(e['id'])
        else: unknown['TM ' + e['id']] += 1
    for e in exhibits:
        for r in e['refs']: back[r]['eb'].append(e['id'])
    for e in exhibits:
        b = back[e['id']]
        e['cited'] = {'fs': sorted(set(b['fs'])), 'il': b['il'], 'tm': b['tm'], 'eb': sorted(set(b['eb']))}
        e['translated'] = bool(b['tm'])
    if unknown: print('UNKNOWN CITATIONS:', dict(unknown), file=sys.stderr)
    uncited = [e['id'] for e in exhibits if not (e['cited']['fs'] or e['cited']['il'])]
    print('Exhibits never cited in FS/IL (%d):' % len(uncited), uncited, file=sys.stderr)

    MENTION = {
        'john-lee-ka-chiu': r'John Lee|Lee Ka-chiu', 'chris-tang-ping-keung': r'Chris Tang|Tang Ping-keung',
        'roberto-alexandre-vieira-ribeiro': r'Ribeiro', 'joseph-paul-fok': r'Joseph (?:Paul )?Fok|\bFok PJ|\bFok\b(?! Ka-chi)', 'frank-stock': r'\bStock\b',
        'patrick-chan-siu-oi': r'Patrick Chan|Chan Siu-oi', 'amanda-jane-woodcock': r'Woodcock',
        'kwok-wai-kin': r'Kwok Wai[- ]kin', 'chan-kwong-chi-stanley': r'Stanley Chan|Chan Kwong[- ]chi',
        'chan-hing-wai-andrew': r'Andrew Chan|Chan Hing[- ]wai', 'lee-wan-tang-alex': r'Alex Lee|Lee Wan[- ]tang',
        'chan-jong-herng-johnny': r'Johnny Chan|Chan Jong[- ]herng', 'lai-yuen-kee-anna': r'Anna Lai|Lai Yuen[- ]kee',
        'law-tak-chuen-peter': r'Peter Law|Law Tak[- ]chuen', 'so-wai-tak-victor': r'Victor So|So Wai[- ]tak',
        'susana-maria-d-almada-remedios': r'Almada Remedios|Remedios',
        'tam-yiu-ho-william': r'William Tam|Tam Yiu[- ]ho|\bTam J\b',
    }
    fs_text = {p['n']: p['text'] for p in fs_order}
    zh_fs = {}
    for part in fs['parts']:
        for sec in part['sections']:
            for bl in sec['blocks']:
                if bl['k'] == 'h3':
                    m = re.search(r'^(.*?)\s*\(([\u4e00-\u9fff]+)\)', bl['title'])
                    if m: zh_fs[m.group(1)] = m.group(2)
    persons = []
    for p in il['persons']:
        cases = []; cites = []
        p11 = next((b for s in p['sections'][:1] for b in s['blocks'] if b.get('n') == '1.1'), None)
        zh = born = role = ''
        if p11:
            m = re.search(r'\(([\u4e00-\u9fff]+)\)', p11['text'])
            zh = m.group(1) if m else ''
            m = re.search(r'was born (?:in|on) ([^.]*?)\.\s*\(See EXHIBIT [A-G]\d+\)\s*(.*)$', p11['text'], re.S)
            if m:
                born = m.group(1).strip(); role = m.group(2).split('.')[0].strip() + '.'
        else:
            zh = zh_fs.get(p['name'], '')
            born = ', '.join(x for x in [p['info'].get('Place of Birth', ''), p['info'].get('Date of Birth', '')] if x)
            role = p['positions'][-1] if p['positions'] else ''
            if p['id'] == 'john-lee-ka-chiu': role = 'Chief Executive of the HKSAR since 2022; formerly Secretary for Security and Chief Secretary for Administration.'
            if p['id'] == 'chris-tang-ping-keung': role = 'Secretary for Security since 2021; formerly Commissioner of Police.'
        pat = re.compile(MENTION.get(p['id'], 'ZZZZ'), re.I)
        mentions = sorted(n for n, t in fs_text.items() if pat.search(t))
        for s in p['sections']:
            for x in s['blocks']:
                if x['k'] == 'case':
                    cc = [c for b in x['blocks'] for c in b['cites']]
                    cases.append({'num': x['num'], 'title': x['title'], 'cites': sorted(set(cc), key=exkey)})
                    cites += cc
                else:
                    cites += x['cites']
        persons.append({'id': p['id'], 'name': p['name'], 'zh': zh, 'born': born, 'role': role, 'info': p['info'], 'positions': p['positions'],
                        'cases': cases, 'exhibits': sorted(set(cites), key=exkey), 'fs_mentions': mentions,
                        'kind': 'executive' if p['positions'] else 'judicial'})

    meta = {
        'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'),
        'title': fs['title'],
        'sections': index,
        'counts': {'fs_paragraphs': len(fs_order), 'exhibits': len(exhibits), 'persons': len(persons), 'tm': len(tm['entries'])},
        'types': sorted(set(e['type'] for e in exhibits if e['type'])),
    }
    for name, obj in [('fs', fs), ('exhibits', exhibits), ('il', il), ('tm', tm), ('persons', persons), ('meta', meta)]:
        with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print('written', OUT, file=sys.stderr)

def exkey(s):
    return (s[0], int(re.sub(r'\D', '', s)))

if __name__ == '__main__':
    main()
