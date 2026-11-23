/* RSA-2048 hardware landscape: physical qubits vs. time to factor, log–log.
   Data: _data/shor_hardware_estimates.yml (checked against the primary papers). */
(() => {
  const root = document.querySelector('[data-landscape]');
  if (!root) return;
  const data = JSON.parse(root.querySelector('[data-landscape-data]').textContent);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = root.querySelector('svg');
  const inspector = root.querySelector('[data-landscape-detail]');
  const yearInput = root.querySelector('[data-landscape-year]');
  const yearOut = root.querySelector('[data-landscape-year-out]');
  const play = root.querySelector('[data-landscape-play]');
  const allOurs = root.querySelector('[data-landscape-all-ours]');
  const variantsBox = root.querySelector('[data-landscape-variants]');
  const seriesOf = id => data.series.find(x => x.id === id);
  const chips = root.querySelector('[data-landscape-families]');
  const views = root.querySelector('[data-landscape-view]');
  const log = Math.log10;

  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const qfmt = q => q >= 1e9 ? `${+(q / 1e9).toFixed(1)}B` : q >= 1e6 ? `${+(q / 1e6).toFixed(2)}M` : `${+(q / 1e3).toFixed(1)}k`;
  const qfull = q => Math.round(q).toLocaleString('en-US');
  const famName = id => data.families.find(f => f.id === id)?.name ?? id;

  const VIEWS = {
    recent: { x: [8e3, 4e6], y: [0.03, 7e4], label: 'Recent (2021–2026)' },
    all: { x: [8e3, 1.5e10], y: [0.03, 7e4], label: 'All since 2009' },
  };
  let view = 'recent';
  let year = 2026;
  let pinned = null;
  let timer = null;
  const hidden = new Set();

  /* Tooltip */
  const tip = document.createElement('div');
  tip.className = 'shor-tip';
  tip.hidden = true;
  document.body.append(tip);
  const showTip = (e, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x, y;
    if (e.type === 'focus') { const b = e.target.getBoundingClientRect(); x = b.right + 8; y = b.top - 6; }
    else { x = e.clientX + 14; y = e.clientY + 14; }
    if (x + r.width > innerWidth - 8) x = Math.max(8, x - r.width - 28);
    if (y + r.height > innerHeight - 8) y = Math.max(8, y - r.height - 28);
    tip.style.transform = `translate(${x}px,${y}px)`;
  };
  const hideTip = () => { tip.hidden = true; };
  addEventListener('scroll', hideTip, { passive: true });

  /* Controls */
  chips.innerHTML = data.families.map(f => `<button type="button" class="ls-chip" data-family="${f.id}" aria-pressed="true"><i class="fam-${f.id}"></i>${esc(f.name)}</button>`).join('');
  chips.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!on));
    on ? hidden.add(b.dataset.family) : hidden.delete(b.dataset.family);
    draw();
  }));
  views.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    views.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    view = b.dataset.view;
    draw();
  }));
  yearInput.addEventListener('input', () => { stop(); year = Number(yearInput.value); draw(); });
  allOurs.addEventListener('change', draw);
  variantsBox.addEventListener('change', draw);
  const stop = () => { clearInterval(timer); timer = null; play.textContent = 'Play ▸'; play.setAttribute('aria-pressed', 'false'); };
  play.addEventListener('click', () => {
    if (timer) return stop();
    view = 'all';
    views.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.view === 'all')));
    const years = [...new Set(data.estimates.map(e => e.year))].sort((a, b) => a - b);
    let i = 0;
    year = years[0];
    play.textContent = 'Pause ❚❚'; play.setAttribute('aria-pressed', 'true');
    draw();
    timer = setInterval(() => {
      i += 1;
      if (i >= years.length) { year = 2026; draw(); return stop(); }
      year = years[i]; draw();
    }, 1100);
  });

  /* Time axis ticks */
  const timeTicks = [[1 / 24, '1 hour'], [1, '1 day'], [7, '1 week'], [30.4, '1 month'], [365.25, '1 year'], [3652.5, '10 years'], [36525, '100 years']];
  const qTicks = [[1e4, '10k'], [1e5, '100k'], [1e6, '1M'], [1e7, '10M'], [1e8, '100M'], [1e9, '1B'], [1e10, '10B']];

  function detail(item) {
    if (!item) {
      inspector.innerHTML = `<p class="shor-detail-kicker">How to read it</p><h4>Lower and further left is cheaper</h4><p>Each dot is one published estimate; a line joins operating points of the same paper under the same assumptions, tracing its qubit–time trade-off. ▽ marks a runtime budget (“at most”). Blue stars are our circuits, with an arrow from the reference they improve on. Click any mark for its assumptions and source.</p>`;
      return;
    }
    const ours = item.kind === 'ours';
    inspector.innerHTML = `
      <p class="shor-detail-kicker">${ours ? 'This work · conditional scenario' : `${esc(famName(item.family))} · ${item.year}${item.series ? ` · ${esc(seriesOf(item.series).note)}` : ''}`}</p>
      <h4>${esc(item.name)}</h4>
      ${ours ? `<p class="ls-circuit">${esc(item.circuit)}</p>` : ''}
      <dl>
        <div><dt>Physical qubits</dt><dd>${qfull(item.qubits)}</dd></div>
        <div><dt>Time to factor</dt><dd>${esc(item.time)}</dd></div>
        ${ours ? `<div class="ls-wide"><dt>Reference in the same model</dt><dd class="ls-ref">${esc(item.ref_label)} <b>${item.change > 0 ? '+' : ''}${item.change}%</b></dd></div>` : ''}
      </dl>
      <p>${esc(ours ? item.note : item.assumptions)}</p>
      ${ours ? '' : `<a class="shor-link" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.source)} ↗</a>`}`;
  }

  function focusKey(key) {
    svg.classList.toggle('is-focusing', Boolean(key));
    svg.querySelectorAll('[data-key]').forEach(n => n.classList.toggle('is-hot', n.dataset.key === key));
  }

  function draw() {
    yearOut.textContent = year;
    yearInput.value = year;
    svg.replaceChildren();
    const W = Math.max(320, svg.clientWidth || 800);
    const H = Math.max(320, svg.clientHeight || 520);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 560;
    const m = { l: narrow ? 62 : 74, r: 16, t: 14, b: 44 };
    const { x: [x0, x1], y: [y0, y1] } = VIEWS[view];
    const px = q => m.l + (log(q) - log(x0)) / (log(x1) - log(x0)) * (W - m.l - m.r);
    const py = d => m.t + (log(y1) - log(d)) / (log(y1) - log(y0)) * (H - m.t - m.b);
    const inside = (q, d) => q >= x0 && q <= x1 && d >= y0 && d <= y1;

    const clip = el('clipPath', { id: 'ls-clip' });
    clip.append(el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }));
    const defs = el('defs'); defs.append(clip); svg.append(defs);

    for (const [d, label] of timeTicks) {
      if (d < y0 || d > y1) continue;
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(d), y2: py(d), class: 'viz-grid' }));
      svg.append(el('text', { x: m.l - 8, y: py(d) + 4, 'text-anchor': 'end', class: 'viz-tick' }, label));
    }
    for (const [q, label] of qTicks) {
      if (q < x0 || q > x1) continue;
      svg.append(el('line', { x1: px(q), x2: px(q), y1: m.t, y2: H - m.b, class: 'viz-grid' }));
      svg.append(el('text', { x: px(q), y: H - m.b + 17, 'text-anchor': 'middle', class: 'viz-tick' }, label));
    }
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'viz-axis' }));
    svg.append(el('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'viz-axis' }));
    svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'viz-axis-title' }, 'Physical qubits (log scale)'));
    if (!narrow) svg.append(el('text', { x: 13, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'viz-axis-title', transform: `rotate(-90 13 ${(m.t + H - m.b) / 2})` }, 'Time to factor one key (log scale)'));

    const plot = el('g', { 'clip-path': 'url(#ls-clip)' });
    svg.append(plot);
    const labelsLayer = el('g', { class: 'ls-labels' });

    const items = [];
    for (const e of data.estimates) {
      if (hidden.has(e.family) || e.year > year || !inside(e.qubits, e.days)) continue;
      if (e.variant && !variantsBox.checked) continue;
      items.push({ ...e, kind: 'pub', x: px(e.qubits), y: py(e.days) });
    }
    const showOurs = year >= 2026;
    const ours = showOurs ? data.ours.filter(o => !hidden.has(o.family) && (allOurs.checked || o.headline) && inside(o.qubits, o.days)) : [];

    // Trade-off lines: one per paper, through its operating points in qubit order.
    for (const sr of data.series) {
      const pts = items.filter(i => i.series === sr.id).sort((a, b) => a.qubits - b.qubits);
      if (pts.length < 2) continue;
      plot.append(el('path', { d: 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L'), class: `ls-series fam-${pts[0].family}`, 'data-key': sr.id }));
    }
    // Our scenarios: an arrow from the reference to the star; range whisker for cat qubits.
    const marker = el('marker', { id: 'ls-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.append(el('path', { d: 'M0 0L8 4L0 8Z', class: 'ls-arrowhead' }));
    defs.append(marker);
    for (const o of ours) {
      const active = pinned?.id === o.id;
      const [ax, ay, bx, by] = [px(o.ref_qubits), py(o.ref_days), px(o.qubits), py(o.days)];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const ex = bx - (bx - ax) / len * 10, ey = by - (by - ay) / len * 10; // stop short of the star
      if (o.range) plot.append(el('line', { x1: bx, x2: bx, y1: py(o.range[0]), y2: py(o.range[1]), class: 'ls-range', 'data-key': o.id }));
      plot.append(el('circle', { cx: ax, cy: ay, r: 3.5, class: `ls-refmark${active ? ' is-active' : ''}`, 'data-key': o.id }));
      if (len > 14) plot.append(el('line', { x1: ax, y1: ay, x2: ex, y2: ey, class: `ls-pair${active ? ' is-active' : ''}`, 'marker-end': 'url(#ls-arrow)', 'data-key': o.id }));
    }

    const placed = []; // label boxes and mark boxes for collision checks
    const marks = [];
    const addMark = (item, node) => {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `${item.name}: ${qfull(item.qubits)} physical qubits, ${item.time}`);
      node.classList.toggle('is-pinned', pinned?.id === item.id);
      const html = () => item.kind === 'ours'
        ? `<strong>${esc(item.name)}</strong><br>${qfull(item.qubits)} qubits · ${esc(item.time)}<br><span>vs. ${esc(item.ref_label)}</span>`
        : `<strong>${esc(item.name)} (${item.year})</strong><br>${qfull(item.qubits)} qubits · ${esc(item.time)}<br><span>${esc(item.assumptions)}</span>`;
      const key = item.series || item.id;
      node.setAttribute('data-key', key);
      node.addEventListener('pointermove', e => showTip(e, html()));
      node.addEventListener('pointerenter', () => focusKey(key));
      node.addEventListener('pointerleave', () => { hideTip(); focusKey(null); });
      node.addEventListener('focus', e => showTip(e, html()));
      node.addEventListener('blur', hideTip);
      const pin = () => { pinned = pinned?.id === item.id ? null : item; detail(pinned); draw(); };
      node.addEventListener('click', pin);
      node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(); } });
      plot.append(node);
      marks.push({ x: item.x - 7, y: item.y - 7, w: 14, h: 14 });
    };

    for (const it of items) {
      const g = el('g', { class: `ls-mark fam-${it.family}`, transform: `translate(${it.x} ${it.y})` });
      g.append(el('circle', { r: 14, class: 'ls-hit' }));
      g.append(it.bound ? el('path', { d: 'M-6 -4H6L0 6Z', class: 'ls-dot' }) : el('circle', { r: 5.5, class: 'ls-dot' }));
      addMark(it, g);
    }
    for (const o of ours) {
      const it = { ...o, kind: 'ours', x: px(o.qubits), y: py(o.days) };
      const g = el('g', { class: 'ls-mark ls-ours', transform: `translate(${it.x} ${it.y})` });
      g.append(el('circle', { r: 14, class: 'ls-hit' }));
      const star = [];
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 3.6 : 8.5, a = -Math.PI / 2 + k * Math.PI / 5; star.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`); }
      g.append(el('path', { d: `M${star.join('L')}Z`, class: 'ls-star' }));
      addMark(it, g);
      items.push(it);
    }

    // Greedy label placement: try eight positions around each labelled mark.
    const fontW = narrow ? 5.6 : 6.4;
    const seriesLabelled = new Set();
    const wanted = items.filter(it => {
      if (it.kind === 'ours') return it.headline;
      if (it.series) {
        if (seriesLabelled.has(it.series)) return false;
        const pts = items.filter(i => i.series === it.series).sort((a, b) => b.days - a.days);
        if (pts[0] !== it) return false; // label each trade-off line at its slowest point
        seriesLabelled.add(it.series); return true;
      }
      return it.label;
    })
      .filter(it => !narrow || it.kind === 'ours' || it.id === pinned?.id)
      .sort((p, q) => (q.kind === 'ours') - (p.kind === 'ours'));
    if (pinned) { const i = wanted.findIndex(w => w.id === pinned.id); if (i > 0) wanted.unshift(...wanted.splice(i, 1)); }
    if (pinned && !wanted.some(w => w.id === pinned.id)) {
      const p = items.find(i => i.id === pinned.id); if (p) wanted.unshift(p);
    }
    const overlaps = b => [...placed, ...marks].some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const within = b => b.x >= m.l + 2 && b.x + b.w <= W - m.r - 2 && b.y >= m.t && b.y + b.h <= H - m.b - 2;
    for (const it of wanted) {
      let line1 = it.kind === 'ours' ? `Ours · ${it.name.replace('Our ', '').replace(' scenario', '')}` : `${it.name} ’${String(it.year).slice(2)}`;
      let line2 = `${qfmt(it.qubits)} · ${it.time.replace(/ \(.*\)/, '')}`;
      if (it.series && it.id !== pinned?.id) {
        const pts = items.filter(i => i.series === it.series).sort((a, b) => a.qubits - b.qubits);
        line1 = seriesOf(it.series).name;
        line2 = `${pts.length} points · ${qfmt(pts[0].qubits)}–${qfmt(pts[pts.length - 1].qubits)} qubits`;
      }
      const w = Math.max(line1.length, line2.length) * fontW + 6, h = 30;
      const cands = [[12, -h - 4], [12, 6], [-w - 12, -h - 4], [-w - 12, 6], [-w / 2, -h - 14], [-w / 2, 14], [22, -h / 2], [-w - 22, -h / 2], [30, -h - 22], [-w - 30, 18]];
      let box = null;
      for (const [dx, dy] of cands) {
        const b = { x: it.x + dx, y: it.y + dy, w, h };
        if (within(b) && !overlaps(b)) { box = b; break; }
      }
      if (!box && it.id === pinned?.id) {
        for (const [dx, dy] of cands) { const b = { x: it.x + dx, y: it.y + dy, w, h }; if (within(b)) { box = b; break; } }
      }
      if (!box) continue;
      placed.push(box);
      const cls = it.kind === 'ours' ? 'ls-label is-ours' : `ls-label fam-${it.family}`;
      const t = el('text', { x: box.x + 3, y: box.y + 12, class: cls, 'data-key': it.kind === 'ours' ? it.id : (it.series || it.id) });
      t.append(el('tspan', { x: box.x + 3, class: 'ls-label-name' }, line1));
      t.append(el('tspan', { x: box.x + 3, dy: 14, class: 'ls-label-value' }, line2));
      const cx = Math.max(box.x, Math.min(it.x, box.x + box.w)), cy = Math.max(box.y, Math.min(it.y, box.y + box.h));
      if (Math.hypot(cx - it.x, cy - it.y) > 12) labelsLayer.append(el('line', { x1: it.x, y1: it.y, x2: cx, y2: cy, class: 'ls-leader', 'data-key': it.kind === 'ours' ? it.id : (it.series || it.id) }));
      labelsLayer.append(t);
    }
    svg.append(labelsLayer);
    const shown = items.length;
    root.querySelector('[data-landscape-count]').textContent = `${shown} mark${shown === 1 ? '' : 's'} · published up to ${year}`;
  }

  detail(null);
  draw();
  new ResizeObserver(() => draw()).observe(svg);
})();
