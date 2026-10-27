/* Barra de navegación: fondo al hacer scroll y menú hamburguesa en móvil. */
(function () {
  'use strict';

  var header = document.querySelector('[data-header]');
  if (!header) return;
  var toggle = header.querySelector('.nav__toggle');
  var menu = document.getElementById(toggle.getAttribute('aria-controls'));
  var desktop = window.matchMedia('(min-width: 768px)');

  // Transparente sobre el hero, con fondo en cuanto hay scroll
  var ticking = false;
  function updateScrolled() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrolled);
    }
  }, { passive: true });
  updateScrolled();

  function setOpen(open, returnFocus) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (!open && returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Esc cierra y devuelve el foco al botón
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) setOpen(false, true);
  });

  // Elegir un enlace o pulsar fuera también cierra
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', function (e) {
    if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
  });

  function onBreakpoint() {
    if (desktop.matches) setOpen(false);
  }
  if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  else if (desktop.addListener) desktop.addListener(onBreakpoint);
})();
