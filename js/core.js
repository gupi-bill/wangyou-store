/* ============================================================
   忘忧小卖部 · core.js
   路由 / 存储 / 吐司 / 成就 / 彩蛋
   零依赖。全部塞在 window.MZ 命名空间下。
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 存储 ---------------- */
  var NS = 'moyou:v1:';

  // 空间满了的时候别只弹一次 toast —— 同一轮里可能有几十次写入失败。
  var warnedFull = false;

  function quotaHit() {
    if (warnedFull) return;
    warnedFull = true;
    try {
      if (window.MZ && MZ.toast) {
        MZ.toast('店要放不下了', '浏览器给的空间满了，新的东西存不进去。旧东西都还在。' +
          '去档案室「导出存档」把东西带走，再清一清。', '🧯', 12000);
      }
    } catch (e) { /* 提示失败也别影响主流程 */ }
  }

  function clearWarned() {
    warnedFull = false;
  }

  var store = {
    ok: (function () {
      try {
        var k = NS + '__t';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),

    get: function (key, fallback) {
      if (!this.ok) return fallback;
      try {
        var raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },

    set: function (key, val) {
      if (!this.ok) return false;
      try {
        localStorage.setItem(NS + key, JSON.stringify(val));
        clearWarned();
        return true;
      } catch (e) {
        // 空间满 / 隐私模式 / 配额策略 —— 一定要说出来，不能静默丢数据
        if (e && (e.name === 'QuotaExceededError' ||
                   e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 ||
                   e.code === 1014)) {
          quotaHit();
        } else if (window.MZ && MZ.toast) {
          MZ.toast('存不进去了', '不是空间满，是浏览器不让写。可能是隐私模式。', '😶');
        }
        return false;
      }
    },

    del: function (key) {
      if (!this.ok) return;
      try { localStorage.removeItem(NS + key); } catch (e) {}
    },

    keys: function () {
      if (!this.ok) return [];
      var out = [], pfx = NS;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(pfx) === 0) out.push(k.slice(pfx.length));
        }
      } catch (e) {}
      return out;
    },

    exportAll: function () {
      var bag = {};
      this.keys().forEach(function (k) { bag[k] = store.get(k, null); });
      return { __app: '忘忧小卖部', __version: 1, __at: new Date().toISOString(), data: bag };
    },

    importAll: function (payload) {
      if (!payload || payload.__app !== '忘忧小卖部' || !payload.data) {
        throw new Error('这不像是本店的存盘');
      }
      if (typeof payload.data !== 'object') {
        throw new Error('存盘内容不太对');
      }
      // 先在内存里逐条试写，失败的记下来。
      // 宁可只导进去一部分，也不要把原来好好的数据覆盖成坏的。
      var bag = payload.data;
      var okCount = 0, failed = [];
      Object.keys(bag).forEach(function (k) {
        if (store.set(k, bag[k]) === false) failed.push(k);
        else okCount++;
      });
      store.lastImport = { ok: okCount, failed: failed };
      if (okCount === 0 && failed.length) {
        throw new Error('一条也没导进去，可能是空间满了。先导出备份，再清一清。');
      }
      return okCount;
    },

    wipe: function () {
      this.keys().forEach(function (k) { store.del(k); });
    },

    // 粗略估算还剩多少空间（KB）。用来在丢数据之前提醒，而不是事后。
    freeKB: function () {
      if (!this.ok) return -1;
      try {
        var probe = NS + '__probe';
        var chunk = 'x'.repeat(4096);
        var n = 0;
        for (var i = 0; i < 512; i++) {          // 最多探到 2MB
          localStorage.setItem(probe, chunk);
          n++;
        }
        localStorage.removeItem(probe);
        return n * 4;                            // 至少还能写这么多 KB
      } catch (e) {
        // 写不进去了：至少说明空间已经非常紧
        try { localStorage.removeItem(NS + '__probe'); } catch (e2) {}
        return 0;
      }
    }
  };

  /* ---------------- 小工具 ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function ymd(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function dayIndex(d) {
    d = d || new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }

  function daysBetween(a, b) {
    var x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((y - x) / 86400000);
  }

  /** 稳定的伪随机：同一个 seed 永远给同一个结果 */
  function seeded(seed) {
    var h = 2166136261 >>> 0;
    var s = String(seed);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }

  function shuffle(arr, rnd) {
    var a = arr.slice(), r = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* ---------------- 吐司 ---------------- */
  var toastWrap = null;

  function toast(title, body, icon, ms) {
    if (!toastWrap) {
      toastWrap = el('div', { class: 'toast-wrap', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastWrap);
    }
    var t = el('div', { class: 'toast' }, [
      el('span', { class: 'ic', 'aria-hidden': 'true', text: icon || '✦' }),
      el('div', {}, [
        el('b', { text: title }),
        body ? el('div', { class: 'small muted', text: body }) : null
      ])
    ]);
    toastWrap.appendChild(t);
    var life = ms || 4200;
    var kill = function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    };
    var timer = setTimeout(kill, life);
    t.addEventListener('click', function () { clearTimeout(timer); kill(); });
    while (toastWrap.children.length > 4) toastWrap.removeChild(toastWrap.firstChild);
    return t;
  }

  /* ---------------- 事件总线 ---------------- */
  var bus = (function () {
    var map = {};
    return {
      on: function (n, f) { (map[n] = map[n] || []).push(f); return function () { bus.off(n, f); }; },
      off: function (n, f) { if (map[n]) map[n] = map[n].filter(function (x) { return x !== f; }); },
      emit: function (n, d) { (map[n] || []).slice().forEach(function (f) { try { f(d); } catch (e) { console.warn('[bus]', n, e); } }); }
    };
  })();

  /* ---------------- 成就 ---------------- */
  var BADGES = [
    { id: 'first',   icon: '🚪', name: '推门进来了',  desc: '第一次打开这家店' },
    { id: 'radio',   icon: '📻', name: '深夜听众',    desc: '在电台里循环播放超过 10 分钟' },
    { id: 'kaleido', icon: '🌀', name: '拧麻花的人',  desc: '导出一张万花筒壁纸' },
    { id: 'fate',    icon: '🎰', name: '交给命运',    desc: '把命运老虎机转到 20 次' },
    { id: 'fate5',   icon: '🌟', name: '听劝的人',    desc: '真的去做了一件老虎机让你做的事' },
    { id: 'slack',   icon: '🫠', name: '正式承认',    desc: '在拖延统计里写下第一条记录' },
    { id: 'letter',  icon: '✉️', name: '寄给以后',    desc: '封存第一封给未来的信' },
    { id: 'open',    icon: '📬', name: '拆信的人',    desc: '拆开一封到期的信' },
    { id: 'arch',    icon: '🗄️', name: '偷看档案的人', desc: '翻开隐藏档案室的第 3 页' },
    { id: 'night',   icon: '🌙', name: '睡神',        desc: '在凌晨 2 点到 5 点之间访问' },
    { id: 'all',     icon: '🏮', name: '老主顾',      desc: '把这一页全部点亮' },
    { id: 'return',  icon: '🔁', name: '又来了',      desc: '累计回来 10 次' }
  ];

  var badgeState = store.get('badges', {});

  function hasBadge(id) { return !!badgeState[id]; }

  function grant(id, quiet) {
    if (hasBadge(id)) return false;
    var def = null;
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) def = BADGES[i];
    if (!def) return false;
    badgeState[id] = Date.now();
    store.set('badges', badgeState);
    bus.emit('badge', def);
    if (!quiet) {
      toast(def.icon + ' 解锁 · ' + def.name, def.desc, def.icon, 6000);
      ding(def.icon === '🏮' ? 880 : 660, 0.12);
    }
    return true;
  }

  function badgeList() {
    return BADGES.map(function (b) {
      return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, at: badgeState[b.id] || 0, got: hasBadge(b.id) };
    });
  }

  /* ---------------- 音效（Web Audio 随手两声） ---------------- */
  var actx = null;

  function audio() {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function ding(freq, dur) {
    var c = audio();
    if (!c) return;
    var now = c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * 1.6, now + (dur || .18));
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.10, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || .18) + .18);
    o.connect(g).connect(c.destination);
    o.start(now);
    o.stop(now + (dur || .18) + .25);
  }

  /* ---------------- 暗门（彩蛋） ---------------- */
  var SEEDS = [
    { q: '密码是什么', a: '本店不设密码，只设暗号。' },
    { q: 'zwyou', a: '……你还真试了。' },
    { q: 'moyou', a: '这也只是 transliteration。' },
    { q: '隐藏', a: '往下翻，翻到最底下。' },
    { q: '你叫什么', a: '老板不叫名字，只叫"欸"。' },
    { q: 'hello', a: '你好。灯还亮着就好。' },
    { q: '为什么', a: '不为什么。' },
    { q: '在吗', a: '一直都在。' },
    { q: '123', a: '门牌号而已。' },
    { q: '0', a: '零个好理由。' },
    { q: '不知道', a: '那就对了。' },
    { q: 'qwq', a: '别哭，店里还有纸。' },
    { q: 'tmd', a: '小声点，隔壁睡着呢。' },
    { q: 'zzz', a: '睡着也是一种支持。' }
  ];

  function murmur(q) {
    q = String(q || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return null;
    for (var i = 0; i < SEEDS.length; i++) {
      if (SEEDS[i].q === q) return { hit: true, reply: SEEDS[i].a, seed: SEEDS[i].q };
    }
    var r = seeded('murmur:' + q + ':' + ymd());
    var replies = [
      '本店已收到。信使不在，但东西留下了。',
      '没听懂。不过没关系，我也不懂。',
      '这句话我存在了，也许以后用得上。',
      '嗯。',
      '要是能听懂就好了。',
      '你刚刚说的这个，值两个灯泡。'
    ];
    return { hit: false, reply: pick(r, replies), seed: q };
  }

  function whisper(text) {
    var log = store.get('whispers', []);
    log.unshift({ t: Date.now(), s: String(text).slice(0, 120) });
    store.set('whispers', log.slice(0, 50));
  }

  /* ---------------- 路由 ---------------- */
  var routes = [];
  var current = null;

  function route(name, meta, mount) {
    routes.push({ name: name, meta: meta || {}, mount: mount });
  }

  function resolve() {
    var raw = location.hash.replace(/^#\/?/, '').trim();
    var name = raw.split('?')[0] || 'home';
    return name;
  }

  // 取当前地址的 query，比如 #/kaleido?seed=abc123 → { seed: 'abc123' }
  function resolveQuery() {
    var out = {};
    var raw = location.hash.split('?')[1];
    if (!raw) return out;
    raw.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? '' : kv.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v); }
      catch (e) { out[k] = v; }   // 编码坏了也别炸
    });
    return out;
  }

  function go(name) {
    if (location.hash === '#/' + name) { paint(name); return; }
    location.hash = '#/' + name;
  }

  function paint(force, opts) {
    var name = resolve();
    var found = null;
    for (var i = 0; i < routes.length; i++) if (routes[i].name === name) found = routes[i];
    if (!found) { name = 'lost'; found = null; for (var j = 0; j < routes.length; j++) if (routes[j].name === 'lost') found = routes[j]; }

    var same = (current === name);
    if (same && !force && !(opts && opts.focus)) return;
    if (current && !same) bus.emit('leave:' + current);
    current = name;

    var view = document.getElementById('view-' + name);
    if (view) {
      var all = $$('.view');
      for (var k = 0; k < all.length; k++) all[k].classList.remove('is-on');
      view.classList.add('is-on');
      view.style.animation = 'none';
      void view.offsetWidth;
      view.style.animation = '';
    }

    $$('.nav-links a').forEach(function (a) {
      if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.title = (found && found.meta.title ? found.meta.title + ' · ' : '') + '忘忧小卖部';

    if (found) {
      try { found.mount(view); }
      catch (e) {
        console.error('[mount]', name, e);
        if (view) {
          view.innerHTML = '<div class="card pad-lg center"><div style="font-size:34px">🧯</div>' +
            '<h2 class="h-lg">这台机器今天罢工了</h2><p class="muted small">' + esc(e.message) + '</p>' +
            '<button class="btn" onclick="location.reload()">重新开门</button></div>';
        }
      }
    }

    /* 让读屏和键盘知道"到新货架了" */
    if (view) {
      var h = view.querySelector('h1, h2');
      if (h) {
        if (!h.id) h.id = 'page-title-' + name;
        h.setAttribute('tabindex', '-1');
        h.style.outline = 'none';
        if (!opts || opts.focus !== false) {
          try { h.focus({ preventScroll: true }); } catch (err) { /* 老浏览器 */ }
        }
      }
    }

    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    bus.emit('enter:' + name);
  }

  /* ---------------- 统计回来次数 ---------------- */
  function bumpVisit() {
    var v = store.get('visits', 0) + 1;
    store.set('visits', v);
    var seen = store.get('firstVisit', null);
    if (!seen) store.set('firstVisit', Date.now());
    var last = store.get('lastVisit', null);
    store.set('lastVisit', Date.now());
    if (v >= 2) store.set('returning', true);
    return v;
  }

  function streak() {
    var days = store.get('days', {});
    var d = ymd();
    if (days[d]) return 0;
    var probe = new Date();
    var n = 0;
    for (var i = 0; i < 400; i++) {
      probe.setDate(probe.getDate() - 1);
      if (days[ymd(probe)]) n++;
      else break;
    }
    return n;
  }

  function markToday() {
    var days = store.get('days', {});
    days[ymd()] = (days[ymd()] || 0) + 1;
    store.set('days', days);
  }

  /* ---------------- 每日一句 ---------------- */
  var DAILY = [
    ['你今天已经很努力了', '虽然具体在努力什么，回忆起来有点模糊。'],
    ['慢一点没关系', '反正时间本来也不打算配合你。'],
    ['别把"应该"当成"必须"', '这两个词长得像，脾气完全不同。'],
    ['先睡吧', '明天的事，明天会有一个更困的你去处理。'],
    ['你已经做得比昨天好了', '昨天那个版本的你甚至不敢往下翻。'],
    ['有些事拖着不叫懒', '叫战略性候场。'],
    ['喝口水', '这不是废话，是你今天能做的最好的事之一。'],
    ['窗外如果没有风景', '那就看看窗框。'],
    ['不必向谁证明什么', '包括向你自己。'],
    ['你不需要有意义地活着', '活着本身就已经是全部的意义了。'],
    ['今天允许自己什么都不做', '这不是浪费，这是充电。'],
    ['那个想法会消失的', '就像它来的时候一样突然。'],
    ['有人在等你', '就算ta自己也不知道。'],
    ['你不是拖延', '你只是有一件很重的东西拿不动，先歇会儿。'],
    ['记得抬头', '你已经低着很久了。'],
    ['就算明天世界末日', '你也还是会想吃晚饭。'],
    ['把"应该做完"改成"做了"或"没做"', '中间那道选择题最耗人。'],
    ['有些门推不开就绕路', '绕路不是失败，是地图没画这条线。']
  ];

  function dailyPair(offset) {
    var d = new Date();
    d.setDate(d.getDate() + (offset || 0));
    var r = seeded('daily:' + ymd(d));
    return pick(r, DAILY);
  }

  /* ---------------- 时钟问候 ---------------- */
  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return '这个点还醒着，是有心事还是没心';
    if (h < 9) return '早上好，先别看手机';
    if (h < 12) return '上午好，今天才刚开始';
    if (h < 14) return '中午好，吃了吗';
    if (h < 18) return '下午好，撑住';
    if (h < 22) return '晚上好，今天辛苦了';
    if (h < 25) return '深夜好，灯给你留着';
    return '深夜好，灯给你留着';
  }

  /* ---------------- 下载 ---------------- */
  function download(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
  }

  function downloadText(filename, text, mime) {
    download(filename, new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }));
  }

  /* ---------------- 导出 ---------------- */
  window.MZ = {
    store: store, bus: bus, toast: toast, ding: ding, audio: audio,
    grant: grant, hasBadge: hasBadge, badgeList: badgeList, BADGES: BADGES,
    route: route, go: go, paint: paint, resolve: resolve, resolveQuery: resolveQuery,
    bumpVisit: bumpVisit, streak: streak, markToday: markToday,
    dailyPair: dailyPair, greeting: greeting, murmur: murmur, whisper: whisper,
    util: {
      clamp: clamp, lerp: lerp, pad2: pad2, ymd: ymd, dayIndex: dayIndex,
      daysBetween: daysBetween, seeded: seeded, pick: pick, shuffle: shuffle,
      esc: esc, $: $, $$: $$, el: el,
      download: download, downloadText: downloadText
    },
    ns: NS
  };

  window.MZ_NS = NS;

  /* ---- 静默模式：?still 关掉所有动画与过渡。截图、录屏、打印时用。 ---- */
  try {
    if (/(^|[?&])still\b/.test(location.search)) {
      document.documentElement.classList.add('no-anim');
    }
  } catch (e) {}
})();
