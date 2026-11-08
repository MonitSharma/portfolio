(() => {
  const figure = document.querySelector('[data-shor-chart]');
  if (!figure) return;

  const logicalEstimates = JSON.parse(figure.querySelector('[data-estimates]').textContent);
  const runtimeEstimates = JSON.parse(figure.querySelector('[data-runtime-estimates]').textContent);
  const explorer = figure.querySelector('[data-explorer]');
  const plot = figure.querySelector('[data-plot]');
  const stage = plot.parentElement;
  const inspector = figure.querySelector('[data-inspector]');
  const estimateSelect = figure.querySelector('[data-selection]');
  const clearSelection = figure.querySelector('[data-clear-selection]');
  const gateSelect = figure.querySelector('[data-unit]');
  const architectureSelect = figure.querySelector('[data-architecture]');
  const frontierOnly = figure.querySelector('[data-frontier-only]');
  const rangeSelect = figure.querySelector('[data-range]');
  const viewButtons = [...figure.querySelectorAll('[data-view]')];
  const zoomButtons = [...figure.querySelectorAll('[data-zoom]')];
  const resetView = figure.querySelector('[data-reset-view]');
  const options = figure.querySelector('[data-options]');
  const status = figure.querySelector('[data-chart-status]');
  const chartCount = figure.querySelector('[data-chart-count]');
  const source = inspector.querySelector('[data-inspector-source]');
  const log = Math.log10;
  const logicalFull = [1150, 20500, 1.9e8, 1.1e13].map(log);
  const runtimeFull = [9000, 30000000, 0.033, 70000].map(log);
  const recent = [1340, 1940, 2.2e8, 9.2e8].map(log);
  const units = {
    t: { label: 'T equivalents', factor: 4 },
    toffoli: { label: 'Toffoli gates', factor: 1 },
  };

  // Sorting the lower count first at equal width removes dominated ties.
  let best = Infinity;
  const frontier = [...logicalEstimates]
    .sort((a, b) => a.qubits - b.qubits || a.toffoli - b.toffoli)
    .filter(estimate => {
      if (estimate.toffoli >= best) return false;
      best = estimate.toffoli;
      return true;
    });

  let runtime = false;
  let estimates = logicalEstimates;
  let full = logicalFull;
  let bounds = recent;
  let pinned = null;
  let hovered = null;
  let frame;
  let brush;
  let crosshair;
  let comparison;
  let drag = null;
  let ignoreClick = false;
  const points = new Map();

  const formatter = new Intl.NumberFormat('en', { maximumSignificantDigits: 3 });
  const integer = new Intl.NumberFormat('en');
  const compact = value => {
    for (const [scale, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']]) {
      if (value >= scale) return formatter.format(value / scale) + suffix;
    }
    return formatter.format(value);
  };
  const duration = days => {
    if (days < 1 / 24) return formatter.format(days * 1440) + ' min';
    if (days < 1) return formatter.format(days * 24) + ' h';
    if (days >= 365) return formatter.format(days / 365.25) + ' yr';
    if (days >= 30 && days % 30 === 0) return formatter.format(days / 30) + ' mo';
    return formatter.format(days) + ' d';
  };
  const ordinate = estimate => runtime ? estimate.time_days : estimate.toffoli;
  const gateUnit = () => units[gateSelect.value];
  const qubitLabel = () => runtime ? 'Physical qubits' : 'Logical qubits';
  const measureLabel = () => runtime ? 'Estimated runtime' : gateUnit().label;
  const measureValue = estimate => runtime ? estimate.time_label : compact(estimate.toffoli * gateUnit().factor);
  const preset = () => !runtime && rangeSelect.value === 'recent' ? recent : full;

  const recentLabels = {
    'Gidney ’25': [10, 17],
    'Pappalardo et al. ’26': [10, -11],
    'Two primes': [10, -9],
    'Six primes': [-10, -10],
    'Eight primes': [-10, 19],
  };

  function svg(tag, attributes = {}, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function ticks(lo, hi, limit) {
    const values = [];
    for (let exponent = Math.floor(log(lo)); exponent <= Math.ceil(log(hi)); exponent++) {
      for (const multiple of [1, 2, 5]) {
        const value = multiple * 10 ** exponent;
        if (value >= lo && value <= hi) values.push(value);
      }
    }
    if (values.length >= 3) {
      const stride = Math.ceil(values.length / limit);
      return values.filter((_, index) => index % stride === 0);
    }

    const ideal = (hi - lo) / (limit - 1);
    const magnitude = 10 ** Math.floor(log(ideal));
    const step = [1, 2, 2.5, 5, 10].map(n => n * magnitude).find(n => n >= ideal);
    const first = Math.ceil(lo / step);
    const last = Math.floor(hi / step);
    return Array.from({ length: last - first + 1 }, (_, index) => (first + index) * step);
  }

  function visible(estimate) {
    const x = log(estimate.qubits);
    const y = log(ordinate(estimate));
    return (runtime || !frontierOnly.checked || frontier.includes(estimate)) &&
      x >= bounds[0] && x <= bounds[1] && y >= bounds[2] && y <= bounds[3];
  }

  function inspect(estimate, announce = false) {
    clearSelection.hidden = !pinned;
    inspector.querySelector('[data-inspector-content]').hidden = !estimate;
    inspector.querySelector('[data-inspector-kind]').hidden = !estimate;
    estimateSelect.value = estimate ? String(estimates.indexOf(estimate)) : '';
    for (const [entry, marker] of points) {
      marker.classList.toggle('is-active', entry === estimate);
      marker.setAttribute('aria-pressed', String(entry === pinned));
    }
    comparison.replaceChildren();
    crosshair.setAttribute('d', '');
    if (!estimate) {
      inspector.classList.remove('is-ours');
      inspector.querySelector('[data-inspector-title]').textContent = 'Hover over an estimate';
      status.textContent = '';
      return;
    }
    for (const [field, value] of Object.entries({
      kind: (estimate.ours ? 'This work' : 'Published estimate') + (runtime ? ` · ${estimate.architecture}` : '') + (pinned === estimate ? ' · Pinned' : ''),
      title: estimate.name,
      'qubit-label': qubitLabel(),
      qubits: integer.format(estimate.qubits),
      unit: measureLabel(),
      gates: measureValue(estimate),
      note: estimate.note,
      reference: estimate.reference?.label || '',
    })) inspector.querySelector(`[data-inspector-${field}]`).textContent = value;

    inspector.querySelector('[data-inspector-reference-box]').hidden = !estimate.reference;
    source.href = estimate.url || source.dataset.archive;
    source.textContent = (estimate.source || 'Benchmark archive') + ' ↗';
    inspector.classList.toggle('is-ours', Boolean(estimate.ours));
    const active = points.get(estimate);
    const baseline = estimate.reference;
    if (active) {
      const x = Number(active.dataset.x);
      const y = Number(active.dataset.y);
      crosshair.setAttribute('d', `M${frame.left} ${y}H${x}V${frame.bottom}`);
      if (baseline) {
        const referenceX = frame.x(baseline.qubits);
        const referenceY = frame.y(baseline.time_days);
        comparison.append(
          svg('line', { x1: referenceX, y1: referenceY, x2: x, y2: y, class: 'shor-runtime-pair' }),
          svg('circle', { cx: referenceX, cy: referenceY, r: 5, class: 'shor-runtime-baseline' }),
        );
      }
    } else {
      crosshair.setAttribute('d', '');
    }
    if (announce) status.textContent = description(estimate);
  }

  function description(estimate) {
    const cost = runtime ? `${measureValue(estimate)} to factor` : `${measureValue(estimate)} ${measureLabel()} per execution`;
    return `${estimate.name}, ${integer.format(estimate.qubits)} ${qubitLabel().toLowerCase()}, ${cost}`;
  }

  function pin(estimate) {
    pinned = estimate;
    estimateSelect.value = String(estimates.indexOf(estimate));
    inspect(estimate, true);
  }

  function clearPin() {
    pinned = null;
    hovered = null;
    inspect(null);
  }

  function render({ resetSelection = true } = {}) {
    const width = Math.round(stage.clientWidth);
    const height = Math.round(stage.clientHeight);
    if (width < 100 || height < 100) return;

    const focusIndex = document.activeElement?.dataset.point;
    // A changed range, architecture, unit, or zoom must not inherit an old selection.
    if (resetSelection) pinned = null;
    const factor = runtime ? 1 : gateUnit().factor;
    const [x0, x1, y0, y1] = bounds;
    const left = runtime ? 68 : width < 400 ? 53 : 62;
    const right = width - 15;
    const top = 15;
    const bottom = height - 53;
    const px = q => left + (log(q) - x0) / (x1 - x0) * (right - left);
    const py = gates => bottom - (log(gates) - y0) / (y1 - y0) * (bottom - top);
    frame = { left, right, top, bottom, x: px, y: py };

    plot.replaceChildren();
    plot.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const verticalLabel = runtime ? 'Estimated time to factor' : `${gateUnit().label} / execution`;
    plot.setAttribute('aria-label', `${qubitLabel()} versus ${verticalLabel.toLowerCase()}. Both axes use logarithmic scales.`);
    points.clear();
    hovered = null;
    plot.append(svg('rect', { x: left, y: top, width: right - left, height: bottom - top, class: 'shor-plot-area' }));

    for (const value of ticks(10 ** x0, 10 ** x1, width < 500 ? 5 : 7)) {
      const x = px(value);
      plot.append(
        svg('line', { x1: x, x2: x, y1: top, y2: bottom, class: 'shor-gridline' }),
        svg('text', { x, y: bottom + 19, 'text-anchor': 'middle', class: 'shor-tick' }, compact(value)),
      );
    }
    const timeTicks = [1 / 24, 1 / 4, 1, 7, 30, 365.25, 3652.5, 36525]
      .filter(value => log(value) >= y0 && log(value) <= y1);
    const yTicks = runtime && timeTicks.length >= 3 ? timeTicks : ticks(10 ** y0 * factor, 10 ** y1 * factor, 6);
    for (const value of yTicks) {
      const y = py(value / factor);
      plot.append(
        svg('line', { x1: left, x2: right, y1: y, y2: y, class: 'shor-gridline' }),
        svg('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', class: 'shor-tick' }, runtime ? duration(value) : compact(value)),
      );
    }
    plot.append(
      svg('path', { d: `M${left} ${top}V${bottom}H${right}`, class: 'shor-axis' }),
      svg('text', { x: (left + right) / 2, y: height - 12, 'text-anchor': 'middle', class: 'shor-axis-title' }, qubitLabel() + ' · log scale'),
      svg('text', { x: 15, y: (top + bottom) / 2, transform: `rotate(-90 15 ${(top + bottom) / 2})`, 'text-anchor': 'middle', class: 'shor-axis-title' }, verticalLabel),
    );

    const defs = svg('defs');
    const clip = svg('clipPath', { id: 'shor-plot-clip' });
    clip.append(svg('rect', { x: left, y: top, width: right - left, height: bottom - top }));
    defs.append(clip);
    plot.append(defs);

    if (!runtime) {
      const line = frontier.map((entry, index) =>
        index === 0 ? `M${px(entry.qubits)} ${py(entry.toffoli)}` : `H${px(entry.qubits)}V${py(entry.toffoli)}`
      ).join(' ') + ` H${Math.max(right, px(frontier.at(-1).qubits))}`;
      plot.append(svg('path', { d: line, 'clip-path': 'url(#shor-plot-clip)', class: 'shor-frontier-line' }));
    }
    crosshair = svg('path', { class: 'shor-crosshair' });
    comparison = svg('g', { 'clip-path': 'url(#shor-plot-clip)', 'aria-hidden': 'true' });
    plot.append(crosshair, comparison);

    for (const [index, estimate] of estimates.entries()) {
      if (!visible(estimate)) continue;
      const x = px(estimate.qubits);
      const y = py(ordinate(estimate));
      if (estimate.time_range_days) {
        const [low, high] = estimate.time_range_days.map(py);
        plot.append(svg('path', {
          d: `M${x} ${low}V${high} M${x - 4} ${low}h8 M${x - 4} ${high}h8`,
          class: 'shor-runtime-range', 'clip-path': 'url(#shor-plot-clip)',
        }));
      }
      const point = svg('g', {
        transform: `translate(${x} ${y})`,
        class: `shor-point${estimate.ours ? ' is-ours' : ''}`,
        tabindex: 0,
        role: 'button',
        'aria-label': description(estimate),
        'data-point': index,
        'data-x': x,
        'data-y': y,
      });
      point.append(
        svg('circle', { r: 14, class: 'shor-point-hit' }),
        svg('circle', { r: 11, class: 'shor-point-ring' }),
        estimate.ours
          ? svg('path', { d: 'M0 -7L7 0L0 7L-7 0Z', class: 'shor-point-mark' })
          : svg('circle', { r: 5, class: 'shor-point-mark' }),
      );
      plot.append(point);
      points.set(estimate, point);

      point.addEventListener('focus', () => inspect(pinned || estimate));
      point.addEventListener('blur', () => inspect(pinned || hovered));
      point.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        pin(estimate);
      });
    }

    if (!runtime && bounds === recent) {
      for (const [estimate, point] of points) {
        const offset = recentLabels[estimate.label];
        if (!offset) continue;
        const [dx, dy] = offset;
        const label = width < 430 && estimate.label.startsWith('Pappalardo') ? 'Pappalardo ’26' : estimate.label;
        plot.append(svg('text', {
          x: Number(point.dataset.x) + dx,
          y: Number(point.dataset.y) + dy,
          class: `shor-point-label${estimate.ours ? ' is-ours' : ''}`,
          'text-anchor': dx < 0 ? 'end' : 'start',
          'aria-hidden': 'true',
        }, label));
      }
    }

    chartCount.textContent = `${points.size} ${points.size === 1 ? 'estimate' : 'estimates'} shown`;
    if (points.size === 0) {
      plot.append(svg('text', { x: (left + right) / 2, y: (top + bottom) / 2,
        'text-anchor': 'middle', class: 'shor-axis-title' }, 'No estimates here. Reset zoom to return.'));
    }

    brush = svg('rect', { class: 'shor-brush', visibility: 'hidden' });
    plot.append(brush);
    const isZoomed = bounds !== preset();
    resetView.hidden = !isZoomed;
    zoomButtons.find(button => button.dataset.zoom === 'out').disabled = !isZoomed;
    zoomButtons.find(button => button.dataset.zoom === 'reset').disabled = !isZoomed;
    inspect(pinned);

    if (focusIndex !== undefined) plot.querySelector(`[data-point="${focusIndex}"]`)?.focus({ preventScroll: true });
  }

  function setRange(next) {
    bounds = next;
    render();
    status.textContent = `${points.size} estimates in view.`;
  }

  function zoom(factor) {
    const limits = preset();
    const active = hovered || pinned;
    const resizeAxis = (start, end, min, max, selected) => {
      const center = factor < 1 && selected >= start && selected <= end ? selected : (start + end) / 2;
      const span = Math.min(max - min, Math.max(0.035, (end - start) * factor));
      const lo = Math.max(min, Math.min(center - span / 2, max - span));
      return [lo, lo + span];
    };
    const next = [
      ...resizeAxis(bounds[0], bounds[1], limits[0], limits[1], active ? log(active.qubits) : NaN),
      ...resizeAxis(bounds[2], bounds[3], limits[2], limits[3], active ? log(ordinate(active)) : NaN),
    ];
    setRange(next.every((value, index) => Math.abs(value - limits[index]) < 1e-8) ? limits : next);
  }

  function plotPosition(event) {
    const rect = plot.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function closestPoint(event) {
    const [x, y] = plotPosition(event);
    let nearest = null;
    let distance = 14;
    for (const [estimate, marker] of points) {
      const offset = Math.hypot(x - Number(marker.dataset.x), y - Number(marker.dataset.y));
      if (offset < distance) {
        nearest = estimate;
        distance = offset;
      }
    }
    return nearest;
  }

  plot.addEventListener('click', event => {
    if (ignoreClick) return;
    const marker = event.target.closest('[data-point]');
    const estimate = event.detail === 0 && marker
      ? estimates[Number(marker.dataset.point)]
      : closestPoint(event);
    if (estimate) {
      points.get(estimate).focus({ preventScroll: true });
      pin(estimate);
    } else clearPin();
  });

  plot.addEventListener('pointerdown', event => {
    ignoreClick = false;
    if (event.button !== 0 || event.pointerType === 'touch' || !frame) return;
    const [x, y] = plotPosition(event);
    if (x >= frame.left && x <= frame.right && y >= frame.top && y <= frame.bottom) {
      drag = { id: event.pointerId, x, y, active: false };
    }
  });

  plot.addEventListener('pointermove', event => {
    if (!drag) {
      if (event.pointerType !== 'touch') {
        const estimate = closestPoint(event);
        if (estimate !== hovered) {
          hovered = estimate;
          inspect(pinned || hovered);
        }
      }
      return;
    }
    if (drag.id !== event.pointerId) return;
    const [x, y] = plotPosition(event);
    if (!drag.active && Math.hypot(x - drag.x, y - drag.y) < 7) return;
    if (!drag.active) plot.setPointerCapture(event.pointerId);
    drag.active = true;
    const endX = Math.min(frame.right, Math.max(frame.left, x));
    const endY = Math.min(frame.bottom, Math.max(frame.top, y));
    const selection = {
      x: Math.min(drag.x, endX),
      y: Math.min(drag.y, endY),
      width: Math.abs(drag.x - endX),
      height: Math.abs(drag.y - endY),
    };
    drag.selection = selection;
    for (const [key, value] of Object.entries(selection)) brush.setAttribute(key, value);
    brush.setAttribute('visibility', 'visible');
  });

  plot.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { active, selection } = drag;
    drag = null;
    brush.setAttribute('visibility', 'hidden');
    if (!active) return;
    ignoreClick = true;
    if (selection.width < 22 || selection.height < 22) return;
    const { left, right, top, bottom } = frame;
    const [x0, x1, y0, y1] = bounds;
    const domainX = x => x0 + (x - left) / (right - left) * (x1 - x0);
    const domainY = y => y0 + (bottom - y) / (bottom - top) * (y1 - y0);
    setRange([
      domainX(selection.x), domainX(selection.x + selection.width),
      domainY(selection.y + selection.height), domainY(selection.y),
    ]);
  });

  plot.addEventListener('pointercancel', () => {
    drag = null;
    brush.setAttribute('visibility', 'hidden');
  });
  plot.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    if (drag && !drag.active) drag = null;
    hovered = null;
    inspect(pinned);
  });
  clearSelection.addEventListener('click', clearPin);
  figure.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pinned) clearPin();
  });

  function populateEstimates() {
    const placeholder = new Option('Choose an estimate', '');
    placeholder.disabled = true;
    estimateSelect.replaceChildren(placeholder, ...estimates.map((estimate, index) => new Option(estimate.name, index)));
    estimateSelect.value = pinned ? String(estimates.indexOf(pinned)) : '';
  }

  function configureRuntime() {
    const architecture = architectureSelect.value;
    estimates = runtimeEstimates.filter(estimate => !architecture || estimate.architecture === architecture);
    if (architecture) {
      const extent = values => {
        const low = Math.min(...values.map(log));
        const high = Math.max(...values.map(log));
        const padding = Math.max(0.09, (high - low) * 0.1);
        return [low - padding, high + padding];
      };
      full = [
        ...extent(estimates.flatMap(estimate => estimate.reference ? [estimate.qubits, estimate.reference.qubits] : [estimate.qubits])),
        ...extent(estimates.flatMap(estimate => [
          estimate.time_days, ...(estimate.time_range_days || []), ...(estimate.reference ? [estimate.reference.time_days] : []),
        ])),
      ];
    } else {
      full = runtimeFull;
    }
    bounds = full;
    pinned = null;
    populateEstimates();
  }

  let logicalBounds = recent;
  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      const showRuntime = button.dataset.view === 'runtime';
      if (showRuntime === runtime) return;
      if (!runtime) logicalBounds = bounds;
      pinned = null;
      runtime = showRuntime;
      if (runtime) {
        configureRuntime();
      } else {
        estimates = logicalEstimates;
        full = logicalFull;
        bounds = logicalBounds;
        populateEstimates();
      }
      for (const item of viewButtons) item.setAttribute('aria-pressed', String(item === button));
      for (const control of figure.querySelectorAll('[data-logical-controls], [data-logical-caption], [data-frontier-legend]')) {
        control.hidden = runtime;
      }
      for (const control of figure.querySelectorAll('[data-runtime-controls], [data-runtime-caption], [data-runtime-legend]')) {
        control.hidden = !runtime;
      }
      figure.querySelector('[data-chart-basis]').textContent = runtime ? 'Per RSA-2048 factoring' : 'Per circuit execution';
      render();
      status.textContent = chartCount.textContent;
    });
  }
  architectureSelect.addEventListener('change', () => {
    configureRuntime();
    render();
    status.textContent = chartCount.textContent;
  });
  populateEstimates();
  estimateSelect.addEventListener('change', () => {
    if (estimateSelect.value === '') return;
    const estimate = estimates[Number(estimateSelect.value)];
    if (!visible(estimate)) {
      if (!runtime && !frontier.includes(estimate)) frontierOnly.checked = false;
      if (!visible(estimate)) {
        if (!runtime && rangeSelect.value === 'recent') {
          bounds = recent;
          if (!visible(estimate)) rangeSelect.value = 'all';
        }
        bounds = preset();
      }
      render();
    }
    pin(estimate);
  });
  gateSelect.addEventListener('change', render);
  frontierOnly.addEventListener('change', () => setRange(bounds));
  rangeSelect.addEventListener('change', () => setRange(preset()));
  resetView.addEventListener('click', () => {
    setRange(preset());
    (runtime ? architectureSelect : rangeSelect).focus();
  });
  for (const button of zoomButtons) {
    button.addEventListener('click', () => {
      if (button.dataset.zoom === 'reset') setRange(preset());
      else zoom(button.dataset.zoom === 'in' ? 0.67 : 1 / 0.67);
    });
  }
  document.addEventListener('click', event => {
    if (options.open && !options.contains(event.target)) options.open = false;
  });
  options.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !options.open) return;
    options.open = false;
    options.querySelector('summary').focus();
  });

  explorer.hidden = false;
  render();
  if (new URLSearchParams(window.location.search).get('view') === 'runtime') {
    figure.querySelector('[data-view="runtime"]').click();
  }
  figure.querySelector('[data-chart-fallback]').hidden = true;
  new ResizeObserver(() => {
    if (drag) return;
    render({ resetSelection: false });
  }).observe(stage);
})();
