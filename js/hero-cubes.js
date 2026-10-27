/* Cubos interactivos del hero (modo "empujar"). Canvas 2D, sin dependencias. */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  var canvas = hero && hero.querySelector('.hero__canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Física
  var FRICTION = 0.985;
  var MAX_SPEED = 14;
  var RESTITUTION = 0.8;
  var DRIFT = 0.05;          // deriva aleatoria por frame
  var MIN_SPEED = 0.25;      // por debajo, la deriva empuja algo más
  var MAX_SPIN = 0.18;

  // Cursor
  var PUSH_RADIUS = 110;
  var PUSH_MIN_SPEED = 0.5;  // px/ms
  var PUSH_STRENGTH = 2.4;

  var PALETTES = {
    navy:      { front: '#1E3A5F', side: '#12263F', shine: '#4A6B8F' },
    navyDark:  { front: '#3D5A80', side: '#26405F', shine: '#7896B8' },
    orange:    { front: '#C4805F', side: '#8C5A43', shine: '#E2B39C' },
    gray:      { front: '#888780', side: '#5F5E5A', shine: '#B4B2A9' }
  };
  var LABELS = ['{ }', '</>'];

  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  var width = 0;
  var height = 0;
  var dpr = 1;
  var cubes = [];
  var rafId = 0;
  var visible = true;
  var lastPointer = null;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function paletteFor(cube) {
    if (cube.kind === 'navy' && darkQuery.matches) return PALETTES.navyDark;
    return PALETTES[cube.kind];
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reajusta sin recrear: los cubos que quedan fuera vuelven dentro
    for (var i = 0; i < cubes.length; i++) {
      var c = cubes[i];
      c.x = Math.min(Math.max(c.x, c.r), width - c.r);
      c.y = Math.min(Math.max(c.y, c.r), height - c.r);
    }
    if (motionQuery.matches || !rafId) draw();
  }

  function createCubes() {
    var count = window.innerWidth < 500 ? 10 : 18;
    cubes = [];
    for (var i = 0; i < count; i++) {
      // 1 de cada 5 naranja, mayoría azul marino, resto gris
      var slot = i % 5;
      var kind = slot === 4 ? 'orange' : slot === 3 ? 'gray' : 'navy';
      var size = rand(26, 60);
      var cube = {
        kind: kind,
        size: size,
        r: size * 0.62,
        x: 0,
        y: 0,
        vx: rand(-0.8, 0.8),
        vy: rand(-0.8, 0.8),
        angle: rand(0, Math.PI * 2),
        spin: rand(-0.01, 0.01),
        label: size >= 36 && i % 3 === 0 ? LABELS[(i / 3) % 2 | 0] : null
      };
      placeWithoutOverlap(cube);
      cubes.push(cube);
    }
  }

  function placeWithoutOverlap(cube) {
    for (var attempt = 0; attempt < 40; attempt++) {
      cube.x = rand(cube.r, width - cube.r);
      cube.y = rand(cube.r, height - cube.r);
      var ok = true;
      for (var j = 0; j < cubes.length; j++) {
        var o = cubes[j];
        var dx = o.x - cube.x;
        var dy = o.y - cube.y;
        if (dx * dx + dy * dy < Math.pow(o.r + cube.r + 4, 2)) { ok = false; break; }
      }
      if (ok) return;
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCube(c) {
    var p = paletteFor(c);
    var s = c.size;
    var half = s / 2;
    var depth = Math.max(4, s * 0.14);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);

    // Cara lateral desplazada (volumen)
    ctx.fillStyle = p.side;
    roundedRect(-half + depth, -half + depth, s, s, 6);
    ctx.fill();

    // Cara frontal
    ctx.fillStyle = p.front;
    roundedRect(-half, -half, s, s, 6);
    ctx.fill();

    // Franja superior más clara, recortada a la cara frontal
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.shine;
    ctx.fillRect(-half, -half, s, s * 0.3);
    ctx.restore();

    if (c.label) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 ' + Math.round(s * 0.3) + 'px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, 0, s * 0.04);
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < cubes.length; i++) drawCube(cubes[i]);
  }

  function clampSpeed(c) {
    var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    if (sp > MAX_SPEED) {
      c.vx = (c.vx / sp) * MAX_SPEED;
      c.vy = (c.vy / sp) * MAX_SPEED;
    }
    if (c.spin > MAX_SPIN) c.spin = MAX_SPIN;
    else if (c.spin < -MAX_SPIN) c.spin = -MAX_SPIN;
  }

  function step() {
    var i, j, c;

    for (i = 0; i < cubes.length; i++) {
      c = cubes[i];

      // Deriva aleatoria suave para que nunca se queden quietos
      var drift = Math.hypot(c.vx, c.vy) < MIN_SPEED ? DRIFT * 2 : DRIFT;
      c.vx += rand(-drift, drift);
      c.vy += rand(-drift, drift);
      c.spin += rand(-0.0008, 0.0008);

      c.vx *= FRICTION;
      c.vy *= FRICTION;
      c.spin *= FRICTION;
      clampSpeed(c);

      c.x += c.vx;
      c.y += c.vy;
      c.angle += c.spin;

      // Rebote en bordes
      if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * RESTITUTION; }
      else if (c.x > width - c.r) { c.x = width - c.r; c.vx = -Math.abs(c.vx) * RESTITUTION; }
      if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy) * RESTITUTION; }
      else if (c.y > height - c.r) { c.y = height - c.r; c.vy = -Math.abs(c.vy) * RESTITUTION; }
    }

    // Colisiones circulares entre cubos (masa ~ área)
    for (i = 0; i < cubes.length; i++) {
      var a = cubes[i];
      for (j = i + 1; j < cubes.length; j++) {
        var b = cubes[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var minDist = a.r + b.r;
        var distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist || distSq === 0) continue;

        var dist = Math.sqrt(distSq);
        var nx = dx / dist;
        var ny = dy / dist;
        var ma = a.size * a.size;
        var mb = b.size * b.size;
        var total = ma + mb;

        // Separa el solapamiento en proporción a la masa
        var overlap = minDist - dist;
        a.x -= nx * overlap * (mb / total);
        a.y -= ny * overlap * (mb / total);
        b.x += nx * overlap * (ma / total);
        b.y += ny * overlap * (ma / total);

        var rvx = b.vx - a.vx;
        var rvy = b.vy - a.vy;
        var velNormal = rvx * nx + rvy * ny;
        if (velNormal > 0) continue;

        var impulse = (-(1 + RESTITUTION) * velNormal) / (1 / ma + 1 / mb);
        a.vx -= (impulse / ma) * nx;
        a.vy -= (impulse / ma) * ny;
        b.vx += (impulse / mb) * nx;
        b.vy += (impulse / mb) * ny;

        // Giro transmitido por la componente tangencial del choque
        var velTangent = rvx * -ny + rvy * nx;
        a.spin += velTangent * 0.012 * (mb / total);
        b.spin -= velTangent * 0.012 * (ma / total);

        clampSpeed(a);
        clampSpeed(b);
      }
    }
  }

  function loop() {
    step();
    draw();
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (rafId || !visible || motionQuery.matches) return;
    rafId = window.requestAnimationFrame(loop);
  }

  function stop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function onPointerMove(e) {
    if (motionQuery.matches) return;
    var rect = hero.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var t = e.timeStamp;

    if (!lastPointer || lastPointer.id !== e.pointerId) {
      lastPointer = { x: x, y: y, t: t, id: e.pointerId };
      return;
    }

    var dt = Math.max(1, t - lastPointer.t);
    var speed = Math.hypot(x - lastPointer.x, y - lastPointer.y) / dt; // px/ms
    lastPointer.x = x;
    lastPointer.y = y;
    lastPointer.t = t;

    if (speed <= PUSH_MIN_SPEED) return;
    var cursorSpeed = Math.min(speed, 5);

    for (var i = 0; i < cubes.length; i++) {
      var c = cubes[i];
      var dx = c.x - x;
      var dy = c.y - y;
      var dist = Math.hypot(dx, dy);
      if (dist >= PUSH_RADIUS) continue;

      var closeness = 1 - dist / PUSH_RADIUS;
      var nx = dist > 0.001 ? dx / dist : Math.cos(c.angle);
      var ny = dist > 0.001 ? dy / dist : Math.sin(c.angle);
      var force = closeness * cursorSpeed * PUSH_STRENGTH;

      c.vx += nx * force;
      c.vy += ny * force;
      c.spin += (Math.random() < 0.5 ? -1 : 1) * closeness * cursorSpeed * 0.02;
      clampSpeed(c);
    }
  }

  function onPointerLeave() {
    lastPointer = null;
  }

  function onMotionChange() {
    if (motionQuery.matches) {
      stop();
      draw();
    } else {
      start();
    }
  }

  // Init
  resize();
  createCubes();
  draw();

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave);
  hero.addEventListener('pointercancel', onPointerLeave);
  hero.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'mouse') onPointerLeave();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(hero);
  }

  var onSchemeChange = function () { if (!rafId) draw(); };
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', onSchemeChange);
    motionQuery.addEventListener('change', onMotionChange);
  } else if (darkQuery.addListener) {
    darkQuery.addListener(onSchemeChange);
    motionQuery.addListener(onMotionChange);
  }

  start();
})();
