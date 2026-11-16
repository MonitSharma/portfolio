(() => {
  const shelf = document.querySelector('.writing-shelf');
  const filters = shelf.querySelector('.shelf-filters');
  const buttons = filters.querySelectorAll('button');
  const covers = shelf.querySelectorAll('.writing-cover');
  const status = shelf.querySelector('.shelf-status');

  filters.addEventListener('click', (event) => {
    const selected = event.target.closest('button[data-filter]');
    if (!selected) return;

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === selected));
    }

    const topic = selected.dataset.filter;
    let count = 0;
    for (const cover of covers) {
      cover.hidden = topic !== 'all' && cover.dataset.topic !== topic;
      if (!cover.hidden && !cover.classList.contains('shelf-draft')) count += 1;
    }

    status.textContent = count === 1 ? '1 essay' : `${count} essays`;
  });

  filters.hidden = false;
})();
