/* Animación de entrada compartida: fade + translateY al entrar en pantalla, una sola vez. */
(function () {
  'use strict';

  var STAGGER_MS = 80;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var observer = null;

  function onEnter(entries) {
    var batch = entries.filter(function (entry) { return entry.isIntersecting; });
    batch.forEach(function (entry, i) {
      var node = entry.target;
      node.style.transitionDelay = (i * STAGGER_MS) + 'ms';
      node.classList.add('is-visible');
      observer.unobserve(node);
      // Al terminar la entrada, quita el retardo para que el hover responda al instante
      node.addEventListener('transitionend', function done(ev) {
        if (ev.target !== node || ev.propertyName !== 'opacity') return;
        node.style.transitionDelay = '';
        node.classList.add('is-done');
        node.removeEventListener('transitionend', done);
      });
    });
  }

  // Los elementos deben llevar la clase "reveal". Sin soporte o con reduced-motion aparecen tal cual.
  window.revealOnScroll = function (nodes) {
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('reveal-ready');
    if (!observer) {
      observer = new IntersectionObserver(onEnter, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }
    Array.prototype.forEach.call(nodes, function (node) { observer.observe(node); });
  };
})();
