// Home page: publication + project filters, and the hybrid quantum–AI loop in the hero.
(() => {
  // Publications: category filter + show more
  const paperButtons = document.querySelectorAll('[data-paper-filter]');
  const papers = [...document.querySelectorAll('#publication-list .paper')];
  const morePapers = document.querySelector('#more-papers');
  const paperStatus = document.querySelector('#paper-status');
  if (morePapers) {
    const LIMIT = 4; let paperFilter = 'all', expanded = false;
    const render = () => {
      const matching = papers.filter(p => paperFilter === 'all' || p.dataset.category === paperFilter);
      const capped = paperFilter === 'all' && !expanded;
      papers.forEach(p => {p.hidden = true;});
      matching.forEach((p, i) => {p.hidden = capped && i >= LIMIT;});
      const shown = matching.filter(p => !p.hidden).length;
      paperStatus.textContent = `Showing ${shown} of ${matching.length} ${paperFilter === 'all' ? 'papers' : paperFilter + (matching.length === 1 ? ' paper' : ' papers')}`;
      morePapers.hidden = paperFilter !== 'all';
      morePapers.setAttribute('aria-expanded', String(expanded));
      morePapers.innerHTML = expanded ? 'Show fewer <span class="arr" aria-hidden="true">↑</span>' : `Show all ${papers.length} papers <span class="arr down" aria-hidden="true">↓</span>`;
    };
    paperButtons.forEach(button => button.addEventListener('click', () => {
      paperFilter = button.dataset.paperFilter;
      paperButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      render();
    }));
    morePapers.addEventListener('click', () => {
      expanded = !expanded; render();
      if (!expanded) document.querySelector('#research').scrollIntoView({block: 'start'});
    });
    render();
  }

  // Projects filter + prefetch on intent
  const filterButtons = document.querySelectorAll('[data-filter]');
  const projectCards = [...document.querySelectorAll('.project')];
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    projectCards.forEach(project => {project.hidden = button.dataset.filter !== 'all' && project.dataset.type !== button.dataset.filter;});
    const count = projectCards.filter(project => !project.hidden).length;
    document.querySelector('#filter-status').textContent = `Showing ${count} ${count === 1 ? 'project' : 'projects'}`;
  }));
  if (navigator.connection?.saveData !== true) {
    const prefetched = new Set();
    const warm = event => {
      const href = event.currentTarget.href; if (prefetched.has(href)) return; prefetched.add(href);
      const hint = document.createElement('link'); hint.rel = 'prefetch'; hint.href = href; document.head.append(hint);
    };
    projectCards.forEach(card => {card.addEventListener('pointerenter', warm, {once: true}); card.addEventListener('focus', warm, {once: true});});
  }

  // Hybrid loop: an AI agent steers a qubit's Bloch vector toward a target state.
  // Under the hood it does gradient ascent (with momentum and shot-like noise) on the fidelity
  // F = (1 + n·m)/2 over the angles θ, φ. The log narrates each stage of the closed loop:
  // propose new angles → run the circuit → measure → learn. Visitors can tap the sphere to set
  // a target or disturb the state with a gate, and the agent re-plans.
  const lab = document.querySelector('.lab');
  if (!lab) return;
  const svg = lab.querySelector('.loop');
  const NS = 'http://www.w3.org/2000/svg';
  const $ = selector => svg.querySelector(selector);
  const set = (el, attrs) => {for (const k in attrs) el.setAttribute(k, typeof attrs[k] === 'number' ? attrs[k].toFixed(2) : attrs[k]);};
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CX = 160, CY = 128, R = 100, E = 18 * Math.PI / 180, sE = Math.sin(E), cE = Math.cos(E);
  let view = 30 * Math.PI / 180;
  const project = ([x, y, z]) => {
    const c = Math.cos(view), s = Math.sin(view), d = x * c + y * s, h = -x * s + y * c;
    return [CX + R * h, CY - R * (z * cE - d * sE), d];
  };
  const unproject = (X, Y) => {
    const u = (X - CX) / R, w = (CY - Y) / R, r2 = u * u + w * w;
    if (r2 > 1) return null;
    const depth = Math.sqrt(1 - r2), z = w * cE + depth * sE, d = depth * cE - w * sE;
    const c = Math.cos(view), s = Math.sin(view);
    return [d * c - u * s, d * s + u * c, z];
  };
  const fromAngles = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => {const l = Math.hypot(...a) || 1; return a.map(v => v / l);};
  const rotate = (v, axis, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle), k = cross(axis, v), d = dot(axis, v);
    return [0, 1, 2].map(i => v[i] * c + k[i] * s + axis[i] * d * (1 - c));
  };
  const angles = v => [Math.acos(Math.max(-1, Math.min(1, v[2]))), (Math.atan2(v[1], v[0]) + 2 * Math.PI) % (2 * Math.PI)];
  const randomTarget = from => {
    for (;;) {
      const z = Math.random() * 2 - 1, p = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      const m = [r * Math.cos(p), r * Math.sin(p), z];
      const d = dot(m, from);
      if (d < .3 && d > -.8) return m; // far enough to be interesting, not near the antipode where gradients vanish
    }
  };
  const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());

  // Scene elements
  const vec = $('.b-vec'), tip = $('.b-tip'), halo = $('.b-halo'), psi = $('.b-psi');
  const tline = $('.b-target-line'), tmark = $('.b-target'), ghost = $('.b-ghost');
  const axes = [['#ax-xp', [1, 0, 0]], ['#ax-xn', [-1, 0, 0]], ['#ax-yp', [0, 1, 0]], ['#ax-yn', [0, -1, 0]]].map(([sel, v]) => ({el: $(sel), v}));
  const labelX = $('#lb-x'), labelY = $('#lb-y');
  const TRAIL = 48, trailGroup = $('.b-trail');
  const trailDots = Array.from({length: TRAIL}, () => {const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', '1.7'); trailGroup.append(c); return c;});

  // Readouts
  const fidText = lab.querySelector('[data-fid]'), fidBar = lab.querySelector('[data-fid-bar]');
  const stepText = lab.querySelector('[data-step]'), spark = lab.querySelector('[data-spark]');
  const announce = lab.querySelector('[data-announce]'), logEl = lab.querySelector('.lab-log');
  const stages = [...lab.querySelectorAll('.lab-stages li')];
  const gateButtons = lab.querySelectorAll('[data-gate]');

  // State: the agent's parameters (th, ph, with momentum) and the displayed Bloch vector n
  let th = .42, ph = .55, vth = 0, vph = 0, n = fromAngles(th, ph);
  let m = randomTarget(n), iter = 0, history = [], trail = [];
  let mode = 'opt', holdUntil = 0, anim = null, move = null, flash = 0, hover = null;
  let stage = 0, stageTimer = 0, lastF = null, sampleTimer = 0;
  const STAGE_MS = 450, STEPS_PER_ITER = 5;
  const fidelityOf = v => (1 + dot(v, m)) / 2;
  const fidelity = () => fidelityOf(n);
  const fmtAngles = v => {const [a, b] = angles(v); return `θ=${a.toFixed(2)} φ=${b.toFixed(2)}`;};

  // Agent log: lines are queued and typed out one at a time
  const queue = []; let typing = null;
  function log(role, text) {
    queue.push({role, text}); if (queue.length > 4) queue.shift();
    if (still) while (queue.length) {startLine(); typing.span.textContent = typing.text; typing = null;}
  }
  function startLine() {
    const {role, text} = queue.shift();
    const li = document.createElement('li'), r = document.createElement('span'), t = document.createElement('span');
    r.className = `lg-role lg-${role}`; r.textContent = role; t.className = 'lg-text';
    li.append(r, t); logEl.append(li);
    while (logEl.children.length > 5) logEl.firstElementChild.remove();
    typing = {span: t, text, i: 0};
  }
  function setStage(i) {stages.forEach((li, k) => {li.classList.toggle('is-active', k === i); li.classList.remove('is-done');});}
  function setDone() {stages.forEach(li => {li.classList.remove('is-active'); li.classList.add('is-done');});}

  // One proposal = a few momentum gradient steps on the fidelity, with shot-like noise
  function propose() {
    for (let k = 0; k < STEPS_PER_ITER; k++) {
      const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
      const noise = .02 * (1 - fidelityOf(fromAngles(th, ph))) + .002;
      const gth = .5 * (ct * cp * m[0] + ct * sp * m[1] - st * m[2]) + noise * gauss();
      const gph = .5 * st * (-sp * m[0] + cp * m[1]) + noise * gauss();
      vth = .75 * vth + .05 * gth;
      vph = .75 * vph + Math.max(-.25, Math.min(.25, .05 * gph / Math.max(st * st, .08)));
      th += vth; ph += vph;
      // Passing through a pole continues on the far side: reflect θ and turn φ by π
      if (th < 0) {th = -th; ph += Math.PI; vth = -vth;}
      if (th > Math.PI) {th = 2 * Math.PI - th; ph += Math.PI; vth = -vth;}
    }
    return fromAngles(th, ph);
  }
  function syncParams() {[th, ph] = angles(n); vth = vph = 0;}
  function record() {
    history.push(1 - fidelity()); if (history.length > 90) history.shift();
    trail.push(n); if (trail.length > TRAIL) trail.shift();
  }
  function advanceStage() {
    if (stage === 0) {
      const next = propose();
      move = {from: n, to: next, t: 0, dur: STAGE_MS * 2};
      log('agent', `propose  ${fmtAngles(next)}`);
    } else if (stage === 1) {
      log('qubit', 'run      1,024 shots');
    } else if (stage === 2) {
      const v = move ? move.to : n, p = (1 + v[2]) / 2;
      const est = Math.max(0, Math.min(1, p + gauss() * Math.sqrt(p * (1 - p) / 1024)));
      log('qubit', `measure  p₀ = ${est.toFixed(3)}`);
    } else {
      const F = fidelityOf(fromAngles(th, ph)), delta = lastF === null ? null : F - lastF;
      lastF = F; iter++;
      log('agent', `learn    F = ${F.toFixed(3)}${delta === null ? '' : `  ${delta >= 0 ? '↑' : '↓'}${Math.abs(delta).toFixed(3)}`}`);
      if (F > .995) {
        setDone(); mode = 'hold'; holdUntil = performance.now() + 2800; lab.dataset.state = 'done';
        log('agent', `✓ converged in ${iter} ${iter === 1 ? 'iteration' : 'iterations'}`);
        return;
      }
    }
    setStage(stage); stage = (stage + 1) % 4;
  }
  function newRun(role, message) {
    mode = 'opt'; vth = vph = 0; iter = 0; stage = 0; stageTimer = STAGE_MS * .6; lastF = null; move = null;
    log(role, message); lab.dataset.state = 'opt'; setStage(-1);
    if (still) settle();
  }
  // Reduced motion: jump straight to the agent's answer (the trail still shows its path)
  function settle() {
    let guard = 0;
    while (fidelityOf(fromAngles(th, ph)) <= .995 && guard++ < 60) {n = propose(); iter++; record();}
    log('agent', `✓ converged in ${iter} ${iter === 1 ? 'iteration' : 'iterations'}`);
    setDone(); mode = 'hold'; lab.dataset.state = 'done'; draw(0);
  }

  function startGate(gate) {
    if (anim) return;
    gateButtons.forEach(b => {b.disabled = true;});
    move = null;
    if (gate === 'M') {
      const p0 = (1 + n[2]) / 2, outcome = Math.random() < p0 ? 0 : 1, pole = [0, 0, outcome ? -1 : 1];
      const axis = cross(n, pole), ok = Math.hypot(...axis) > 1e-6, p = outcome ? 1 - p0 : p0;
      log('you', 'measure the qubit');
      anim = {from: n, axis: ok ? norm(axis) : [1, 0, 0], angle: ok ? Math.acos(Math.max(-1, Math.min(1, dot(n, pole)))) : 0, t: 0, dur: 420, pause: 700,
        done: () => {log('qubit', `collapsed → |${outcome}⟩  (p = ${p.toFixed(2)})`); announce.textContent = `Measured ${outcome}, with probability ${p.toFixed(2)}. The agent is re-planning.`;}};
      flash = 1;
    } else {
      const axis = gate === 'X' ? [1, 0, 0] : gate === 'Z' ? [0, 0, 1] : norm([1, 0, 1]);
      log('you', `apply ${gate} gate`);
      anim = {from: n, axis, angle: Math.PI, t: 0, dur: 650, pause: 300,
        done: () => {announce.textContent = `Applied the ${gate} gate. The agent is re-planning.`;}};
    }
    if (still) {n = rotate(anim.from, anim.axis, anim.angle); finishGate();}
  }
  function finishGate() {
    anim.done(); syncParams(); anim = null;
    gateButtons.forEach(b => {b.disabled = false;});
    newRun('agent', `F fell to ${fidelity().toFixed(3)} · re-planning`);
  }
  gateButtons.forEach(button => button.addEventListener('click', () => startGate(button.dataset.gate)));

  // Tap the sphere to choose a target
  const toSvg = event => {const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse()); return unproject(pt.x, pt.y);};
  svg.addEventListener('pointermove', event => {hover = toSvg(event); svg.classList.toggle('is-aiming', !!hover); if (still) draw(0);});
  svg.addEventListener('pointerleave', () => {hover = null; svg.classList.remove('is-aiming'); if (still) draw(0);});
  svg.addEventListener('click', event => {
    const target = toSvg(event); if (!target || anim) return;
    m = target; flash = .6; move = null; syncParams();
    announce.textContent = 'New target set. The agent is steering the qubit toward it.';
    newRun('you', `set target   ${fmtAngles(m)}`);
  });

  function draw(t) {
    const [X, Y, depth] = project(n);
    set(vec, {x2: X, y2: Y}); set(tip, {cx: X, cy: Y}); set(halo, {cx: X, cy: Y, r: 11 + 12 * flash});
    set(psi, {x: X + (X > CX ? 10 : -32), y: Y - 9});
    const o = depth < 0 ? .5 : 1; vec.style.opacity = o; tip.style.opacity = o; halo.style.opacity = (.14 + .3 * flash) * o;
    const [TX, TY, tDepth] = project(m);
    set(tline, {x2: TX, y2: TY}); set(tmark, {cx: TX, cy: TY});
    tmark.style.opacity = tDepth < 0 ? .45 : 1; tline.style.opacity = tDepth < 0 ? .25 : .55;
    if (hover) {const [GX, GY] = project(hover); set(ghost, {cx: GX, cy: GY}); ghost.style.opacity = 1;} else ghost.style.opacity = 0;
    axes.forEach(a => {const [AX, AY, d] = project(a.v); set(a.el, {x2: AX, y2: AY}); a.el.classList.toggle('b-back', d < 0);});
    const [LX, LY] = project([1.2, 0, 0]), [MX, MY] = project([0, 1.2, 0]);
    set(labelX, {x: LX - 4, y: LY + 4}); set(labelY, {x: MX - 4, y: MY + 4});
    trailDots.forEach((dotEl, i) => {
      const k = i - (TRAIL - trail.length);
      if (k < 0) {dotEl.style.opacity = 0; return;}
      const [DX, DY, d] = project(trail[k]);
      set(dotEl, {cx: DX, cy: DY}); dotEl.style.opacity = ((k + 1) / trail.length * .75 * (d < 0 ? .4 : 1)).toFixed(3);
    });
    const F = fidelity();
    fidText.textContent = F.toFixed(3); fidBar.style.transform = `scaleX(${F.toFixed(3)})`;
    stepText.textContent = String(iter).padStart(2, '0');
    if (history.length > 1) {
      const w = 140, h = 30, k = w / 89;
      spark.setAttribute('d', history.map((loss, i) => `${i ? 'L' : 'M'}${(i * k).toFixed(1)} ${(h - Math.sqrt(Math.max(0, loss)) * (h - 3)).toFixed(1)}`).join(''));
    }
  }

  let last = performance.now(), running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(50, now - last); last = now;
    view += dt * .00005;
    if (anim) {
      anim.t += dt;
      const u = Math.min(1, anim.t / anim.dur), ease = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      n = rotate(anim.from, anim.axis, anim.angle * ease);
      if (anim.t >= anim.dur + anim.pause) finishGate();
    } else if (mode === 'opt') {
      stageTimer += dt;
      if (stageTimer >= STAGE_MS) {stageTimer = 0; advanceStage();}
      if (move) {
        move.t += dt;
        const u = Math.min(1, move.t / move.dur), ease = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const axis = cross(move.from, move.to), len = Math.hypot(...axis);
        n = len > 1e-6 ? rotate(move.from, axis.map(a => a / len), Math.acos(Math.max(-1, Math.min(1, dot(move.from, move.to)))) * ease) : move.to;
        if (u >= 1) move = null;
      }
    } else if (mode === 'hold' && performance.now() > holdUntil) {
      m = randomTarget(n);
      newRun('agent', `new target   ${fmtAngles(m)}`);
    }
    sampleTimer += dt;
    if (sampleTimer > 70 && (move || anim)) {sampleTimer = 0; record();}
    if (!typing && queue.length) startLine();
    if (typing) {
      typing.i = Math.min(typing.text.length, typing.i + dt * .14);
      typing.span.textContent = typing.text.slice(0, Math.floor(typing.i));
      if (typing.i >= typing.text.length) typing = null;
    }
    flash = Math.max(0, flash - dt / 700);
    draw(now);
    requestAnimationFrame(frame);
  }

  log('agent', 'goal     steer |ψ⟩ onto the target ◌');
  if (still) {settle(); return;}
  setStage(-1); draw(0);
  let visible = false;
  const update = () => {
    const should = visible && !document.hidden;
    if (should && !running) {running = true; last = performance.now(); requestAnimationFrame(frame);}
    if (!should) running = false;
  };
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; update();}).observe(lab);
  document.addEventListener('visibilitychange', update);
})();
