(function () {
  const grid = document.getElementById('libraryGrid');
  const empty = document.getElementById('libraryEmpty');

  async function load() {
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      const items = data.items || [];

      if (items.length === 0) {
        grid.style.display = 'none';
        empty.style.display = '';
        return;
      }

      empty.style.display = 'none';
      grid.innerHTML = '';

      items.forEach((item) => {
        const card = document.createElement('a');
        card.href = '/view/' + item.id;
        card.className = 'library-card';

        const img = document.createElement('img');
        img.className = 'library-card__thumb';
        img.src = item.imageUrl || '';
        img.alt = item.title || 'Analysis';
        img.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'library-card__body';

        const title = document.createElement('div');
        title.className = 'library-card__title';
        title.textContent = item.title || 'Untitled';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'library-card__copy';
        copyBtn.textContent = '\uD83D\uDD17';
        copyBtn.title = 'Copy link';
        copyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const url = location.origin + '/view/' + item.id;
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.textContent = '\u2713';
            setTimeout(function () {
              copyBtn.textContent = '\uD83D\uDD17';
            }, 1500);
          });
        });

        body.appendChild(title);
        body.appendChild(copyBtn);
        card.appendChild(img);
        card.appendChild(body);
        grid.appendChild(card);
      });
    } catch {
      grid.style.display = 'none';
      empty.style.display = '';
    }
  }

  load();
})();
