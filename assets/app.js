function startApp(D) {
  'use strict';
  window.RECORD = D;                                 // the loaded record, for scripts and checks
  const IMG = D.images || {};
  const imgSrc = name => IMG[name] || ('img/' + name);
  const EX = Object.create(null); D.exhibits.forEach(e => { EX[e.id] = e; });
  const EXIDS = D.exhibits.map(e => e.id);
  const FSP = Object.create(null);                 // paragraph number -> {p, part, sec}
  D.fs.parts.forEach(part => part.sections.forEach(sec => sec.blocks.forEach(b => { if (b.k === 'p' && b.n != null) FSP[b.n] = { p: b, part, sec }; })));
  const PERSON = Object.create(null); D.persons.forEach(p => { PERSON[p.id] = p; });
  const ILP = Object.create(null); D.il.persons.forEach(p => { ILP[p.id] = p; });
  const TM = Object.create(null); D.tm.entries.forEach(t => { TM[t.id] = t; });
  const SECNAME = D.meta.sections;
  const SPLIT = {};                                               // every Part of the Factual Summary is read in place
  const viewOfPart = pid => SPLIT[pid] || 'fs';
  const CATS = { law: 'Laws & institutions', incident: 'Incidents', case: 'Cases & measures', statement: 'Official statements', finding: 'Findings' };
  const CATSHORT = { law: 'Law', incident: 'Incident', case: 'Case', statement: 'Statement', finding: 'Finding', instrument: 'Instrument', precedent: 'Precedent', icc: 'ICC', national: 'National court', mechanism: 'Mechanism', nexus: 'HK nexus' };
  const LCATS = { instrument: 'Treaties & legislation', precedent: 'Judgments & decisions', icc: 'ICC proceedings', national: 'National courts & universal jurisdiction', mechanism: 'UN mechanisms & responses', nexus: 'Hong Kong nexus' };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = h => String(h || '').replace(/<[^>]+>/g, '');
  const exKey = id => [id[0], parseInt(id.slice(1), 10)];
  const exSort = (a, b) => { const x = exKey(a), y = exKey(b); return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]; };
  const views = {}; $$('.view').forEach(v => { views[v.id.replace('view-', '')] = v; });
  const side = $('#side'), insp = $('#inspector'), main = $('#main');
  const scrollMemo = {};
  let curView = null, pinned = null, hoverTimer = null;

  /* ---------------- helpers ---------------- */
  function exChip(id, extra) {
    const e = EX[id]; if (!e) return esc(id);
    return `<a class="ex" data-ex="${id}" href="#ex-${id}" title="${esc(e.title)}">${id}${extra || ''}</a>`;
  }
  function secChip(letter) { return `<span class="chip sec" data-s="${letter}">${letter} · ${esc(SECNAME[letter] || '')}</span>`; }
  function renderChildren(children, il) {
    if (!children || !children.length) return '';
    return children.map(c => {
      if (c.k === 'ul') return `<ul>${c.items.map(it => `<li>${it.html}${renderChildren(it.children)}</li>`).join('')}</ul>`;
      if (c.k === 'ol') { const type = c.style === 'LowerAlpha' ? 'a' : c.style === 'LowerRoman' ? 'i' : '1'; return `<ol type="${type}" start="${c.start || 1}">${c.items.map(it => `<li>${it.html}${renderChildren(it.children)}</li>`).join('')}</ol>`; }
      if (c.k === 'quote') return `<blockquote>${c.html}</blockquote>`;
      return `<p class="cont">${c.html}</p>`;
    }).join('');
  }
  function imgTag(name, alt) { const src = imgSrc(name); return src ? `<img src="${src}" alt="${esc(alt || '')}" loading="lazy">` : ''; }
  function hydrateImages(root) {
    $$('.img-slot', root).forEach(s => { const src = imgSrc(s.dataset.src); if (src && !s.firstChild) s.innerHTML = `<img src="${src}" alt="Exhibit image" loading="lazy">`; });
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600); }
  function copyText(text) {
    const done = () => toast('Link copied: ' + text);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let okc = false; try { okc = document.execCommand('copy'); } catch (e) { okc = false; }
    if (okc) done(); else toast('Copy this link: ' + text);
    document.body.removeChild(ta);
  }
  function linkFor(hash) { const base = location.href.split('#')[0]; return base + '#' + hash; }
  function fmtCount(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function docOf(id) { return SECNAME[id[0]] || ''; }

  /* ---------------- HOME ---------------- */
  function renderHome() {
    const c = D.meta.counts;
    const translated = D.exhibits.filter(e => e.translated).length;
    views.home.innerHTML = `
      <div class="hero">
        <div class="eyebrow">Evidence record · Hong Kong, 2019 –</div>
        <h1>${esc(D.meta.title)}</h1>
        <p class="sub">A documented record of imprisonment, persecution and related crimes against humanity committed by officials of the Hong Kong Government since 2019, with the evidence that supports each allegation. It is prepared for use in any forum with jurisdiction over such crimes — a national court exercising universal jurisdiction, proceedings under the Convention against Torture, or the International Criminal Court.</p>
      </div>
      <div class="docs">
        <a class="doccard" href="#fs"><span class="n">1</span><div class="k">Section 1</div><h3>Factual Summary</h3><p>The complete record in fourteen Parts: the Article 7 framework, the 2019 crackdown, the national-security system, representative cases, treatment of prisoners, extraterritorial conduct, UN findings and the persons identified. ${c.fs_paragraphs} numbered paragraphs.</p></a>
        <a class="doccard" href="#il"><span class="n">2</span><div class="k">Section 2</div><h3>Individual Liability</h3><p>Two senior executive officials and fourteen judicial officers: positions, offences alleged, concrete contribution, case briefs and mental element, paragraph by paragraph.</p></a>
        <a class="doccard" href="#ex"><span class="n">3</span><div class="k">Section 3</div><h3>Evidence Bundle</h3><p>${c.exhibits} exhibits in seven series (A–G), each with source, date, type, summary, relevance, hyperlink and archive capture — filterable, sortable and cross-referenced.</p></a>
        <a class="doccard" href="#timeline"><span class="n">4</span><div class="k">Section 4</div><h3>Hong Kong Situation Timeline</h3><p>${D.events.length} dated events from the record: laws and institutions, incidents, cases and measures, official statements and findings, each linked to its paragraphs and exhibits.</p></a>
        <a class="doccard" href="#law"><span class="n">5</span><div class="k">Section 5</div><h3>International Law for Political Repression Timeline</h3><p>${D.law_events.length} entries from the Judges’ Trial to the latest ICC decisions: jurisdiction by territory, nationality and universal jurisdiction, precedents on imprisonment and persecution, the Convention against Torture, and the facts that connect Hong Kong to a forum.</p></a>
        <a class="doccard" href="#tm"><span class="n">6</span><div class="k">Section 6</div><h3>Translated Materials</h3><p>English translations of ${c.tm} Chinese-language exhibits: press releases, transcripts of official remarks, court reporting and news coverage.</p></a>
        <a class="doccard" href="#about"><span class="n">7</span><div class="k">Section 7</div><h3>About &amp; Copyright Declaration</h3><p>What this edition is, what is licensed under CC BY 4.0, what belongs to third parties, and how to cite a paragraph or an exhibit.</p></a>
      </div>
      <div class="prose">
        <h2>How to read this edition</h2>
        <p>The text is the final text of the four documents, unchanged. The web edition adds a layer of navigation on top of it: paragraph numbers are links, exhibit citations such as ${exChip('F5')} open the exhibit in the side panel, every exhibit lists the paragraphs that rely on it, and the persons profiled link to the cases they sat in.</p>
        <p>To cite a paragraph, click its number to copy a permanent link — for example <code>#fs-256</code> for paragraph 256 of the Factual Summary, <code>#il-john-lee-ka-chiu-4-4</code> for paragraph [4.4] of the John Lee profile, or <code>#ex-F5</code> for Exhibit F5.</p>
        <p class="small">Text written by the author is licensed under <a href="#about">CC BY 4.0</a>.</p>
      </div>`;
  }
  function countCitations() { let n = 0; Object.values(FSP).forEach(x => { n += x.p.cites.length; }); D.il.persons.forEach(p => walkIL(p, b => { n += b.cites.length; })); return n; }
  function walkIL(p, fn) { p.sections.forEach(s => s.blocks.forEach(b => { if (b.k === 'case') b.blocks.forEach(fn); else fn(b); })); }

  /* ---------------- FACTUAL SUMMARY ---------------- */
  const FSHEAD = {
    fs: { eyebrow: 'Section 1 · ' + D.meta.title, h1: 'Factual Summary', lede: 'The complete text in fourteen Parts: jurisdiction, the Article 7 framework, the 2019 crackdown and its accountability failures, the national-security system, representative cases, the treatment of prisoners, the extraterritorial programme, United Nations findings, precedents, admissibility and the persons identified. Paragraph numbers are permanent links; exhibit citations open in the side panel. The legal material of Parts 1 and 12 is also laid out as the International Law for Political Repression Timeline.' },
    law: { eyebrow: 'Section 5 · Chronology', h1: 'International Law for Political Repression Timeline', lede: 'One chronology of the law that reaches this record: the treaties and legislation that found jurisdiction by territory, nationality and universal jurisdiction; the judgments establishing that imprisonment and persecution through legal institutions are crimes against humanity; contemporary ICC proceedings; torture and crimes-against-humanity cases in national courts; and the facts that connect Hong Kong to a forum. Each entry links to the paragraphs of the Factual Summary (Parts 1 and 12) and the exhibits it rests on.' },
  };
  function renderFS(view) {
    const h = FSHEAD[view];
    const out = [`<header class="doc-head"><div class="eyebrow">${h.eyebrow}</div><h1>${h.h1}</h1><p class="lede">${h.lede}</p></header>`];
    if (view === 'law') {
      const counts = {}; D.law_events.forEach(e => e.c.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
      out.push(`<div class="chips" id="lawchips">${Object.keys(LCATS).map(c => `<button class="chip btn cat-btn" data-c="${c}">${LCATS[c]} <span class="muted">${counts[c] || 0}</span></button>`).join('')}</div><div id="lawbody"></div>`);
      views[view].innerHTML = out.join('');
      return;
    }
    out.push(`<article class="doc" id="${view}doc">`);
    D.fs.parts.forEach(part => {
      const target = viewOfPart(part.id);
      if (target !== view) return;
      const pid = 'fs-' + part.id;
      out.push(`<h2 id="${pid}">${part.num ? `<span class="partnum">Part ${part.num}</span>` : ''}${esc(part.title)}</h2>`);
      part.sections.forEach(sec => {
        if (sec.title) out.push(`<h3 id="fs-${sec.id}">${sec.letter ? esc(sec.letter) + '. ' : ''}${esc(sec.title)}</h3>`);
        sec.blocks.forEach(b => {
          if (b.k === 'h3') { out.push(`<h4 id="fs-${b.id}">${esc(b.title)}</h4>`); return; }
          if (b.n == null) { out.push(`<div class="para"><span class="pn"></span><div class="pbody">${b.html}${renderChildren(b.children)}</div></div>`); return; }
          out.push(`<div class="para" id="fs-${b.n}" data-n="${b.n}"><a class="pn" href="#fs-${b.n}" title="Copy link to paragraph ${b.n}">${b.n}</a><div class="pbody">${b.html}${renderChildren(b.children)}</div></div>`);
        });
      });
    });
    out.push('</article>');
    views[view].innerHTML = out.join('');
  }
  function fsNav(view) {
    const out = [`<h5>${FSHEAD[view].h1}</h5>`];
    if (view === 'law') {
      out.push('<a href="#law" data-lcat="">All entries</a>' + Object.keys(LCATS).map(c => `<a class="sub" href="#law" data-lcat="${c}"><span class="dot" data-c="${c}"></span>${LCATS[c]}</a>`).join(''));
      out.push('<h5>Years</h5>' + Array.from(new Set(D.law_events.map(e => e.d.slice(0, 4)))).map(y => `<a class="sub" href="#law" data-lyear="${y}"><span class="num">${y}</span>${fmtCount(D.law_events.filter(e => e.d.startsWith(y)).length, 'entry', 'entries')}</a>`).join(''));
      out.push('<h5>Source text</h5><a href="#fs-part-1">FS Part 1 · Jurisdiction</a><a href="#fs-part-12">FS Part 12 · Precedents</a><a href="#timeline">Hong Kong Situation Timeline</a>');
      return out.join('');
    }
    D.fs.parts.forEach(part => {
      if (viewOfPart(part.id) !== view) return;
      out.push(`<a href="#fs-${part.id}" data-spy="fs-${part.id}"><span class="num">${part.num ? 'P' + part.num : '§'}</span>${esc(part.title)}</a>`);
      part.sections.forEach(sec => { if (sec.title) out.push(`<a class="sub" href="#fs-${sec.id}" data-spy="fs-${sec.id}">${sec.letter ? sec.letter + '. ' : ''}${esc(sec.title)}</a>`); });
    });
    out.push('<h5>Timelines</h5><a href="#timeline">Hong Kong Situation Timeline</a><a href="#law">International Law for Political Repression Timeline</a>');
    return out.join('');
  }

  /* ---------------- INDIVIDUAL LIABILITY ---------------- */
  function renderILIndex() {
    const ex = D.persons.filter(p => p.kind === 'executive'), ju = D.persons.filter(p => p.kind === 'judicial');
    const card = p => `<a class="person-card" href="#il-${p.id}"><div class="nm">${esc(p.name)}${p.zh ? `<span class="zh">${esc(p.zh)}</span>` : ''}</div><div class="rl">${esc(p.role)}</div><div class="ft"><span class="chip">${fmtCount(p.exhibits.length, 'exhibit', 'exhibits')}</span>${p.cases.length ? `<span class="chip">${fmtCount(p.cases.length, 'case', 'cases')}</span>` : ''}${p.fs_mentions.length ? `<span class="chip">FS ¶ ×${p.fs_mentions.length}</span>` : ''}</div></a>`;
    return `<header class="doc-head"><div class="eyebrow">Section 2 · Summary of Individual Liability</div><h1>Individual Liability</h1><p class="lede">Sixteen persons identified for examination of individual criminal responsibility under Articles 25 and 28 of the Rome Statute. Each profile keeps the numbering of the original ([3.1], [3.1.1] …) so that every paragraph can be cited.</p></header>
      <h3 style="margin:8px 0 10px;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">A. Principal senior executive officials</h3><div class="grid">${ex.map(card).join('')}</div>
      <h3 style="margin:26px 0 10px;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)">B. Judicial and legal officials</h3><div class="grid">${ju.map(card).join('')}</div>`;
  }
  function renderProfile(id) {
    const p = ILP[id], meta = PERSON[id]; if (!p) return '<p class="muted">Profile not found.</p>';
    const anchor = n => `il-${id}-${n.replace(/\./g, '-')}`;
    const para = b => b.n == null ? `<div class="para"><span class="pn"></span><div class="pbody">${b.html}${renderChildren(b.children)}</div></div>`
      : `<div class="para" id="${anchor(b.n)}"><a class="pn" href="#${anchor(b.n)}" title="Copy link to paragraph [${b.n}]">[${b.n}]</a><div class="pbody">${b.html}${renderChildren(b.children)}</div></div>`;
    const out = [`<header class="doc-head"><div class="eyebrow">Section 2 · Individual Liability · <a href="#il">all persons</a></div>
      <div class="profile-head"><div><h1>${esc(p.name)}${meta.zh ? ` <span class="muted" style="font-family:var(--sans);font-weight:400;font-size:1.3rem">${esc(meta.zh)}</span>` : ''}</h1><p class="lede">${esc(meta.role)}</p></div>
      <div class="chips" style="justify-content:flex-end">${meta.kind === 'executive' ? '<span class="chip">Executive</span>' : '<span class="chip">Judicial</span>'}<span class="chip">${fmtCount(meta.exhibits.length, 'exhibit cited', 'exhibits cited')}</span></div></div>
      <dl class="kv" style="margin-top:14px">${meta.born ? `<dt>Born</dt><dd>${esc(meta.born)}</dd>` : ''}${p.positions.length ? `<dt>Positions</dt><dd>${p.positions.map(esc).join('<br>')}</dd>` : ''}${meta.fs_mentions.length ? `<dt>In Factual Summary</dt><dd>${meta.fs_mentions.map(n => `<a href="#fs-${n}" class="mono" style="margin-right:8px">¶${n}</a>`).join('')}</dd>` : ''}<dt>Exhibits</dt><dd class="chips">${meta.exhibits.map(x => exChip(x)).join(' ')}</dd></dl></header><article class="doc il">`];
    p.sections.forEach(s => {
      if (s.num === 1 && !s.blocks.length) return;
      if (s.num === 2 && !s.blocks.length && p.positions.length) return;
      out.push(`<h2 class="il-sec" id="il-${id}-s${s.num}">${s.num}. ${esc(s.title)}</h2>`);
      s.blocks.forEach(b => {
        if (b.k === 'case') { out.push(`<div class="casehead" id="il-${id}-${b.num.replace(/\./g, '-')}"><span class="num">${b.num}</span>${esc(b.title)}</div>`); b.blocks.forEach(x => out.push(para(x))); }
        else out.push(para(b));
      });
    });
    out.push('</article>');
    const idx = D.persons.findIndex(x => x.id === id), prev = D.persons[idx - 1], next = D.persons[idx + 1];
    out.push(`<nav class="rec-nav">${prev ? `<a class="pill" href="#il-${prev.id}">← ${esc(prev.name)}</a>` : '<span></span>'}${next ? `<a class="pill" href="#il-${next.id}">${esc(next.name)} →</a>` : ''}</nav>`);
    return out.join('');
  }
  function ilNav(active) {
    const grp = (label, kind) => `<h5>${label}</h5>` + D.persons.filter(p => p.kind === kind).map(p => `<a href="#il-${p.id}" class="${p.id === active ? 'active' : ''}">${esc(p.name)}</a>`).join('');
    let out = `<h5>Individual Liability</h5><a href="#il" class="${active ? '' : 'active'}">All persons</a>` + grp('Executive', 'executive') + grp('Judicial', 'judicial');
    if (active && ILP[active]) {
      const p = ILP[active];
      out += '<h5>In this profile</h5>' + p.sections.filter(s => s.blocks.length).map(s => `<a class="sub" href="#il-${active}-s${s.num}" data-spy="il-${active}-s${s.num}">${s.num}. ${esc(s.title)}</a>` + s.blocks.filter(b => b.k === 'case').map(b => `<a class="sub" style="padding-left:34px" href="#il-${active}-${b.num.replace(/\./g, '-')}" data-spy="il-${active}-${b.num.replace(/\./g, '-')}">${b.num} ${esc(b.title)}</a>`).join('')).join('');
    }
    return out;
  }

  /* ---------------- EXHIBITS ---------------- */
  const exState = { q: '', sec: '', type: '', year: '', translated: false, uncited: false, sort: 'id', asc: true };
  function renderEXTable() {
    const years = Array.from(new Set(D.exhibits.map(e => e.year).filter(Boolean))).sort((a, b) => b - a);
    return `<header class="doc-head"><div class="eyebrow">Section 3 · Evidence Bundle</div><h1>Evidence Bundle</h1><p class="lede">${D.exhibits.length} exhibits in seven series. Filter, sort, then open a record to read its summary, relevance, links and the paragraphs that cite it.</p></header>
      <div class="chips" id="secchips">${Object.keys(SECNAME).map(l => `<button class="chip sec btn" data-s="${l}" data-sec="${l}">${l} · ${esc(SECNAME[l])} <span class="muted">${D.exhibits.filter(e => e.section === l).length}</span></button>`).join('')}</div>
      <div class="toolbar"><input type="search" id="exq" aria-label="Filter exhibits" placeholder="Filter by title, source, summary, relevance…" autocomplete="off">
        <select id="extype" aria-label="Document type"><option value="">All document types</option>${D.meta.types.map(t => `<option>${esc(t)}</option>`).join('')}</select>
        <select id="exyear" aria-label="Year"><option value="">All years</option>${years.map(y => `<option>${y}</option>`).join('')}</select>
        <button class="chip btn" id="extrans">Has translation</button><button class="chip btn" id="exuncited">Not cited in FS/IL</button>
        <span class="count" id="excount"></span></div>
      <div class="tablewrap"><table class="ex"><thead><tr><th data-k="id">ID</th><th data-k="title">Title · source · type</th><th data-k="sortdate">Date</th><th data-k="cites" title="Paragraphs of the Factual Summary and Individual Liability that cite this exhibit">Cited</th></tr></thead><tbody id="exbody"></tbody></table></div>`;
  }
  function exRows() {
    const q = exState.q.trim().toLowerCase();
    let rows = D.exhibits.filter(e => (!exState.sec || e.section === exState.sec) && (!exState.type || e.type === exState.type) && (!exState.year || String(e.year) === exState.year)
      && (!exState.translated || e.translated) && (!exState.uncited || !(e.cited.fs.length || e.cited.il.length))
      && (!q || (e.id + ' ' + e.title + ' ' + e.source + ' ' + e.summary + ' ' + e.relevance + ' ' + e.type + ' ' + e.date).toLowerCase().includes(q)));
    const k = exState.sort, dir = exState.asc ? 1 : -1;
    const val = e => k === 'cites' ? e.cited.fs.length + e.cited.il.length : k === 'id' ? 0 : (e[k] || '').toString().toLowerCase();
    rows.sort((a, b) => {
      if (k === 'id') return exSort(a.id, b.id) * dir;
      if (k === 'sortdate') { const ea = !a.sortdate, eb = !b.sortdate; if (ea !== eb) return ea ? 1 : -1; }   // undated always last
      const x = val(a), y = val(b); if (x === y) return exSort(a.id, b.id); return (x < y ? -1 : 1) * dir;
    });
    return rows;
  }
  function paintEX() {
    const rows = exRows();
    $('#exbody').innerHTML = rows.map(e => `<tr data-id="${e.id}" data-s="${e.section}" tabindex="0" role="link" aria-label="Open exhibit ${e.id}"><td class="id">${e.id}${e.translated ? ' <span class="chip ok" title="Translation available">譯</span>' : ''}</td><td class="t">${esc(e.title.split('\n')[0])}<div class="sub">${esc(e.source)} · ${esc(e.type)}</div></td><td class="d">${esc(e.date.split('\n')[0])}</td><td class="n">${e.cited.fs.length + e.cited.il.length || '<span class="muted">—</span>'}</td></tr>`).join('');
    $('#excount').textContent = rows.length === D.exhibits.length ? `${rows.length} exhibits` : `${rows.length} of ${D.exhibits.length} exhibits`;
    $$('#secchips .chip').forEach(c => c.classList.toggle('on', c.dataset.sec === exState.sec));
    $('#extrans').classList.toggle('on', exState.translated); $('#exuncited').classList.toggle('on', exState.uncited);
    $$('table.ex th').forEach(th => { th.classList.toggle('sorted', th.dataset.k === exState.sort); th.classList.toggle('asc', th.dataset.k === exState.sort && exState.asc); });
  }
  function wireEX() {
    $('#exq').addEventListener('input', e => { exState.q = e.target.value; paintEX(); });
    $('#extype').addEventListener('change', e => { exState.type = e.target.value; paintEX(); });
    $('#exyear').addEventListener('change', e => { exState.year = e.target.value; paintEX(); });
    $('#extrans').addEventListener('click', () => { exState.translated = !exState.translated; paintEX(); });
    $('#exuncited').addEventListener('click', () => { exState.uncited = !exState.uncited; paintEX(); });
    $('#secchips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; exState.sec = exState.sec === c.dataset.sec ? '' : c.dataset.sec; paintEX(); });
    $('table.ex thead').addEventListener('click', e => { const th = e.target.closest('th'); if (!th) return; if (exState.sort === th.dataset.k) exState.asc = !exState.asc; else { exState.sort = th.dataset.k; exState.asc = th.dataset.k !== 'cites'; } paintEX(); });
    $('#exbody').addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) location.hash = 'ex-' + tr.dataset.id; });
    $('#exbody').addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tr = e.target.closest('tr'); if (tr) { e.preventDefault(); location.hash = 'ex-' + tr.dataset.id; } });
    $('#exbody').addEventListener('mouseover', e => { const tr = e.target.closest('tr'); if (tr && !pinned && window.innerWidth > 1180) previewExhibit(tr.dataset.id, false); });
  }
  function fieldLabel(l) { return l.replace(/Internet Archive Wayback Machine/, 'Wayback Machine'); }
  function renderExhibit(id) {
    const e = EX[id]; if (!e) return `<p class="muted">No exhibit ${esc(id)}.</p>`;
    const idx = EXIDS.indexOf(id), prev = EXIDS[idx - 1], next = EXIDS[idx + 1];
    const fields = e.fields.map(f => {
      if (/^E9\([ab]\)$/.test(f.label)) return `<div class="subhead">${esc(f.label)}</div><dt>Caption</dt><dd>${f.html}${(f.images || []).map(n => imgTag(n, f.text)).join('')}</dd>`;
      const ui = /Hyperlink|Wayback|Archive|Source|Date|Type|Reference|Relevant|Citation|Case|Video|Index|Article|Author|Related/.test(f.label);
      return `<dt>${esc(fieldLabel(f.label) || '—')}</dt><dd class="${ui ? 'ui' : ''}">${f.html}${(f.images || []).map(n => imgTag(n, f.text)).join('')}</dd>`;
    }).join('');
    const fsLinks = e.cited.fs.map(n => `<a class="ref" href="#fs-${n}">¶ ${n}</a><div class="snip">${esc(FSP[n] ? FSP[n].p.text.split('\n')[0] : '')}</div>`).join('');
    const ilLinks = e.cited.il.map(x => `<a class="ref" href="#il-${x.person}-${x.n.replace(/\./g, '-')}">[${x.n}]</a><div class="snip"><b style="font-family:var(--sans);font-weight:500;font-size:.85rem">${esc(x.name)}</b>${x.case ? ` · ${esc(x.case)}` : ''}</div>`).join('');
    const ebLinks = e.cited.eb.map(x => exChip(x)).join(' ');
    return `<div class="rec"><header class="doc-head" style="border:0;margin-bottom:0;padding-bottom:0"><div class="eyebrow">Section 3 · Evidence Bundle · <a href="#ex">all exhibits</a> · Series ${e.section}: ${esc(SECNAME[e.section] || '')}</div>
      <h1 style="font-size:1.6rem"><span class="mono" style="color:var(--ink-3);font-weight:500;font-size:1rem;display:block;margin-bottom:6px">${esc(e.heading)}</span>${esc(e.title)}</h1>
      <div class="actions">${e.primary_url ? `<a class="pill primary" href="${esc(e.primary_url)}" target="_blank" rel="noopener">Open source ↗</a>` : '<span class="pill">No hyperlink in bundle</span>'}${e.links.filter(l => /Wayback|Archive/.test(l.label)).map(l => `<a class="pill" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label.replace('Internet Archive Wayback Machine', 'Wayback').replace(' Webpage Capture', ''))} ↗</a>`).join('')}${e.translated ? `<a class="pill" href="#tm-${e.id}">English translation →</a>` : ''}<button class="pill" data-copy="ex-${e.id}">Copy link</button></div></header>
      <dl class="fields">${fields}</dl>
      <section class="backlinks"><h2>Cited in</h2>
        ${fsLinks ? `<div class="small" style="margin:8px 0 6px">Factual Summary · ${fmtCount(e.cited.fs.length, 'paragraph', 'paragraphs')}</div><div class="bl">${fsLinks}</div>` : ''}
        ${ilLinks ? `<div class="small" style="margin:14px 0 6px">Individual Liability · ${fmtCount(e.cited.il.length, 'paragraph', 'paragraphs')}</div><div class="bl">${ilLinks}</div>` : ''}
        ${ebLinks ? `<div class="small" style="margin:14px 0 6px">Referred to by other exhibits</div><div class="chips">${ebLinks}</div>` : ''}
        ${!fsLinks && !ilLinks ? '<p class="muted small">This exhibit is not cited in the Factual Summary or the Individual Liability profiles.</p>' : ''}</section>
      <nav class="rec-nav">${prev ? `<a class="pill" href="#ex-${prev}">← ${prev}</a>` : '<span></span>'}${next ? `<a class="pill" href="#ex-${next}">${next} →</a>` : ''}</nav></div>`;
  }
  function exNav(active) {
    let out = `<h5>Evidence Bundle</h5><a href="#ex" class="${active ? '' : 'active'}">All exhibits</a>`;
    Object.keys(SECNAME).forEach(l => {
      const ids = EXIDS.filter(i => i[0] === l);
      out += `<h5>${l} · ${esc(SECNAME[l])} <span class="cnt">${ids.length}</span></h5><div class="chips" style="padding:0 6px 4px">${ids.map(i => `<a class="chip" style="display:inline-flex;padding:1px 6px;${i === active ? 'background:var(--accent);color:var(--accent-ink);border-color:var(--accent)' : ''}" href="#ex-${i}">${i}</a>`).join('')}</div>`;
    });
    return out;
  }

  /* ---------------- TRANSLATED MATERIALS ---------------- */
  function renderTMList() {
    return `<header class="doc-head"><div class="eyebrow">Section 6 · Translated Materials</div><h1>Translated Materials</h1><p class="lede">English translations of ${D.tm.entries.length} Chinese-language exhibits. Each entry links back to its exhibit record and to the paragraphs that quote it.</p></header>
      ${D.tm.entries.map(t => `<a class="tm-entry" href="#tm-${t.id}"><div><span class="chip sec" data-s="${t.id[0]}">${t.id}</span></div><div><div class="t">${esc(t.title.split('\n')[0])}</div>${t.title.split('\n')[1] ? `<div class="m" style="font-family:var(--serif);color:var(--ink-2)">${esc(t.title.split('\n').slice(1).join(' '))}</div>` : ''}<div class="m">${esc(t.source)} · ${esc(t.date)} · ${esc(t.type)} · ${t.words.toLocaleString()} words${t.has_original ? ' · original text included' : ''}</div></div></a>`).join('')}`;
  }
  function tmBody(blocks) { return blocks.map(b => b.k === 'h' ? `<h5>${b.html}</h5>` : b.k === 'quote' ? `<blockquote>${b.html}</blockquote>` : b.k === 'ol' ? `<ol start="${b.start || 1}">${b.items.map(i => `<li>${i.html}</li>`).join('')}</ol>` : b.k === 'ul' ? `<ul>${b.items.map(i => `<li>${i.html}</li>`).join('')}</ul>` : `<p>${b.html}</p>`).join(''); }
  function renderTM(id) {
    const t = TM[id], e = EX[id]; if (!t) return '<p class="muted">No translation.</p>';
    const idx = D.tm.entries.findIndex(x => x.id === id), prev = D.tm.entries[idx - 1], next = D.tm.entries[idx + 1];
    const cited = e ? e.cited.fs : [];
    return `<div class="rec"><header class="doc-head"><div class="eyebrow">Section 6 · Translated Materials · <a href="#tm">all translations</a></div>
      <h1 style="font-size:1.5rem">${esc(t.title.split('\n')[0])}</h1>${t.title.split('\n')[1] ? `<p class="lede" style="font-family:var(--serif)">${esc(t.title.split('\n').slice(1).join(' '))}</p>` : ''}
      <dl class="fields" style="margin-top:14px">${t.fields.filter(f => f.label !== 'Title').map(f => `<dt>${esc(fieldLabel(f.label))}</dt><dd class="ui">${f.html}</dd>`).join('')}</dl>
      <div class="actions"><a class="pill primary" href="#ex-${id}">Exhibit record ${id} →</a>${cited.length ? `<span class="pill">Cited in FS ${cited.map(n => `<a href="#fs-${n}">¶${n}</a>`).join(', ')}</span>` : ''}<button class="pill" data-copy="tm-${id}">Copy link</button></div></header>
      ${t.has_original ? `<div class="tm-cols"><div><div class="lbl">${esc(t.marker || 'Translation')}</div><div class="tm-body">${tmBody(t.body)}</div></div><div lang="zh-Hant"><div class="lbl" lang="en">${esc(t.original_marker || 'Original')}</div><div class="tm-body">${tmBody(t.original)}</div></div></div>`
        : `<div class="lbl mono small" style="letter-spacing:.08em;text-transform:uppercase;font-size:.7rem;color:var(--ink-3);border-bottom:1px solid var(--line);padding-bottom:6px">${esc(t.marker || 'Translation')}</div><div class="tm-body">${tmBody(t.body)}</div>`}
      <nav class="rec-nav">${prev ? `<a class="pill" href="#tm-${prev.id}">← ${prev.id}</a>` : '<span></span>'}${next ? `<a class="pill" href="#tm-${next.id}">${next.id} →</a>` : ''}</nav></div>`;
  }
  function tmNav(active) { return `<h5>Translated Materials</h5><a href="#tm" class="${active ? '' : 'active'}">All translations</a>` + D.tm.entries.map(t => `<a href="#tm-${t.id}" class="${t.id === active ? 'active' : ''}"><span class="num">${t.id}</span>${esc(t.title.split('\n')[0]).slice(0, 48)}${t.title.split('\n')[0].length > 48 ? '…' : ''}</a>`).join(''); }

  /* ---------------- TIMELINE ---------------- */
  const tlState = { cats: new Set() };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function evDate(d) { const [y, m, day] = d.split('-'); return day ? `${+day} ${MONTHS[+m - 1]}` : m ? MONTHS[+m - 1] : ''; }
  function renderTimeline() {
    const counts = {}; D.events.forEach(e => e.c.forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    return `<header class="doc-head"><div class="eyebrow">Section 4 · Chronology</div><h1>Hong Kong Situation Timeline</h1><p class="lede">${D.events.length} dated events drawn from the four documents, from the Basic Law to the most recent sentences: the laws and institutions of the national-security system, incidents, cases and measures, what officials said, and what courts and United Nations bodies found. Every entry links to the paragraphs and exhibits it rests on.</p></header>
      <div class="chips" id="tlchips">${Object.keys(CATS).map(c => `<button class="chip btn cat-btn" data-c="${c}">${CATS[c]} <span class="muted">${counts[c] || 0}</span></button>`).join('')}</div><div id="tlbody"></div>`;
  }
  function evRefs(e) {
    const parts = [];
    if (e.fs.length) parts.push(`<span class="lab">FS</span>` + e.fs.map(n => `<a class="ref" href="#fs-${n}" title="${esc(FSP[n] ? FSP[n].p.text.slice(0, 160) : '')}">¶${n}</a>`).join(''));
    if (e.il.length) parts.push(`<span class="lab">IL</span>` + e.il.map(r => { const [pid, n] = r.split(':'); return `<a class="ref" href="#il-${pid}-${n.replace(/\./g, '-')}" title="${esc(PERSON[pid] ? PERSON[pid].name : pid)}">${esc(shortName(PERSON[pid] ? PERSON[pid].name : pid))} [${n}]</a>`; }).join(''));
    if (e.ex.length) parts.push(`<span class="lab">Exhibits</span>` + e.ex.map(x => exChip(x)).join(' '));
    return parts.join('<span style="width:6px"></span>');
  }
  function paintTL() {
    const act = tlState.cats;
    const rows = D.events.filter(e => !act.size || e.c.some(c => act.has(c)));
    const groups = []; let g = null;
    rows.forEach(e => { const y = e.d.slice(0, 4); if (!g || g.y !== y) { g = { y, items: [] }; groups.push(g); } g.items.push(e); });
    $('#tlbody').innerHTML = groups.map(gr => `<div class="tl-year" id="tl-${gr.y}"><div class="y">${gr.y}<small>${fmtCount(gr.items.length, 'event', 'events')}</small></div><div>${gr.items.map(e => `<div class="ev" data-c="${e.c[0]}"><div class="d">${evDate(e.d)}</div><div><div class="t">${esc(e.t)}${e.c.map(c => `<span class="cat" data-c="${c}">${CATSHORT[c]}</span>`).join('')}</div><div class="x">${esc(e.x)}</div><div class="r">${evRefs(e)}</div></div></div>`).join('')}</div></div>`).join('') || '<p class="muted">No events in this category.</p>';
    $$('#tlchips .chip').forEach(c => c.classList.toggle('on', act.has(c.dataset.c)));
  }
  const lawState = { cats: new Set() };
  function paintLaw() {
    const act = lawState.cats;
    const rows = D.law_events.filter(e => !act.size || e.c.some(c => act.has(c)));
    const groups = []; let g = null;
    rows.forEach(e => { const y = e.d.slice(0, 4); if (!g || g.y !== y) { g = { y, items: [] }; groups.push(g); } g.items.push(e); });
    const refs = e => {
      const parts = [];
      if (e.fs.length) parts.push(`<span class="lab">FS</span>` + e.fs.map(n => `<a class="ref" href="#fs-${n}" title="${esc(FSP[n] ? FSP[n].p.text.slice(0, 160) : '')}">¶${n}</a>`).join(''));
      if (e.ex.length) parts.push(`<span class="lab">Exhibits</span>` + e.ex.map(x => exChip(x)).join(' '));
      if (e.url) parts.push(`<a class="ext" href="${esc(e.url)}" target="_blank" rel="noopener" title="${esc(e.url)}">${esc(e.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])} ↗</a>`);
      return parts.join('<span style="width:6px"></span>');
    };
    $('#lawbody').innerHTML = groups.map(gr => `<div class="tl-year" id="law-${gr.y}"><div class="y">${gr.y}<small>${fmtCount(gr.items.length, 'entry', 'entries')}</small></div><div>${gr.items.map(e => `<div class="ev" data-c="${e.c[0]}"><div class="d">${evDate(e.d)}</div><div><div class="t">${esc(e.t)}${e.c.map(c => `<span class="cat" data-c="${c}">${CATSHORT[c]}</span>`).join('')}</div><div class="x">${esc(e.x)}</div><div class="r">${refs(e)}</div></div></div>`).join('')}</div></div>`).join('') || '<p class="muted">No entries in this category.</p>';
    $$('#lawchips .chip').forEach(c => c.classList.toggle('on', act.has(c.dataset.c)));
  }
  function tlNav() { const years = Array.from(new Set(D.events.map(e => e.d.slice(0, 4)))); return '<h5>Years</h5>' + years.map(y => `<a href="#timeline" data-year="${y}"><span class="num">${y}</span>${fmtCount(D.events.filter(e => e.d.startsWith(y)).length, 'event', 'events')}</a>`).join('') + '<h5>Categories</h5>' + Object.keys(CATS).map(c => `<a href="#timeline" data-cat="${c}"><span class="dot" data-c="${c}"></span>${CATS[c]}</a>`).join(''); }

  /* ---------------- ABOUT ---------------- */
  function renderAbout() {
    return `<header class="doc-head"><div class="eyebrow">Section 7</div><h1>About &amp; Copyright Declaration</h1><p class="lede">${esc(D.meta.title)}. Compiled and written by Jeffrey Leung.</p></header>
      <div class="prose">
        <h2>Licence</h2>
        <div class="licence"><div class="cc">CC BY 4.0</div><div><p style="margin:0">The text written by the author — the Factual Summary, the Summary of Individual Liability, the summaries and relevance notes of the Evidence Bundle, the English translations in the Translated Materials, the two timelines and this web edition — is licensed under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International licence</a>. You may copy, redistribute, adapt and build upon it for any purpose, including commercially, provided you give appropriate credit, link to the licence and indicate if changes were made.</p>
        <p class="small" style="margin-top:10px">Suggested attribution: Jeffrey Leung, <i>${esc(D.meta.title)}</i> (${D.meta.built.slice(0, 4)}), licensed under CC BY 4.0.</p></div></div>
        <h2>Third-party material</h2>
        <p>The source documents referred to in the Evidence Bundle — legislation, judgments, press releases, United Nations documents, news reports, photographs and recordings — are the work of their respective authors and publishers and are not covered by the licence above. They are linked to at their original locations and, where available, at an archive capture. Short passages are quoted, and Chinese-language texts are reproduced in the Translated Materials, for the purposes of evidence, translation and criticism; the two photographs in Exhibit E9 are reproduced from The Guardian and AP News with attribution.</p>
        <h2>The documents</h2>
        <p>The four documents are a <b>Factual Summary</b> (${D.meta.counts.fs_paragraphs} numbered paragraphs), a <b>Summary of Individual Liability</b> (${D.meta.counts.persons} persons), an <b>Evidence Bundle</b> (${D.meta.counts.exhibits} exhibits) and <b>Translated Materials</b> (${D.meta.counts.tm} translations). This web edition reproduces their final text without change and adds navigation: permanent links for every paragraph and exhibit, cross-references between the documents, a filterable Evidence Bundle and two chronologies. The jurisdictional analysis (Part 1) and the international criminal law precedents (Part 12) of the Factual Summary are also laid out as the <a href="#law">International Law for Political Repression Timeline</a>, so that the legal routes — the International Criminal Court, universal jurisdiction before national courts, and the Convention against Torture — can be surveyed on their own.</p>
        <h2>Permanent links</h2>
        <p>Click any paragraph number to copy its link. Links take the form <code>#fs-256</code> (Factual Summary ¶ 256), <code>#il-chris-tang-ping-keung-4-5</code> (Individual Liability, Chris Tang, [4.5]), <code>#ex-F5</code> (Exhibit F5) and <code>#tm-F5</code> (translation of Exhibit F5).</p>
      </div>`;
  }

  /* ---------------- INSPECTOR ---------------- */
  function inspectorHTML(e, isPinned) {
    const sum = strip(e.summary);
    return `<div class="ins"><div class="ins-head">${secChip(e.section)}<span class="pinned">${isPinned ? 'pinned' : 'preview'}</span><button class="iconbtn close" data-close aria-label="Close">✕</button></div>
      <div class="mono" style="font-size:.8rem;color:var(--ink-3)">${esc(e.heading)}</div>
      <div class="ins-title">${esc(e.title.split('\n')[0])}</div>
      <div class="ins-meta">${e.source ? `<span class="chip">${esc(e.source.replace(/\s*\(.*$/, ''))}</span>` : ''}${e.date ? `<span class="chip">${esc(e.date.split('\n')[0])}</span>` : ''}${e.type ? `<span class="chip">${esc(e.type)}</span>` : ''}${e.translated ? '<span class="chip ok">譯 translation</span>' : ''}</div>
      ${e.images.length ? imgTag(e.images[0], e.title) : ''}
      ${sum ? `<h6>Summary</h6><div class="txt clamp" data-clamp>${esc(sum)}</div><button class="more" data-more>Show more</button>` : ''}
      ${e.relevance ? `<h6>Relevance</h6><div class="txt clamp" data-clamp>${esc(strip(e.relevance))}</div><button class="more" data-more>Show more</button>` : ''}
      ${e.cited.fs.length ? `<h6>Cited in Factual Summary</h6><div class="cites">${e.cited.fs.map(n => `<a href="#fs-${n}">¶${n}</a>`).join('')}</div>` : ''}
      ${e.cited.il.length ? `<h6>Cited in Individual Liability</h6><div class="cites">${e.cited.il.map(x => `<a href="#il-${x.person}-${x.n.replace(/\./g, '-')}" title="${esc(x.name)}">${esc(shortName(x.name))} [${x.n}]</a>`).join('')}</div>` : ''}
      <div class="actions"><a class="pill primary" href="#ex-${e.id}">Full record →</a>${e.primary_url ? `<a class="pill" href="${esc(e.primary_url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}${e.translated ? `<a class="pill" href="#tm-${e.id}">Translation</a>` : ''}</div></div>`;
  }
  function shortName(n) { const m = n.match(/([A-Z][A-Z'’]+(?: [A-Z][A-Z'’]+)?)/); return m ? (m[1].charAt(0) + m[1].slice(1).toLowerCase()).replace(/([ '’])([a-z])/g, (a, b, c) => b + c.toUpperCase()) : n; }
  function previewExhibit(id, pin) {
    const e = EX[id]; if (!e) return;
    if (!pin && pinned) return;
    insp.innerHTML = inspectorHTML(e, !!pin);
    insp.scrollTop = 0;
    if (pin) { pinned = id; insp.classList.add('open'); document.body.classList.add('sheet-open'); }
    $$('a.ex.on').forEach(a => a.classList.remove('on'));
    if (pin) $$(`a.ex[data-ex="${id}"]`, views[curView]).forEach(a => a.classList.add('on'));
  }
  function closeInspector() { pinned = null; insp.classList.remove('open'); document.body.classList.remove('sheet-open'); $$('a.ex.on').forEach(a => a.classList.remove('on')); if (window.innerWidth > 1180) insp.innerHTML = `<div class="ph">Hover over or click any exhibit citation — for example ${exChip('F5')} — to preview the exhibit here without leaving the paragraph you are reading.</div>`; }

  /* ---------------- ROUTER ---------------- */
  function canonEx(id) { const u = String(id || '').toUpperCase().replace(/\s+/g, ''); return EX[u] ? u : id; }
  function parseHash() {
    let h = (location.hash || '#home').slice(1);
    h = h.replace(/^([A-Za-z]+)-/, (m, p) => p.toLowerCase() + '-');
    if (/^(ex|tm)-/i.test(h)) h = h.slice(0, 3) + canonEx(h.slice(3));
    if (/^il-/i.test(h)) h = h.toLowerCase();
    if (h === '' || h === 'home') return { v: 'home' };
    if (h === 'fs') return { v: 'fs' };
    if (h === 'law' || h === 'jur' || h === 'prec') return { v: 'law' };
    if (/^fs-/.test(h)) {
      const m = h.match(/^fs-(\d+)$/);
      if (m) { const x = FSP[+m[1]]; return { v: x ? viewOfPart(x.part.id) : 'fs', target: h }; }
      const pm = h.match(/^fs-(part-\d+|executive-summary|front)/);
      return { v: pm ? viewOfPart(pm[1]) : 'fs', target: h };
    }
    if (h === 'il') return { v: 'il' };
    if (/^il-/.test(h)) { const rest = h.slice(3); const pid = D.persons.map(p => p.id).filter(id => rest === id || rest.startsWith(id + '-')).sort((a, b) => b.length - a.length)[0]; return pid ? { v: 'il', person: pid, target: rest !== pid ? h : null } : { v: 'il' }; }
    if (h === 'ex') return { v: 'ex' };
    if (/^ex-/.test(h)) return { v: 'ex', ex: h.slice(3) };
    if (h === 'tm') return { v: 'tm' };
    if (/^tm-/.test(h)) return { v: 'tm', tm: h.slice(3) };
    if (h === 'timeline') return { v: 'timeline' };
    if (h === 'about') return { v: 'about' };
    return { v: 'home' };
  }
  const subState = { il: null, ex: null, tm: null };
  function route() {
    const r = parseHash();
    if (curView) scrollMemo[curView + ':' + (subState[curView] || '')] = window.scrollY;
    Object.keys(views).forEach(k => { views[k].hidden = k !== r.v; });
    $$('#tabs a').forEach(a => { if (a.dataset.v === r.v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    side.classList.remove('open');
    if (window.innerWidth <= 1180) { insp.classList.remove('open'); document.body.classList.remove('sheet-open'); }
    let navHTML = '';
    const generalNav = `<h5>Sections</h5><a href="#fs"><span class="num">1</span>Factual Summary</a><a href="#il"><span class="num">2</span>Individual Liability</a><a href="#ex"><span class="num">3</span>Evidence Bundle</a><a href="#timeline"><span class="num">4</span>Hong Kong Situation Timeline</a><a href="#law"><span class="num">5</span>International Law for Political Repression Timeline</a><a href="#tm"><span class="num">6</span>Translated Materials</a><a href="#about"><span class="num">7</span>About &amp; Copyright Declaration</a>`;
    if (r.v === 'home' || r.v === 'about') navHTML = generalNav;
    if (r.v === 'fs' || r.v === 'law') { navHTML = fsNav(r.v); if (r.v === 'law' && !$('#lawbody').innerHTML) { $('#lawchips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; const k = c.dataset.c; if (lawState.cats.has(k)) lawState.cats.delete(k); else lawState.cats.add(k); paintLaw(); }); paintLaw(); } }
    if (r.v === 'il') {
      navHTML = ilNav(r.person || null);
      const key = r.person || '';
      if (subState.il !== key) { views.il.innerHTML = r.person ? renderProfile(r.person) : renderILIndex(); subState.il = key; hydrateImages(views.il); }
    }
    if (r.v === 'ex') {
      navHTML = exNav(r.ex || null);
      const key = r.ex || '';
      if (subState.ex !== key) { if (r.ex) { views.ex.innerHTML = renderExhibit(r.ex); hydrateImages(views.ex); views.ex.classList.remove('wide'); } else { views.ex.innerHTML = renderEXTable(); wireEX(); paintEX(); views.ex.classList.add('wide'); } subState.ex = key; }
    }
    if (r.v === 'tm') {
      navHTML = tmNav(r.tm || null);
      const key = r.tm || '';
      if (subState.tm !== key) { views.tm.innerHTML = r.tm ? renderTM(r.tm) : renderTMList(); subState.tm = key; }
    }
    if (r.v === 'timeline') { navHTML = tlNav(); if (!views.timeline.innerHTML) { views.timeline.innerHTML = renderTimeline(); $('#tlchips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; const k = c.dataset.c; if (tlState.cats.has(k)) tlState.cats.delete(k); else tlState.cats.add(k); paintTL(); }); paintTL(); } }
    if (r.v === 'about' && !views.about.innerHTML) views.about.innerHTML = renderAbout();
    side.innerHTML = navHTML;
    curView = r.v;
    // scroll
    const target = r.target || null;
    requestAnimationFrame(() => {
      if (target) { const el = document.getElementById(target); if (el) { el.scrollIntoView({ block: 'start' }); if (el.classList.contains('para')) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 2400); } } return; }
      const memo = scrollMemo[r.v + ':' + (subState[r.v] || '')];
      const listView = ['fs', 'law', 'timeline', 'home', 'about'].includes(r.v) || (['ex', 'il', 'tm'].includes(r.v) && !subState[r.v]);
      window.scrollTo(0, (listView && memo != null) ? memo : 0);
    });
    setTitle(r);
    if (r.v === 'ex' && r.ex) { closeInspector(); }
    spy();
  }

  function setTitle(r) {
    const base = 'Crimes Against Humanity in Hong Kong';
    let t = '';
    if (r.v === 'fs') { const m = (r.target || '').match(/^fs-(\d+)$/); t = m ? `Factual Summary ¶ ${m[1]}` : 'Factual Summary'; }
    else if (r.v === 'il') t = r.person && PERSON[r.person] ? PERSON[r.person].name + ' · Individual Liability' : 'Individual Liability';
    else if (r.v === 'ex') t = r.ex && EX[r.ex] ? `Exhibit ${r.ex} · ${EX[r.ex].title.split('\n')[0]}` : 'Evidence Bundle';
    else if (r.v === 'tm') t = r.tm ? `Translation · Exhibit ${r.tm}` : 'Translated Materials';
    else if (r.v === 'timeline') t = 'Hong Kong Situation Timeline'; else if (r.v === 'law') t = 'International Law for Political Repression Timeline'; else if (r.v === 'about') t = 'About & Copyright Declaration';
    try { document.title = t ? `${t} — ${base}` : base; } catch (err) { }
  }

  /* scroll-spy for the side map */
  let spyTargets = [];
  function spy() { spyTargets = $$('[data-spy]', side).map(a => ({ a, el: document.getElementById(a.dataset.spy) })).filter(x => x.el); onScroll(); }
  function onScroll() {
    if (!spyTargets.length) return;
    const y = window.scrollY + 90; let best = null;
    for (const t of spyTargets) { if (t.el.offsetTop <= y) best = t; else break; }
    spyTargets.forEach(t => t.a.classList.toggle('active', t === best));
    if (best && best.a.offsetTop < side.scrollTop || best && best.a.offsetTop > side.scrollTop + side.clientHeight - 40) side.scrollTop = best.a.offsetTop - 120;
  }
  window.addEventListener('scroll', () => { if (!onScroll._t) onScroll._t = setTimeout(() => { onScroll._t = null; onScroll(); }, 80); }, { passive: true });

  /* ---------------- EVENTS ---------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a.ex');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); previewExhibit(a.dataset.ex, true); return; }
    const pn = e.target.closest('a.pn');
    if (pn) { e.preventDefault(); const hash = pn.getAttribute('href').slice(1); history.replaceState(null, '', '#' + hash); copyText(linkFor(hash)); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) { copyText(linkFor(cp.dataset.copy)); return; }
    if (e.target.closest('[data-close]')) { closeInspector(); return; }
    if (e.target.closest('#sheetbg')) { closeInspector(); return; }
    const more = e.target.closest('[data-more]');
    if (more) { const box = more.previousElementSibling; const open = box.classList.toggle('clamp'); more.textContent = open ? 'Show more' : 'Show less'; return; }
    const yl = e.target.closest('a[data-year]');
    if (yl) { e.preventDefault(); const el = document.getElementById('tl-' + yl.dataset.year); if (el) el.scrollIntoView({ block: 'start' }); return; }
    const cl = e.target.closest('a[data-cat]');
    if (cl) { e.preventDefault(); tlState.cats = new Set([cl.dataset.cat]); paintTL(); window.scrollTo(0, 0); return; }
    const ll = e.target.closest('a[data-lcat]');
    if (ll) { e.preventDefault(); lawState.cats = ll.dataset.lcat ? new Set([ll.dataset.lcat]) : new Set(); paintLaw(); window.scrollTo(0, 0); return; }
    const ly = e.target.closest('a[data-lyear]');
    if (ly) { e.preventDefault(); const el = document.getElementById('law-' + ly.dataset.lyear); if (el) el.scrollIntoView({ block: 'start' }); return; }
    if (!e.target.closest('#side') && !e.target.closest('#menubtn')) side.classList.remove('open');
    const same = e.target.closest('a[href^="#"]');
    if (same && same.getAttribute('href') === location.hash && !e.metaKey && !e.ctrlKey) { e.preventDefault(); route(); }   // re-run the route when the hash would not change
  });
  document.addEventListener('mouseover', e => {
    if (window.innerWidth <= 1180 || pinned) return;
    const a = e.target.closest('a.ex'); if (!a) return;
    clearTimeout(hoverTimer); hoverTimer = setTimeout(() => previewExhibit(a.dataset.ex, false), 120);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (pinned) closeInspector(); else side.classList.remove('open'); return; }
  });
  $('#menubtn').addEventListener('click', e => { e.stopPropagation(); side.classList.toggle('open'); });
  $('#themebtn').addEventListener('click', () => {
    const root = document.documentElement; const cur = root.getAttribute('data-theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
    root.setAttribute('data-theme', next); try { localStorage.setItem('theme', next); } catch (err) { }
  });
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (err) { }
  window.addEventListener('hashchange', route);

  /* ---------------- BOOT ---------------- */
  try { if (!document.documentElement.lang) document.documentElement.lang = 'en'; } catch (err) { }
  const fitTopbar = () => { const h = document.querySelector('.topbar').offsetHeight; if (h) document.documentElement.style.setProperty('--topbar', h + 'px'); };
  window.addEventListener('resize', () => { clearTimeout(fitTopbar._t); fitTopbar._t = setTimeout(fitTopbar, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTopbar);
  fitTopbar();
  renderHome(); renderFS('fs'); renderFS('law'); hydrateImages(views.fs);
  route();
}

/* ---- boot: inline data (single-file build) or JSON files next to the page (multi-file build) ---- */
(function () {
  const inline = document.getElementById('data');
  if (inline) { startApp(JSON.parse(inline.textContent)); return; }
  const files = ['fs', 'exhibits', 'il', 'tm', 'persons', 'meta', 'events', 'law_events'];
  const main = document.getElementById('main');
  const note = document.createElement('p'); note.className = 'loading'; note.textContent = 'Loading the record…'; main.appendChild(note);
  Promise.all(files.map(k => fetch('data/' + k + '.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(k + ' ' + r.status); return r.json(); })))
    .then(parts => { const D = {}; files.forEach((k, i) => { D[k] = parts[i]; }); note.remove(); startApp(D); })
    .catch(err => { note.innerHTML = '<b>The record could not be loaded.</b><br>' + (location.protocol === 'file:' ? 'This page reads its data from the <code>data/</code> folder, which browsers block when the page is opened directly from disk. Serve the folder over HTTP (for example <code>python3 -m http.server</code> in this folder, then open <code>http://localhost:8000/</code>) or open the published site.' : 'Error: ' + String(err.message || err)); });
})();
