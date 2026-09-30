/* ============================================================
   app-kaleido.js · 万花筒
   三种生成器，一个对称引擎。种子决定一切，同一配方永远同一张图。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var MODES = [
    { id: 'confetti', n: '纸屑', d: '一片片小东西，绕着中心转' },
    { id: 'thread',   n: '游丝', d: '随机走出来的线，甩成圆的' },
    { id: 'fractal',  n: '分形', d: '递归生长的枝，镜像后对称' }
  ];

  /* ---------------- 调色 ----------------
     每"环"一个主色，环内微调。这样花瓣有层次，而不是一锅粥。 */
  function palette(rnd, warmth, spread) {
    var base = warmth * 360;
    return function (ring) {
      var h = base + (ring || 0) * spread * 30;
      var s = 44 + rnd() * 30;
      var l = 50 + rnd() * 24 - (ring || 0) * 1.6;
      return 'hsl(' + (((h % 360) + 360) % 360).toFixed(0) + ',' + s.toFixed(0) + '%,' + l.toFixed(0) + '%)';
    };
  }

  /* ---------------- 三种生成器 ----------------
     都在一个对称扇形（0 → span）里画，角度 0 指正上方。 */

  var MOTIF = 5;

  function drawCore(g, rnd, col, R) {
    var c = col(0);
    g.save();
    g.globalAlpha = 0.85;
    g.fillStyle = c;
    g.strokeStyle = c;
    var n = 5 + Math.floor(rnd() * 4);
    g.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      var r = (i % 2 === 0 ? R * 0.085 : R * 0.042) * (0.85 + rnd() * 0.3);
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.globalAlpha = 0.55;
    g.lineWidth = Math.max(1, R * 0.006);
    g.beginPath(); g.arc(0, 0, R * 0.12, 0, 6.2832); g.stroke();
    g.restore();
  }

  function drawConfetti(g, rnd, col, opt) {
    drawCore(g, rnd, col, opt.R);
    for (var i = 0; i < opt.rings; i++) {
      var t = (i + 0.75) / opt.rings;
      var r = opt.R * Math.pow(t, 0.82);
      var count = Math.max(2, opt.per + (rnd() < 0.4 ? 1 : 0));
      var size = opt.R * 0.062 * (1 - t * 0.58);
      var c = col(i);
      var main = Math.floor(rnd() * MOTIF);
      var alt = (main + 1 + Math.floor(rnd() * (MOTIF - 1))) % MOTIF;
      // 每环错开一点相位，复制出来才有螺旋花瓣，而不是一圈圈的箍
      var phase = i * 0.41 + (rnd() - 0.5) * 0.18;
      for (var j = 0; j < count; j++) {
        var a = ((j + 0.5 + phase + (rnd() - 0.5) * 0.42) / count) * opt.span;
        var rr = r * (1 + (rnd() - 0.5) * 0.08);
        var x = Math.sin(a) * rr, y = -Math.cos(a) * rr;
        var s = size * (0.7 + rnd() * 0.5);
        g.save();
        g.translate(x, y);
        g.rotate(a + (rnd() - 0.5) * 1.6);
        g.fillStyle = c;
        g.strokeStyle = c;
        g.globalAlpha = 0.55 + rnd() * 0.4;
        var kind = rnd() < 0.78 ? main : alt;
        if (kind === 0) {
          g.beginPath(); g.arc(0, 0, s * 0.6, 0, 6.2832); g.fill();
        } else if (kind === 1) {
          g.lineWidth = Math.max(1, s * 0.34);
          g.beginPath(); g.arc(0, 0, s * 0.75, 0, 6.2832); g.stroke();
        } else if (kind === 2) {
          g.beginPath();
          g.moveTo(0, -s); g.lineTo(s * 0.87, s * 0.5); g.lineTo(-s * 0.87, s * 0.5);
          g.closePath(); g.fill();
        } else if (kind === 3) {
          g.beginPath();
          g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.9, s, 0);
          g.quadraticCurveTo(0, s * 0.9, -s, 0);
          g.closePath(); g.fill();
        } else {
          g.lineWidth = Math.max(1, s * 0.3);
          g.lineCap = 'round';
          g.beginPath(); g.arc(0, 0, s * 0.9, -0.5, 1.6 + rnd() * 2); g.stroke();
        }
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }

  function drawThread(g, rnd, col, opt) {
    for (var i = 0; i < opt.rings; i++) {
      var t = (i + 0.7) / opt.rings;
      var r = opt.R * Math.pow(t, 0.8);
      var c = col(i);
      g.strokeStyle = c;
      g.globalAlpha = 0.2 + (1 - t) * 0.42;
      g.lineWidth = Math.max(0.7, opt.R * 0.012 * (1 - t * 0.5));
      g.lineCap = 'round';
      g.beginPath();
      var segs = 8;
      for (var j = 0; j <= segs; j++) {
        var a = (j / segs) * opt.span;
        var wob = 1 + Math.sin(j * 2.1 + i) * 0.045 + (rnd() - 0.5) * 0.03;
        var x = Math.sin(a) * r * wob, y = -Math.cos(a) * r * wob;
        if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      // 环上的小结
      var dots = 2 + Math.floor(rnd() * 3);
      for (var k = 0; k < dots; k++) {
        var da = rnd() * opt.span;
        var dx = Math.sin(da) * r, dy = -Math.cos(da) * r;
        g.globalAlpha = 0.75;
        g.beginPath();
        g.arc(dx, dy, opt.R * (0.008 + rnd() * 0.014), 0, 6.2832);
        g.fillStyle = c;
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function drawFractal(g, rnd, col, opt) {
    function branch(x, y, ang, len, w, depth) {
      if (depth <= 0 || len < opt.R * 0.014) return;
      var x2 = x + Math.sin(ang) * len;
      var y2 = y - Math.cos(ang) * len;
      g.strokeStyle = col(opt.rings - Math.min(opt.rings, depth));
      g.globalAlpha = 0.22 + (depth / (opt.rings + 3)) * 0.55;
      g.lineWidth = Math.max(0.5, w);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();

      // 越靠扇形边缘越往外掰，让对称处接得上
      var na = Math.atan2(x2, -y2);
      var push = (na / opt.span - 0.5) * 0.8;

      var kids = rnd() < 0.22 ? 3 : 2;
      for (var i = 0; i < kids; i++) {
        var sign = kids === 3 && i === 2 ? 0 : (i % 2 === 0 ? 1 : -1);
        var spread = 0.4 + rnd() * 0.52;
        branch(x2, y2, ang + sign * spread + push * 0.5, len * (0.63 + rnd() * 0.15), w * 0.67, depth - 1);
      }
    }
    var depth = Math.min(9, opt.rings + 3);
    branch(0, 0, opt.span * (0.28 + rnd() * 0.44), opt.R * 0.34, opt.R * 0.022, depth);
    g.globalAlpha = 1;
  }

  var GEN = { confetti: drawConfetti, thread: drawThread, fractal: drawFractal };

  /* ---------------- 引擎 ---------------- */
  function Engine(canvas) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.seed = 'x';
    this.mode = 'confetti';
    this.p = { sectors: 8, rings: 4, per: 4, hue: 0.08, spread: 0.7, mirror: true, spin: 0.05, glow: 0.7, grain: 0.5 };
    this.raf = null;
    this.angle = 0;
    this.zoom = 1;
    this.grainCv = null;
  }

  Engine.prototype.setCanvas = function (cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
  };

  Engine.prototype.dpr = function () { return Math.min(2, window.devicePixelRatio || 1); };

  Engine.prototype.resize = function () {
    var w = this.cv.clientWidth || 600, h = this.cv.clientHeight || 600;
    var d = this.dpr();
    // 太大了每帧全量重绘会掉帧，钉个上限
    var size = U.clamp(Math.round(Math.min(w, h) * d), 1, 1500);
    this.cv.width = size; this.cv.height = size;
    this.S = size;
    if (this.raf) return;
    this.render();
  };

  Engine.prototype.makeGrain = function () {
    if (this.grainCv) return;
    var s = 128;
    var c = document.createElement('canvas');
    c.width = c.height = s;
    var g = c.getContext('2d');
    var img = g.createImageData(s, s);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 118 + Math.random() * 74;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.grainCv = c;
  };

  Engine.prototype.render = function () {
    var g = this.g, S = this.S;
    if (!S) return;
    var rnd = U.seeded(this.seed + '|' + this.mode);
    var p = this.p;

    // 底
    var bg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.78);
    bg.addColorStop(0, 'hsl(' + (p.hue * 360).toFixed(0) + ',34%,13%)');
    bg.addColorStop(0.55, 'hsl(' + (p.hue * 360).toFixed(0) + ',30%,9%)');
    bg.addColorStop(1, 'hsl(' + (p.hue * 360).toFixed(0) + ',26%,5%)');
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);

    var R = S * 0.46;
    var span = (Math.PI * 2 / p.sectors);
    var col = palette(rnd, p.hue, p.spread);
    var opt = { rings: p.rings, per: p.per, span: span, R: R };
    var gen = GEN[this.mode];

    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(this.angle);
    g.scale(this.zoom, this.zoom);

    var half = p.sectors / 2;
    for (var i = 0; i < half; i++) {
      g.save();
      g.rotate(i * span);
      gen(g, rnd, col, opt);
      if (p.mirror) {
        g.save();
        g.scale(1, -1);
        gen(g, rnd, col, opt);
        g.restore();
      }
      g.restore();
    }
    g.restore();

    // 中心光
    if (p.glow > 0) {
      var gl = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.42);
      gl.addColorStop(0, 'hsla(' + (p.hue * 360).toFixed(0) + ',90%,72%,' + (0.13 * p.glow).toFixed(3) + ')');
      gl.addColorStop(0.45, 'hsla(' + (p.hue * 360).toFixed(0) + ',80%,60%,' + (0.05 * p.glow).toFixed(3) + ')');
      gl.addColorStop(1, 'hsla(0,0%,0%,0)');
      g.fillStyle = gl;
      g.fillRect(0, 0, S, S);
    }

    // 暗角
    var vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.62)');
    g.fillStyle = vg;
    g.fillRect(0, 0, S, S);

    // 颗粒
    if (p.grain > 0) {
      this.makeGrain();
      g.save();
      g.globalAlpha = 0.055 * p.grain;
      g.globalCompositeOperation = 'overlay';
      var pat = g.createPattern(this.grainCv, 'repeat');
      g.fillStyle = pat;
      g.fillRect(0, 0, S, S);
      g.restore();
    }
  };

  Engine.prototype.start = function () {
    var self = this, t0 = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { this.render(); return; }
    var lastZoom = 0;
    function tick(t) {
      if (t0 === null) t0 = t;
      self.angle += self.p.spin * 0.0166;
      self.zoom = 1 + Math.sin(t * 0.00035) * 0.028;
      // 静止的时候没什么好重画的，缩放变化小就跳过这一帧
      if (self.p.spin > 0 || Math.abs(self.zoom - lastZoom) > 0.004) {
        self.render();
        lastZoom = self.zoom;
      }
      self.raf = requestAnimationFrame(tick);
    }
    this.raf = requestAnimationFrame(tick);
  };

  Engine.prototype.stop = function () {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
  };

  /* ---------------- 页面 ---------------- */
  var E = null;
  var autoTimer = null;

  function randomSeed() {
    return Math.random().toString(36).slice(2, 10);
  }

  function mount(root) {
    if (E) { E.stop(); if (P.onResize) window.removeEventListener('resize', P.onResize); }
    clearInterval(autoTimer); autoTimer = null;
    var saved = store.get('kaleido', { mode: 'confetti', p: {}, seeds: [], favs: [], total: 0 });
    if (!saved.p) saved.p = {};
    var P = {
      sectors: saved.p.sectors || 8,
      rings: saved.p.rings || 4,
      per: saved.p.per || 4,
      hue: saved.p.hue === undefined ? 0.08 : saved.p.hue,
      spread: saved.p.spread === undefined ? 0.7 : saved.p.spread,
      mirror: saved.p.mirror === undefined ? true : saved.p.mirror,
      spin: saved.p.spin === undefined ? 0.05 : saved.p.spin,
      glow: saved.p.glow === undefined ? 0.7 : saved.p.glow,
      grain: saved.p.grain === undefined ? 0.5 : saved.p.grain
    };

    E = new Engine(document.createElement('canvas'));
    E.mode = saved.mode || 'confetti';
    E.p = P;
    // 地址里带了种子就用它（#/kaleido?seed=abc123），
    // 这样「同一个种子永远是同一张」就能靠链接分享出去。
    var urlSeed = (MZ.resolveQuery() || {}).seed;
    E.seed = urlSeed || U.pick(Math.random, (saved.seeds && saved.seeds.length ? saved.seeds : ['k' + randomSeed()]));
    E.angle = Math.random() * 6.28;

    function persist() {
      saved.p = P; saved.mode = E.mode;
      saved.total = store.get('kaleidoCount', 0);
      store.set('kaleido', saved);
    }

    root.innerHTML = '';

    var head = MZ.ui.pageHead('kaleido · 02', '万花筒',
      '算法画的。一个种子决定所有形状，同一个种子永远是同一张——所以你可以把喜欢的配方存下来，或者发给未来的自己。',
      el('span', { class: 'pill violet', id: 'k-count', text: '拧过 ' + store.get('kaleidoCount', 0) + ' 次' }));
    root.appendChild(head);

    var wrap = el('div', { class: 'kal-wrap' });
    var cv = el('canvas', {
      class: 'kal-cv', id: 'kal-cv',
      role: 'img',
      'aria-label': '一个由算法画出的万花筒图案，种子 ' + E.seed + '。可以按"导出 PNG"存成图片。'
    });
    wrap.appendChild(cv);
    var seedTag = el('button', {
      class: 'kal-seed mono', type: 'button', title: '点一下换一张',
      onclick: function () { spin(); }
    }, ['#' + E.seed]);
    wrap.appendChild(seedTag);
    // 分享链接：把当前种子放进地址，别人打开看到同一张
    var shareBtn = el('button', {
      class: 'kal-share mono', type: 'button', title: '复制这个种子的链接',
      'aria-label': '复制这个种子的链接',
      onclick: function () {
        var url = location.origin + location.pathname +
                  '#/kaleido?seed=' + encodeURIComponent(E.seed);
        MZ.ui.copyText(url, '谁打开都是这张');
      }
    }, ['🔗 分享这个种子']);
    wrap.appendChild(shareBtn);
    root.appendChild(wrap);

    var toolbar = el('div', { class: 'kal-tools' });
    toolbar.appendChild(el('div', { class: 'seg', role: 'tablist', 'aria-label': '生成器' }));
    var seg = toolbar.firstChild;
    var segBtns = {};
    MODES.forEach(function (m) {
      var b = el('button', {
        class: 'seg-b', type: 'button', role: 'tab', title: m.d,
        onclick: function () {
          E.mode = m.id;
          Object.keys(segBtns).forEach(function (k) { segBtns[k].setAttribute('aria-selected', String(k === m.id)); });
          E.render(); persist();
        }
      }, [m.n]);
      b.setAttribute('aria-selected', String(m.id === E.mode));
      seg.appendChild(b);
      segBtns[m.id] = b;
    });
    toolbar.appendChild(el('span', { class: 'spacer' }));
    toolbar.appendChild(el('button', { class: 'btn sm', type: 'button', onclick: function () { spin(); } }, ['换一张']));
    toolbar.appendChild(el('button', { class: 'btn sm primary', type: 'button', onclick: exportPng }, ['导出 PNG']));
    toolbar.appendChild(el('button', { class: 'btn sm', type: 'button', onclick: fav }, ['⭐ 存下来']));
    root.appendChild(toolbar);

    /* 参数 */
    var panel = el('div', { class: 'grid c2', style: 'margin-top:16px' });
    var c1 = el('div', { class: 'card' });
    c1.appendChild(el('div', { class: 'eyebrow', text: '拧法' }));
    c1.appendChild(slider('对称数', 'sectors', P.sectors, 3, 20, 1, function (v) {
      P.sectors = v; E.p.sectors = v; E.render();
    }, function (v) { return v + ' 份'; }));
    c1.appendChild(slider('有几圈', 'rings', P.rings, 2, 8, 1, function (v) {
      P.rings = v; E.p.rings = v; E.render();
    }));
    c1.appendChild(slider('每圈几个', 'per', P.per, 2, 9, 1, function (v) {
      P.per = v; E.p.per = v; E.render();
    }));
    c1.appendChild(slider('转多快', 'spin', P.spin, 0, 0.3, 0.01, function (v) {
      P.spin = v; E.p.spin = v;
    }, function (v) { return v === 0 ? '不动' : v.toFixed(2); }));
    panel.appendChild(c1);

    var c2 = el('div', { class: 'card' });
    c2.appendChild(el('div', { class: 'eyebrow', text: '颜色与质感' }));
    c2.appendChild(slider('色温', 'hue', P.hue, 0, 0.99, 0.01, function (v) {
      P.hue = v; E.p.hue = v; E.render();
    }, hueName));
    c2.appendChild(slider('圈间色差', 'spread', P.spread, 0, 2, 0.05, function (v) {
      P.spread = v; E.p.spread = v; E.render();
    }, function (v) { return v === 0 ? '一个色' : v < .8 ? '接近' : v < 1.4 ? '分开' : '彩虹'; }));
    c2.appendChild(slider('光晕', 'glow', P.glow, 0, 2, 0.05, function (v) {
      P.glow = v; E.p.glow = v; E.render();
    }, pct));
    c2.appendChild(slider('颗粒', 'grain', P.grain, 0, 1.5, 0.05, function (v) {
      P.grain = v; E.p.grain = v; E.render();
    }, pct));
    c2.appendChild(el('div', { class: 'row between', style: 'margin-top:6px' }, [
      el('span', { class: 'small', text: '镜像' }),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox', checked: P.mirror ? 'checked' : null,
          onchange: function () { P.mirror = this.checked; E.p.mirror = this.checked; E.render(); }
        }),
        el('span', { class: 'track' })
      ])
    ]));
    panel.appendChild(c2);
    root.appendChild(panel);

    /* 收藏 */
    var favBox = el('div', { class: 'card', style: 'margin-top:16px' });
    favBox.appendChild(el('div', { class: 'row between', style: 'margin-bottom:10px' }, [
      el('span', { class: 'eyebrow', style: 'margin:0', text: '存下来的配方' }),
      el('span', { class: 'small muted', text: saved.favs.length + ' 个' })
    ]));
    var favList = el('div', { class: 'fav-list' });
    if (!saved.favs.length) {
      favList.appendChild(el('div', { class: 'empty' }, [
        el('span', { class: 'big', text: '🫙' }),
        '还没有。看到顺眼的就按"存下来"，配方会留在这台设备上。'
      ]));
    } else {
      saved.favs.forEach(function (f, i) {
        favList.appendChild(el('div', { class: 'fav' }, [
          el('button', { class: 'fav-hit', type: 'button', title: '用这个配方', onclick: function () {
            E.seed = f.seed; E.mode = f.mode; E.p = Object.assign(P, f.p);
            Object.keys(segBtns).forEach(function (k) { segBtns[k].setAttribute('aria-selected', String(k === E.mode)); });
            E.render(); syncSliders();
          } }, [el('span', { class: 'fav-sw', style: 'background:' + f.hueColor }),
                 el('span', { class: 'mono small', text: f.seed })]),
          el('span', { class: 'small muted', text: MODES.filter(function (m) { return m.id === f.mode; })[0].n + ' · ' + f.p.sectors + ' 份对称' }),
          MZ.ui.confirmBtn('扔掉', function () {
            saved.favs.splice(i, 1);
            store.set('kaleido', saved);
            mount(root);
            MZ.toast('扔了', '配方没了，图案还在你脑子里', '🗑');
          }, { danger: true, armedLabel: '真扔？' })
        ]));
      });
    }
    favBox.appendChild(favList);
    root.appendChild(favBox);

    /* 挂上 */
    E.setCanvas(cv);
    E.resize();
    E.start();
    E.render();
    P.onResize = onResize;
    window.addEventListener('resize', onResize);
    seedTag.textContent = '#' + E.seed;
    persist();

    // 松手才落盘（同一个 view 会被反复 mount，所以只挂一次）
    if (!root.__mzPersist) {
      root.__mzPersist = function (ev) {
        if (ev.target && ev.target.tagName === 'INPUT') root.__mzPersist.run && root.__mzPersist.run();
      };
      root.addEventListener('change', root.__mzPersist);
    }
    root.__mzPersist.run = persist;

    MZ.bus.on('leave:kaleido', function () {
      E.stop(); window.removeEventListener('resize', onResize);
      clearInterval(autoTimer); autoTimer = null;
    });

    function onResize() { E.resize(); if (E) E.render(); }

    function spin() {
      E.seed = randomSeed();
      E.angle = Math.random() * 6.28;
      if (!saved.seeds.includes(E.seed)) {
        saved.seeds.push(E.seed);
        if (saved.seeds.length > 40) saved.seeds.shift();
      }
      var n = store.get('kaleidoCount', 0) + 1;
      store.set('kaleidoCount', n);
      saved.total = n;
      store.set('kaleido', saved);
      seedTag.textContent = '#' + E.seed;
      E.render();
      var kc = document.getElementById('k-count');
      if (kc) kc.textContent = '拧过 ' + n + ' 次';
    }

    function fav() {
      var f = {
        seed: E.seed, mode: E.mode, p: JSON.parse(JSON.stringify(P)),
        at: Date.now(), hueColor: 'hsl(' + (P.hue * 360).toFixed(0) + ',60%,52%)'
      };
      saved.favs.unshift(f);
      if (saved.favs.length > 30) saved.favs.pop();
      store.set('kaleido', saved);
      MZ.ding(700, .16);
      MZ.toast('存好了', '配方 #' + f.seed + '，在下面那一栏里', '⭐', 3200);
      mount(root);
    }

    function exportPng() {
      var size = 1440;
      var old = E.S;
      E.S = size;
      E.render();
      E.cv.toBlob(function (b) {
        E.S = old;
        E.render();
        if (!b) { MZ.toast('导出失败', '浏览器不给导出权限', '🧯'); return; }
        U.download('万花筒-' + E.mode + '-' + E.seed + '.png', b);
        MZ.grant('kaleido');
        MZ.toast('存成图片了', '1440 × 1440，在你的下载文件夹里', '🖼', 4200);
      }, 'image/png');
    }

    function syncSliders() {
      U.$$('input[data-key]').forEach(function (inp) {
        var k = inp.dataset.key;
        if (P[k] === undefined) return;
        inp.value = P[k];
        var em = inp.parentNode.querySelector('em');
        if (em) em.textContent = fmtFor(k, P[k]);
      });
    }
  }

  function pct(v) { return Math.round(v * 100) + '%'; }

  function hueName(v) {
    var names = ['暗红', '橙', '姜黄', '草绿', '青', '天蓝', '靛', '紫', '洋红', '灰粉'];
    return names[Math.floor(v * names.length) % names.length];
  }

  function fmtFor(k, v) {
    if (k === 'sectors') return v + ' 份';
    if (k === 'per') return v + ' 个';
    if (k === 'spin') return v === 0 ? '不动' : v.toFixed(2);
    if (k === 'hue') return hueName(v);
    if (k === 'spread') return v === 0 ? '一个色' : v < .8 ? '接近' : v < 1.4 ? '分开' : '彩虹';
    if (k === 'glow' || k === 'grain') return pct(v);
    return v;
  }

  function slider(label, key, val, min, max, step, onChange, fmt) {
    var f = el('label', { class: 'field kal-field' }, [
      el('span', { class: 'lab' }, [label, el('em', { text: (fmt || String)(val) })]),
      el('input', {
        type: 'range', min: min, max: max, step: step, value: val,
        'data-key': key, 'aria-label': label,
        oninput: function () {
          var v = parseFloat(this.value);
          this.parentNode.querySelector('em').textContent = (fmt || String)(v);
          onChange(v);
        }
      })
    ]);
    return f;
  }

  MZ.route('kaleido', { title: '万花筒' }, mount);
})();
