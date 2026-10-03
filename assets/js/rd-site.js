// Shared behaviour for the redesigned pages: theme, clock, chapter nav, reveal, copy and figure viewer.
(() => {
  const root = document.documentElement;

  // Theme toggle (initial theme is set inline in <head> to avoid a flash)
  const toggles = document.querySelectorAll('.theme-toggle');
  const syncToggle = () => {
    const dark = root.dataset.theme === 'dark';
    toggles.forEach(toggle => {
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  };
  syncToggle();
  toggles.forEach(toggle => toggle.addEventListener('click', () => {
    root.classList.add('theme-anim');
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {localStorage.setItem('ms-theme', root.dataset.theme);} catch (e) {}
    syncToggle();
    document.dispatchEvent(new CustomEvent('themechange'));
    setTimeout(() => root.classList.remove('theme-anim'), 400);
  }));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    let stored = null; try {stored = localStorage.getItem('ms-theme');} catch (e) {}
    if (!stored) {root.dataset.theme = event.matches ? 'dark' : 'light'; syncToggle();}
  });

  // Singapore clock
  const clock = document.querySelector('[data-clock]');
  if (clock && window.Intl) {
    const format = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false});
    const tick = () => {clock.textContent = format.format(new Date());};
    tick(); clock.parentElement.hidden = false; setInterval(tick, 20000);
  }

  // Copy-to-clipboard buttons
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const label = button.querySelector('.copy-label') || button;
    const original = label.textContent;
    try {await navigator.clipboard.writeText(button.dataset.copy); label.textContent = button.dataset.copied || 'Copied to clipboard ✓';}
    catch (e) {if (button.dataset.copy.includes('@')) location.href = 'mailto:' + button.dataset.copy; return;}
    setTimeout(() => {label.textContent = original;}, 2200);
  }));

  // Active chapter in the sidebar + reading progress
  const navLinks = [...document.querySelectorAll('.side-nav a[href^="#"]')];
  const chapters = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const progress = document.querySelector('.progress');
  let activeChapter = null;
  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (!chapters.length) return;
    let current = chapters[0];
    chapters.forEach(chapter => {if (chapter.getBoundingClientRect().top < innerHeight * .38) current = chapter;});
    if (innerHeight + scrollY >= root.scrollHeight - 4) current = chapters[chapters.length - 1];
    navLinks.forEach(link => {
      if (link.getAttribute('href') === '#' + current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (current !== activeChapter) {
      activeChapter = current;
      const nav = navLinks[0].parentElement, link = navLinks[chapters.indexOf(current)];
      if (link && nav.scrollWidth > nav.clientWidth) {
        const n = nav.getBoundingClientRect(), l = link.getBoundingClientRect();
        nav.scrollTo({left: nav.scrollLeft + l.left - n.left - (n.width - l.width) / 2, behavior: 'smooth'});
      }
    }
  }
  let framePending = false;
  addEventListener('scroll', () => {if (!framePending) {framePending = true; requestAnimationFrame(() => {onScroll(); framePending = false;});}}, {passive: true});
  addEventListener('resize', onScroll); onScroll();

  // Reveal on scroll
  if (root.classList.contains('js-reveal')) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('is-in'); io.unobserve(entry.target);}
    }), {rootMargin: '0px 0px -6% 0px', threshold: .06});
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  // Figure viewer: links marked data-lightbox open in a <dialog>; without JS they open the image directly.
  const triggers = document.querySelectorAll('[data-lightbox]');
  if (triggers.length && window.HTMLDialogElement) {
    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.innerHTML = '<div class="lightbox-bar"><p class="lightbox-caption"></p><a class="lightbox-open" target="_blank" rel="noopener">Full resolution ↗</a><button type="button" class="lightbox-close" aria-label="Close figure">✕</button></div><div class="lightbox-stage"><img alt=""></div>';
    document.body.append(dialog);
    const img = dialog.querySelector('img'), caption = dialog.querySelector('.lightbox-caption'), open = dialog.querySelector('.lightbox-open');
    let opener = null;
    triggers.forEach(trigger => trigger.addEventListener('click', event => {
      event.preventDefault();
      opener = trigger;
      img.src = trigger.href; img.alt = trigger.querySelector('img')?.alt || '';
      caption.textContent = trigger.dataset.lightbox; open.href = trigger.href;
      dialog.showModal();
    }));
    dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {if (event.target === dialog || event.target.classList.contains('lightbox-stage')) dialog.close();});
    dialog.addEventListener('close', () => {img.removeAttribute('src'); opener?.focus({preventScroll: true});});
  }
})();
