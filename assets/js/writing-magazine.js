(() => {
  const figures = document.querySelector('.lead-figure-controls');
  const figureButtons = [...figures.querySelectorAll('button')];
  figures.addEventListener('click', (event) => {
    const selected = event.target.closest('button');
    if (!selected) return;
    for (const button of figureButtons) {
      const active = button === selected;
      button.setAttribute('aria-pressed', String(active));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    }
  });
  figures.hidden = false;

  const gallery = document.querySelector('.issue-gallery');
  const filters = gallery.querySelector('.gallery-filters');
  const cards = [...gallery.querySelectorAll('.writing-cover')];
  const status = gallery.querySelector('.gallery-status');
  filters.addEventListener('click', (event) => {
    const selected = event.target.closest('button[data-filter]');
    if (!selected) return;
    const topic = selected.dataset.filter;
    for (const button of filters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
    let count = 0;
    for (const card of cards) {
      card.hidden = topic !== 'all' && card.dataset.topic !== topic;
      if (!card.hidden) count += 1;
    }
    status.textContent = count === 1 ? '1 essay' : `${count} essays`;
  });
  filters.hidden = false;

  const dialog = document.querySelector('.essay-preview');
  if (typeof dialog.showModal !== 'function') return;
  const dialogCover = dialog.querySelector('.essay-preview-cover');
  const readLink = dialog.querySelector('.essay-preview-read');
  let opener;

  for (const card of cards) {
    const link = card.querySelector('a');
    link.setAttribute('aria-haspopup', 'dialog');
    card.querySelector('.cover-arrow').textContent = '+';
  }

  gallery.addEventListener('click', (event) => {
    const link = event.target.closest('.writing-cover a');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    opener = link;
    const card = link.closest('.writing-cover');
    dialogCover.dataset.topic = card.dataset.topic || '';
    dialogCover.querySelector('.cover-source').textContent = card.querySelector('.cover-source').textContent;
    dialog.querySelector('#essay-preview-title').textContent = card.querySelector('h3').textContent;
    dialog.querySelector('#essay-preview-summary').textContent = card.querySelector('.cover-summary').textContent;
    readLink.href = link.href;
    readLink.textContent = link.hostname === 'medium.com' ? 'Read on Medium ↗' : 'Read the essay ↗';
    dialog.showModal();
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
})();
