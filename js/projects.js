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

  function fromRepo(repo, o) {
    var language = repo.primaryLanguage && repo.primaryLanguage.name;
    return {
      title: o.title || prettify(repo.name),
      description: (o.description || repo.description || '').trim(),
      tags: o.tags || (language ? [language] : []),
      codeUrl: repo.url,
      demoUrl: o.homepageUrl !== undefined ? o.homepageUrl : repo.homepageUrl,
      featured: Boolean(o.featured),
      hidden: Boolean(o.hidden),
      order: typeof o.order === 'number' ? o.order : Infinity,
      updatedAt: repo.updatedAt || ''
    };
  }

  // Proyectos que no son repos públicos (array "manual" de los overrides)
  function fromManual(m) {
    return {
      title: m.title || '',
      description: (m.description || '').trim(),
      tags: m.tags || [],
      codeUrl: m.codeUrl || '',
      demoUrl: m.demoUrl || '',
      featured: Boolean(m.featured),
      hidden: Boolean(m.hidden),
      order: typeof m.order === 'number' ? m.order : Infinity,
      updatedAt: ''
    };
  }

  function merge(repos, overrides) {
    var fromRepos = repos
      .filter(function (repo) { return !repo.isFork && !repo.isArchived; })
      .map(function (repo) { return fromRepo(repo, overrides[repo.name] || {}); });
    var manual = (Array.isArray(overrides.manual) ? overrides.manual : []).map(fromManual);

    return manual.concat(fromRepos)
      .filter(function (p) { return !p.hidden && p.title; })
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
    var tags = el('ul', 'card__tags');
    p.tags.forEach(function (tag) {
      var li = el('li');
      li.appendChild(el('span', 'tag', tag));
      tags.appendChild(li);
    });
    footer.appendChild(tags);

    var links = el('ul', 'card__links');
    if (p.codeUrl) {
      links.appendChild(link(p.codeUrl, 'Código', p.title));
    } else {
      var priv = el('li');
      priv.appendChild(el('span', 'card__private', 'Código privado'));
      links.appendChild(priv);
    }
    if (p.demoUrl) links.appendChild(link(p.demoUrl, 'Demo', p.title));
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
      // Con un número impar de destacados, el último ocupa toda la fila
      var featured = cards.filter(function (card) { return card.classList.contains('card--featured'); });
      if (featured.length % 2 === 1) featured[featured.length - 1].classList.add('card--wide');
      cards.forEach(function (card) { grid.appendChild(card); });
      reveal(cards);
    })
    .catch(showError);
})();
