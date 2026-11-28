/* Interactive figures for the ECDSA project page: leaderboard history,
   window explorer, full-attack frontier, fresh-input failures and hardware.
   Data: _data/ecdsa_results.json, built by scripts/build_ecdsa_results.py. */
(() => {
  const source = document.querySelector('[data-ecdsa-results]');
  if (!source) return;
  const data = JSON.parse(source.textContent);
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const html = (tag, attrs = {}, text) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const int = v => Math.round(v).toLocaleString('en-US');
  const mill = (v, d = 1) => `${(v / 1e6).toFixed(d)}M`;
  const compact = v => v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e7 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : int(v);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kernelById = Object.fromEntries(data.kernels.map(k => [k.id, k]));
  const who = id => (kernelById[id] || {}).author || '';
  const isMine = id => !!(kernelById[id] || {}).mine;

  /* Shared tooltip */
  const tip = html('div', { class: 'ec-tip', role: 'status', 'aria-live': 'polite' });
  tip.hidden = true;
  document.body.append(tip);
  function showTip(event, content) {
    tip.innerHTML = content;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = (event.clientX ?? 0) + 14, y = (event.clientY ?? 0) + 14;
    if (event.type === 'focus') { const b = event.target.getBoundingClientRect(); x = b.right + 8; y = b.top; }
    if (x + r.width > innerWidth - 8) x = Math.max(8, x - r.width - 28);
    if (y + r.height > innerHeight - 8) y = Math.max(8, y - r.height - 28);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  const hideTip = () => { tip.hidden = true; };
  function hover(node, content) {
    node.addEventListener('pointermove', e => showTip(e, content()));
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('focus', e => showTip(e, content()));
    node.addEventListener('blur', hideTip);
  }
  addEventListener('scroll', hideTip, { passive: true });
  function activate(node, fn) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('click', fn);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }
  function segmented(container, options, initial, onChange) {
    const buttons = [...container.querySelectorAll('button')];
    if (!buttons.length) {
      for (const [value, label] of options) {
        const b = html('button', { type: 'button', 'aria-pressed': String(value === initial) }, label);
        b.dataset.value = value;
        container.append(b);
        buttons.push(b);
      }
    }
    buttons.forEach(b => b.addEventListener('click', () => {
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      onChange(b.dataset.value || b.dataset.view || b.dataset.metric || b.dataset.sort);
    }));
  }
  function frame(svg, minH = 280) {
    svg.replaceChildren();
    const W = Math.max(280, svg.clientWidth || 720);
    const H = Math.max(minH, svg.clientHeight || 380);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    return [W, H];
  }
  const logTicks = (lo, hi) => {
    const out = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
      for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    return out;
  };
  const tickM = v => v >= 1e9 ? `${+(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${+(v / 1e6).toFixed(2)}M` : `${+(v / 1e3).toFixed(0)}k`;
  const monthShort = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  // "Better" hint placed in the corner the optimum lies in.
  function betterHint(svg, x, y, text, anchor = 'start') {
    svg.append(el('text', { x, y, 'text-anchor': anchor, class: 'ec-better' }, text));
  }
  // Spread labels vertically so none sit closer than `gap` pixels.
  function spread(items, gap, lo, hi) {
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
    const over = items.length ? items.at(-1).y - hi : 0;
    if (over > 0) items.forEach(it => { it.y = Math.max(lo, it.y - over); });
    return items;
  }
  const redrawers = [];
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => redrawers.forEach(f => f()), 120); });

  /* 1. Leaderboard history ------------------------------------------------ */
  const board = document.querySelector('[data-board-chart]');
  if (board) {
    const svg = board.querySelector('svg');
    const detail = board.querySelector('[data-board-detail]');
    const slider = board.querySelector('[data-board-step]');
    const out = board.querySelector('[data-board-date]');
    const play = board.querySelector('[data-board-play]');
    const hist = data.history;
    let step = hist.length - 1, view = 'zoom', timer = null;
    const views = {
      all: { x0: 560, x1: 2800, y0: 6e5, y1: 1.2e9 },
      zoom: { x0: 1150, x1: 1600, y0: 6.8e5, y1: 1.15e6 },
    };
    segmented(board.querySelector('[data-board-view]'), [], view, v => { view = v; draw(); });
    slider.addEventListener('input', () => { step = +slider.value; stop(); draw(); });
    function stop() { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); play.textContent = 'Play ▸'; }
    play.addEventListener('click', () => {
      if (timer) return stop();
      play.setAttribute('aria-pressed', 'true'); play.textContent = 'Pause ❚❚';
      step = 0; slider.value = 0; draw();
      timer = setInterval(() => {
        if (step >= hist.length - 1) return stop();
        step += 1; slider.value = step; draw();
      }, reduced ? 1400 : 900);
    });

    function describe() {
      const h = hist[step];
      const lowT = h.low_t, lowQ = h.low_q, prod = h.best_prod;
      const latest = step === hist.length - 1;
      detail.innerHTML = `
        <p class="ec-detail-kicker">${latest ? 'Snapshot' : 'Month end'} · ${fmtDate(h.date)}</p>
        <h4>Public frontier <span>one point addition</span></h4>
        <dl>
          <div><dt>Fewest Toffolis</dt><dd>${int(lowT[1])}</dd></div>
          <div><dt>at qubits</dt><dd>${int(lowT[0])}</dd></div>
          <div><dt>Fewest qubits</dt><dd>${int(lowQ[0])}</dd></div>
          <div><dt>Best qubits × Toffolis</dt><dd>${(prod[0] * prod[1] / 1e6).toFixed(1)}M</dd></div>
        </dl>
        <p>${step === 0 ? 'Early entries started from the challenge’s 2,715-qubit circuit.' : latest ? 'My two marked circuits were on the frontier in October. Others have since moved past them on both objectives.' : 'Drag the slider or press play to see how the frontier moved.'}</p>`;
    }

    function draw() {
      out.textContent = fmtDate(hist[step].date);
      const [W, H] = frame(svg);
      const narrow = W < 520;
      const m = { l: narrow ? 46 : 58, r: narrow ? 14 : 46, t: 28, b: 44 };
      const v = views[view];
      const px = q => m.l + (q - v.x0) / (v.x1 - v.x0) * (W - m.l - m.r);
      const py = t => H - m.b - Math.log(t / v.y0) / Math.log(v.y1 / v.y0) * (H - m.t - m.b);
      const clip = el('clipPath', { id: 'ec-board-clip' });
      clip.append(el('rect', { x: m.l, y: m.t - 4, width: W - m.l - m.r, height: H - m.t - m.b + 4 }));
      svg.append(clip);
      const yt = view === 'zoom' ? [7e5, 8e5, 9e5, 1e6, 1.1e6] : logTicks(v.y0, v.y1);
      for (const t of yt) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(t), y2: py(t), class: 'ec-grid' }));
        svg.append(el('text', { x: m.l - 7, y: py(t) + 4, 'text-anchor': 'end', class: 'ec-tick' }, tickM(t)));
      }
      const xt = view === 'zoom' ? [1200, 1300, 1400, 1500, 1600] : (narrow ? [1000, 1800, 2600] : [600, 1000, 1400, 1800, 2200, 2600]);
      for (const q of xt) svg.append(el('text', { x: px(q), y: H - m.b + 18, 'text-anchor': 'middle', class: 'ec-tick' }, int(q)));
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'ec-axis' }));
      svg.append(el('text', { x: W - m.r, y: H - 6, 'text-anchor': 'end', class: 'ec-axis-title' }, 'Peak logical qubits'));
      svg.append(el('text', { x: m.l, y: 12, class: 'ec-axis-title' }, 'Mean Toffolis per addition (log)'));

      const g = el('g', { 'clip-path': 'url(#ec-board-clip)' });
      svg.append(g);
      const stairPath = st => {
        let d = '';
        st.forEach(([q, t], i) => {
          if (i === 0) d += `M${px(q)},${py(v.y1 * 2)}V${py(t)}`;
          else d += `H${px(q)}V${py(t)}`;
        });
        return d + `H${px(v.x1 * 1.2)}`;
      };
      const now = hist[step];
      // Region beaten by the current frontier: above and to the right of the staircase.
      g.append(el('path', { d: `${stairPath(now.stairs)}V${py(v.y1 * 2)}Z`, class: 'ec-beaten' }));
      const endLabels = [];
      const atRight = st => { let t = null; for (const [q, tt] of st) if (q <= v.x1) t = tt; return t; };
      hist.forEach((h, i) => {
        if (i >= step) return;
        const age = (step - i) / Math.max(1, step);
        g.append(el('path', { d: stairPath(h.stairs), class: 'ec-stair is-past', style: `opacity:${(1 - age * 0.65).toFixed(2)}` }));
        const t = atRight(h.stairs);
        if (t && t >= v.y0 && t <= v.y1) endLabels.push({ y: py(t), text: monthShort(h.date), past: true });
      });
      g.append(el('path', { d: stairPath(now.stairs), class: 'ec-stair is-now' }));
      const tNow = atRight(now.stairs);
      if (tNow) endLabels.push({ y: py(tNow), text: monthShort(now.date), past: false });
      if (!narrow) {
        // Month labels at the right edge so each staircase can be named.
        const sorted = spread(endLabels, 14, m.t, H - m.b);
        for (const lb of sorted) svg.append(el('text', { x: W - m.r + 6, y: lb.y + 4, class: `ec-label${lb.past ? '' : ' is-front'}` }, lb.text));
      }
      if (view === 'zoom') betterHint(svg, m.l + 8, H - m.b - 8, '↙ fewer qubits and fewer Toffolis is better');
      if (view === 'zoom') {
        const off = data.references.filter(r => r.q >= v.x0 && r.q <= v.x1 && r.t > v.y1);
        if (off.length && !narrow) svg.append(el('text', { x: m.l + 8, y: m.t + 14, class: 'ec-label is-pub' }, `↑ Google’s private circuits (${off.map(r => compact(r.t)).join(', ')}) sit above this view`));
      }
      for (const [q, t] of now.stairs) {
        if (q < v.x0 || q > v.x1 || t < v.y0 || t > v.y1) continue;
        const c = el('circle', { cx: px(q), cy: py(t), r: 2.6, class: 'ec-vertex' });
        g.append(c);
        const hit = el('circle', { cx: px(q), cy: py(t), r: 8, class: 'ec-hit' });
        hover(hit, () => `<strong>${int(t)} Toffolis</strong><br>${int(q)} logical qubits<br>Frontier on ${fmtDate(now.date)}`);
        g.append(hit);
      }
      for (const r of data.references) {
        if (r.q < v.x0 || r.q > v.x1 || r.t < v.y0 || r.t > v.y1) continue;
        const s = el('rect', { x: px(r.q) - 5, y: py(r.t) - 5, width: 10, height: 10, class: 'ec-refmark' });
        hover(s, () => `<strong>${esc(r.name)}</strong><br>${int(r.q)} qubits · ${compact(r.t)} Toffolis`);
        g.append(s);
        if (!narrow) {
          const right = px(r.q) > W - 160 || /low-qubit/.test(r.name);
          g.append(el('text', { x: px(r.q) + (right ? -9 : 9), y: py(r.t) - 8, 'text-anchor': right ? 'end' : 'start', class: 'ec-label is-pub' }, r.name.replace(' (private)', '')));
        }
      }
      if (hist[step].date >= '2026-10-15') {
        for (const [q, t] of data.mine_frontier) {
          if (q < v.x0 || q > v.x1) continue;
          const d = el('rect', { x: px(q) - 5, y: py(t) - 5, width: 10, height: 10, transform: `rotate(45 ${px(q)} ${py(t)})`, class: 'ec-mine' });
          hover(d, () => `<strong>My circuit</strong><br>${int(q)} qubits · ${int(t)} Toffolis`);
          g.append(d);
          const edge = px(q) > W - 110;
          if (view === 'zoom') g.append(el('text', { x: px(q) + (edge ? -9 : 9), y: py(t) + (edge ? -9 : 4), 'text-anchor': edge ? 'end' : 'start', class: 'ec-label is-strong' }, narrow ? `${(t / 1e3).toFixed(0)}k` : `Mine · ${int(t)}`));
        }
      }
      describe();
    }
    redrawers.push(draw);
    draw();
  }

  /* 2. Window explorer ---------------------------------------------------- */
  const win = document.querySelector('[data-window-chart]');
  if (win) {
    const svg = win.querySelector('svg');
    const detail = win.querySelector('[data-window-detail]');
    const select = win.querySelector('[data-window-kernel]');
    const slider = win.querySelector('[data-window-step]');
    const out = win.querySelector('[data-window-out]');
    const ks = [...data.kernels].sort((a, b) => a.best.q - b.best.q);
    for (const k of ks) {
      const o = html('option', { value: k.id }, `${k.mine ? 'Mine · ' : ''}${k.author} · ${int(k.q)} qubits`);
      if (k.mine) o.selected = true;
      select.append(o);
    }
    let kid = ks.find(k => k.mine).id, w = 13;
    select.addEventListener('change', () => { kid = select.value; w = kernelById[kid].best.w; slider.value = w; draw(); });
    slider.addEventListener('input', () => { w = +slider.value; draw(); });

    function draw() {
      out.textContent = w;
      const pts = data.points.filter(p => p.id === kid).sort((a, b) => a.w - b.w);
      const k = kernelById[kid];
      const [W, H] = frame(svg);
      const narrow = W < 520;
      const m = { l: 52, r: 10, t: 30, b: 56 };
      const max = Math.max(...pts.map(p => p.mean)) * 1.12;
      const step = (W - m.l - m.r) / pts.length;
      const bw = Math.min(46, step * 0.62);
      const py = t => H - m.b - t / max * (H - m.t - m.b);
      const nice = [1, 2, 2.5, 5, 10].map(f => f * 10 ** Math.floor(Math.log10(max / 4))).find(s => max / s <= 6);
      for (let t = 0; t <= max; t += nice) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(t), y2: py(t), class: 'ec-grid' }));
        svg.append(el('text', { x: m.l - 7, y: py(t) + 4, 'text-anchor': 'end', class: 'ec-tick' }, t ? `${(t / 1e6).toFixed(0)}M` : '0'));
      }
      svg.append(el('text', { x: m.l, y: 12, class: 'ec-axis-title' }, 'Mean Toffolis per run'));
      svg.append(el('text', { x: m.l - 8, y: H - m.b + 18, 'text-anchor': 'end', class: 'ec-axis-title' }, 'w'));
      svg.append(el('text', { x: m.l - 8, y: H - m.b + 33, 'text-anchor': 'end', class: 'ec-axis-title' }, 'adds'));
      svg.append(el('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end', class: 'ec-axis-title' }, 'Window size w (bits) and additions per run'));
      const best = pts.reduce((a, b) => b.mean < a.mean ? b : a);
      // Cheapest total as a reference line, so every other bar reads as "this much worse".
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(best.mean), y2: py(best.mean), class: 'ec-guide' }));
      pts.forEach((p, i) => {
        const cx = m.l + step * (i + 0.5);
        const sel = p.w === w;
        const g = el('g', { class: `ec-bar-group${sel ? ' is-sel' : ''}` });
        g.append(el('rect', { x: cx - bw / 2, y: py(p.add_part), width: bw, height: py(0) - py(p.add_part), class: 'ec-bar-add' }));
        g.append(el('rect', { x: cx - bw / 2, y: py(p.mean), width: bw, height: py(p.add_part) - py(p.mean), class: 'ec-bar-look' }));
        if (sel) g.append(el('rect', { x: cx - bw / 2 - 3, y: py(p.mean) - 3, width: bw + 6, height: py(0) - py(p.mean) + 3, class: 'ec-bar-sel' }));
        g.append(el('text', { x: cx, y: H - m.b + 18, 'text-anchor': 'middle', class: `ec-tick${sel ? ' is-strong' : ''}` }, p.w));
        g.append(el('text', { x: cx, y: H - m.b + 33, 'text-anchor': 'middle', class: 'ec-tick is-sub' }, p.n));
        const more = `+${((p.mean / best.mean - 1) * 100).toFixed(0)}%`;
        const lab = p === best ? `★ ${mill(p.mean)}` : sel ? mill(p.mean) : narrow ? null : more;
        if (lab) g.append(el('text', { x: cx, y: py(p.mean) - (sel ? 9 : 6), 'text-anchor': 'middle', class: `ec-label${sel || p === best ? ' is-strong' : ''}` }, lab));
        hover(g, () => `<strong>w = ${p.w}</strong> · ${p.n} additions<br>Additions ${mill(p.add_part)} · lookups etc. ${mill(p.lookup_part)}<br>Total ${mill(p.mean)} mean`);
        activate(g, () => { w = p.w; slider.value = w; draw(); });
        g.setAttribute('aria-label', `Window ${p.w}: ${mill(p.mean)} Toffolis`);
        svg.append(g);
      });
      const p = pts.find(x => x.w === w);
      detail.innerHTML = `
        <p class="ec-detail-kicker">${esc(k.author)}${k.mine ? ' (mine)' : ''} · <code>${k.id}</code></p>
        <h4>w = ${p.w} bits <span>2⌈256/${p.w}⌉ − 1 = ${p.n} additions</span></h4>
        <dl>
          <div><dt>Logical qubits</dt><dd>${int(p.q)}</dd></div>
          <div><dt>Mean per run</dt><dd>${mill(p.mean)}</dd></div>
          <div><dt>Share in lookups etc.</dt><dd>${(p.lookup_part / p.mean * 100).toFixed(0)}%</dd></div>
          <div><dt>Per kept run, worst case</dt><dd class="${p === best ? 'is-better' : ''}">${mill(p.kept)}</dd></div>
        </dl>
        <p>One addition costs ${int(k.t)} Toffolis on the leaderboard${k.offset_tof ? `, plus ${int(k.offset_tof)} to load the offset` : ''}. ${p === best ? 'This is the cheapest window for this circuit.' : `The cheapest window here is w = ${best.w}.`}</p>`;
    }
    redrawers.push(draw);
    draw();
  }

  /* 3. Full-attack frontier ----------------------------------------------- */
  const fr = document.querySelector('[data-frontier-chart]');
  if (fr) {
    const svg = fr.querySelector('svg');
    const detail = fr.querySelector('[data-frontier-detail]');
    const all = fr.querySelector('[data-frontier-all]');
    let metric = 'kept';
    segmented(fr.querySelector('[data-frontier-metric]'), [], metric, v => { metric = v; draw(); });
    all.addEventListener('change', draw);
    const val = p => metric === 'kept' ? p.kept : p.mean;
    const pubVal = p => metric === 'kept' ? p.kept : p.tof;
    let selected = data.points.find(p => p.id === 'ee410040' && p.w === 12);

    function staircase() {
      const sorted = [...data.points].sort((a, b) => a.q - b.q || val(a) - val(b));
      const out = [];
      for (const p of sorted) if (!out.length || val(p) < val(out.at(-1))) out.push(p);
      return out;
    }
    function bestPublishedWithin(q) {
      const fit = data.published.filter(p => p.q <= q);
      return fit.length ? fit.reduce((a, b) => pubVal(b) < pubVal(a) ? b : a) : null;
    }
    function describe(p) {
      const k = kernelById[p.id];
      const ref = bestPublishedWithin(p.q);
      const near = data.published.filter(x => x.q >= p.q).sort((a, b) => a.q - b.q)[0];
      const label = metric === 'kept' ? 'Per kept run, worst case' : 'Mean per run';
      let note;
      if (ref) note = `${esc(ref.name)} fits in ${int(ref.q)} qubits and needs ${mill(pubVal(ref))}, which is ${(pubVal(ref) / val(p)).toFixed(2)}× as many.`;
      else if (near) note = `No published design fits in ${int(p.q)} qubits. The narrowest, ${esc(near.name)}, uses ${int(near.q)} qubits and ${mill(pubVal(near))}.`;
      detail.innerHTML = `
        <p class="ec-detail-kicker">${esc(k.author)}${k.mine ? ' (mine)' : ''} · <code>${k.id}</code></p>
        <h4>${int(p.q)} logical qubits <span>w = ${p.w}, ${p.n} additions</span></h4>
        <dl>
          <div><dt>${label}</dt><dd class="is-better">${mill(val(p))}</dd></div>
          <div><dt>One addition (leaderboard)</dt><dd>${compact(k.t)}</dd></div>
          <div><dt>Worst case per run</dt><dd>${mill(p.worst)}</dd></div>
          <div><dt>Chance a run is kept</dt><dd>${(k.best.p_keep * 100).toFixed(1)}%</dd></div>
        </dl>
        <p>${note}</p>`;
    }
    function draw() {
      const [W, H] = frame(svg);
      const narrow = W < 520;
      const m = { l: narrow ? 42 : 54, r: 16, t: 18, b: 44 };
      const x0 = 780, x1 = 1520, y0 = 2.6e7, y1 = 2.6e8;
      const px = q => m.l + (q - x0) / (x1 - x0) * (W - m.l - m.r);
      const py = t => H - m.b - Math.log(t / y0) / Math.log(y1 / y0) * (H - m.t - m.b);
      for (const t of [3e7, 4e7, 6e7, 8e7, 1e8, 1.5e8, 2e8]) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(t), y2: py(t), class: 'ec-grid' }));
        svg.append(el('text', { x: m.l - 7, y: py(t) + 4, 'text-anchor': 'end', class: 'ec-tick' }, `${t / 1e6}M`));
      }
      for (const q of narrow ? [800, 1100, 1400] : [800, 900, 1000, 1100, 1200, 1300, 1400, 1500])
        svg.append(el('text', { x: px(q), y: H - m.b + 18, 'text-anchor': 'middle', class: 'ec-tick' }, int(q)));
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'ec-axis' }));
      svg.append(el('text', { x: W - m.r, y: H - 6, 'text-anchor': 'end', class: 'ec-axis-title' }, 'Logical qubits for the whole attack'));
      svg.append(el('text', { x: m.l, y: m.t - 6, class: 'ec-axis-title' }, metric === 'kept' ? 'Toffolis per kept run, worst case (log)' : 'Mean Toffolis per run (log)'));
      const narrowest = Math.min(...data.published.map(p => p.q));
      svg.append(el('line', { x1: px(narrowest), x2: px(narrowest), y1: m.t, y2: H - m.b, class: 'ec-guide' }));
      if (!narrow) svg.append(el('text', { x: px(narrowest) - 6, y: m.t + 12, 'text-anchor': 'end', class: 'ec-label' }, 'Narrower than any published design ←'));

      const st = staircase();
      let d = '';
      st.forEach((p, i) => { d += i === 0 ? `M${px(p.q)},${py(val(p))}` : `H${px(p.q)}V${py(val(p))}`; });
      d += `H${px(x1)}`;
      svg.append(el('path', { d, class: 'ec-stair is-ours' }));
      const shown = all.checked ? data.points : st;
      const onStair = new Set(st);
      for (const p of shown) {
        if (!onStair.has(p) && !all.checked) continue;
        if (val(p) > y1) continue;
        const r = onStair.has(p) ? 4.6 : 3.2;
        const c = el('circle', { cx: px(p.q), cy: py(val(p)), r, class: `ec-pt${isMine(p.id) ? ' is-mine' : ''}${onStair.has(p) ? '' : ' is-faint'}` });
        hover(c, () => `<strong>${esc(who(p.id))}</strong> · <code>${p.id}</code><br>${int(p.q)} qubits · w = ${p.w}<br>${mill(val(p))} Toffolis`);
        activate(c, () => { selected = p; draw(); });
        c.setAttribute('aria-label', `${who(p.id)}, ${p.q} qubits, ${mill(val(p))}`);
        svg.append(c);
      }
      // my best point always visible
      const mine = data.points.filter(p => isMine(p.id)).reduce((a, b) => val(b) < val(a) ? b : a);
      if (!onStair.has(mine)) {
        const c = el('circle', { cx: px(mine.q), cy: py(val(mine)), r: 4.6, class: 'ec-pt is-mine' });
        hover(c, () => `<strong>My circuit</strong><br>${int(mine.q)} qubits · w = ${mine.w}<br>${mill(val(mine))} Toffolis`);
        activate(c, () => { selected = mine; draw(); });
        svg.append(c);
      }
      if (!narrow) svg.append(el('text', { x: px(mine.q) - 8, y: py(val(mine)) + 18, 'text-anchor': 'end', class: 'ec-label is-strong' }, `Mine · ${mill(val(mine))}`));
      // Gap at each published design's budget: dashed drop to the staircase, labelled with the ratio.
      const stairAt = q => { let b = null; for (const s of st) if (s.q <= q) b = s; return b; };
      const gapRatio = {};
      for (const p of data.published) {
        const s = stairAt(p.q);
        if (!s) continue;
        gapRatio[p.name] = pubVal(p) / val(s);
        const x = px(p.q), yTop = py(pubVal(p)) + 6, yBot = py(val(s)) - 2;
        svg.append(el('line', { x1: x, x2: x, y1: yTop, y2: yBot, class: 'ec-gap' }));
        svg.append(el('path', { d: `M${x - 3.5},${yBot - 5}L${x},${yBot}L${x + 3.5},${yBot - 5}`, class: 'ec-gap-head' }));
      }
      betterHint(svg, m.l + 8, H - m.b - 8, '↙ fewer qubits and fewer Toffolis is better');
      for (const p of data.published) {
        const c = el('circle', { cx: px(p.q), cy: py(pubVal(p)), r: 5.5, class: 'ec-pub' });
        hover(c, () => `<strong>${esc(p.name)}</strong><br>${int(p.q)} qubits · ${mill(pubVal(p))} Toffolis<br>${compact(p.per_add)} per addition`);
        svg.append(c);
        const place = { 'Babbush et al. space-opt.': [8, -9, 'start'], 'Schrottenloher space-opt.': [9, 18, 'start'], 'Babbush et al. gate-opt.': [-4, -18, 'end'], 'Schrottenloher gate-opt.': [-9, 16, 'end'] }[p.name] || [9, 4, 'start'];
        if (!narrow) {
          const t = el('text', { x: px(p.q) + place[0], y: py(pubVal(p)) + place[1], 'text-anchor': place[2], class: 'ec-label is-pub' }, p.name.replace(' et al.', ''));
          if (gapRatio[p.name]) t.append(el('tspan', { class: 'is-gap' }, ` · ${gapRatio[p.name].toFixed(2)}×`));
          svg.append(t);
        }
      }
      if (selected) svg.append(el('circle', { cx: px(selected.q), cy: py(val(selected)), r: 8.5, class: 'ec-selected' }));
      describe(selected);
    }
    redrawers.push(draw);
    draw();
  }

  /* 4. Fresh-input failures ----------------------------------------------- */
  const fail = document.querySelector('[data-fail-chart]');
  if (fail) {
    const rows = fail.querySelector('[data-fail-rows]');
    let sort = 'q';
    segmented(fail.querySelector('[data-fail-sort]'), [], sort, v => { sort = v; draw(); });
    const top = Math.max(...data.kernels.map(k => k.fail_up));
    const tickStep = 0.0005;
    const max = Math.ceil(top * 1.12 / tickStep) * tickStep;
    const ticks = [];
    for (let v = 0; v <= max + 1e-12; v += tickStep) ticks.push(v);
    const pct = v => `${+(v * 100).toFixed(2)}%`;
    const axis = fail.querySelector('[data-fail-axis]');
    if (axis) {
      axis.replaceChildren();
      for (const v of ticks) axis.append(html('span', { style: `left:${v / max * 100}%` }, pct(v)));
    }
    const grid = ticks.map(v => `<span class="ec-fail-grid" style="left:${v / max * 100}%"></span>`).join('');
    function draw() {
      rows.replaceChildren();
      const ks = [...data.kernels].sort((a, b) => sort === 'q' ? a.q - b.q : a.fail - b.fail);
      for (const k of ks) {
        const r = html('div', { class: `ec-fail-row${k.mine ? ' is-mine' : ''}`, role: 'listitem', tabindex: '0' });
        const name = html('div');
        name.innerHTML = `<code>${k.id}</code>${k.dirty_parent ? '<b class="ec-dirty-badge">dirty</b>' : ''}<small>${esc(k.author)}${k.mine ? ' (mine)' : ''} · ${int(k.q)} qubits</small>`;
        const track = html('div', { class: 'ec-fail-track' });
        const left = k.fail / max * 100, right = k.fail_up / max * 100;
        track.innerHTML = `${grid}<span class="ec-fail-ci" style="left:${left}%;width:${right - left}%"></span><span class="ec-fail-dot" style="left:${left}%"></span><span class="ec-fail-val" style="left:calc(${right}% + 8px)">${(k.fail * 100).toFixed(2)}%</span>`;
        const share = k.offset_tof / k.t * 100;
        const lift = html('div', { class: 'ec-lift' });
        lift.innerHTML = `+${int(k.offset_tof)}<small>${share < 0.01 ? '<0.01%' : share.toFixed(2) + '%'}</small>`;
        r.append(name, track, lift);
        hover(r, () => `<strong>${esc(k.author)}</strong> · <code>${k.id}</code><br>${int(Math.round(k.fail * k.shots))} of ${int(k.shots)} fresh shots failed (${(k.fail * 100).toFixed(3)}%, upper bound ${(k.fail_up * 100).toFixed(3)}%)<br>${k.dirty_parent ? `Original left workspace dirty on ${k.dirty_parent} shots; converted: ${k.dirty_lifted}` : 'No dirty workspace in the original'}`);
        rows.append(r);
      }
    }
    draw();
  }

  /* 5. Hardware projections ----------------------------------------------- */
  const hw = document.querySelector('[data-hw-chart]');
  if (hw) {
    const rowsEl = hw.querySelector('[data-hw-rows]');
    const summary = hw.querySelector('[data-hw-summary]');
    const sortBox = hw.querySelector('[data-hw-sort]');
    const models = {
      sc15: { label: 'Surface code, 15 µs/Toffoli', unit: 'min', fmt: v => `${v.toFixed(1)} min` },
      scg: { label: 'Surface code, Gidney 2025', unit: 'min', fmt: v => `${v.toFixed(0)} min` },
      cain: { label: 'Neutral atoms, balanced', unit: 'days', fmt: v => `${v.toFixed(0)} days` },
      cains: { label: 'Neutral atoms, space-efficient', unit: 'days', fmt: v => `${v.toFixed(0)} days` },
      cat: { label: 'LDPC-cat index', unit: 'h', fmt: v => `${v.toFixed(2)} h` },
    };
    let model = 'sc15';
    segmented(hw.querySelector('[data-hw-model]'), Object.entries(models).map(([k, v]) => [k, v.label]), model, v => { model = v; draw(); });
    sortBox.addEventListener('change', draw);
    function draw() {
      const M = models[model];
      let list = [...data.hardware];
      if (sortBox.checked) list.sort((a, b) => a[model] - b[model]);
      else list.sort((a, b) => (a.ours === b.ours ? b.q - a.q : a.ours ? -1 : 1));
      const max = Math.max(...list.map(h => h[model]));
      const fastPubV = Math.min(...data.hardware.filter(h => !h.ours).map(h => h[model]));
      const refPct = fastPubV / max * 100;
      rowsEl.replaceChildren();
      const head = html('div', { class: 'ec-hw-head', 'aria-hidden': 'true' });
      head.innerHTML = `<span></span><span class="ec-hw-reflabel" style="left:${refPct}%">Fastest published design ↓</span><span></span>`;
      rowsEl.append(head);
      let group = null;
      for (const h of list) {
        if (!sortBox.checked && group !== h.ours) {
          group = h.ours;
          rowsEl.append(html('div', { class: 'ec-hw-group', role: 'presentation' }, h.ours ? 'Converted leaderboard circuits' : 'Published designs'));
        }
        const k = kernelById[h.name];
        const r = html('div', { class: `ec-hw-row${h.ours ? '' : ' is-pub'}${h.mine ? ' is-mine' : ''}`, role: 'listitem', tabindex: '0' });
        const label = html('div');
        label.innerHTML = h.ours ? `${esc(k ? k.author : h.name)}${h.mine ? ' (mine)' : ''} <code>${esc(h.name)}</code><small>${int(h.q)} qubits · ${mill(h.tof)} Toffolis</small>` : `${esc(h.name)}<small>${int(h.q)} qubits · ${mill(h.tof)} Toffolis</small>`;
        const bar = html('div', { class: 'ec-hw-track' });
        bar.append(html('div', { class: 'ec-hw-bar', style: `width:${Math.max(1.5, h[model] / max * 100)}%` }));
        bar.append(html('span', { class: 'ec-hw-ref', style: `left:${refPct}%` }));
        const valEl = html('div', { class: 'ec-hw-val' }, M.fmt(h[model]));
        if (h.ours) {
          const ratio = fastPubV / h[model];
          valEl.append(html('small', { class: ratio >= 1 ? 'is-better' : '' }, ratio >= 1 ? `${ratio.toFixed(1)}× faster` : `${(1 / ratio).toFixed(1)}× slower`));
        }
        r.append(label, bar, valEl);
        rowsEl.append(r);
      }
      const ours = data.hardware.filter(h => h.ours);
      const pubs = data.hardware.filter(h => !h.ours);
      const fastOurs = ours.reduce((a, b) => b[model] < a[model] ? b : a);
      const fastPub = pubs.reduce((a, b) => b[model] < a[model] ? b : a);
      summary.innerHTML = `Fastest converted circuit: <strong>${M.fmt(fastOurs[model])}</strong> at ${int(fastOurs.q)} qubits. Fastest published design: <strong>${M.fmt(fastPub[model])}</strong> (${esc(fastPub.name)}), ${(fastPub[model] / fastOurs[model]).toFixed(1)}× longer.`;
    }
    draw();
  }
})();
