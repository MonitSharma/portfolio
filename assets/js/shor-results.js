/* Interactive figures for the Shor project page: equal-budget comparison,
   construction path, matched ablations and architecture runtimes.
   Values come from the revised paper’s Tables 5–8 and Section 6. */
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
      best: { label: 'Retuned serial reference', note: 'Each qubit cap gets the cheapest serial setting with applicable arithmetic refinements.' },
      strict: { label: 'Expanded serial model', note: 'The paper reports this sensitivity check at 1,450, 2,050 and 2,998 qubits.' },
      published: { label: 'Published configuration', note: 'Gidney’s published parameters counted by our benchmark at 1,435 qubits. This is a fixed starting point.' },
    };
    const rows = data.equal_budget;
    const featured = rows.filter(r => r.label);
    const published = data.published;
    let comparator = 'best';
    let selected = featured.at(-1);

    const circuitName = row => row.name || (row.k === 1 ? 'Single-prime circuit' : row.k + '-prime sharing');
    const parameters = row => 's = ' + row.s + ', k = ' + row.k;
    const refFor = row => {
      if (comparator === 'published') return [published.benchmark.tfact, (row.tfact / published.benchmark.tfact - 1) * 100];
      if (comparator === 'strict') return [row.strict_ref, row.change_strict];
      return [row.ref, row.change_best];
    };

    segmented(budget.querySelector('[data-comparator]'), Object.entries(comparators).map(([k, v]) => [k, v.label]), comparator, value => {
      comparator = value;
      draw();
    });
    showPath.addEventListener('change', () => {
      if (!showPath.checked && !selected.label) selected = featured.at(-1);
      draw();
    });

    function describe(row) {
      const c = comparators[comparator];
      const [ref, change] = refFor(row);
      const noReference = comparator === 'best'
        ? 'No serial setting fits this qubit cap.'
        : 'The paper gives no expanded-model estimate at this cap.';
      detail.innerHTML = `
        <p class="shor-detail-kicker">${row.label ? 'Point ' + row.label + ' · ' : ''}Table 5 benchmark</p>
        <h4>${esc(circuitName(row))} <span>${parameters(row)}</span></h4>
        <dl>
          <div><dt>Logical qubits</dt><dd>${int(row.qubits)}</dd></div>
          <div><dt>Toffolis / factoring</dt><dd>${(row.tfact / 1e9).toFixed(4)}B</dd></div>
          <div><dt>95% CI half-width</dt><dd>±${(row.ci / 1e9).toFixed(4)}B</dd></div>
          <div><dt>${esc(c.label)}</dt><dd>${ref ? billions(ref) : '—'}</dd></div>
          <div><dt>Change</dt><dd class="${change > 0 ? 'is-worse' : 'is-better'}">${ref ? pct(change) : '—'}</dd></div>
        </dl>
        <p>${esc(ref ? c.note : noReference)} ${row.s + 1} nominal runs.</p>`;
    }

    function draw() {
      svg.replaceChildren();
      const W = Math.max(280, svg.clientWidth || 720);
      const H = Math.max(280, svg.clientHeight || 380);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const narrow = W < 520;
      const m = { l: narrow ? 39 : 52, r: 18, t: 16, b: 44 };
      const x0 = 1230, x1 = 3090, y0 = 0.72e9, y1 = 13e9;
      const px = q => m.l + (q - x0) / (x1 - x0) * (W - m.l - m.r);
      const py = t => H - m.b - Math.log(t / y0) / Math.log(y1 / y0) * (H - m.t - m.b);

      for (const t of [0.8, 1, 1.5, 2, 3, 5, 8, 12]) {
        const y = py(t * 1e9);
        svg.append(el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: 'viz-grid' }));
        svg.append(el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'viz-tick' }, t + 'B'));
      }
      for (const q of narrow ? [1500, 2000, 2500, 3000] : [1300, 1600, 1900, 2200, 2500, 2800, 3000]) {
        svg.append(el('text', { x: px(q), y: H - m.b + 18, 'text-anchor': 'middle', class: 'viz-tick' }, int(q)));
      }
      svg.append(el('line', { x1: m.l, x2: W - m.r, y1: py(y0), y2: py(y0), class: 'viz-axis' }));
      svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'viz-axis-title' }, 'Logical-qubit budget'));

      const marks = [];
      function drawCircuit(row) {
        const [ref, change] = refFor(row);
        const x = px(row.qubits), y = py(row.tfact);
        const g = el('g', { class: 'viz-row' + (row === selected ? ' is-selected' : ''), tabindex: 0, role: 'button', 'aria-label': circuitName(row) + ', ' + int(row.qubits) + ' qubits, ' + parameters(row) + ', ' + billions(row.tfact) + ' Toffolis' });
        marks.push([row, g]);
        if (row.label) {
          if (ref) {
            const refY = py(ref);
            const changeClass = change > 0 ? 'is-worse' : 'is-better';
            g.append(el('line', { x1: x, x2: x, y1: refY, y2: y, class: 'viz-gap ' + changeClass }));
            g.append(el('circle', { cx: x, cy: refY, r: 5.5, class: 'viz-ref' }));
            if (Math.abs(refY - y) > 15 && (!narrow || row.cover)) {
              const alignRight = row.qubits >= 2700;
              const labelY = (refY + y) / 2 + (narrow ? -6 : 4);
              g.append(el('text', { x: x + (alignRight ? -9 : 9), y: labelY, 'text-anchor': alignRight ? 'end' : 'start', class: 'viz-change ' + changeClass }, pct(change)));
            }
          }
          g.append(el('path', { d: `M${x} ${y - 8}L${x + 8} ${y}L${x} ${y + 8}L${x - 8} ${y}Z`, class: 'viz-ours' + (row.k === 1 ? ' is-ablation' : '') }));
          g.append(el('text', { x: x - 10, y: y + 4, 'text-anchor': 'end', class: 'viz-id' }, row.label));
        } else {
          g.append(el('circle', { cx: x, cy: y, r: 4, class: 'viz-ours viz-path-dot' }));
        }
        g.append(el('circle', { cx: x, cy: y, r: row.label ? 11 : 6, class: 'viz-hit' }));
        const select = () => {
          selected = row;
          describe(row);
          for (const [item, mark] of marks) mark.classList.toggle('is-selected', item === row);
        };
        g.addEventListener('click', select);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
        hover(g, () => '<strong>' + esc(circuitName(row)) + '</strong><br>' + int(row.qubits) + ' qubits · ' + parameters(row) + '<br>' + billions(row.tfact) + ' Toffolis per factoring' + (ref ? ' · ' + pct(change) : ''));
        svg.append(g);
      }
      if (showPath.checked) rows.filter(row => !row.label).forEach(drawCircuit);

      const pm = published.model, pb = published.benchmark;
      const sq = el('rect', { x: px(pm.qubits) - 5, y: py(pm.tfact) - 5, width: 10, height: 10, class: 'viz-published', tabindex: 0 });
      hover(sq, () => `<strong>Published configuration</strong><br>Published model: ${int(pm.qubits)} qubits · ${billions(pm.tfact)}<br>Our benchmark: ${int(pb.qubits)} qubits · ${billions(pb.tfact)}`);
      svg.append(sq);
      svg.append(el('text', { x: px(pm.qubits) + 9, y: py(pm.tfact) - 8, class: 'viz-label' }, narrow ? 'Published' : 'Published configuration'));

      featured.forEach(drawCircuit);
      describe(selected);
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
    const steps = data.construction_path;
    let step = steps.length - 1;
    let timer = null;
    const maxT = 1.05e9;
    const qMin = 1200, qMax = 1900;

    function render() {
      slider.max = steps.length - 1;
      slider.value = step;
      list.replaceChildren();
      steps.forEach((s, i) => {
        const row = html('button', { type: 'button', class: `path-row is-${s.kind}${i === step ? ' is-current' : ''}${i > step ? ' is-ahead' : ''}`, 'aria-pressed': String(i === step) });
        row.innerHTML = `
          <span class="path-name">${esc(s.name)}</span>
          <span class="path-bar path-bar-t"><i style="width:${(s.tshot / maxT * 100).toFixed(2)}%"></i><b>${int(s.tshot / 1e6)}</b>${s.change ? `<em>${pct(s.change)}</em>` : ''}</span>
          <span class="path-bar path-bar-q"><i style="width:${((s.qubits - qMin) / (qMax - qMin) * 100).toFixed(2)}%"></i><b>${int(s.qubits)}</b></span>`;
        row.addEventListener('click', () => { stop(); step = i; render(); });
        list.append(row);
      });
      const s = steps[step], base = steps[0], prev = steps[Math.max(0, step - 1)];
      const stepDelta = step ? (s.tshot / prev.tshot - 1) * 100 : 0;
      panel.innerHTML = `
        <p class="shor-detail-kicker">Step ${step} of ${steps.length - 1} · single-prime path</p>
        <h4>${esc(s.name)}</h4>
        <p>${esc(s.why)}</p>
        <dl>
          <div><dt>Toffolis / execution</dt><dd>${int(s.tshot / 1e6)}M</dd></div>
          <div><dt>Logical qubits</dt><dd>${int(s.qubits)} <small>${s.qubits === base.qubits ? '' : `(${s.qubits > base.qubits ? '+' : '−'}${int(Math.abs(s.qubits - base.qubits))})`}</small></dd></div>
          <div><dt>This step</dt><dd class="is-better">${step ? pct(stepDelta) : '—'}</dd></div>
          <div><dt>Since published</dt><dd class="is-better">${s.change ? pct(s.change) : '—'}</dd></div>
        </dl>`;
    }
    slider.addEventListener('input', () => { stop(); step = Number(slider.value); render(); });
    function stop() { clearInterval(timer); timer = null; play.textContent = 'Play ▸'; play.setAttribute('aria-pressed', 'false'); }
    play.addEventListener('click', () => {
      if (timer) return stop();
      if (step >= steps.length - 1) step = 0;
      render();
      play.textContent = 'Pause ❚❚'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        if (step >= steps.length - 1) return stop();
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
    const unitWord = (v, u) => {
      if (u === 'y') return `${v.toFixed(1)} years`;
      if (v < 1) return `${(v * 24).toFixed(1)} hours`;
      return `${v.toFixed(2)} days`;
    };

    segmented(arch.querySelector('[data-arch-choice]'), data.architectures.map(a => [a.id, a.name]), current, id => { current = id; render(); });
    sortBox.addEventListener('change', () => { sorted = sortBox.checked; render(); });

    function render() {
      const a = data.architectures.find(x => x.id === current);
      const rows = [...data.runtimes];
      const byRuntime = (p, q) => p[current] - q[current];
      if (sorted) rows.sort(byRuntime);
      const maxRatio = 3;
      list.replaceChildren(...rows.map(r => {
        const time = r[current];
        const ratio = time / a.reference;
        const uncosted = !r.fits && current !== 'surface';
        const row = html('div', { class: `arch-row ${ratio > 1 ? 'is-slower' : 'is-faster'}${uncosted ? ' is-uncosted' : ''}`, tabindex: 0 });
        row.innerHTML = `
          <span class="arch-name">${esc(r.name)}${uncosted ? ' <sup title="Extrapolated beyond the 1,480-qubit memory">†</sup>' : ''}</span>
          <span class="arch-track"><i style="width:${Math.min(ratio / maxRatio * 100, 100).toFixed(2)}%"></i><b class="arch-ref" style="left:${(1 / maxRatio * 100).toFixed(2)}%"></b></span>
          <span class="arch-value"><strong>${ratio.toFixed(2)}×</strong> ${unitWord(time, a.unit)}</span>`;
        hover(row, () => `<strong>${esc(r.name)}</strong>${data.architectures.map(x => `<br>${esc(x.name)}: ${unitWord(r[x.id], x.unit)} (${pct((r[x.id] / x.reference - 1) * 100)})${!r.fits && x.id !== 'surface' ? ' †' : ''}`).join('')}`);
        return row;
      }));
      const eligible = rows.filter(r => current === 'surface' || r.fits);
      const best = eligible.sort(byRuntime)[0];
      const capacity = current === 'surface' ? '' : ' within the published memory';
      summary.innerHTML = `<strong>${esc(a.name)}</strong> · ${esc(a.source)}. Tuned reference: ${esc(a.reference_label)}. Fastest shown${capacity}: <em>${esc(best.name)}</em> at ${unitWord(best[current], a.unit)}.`;
    }
    render();
  }
})();
