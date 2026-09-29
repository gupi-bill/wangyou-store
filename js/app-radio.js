/* ============================================================
   app-radio.js · 深夜电台
   所有声音都是 Web Audio 实时算出来的。
   没有 mp3，没有 wav，一个字节都没下载。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el, $ = U.$;

  /* ---------------- 噪声源 ---------------- */
  function noiseBuffer(ctx, kind, secs) {
    var len = Math.floor(ctx.sampleRate * (secs || 4));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    if (kind === 'brown') {
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    } else if (kind === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var j = 0; j < len; j++) {
        var wn = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + wn * 0.0555179;
        b1 = 0.99332 * b1 + wn * 0.0750759;
        b2 = 0.96900 * b2 + wn * 0.1538520;
        b3 = 0.86650 * b3 + wn * 0.3104856;
        b4 = 0.55000 * b4 + wn * 0.5329522;
        b5 = -0.7616 * b5 - wn * 0.0168980;
        d[j] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * 0.5362) * 0.11;
        b6 = wn * 0.115926;
      }
    } else {
      for (var k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /* ---------------- 场景工厂 ---------------- */
  function Scene(name) {
    this.name = name;
    this.nodes = [];
    this.timers = [];
    this.dead = false;
  }
  Scene.prototype.keep = function (n) { this.nodes.push(n); return n; };
  Scene.prototype.later = function (ms, fn) {
    var self = this;
    var t = setTimeout(function () {
      if (self.dead) return;
      fn();
    }, ms);
    this.timers.push(t);
    return t;
  };
  Scene.prototype.every = function (min, max, fn) {
    var self = this;
    function loop() {
      if (self.dead) return;
      fn();
      self.later(min + Math.random() * (max - min), loop);
    }
    loop();
  };
  Scene.prototype.stop = function () {
    this.dead = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.nodes.forEach(function (n) {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    this.nodes = [];
  };

  /* 常用零件 */
  function src(ctx, buf) {
    var s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true;
    return s;
  }
  function gain(ctx, v) { var g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(ctx, type, freq, q) {
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q) f.Q.value = q;
    return f;
  }
  function lfo(ctx, freq, depth, target, base) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    var g = gain(ctx, depth);
    o.connect(g).connect(target);
    if (base !== undefined) target.value = base;
    o.start();
    return { osc: o, gain: g };
  }

  /* 一次性的小爆点：噪声脉冲 */
  function burst(ctx, dest, opt) {
    opt = opt || {};
    var t = ctx.currentTime + (opt.delay || 0);
    var s = ctx.createBufferSource();
    s.buffer = opt.buffer;
    s.playbackRate.value = opt.rate || (0.7 + Math.random() * 0.9);
    var f = filt(ctx, opt.type || 'bandpass', opt.freq || 2000, opt.q || 1.2);
    var g = gain(ctx, 0);
    s.connect(f).connect(g).connect(dest);
    var dur = opt.dur || 0.05;
    var amp = (opt.amp === undefined ? 0.3 : opt.amp);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t);
    s.stop(t + dur + 0.03);
    return s;
  }

  /* ---------------- 六个场景 ---------------- */
  var MAKERS = {

    rain: function (ctx, out) {
      var sc = new Scene('rain');
      var white = noiseBuffer(ctx, 'white', 4);
      var body = src(ctx, white);
      var lp = filt(ctx, 'lowpass', 1400, 0.6);
      var bg = gain(ctx, 0.30);
      body.connect(lp).connect(bg).connect(out);
      body.start();
      sc.keep(body, lp, bg);

      // 风：慢慢推着雨大一点小一点
      lfo(ctx, 0.045, 500, lp.frequency, 1500);
      lfo(ctx, 0.031, 0.10, bg.gain, 0.30);

      // 细雨点
      sc.every(0.05, 0.16, function () {
        burst(ctx, out, {
          buffer: white, freq: 2600 + Math.random() * 3600, q: 1.6,
          amp: 0.03 + Math.random() * 0.10, dur: 0.03 + Math.random() * 0.05
        });
      });
      // 大雨点打在窗上
      sc.every(0.7, 2.6, function () {
        burst(ctx, out, {
          buffer: white, freq: 700 + Math.random() * 900, q: 2.4,
          amp: 0.05 + Math.random() * 0.11, dur: 0.09 + Math.random() * 0.12
        });
      });
      return sc;
    },

    fire: function (ctx, out) {
      var sc = new Scene('fire');
      var white = noiseBuffer(ctx, 'white', 4);
      var brown = noiseBuffer(ctx, 'brown', 4);

      var roar = src(ctx, brown);
      var lp = filt(ctx, 'lowpass', 520, 0.8);
      var rg = gain(ctx, 0.42);
      roar.connect(lp).connect(rg).connect(out);
      roar.start();
      sc.keep(roar, lp, rg);
      lfo(ctx, 0.07, 0.11, rg.gain, 0.42);

      // 爆裂
      sc.every(0.05, 0.5, function () {
        var big = Math.random() < 0.06;
        burst(ctx, out, {
          buffer: white,
          freq: big ? 900 + Math.random() * 1400 : 2200 + Math.random() * 4200,
          q: big ? 3 : 1.4,
          amp: big ? 0.16 + Math.random() * 0.20 : 0.02 + Math.random() * 0.09,
          dur: big ? 0.05 + Math.random() * 0.1 : 0.012 + Math.random() * 0.035
        });
      });
      return sc;
    },

    tv: function (ctx, out) {
      var sc = new Scene('tv');
      var white = noiseBuffer(ctx, 'white', 4);

      var hiss = src(ctx, white);
      var hp = filt(ctx, 'highpass', 1400, 0.7);
      var hg = gain(ctx, 0.14);
      hiss.connect(hp).connect(hg).connect(out);
      hiss.start();
      sc.keep(hiss, hp, hg);

      // CRT 15.7kHz 行频的啸叫
      var carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = 15734;
      var cg = gain(ctx, 0.006);
      carrier.connect(cg).connect(out);
      carrier.start();
      sc.keep(carrier, cg);

      // 噼啪静电
      sc.every(0.04, 0.3, function () {
        burst(ctx, out, {
          buffer: white, freq: 3000 + Math.random() * 6000, q: 0.9,
          amp: 0.03 + Math.random() * 0.14, dur: 0.01 + Math.random() * 0.03
        });
      });

      // 信号不稳：偶尔整段失真
      sc.every(9, 26, function () {
        var t0 = ctx.currentTime;
        var depth = 0.5 + Math.random() * 0.45;
        hg.gain.cancelScheduledValues(t0);
        hg.gain.setValueAtTime(hg.gain.value, t0);
        hg.gain.linearRampToValueAtTime(0.14 * depth, t0 + 0.08);
        hg.gain.linearRampToValueAtTime(0.14, t0 + 0.5 + Math.random());
        for (var i = 0; i < 4; i++) {
          sc.later(200 + i * 180, function () {
            if (sc.dead) return;
            burst(ctx, out, { buffer: white, freq: 800 + Math.random() * 3000, q: .7, amp: 0.16, dur: 0.06 });
          });
        }
      });
      return sc;
    },

    cafe: function (ctx, out) {
      var sc = new Scene('cafe');
      var white = noiseBuffer(ctx, 'white', 4);
      var brown = noiseBuffer(ctx, 'brown', 4);

      // 房间底噪
      var room = src(ctx, brown);
      var rlp = filt(ctx, 'lowpass', 620, 0.7);
      var rg = gain(ctx, 0.30);
      room.connect(rlp).connect(rg).connect(out);
      room.start();
      sc.keep(room, rlp, rg);

      // 人声嘈杂：几层不同速率的带通噪声，中心频率互相漂移
      [340, 520, 780, 1150].forEach(function (f, i) {
        var s = src(ctx, white);
        var bp = filt(ctx, 'bandpass', f, 2.4);
        var g = gain(ctx, 0.05 / (i + 1) + 0.03);
        s.connect(bp).connect(g).connect(out);
        s.start();
        sc.keep(s, bp, g);
        lfo(ctx, 0.05 + i * 0.021, f * 0.45, bp.frequency, f);
        lfo(ctx, 0.033 + i * 0.017, 0.035, g.gain, g.gain.value);
      });

      // 杯碟、椅子、笑声的碎片
      sc.every(0.8, 3.2, function () {
        var r = Math.random();
        if (r < 0.4) {
          burst(ctx, out, { buffer: white, freq: 3800 + Math.random() * 3000, q: 6, amp: 0.05 + Math.random() * .05, dur: 0.09 });
        } else if (r < 0.7) {
          burst(ctx, out, { buffer: white, freq: 900 + Math.random() * 700, q: 2, amp: 0.03 + Math.random() * .05, dur: 0.16 });
        } else {
          burst(ctx, out, { buffer: white, freq: 1500 + Math.random() * 1200, q: 3.5, amp: 0.04, dur: 0.3 });
        }
      });
      return sc;
    },

    subway: function (ctx, out) {
      var sc = new Scene('subway');
      var white = noiseBuffer(ctx, 'white', 4);
      var brown = noiseBuffer(ctx, 'brown', 4);

      var rumble = src(ctx, brown);
      var rlp = filt(ctx, 'lowpass', 220, 1.1);
      var rg = gain(ctx, 0.55);
      rumble.connect(rlp).connect(rg).connect(out);
      rumble.start();
      sc.keep(rumble, rlp, rg);
      lfo(ctx, 0.12, 0.14, rg.gain, 0.55);

      // 隧道里的风
      var wind = src(ctx, white);
      var wbp = filt(ctx, 'bandpass', 480, 0.9);
      var wg = gain(ctx, 0.10);
      wind.connect(wbp).connect(wg).connect(out);
      wind.start();
      sc.keep(wind, wbp, wg);
      lfo(ctx, 0.09, 0.06, wg.gain, 0.10);
      lfo(ctx, 0.14, 200, wbp.frequency, 480);

      // 哐当
      function clack() {
        if (sc.dead) return;
        var t0 = ctx.currentTime;
        for (var i = 0; i < 2; i++) {
          (function (k) {
            var o = ctx.createOscillator();
            o.type = 'triangle';
            var g = gain(ctx, 0);
            o.frequency.setValueAtTime(150, t0 + k * 0.13);
            o.frequency.exponentialRampToValueAtTime(48, t0 + k * 0.13 + 0.16);
            o.connect(g).connect(out);
            g.gain.setValueAtTime(0, t0 + k * 0.13);
            g.gain.linearRampToValueAtTime(0.30, t0 + k * 0.13 + 0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.13 + 0.30);
            o.start(t0 + k * 0.13);
            o.stop(t0 + k * 0.13 + 0.4);
            burst(ctx, out, { buffer: white, freq: 1400, q: 1.6, amp: 0.12, dur: 0.12, delay: k * 0.13 });
          })(i);
        }
        sc.later(3600 + Math.random() * 2600, clack);
      }
      sc.later(500, clack);
      return sc;
    },

    sea: function (ctx, out) {
      var sc = new Scene('sea');
      var white = noiseBuffer(ctx, 'white', 5);

      var body = src(ctx, white);
      var lp = filt(ctx, 'lowpass', 900, 0.8);
      var g = gain(ctx, 0.10);
      body.connect(lp).connect(g).connect(out);
      body.start();
      sc.keep(body, lp, g);

      // 涨潮：增益和亮度一起推
      lfo(ctx, 0.055, 0.20, g.gain, 0.16);
      lfo(ctx, 0.055, 700, lp.frequency, 1000);
      lfo(ctx, 0.041, 0.09, g.gain, 0.14);

      // 浪打在沙上的"沙沙"
      sc.every(0.9, 2.2, function () {
        var t0 = ctx.currentTime;
        burst(ctx, out, { buffer: white, freq: 3000 + Math.random() * 3000, q: 0.7, amp: 0.05 + Math.random() * .06, dur: 0.5 + Math.random() * .8 });
      });
      return sc;
    }
  };

  var SCENES = [
    { id: 'rain',   name: '下雨',   ic: '🌧', desc: '窗玻璃上的那种，闷闷的',        tip: '适合不想说话的时候' },
    { id: 'fire',   name: '篝火',   ic: '🔥', desc: '柴烧到中段，偶尔崩一下',        tip: '适合发呆' },
    { id: 'tv',     name: '老电视', ic: '📺', desc: '没有节目，只有雪花',            tip: '适合凌晨三点' },
    { id: 'cafe',   name: '咖啡馆', ic: '☕', desc: '人声、杯子、没人注意你',        tip: '适合一个人做自己的事' },
    { id: 'subway', name: '末班地铁', ic: '🚇', desc: '隧道风声，和规律的哐当',     tip: '适合把一天交出去' },
    { id: 'sea',    name: '海',     ic: '🌊', desc: '涨潮，退潮，再涨',              tip: '适合什么都不解决' }
  ];

  /* ---------------- 播放器状态 ---------------- */
  var P = {
    ctx: null, master: null, analyser: null, scene: null, id: null,
    vol: store.get('radioVol', 0.55), ticking: false, sec: 0, timer: null,
    visRaf: null, nodes: null
  };

  function ensure() {
    if (P.ctx) {
      if (P.ctx.state === 'suspended') P.ctx.resume();
      return P.ctx;
    }
    var ctx = MZ.audio();
    if (!ctx) return null;
    P.ctx = ctx;
    P.master = gain(ctx, 0);
    P.analyser = ctx.createAnalyser();
    P.analyser.fftSize = 512;
    P.analyser.smoothingTimeConstant = 0.82;
    P.master.connect(P.analyser);
    P.analyser.connect(ctx.destination);
    P.sec = 0;
    return ctx;
  }

  function fadeIn(ms) {
    var t = P.ctx.currentTime;
    P.master.gain.cancelScheduledValues(t);
    P.master.gain.setValueAtTime(P.master.gain.value, t);
    P.master.gain.linearRampToValueAtTime(P.vol, t + (ms || 1.6));
  }

  function fadeOut(ms, then) {
    if (!P.ctx) { then && then(); return; }
    var t = P.ctx.currentTime;
    P.master.gain.cancelScheduledValues(t);
    P.master.gain.setValueAtTime(P.master.gain.value, t);
    P.master.gain.linearRampToValueAtTime(0.0001, t + (ms || 0.9));
    setTimeout(function () { then && then(); }, (ms || 0.9) * 1000 + 30);
  }

  function play(id) {
    var ctx = ensure();
    if (!ctx) { MZ.toast('这浏览器不肯出声', 'Web Audio 不可用', '🔇'); return; }
    if (P.id === id) { stop(); return; }
    var old = P.scene;
    var go = function () {
      P.scene = MAKERS[id](ctx, P.master);
      P.id = id;
      fadeIn(2.0);
      startClock();
      paint();
      var sc = null;
      SCENES.forEach(function (s) { if (s.id === id) sc = s; });
      MZ.toast('正在播放 · ' + (sc ? sc.name : ''), sc ? sc.tip : '', sc ? sc.ic : '📻', 3000);
    };
    if (old) { fadeOut(0.8, function () { old.stop(); go(); }); }
    else { go(); }
  }

  function stop() {
    if (!P.id) return;
    var sc = P.scene, id = P.id;
    P.id = null; P.scene = null;
    stopClock();
    fadeOut(0.7, function () { if (sc) sc.stop(); });
    paint();
  }

  function startClock() {
    stopClock();
    P.timer = setInterval(function () {
      P.sec += 1;
      var total = store.get('radioSec', 0) + 1;
      if (P.sec % 5 === 0) store.set('radioSec', total);
      var t = $('#radio-time');
      if (t) t.textContent = fmt(P.sec);
      var lp = $('#radio-life');
      if (lp) lp.textContent = fmt(Math.floor(total / 60));
      var rf = $('#rf-time');
      if (rf) rf.textContent = fmt(P.sec);
      if (total >= 600) MZ.grant('radio');
      if (P.sec % 30 === 0) store.set('radioSec', total);
    }, 1000);
  }

  function stopClock() {
    if (P.timer) { clearInterval(P.timer); P.timer = null; }
    if (P.scene) P.scene.dead = false;
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + U.pad2(m) : m) + ':' + U.pad2(x);
  }

  /* ---------------- 整点报时 ---------------- */
  function chime() {
    if (!P.ctx || !P.id) return;
    var ctx = P.ctx, t0 = ctx.currentTime;
    [0, 0.9, 1.8].forEach(function (d, i) {
      [1, 2.02, 3.01, 4.7].forEach(function (h, k) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 196 * h * (i === 0 ? 1 : 1.5);
        var t = t0 + d;
        var amp = 0.09 / (k + 1) * (i === 0 ? 1 : 0.55);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / (k * 0.4 + 1));
        o.connect(g).connect(P.master);
        o.start(t); o.stop(t + 3);
      });
    });
  }

  var hourWatch = setInterval(function () {
    if (!store.get('radioChime', false) || !P.id) return;
    var d = new Date();
    if (d.getMinutes() === 0 && d.getSeconds() < 3) {
      chime();
      MZ.toast('🕰 ' + d.getHours() + ' 点整', '钟自己响了一下', '🕰', 5000);
    }
  }, 1000);

  /* ---------------- 切到后台就小声点 ---------------- */
  var wasHidden = false;
  document.addEventListener('visibilitychange', function () {
    if (!P.ctx || !P.master) return;
    var t = P.ctx.currentTime;
    if (document.hidden) {
      wasHidden = P.master.gain.value > 0.001;
      if (wasHidden) P.master.gain.setTargetAtTime(0.0001, t, 0.25);
    } else if (wasHidden && P.id) {
      P.master.gain.setTargetAtTime(P.vol, t, 0.4);
    }
  });

  /* ---------------- 还在响的小浮标 ---------------- */
  function floatBar() {
    var bar = document.getElementById('radio-float');
    if (P.id && MZ.resolve() !== 'radio') {
      if (!bar) {
        bar = el('div', { class: 'radio-float', id: 'radio-float' }, [
          el('span', { class: 'rf-ic', text: '📻' }),
          el('span', { class: 'rf-t', id: 'rf-title' }),
          el('span', { class: 'rf-time mono', id: 'rf-time', text: '0:00' })
        ]);
        bar.addEventListener('click', function () {
          if (window.innerWidth < 720) MZ.go('radio');
          else { stop(); }
        });
        document.body.appendChild(bar);
      }
      document.getElementById('rf-title').textContent = sceneName();
      var tt = document.getElementById('rf-time');
      if (tt) tt.textContent = fmt(P.sec);
    } else if (bar) {
      bar.remove();
    }
  }

  function sceneName() {
    var n = '';
    SCENES.forEach(function (s) { if (s.id === P.id) n = s.name; });
    return n;
  }

  MZ.bus.on('enter:radio', floatBar);
  MZ.bus.on('leave:radio', floatBar);

  /* ---------------- 页面 ---------------- */
  var ctx2d = null, raf = null;

  function drawVis() {
    if (!P.analyser) return;
    var c = ctx2d;
    if (!c) return;
    var w = c.clientWidth, h = c.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr; c.height = h * dpr;
    }
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    var N = 64;
    var data = new Uint8Array(P.analyser.frequencyBinCount);
    P.analyser.getByteFrequencyData(data);

    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * 0.34;

    for (var i = 0; i < N; i++) {
      var idx = Math.floor(Math.pow(i / N, 1.7) * (data.length * 0.55));
      var v = data[idx] / 255;
      var a = (i / N) * Math.PI * 2 - Math.PI / 2;
      var len = 4 + v * R * 0.85;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
      g.strokeStyle = 'hsla(' + (28 + v * 26) + ', ' + (60 + v * 25) + '%, ' + (52 + v * 30) + '%, ' + (0.22 + v * 0.7) + ')';
      g.lineWidth = 1.4 + v * 1.8;
      g.lineCap = 'round';
      g.stroke();
    }

    // 中心的一圈
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(242,236,225,.12)';
    g.lineWidth = 1;
    g.stroke();

    raf = requestAnimationFrame(drawVis);
  }

  function mount(root) {
    var life = Math.floor(store.get('radioSec', 0) / 60);
    root.innerHTML = '';

    root.appendChild(MZ.ui.pageHead('radio · 01', '深夜电台',
      '六种环境音，全部由振荡器和噪声实时算出来。没有音频文件，所以加载是零秒，而且永远不会卡。',
      el('span', { class: 'pill lamp', text: '累计已听 ' + fmt(life === 0 ? 0 : life * 60) })));

    /* 可视化 + 场景 */
    var stage = el('div', { class: 'card stage' });
    var cv = el('canvas', { class: 'vis', 'aria-hidden': 'true' });
    stage.appendChild(cv);
    var overlay = el('div', { class: 'stage-mid' }, [
      el('div', { class: 'stage-ic', text: '📻' }),
      el('div', { class: 'stage-t mono', id: 'radio-time', text: '0:00' }),
      el('div', { class: 'stage-l small muted', text: '按一下就能吵起来' })
    ]);
    stage.appendChild(overlay);
    root.appendChild(stage);

    var grid = el('div', { class: 'grid c3', style: 'margin-top:16px' });
    var btns = {};
    SCENES.forEach(function (s) {
      var b = el('button', { class: 'chan', type: 'button', 'data-id': s.id }, [
        el('span', { class: 'chan-ic', text: s.ic }),
        el('span', { class: 'chan-b' }, [
          el('span', { class: 'chan-n', text: s.name }),
          el('span', { class: 'chan-d', text: s.desc })
        ]),
        el('span', { class: 'chan-tip', text: s.tip })
      ]);
      b.addEventListener('click', function () { play(s.id); });
      grid.appendChild(b);
      btns[s.id] = b;
    });
    root.appendChild(grid);

    /* 控制条 */
    var ctl = el('div', { class: 'card radio-ctl', style: 'margin-top:16px' });

    var volRow = el('label', { class: 'field', style: 'margin:0' }, [
      el('span', { class: 'lab' }, ['音量', el('em', { id: 'radio-vol-v', text: Math.round(P.vol * 100) + '%' })]),
      el('input', {
        type: 'range', min: '0', max: '100', value: String(Math.round(P.vol * 100)),
        class: 'vol', 'aria-label': '音量',
        oninput: function () {
          P.vol = this.value / 100;
          this.parentNode.querySelector('em').textContent = this.value + '%';
          store.set('radioVol', P.vol);
          if (P.ctx && P.id) {
            var t = P.ctx.currentTime;
            P.master.gain.cancelScheduledValues(t);
            P.master.gain.setTargetAtTime(P.vol, t, 0.08);
          }
        }
      })
    ]);
    ctl.appendChild(volRow);

    var row = el('div', { class: 'row', style: 'margin-top:14px' });
    row.appendChild(el('button', { class: 'btn primary', id: 'radio-play', onclick: function () {
      if (P.id) stop(); else play(U.pick(Math.random, SCENES).id);
    } }, [el('span', { id: 'radio-play-ic', text: '▶' }), el('span', { id: 'radio-play-t', text: '随便放一个' })]));

    row.appendChild(el('button', { class: 'btn', id: 'radio-shuffle', onclick: function () {
      var pool = SCENES.filter(function (s) { return s.id !== P.id; });
      play(U.pick(Math.random, pool).id);
    } }, ['换一个']));

    row.appendChild(el('span', { class: 'spacer' }));
    row.appendChild(el('span', { class: 'small muted mono', text: '累计收听 ' }), el('span', { class: 'mono', id: 'radio-life', text: fmt(life * 60) }));
    ctl.appendChild(row);

    var chimeRow = el('div', { class: 'row between', style: 'margin-top:18px;padding-top:16px;border-top:1px dashed var(--line)' }, [
      el('div', {}, [
        el('div', { style: 'font-size:14px', text: '整点报时' }),
        el('div', { class: 'small muted', text: '整点时，店里会自己敲一下钟。只在播放中生效。' })
      ]),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox', checked: store.get('radioChime', false) ? 'checked' : null,
          'aria-label': '整点报时',
          onchange: function () {
            store.set('radioChime', this.checked);
            MZ.toast(this.checked ? '钟会响的' : '钟不响了', '', '🕰', 2400);
            if (this.checked) MZ.ding(392, .3);
          }
        }),
        el('span', { class: 'track' })
      ])
    ]);
    ctl.appendChild(chimeRow);

    root.appendChild(ctl);

    /* 使用提示 */
    root.appendChild(el('div', { class: 'card', style: 'margin-top:16px' }, [
      el('div', { class: 'eyebrow', text: '说明' }),
      el('ul', { class: 'terms' }, [
        el('li', { text: '声音要等你点一下才开始——这是浏览器的规矩，不是这里矫情。' }),
        el('li', { text: '切到别的页面会继续响，右下角有个小牌子可以叫它停。' }),
        el('li', { text: '切到别的标签页会自动小声，回来了再大声。' }),
        el('li', { text: '耳机用户请先摘下一只耳朵，试试漏掉的那一半。' })
      ])
    ]));

    /* 怎么做的 */
    root.appendChild(howCard());

    ctx2d = cv;
    bindPaint(btns, overlay);
    if (P.id) drawVis();
  }

  var RECIPE = {
    rain:   '白噪声过一个低通当雨幕，两个不同周期的低频振荡推着滤波器的截止频率和音量一起起伏——风就是这么来的。雨点是随机短促的带通噪声脉冲，另有少量更低沉的"砸在窗上"的重击。',
    fire:   '布朗噪声打底（白噪声积分，所以低频更重），0.07Hz 的起伏当柴火的呼吸。爆裂是几十毫秒的高通噪声脉冲，音量随机，偶尔来一发大的。',
    tv:     '高频嘶声加一列 15734Hz 的正弦——那是 CRT 显像管的真实行频，你能听见但说不出是什么。每隔十几秒整段信号被压低，模拟信号丢失。',
    cafe:   '四层不同速率漂移的带通噪声叠在一起，人声嘈杂的错觉就是这么来的。杯子、椅子、笑声是另外撒的短噪声。',
    subway: '极低通的布朗噪声当隧道轰鸣，周期性下滑的三角波当哐当——每 3 到 6 秒一次，车轮压过接缝的间隔本来就不规则。',
    sea:    '两条周期不同的低频振荡，一条推音量一条推滤波器亮度，合起来就是涨潮和退潮。浪打上沙滩是那段更长的沙沙噪声。'
  };

  function howCard() {
    var d = el('details', { class: 'how' });
    d.appendChild(el('summary', { class: 'small', text: '这声音是怎么来的？（好奇的人才看）' }));
    var body = el('div', { class: 'how-body' });
    body.appendChild(el('p', { class: 'small muted', text: '没有一个字节是下载来的。下面每一句都是真的：' }));
    SCENES.forEach(function (s) {
      body.appendChild(el('div', { class: 'how-row' }, [
        el('span', { class: 'how-ic', text: s.ic }),
        el('span', { class: 'how-n', text: s.n }),
        el('span', { class: 'how-t small', text: RECIPE[s.id] })
      ]));
    });
    d.appendChild(body);
    return d;
  }

  function bindPaint(btns, overlay) {
    P.nodes = { btns: btns, overlay: overlay };
    paint();
  }

  function paint() {
    if (!P.nodes) return;
    Object.keys(P.nodes.btns).forEach(function (id) {
      var b = P.nodes.btns[id];
      if (id === P.id) b.classList.add('on');
      else b.classList.remove('on');
    });
    var ic = $('#radio-play-ic'), tt = $('#radio-play-t');
    if (ic && tt) {
      if (P.id) { ic.textContent = '⏸'; tt.textContent = '停掉'; }
      else { ic.textContent = '▶'; tt.textContent = '随便放一个'; }
    }
    if (P.nodes.overlay) {
      var s = null;
      SCENES.forEach(function (x) { if (x.id === P.id) s = x; });
      P.nodes.overlay.classList.toggle('on', !!P.id);
      P.nodes.overlay.querySelector('.stage-ic').textContent = s ? s.ic : '📻';
      P.nodes.overlay.querySelector('.stage-l').textContent = s ? s.tip : '按一下就能吵起来';
    }
    floatBar();
    if (P.id) { if (!raf) drawVis(); }
    else if (raf) { cancelAnimationFrame(raf); raf = null; if (ctx2d) { var g = ctx2d.getContext('2d'); g && g.clearRect(0, 0, ctx2d.width, ctx2d.height); } }
  }

  /* 离开页面不停止播放，但停掉可视化 */
  MZ.bus.on('enter:radio', function () { if (P.id && !raf) drawVis(); });
  MZ.bus.on('leave:radio', function () { if (raf) { cancelAnimationFrame(raf); raf = null; } });

  /* 关标签页前把时长落盘 */
  window.addEventListener('pagehide', function () {
    store.set('radioSec', store.get('radioSec', 0) + P.sec);
    P.sec = 0;
  });

  MZ.route('radio', { title: '深夜电台' }, mount);
})();
