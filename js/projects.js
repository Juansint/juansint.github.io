/* Rejilla de proyectos: lee data/projects.json + data/projects.overrides.json y los mezcla. */
(function () {
  'use strict';

  var grid = document.querySelector('[data-projects]');
  if (!grid) return;

  var PENDING = 'Descripción pendiente';
  var STAGGER_MS = 80;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fetchJSON(url, fallback) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) {
        if (fallback !== undefined) return fallback;
        throw new Error(url + ': ' + res.status);
      }
      return res.json();
    });
  }

  // "PIG-GAME" → "Pig Game", "tutor-website" → "Tutor Website"
  function prettify(slug) {
    return slug
      .replace(/[-_]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  function merge(repos, overrides) {
    return repos
      .filter(function (repo) { return !repo.isFork && !repo.isArchived; })
      .map(function (repo) {
        var o = overrides[repo.name] || {};
        return {
          name: repo.name,
          title: o.title || prettify(repo.name),
          description: (o.description || repo.description || '').trim(),
          url: repo.url,
          homepageUrl: o.homepageUrl !== undefined ? o.homepageUrl : repo.homepageUrl,
          language: o.language || (repo.primaryLanguage && repo.primaryLanguage.name) || '',
          featured: Boolean(o.featured),
          hidden: Boolean(o.hidden),
          order: typeof o.order === 'number' ? o.order : Infinity,
          updatedAt: repo.updatedAt || ''
        };
      })
      .filter(function (p) { return !p.hidden; })
      .sort(function (a, b) {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if (a.order !== b.order) return a.order - b.order;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function link(href, label, title) {
    var li = el('li');
    var a = el('a', null, label);
    a.href = href;
    a.rel = 'noopener';
    a.appendChild(el('span', 'sr-only', ' de ' + title));
    li.appendChild(a);
    return li;
  }

  function renderCard(p) {
    var card = el('article', 'card' + (p.featured ? ' card--featured' : ''));

    var top = el('div', 'card__top');
    top.appendChild(el('h3', 'card__title', p.title));
    if (p.featured) top.appendChild(el('span', 'card__badge', 'Destacado'));
    card.appendChild(top);

    var desc = el('p', 'card__desc', p.description || PENDING);
    if (!p.description) desc.classList.add('card__desc--pending');
    card.appendChild(desc);

    var footer = el('div', 'card__footer');
    if (p.language) footer.appendChild(el('span', 'tag', p.language));
    else footer.appendChild(el('span'));

    var links = el('ul', 'card__links');
    links.appendChild(link(p.url, 'Código', p.title));
    if (p.homepageUrl) links.appendChild(link(p.homepageUrl, 'Demo', p.title));
    footer.appendChild(links);
    card.appendChild(footer);

    return card;
  }

  function reveal(cards) {
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('reveal-ready');

    var observer = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (entry) { return entry.isIntersecting; });
      batch.forEach(function (entry, i) {
        var card = entry.target;
        card.style.transitionDelay = (i * STAGGER_MS) + 'ms';
        card.classList.add('is-visible');
        observer.unobserve(card);
        // Al terminar la entrada, quita el retardo para que el hover responda al instante
        card.addEventListener('transitionend', function done(ev) {
          if (ev.propertyName !== 'opacity') return;
          card.style.transitionDelay = '';
          card.classList.add('is-done');
          card.removeEventListener('transitionend', done);
        });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    cards.forEach(function (card) { observer.observe(card); });
  }

  function showError() {
    grid.textContent = '';
    var msg = el('p', 'projects__status', 'No he podido cargar los proyectos. Puedes verlos directamente en ');
    var a = el('a', null, 'GitHub');
    a.href = 'https://github.com/Juansint?tab=repositories';
    msg.appendChild(a);
    msg.appendChild(document.createTextNode('.'));
    grid.appendChild(msg);
  }

  Promise.all([
    fetchJSON('data/projects.json'),
    fetchJSON('data/projects.overrides.json', {})
  ])
    .then(function (results) {
      var projects = merge(results[0], results[1] || {});
      grid.textContent = '';
      if (!projects.length) {
        grid.appendChild(el('p', 'projects__status', 'Pronto habrá proyectos aquí.'));
        return;
      }
      var cards = projects.map(renderCard);
      cards.forEach(function (card) { grid.appendChild(card); });
      reveal(cards);
    })
    .catch(showError);
})();
