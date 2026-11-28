/* Interactive charts for the quantum chemistry page. Plain SVG, no libraries. */
(function () {
  var holder = document.querySelector('[data-qc-data]');
  if (!holder) return;
  var D = JSON.parse(holder.textContent);
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fmt(x, d) { var s = Math.abs(x).toFixed(d); return (x < 0 ? '−' : '') + s; }
  function sgn(x, d) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d); }
  function size(svg) { var r = svg.getBoundingClientRect(); return { w: Math.max(300, r.width), h: Math.max(240, r.height) }; }
  function linear(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function logScale(d0, d1, r0, r1) { var a = Math.log10(d0), b = Math.log10(d1); return function (v) { return r0 + (Math.log10(v) - a) / (b - a) * (r1 - r0); }; }
  function segmented(box, items, current, onPick) {
    clear(box);
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-pressed', it.key === current);
      b.addEventListener('click', function () {
        box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        onPick(it.key);
      });
      box.appendChild(b);
    });
  }
  function detail(box, title, sub, pairs, note) {
    var h = '<p class="qc-detail-kicker">Selected</p><h4>' + title + (sub ? '<span>' + sub + '</span>' : '') + '</h4><dl>';
    pairs.forEach(function (p) { h += '<div><dt>' + p[0] + '</dt><dd class="' + (p[2] || '') + '">' + p[1] + '</dd></div>'; });
    h += '</dl>' + (note ? '<p>' + note + '</p>' : '');
    box.innerHTML = h;
  }
  function focusable(node, fn) {
    node.setAttribute('tabindex', '0');
    node.addEventListener('click', fn);
    node.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }
  var KIND = { ours: 'This work', classical: 'Classical', quantum: 'Quantum-assisted' };

  /* 1. Ladder explorer: how far above the best known energy is each method? */
  (function () {
    var fig = document.querySelector('[data-qc-ladder]');
    if (!fig) return;
    var svg = fig.querySelector('svg'), info = fig.querySelector('[data-qc-ladder-detail]');
    var tabs = fig.querySelector('[data-qc-ladder-tabs]'), geo = fig.querySelector('[data-qc-geo]');
    var geoIn = geo.querySelector('input'), geoOut = geo.querySelector('output');
    var state = { sys: 'fe4s4', g: 5, sel: null };

    function rowsFor() {
      if (state.sys !== 'n2') return D.ladders[state.sys];
      var n = D.n2, i = state.g, best = n.ours[i];
      return { label: 'N₂ at ' + n.R[i].toFixed(2) + ' Å', unit: 'µEh', best: best, bestLabel: 'lowest known energy (ours)', rows: [
        { name: 'This work · DMRG, M = ' + n.M[i].toLocaleString('en'), kind: 'ours', e: n.ours[i], size: 'bond dimension ' + n.M[i].toLocaleString('en'), who: 'This project', note: 'Stored state, replayed in a fresh process. The last bond-dimension step still lowered it by ' + Math.abs(n.step[i]).toFixed(1) + ' µEh, so the true answer is a little lower.' },
        { name: 'Tracker HCI', kind: 'classical', e: n.hci[i], size: 'heat-bath selected CI', who: 'Quantum Advantage Tracker', note: 'The tracker’s classical reference at this bond length.' },
        { name: 'HI-VQE', kind: 'quantum', e: n.hivqe[i], size: 'IBM ibm_fez + classical diagonalization', who: 'Qunova + RIKEN', note: 'Quantum-assisted entry on the tracker at this bond length.' }
      ] };
    }
    function draw() {
      var set = rowsFor(), micro = set.unit === 'µEh', k = micro ? 1e6 : 1e3;
      var lo = micro ? 0.1 : 0.01, hi = micro ? 1000 : 100;
      var W = size(svg).w, narrow = W < 560, rowH = narrow ? 48 : 34, top = narrow ? 44 : 30, left = narrow ? 8 : Math.min(230, W * 0.42), right = W - 56;
      var H = top + set.rows.length * rowH + 30; svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      clear(svg);
      var x = logScale(lo, hi, left, right);
      for (var t = lo; t <= hi * 1.0001; t *= 10) {
        el('line', { x1: x(t), x2: x(t), y1: top - 8, y2: H - 24, class: 'qc-gridline' }, svg);
        el('text', { x: x(t), y: H - 8, 'text-anchor': 'middle', class: 'qc-tick' }, svg, t >= 1 ? String(t) : String(t));
      }
      el('text', { x: narrow ? 0 : left, y: 14, class: 'qc-axis-title' }, svg, 'Above the ' + set.bestLabel + ' (' + set.unit + ', log)');
      if (!micro) {
        var ca = x(1.6);
        el('rect', { x: left, y: top - 8, width: ca - left, height: H - 24 - top + 8, class: 'qc-band' }, svg);
        el('text', { x: narrow ? left : ca + 4, y: narrow ? 30 : top, class: 'qc-band-label' }, svg, 'shaded: within chemical accuracy (1.6 mEh)');
      }
      set.rows.forEach(function (r, i) {
        var gap = (r.e - set.best) * k, y = top + i * rowH + rowH / 2 + (narrow ? 8 : 0);
        var g = el('g', { class: 'qc-lrow is-' + r.kind + (state.sel === i ? ' is-sel' : ''), role: 'button', 'aria-label': r.name + ', ' + (gap < lo ? 'at the best value' : gap.toFixed(micro ? 1 : 2) + ' ' + set.unit + ' above') }, svg);
        el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, class: 'qc-lrow-hit' }, g);
        if (narrow) el('text', { x: 0, y: y - 13, class: 'qc-lrow-name' }, g, r.name); else el('text', { x: left - 12, y: y + 4, 'text-anchor': 'end', class: 'qc-lrow-name' }, g, r.name);
        var gx = gap <= lo ? x(lo) : x(Math.min(gap, hi));
        el('line', { x1: x(lo), x2: gx, y1: y, y2: y, class: 'qc-lrow-stem' }, g);
        el('circle', { cx: gx, cy: y, r: r.kind === 'ours' ? 7 : 5.5, class: 'qc-lrow-dot' }, g);
        el('text', { x: gx + 11, y: y + 4, class: 'qc-lrow-val' }, g, gap < 1e-6 ? 'best' : gap < lo ? '< ' + lo : gap > hi ? '> ' + hi : '+' + gap.toFixed(gap < 1 ? 2 : 1));
        focusable(g, function () { state.sel = i; show(); draw(); });
      });
    }
    function show() {
      var set = rowsFor(), r = set.rows[state.sel == null ? 0 : state.sel], micro = set.unit === 'µEh', k = micro ? 1e6 : 1e3;
      var gap = (r.e - set.best) * k;
      detail(info, r.name, KIND[r.kind] + ' · ' + r.who, [
        ['Energy', fmt(r.e, micro ? 8 : 7) + ' <small>Eh</small>'],
        ['Above ' + set.bestLabel, (gap < 1e-9 ? '0' : '+' + gap.toFixed(micro ? 1 : 3)) + ' <small>' + set.unit + '</small>', r.kind === 'ours' ? 'is-ours' : ''],
        ['Size', r.size]
      ], r.note);
    }
    segmented(tabs, [{ key: 'fe2s2', label: '2Fe–2S' }, { key: 'n2', label: 'N₂' }, { key: 'fe4s4', label: '4Fe–4S' }], state.sys, function (k) {
      state.sys = k; state.sel = null; geo.hidden = k !== 'n2'; draw(); show();
    });
    geoIn.addEventListener('input', function () { state.g = +geoIn.value; geoOut.textContent = D.n2.R[state.g].toFixed(2) + ' Å'; draw(); show(); });
    geo.hidden = true; draw(); show();
    window.addEventListener('resize', draw);
  })();

  /* 2. N2 dissociation curve */
  (function () {
    var fig = document.querySelector('[data-qc-n2]');
    if (!fig) return;
    var svg = fig.querySelector('svg'), info = fig.querySelector('[data-qc-n2-detail]'), tabs = fig.querySelector('[data-qc-n2-tabs]');
    var n = D.n2, state = { view: 'diff', sel: 5 };
    function draw() {
      var s = size(svg), W = s.w, H = s.h, L = 64, R = W - 16, T = 18, B = H - 42;
      clear(svg); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var x = linear(0.75, 3.05, L, R), y, ticks, series;
      if (state.view === 'diff') {
        y = linear(-60, 300, B, T); ticks = [-50, 0, 50, 100, 150, 200, 250, 300];
        series = [
          { cls: 'quantum', label: 'HI-VQE', v: n.hivqe.map(function (e, i) { return (e - n.hci[i]) * 1e6; }) },
          { cls: 'ours', label: 'This work', v: n.ours.map(function (e, i) { return (e - n.hci[i]) * 1e6; }) }
        ];
        el('text', { x: 12, y: (T + B) / 2, transform: 'rotate(-90 12 ' + (T + B) / 2 + ')', 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'Energy minus tracker HCI (µEh)');
      } else {
        y = linear(-109.32, -108.64, B, T); ticks = [-109.3, -109.2, -109.1, -109.0, -108.9, -108.8, -108.7];
        series = [{ cls: 'ours', label: 'This work', v: n.ours }];
        el('text', { x: 12, y: (T + B) / 2, transform: 'rotate(-90 12 ' + (T + B) / 2 + ')', 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'Total energy (Eh)');
      }
      ticks.forEach(function (t) {
        el('line', { x1: L, x2: R, y1: y(t), y2: y(t), class: t === 0 && state.view === 'diff' ? 'qc-zeroline' : 'qc-gridline' }, svg);
        el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'qc-tick' }, svg, state.view === 'diff' ? sgn(t, 0).replace('+0', '0') : fmt(t, 1));
      });
      if (state.view === 'diff') el('text', { x: R, y: y(0) - 7, 'text-anchor': 'end', class: 'qc-zero-label' }, svg, 'Tracker HCI = 0 · below is better');
      [0.8, 1.0, 1.5, 2.0, 2.5, 3.0].forEach(function (r) { el('text', { x: x(r), y: B + 20, 'text-anchor': 'middle', class: 'qc-tick' }, svg, r.toFixed(1)); });
      el('text', { x: (L + R) / 2, y: H - 4, 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'N–N bond length (Å)');
      el('line', { x1: x(n.R[state.sel]), x2: x(n.R[state.sel]), y1: T, y2: B, class: 'qc-cursor' }, svg);
      series.forEach(function (sr) {
        el('polyline', { points: n.R.map(function (r, i) { return x(r) + ',' + y(sr.v[i]); }).join(' '), class: 'qc-line is-' + sr.cls }, svg);
        var last = n.R.length - 1;
        el('text', { x: x(n.R[last]) - 6, y: y(sr.v[last]) + (sr.cls === 'ours' ? 20 : -10), 'text-anchor': 'end', class: 'qc-series-label is-' + sr.cls }, svg, sr.label);
      });
      n.R.forEach(function (r, i) {
        var g = el('g', { class: 'qc-pt' + (i === state.sel ? ' is-sel' : ''), role: 'button', 'aria-label': 'Bond length ' + r + ' Å' }, svg);
        el('rect', { x: x(r) - 14, y: T, width: 28, height: B - T, class: 'qc-hit' }, g);
        series.forEach(function (sr) { el('circle', { cx: x(r), cy: y(sr.v[i]), r: i === state.sel ? 6 : 4, class: 'qc-dot is-' + sr.cls }, g); });
        focusable(g, function () { state.sel = i; draw(); show(); });
        g.addEventListener('mouseenter', function () { if (state.sel !== i) { state.sel = i; draw(); show(); } });
      });
    }
    function show() {
      var i = state.sel, d = (n.ours[i] - n.hci[i]) * 1e6, q = (n.hivqe[i] - n.hci[i]) * 1e6;
      detail(info, 'R = ' + n.R[i].toFixed(2) + ' Å', n.R[i] < 1.3 ? 'Near equilibrium (1.10 Å)' : n.R[i] < 2.2 ? 'Bond being pulled apart' : 'Nearly broken bond', [
        ['This work', fmt(n.ours[i], 8) + ' <small>Eh</small>', 'is-ours'],
        ['Tracker HCI', fmt(n.hci[i], 7) + ' <small>Eh</small>'],
        ['Ours − HCI', sgn(d, 1) + ' <small>µEh</small>', 'is-ours'],
        ['HI-VQE − HCI', sgn(q, 1) + ' <small>µEh</small>']
      ], 'DMRG bond dimension ' + n.M[i].toLocaleString('en') + '. The last increase in bond dimension lowered the energy by ' + Math.abs(n.step[i]).toFixed(1) + ' µEh, so this is an upper bound that is still converging.');
    }
    segmented(tabs, [{ key: 'diff', label: 'Difference from the tracker' }, { key: 'abs', label: 'Full energy curve' }], state.view, function (k) { state.view = k; draw(); });
    draw(); show(); window.addEventListener('resize', draw);
  })();

  /* 3. 4Fe-4S: energy against bond dimension */
  (function () {
    var fig = document.querySelector('[data-qc-conv]');
    if (!fig) return;
    var svg = fig.querySelector('svg'), info = fig.querySelector('[data-qc-conv-detail]'), box = fig.querySelector('[data-qc-conv-extrap]');
    var c = D.fe4s4conv, sel = { kind: 'ours', i: 3 };
    function gap(e) { return (e - c.best) * 1e3; }
    function draw() {
      var s = size(svg), W = s.w, H = s.h, L = 56, R = W - 20, T = 16, B = H - 42, narrow = W < 520;
      clear(svg); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var x = logScale(300, 30000, L, R), y = linear(-4, 34, B, T);
      [-0, 5, 10, 15, 20, 25, 30].forEach(function (t) {
        el('line', { x1: L, x2: R, y1: y(t), y2: y(t), class: t === 0 ? 'qc-zeroline' : 'qc-gridline' }, svg);
        el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'qc-tick' }, svg, t === 0 ? '0' : '+' + t);
      });
      el('text', { x: L + 6, y: y(0) - 7, class: 'qc-zero-label' }, svg, 'Best published = 0');
      [300, 1000, 3000, 10000, 30000].forEach(function (t) { el('text', { x: x(t), y: B + 20, 'text-anchor': 'middle', class: 'qc-tick' }, svg, t.toLocaleString('en')); });
      el('text', { x: (L + R) / 2, y: H - 4, 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'DMRG bond dimension (log scale): how much entanglement the wavefunction can hold');
      el('text', { x: 12, y: (T + B) / 2, transform: 'rotate(-90 12 ' + (T + B) / 2 + ')', 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'mEh above the best published energy');
      c.lines.forEach(function (l) {
        el('line', { x1: L, x2: R, y1: y(gap(l.e)), y2: y(gap(l.e)), class: 'qc-refline is-' + l.kind }, svg);
        el('text', { x: R, y: y(gap(l.e)) - 6, 'text-anchor': 'end', class: 'qc-ref-label is-' + l.kind }, svg, l.name + ' · +' + gap(l.e).toFixed(1));
      });
      if (box.checked) c.extrap.forEach(function (l, i) {
        el('line', { x1: x(8000), x2: R, y1: y(gap(l.e)), y2: y(gap(l.e)), class: 'qc-refline is-extrap' }, svg);
        el('text', { x: x(8000) - 6, y: y(gap(l.e)) + 4, 'text-anchor': 'end', class: 'qc-ref-label is-extrap' }, svg, narrow ? l.name.split(' ')[0] + ' est.' : l.name + ' (estimate)');
      });
      el('polyline', { points: c.ours.map(function (p) { return x(p[0]) + ',' + y(gap(p[1])); }).join(' '), class: 'qc-line is-ours' }, svg);
      c.ours.forEach(function (p, i) {
        var g = el('g', { class: 'qc-pt', role: 'button', 'aria-label': 'This work, M = ' + p[0] }, svg);
        el('circle', { cx: x(p[0]), cy: y(gap(p[1])), r: sel.kind === 'ours' && sel.i === i ? 7 : 5, class: 'qc-dot is-ours' }, g);
        focusable(g, function () { sel = { kind: 'ours', i: i }; draw(); show(); });
      });
      c.published.forEach(function (p, i) {
        var g = el('g', { class: 'qc-pt', role: 'button', 'aria-label': p.name + ', D = ' + p.D }, svg);
        el('rect', { x: x(p.D) - 5.5, y: y(gap(p.e)) - 5.5 + (i === 1 ? 0 : 0), width: 11, height: 11, transform: 'rotate(45 ' + x(p.D) + ' ' + y(gap(p.e)) + ')', class: 'qc-diamond' + (sel.kind === 'pub' && sel.i === i ? ' is-sel' : '') }, g);
        focusable(g, function () { sel = { kind: 'pub', i: i }; draw(); show(); });
      });
      el('text', { x: x(3000) + 10, y: y(gap(-327.2395754)) + 22, class: 'qc-series-label is-ours' }, svg, 'This work');
      // Name each published run where it sits; the two D = 4,000 runs share a label.
      var pubLabels = {}; if (!narrow) c.published.forEach(function (p) { (pubLabels[p.D] = pubLabels[p.D] || []).push(p); });
      Object.keys(pubLabels).forEach(function (D) {
        var ps = pubLabels[D], top = Math.min.apply(null, ps.map(function (p) { return y(gap(p.e)); }));
        var name = ps.map(function (p) { return p.name.replace(' DMRG', ''); }).join(', ');
        if (+D === 4000) return el('text', { x: x(+D) + 9, y: top - 9, class: 'qc-pub-label' }, svg, name);
        if (+D > 15000) return el('text', { x: x(+D) - 11, y: top + 4, 'text-anchor': 'end', class: 'qc-pub-label' }, svg, name + ' · ' + (+D).toLocaleString('en'));
        el('text', { x: x(+D), y: top - 11, 'text-anchor': 'middle', class: 'qc-pub-label' }, svg, name + ' · ' + (+D).toLocaleString('en'));
      });
      // The gap still to close from our best point down to the best published energy.
      var last = c.ours[c.ours.length - 1], bx = x(last[0]) - 16, y0 = y(gap(last[1])) + 6, y1 = y(0) - 2;
      el('path', { d: 'M' + (bx + 5) + ',' + y0 + 'H' + bx + 'V' + y1 + 'H' + (bx + 5), class: 'qc-bracket' }, svg);
      el('text', { x: bx - 6, y: y(gap(last[1]) * 0.68) + 4, 'text-anchor': 'end', class: 'qc-bracket-label' }, svg, gap(last[1]).toFixed(1) + (narrow ? ' mEh' : ' mEh to close'));
    }
    function show() {
      if (sel.kind === 'ours') {
        var p = c.ours[sel.i];
        detail(info, 'This work · M = ' + p[0].toLocaleString('en'), 'SU(2) DMRG, localized orbitals', [
          ['Energy', fmt(p[1], 7) + ' <small>Eh</small>', 'is-ours'], ['Above best published', '+' + gap(p[1]).toFixed(2) + ' <small>mEh</small>']
        ], sel.i === 0 ? 'Laptop run. With the tracker’s own orbitals the same calculation is stuck 0.4–1.0 Eh higher, so localizing the orbitals was the key step.' : 'Server run on one 503 GB node, stored and replayed in a fresh process. M = 3,000 needed about 100 GiB of memory per sweep.');
      } else {
        var q = c.published[sel.i];
        detail(info, q.name + ' · D = ' + q.D.toLocaleString('en'), 'Published classical result', [
          ['Energy', fmt(q.e, 7) + ' <small>Eh</small>'], ['Above best published', '+' + gap(q.e).toFixed(2) + ' <small>mEh</small>']
        ], 'Our curve sits on top of the published DMRG points at the same bond dimension. The remaining gap is mostly bond dimension and orbital choice, not a different method.');
      }
    }
    box.addEventListener('change', draw);
    draw(); show(); window.addEventListener('resize', draw);
  })();

  /* 4. Do hardware samples help? */
  (function () {
    var fig = document.querySelector('[data-qc-attr]');
    if (!fig) return;
    var svg = fig.querySelector('svg'), info = fig.querySelector('[data-qc-attr-detail]');
    var a = D.attribution, sel = a.d.length - 1;
    function draw() {
      var s = size(svg), W = s.w, H = s.h, L = 52, R = W - 20, T = 14, B = H - 42;
      clear(svg); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var x = logScale(3000, 6e6, L, R), y = linear(0, 140, B, T);
      [0, 20, 40, 60, 80, 100, 120, 140].forEach(function (t) {
        el('line', { x1: L, x2: R, y1: y(t), y2: y(t), class: 'qc-gridline' }, svg);
        el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end', class: 'qc-tick' }, svg, String(t));
      });
      ['4k', '16k', '66k', '262k', '1M', '4.2M'].forEach(function (lab, i) { el('text', { x: x(a.d[i]), y: B + 20, 'text-anchor': 'middle', class: 'qc-tick' }, svg, lab); });
      el('text', { x: (L + R) / 2, y: H - 4, 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'Determinants kept (log scale)');
      el('text', { x: 12, y: (T + B) / 2, transform: 'rotate(-90 12 ' + (T + B) / 2 + ')', 'text-anchor': 'middle', class: 'qc-axis-title' }, svg, 'Energy gained (mEh, higher is better)');
      var band = a.d.map(function (d, i) { return x(d) + ',' + y(a.shuf[i] + a.shufSd[i]); }).concat(a.d.slice().reverse().map(function (d, j) { var i = a.d.length - 1 - j; return x(d) + ',' + y(a.shuf[i] - a.shufSd[i]); }));
      el('polygon', { points: band.join(' '), class: 'qc-sdband' }, svg);
      el('line', { x1: x(a.d[sel]), x2: x(a.d[sel]), y1: T, y2: B, class: 'qc-cursor' }, svg);
      [['h', 'classical', 'Hamiltonian only, no samples'], ['shuf', 'shuffled', 'Shuffled bits (noise)'], ['rec', 'quantum', 'Real IBM hardware samples']].forEach(function (sr, k) {
        el('polyline', { points: a.d.map(function (d, i) { return x(d) + ',' + y(a[sr[0]][i]); }).join(' '), class: 'qc-line is-' + sr[1] }, svg);
        var i = sr[0] === 'h' ? a.d.length - 1 : 3;
        el('text', { x: x(a.d[i]) + (sr[0] === 'h' ? -8 : 0), y: y(a[sr[0]][i]) + (sr[0] === 'h' ? -10 : sr[0] === 'rec' ? 24 : -16), 'text-anchor': sr[0] === 'h' ? 'end' : 'middle', class: 'qc-series-label is-' + sr[1] }, svg, sr[2]);
      });
      a.d.forEach(function (d, i) {
        var g = el('g', { class: 'qc-pt', role: 'button', 'aria-label': d.toLocaleString('en') + ' determinants' }, svg);
        el('rect', { x: x(d) - 16, y: T, width: 32, height: B - T, class: 'qc-hit' }, g);
        el('circle', { cx: x(d), cy: y(a.h[i]), r: 4.5, class: 'qc-dot is-classical' }, g);
        el('circle', { cx: x(d), cy: y(a.shuf[i]), r: 4.5, class: 'qc-dot is-shuffled' }, g);
        el('circle', { cx: x(d), cy: y(a.rec[i]), r: 4.5, class: 'qc-dot is-quantum' }, g);
        focusable(g, function () { sel = i; draw(); show(); });
        g.addEventListener('mouseenter', function () { if (sel !== i) { sel = i; draw(); show(); } });
      });
    }
    function show() {
      var i = sel, c = a.shuf[i] - a.rec[i];
      detail(info, a.d[i].toLocaleString('en') + ' determinants', '4Fe–4S · ibm_kingston samples', [
        ['Hardware samples', a.rec[i].toFixed(1) + ' <small>mEh</small>'],
        ['Shuffled bits', a.shuf[i].toFixed(1) + ' <small>± ' + a.shufSd[i].toFixed(1) + '</small>'],
        ['No samples', a.h[i].toFixed(1) + ' <small>mEh</small>', 'is-good'],
        ['Shuffled − hardware', sgn(c, 1) + ' <small>mEh</small>']
      ], (c >= 0 ? 'Random noise did at least as well as the real hardware samples at this size.' : 'Hardware beat shuffled noise here by ' + Math.abs(c).toFixed(1) + ' mEh.') + ' Picking determinants from the Hamiltonian alone gained ' + (a.h[i] - a.rec[i]).toFixed(1) + ' mEh more than the hardware samples.');
    }
    draw(); show(); window.addEventListener('resize', draw);
  })();

  /* 0. Cover: a rotatable 3D model of each benchmark molecule. Coordinates in ångström. */
  (function () {
    var fig = document.querySelector('[data-qc-mol]');
    if (!fig) return;
    var svg = fig.querySelector('[data-qc-mol-svg]');
    var tabs = fig.querySelector('[data-qc-mol-tabs]');
    var bondBox = fig.querySelector('[data-qc-mol-bond]');
    var bondIn = bondBox.querySelector('input'), bondOut = bondBox.querySelector('output');
    var nameEl = fig.querySelector('[data-qc-mol-name]'), factsEl = fig.querySelector('[data-qc-mol-facts]'), keyEl = fig.querySelector('[data-qc-mol-key]');
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ELEM = {
      Fe: { r: 0.62, cls: 'is-fe', label: 'Fe', title: 'Iron' },
      S: { r: 0.52, cls: 'is-s', label: 'S', title: 'Sulfur in the cluster core' },
      Sc: { r: 0.46, cls: 'is-sc', label: 'S', title: 'Sulfur from a protein cysteine (ligand)' },
      N: { r: 0.36, cls: 'is-n', label: 'N', title: 'Nitrogen' }
    };

    function cubane() {
      // Two interpenetrating tetrahedra: Fe–Fe ≈ 2.75 Å, S–S ≈ 3.6 Å, Fe–S ≈ 2.28 Å.
      var fe = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], s = [[-1, -1, -1], [-1, 1, 1], [1, -1, 1], [1, 1, -1]];
      var atoms = [], bonds = [];
      fe.forEach(function (v) { atoms.push({ e: 'Fe', p: v.map(function (c) { return c * 0.97; }) }); });
      s.forEach(function (v) { atoms.push({ e: 'S', p: v.map(function (c) { return c * 1.27; }) }); });
      fe.forEach(function (v, i) {
        s.forEach(function (w, j) {
          var same = v.filter(function (c, k) { return c === w[k]; }).length;
          if (same === 2) bonds.push([i, 4 + j]);
        });
        var len = Math.sqrt(3) * 0.97, out = (len + 2.26) / len;
        atoms.push({ e: 'Sc', p: v.map(function (c) { return c * 0.97 * out; }) });
        bonds.push([i, atoms.length - 1]);
      });
      return { atoms: atoms, bonds: bonds };
    }
    function diamond() {
      // Planar Fe2S2 rhomb, each iron capped by two cysteine sulfurs.
      var atoms = [{ e: 'Fe', p: [-1.35, 0, 0] }, { e: 'Fe', p: [1.35, 0, 0] }, { e: 'S', p: [0, 1.8, 0] }, { e: 'S', p: [0, -1.8, 0] },
        { e: 'Sc', p: [-2.65, 0, 1.85] }, { e: 'Sc', p: [-2.65, 0, -1.85] }, { e: 'Sc', p: [2.65, 0, 1.85] }, { e: 'Sc', p: [2.65, 0, -1.85] }];
      return { atoms: atoms, bonds: [[0, 2], [0, 3], [1, 2], [1, 3], [0, 4], [0, 5], [1, 6], [1, 7]] };
    }
    function nitrogen(R) {
      return { atoms: [{ e: 'N', p: [-R / 2, 0, 0] }, { e: 'N', p: [R / 2, 0, 0] }], bonds: [[0, 1]] };
    }
    var MOL = {
      fe4s4: { name: '4Fe–4S cubane', facts: '54 electrons in 36 orbitals · 72 qubits', key: ['Fe', 'S', 'Sc'], build: cubane, scale: 1, yaw: 0.32, pitch: 0.5 },
      fe2s2: { name: '2Fe–2S cluster', facts: '30 electrons in 20 orbitals · 40 qubits', key: ['Fe', 'S', 'Sc'], build: diamond, scale: 1, yaw: 0.35, pitch: 0.9 },
      n2: { name: 'N₂, the nitrogen molecule', facts: '14 electrons in 28 orbitals · 56 qubits', key: ['N'], build: function () { return nitrogen(D.n2.R[gi]); }, scale: 1, yaw: 0.3, pitch: 0.25 }
    };
    var cur = 'fe4s4', gi = +bondIn.value, model, yaw, pitch, spin = !reduced, visible = true, dragging = null, raf = 0, last = 0;
    var bondG = el('g', { class: 'qc-mol-bonds' }, svg), atomG = el('g', { class: 'qc-mol-atoms' }, svg);
    var tip = el('text', { class: 'qc-mol-tip', x: 150, y: 270, 'text-anchor': 'middle' }, svg);

    function restTip() {
      if (cur !== 'n2') return '';
      var R = D.n2.R[gi];
      return R <= 1.2 ? 'Triple bond intact (equilibrium is 1.10 Å)' : R < 2 ? 'Bond stretching: electrons start to localize' : 'Bond broken: three electrons stay with each atom';
    }
    function setKey() {
      keyEl.innerHTML = MOL[cur].key.map(function (k) { return '<span><i class="qc-mol-dot ' + ELEM[k].cls + '"></i>' + (k === 'Sc' ? 'S, from the protein' : k === 'S' ? 'S' : k === 'Fe' ? 'Fe' : 'N') + '</span>'; }).join('');
    }
    function n2Facts() {
      var n = D.n2, d = (n.ours[gi] - n.hci[gi]) * 1e6;
      bondOut.textContent = n.R[gi].toFixed(2) + ' Å';
      factsEl.textContent = 'Ours: ' + fmt(n.ours[gi], 6) + ' Eh · ' + fmt(Math.abs(d), 1) + ' µEh below the tracker';
    }
    function load(key) {
      cur = key; var m = MOL[key];
      model = m.build(); yaw = m.yaw; pitch = m.pitch;
      tabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mol === key); });
      document.querySelectorAll('[data-qc-pick]').forEach(function (c) { c.classList.toggle('is-picked', c.dataset.qcPick === key); });
      document.querySelectorAll('[data-qc-pick]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.qcPick === key); });
      document.querySelectorAll('[data-qc-panel]').forEach(function (pn) { pn.hidden = pn.dataset.qcPanel !== key; });
      nameEl.textContent = m.name; bondBox.hidden = key !== 'n2';
      if (key === 'n2') n2Facts(); else factsEl.textContent = m.facts;
      setKey(); build(); tip.textContent = restTip(); render();
    }
    var nodes = [];
    function build() {
      while (bondG.firstChild) bondG.removeChild(bondG.firstChild);
      while (atomG.firstChild) atomG.removeChild(atomG.firstChild);
      nodes = model.atoms.map(function (a) {
        var g = el('g', { class: 'qc-mol-atom ' + ELEM[a.e].cls }, atomG);
        var c = el('circle', { r: 10 }, g), t = el('text', { 'text-anchor': 'middle', dy: '0.35em' }, g, ELEM[a.e].label);
        el('title', {}, g, ELEM[a.e].title);
        g.addEventListener('pointerenter', function () { tip.textContent = ELEM[a.e].title; });
        g.addEventListener('pointerleave', function () { tip.textContent = restTip(); });
        return { g: g, c: c, t: t, a: a };
      });
      model.lines = model.bonds.map(function () { return el('line', {}, bondG); });
    }
    function render() {
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var ext = 0;
      model.atoms.forEach(function (a) { ext = Math.max(ext, Math.hypot(a.p[0], a.p[1], a.p[2]) + ELEM[a.e].r); });
      if (cur === 'n2') ext = 2.6; // fixed scale so stretching the bond is visible
      var k = 118 / ext, cam = ext * 4;
      var P = model.atoms.map(function (a) {
        var x = a.p[0], y = a.p[1], z = a.p[2];
        var x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
        var y2 = cp * y - sp * z1, z2 = sp * y + cp * z1;
        var f = cam / (cam - z2);
        return { x: 150 + x1 * k * f, y: 132 - y2 * k * f, z: z2, f: f, r: ELEM[a.e].r * k * f };
      });
      var zs = P.map(function (p) { return p.z; }), zmin = Math.min.apply(null, zs), zmax = Math.max.apply(null, zs);
      var depth = function (z) { return zmax - zmin < 1e-6 ? 1 : (z - zmin) / (zmax - zmin); };
      var order = nodes.map(function (n, i) { return i; }).sort(function (a, b) { return P[a].z - P[b].z; });
      order.forEach(function (i) {
        var n = nodes[i], p = P[i], d = depth(p.z);
        n.c.setAttribute('cx', p.x.toFixed(1)); n.c.setAttribute('cy', p.y.toFixed(1)); n.c.setAttribute('r', p.r.toFixed(1));
        n.t.setAttribute('x', p.x.toFixed(1)); n.t.setAttribute('y', p.y.toFixed(1));
        n.t.style.fontSize = Math.max(8, p.r * 0.72).toFixed(1) + 'px';
        n.g.style.opacity = (0.55 + 0.45 * d).toFixed(2);
        atomG.appendChild(n.g);
      });
      var stretched = cur === 'n2' ? D.n2.R[gi] : 0;
      model.bonds.forEach(function (b, j) {
        var a = P[b[0]], c = P[b[1]], dx = c.x - a.x, dy = c.y - a.y, L = Math.hypot(dx, dy) || 1;
        var ln = model.lines[j], ux = dx / L, uy = dy / L;
        var gap = Math.max(0, L - a.r * 0.85 - c.r * 0.85);
        ln.setAttribute('x1', (a.x + ux * a.r * 0.85).toFixed(1)); ln.setAttribute('y1', (a.y + uy * a.r * 0.85).toFixed(1));
        ln.setAttribute('x2', (c.x - ux * c.r * 0.85).toFixed(1)); ln.setAttribute('y2', (c.y - uy * c.r * 0.85).toFixed(1));
        ln.style.opacity = gap > 0 ? (0.45 + 0.55 * depth((a.z + c.z) / 2)).toFixed(2) : '0';
        ln.setAttribute('class', stretched >= 2 ? 'is-broken' : stretched >= 1.5 ? 'is-weak' : stretched ? 'is-triple' : '');
      });
    }
    function loop(t) {
      raf = 0;
      if (!spin || !visible) return;
      if (last && !dragging) { yaw += Math.min(50, t - last) * 0.00035; render(); }
      last = t; raf = requestAnimationFrame(loop);
    }
    function play() { if (!raf && spin && visible) { last = 0; raf = requestAnimationFrame(loop); } }

    svg.addEventListener('pointerdown', function (e) {
      dragging = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch };
      svg.setPointerCapture(e.pointerId); svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      yaw = dragging.yaw + (e.clientX - dragging.x) * 0.012;
      pitch = Math.max(-1.45, Math.min(1.45, dragging.pitch + (e.clientY - dragging.y) * 0.012));
      render();
    });
    function endDrag() { dragging = null; last = 0; svg.classList.remove('is-dragging'); }
    svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('keydown', function (e) {
      var step = 0.15, used = true;
      if (e.key === 'ArrowLeft') yaw -= step; else if (e.key === 'ArrowRight') yaw += step;
      else if (e.key === 'ArrowUp') pitch = Math.max(-1.45, pitch - step); else if (e.key === 'ArrowDown') pitch = Math.min(1.45, pitch + step);
      else used = false;
      if (used) { e.preventDefault(); render(); }
    });
    tabs.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { load(b.dataset.mol); }); });
    document.querySelectorAll('[data-qc-pick]').forEach(function (card) {
      focusable(card, function () { load(card.dataset.qcPick); });
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Show ' + card.dataset.qcPick.replace('fe2s2', '2Fe–2S').replace('fe4s4', '4Fe–4S').replace('n2', 'N₂') + ' in the viewer and details');
    });
    bondIn.addEventListener('input', function () {
      gi = +bondIn.value; var y = yaw, p = pitch;
      model = MOL.n2.build(); build(); yaw = y; pitch = p; n2Facts(); tip.textContent = restTip(); render();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) play(); }).observe(svg);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) play(); });
    load(cur); play();
  })();
})();
