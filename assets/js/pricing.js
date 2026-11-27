(() => {
  const root = document.querySelector('[data-pricing-root]');
  if (!root) return;

  const benchmarks = JSON.parse(root.querySelector('[data-pricing-data]').textContent);
  for (const benchmark of benchmarks) {
    for (const row of benchmark.rows) {
      row.count = Number(row.gates.replaceAll(',', ''));
      row.product = row.count * row.qubits;
      row.kind ||= 'candidate';
    }
    benchmark.referenceRow = benchmark.rows.find(row => row.kind === 'reference');
  }

  const workspace = root.querySelector('[data-pricing-workspace]');
  const graph = root.querySelector('[data-pricing-graph]');
  const canvas = root.querySelector('[data-pricing-guides]');
  const ticks = root.querySelector('[data-pricing-ticks]');
  const points = root.querySelector('[data-pricing-points]');
  const circuit = root.querySelector('[data-pricing-circuit]');
  const note = root.querySelector('[data-pricing-note]');
  const rangeButton = root.querySelector('[data-pricing-range]');
  const labelsToggle = root.querySelector('[data-pricing-labels]');
  const variantsToggle = root.querySelector('[data-pricing-variants]');
  const variantsControl = root.querySelector('[data-pricing-variants-control]');
  const variantKey = root.querySelector('[data-pricing-variant-key]');
  const frontierKey = root.querySelector('[data-pricing-frontier-key]');
  const comparisonKey = root.querySelector('[data-pricing-comparison-key]');
  const benchmarkButtons = [...root.querySelectorAll('[data-benchmark]')];
  const legend = [...root.querySelectorAll('[data-pricing-kind]')];
  const stats = Object.fromEntries([...root.querySelectorAll('[data-stat]')].map(node => [node.dataset.stat, node]));
  const exact = new Intl.NumberFormat('en-US');
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
  let benchmark;
  let expanded = false;
  let view;
  let visibleRows;
  let selected;
  let marks;
  let frontier;

  const xFraction = value => {
    const [low, high] = view.x;
    return view.scale === 'log' ? Math.log(value / low) / Math.log(high / low) : (value - low) / (high - low);
  };
  const yFraction = value => (view.y[1] - value) / (view.y[1] - view.y[0]);

  function selectRow(row) {
    if (selected === row && marks.get(row).getAttribute('aria-pressed') === 'true') return;
    selected = row;
    circuit.value = String(visibleRows.indexOf(row));
    for (const [data, mark] of marks) mark.setAttribute('aria-pressed', String(data === row));

    stats.gates.textContent = exact.format(row.count);
    stats.qubits.textContent = exact.format(row.qubits);
    stats.product.textContent = exact.format(row.product);
    stats.reference.textContent = 'vs. ' + benchmark.reference;
    const change = row.product / benchmark.referenceRow.product - 1;
    stats.change.textContent = row === benchmark.referenceRow ? 'Reference' : percent.format(Math.abs(change)) + (change < 0 ? ' smaller' : ' larger');
    stats.change.dataset.better = String(change < 0);
    note.textContent = row.evidence || '';
    note.hidden = !row.evidence;
    comparisonKey.hidden = row === benchmark.referenceRow;
    drawGuides();
  }

  function drawLabels(ctx, width, height, positions, colors) {
    if (!labelsToggle.checked) return;
    const reference = benchmark.referenceRow;
    const best = benchmark.rows.find(row => row.best);
    const narrow = width < 410;
    const important = [selected, reference, best];
    const context = narrow ? visibleRows.filter(row => row.plot !== 'Signed-Booth') : visibleRows;
    const rows = new Set([...important, ...context]);
    const placed = [];
    const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const avoid = [...positions.values()].map(({x, y}) => ({ x: x - 8, y: y - 8, w: 16, h: 16 }));
    const family = colors.getPropertyValue('--pricing-ui').trim();
    const headingFont = '600 ' + (narrow ? 11 : 14) + 'px ' + family;
    const detailFont = (narrow ? 10 : 12) + 'px ' + family;
    const bounds = narrow ? 29 : 35;
    ctx.textBaseline = 'top';

    for (const row of rows) {
      if (narrow && placed.length === 5) break;
      if (!positions.has(row)) continue;
      const point = positions.get(row);
      const label = row.plot || row.name;
      const count = narrow && row.count >= 100000 ? compact.format(row.count) : exact.format(row.count);
      const detail = count + ' gates · ' + row.qubits + ' qubits';
      ctx.font = headingFont;
      const nameWidth = ctx.measureText(label).width;
      ctx.font = detailFont;
      const w = Math.ceil(Math.max(nameWidth, ctx.measureText(detail).width)) + 10;
      const h = bounds;
      let rect;

      for (const offset of [12, 27, 43, 60, 83]) {
        const sides = point.x < width / 2 ? [point.x + offset, point.x - w - offset] : [point.x - w - offset, point.x + offset];
        const lift = offset - 8;
        const above = point.y - h - lift;
        const below = point.y + lift;
        const levels = point.y > height / 2 ? [above, below] : [below, above];
        const candidates = sides.flatMap(x => [
          ...levels.map(y => ({ x, y, w, h })),
          { x, y: point.y - h / 2, w, h },
        ]).concat(levels.map(y => ({ x: point.x - w / 2, y, w, h })));
        rect = candidates.find(box => box.x >= 4 && box.y >= 4 && box.x + w <= width - 4 && box.y + h <= height - 4
          && !placed.some(other => overlaps(box, other))
          && !avoid.some(other => overlaps(box, other)));
        if (rect) break;
      }
      if (!rect) continue;

      placed.push(rect);
      const lineEndX = Math.max(rect.x, Math.min(point.x, rect.x + w));
      const lineEndY = Math.max(rect.y, Math.min(point.y, rect.y + h));
      const colorKey = { candidate: '--plot-gate', control: '--plot-control', reference: '--plot-ref', reconstruction: '--plot-wide' }[row.kind];
      ctx.strokeStyle = colors.getPropertyValue('--plot-leader').trim();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
      ctx.fillStyle = colors.getPropertyValue('--plot-label').trim();
      ctx.fillRect(rect.x, rect.y, w, h);
      ctx.fillStyle = colors.getPropertyValue(colorKey).trim();
      ctx.font = headingFont;
      ctx.fillText(label, rect.x + 5, rect.y + 3);
      ctx.fillStyle = colors.getPropertyValue('--plot-muted').trim();
      ctx.font = detailFont;
      ctx.fillText(detail, rect.x + 5, rect.y + (narrow ? 15 : 20));
    }
  }

  function drawGuides() {
    if (!view) return;
    const width = graph.clientWidth;
    const height = graph.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx || !width || !height) return;

    const colors = getComputedStyle(graph);
    ctx.scale(ratio, ratio);
    const positions = new Map(visibleRows.map(row => [row, { x: width * xFraction(row.count), y: height * yFraction(row.qubits) }]));
    const [low, high] = view.x;
    const boundary = Array.from({ length: 81 }, (_, step) => {
      const fraction = step / 80;
      const gates = view.scale === 'log' ? low * (high / low) ** fraction : low + (high - low) * fraction;
      return { x: fraction * width, y: yFraction(benchmark.referenceRow.product / gates) * height };
    });
    ctx.fillStyle = colors.getPropertyValue('--plot-better-area').trim();
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (const point of boundary) ctx.lineTo(point.x, Math.min(height, Math.max(0, point.y)));
    ctx.lineTo(width, height);
    ctx.fill();

    ctx.strokeStyle = colors.getPropertyValue('--plot-grid').trim();
    ctx.beginPath();
    for (const value of view.x_ticks) {
      const x = width * xFraction(value);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (const value of view.y_ticks) {
      const y = height * yFraction(value);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = colors.getPropertyValue('--plot-guide').trim();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (const point of boundary) ctx.lineTo(point.x, point.y);
    ctx.stroke();

    ctx.setLineDash([]);
    if (frontier.length > 1) {
      ctx.strokeStyle = colors.getPropertyValue('--plot-frontier').trim();
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const row of frontier) {
        const point = positions.get(row);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    const reference = positions.get(benchmark.referenceRow);
    const target = positions.get(selected);
    if (reference && target && selected !== benchmark.referenceRow) {
      const dx = target.x - reference.x;
      const dy = target.y - reference.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) {
        const ux = dx / distance;
        const uy = dy / distance;
        const x = target.x - ux * 13;
        const y = target.y - uy * 13;
        ctx.strokeStyle = colors.getPropertyValue('--plot-comparison').trim();
        ctx.lineWidth = 1.3;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(reference.x + ux * 8, reference.y + uy * 8);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x - ux * 7 + uy * 4, y - uy * 7 - ux * 4);
        ctx.lineTo(x, y);
        ctx.lineTo(x - ux * 7 - uy * 4, y - uy * 7 + ux * 4);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1;
    drawLabels(ctx, width, height, positions, colors);
  }

  function renderPlot() {
    view = expanded ? benchmark.full : benchmark.detail;
    visibleRows = benchmark.rows.filter(row => (expanded || row.kind !== 'reconstruction') && (variantsToggle.checked || !row.variant));
    let lowestQubits = Infinity;
    frontier = visibleRows.filter(row => row.kind === 'candidate').sort((a, b) => a.count - b.count || a.qubits - b.qubits).filter(row => {
      if (row.qubits >= lowestQubits) return false;
      lowestQubits = row.qubits;
      return true;
    });
    ticks.replaceChildren();
    points.replaceChildren();
    circuit.replaceChildren();
    marks = new Map();

    for (const value of view.x_ticks) {
      const tick = document.createElement('span');
      tick.className = 'pricing-tick-x';
      tick.style.left = xFraction(value) * 100 + '%';
      tick.textContent = (view.scale === 'linear' ? exact : compact).format(value);
      ticks.append(tick);
    }
    for (const value of view.y_ticks) {
      const tick = document.createElement('span');
      tick.className = 'pricing-tick-y';
      tick.style.top = yFraction(value) * 100 + '%';
      tick.textContent = exact.format(value);
      ticks.append(tick);
    }

    visibleRows.forEach((row, index) => {
      const mark = document.createElement('button');
      const label = row.name + ', ' + exact.format(row.count) + ' Toffoli gates, ' + row.qubits + ' logical qubits';
      mark.type = 'button';
      mark.className = 'pricing-point';
      mark.dataset.kind = row.kind;
      if (row.variant) mark.dataset.variant = 'true';
      mark.style.left = xFraction(row.count) * 100 + '%';
      mark.style.top = yFraction(row.qubits) * 100 + '%';
      mark.setAttribute('aria-label', label);
      mark.title = label;
      mark.addEventListener('focus', () => selectRow(row));
      mark.addEventListener('click', () => selectRow(row));
      mark.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') selectRow(row);
      });
      marks.set(row, mark);
      points.append(mark);
      circuit.add(new Option(row.name, index));
    });

    for (const key of legend) key.hidden = !visibleRows.some(row => row.kind === key.dataset.pricingKind);
    variantKey.hidden = !visibleRows.some(row => row.variant);
    frontierKey.hidden = frontier.length < 2;
    rangeButton.hidden = !benchmark.full;
    rangeButton.setAttribute('aria-pressed', String(expanded));
    root.querySelector('[data-pricing-scale]').textContent = view.scale === 'log' ? '· log scale' : '· linear scale';
    selectRow(visibleRows.includes(selected) ? selected : visibleRows.find(row => row.best));
  }

  function showBenchmark(id) {
    benchmark = benchmarks.find(entry => entry.id === id);
    expanded = false;
    selected = null;
    variantsControl.hidden = !benchmark.rows.some(row => row.variant);
    const best = benchmark.rows.find(row => row.best);
    const reference = benchmark.referenceRow;
    benchmarkButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.benchmark === id)));
    root.querySelector('[data-pricing-title]').textContent = benchmark.title;
    root.querySelector('[data-pricing-reference]').textContent = exact.format(reference.count) + ' gates · ' + reference.qubits + ' qubits in the comparison reference';
    root.querySelector('[data-pricing-best]').textContent = benchmark.id === 'hhl' ? percent.format(1 - best.product / reference.product) : best.log_ratio + '×';
    root.querySelector('[data-pricing-finding]').textContent = benchmark.finding;
    renderPlot();
  }

  circuit.addEventListener('change', () => selectRow(visibleRows[Number(circuit.value)]));
  labelsToggle.addEventListener('change', drawGuides);
  variantsToggle.addEventListener('change', renderPlot);
  rangeButton.addEventListener('click', () => {
    expanded = !expanded;
    renderPlot();
  });
  benchmarkButtons.forEach(button => button.addEventListener('click', () => showBenchmark(button.dataset.benchmark)));
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#hhl') showBenchmark('hhl');
  });
  workspace.hidden = false;
  showBenchmark(window.location.hash === '#hhl' ? 'hhl' : benchmarks[0].id);
  new ResizeObserver(drawGuides).observe(graph);
  new MutationObserver(drawGuides).observe(document.documentElement, { attributeFilter: ['data-theme'] });
  document.fonts.ready.then(drawGuides);
})();
