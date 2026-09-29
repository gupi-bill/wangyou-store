/* ============================================================
   app-home.js · 门口
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var SHELF = [
    { r: 'radio',   ic: '📻', n: '深夜电台',   d: '六种噪音，实时合成，一个文件都没下载',      tone: 'lamp'   },
    { r: 'kaleido', ic: '🌀', n: '万花筒',     d: '把图案拧成圆的，导出成壁纸',              tone: 'violet' },
    { r: 'fate',    ic: '🎰', n: '命运老虎机', d: '决定你今天该干什么。不保证有帮助',        tone: 'mint'   },
    { r: 'slack',   ic: '🫠', n: '拖延统计',   d: '诚实地记下你把时间浪费在哪儿了',        tone: 'rose'   },
    { r: 'letter',  ic: '✉️', n: '给未来写信', d: '写给一个月后的自己，日期不到不许拆',    tone: 'lamp'   },
    { r: 'archive', ic: '🗄️', n: '档案室',     d: '你的痕迹，和一些不该被点开的东西',      tone: 'violet' }
  ];

  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function shelfCard(s) {
    return el('a', { class: 'shelf-card', href: '#/' + s.r }, [
      el('span', { class: 'shelf-ic', 'aria-hidden': 'true', text: s.ic }),
      el('span', { class: 'shelf-body' }, [
        el('span', { class: 'shelf-n', text: s.n }),
        el('span', { class: 'shelf-d', text: s.d })
      ]),
      el('span', { class: 'shelf-go', 'aria-hidden': 'true', text: '→' })
    ]);
  }

  function dateLine() {
    var d = new Date();
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 星期' + WEEK[d.getDay()];
  }

  var homeOff = null;

  var BOSS_NOTES = [
    '灯泡换过了，还是原来那颗。',
    '今天不进货了，柜台空着也挺好。',
    '有人在门口站着，没进来。没关系。',
    '咖啡机坏了第三天了。没修。',
    '打烊时间是明天，但每天都会忘。',
    '账本在第三页，别翻。',
    '外面在下雨。真的在查。',
    '如果有人问，就说没看见我。',
    '今天的灯比昨天暗一点，可能是你看久了。',
    '不卖的东西也摆出来，比较好看。'
  ];

  function signCard(dayCount) {
    var now = new Date();
    var box = el('aside', { class: 'sign-card' });
    var late = now.getHours() >= 1 && now.getHours() < 5;
    box.appendChild(el('div', { class: 'sign-top' }, [
      el('span', { class: 'status-lamp' + (late ? ' warn' : ''), 'aria-hidden': 'true' }),
      el('span', { text: '营业中 · ' + (late ? '这个点还开着' : '24 小时不打烊') })
    ]));
    box.appendChild(el('div', { class: 'sign-clock', id: 'sign-clock',
      text: U.pad2(now.getHours()) + ':' + U.pad2(now.getMinutes()) }));
    box.appendChild(el('div', { class: 'sign-date', text: dateLine() }));

    var rows = el('div', { class: 'sign-rows' });
    rows.appendChild(srow('今日访客', dayCount + ' 位'));
    rows.appendChild(srow('灯还剩', (1 - dayCount * 0.07).toFixed(1) + ' 盏'));
    rows.appendChild(srow('库存', '0 件 · 不进货'));
    rows.appendChild(srow('今日电费', '0.00（没接电表）'));
    box.appendChild(rows);
    box.appendChild(el('p', { class: 'sign-note', text: BOSS_NOTES[Math.floor(Math.random() * BOSS_NOTES.length)] }));
    return box;
  }

  function srow(k, v) {
    return el('div', { class: 'sign-row' }, [
      el('span', { class: 'k', text: k }),
      el('span', { class: 'v', text: v })
    ]);
  }

  function mount(root) {
    var visits = store.get('visits', 1);
    var first = store.get('firstVisit', Date.now());
    var days = store.get('days', {});
    var dayCount = Object.keys(days).length;
    var streak = MZ.streak();
    var pair = MZ.dailyPair();
    var badd = MZ.badgeList();
    var gotBadges = badd.filter(function (b) { return b.got; }).length;

    var h = new Date(first);
    var together = U.daysBetween(h, new Date()) + 1;

    root.innerHTML = '';

    /* ---- Hero ---- */
    var hero = el('section', { class: 'hero' });
    var main = el('div', { class: 'hero-main' });
    main.appendChild(el('div', { class: 'eyebrow', text: '门没锁 · 随时可以推门' }));
    main.appendChild(el('h1', { class: 'h-xl' }, [
      '忘忧',
      el('br'),
      el('span', { class: 'hero-em', text: '小卖部' })
    ]));
    main.appendChild(el('p', { class: 'lede', text: '不卖东西，也不解决问题。只是在这儿放着。你可以把任何一件烦心的事放在柜台上，转身走掉——我们不追问它是什么。' }));
    main.appendChild(el('div', { class: 'row hero-row' }, [
      el('button', { class: 'btn primary', type: 'button', onclick: function () {
        var pool = ['radio', 'kaleido', 'fate', 'slack', 'letter', 'archive'];
        if (visits > 3) pool.push('about');
        MZ.go(U.pick(Math.random, pool));
      } }, ['随便逛逛']),
      el('a', { class: 'btn ghost', href: '#/archive' }, ['看看我的痕迹'])
    ]));
    main.appendChild(el('p', { class: 'hero-greet mono small muted', text: MZ.greeting() + '。这是你第 ' + visits + ' 次推门进来。' }));
    hero.appendChild(main);
    hero.appendChild(signCard(dayCount));
    root.appendChild(hero);

    /* 挂钟走字 */
    if (homeOff) homeOff();
    var clockTick = setInterval(function () {
      var c = document.getElementById('sign-clock');
      if (!c) { clearInterval(clockTick); return; }
      var d = new Date();
      c.textContent = U.pad2(d.getHours()) + ':' + U.pad2(d.getMinutes());
    }, 20000);
    homeOff = MZ.bus.on('leave:home', function () {
      clearInterval(clockTick);
      if (homeOff) { homeOff(); homeOff = null; }
    });

    /* ---- 今日便签 ---- */
    var note = el('section', { class: 'card pad-lg note' });
    note.appendChild(el('div', { class: 'row between' }, [
      el('span', { class: 'eyebrow', style: 'margin:0', text: '今日便签' }),
      el('span', { class: 'mono small muted', text: U.ymd() })
    ]));
    note.appendChild(el('p', { class: 'note-main serif', text: pair[0] }));
    note.appendChild(el('p', { class: 'note-sub muted small', text: pair[1] }));
    note.appendChild(el('div', { class: 'note-stats' }, [
      statTile('连续到店', streak, '天'),
      statTile('来过', together, '天'),
      statTile('点亮', gotBadges + '/' + badd.length, '枚灯'),
      statTile('记录', dayCount, '天')
    ]));
    root.appendChild(note);

    /* ---- 货架 ---- */
    var shelf = el('section', { class: 'shelf-sec' });
    shelf.appendChild(el('div', { class: 'row between', style: 'margin-bottom:14px' }, [
      el('h2', { class: 'h-md', style: 'margin:0', text: '货架' }),
      el('span', { class: 'pill', text: SHELF.length + ' 件' })
    ]));
    var grid = el('div', { class: 'shelf-grid' });
    SHELF.forEach(function (s) { grid.appendChild(shelfCard(s)); });
    shelf.appendChild(grid);
    root.appendChild(shelf);

    /* ---- 说说 ---- */
    var murmur = el('section', { class: 'card murmur' });
    murmur.appendChild(el('div', { class: 'eyebrow', text: '对着门口说点什么' }));
    murmur.appendChild(el('p', { class: 'small muted', text: '没人会听见。说完就散。' }));
    var form = el('form', { class: 'murmur-form' });
    var input = el('input', { class: 'input', type: 'text', maxlength: '40', placeholder: '…', 'aria-label': '说点什么' });
    var out = el('p', { class: 'murmur-out small', 'aria-live': 'polite' });
    form.appendChild(input);
    form.appendChild(el('button', { class: 'btn', type: 'submit' }, ['说']));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { out.textContent = '（你张了张嘴，又闭上了）'; return; }
      var r = MZ.murmur(v);
      out.innerHTML = '<span class="dim">「' + U.esc(v) + '」</span> — ' + U.esc(r.reply);
      MZ.whisper(v);
      input.value = '';
      if (r.hit) MZ.ding(520, .2);
      grantForWhisper(r.seed);
    });
    murmur.appendChild(form);
    murmur.appendChild(out);
    root.appendChild(murmur);

    /* ---- 底注 ---- */
    root.appendChild(el('footer', { class: 'home-foot' }, [
      el('p', { class: 'small muted', text: '这家店不联网、不追踪、不收费。你写的东西只躺在你自己的浏览器里，删掉就没了——这算自由，也算残忍。' }),
      el('p', { class: 'small muted', text: '想走的时候，把这个文件夹留下就行。它不联网。' })
    ]));
  }

  function statTile(k, v, unit) {
    return el('div', { class: 'mini-stat' }, [
      el('div', { class: 'mini-v' }, [String(v), el('small', { text: unit })]),
      el('div', { class: 'mini-k', text: k })
    ]);
  }

  function grantForWhisper(seed) {
    if (seed === '为什么' || seed === '在吗' || seed === '你叫什么' || seed === '0') {
      MZ.grant('first', true);
      MZ.toast('🏮 有点意思', '你问到了点子上', '🏮');
    }
  }

  MZ.route('home', { title: '门口' }, mount);
})();
