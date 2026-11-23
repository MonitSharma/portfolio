/* Interactive figures for the BlueQubit Midwest OTOC project page.
   Data: assets/data/bluequbit-midwest/otoc-results.json, exported from the
   hackathon repository's raw results (results/*.jsonl, data/exact_*.csv). */
(async () => {
  const body = document.querySelector('[data-otoc-src]');
  if (!body) return;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const fmt = (v, d = 3) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let data;
  try {
    data = await (await fetch(body.dataset.otocSrc)).json();
  } catch (e) {
    body.classList.add('is-offline');
    return;
  }
  const problems = JSON.parse(document.querySelector('[data-otoc-problems]').textContent);

  /* Tooltip */
  const tip = document.createElement('div');
  tip.className = 'otoc-tip';
  tip.hidden = true;
  document.body.append(tip);
  const show = (e, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x, y;
    if (e.type === 'focus') { const b = e.target.getBoundingClientRect(); x = b.right + 8; y = b.top - 4; }
    else { x = e.clientX + 14; y = e.clientY + 14; }
    if (x + r.width > innerWidth - 8) x = Math.max(8, x - r.width - 28);
    if (y + r.height > innerHeight - 8) y = Math.max(8, y - r.height - 28);
    tip.style.transform = `translate(${x}px,${y}px)`;
  };
  const hide = () => { tip.hidden = true; };
  const hover = (node, html) => {
    node.addEventListener('pointermove', e => show(e, html()));
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', e => show(e, html()));
    node.addEventListener('blur', hide);
  };
  addEventListener('scroll', hide, { passive: true });

  function toggle(group, attr, onChange) {
    const buttons = [...group.querySelectorAll('button')];
    buttons.forEach(b => b.addEventListener('click', () => {
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      onChange(b.dataset[attr]);
    }));
  }
  const size = svg => {
    const w = Math.max(300, svg.clientWidth || 700), h = Math.max(220, svg.clientHeight || 320);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.replaceChildren();
    return [w, h];
  };

  /* Hero: G3 estimates on the snake-ordered 6×6 grid ----------------------- */
  const grid = document.querySelector('[data-otoc-grid]');
  if (grid) {
    const svg = grid.querySelector('svg');
    const caption = grid.querySelector('[data-grid-caption]');
    const g3 = data.levels.G3;
    const pos = {};
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) pos[r * 6 + (r % 2 === 0 ? c : 5 - c)] = [30 + c * 60, 30 + r * 60];
    for (let q = 0; q < 35; q++) svg.append(el('line', { x1: pos[q][0], y1: pos[q][1], x2: pos[q + 1][0], y2: pos[q + 1][1], class: 'g-bond' }));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
      const a = r * 6 + (r % 2 === 0 ? c : 5 - c), b = (r + 1) * 6 + ((r + 1) % 2 === 0 ? c : 5 - c);
      svg.append(el('line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], class: 'g-bond is-rung' }));
    }
    const bf = pos[15];
    svg.append(el('circle', { cx: bf[0], cy: bf[1], r: 26, class: 'g-butterfly' }));
    const nodes = g3.map(row => {
      const [x, y] = pos[row.q];
      const g = el('g', { class: 'g-node', tabindex: 0, transform: `translate(${x} ${y})` });
      const halo = el('circle', { r: 6, class: 'g-halo' });
      const dot = el('circle', { r: 6, class: 'g-dot' });
      g.append(halo, dot);
      svg.append(g);
      return { row, g, halo, dot };
    });
    let level = 'l3';
    const paint = () => {
      for (const n of nodes) {
        const v = n.row[level] ?? 0;
        const r = 5 + 22 * Math.pow(Math.min(Math.abs(v), 1), 0.6);
        n.dot.setAttribute('r', r.toFixed(2));
        n.halo.setAttribute('r', (r * 1.35).toFixed(2));
        n.g.classList.toggle('is-pos', v > 0.02);
        n.g.classList.toggle('is-neg', v < -0.02);
        n.g.setAttribute('aria-label', `Qubit ${n.row.q}: ${fmt(v)}`);
      }
      caption.textContent = level === 'l3'
        ? 'Level 3 (720 / 800): several circuits move from about 0 to around −0.6.'
        : 'Level 2 default (400 / 800): most of the signal was truncated away.';
    };
    nodes.forEach(n => hover(n.g, () => `<strong>G3 · qubit ${n.row.q}${n.row.q === 15 ? ' (butterfly)' : ''}</strong><br>Level 2: ${n.row.l2 === null ? '—' : fmt(n.row.l2)} <span>δ = ${n.row.l2thr ?? '—'}</span><br>Level 3: ${fmt(n.row.l3)} <span>δ = ${n.row.l3thr}</span>`));
    toggle(grid.querySelector('.otoc-toggle'), 'level', l => { level = l; paint(); });
    paint();
  }

  /* Scoreboard --------------------------------------------------------------- */
  const board = document.querySelector('[data-otoc-board]');
  if (board) {
    const max = Math.max(...problems.map(p => p.maximum));
    board.innerHTML = `<div class="board-row board-head" role="row"><span role="columnheader">Problem</span><span role="columnheader">Circuits</span><span role="columnheader">Points (bar length = available points)</span><span role="columnheader">Method</span></div>` +
      problems.map(p => `<div class="board-row" role="row" tabindex="0">
        <span role="cell" class="board-id">${p.problem}<small>${p.qubits} qubits</small></span>
        <span role="cell" class="board-family">${esc(p.family)}</span>
        <span role="cell" class="board-bar"><span class="board-track" style="width:${(p.maximum / max * 100).toFixed(1)}%"><i style="width:${(p.score / p.maximum * 100).toFixed(1)}%"></i></span><b>${p.score}<small> / ${p.maximum}</small></b></span>
        <span role="cell" class="board-method">${esc(p.method)}</span></div>`).join('');
    board.querySelectorAll('.board-row:not(.board-head)').forEach((row, i) => {
      const p = problems[i];
      hover(row, () => `<strong>${p.problem}: ${p.score} / ${p.maximum}</strong><br>corr² ≈ ${(p.score / p.maximum).toFixed(2)}<br>${esc(p.method)}`);
    });
  }

  /* Score journey ------------------------------------------------------------ */
  const journey = document.querySelector('[data-otoc-journey]');
  if (journey) {
    const svg = journey.querySelector('svg');
    const note = journey.querySelector('[data-journey-note]');
    const best = {}; const steps = data.journey.map((s, i) => {
      const before = best[s.problem] || 0;
      best[s.problem] = Math.max(before, s.score);
      const total = Object.values(best).reduce((a, b) => a + b, 0);
      return { ...s, i, total, gain: best[s.problem] - before };
    });
    const draw = () => {
      const [W, H] = size(svg);
      const m = { l: 46, r: 14, t: 18, b: 34 };
      const px = i => m.l + (i + 0.5) / steps.length * (W - m.l - m.r);
      const py = v => H - m.b - v / 3000 * (H - m.t - m.b);
      for (const v of [0, 1000, 2000, 3000]) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(v), y2: py(v), class: v === 3000 ? 'c-max' : 'c-grid' }));
        svg.append(el('text', { x: m.l - 8, y: py(v) + 4, 'text-anchor': 'end', class: 'c-tick' }, v.toLocaleString('en-US')));
      }
      svg.append(el('text', { x: W - m.r, y: py(3000) - 6, 'text-anchor': 'end', class: 'c-tick' }, 'maximum'));
      let d = `M${m.l} ${py(0)}`;
      steps.forEach(s => { d += `H${px(s.i) - (W - m.l - m.r) / steps.length / 2}V${py(s.total)}`; });
      d += `H${W - m.r}`;
      svg.append(el('path', { d: d + `V${py(0)}H${m.l}Z`, class: 'c-area' }));
      svg.append(el('path', { d, class: 'c-step' }));
      steps.forEach(s => {
        svg.append(el('text', { x: px(s.i), y: H - m.b + 18, 'text-anchor': 'middle', class: `c-tick${s.gain >= 150 ? ' is-strong' : ''}` }, s.problem));
        const g = el('g', { class: `c-point${s.gain >= 150 ? ' is-big' : ''}`, tabindex: 0 });
        g.append(el('rect', { x: px(s.i) - (W - m.l - m.r) / steps.length / 2, y: m.t, width: (W - m.l - m.r) / steps.length, height: H - m.t - m.b, class: 'c-hit' }));
        g.append(el('circle', { cx: px(s.i), cy: py(s.total), r: s.gain >= 150 ? 6 : 4.5, class: 'c-dot' }));
        if (s.gain >= 200 && W > 560) g.append(el('text', { x: px(s.i), y: py(s.total) - 12, 'text-anchor': 'middle', class: 'c-gain' }, `+${s.gain}`));
        const msg = () => `<strong>Submission ${s.i + 1} · ${s.problem}: ${s.score}</strong><br>${esc(s.note || 'exact statevector')}<br>Total ${s.total.toLocaleString('en-US')} ${s.gain ? `(+${s.gain})` : '(no change: best stays)'}`;
        hover(g, msg);
        g.addEventListener('pointerenter', () => { note.innerHTML = `<b>#${s.i + 1} · ${s.problem} ${s.score}</b> — ${esc(s.note || 'exact statevector')}. Running total ${s.total.toLocaleString('en-US')}.`; });
        svg.append(g);
      });
    };
    new ResizeObserver(draw).observe(svg);
  }

  /* Calibration list + parity plot ------------------------------------------ */
  const cal = document.querySelector('[data-otoc-cal]');
  if (cal) {
    const list = cal.querySelector('[data-cal-list]');
    const svg = cal.querySelector('[data-parity]');
    const note = cal.querySelector('[data-parity-note]');
    const rows = data.calibration.filter(r => data.parity[r.proxy]?.[r.tag]);
    const extra = data.calibration.filter(r => !data.parity[r.proxy]?.[r.tag]);
    let current = rows.findIndex(r => r.proxy === 'P3' && r.tag.startsWith('mps'));
    const draw = () => {
      const r = rows[current];
      const pts = data.parity[r.proxy][r.tag];
      const [W, H] = size(svg);
      const m = { l: 46, r: 12, t: 12, b: 38 };
      const vals = pts.flatMap(p => [p.exact, p.est]);
      let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const side = Math.min(W - m.l - m.r, H - m.t - m.b);
      const ox = m.l + (W - m.l - m.r - side) / 2;
      const px = v => ox + (v - lo) / (hi - lo) * side;
      const py = v => m.t + side - (v - lo) / (hi - lo) * side;
      const ticks = [];
      const step = (hi - lo) > 0.8 ? 0.25 : (hi - lo) > 0.3 ? 0.1 : 0.05;
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(+t.toFixed(3));
      svg.append(el('rect', { x: ox, y: m.t, width: side, height: side, class: 'p-frame' }));
      for (const t of ticks) {
        svg.append(el('line', { x1: px(t), x2: px(t), y1: m.t, y2: m.t + side, class: 'c-grid' }));
        svg.append(el('line', { x1: ox, x2: ox + side, y1: py(t), y2: py(t), class: 'c-grid' }));
        svg.append(el('text', { x: px(t), y: m.t + side + 15, 'text-anchor': 'middle', class: 'c-tick' }, fmt(t, 2)));
        svg.append(el('text', { x: ox - 6, y: py(t) + 4, 'text-anchor': 'end', class: 'c-tick' }, fmt(t, 2)));
      }
      svg.append(el('line', { x1: px(lo), y1: py(lo), x2: px(hi), y2: py(hi), class: 'p-diag' }));
      svg.append(el('text', { x: ox + side / 2, y: H - 4, 'text-anchor': 'middle', class: 'c-axis' }, 'exact ⟨Zq⟩'));
      svg.append(el('text', { x: 12, y: m.t + side / 2, 'text-anchor': 'middle', class: 'c-axis', transform: `rotate(-90 12 ${m.t + side / 2})` }, 'estimate'));
      const isMps = r.tag.startsWith('mps');
      for (const p of pts) {
        const dot = el('circle', { cx: px(p.exact), cy: py(p.est), r: 6, class: `p-dot${isMps ? ' is-mps' : ''}${r.tag.includes('pauli-path_threshold') ? ' is-loose' : ''}`, tabindex: 0 });
        hover(dot, () => `<strong>${r.proxy} · circuit q = ${p.q}</strong><br>Exact ${fmt(p.exact)}<br>Estimate ${fmt(p.est)}${Math.abs(p.exact) > 0.05 ? `<br><span>ratio ${(p.est / p.exact).toFixed(2)}</span>` : ''}`);
        svg.append(dot);
      }
      note.innerHTML = `<b>${esc(r.method)}</b> on ${esc(r.circuit)}: corr² = ${r.corr2.toFixed(2)} over ${r.n} circuits. Points on the dashed line are exact; points pulled toward the centre were shrunk by truncation.`;
    };
    list.innerHTML = rows.map((r, i) => `<button type="button" role="option" class="cal-row" data-i="${i}">
        <span class="cal-label"><b>${esc(r.method)}</b><small>${esc(r.circuit)}</small></span>
        <span class="cal-track"><i style="width:${(r.corr2 * 100).toFixed(1)}%"></i></span>
        <span class="cal-value">${r.corr2.toFixed(2)}</span></button>`).join('') +
      extra.map(r => `<div class="cal-row is-static"><span class="cal-label"><b>${esc(r.method)}</b><small>${esc(r.circuit)}</small></span><span class="cal-track"><i style="width:${(r.corr2 * 100).toFixed(1)}%"></i></span><span class="cal-value">${r.corr2.toFixed(2)}</span></div>`).join('') +
      `<p class="cal-scale">corr² against exact values · click a row to plot it</p>`;
    const buttons = [...list.querySelectorAll('button')];
    const select = i => {
      current = i;
      buttons.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); });
      draw();
    };
    buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
    select(current);
    new ResizeObserver(draw).observe(svg);
  }

  /* GPU vs CPU race ---------------------------------------------------------- */
  const race = document.querySelector('[data-otoc-race]');
  if (race) {
    const { cpu_s, gpu_s } = data.cpu_gpu;
    race.innerHTML = `
      <div class="race-row"><span>CPU <code>pauli-path</code></span><span class="race-track"><i class="is-cpu" style="--w:100%"></i></span><b>${Math.round(cpu_s).toLocaleString('en-US')} s</b></div>
      <div class="race-row"><span>GPU <code>pauli-path.gpu</code></span><span class="race-track"><i class="is-gpu" style="--w:${Math.max(gpu_s / cpu_s * 100, 0.6).toFixed(2)}%"></i></span><b>${gpu_s.toFixed(1)} s</b></div>
      <button type="button" class="race-replay">Replay at 1 s = 4 min</button>`;
    const replay = race.querySelector('.race-replay');
    const run = () => {
      race.classList.remove('is-running'); void race.offsetWidth; race.classList.add('is-running');
    };
    replay.addEventListener('click', run);
    new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) { run(); obs.disconnect(); }
    }, { threshold: 0.6 }).observe(race);
  }

  /* Level 2 vs level 3 per circuit ------------------------------------------- */
  const levels = document.querySelector('[data-otoc-levels]');
  if (levels) {
    const svg = levels.querySelector('[data-levels-svg]');
    const note = levels.querySelector('[data-levels-note]');
    const scores = { G3: ['400', '720', 800], G4: ['500', '700', 1000] };
    let prob = 'G3';
    const draw = () => {
      const rows = data.levels[prob];
      const [W, H] = size(svg);
      const m = { l: 50, r: 12, t: 14, b: 34 };
      const vals = rows.flatMap(r => [r.l2 ?? 0, r.l3]);
      let lo = Math.min(...vals), hi = Math.max(...vals);
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const px = q => m.l + (q + 0.5) / 36 * (W - m.l - m.r);
      const py = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
      const span = hi - lo, step = span > 0.6 ? 0.2 : span > 0.2 ? 0.05 : span > 0.08 ? 0.02 : 0.01;
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
        const v = +t.toFixed(3);
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(v), y2: py(v), class: v === 0 ? 'c-zero' : 'c-grid' }));
        svg.append(el('text', { x: m.l - 8, y: py(v) + 4, 'text-anchor': 'end', class: 'c-tick' }, fmt(v, step < 0.05 ? 2 : 2)));
      }
      for (let q = 0; q < 36; q += 5) svg.append(el('text', { x: px(q), y: H - m.b + 16, 'text-anchor': 'middle', class: 'c-tick' }, q));
      svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', class: 'c-axis' }, 'circuit index q'));
      for (const r of rows) {
        const a = r.l2 ?? 0;
        const g = el('g', { class: 'l-col', tabindex: 0 });
        g.append(el('rect', { x: px(r.q) - (W - m.l - m.r) / 72, y: m.t, width: (W - m.l - m.r) / 36, height: H - m.t - m.b, class: 'c-hit' }));
        g.append(el('line', { x1: px(r.q), x2: px(r.q), y1: py(a), y2: py(r.l3), class: 'l-link' }));
        g.append(el('circle', { cx: px(r.q), cy: py(a), r: 3.6, class: 'l-l2' }));
        g.append(el('circle', { cx: px(r.q), cy: py(r.l3), r: 5, class: 'l-l3' }));
        hover(g, () => `<strong>${prob} · circuit q = ${r.q}</strong><br>Level 2: ${r.l2 === null ? '— (no value, set to 0)' : fmt(r.l2, 4)}${r.l2thr ? ` <span>δ = ${r.l2thr}</span>` : ''}<br>Level 3: ${fmt(r.l3, 4)} <span>δ = ${r.l3thr}</span>${Math.abs(a) > 1e-4 ? `<br><span>${(r.l3 / a).toFixed(1)}× the level-2 value</span>` : ''}`);
        svg.append(g);
      }
      const [s2, s3, max] = scores[prob];
      note.innerHTML = `${prob}: level 2 scored <b>${s2} / ${max}</b>, level 3 scored <b>${s3} / ${max}</b>. Same simulator and similar thresholds; only the server-side gate pre-processing differs.${prob === 'G4' ? ' Level 3 on G4 ran at a fixed δ = 5e-5 to fit the remaining credit.' : ''}`;
    };
    toggle(levels.querySelector('[data-levels-problem]'), 'problem', p => { prob = p; draw(); });
    new ResizeObserver(draw).observe(svg);
  }

  /* G1 / G2 profiles ---------------------------------------------------------- */
  const prof = document.querySelector('[data-otoc-profiles]');
  if (prof) {
    const svg = prof.querySelector('[data-profile-svg]');
    let prob = 'G2';
    const draw = () => {
      const { values, butterflies } = data.profiles[prob];
      const [W, H] = size(svg);
      const m = { l: 40, r: 10, t: 22, b: 34 };
      const n = values.length;
      const px = q => m.l + (q + 0.5) / n * (W - m.l - m.r);
      const py = v => m.t + (1.1 - v) / 1.3 * (H - m.t - m.b);
      for (const v of [0, 0.5, 1]) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(v), y2: py(v), class: v === 0 ? 'c-zero' : 'c-grid' }));
        svg.append(el('text', { x: m.l - 6, y: py(v) + 4, 'text-anchor': 'end', class: 'c-tick' }, v));
      }
      if (prob === 'G2') {
        svg.append(el('rect', { x: px(12) - 6, y: m.t, width: px(21) - px(12) + 12, height: H - m.t - m.b, class: 'pr-shield' }));
        svg.append(el('text', { x: (px(12) + px(21)) / 2, y: m.t + 12, 'text-anchor': 'middle', class: 'pr-note' }, 'shielded by weak bonds'));
      }
      for (const b of butterflies) {
        svg.append(el('line', { x1: px(b), x2: px(b), y1: m.t, y2: H - m.b, class: 'pr-butterfly' }));
        svg.append(el('text', { x: px(b), y: m.t - 6, 'text-anchor': 'middle', class: 'pr-bnote' }, 'butterfly'));
      }
      for (const p of values) {
        const g = el('g', { class: 'pr-stem', tabindex: 0 });
        g.append(el('line', { x1: px(p.q), x2: px(p.q), y1: py(0), y2: py(p.v), class: 'pr-line' }));
        g.append(el('circle', { cx: px(p.q), cy: py(p.v), r: 4, class: 'pr-dot' }));
        g.append(el('rect', { x: px(p.q) - (W - m.l - m.r) / n / 2, y: m.t, width: (W - m.l - m.r) / n, height: H - m.t - m.b, class: 'c-hit' }));
        hover(g, () => `<strong>${prob} · measured qubit ${p.q}</strong><br>⟨Z⟩ = ${fmt(p.v)}`);
        svg.append(g);
      }
      for (let q = 0; q < n; q += 5) svg.append(el('text', { x: px(q), y: H - m.b + 16, 'text-anchor': 'middle', class: 'c-tick' }, q));
      svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', class: 'c-axis' }, 'measured qubit q'));
    };
    toggle(prof.querySelector('[data-profile-problem]'), 'problem', p => { prob = p; draw(); });
    new ResizeObserver(draw).observe(svg);
  }
})();
