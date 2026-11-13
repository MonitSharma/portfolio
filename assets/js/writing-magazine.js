(() => {
  for (const figures of document.querySelectorAll('.lead-figure-controls')) {
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
  }

  const highlights = [...document.querySelectorAll('.writing-highlights .issue-lead')];
  const highlightControls = document.querySelector('.highlight-controls');
  const highlightStatus = document.querySelector('[data-highlight-status]');
  const gallery = document.querySelector('.issue-gallery');
  const filters = gallery.querySelector('.gallery-filters');
  const cards = [...gallery.querySelectorAll('.writing-cover')];
  const status = gallery.querySelector('.gallery-status');
  const weekLength = 7 * 24 * 60 * 60 * 1000;
  const firstMonday = Date.UTC(2026, 10, 9);
  const weeksElapsed = Math.max(0, Math.floor((Date.now() - firstMonday) / weekLength));
  let highlightIndex = weeksElapsed % highlights.length;
  let featuredUrl;
  let topic = 'all';

  function updateGallery(announce = false) {
    let count = 0;
    for (const card of cards) {
      card.hidden = card.querySelector('a').href === featuredUrl || (topic !== 'all' && card.dataset.topic !== topic);
      if (!card.hidden) count += 1;
    }
    if (announce || status.textContent) {
      status.textContent = count === 1 ? '1 essay' : `${count} essays`;
    }
  }

  function showHighlight() {
    const featured = highlights[highlightIndex];
    for (const article of highlights) article.hidden = article !== featured;
    featuredUrl = featured.querySelector('.lead-read').href;
    updateGallery();
  }

  highlightControls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-step]');
    if (!button) return;
    highlightIndex = (highlightIndex + Number(button.dataset.step) + highlights.length) % highlights.length;
    showHighlight();
    highlightStatus.textContent = highlights[highlightIndex].querySelector('h2').textContent;
  });
  highlightControls.hidden = highlights.length < 2;
  showHighlight();

  filters.addEventListener('click', (event) => {
    const selected = event.target.closest('button[data-filter]');
    if (!selected) return;
    topic = selected.dataset.filter;
    for (const button of filters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
    updateGallery(true);
  });
  filters.hidden = false;
})();
