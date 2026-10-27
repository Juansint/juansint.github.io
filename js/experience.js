/* Experiencia y formación: pinta las líneas de tiempo a partir de data/experience.json. */
(function () {
  'use strict';

  var lists = document.querySelectorAll('[data-timeline]');
  if (!lists.length) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderRow(item) {
    var row = el('li', 'timeline__item reveal');
    var body = el('div', 'timeline__body');

    body.appendChild(el('h3', 'timeline__role', item.role));
    var org = [item.org, item.place].filter(Boolean).join(' · ');
    if (org) body.appendChild(el('p', 'timeline__org', org));
    if (item.dates) body.appendChild(el('p', 'timeline__dates', item.dates));
    if (item.description) body.appendChild(el('p', 'timeline__desc', item.description));

    row.appendChild(body);
    return row;
  }

  function showError(list) {
    list.textContent = '';
    var li = el('li', 'timeline__status', 'No he podido cargar esta sección. Puedes ver mi trayectoria en ');
    var a = el('a', null, 'LinkedIn');
    a.href = 'https://www.linkedin.com/in/juanc-dominguez';
    li.appendChild(a);
    li.appendChild(document.createTextNode('.'));
    list.appendChild(li);
  }

  fetch('data/experience.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('data/experience.json: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      Array.prototype.forEach.call(lists, function (list) {
        var items = (data[list.getAttribute('data-timeline')] || []).filter(function (item) { return item.role; });
        list.textContent = '';
        var rows = items.map(renderRow);
        rows.forEach(function (row) { list.appendChild(row); });
        if (window.revealOnScroll) window.revealOnScroll(rows);
      });
    })
    .catch(function () {
      Array.prototype.forEach.call(lists, showError);
    });
})();
