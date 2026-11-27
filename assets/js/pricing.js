// Resource plane for the derivative-pricing page: Toffoli count vs peak qubits per benchmark.
(() => {
  const root = document.querySelector('[data-pricing-chart]');
  const dataEl = document.querySelector('[data-pricing-data]');
  if (!root || !dataEl) return;
  const benchmarks = JSON.parse(dataEl.textContent);
  const svg = root.querySelector('[data-pricing-svg]');
  const tabs = root.querySelector('[data-pricing-tabs]');
  const detail = root.querySelector('[data-pricing-detail]');
  const wideWrap = root.querySelector('[data-pricing-wide-wrap]');
  const wideBox = root.querySelector('[data-pricing-wide]');
  const NS = 'http://www.w3.org/2000/svg';
  const num = (s) => Number(String(s).replace(/,/g, ''));
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'M' : Math.round(n).toLocaleString('en-US');
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const KIND = { reference: 'Reference', control: 'Control or transfer', reconstruction: 'Price-space reconstruction' };
  const SHORT = { autocallable: 'Autocallable', tarf: 'TARF', 'second-setting': 'Changed parameters', hhl: 'HHL angle' };

  let current = benchmarks[0];
  let selected = null;

  benchmarks.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = SHORT[b.id] || b.label;
    btn.dataset.id = b.id;
    btn.addEventListener('click', () => { current = b; selected = null; render(); });
    tabs.appendChild(btn);
  });
  wideBox.addEventListener('change', render);
  new ResizeObserver(() => render()).observe(svg);

  function rowsFor(b) {
    return b.rows
      .filter((r) => !r.variant && (wideBox.checked || r.kind !== 'reconstruction'))
      .map((r) => ({ ...r, g: num(r.gates), q: num(r.qubits), ratio: num(r.log_ratio) }));
  }

  function logTicks(lo, hi) {
    const out = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
      for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    }
    if (out.length > 7) return out.filter((v) => /^[15]/.test(String(v)));
    if (out.length < 3) {
      const extra = [];
      for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
        for (let m = 1; m < 10; m++) { const v = m * 10 ** e; if (v >= lo && v <= hi) extra.push(v); }
      return extra.length > 8 ? extra.filter((_, i) => i % 2 === 0) : extra;
    }
    return out;
  }
  function linTicks(lo, hi, n = 5) {
    const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
    return out;
  }

  const larger = (r) => (1 / r.ratio).toLocaleString('en-US', { maximumFractionDigits: r.ratio < 0.1 ? 0 : 2 });
  const ratioLabel = (r) => r.ratio >= 1 ? `${r.log_ratio}× smaller` : `${larger(r)}× larger`;

  function render() {
    [...tabs.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === current.id)));
    const hasWide = current.rows.some((r) => r.kind === 'reconstruction');
    wideWrap.hidden = !hasWide;
    const rows = rowsFor(current);
    const ref = rows.find((r) => r.kind === 'reference');
    if (!selected || !rows.includes(selected)) selected = rows.find((r) => r.best) || rows[0];

    const W = svg.clientWidth || 600, H = svg.clientHeight || 360;
    const m = { l: 52, r: 18, t: 14, b: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const gs = rows.map((r) => r.g), qs = rows.map((r) => r.q);
    const gLo = Math.min(...gs) / 1.25, gHi = Math.max(...gs) * 1.3;
    const qPad = (Math.max(...qs) - Math.min(...qs)) * 0.14 + 4;
    const qLo = Math.max(0, Math.min(...qs) - qPad), qHi = Math.max(...qs) + qPad;
    const x = (g) => m.l + (Math.log(g) - Math.log(gLo)) / (Math.log(gHi) - Math.log(gLo)) * iw;
    const y = (q) => m.t + ih - (q - qLo) / (qHi - qLo) * ih;
    svg.replaceChildren();

    const clipId = 'pv-clip';
    const defs = el('defs', {}, svg);
    el('rect', { x: m.l, y: m.t, width: iw, height: ih }, el('clipPath', { id: clipId }, defs));

    // Region with a smaller product than the reference, and the iso-product curve.
    const P = ref.g * ref.q, pts = [];
    for (let i = 0; i <= 80; i++) {
      const g = Math.exp(Math.log(gLo) + (Math.log(gHi) - Math.log(gLo)) * i / 80);
      pts.push([x(g), y(Math.max(qLo - 50, Math.min(qHi + 50, P / g)))]);
    }
    const plot = el('g', { 'clip-path': `url(#${clipId})` }, svg);
    el('path', { class: 'pv-better', d: `M${m.l},${m.t + ih} ` + pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${m.l + iw},${m.t + ih} Z` }, plot);

    // Grid and ticks
    const grid = el('g', {}, svg);
    linTicks(qLo, qHi).forEach((q) => {
      el('line', { class: 'pv-grid', x1: m.l, x2: m.l + iw, y1: y(q), y2: y(q) }, grid);
      el('text', { class: 'pv-tick', x: m.l - 8, y: y(q) + 4, 'text-anchor': 'end' }, grid).textContent = q.toLocaleString('en-US');
    });
    let lastX = -1e9;
    const xt = (gHi / gLo < 3 ? linTicks(gLo, gHi, 4) : logTicks(gLo, gHi)).filter((g) => { const ok = x(g) - lastX > 58; if (ok) lastX = x(g); return ok; });
    xt.forEach((g) => {
      el('line', { class: 'pv-grid', x1: x(g), x2: x(g), y1: m.t, y2: m.t + ih }, grid);
      el('text', { class: 'pv-tick', x: x(g), y: m.t + ih + 17, 'text-anchor': 'middle' }, grid).textContent = fmt(g);
    });
    el('line', { class: 'pv-axis', x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }, svg);
    el('line', { class: 'pv-axis', x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih }, svg);
    el('text', { class: 'pv-axis-title', x: m.l + iw / 2, y: H - 6, 'text-anchor': 'middle' }, svg).textContent = 'Toffoli gates (log scale)';
    el('text', { class: 'pv-axis-title', x: 0, y: 0, transform: `translate(13 ${m.t + ih / 2}) rotate(-90)`, 'text-anchor': 'middle' }, svg).textContent = 'Peak logical qubits';

    el('path', { class: 'pv-iso', d: 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') }, plot);

    if (selected !== ref) el('line', { class: 'pv-link', x1: x(ref.g), y1: y(ref.q), x2: x(selected.g), y2: y(selected.q) }, svg);

    // Points, with greedy label placement that drops labels that would collide.
    const boxes = rows.map((r) => ({ x0: x(r.g) - 7, x1: x(r.g) + 7, y0: y(r.q) - 7, y1: y(r.q) + 7 }));
    const hit = (b) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) || b.x0 < m.l || b.x1 > W || b.y0 < 0 || b.y1 > m.t + ih;
    const order = [...rows].sort((a, b) => (b === selected) - (a === selected) || (b.kind === 'reference') - (a.kind === 'reference') || (b.best ? 1 : 0) - (a.best ? 1 : 0));
    const marks = el('g', {}, svg);
    const labelLayer = el('g', {}, svg);
    order.forEach((r) => {
      const cx = x(r.g), cy = y(r.q);
      const g = el('g', { class: `pv-mark ${r.kind ? 'is-' + r.kind : ''} ${r === selected ? 'is-selected' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${r.name}: ${r.gates} Toffolis, ${r.qubits} qubits, ${r.log_ratio} times reference` }, marks);
      el('circle', { class: 'pv-hit', cx, cy, r: 14 }, g);
      if (r.kind === 'control' || r.kind === 'reconstruction') el('rect', { class: 'pv-dot', x: cx - 6, y: cy - 6, width: 12, height: 12, transform: `rotate(45 ${cx} ${cy})` }, g);
      else el('circle', { class: 'pv-dot', cx, cy, r: r.kind === 'reference' ? 6 : 6.5 }, g);
      const pick = () => { selected = r; render(); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      g.addEventListener('mouseenter', (e) => showTip(e, r));
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', hideTip);

      const name = r.plot || r.name;
      const ratioTxt = r.kind === 'reference' ? '' : ratioLabel(r);
      const w = (name.length + ratioTxt.length + 2) * 6.4, h = 15;
      const spots = [[cx + 11, cy + 4, 'start'], [cx - 11, cy + 4, 'end'], [cx - w / 2, cy - 12, 'start'], [cx - w / 2, cy + 22, 'start']];
      for (const [tx, ty, anchor] of spots) {
        const x0 = anchor === 'end' ? tx - w : tx;
        const box = { x0, x1: x0 + w, y0: ty - h + 3, y1: ty + 3 };
        if (hit(box)) continue;
        boxes.push(box);
        const t = el('text', { class: 'pv-label', x: tx, y: ty, 'text-anchor': anchor }, labelLayer);
        el('tspan', {}, t).textContent = name + '  ';
        if (ratioTxt) el('tspan', { class: r.ratio < 1 ? 'pv-ratio is-worse' : 'pv-ratio' }, t).textContent = ratioTxt;
        break;
      }
    });
    renderDetail(selected, ref);
  }

  function renderDetail(r, ref) {
    const isRef = r.kind === 'reference';
    const product = r.g * r.q, better = r.ratio >= 1;
    const kicker = r.kind ? KIND[r.kind] : (r.best ? 'This work · smallest product' : 'This work');
    const vs = isRef ? '1.00×' : `${r.log_ratio}×`;
    const vsLabel = isRef ? 'Product' : (better ? 'Smaller product than reference' : 'Larger product than reference');
    const vsVal = isRef ? '' : (better ? vs : `${larger(r)}×`);
    detail.innerHTML = `
      <p class="pr-detail-kicker ${r.kind ? 'is-ref' : ''}">${kicker}</p>
      <h4>${r.name}</h4>
      <dl>
        <div><dt>Toffoli gates</dt><dd>${r.gates}</dd></div>
        <div><dt>Peak qubits</dt><dd>${r.qubits}</dd></div>
        <div><dt>Gates × qubits</dt><dd>${fmt(product)}</dd></div>
        ${isRef ? '' : `<div><dt>${vsLabel}</dt><dd class="${better ? 'is-better' : 'is-worse'}">${vsVal}</dd></div>`}
      </dl>
      ${isRef ? `<p>${current.title}. Every ratio on this chart is measured against this circuit.</p>` : `<p>Reference: ${ref.name}, ${ref.gates} Toffolis and ${ref.qubits} qubits.</p>`}
      ${r.evidence ? `<p class="pr-detail-evidence">${r.evidence}</p>` : ''}
      ${!r.kind && !r.evidence && r.best ? `<p class="pr-detail-evidence">${current.finding}</p>` : ''}`;
  }

  let tip;
  function showTip(e, r) {
    tip = tip || Object.assign(document.createElement('div'), { className: 'pv-tip' });
    tip.innerHTML = `<strong>${r.name}</strong><br>${r.gates} Toffolis · ${r.qubits} qubits${r.kind === 'reference' ? '' : `<br>Product ${ratioLabel(r)} than reference`}`;
    root.appendChild(tip);
    moveTip(e);
  }
  function moveTip(e) { if (tip) { tip.style.left = `${e.clientX + 14}px`; tip.style.top = `${e.clientY + 14}px`; } }
  function hideTip() { tip?.remove(); }

  render();
})();
