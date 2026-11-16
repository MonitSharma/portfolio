(() => {
  // Copy buttons on code blocks.
  for (const button of document.querySelectorAll('[data-copy-code]')) {
    button.addEventListener('click', async () => {
      const code = button.closest('.code-block').querySelector('code').innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy'; }, 1400);
      } catch {
        button.textContent = 'Select to copy';
      }
    });
  }

  // Click a figure to see it larger (desktop only; phones just follow the link).
  for (const link of document.querySelectorAll('[data-lightbox]')) {
    link.addEventListener('click', (event) => {
      if (matchMedia('(max-width: 700px)').matches || !window.HTMLDialogElement) return;
      event.preventDefault();
      const dialog = document.createElement('dialog');
      dialog.className = 'essay-lightbox';
      const image = document.createElement('img');
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || '';
      dialog.append(image);
      document.body.append(dialog);
      dialog.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => dialog.remove());
      dialog.showModal();
    });
  }

  // Highlight the section being read in the contents list.
  const tocLinks = [...document.querySelectorAll('.essay-toc a')];
  if (!tocLinks.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const a of tocLinks) a.removeAttribute('aria-current');
      byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '0px 0px -70% 0px' });
  for (const id of byId.keys()) {
    const heading = document.getElementById(id);
    if (heading) observer.observe(heading);
  }
})();
