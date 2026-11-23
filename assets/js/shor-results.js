/* Interactive figures for the Shor project page: equal-budget comparison,
   construction path, matched ablations and architecture runtimes.
   All values come from _data/shor_results.yml (the paper's Tables 1, 5, 6, 7). */
(() => {
  const source = document.querySelector('[data-shor-results]');
  if (!source) return;
  const data = JSON.parse(source.textContent);
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const html = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const billions = v => `${(v / 1e9).toFixed(2)}B`;
  const pct = v => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)}%`;
  const int = v => Math.round(v).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* One shared tooltip ---------------------------------------------------- */
  const tip = html('div', { class: 'shor-tip', role: 'status', 'aria-live': 'polite' });
  tip.hidden = true;
  document.body.append(tip);
  function showTip(event, content) {
    tip.innerHTML = content;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const pt = event.touches ? event.touches[0] : event;
    let x = (pt.clientX ?? 0) + 14;
    let y = (pt.clientY ?? 0) + 14;
    if (event.type === 'focus') {
      const b = event.target.getBoundingClientRect();
      x = b.right + 8; y = b.top;
    }
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

  function segmented(container, options, initial, onChange) {
    container.replaceChildren();
    const buttons = options.map(([value, label]) => {
      const b = html('button', { type: 'button', 'aria-pressed': String(value === initial) }, label);
      b.dataset.value = value;
      b.addEventListener('click', () => {
        buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        onChange(value);
      });
      container.append(b);
      return b;
    });
    return buttons;
  }

  /* 1. Equal-budget comparison ------------------------------------------- */
  const budget = document.querySelector('[data-budget-chart]');
  if (budget) {
    const svg = budget.querySelector('svg');
    const detail = budget.querySelector('[data-budget-detail]');
    const showPath = budget.querySelector('[data-show-path]');
    const comparators = {
      best: { key: 'change_best', label: 'Best improved reference', note: 'The reference circuit at its cheapest setting within the same qubit budget, given every refinement that applies to it (measured cleanup, non-restoring division, banking, half-modulus quotient, final CRT digit). This is the paper’s headline comparator.' },
      plain: { key: 'change_plain', label: 'Without banking', note: 'The same search, but without giving the reference banked lookups and the half-modulus quotient, the two refinements that help it most.' },
      model: { key: 'change_model', label: 'Published model only', note: 'The cheapest setting of Gidney’s published cost model alone within the same qubit budget.' },
    };
    let comparator = 'best';
    let selected = 'C';
    const rows = data.equal_budget;
    const pathPoints = data.construction_paths.flatMap(p => p.steps.filter(s => s.kind !== 'base'));
    const refFor = row => {
      const change = row[comparators[comparator].key];
      return change === undefined ? null : row.tfact / (1 + change / 100);
    };

    segmented(budget.querySelector('[data-comparator]'), Object.entries(comparators).map(([k, v]) => [k, v.label]), comparator, value => {
      comparator = value; draw();
    });
    showPath?.addEventListener('change', draw);

    function describe(row) {
      const c = comparators[comparator];
      const change = row[c.key];
      const ref = refFor(row);
      detail.innerHTML = `
        <p class="shor-detail-kicker">Row ${row.id} · ${row.pareto ? 'on our Pareto set' : 'ablation without sharing'}</p>
        <h4>${esc(row.name)} <span>${esc(row.detail)}</span></h4>
        <dl>
          <div><dt>Logical qubits</dt><dd>${int(row.qubits)}</dd></div>
          <div><dt>Toffolis / factoring</dt><dd>${billions(row.tfact)}</dd></div>
          <div><dt>${esc(c.label)}</dt><dd>${ref ? (comparator === 'best' ? '' : '≈ ') + billions(ref) : 'n/a'}</dd></div>
          <div><dt>Change</dt><dd class="${change > 0 ? 'is-worse' : 'is-better'}">${change === undefined ? 'n/a' : pct(change)}</dd></div>
        </dl>
        <p>${esc(c.note)}${comparator === 'best' ? '' : ' Reference values here are derived from the reported percentage.'} Against the published configuration itself, this circuit changes the count by <strong>${pct(row.change_published)}</strong>.</p>`;
    }

    function draw() {
      svg.replaceChildren();
      const W = Math.max(320, svg.clientWidth || 720);
      const H = Math.max(280, svg.clientHeight || 380);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const narrow = W < 520;
      const m = { l: narrow ? 40 : 56, r: 14, t: 16, b: 44 };
      const x0 = 1380, x1 = 1840, y0 = 1.5e9, y1 = 6.3e9;
      const px = q => m.l + (q - x0) / (x1 - x0) * (W - m.l - m.r);
      const py = t => H - m.b - (t - y0) / (y1 - y0) * (H - m.t - m.b);

      for (let t = 2e9; t <= 6e9; t += 1e9) {
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(t), y2: py(t), class: 'viz-grid' }));
        svg.append(el('text', { x: m.l - 8, y: py(t) + 4, 'text-anchor': 'end', class: 'viz-tick' }, `${t / 1e9}B`));
      }
      for (let q = 1400; q <= 1800; q += narrow ? 200 : 100) {
        svg.append(el('text', { x: px(q), y: H - m.b + 18, 'text-anchor': 'middle', class: 'viz-tick' }, int(q)));
      }
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(y0), y2: py(y0), class: 'viz-axis' }));
      svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'viz-axis-title' }, 'Logical-qubit budget'));
      if (!narrow) svg.append(el('text', { x: m.l, y: m.t - 2, class: 'viz-axis-title', 'text-anchor': 'start', dy: '-0.1em' }, ''));

      if (showPath?.checked) {
        for (const p of pathPoints) {
          const dot = el('circle', { cx: px(p.qubits), cy: py(p.tfact), r: 4, class: 'viz-path-dot', tabindex: 0 });
          hover(dot, () => `<strong>${esc(p.name)}</strong><br>${int(p.qubits)} qubits · ${billions(p.tfact)} Toffolis<br><span>${pct(p.change)} vs. published configuration</span>`);
          svg.append(dot);
        }
      }

      // Published configuration in the published model and in the benchmark.
      const pm = data.published.model, pb = data.published.benchmark;
      const sq = el('rect', { x: px(pm.qubits) - 5, y: py(pm.tfact) - 5, width: 10, height: 10, class: 'viz-published', tabindex: 0 });
      hover(sq, () => `<strong>Published configuration</strong><br>Published model: ${int(pm.qubits)} qubits · ${billions(pm.tfact)}<br>Our benchmark: ${int(pb.qubits)} qubits · ${billions(pb.tfact)}`);
      svg.append(sq);
      svg.append(el('text', { x: px(pm.qubits) + 9, y: py(pm.tfact) - 8, class: 'viz-label' }, narrow ? 'Published' : 'Published configuration'));

      for (const row of rows) {
        const ref = refFor(row);
        const change = row[comparators[comparator].key];
        const g = el('g', { class: `viz-row${row.id === selected ? ' is-selected' : ''}`, tabindex: 0, role: 'button', 'aria-label': `Row ${row.id}: ${row.name}, ${int(row.qubits)} qubits, ${billions(row.tfact)} Toffolis${change === undefined ? '' : `, ${pct(change)}`}` });
        const x = px(row.qubits);
        if (ref) {
          const worse = change > 0;
          g.append(el('line', { x1: x, x2: x, y1: py(ref), y2: py(row.tfact), class: `viz-gap ${worse ? 'is-worse' : 'is-better'}` }));
          g.append(el('circle', { cx: x, cy: py(ref), r: 5.5, class: 'viz-ref' }));
          if (row.pareto) {
            const labelY = (py(ref) + py(row.tfact)) / 2 + 4;
            g.append(el('text', { x: x + 9, y: labelY, class: `viz-change ${worse ? 'is-worse' : 'is-better'}` }, pct(change)));
          }
        }
        g.append(el('path', { d: `M${x} ${py(row.tfact) - 8}L${x + 8} ${py(row.tfact)}L${x} ${py(row.tfact) + 8}L${x - 8} ${py(row.tfact)}Z`, class: `viz-ours${row.pareto ? '' : ' is-ablation'}` }));
        if (row.pareto) {
          g.append(el('text', { x: x - 11, y: py(row.tfact) + 4, 'text-anchor': 'end', class: 'viz-id' }, row.id));
        } else {
          // D and E sit 10 qubits apart: give each a callout on opposite sides so marks and text never overlap.
          const top = Math.min(py(row.tfact), ref ? py(ref) : Infinity) - 8;
          const bottom = Math.max(py(row.tfact), ref ? py(ref) : -Infinity) + 8;
          const up = row.id === 'D';
          const reach = narrow ? 30 : 48;
          const [ax, ay] = up ? [x - 4, top] : [x + 4, bottom];
          const [lx, ly] = up ? [x - reach, top - 26] : [x + reach, bottom + 26];
          g.append(el('path', { d: `M${ax} ${ay}L${lx} ${ly + (up ? 6 : -12)}`, class: 'viz-leader' }));
          const label = el('text', { x: up ? lx - 2 : lx + 2, y: ly, 'text-anchor': up ? 'end' : 'start', class: 'viz-callout' });
          label.append(el('tspan', { class: 'viz-callout-id' }, `${row.id} `));
          label.append(el('tspan', {}, narrow ? '' : 'no sharing '));
          if (ref) label.append(el('tspan', { class: `viz-callout-change ${change > 0 ? 'is-worse' : 'is-better'}` }, pct(change)));
          g.append(label);
        }
        g.append(el('circle', { cx: x, cy: (py(row.tfact) + py(ref ?? row.tfact)) / 2, r: Math.max(16, Math.abs(py(row.tfact) - py(ref ?? row.tfact)) / 2 + 10), class: 'viz-hit' }));
        const select = () => { selected = row.id; describe(row); svg.querySelectorAll('.viz-row').forEach(n => n.classList.toggle('is-selected', n === g)); };
        g.addEventListener('click', select);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
        hover(g, () => `<strong>${row.id} · ${esc(row.name)}</strong><br>${int(row.qubits)} qubits · ${billions(row.tfact)} Toffolis<br>${ref ? `Reference ≈ ${billions(ref)} · <b>${pct(change)}</b>` : 'No value for this comparator'}`);
        svg.append(g);
      }
      describe(rows.find(r => r.id === selected));
    }
    draw();
    new ResizeObserver(draw).observe(svg);
  }

  /* 2. Construction path -------------------------------------------------- */
  const pathBox = document.querySelector('[data-path-chart]');
  if (pathBox) {
    const list = pathBox.querySelector('[data-path-rows]');
    const panel = pathBox.querySelector('[data-path-detail]');
    const slider = pathBox.querySelector('[data-path-step]');
    const play = pathBox.querySelector('[data-path-play]');
    let path = data.construction_paths[0];
    let step = path.steps.length - 1;
    let timer = null;
    const maxT = 6.5e9;
    const qMin = 1200, qMax = 1900;

    segmented(pathBox.querySelector('[data-path-choice]'), data.construction_paths.map(p => [p.id, p.label]), path.id, id => {
      stop();
      path = data.construction_paths.find(p => p.id === id);
      step = path.steps.length - 1;
      render();
    });

    function render() {
      slider.max = path.steps.length - 1;
      slider.value = step;
      list.replaceChildren();
      path.steps.forEach((s, i) => {
        const row = html('button', { type: 'button', class: `path-row is-${s.kind}${i === step ? ' is-current' : ''}${i > step ? ' is-ahead' : ''}`, 'aria-pressed': String(i === step) });
        row.innerHTML = `
          <span class="path-name">${esc(s.name)}</span>
          <span class="path-bar path-bar-t"><i style="width:${(s.tfact / maxT * 100).toFixed(2)}%"></i><b>${(s.tfact / 1e9).toFixed(2)}</b>${s.change ? `<em>${pct(s.change)}</em>` : ''}</span>
          <span class="path-bar path-bar-q"><i style="width:${((s.qubits - qMin) / (qMax - qMin) * 100).toFixed(2)}%"></i><b>${int(s.qubits)}</b></span>`;
        row.addEventListener('click', () => { stop(); step = i; render(); });
        list.append(row);
      });
      const s = path.steps[step], base = path.steps[0], prev = path.steps[Math.max(0, step - 1)];
      const stepDelta = step ? (s.tfact / prev.tfact - 1) * 100 : 0;
      panel.innerHTML = `
        <p class="shor-detail-kicker">Step ${step} of ${path.steps.length - 1} · ${s.kind === 'base' ? 'starting point' : s.kind === 'core' ? 'shared lookups, checkpoints, lazy residues' : 'further arithmetic refinement'}</p>
        <h4>${esc(s.name)}</h4>
        <p>${esc(s.why)}</p>
        <dl>
          <div><dt>Toffolis / factoring</dt><dd>${billions(s.tfact)}</dd></div>
          <div><dt>Per circuit execution</dt><dd>${(s.tshot / 1e8).toFixed(2)} × 10⁸</dd></div>
          <div><dt>Logical qubits</dt><dd>${int(s.qubits)} <small>${s.qubits === base.qubits ? '' : `(${s.qubits > base.qubits ? '+' : '−'}${int(Math.abs(s.qubits - base.qubits))})`}</small></dd></div>
          <div><dt>This step</dt><dd class="is-better">${step ? pct(stepDelta) : '—'}</dd></div>
          <div><dt>Since published</dt><dd class="is-better">${s.change ? pct(s.change) : '—'}</dd></div>
        </dl>`;
    }
    slider.addEventListener('input', () => { stop(); step = Number(slider.value); render(); });
    function stop() { clearInterval(timer); timer = null; play.textContent = 'Play ▸'; play.setAttribute('aria-pressed', 'false'); }
    play.addEventListener('click', () => {
      if (timer) return stop();
      if (step >= path.steps.length - 1) step = 0;
      render();
      play.textContent = 'Pause ❚❚'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (step >= path.steps.length - 1) return stop();
        step += 1; render();
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 2200 : 1300);
    });
    render();
  }

  /* 3. Matched ablations -------------------------------------------------- */
  const ablation = document.querySelector('[data-ablation-chart]');
  if (ablation) {
    const a = data.ablations;
    const find = (w1, k, c, lazy) => a.find(r => r.w1 === w1 && r.k === k && r.checkpoints === c && r.lazy === lazy);
    const contrasts = [
      { label: 'Keep all checkpoints', context: 'w₁ = 6, no sharing', from: find(6, 1, 0, false), to: find(6, 1, 4, false) },
      { label: 'Then lazy residues', context: 'w₁ = 6, no sharing', from: find(6, 1, 4, false), to: find(6, 1, 4, true) },
      { label: 'Share lookups across 3 primes', context: 'w₁ = 6, all checkpoints', from: find(6, 1, 4, false), to: find(6, 3, 4, false) },
      { label: 'Lazy residues with 6-prime sharing', context: 'w₁ = 8, all checkpoints', from: find(8, 6, 4, false), to: find(8, 6, 4, true) },
    ];
    const lo = 2e9, hi = 6e9;
    const pos = v => ((v - lo) / (hi - lo) * 100).toFixed(2);
    ablation.replaceChildren(...contrasts.map(c => {
      const change = (c.to.tfact / c.from.tfact - 1) * 100;
      const row = html('div', { class: 'ablation-row', tabindex: 0 });
      row.innerHTML = `
        <div class="ablation-label"><strong>${esc(c.label)}</strong><span>${esc(c.context)}</span></div>
        <div class="ablation-track" aria-hidden="true">
          <span class="ablation-line" style="left:${pos(c.to.tfact)}%; width:${(pos(c.from.tfact) - pos(c.to.tfact)).toFixed(2)}%"></span>
          <span class="ablation-from" style="left:${pos(c.from.tfact)}%"></span>
          <span class="ablation-to" style="left:${pos(c.to.tfact)}%"></span>
        </div>
        <div class="ablation-value">${pct(change)}</div>`;
      hover(row, () => `<strong>${esc(c.label)}</strong><br>${(c.from.tfact / 1e9).toFixed(3)}B → ${(c.to.tfact / 1e9).toFixed(3)}B Toffolis<br>${int(c.from.qubits)} → ${int(c.to.qubits)} qubits`);
      return row;
    }), (() => {
      const axis = html('div', { class: 'ablation-axis', 'aria-hidden': 'true' });
      axis.innerHTML = `<span></span><span class="ablation-scale">${[2, 3, 4, 5, 6].map(v => `<i style="left:${pos(v * 1e9)}%">${v}B</i>`).join('')}</span><span></span>`;
      return axis;
    })());
  }

  /* 4. Architecture runtimes ---------------------------------------------- */
  const arch = document.querySelector('[data-arch-chart]');
  if (arch) {
    const list = arch.querySelector('[data-arch-rows]');
    const summary = arch.querySelector('[data-arch-summary]');
    const sortBox = arch.querySelector('[data-arch-sort]');
    let current = data.architectures[0].id;
    let sorted = false;
    const unitWord = (v, u) => u === 'd' ? `${v.toFixed(2)} days` : `${v.toFixed(1)} years`;

    segmented(arch.querySelector('[data-arch-choice]'), data.architectures.map(a => [a.id, a.name]), current, id => { current = id; render(); });
    sortBox.addEventListener('change', () => { sorted = sortBox.checked; render(); });

    function render() {
      const a = data.architectures.find(x => x.id === current);
      let rows = data.runtimes.map((r, i) => ({ ...r, i }));
      if (sorted) rows.sort((p, q) => p[current][1] - q[current][1]);
      const maxRatio = 1.6;
      list.replaceChildren(...rows.map(r => {
        const [time, change] = r[current];
        const ratio = 1 + change / 100;
        const uncosted = !r.fits && current !== 'surface';
        const row = html('div', { class: `arch-row ${change > 0 ? 'is-slower' : 'is-faster'}${uncosted ? ' is-uncosted' : ''}`, tabindex: 0 });
        row.innerHTML = `
          <span class="arch-name">${esc(r.name)}${uncosted ? ' <sup title="Needs more than the 1,480-qubit memory; the enlarged memory is not costed">†</sup>' : ''}</span>
          <span class="arch-track"><i style="width:${Math.min(ratio / maxRatio * 100, 100).toFixed(2)}%"></i><b class="arch-ref" style="left:${(1 / maxRatio * 100).toFixed(2)}%"></b></span>
          <span class="arch-value"><strong>${ratio.toFixed(2)}×</strong> ${unitWord(time, a.unit)}</span>`;
        hover(row, () => `<strong>${esc(r.name)}</strong>${data.architectures.map(x => `<br>${esc(x.name)}: ${unitWord(r[x.id][0], x.unit)} (${pct(r[x.id][1])})${!r.fits && x.id !== 'surface' ? ' †' : ''}`).join('')}`);
        return row;
      }));
      const faster = data.runtimes.filter(r => r[current][1] < 0).length;
      const best = [...data.runtimes].sort((p, q) => p[current][1] - q[current][1])[0];
      summary.innerHTML = `<strong>${esc(a.name)}</strong> · ${esc(a.source)}. Tuned reference: ${esc(a.reference_label)}. ${faster} of ${data.runtimes.length} circuits are faster; the fastest is <em>${esc(best.name)}</em> at ${unitWord(best[current][0], a.unit)} (${pct(best[current][1])}).`;
    }
    render();
  }
})();
