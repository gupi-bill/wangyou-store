/* ============================================================
   app-archive.js · 档案室
   你的痕迹，和一些不该被点开的东西。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var TABS = [
    { id: 'trace',  n: '到店记录' },
    { id: 'hoard',  n: '收藏与记录' },
    { id: 'boss',   n: '老板的账本' },
    { id: 'paper',  n: '小店日报' }
  ];

  var opened = {};

  function pad(n) { return U.pad2(n); }

  function dstr(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function mount(root) {
    var visits = store.get('visits', 0);
    var first = store.get('firstVisit', Date.now());
    var days = store.get('days', {});
    var dayList = Object.keys(days).sort();
    var streak = MZ.streak();
    var together = U.daysBetween(new Date(first), new Date()) + 1;

    var kal = store.get('kaleido', { favs: [], seeds: [] });
    var fate = store.get('fate', { log: [], done: [], seen: {} });
    var slack = store.get('slack', { slips: [] });
    var letters = store.get('letters', []);

    root.innerHTML = '';
    root.appendChild(MZ.ui.pageHead('archive · 06', '档案室',
      '这家店记着一些关于你的事。都是小事，但凑起来是一段时间。',
      el('span', { class: 'pill violet', text: '档案号 ' + String(visits).padStart(4, '0') })));

    var tabs = el('div', { class: 'seg', style: 'margin-bottom:20px;flex-wrap:wrap' });
    var btns = {};
    TABS.forEach(function (t) {
      var b = el('button', { class: 'seg-b', type: 'button', text: t.n });
      b.addEventListener('click', function () { show(t.id); });
      tabs.appendChild(b);
      btns[t.id] = b;
    });
    root.appendChild(tabs);

    var pane = el('div', { class: 'arch-pane' });
    root.appendChild(pane);

    function show(id) {
      Object.keys(btns).forEach(function (k) {
        btns[k].setAttribute('aria-selected', String(k === id));
      });
      pane.innerHTML = '';
      opened[id] = true;
      lastTab = id;
      store.set('archTab', id);
      if (id === 'trace') trace(pane);
      else if (id === 'hoard') hoard(pane);
      else if (id === 'boss') boss(pane);
      else paper(pane);
      if (id === 'boss') MZ.grant('arch', true);
    }

    show(opened[lastTab] ? lastTab : 'trace');

    /* ============ 一、到店记录 ============ */
    function trace(box) {
      var g = el('div', { class: 'grid c4', style: 'margin-bottom:20px' });
      g.appendChild(stat('来过', visits, '次', null, '门被推开的总次数'));
      g.appendChild(stat('连续', streak, '天', streak >= 3 ? 'var(--mint)' : null, streak ? '连着没断' : '今天断了一天'));
      g.appendChild(stat('最长连续', longestStreak(days), '天', null, '你的纪录'));
      g.appendChild(stat('翻过', dayList.length, '天', null, '有记录的日历格'));
      box.appendChild(g);

      box.appendChild(el('div', { class: 'card', style: 'margin-bottom:20px' }, [
        el('div', { class: 'eyebrow', text: '一张小表' }),
        el('p', { class: 'small', style: 'margin:0 0 6px' }, [
          '第一次推门：', el('b', { class: 'mono', text: dstr(first) })
        ]),
        el('p', { class: 'small', style: 'margin:0 0 6px' }, ['到今天，一共', el('b', { class: 'mono', style: 'color:var(--lamp)', text: together + ' 天' })]),
        el('p', { class: 'small muted', style: 'margin:0', text: '其中有 ' + dayList.length + ' 天你真的推了门，其余时间，你只是没来而已。' })
      ]));

      box.appendChild(el('div', { class: 'card', style: 'margin-bottom:20px' }, [
        el('div', { class: 'eyebrow', text: '最近 60 天 · 亮灯的日子' }),
        heat(days)
      ]));

      box.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'eyebrow', text: '门口的低语' }),
        whispers()
      ]));
    }

    function stat(k, v, u, color, sub) {
      return el('div', { class: 'stat' }, [
        el('div', { class: 'k', text: k }),
        el('div', { class: 'v', style: color ? 'color:' + color : null }, [String(v), el('span', { style: 'font-size:13px;opacity:.6;margin-left:3px', text: u })]),
        el('div', { class: 's', text: sub || '—' })
      ]);
    }

    function longestStreak(map) {
      var keys = Object.keys(map).sort();
      var best = 0, cur = 0, prev = null;
      keys.forEach(function (k) {
        if (prev) {
          var a = new Date(prev), b = new Date(k);
          cur = Math.round((b - a) / 86400000) === 1 ? cur + 1 : 1;
        } else cur = 1;
        best = Math.max(best, cur);
        prev = k;
      });
      return best;
    }

    function heat(map) {
      var wrap = el('div', { class: 'heat' });
      var cells = [];
      for (var i = 59; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var key = U.ymd(d);
        var v = map[key] || 0;
        var lvl = v === 0 ? 0 : Math.min(3, v);
        cells.push(el('i', {
          class: 'cell l' + lvl,
          title: key + (v ? ' · 来过 ' + v + ' 次' : ' · 没来')
        }));
      }
      wrap.appendChild(el('div', { class: 'heat-grid' }, cells));
      wrap.appendChild(el('div', { class: 'heat-legend small muted' }, [
        el('span', { text: '少' }),
        el('i', { class: 'cell l0' }), el('i', { class: 'cell l1' }),
        el('i', { class: 'cell l2' }), el('i', { class: 'cell l3' }),
        el('span', { text: '多' })
      ]));
      return wrap;
    }

    function whispers() {
      var list = store.get('whispers', []);
      if (!list.length) {
        return el('div', { class: 'empty' }, [
          el('span', { class: 'big', text: '🤫' }),
          '还没人在门口说过话。回去说点什么吧，反正没人听见。'
        ]);
      }
      var box = el('div', { class: 'whispers' });
      list.slice(0, 20).forEach(function (w) {
        box.appendChild(el('div', { class: 'whisper' }, [
          el('span', { class: 'whisper-q', text: '「' + U.esc(w.s) + '」' }),
          el('span', { class: 'whisper-t mono small muted', text: dstr(w.t) })
        ]));
      });
      return box;
    }

    /* ============ 二、收藏与记录 ============ */
    function hoard(box) {
      var g = el('div', { class: 'grid c4', style: 'margin-bottom:20px' });
      g.appendChild(stat('万花筒配方', (kal.favs || []).length, '个', null, '存下来的种子'));
      g.appendChild(stat('命运用过', Object.keys(fate.seen || {}).length + '/115', '条', null, '还剩 ' + (115 - Object.keys(fate.seen || {}).length) + ' 条没露面'));
      g.appendChild(stat('认领过', (fate.done || []).length, '条', null, '你说过要做的'));
      g.appendChild(stat('信', letters.length, '封', null, letters.filter(function (l) { return !l.opened; }).length + ' 封还锁着'));
      box.appendChild(g);

      box.appendChild(section('认领过的命运', (fate.done || []).length ? list(
        (fate.done || []).map(function (t) { return { k: t, v: '' }; })
      ) : empty('还没认领过任何一条。', '🎰')));

      box.appendChild(section('拖延流水（最近 12 条）', (slack.slips || []).length ? list(
        (slack.slips || []).slice(0, 12).map(function (s) {
          return { k: s.c, v: (s.n ? s.n + ' · ' : '') + s.m + ' 分钟', raw: s.c };
        })
      ) : empty('还没记过一笔。', '🫠')));

      box.appendChild(section('万花筒收藏', (kal.favs || []).length ? list(
        (kal.favs || []).map(function (f) { return { k: '#' + f.seed, v: f.mode + ' · ' + f.p.sectors + ' 份对称' }; })
      ) : empty('一个配方都没存。', '🌀')));

      box.appendChild(section('信', letters.length ? list(
        letters.map(function (L) { return { k: L.t, v: (L.opened ? '已拆 · ' : '还锁着 · ') + dstr(L.due) }; })
      ) : empty('信箱空的。', '✉️')));
    }

    function empty(t, ic) {
      return el('div', { class: 'empty' }, [el('span', { class: 'big', text: ic }), t]);
    }
    function section(title, node) {
      return el('div', { class: 'card', style: 'margin-bottom:14px' }, [
        el('div', { class: 'eyebrow', text: title }), node
      ]);
    }
    function list(rows) {
      var box = el('div', { class: 'hoard-list' });
      rows.forEach(function (r) {
        box.appendChild(el('div', { class: 'hoard-row' }, [
          el('span', { class: 'hoard-k', text: r.k }),
          el('span', { class: 'hoard-v small muted', text: r.v })
        ]));
      });
      return box;
    }

    /* ============ 三、老板的账本 ============ */
    function boss(box) {
      var lines = bossLines(visits, first, together, dayList, streak);
      var paper = el('div', { class: 'boss-paper' });
      paper.appendChild(el('div', { class: 'boss-stamp', text: '仅供内部' }));
      paper.appendChild(el('div', { class: 'eyebrow', text: '忘忧小卖部 · 值班记录' }));
      paper.appendChild(el('h3', { class: 'h-md serif', style: 'margin:2px 0 10px', text: '致 ' + (visits > 30 ? '老主顾' : '这位先生/女士') }));
      var ps = el('div', { class: 'boss-lines' });
      lines.forEach(function (l, i) {
        ps.appendChild(el('p', { style: 'animation-delay:' + (i * 60) + 'ms', text: l }));
      });
      paper.appendChild(ps);
      paper.appendChild(el('div', { class: 'boss-sign' }, [
        el('span', { class: 'serif', text: '—— 老板' }),
        el('span', { class: 'mono small muted', text: dstr(Date.now()) })
      ]));
      box.appendChild(paper);

      box.appendChild(el('div', { class: 'card', style: 'margin-top:16px' }, [
        el('div', { class: 'eyebrow', text: '附注' }),
        el('p', { class: 'small muted', style: 'margin:0', text: '账本里没有你的名字，也没有联系方式。它只记得你来过，以及你在门口嘟囔过什么。这已经是这家店能给的全部了。' }),
        el('div', { class: 'row', style: 'margin-top:14px' }, [
          el('button', { class: 'btn sm', onclick: function () { printPaper(lines); } }, ['把账本打出来']),
          MZ.ui.confirmBtn('撕掉这一页', function () {
            if (store.get('bossTorn')) { MZ.toast('已经撕过了', '有些东西撕一次就够了', '📄'); return; }
            store.set('bossTorn', true);
            MZ.toast('撕了', '明天它又会自己长出来', '📄', 4000);
            show('boss');
          }, { danger: true, armedLabel: '真撕？' })
        ])
      ]));
    }

    function printPaper(lines) {
      var w = window.open('', '_blank');
      if (!w) { MZ.toast('打不开新窗口', '浏览器拦了', '🧯'); return; }
      var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>值班记录 · ' + U.ymd() + '</title>' +
        '<style>body{font:15px/2 "Songti SC",Georgia,serif;background:#f6f1e7;color:#2a2622;max-width:640px;margin:60px auto;padding:0 24px}' +
        'h1{font-size:20px;letter-spacing:.1em;border-bottom:2px solid #2a2622;padding-bottom:10px}' +
        '.meta{font:12px/1.6 monospace;color:#7a7065;margin:14px 0 26px}' +
        'p{margin:0 0 12px;padding-left:1.6em;text-indent:-1.6em}' +
        '.sign{margin-top:40px;text-align:right;color:#7a7065}</style></head><body>' +
        '<h1>忘忧小卖部 · 值班记录</h1>' +
        '<div class="meta">档案号 ' + String(visits).padStart(4, '0') + ' · 打印于 ' + dstr(Date.now()) + '</div>' +
        lines.map(function (l) { return '<p>' + U.esc(l) + '</p>'; }).join('') +
        '<div class="sign">—— 老板</div></body></html>';
      w.document.write(html);
      w.document.close();
      setTimeout(function () { w.print(); }, 400);
    }

    function bossLines(v, first, together, dayList, streak) {
      var L = [];
      L.push('这位客人第一次进门是 ' + dstr(first) + '。到现在，' + together + ' 天。');
      if (v <= 2) L.push('来得不多。也好，这地方本来就不是给常客准备的。');
      else if (v <= 10) L.push('来得不勤，但每次都坐得住。');
      else if (v <= 30) L.push('已经算是熟客了。柜台后面的灯泡会为你留一盏。');
      else L.push('来得太频繁了。我开始担心你把这里当成避难所——虽然这里确实是。');

      if (streak >= 7) L.push('连续来了 ' + streak + ' 天。我数着的。');
      else if (streak >= 3) L.push('这几天你没断过。再坚持两天就能凑个整数了。');
      else if (dayList.length > 5) L.push('最近来得不连续，不过也正常，人总得有点自己的事。');

      var mins = (slack.slips || []).reduce(function (a, b) { return a + b.m; }, 0);
      if (mins > 0) {
        L.push('账上记着，你一共交代了 ' + fmtH(mins) + ' 的去处。' +
          (mins > 1440 ? '这个数目够在本店白吃白住两年。'
           : mins > 600 ? '这个数目够在这儿坐满一个月。'
           : mins > 120 ? '不算多，但也不是零。'
           : '数字不大，但它是诚实的。'));
      } else {
        L.push('你还没交代过任何时间去哪了。也好，不问比问了好听。');
      }

      var unopened = (letters || []).filter(function (x) { return !x.opened; });
      if (unopened.length) L.push('柜台下有 ' + unopened.length + ' 封没拆的信。它们的重量比看上去大。');
      if ((fate.done || []).length) L.push('你从命运那儿认领了 ' + fate.done.length + ' 件事。' + (fate.done.length >= 5 ? '这已经比大多数人多了。' : '继续。'));
      if ((kal.favs || []).length) L.push('你收藏了 ' + kal.favs.length + ' 个万花筒配方。审美这件事，终于有据可查了。');

      var r = store.get('radioSec', 0);
      if (r > 300) L.push('你在本店背景音里待了 ' + fmtH(Math.round(r / 60)) + '。那段噪音是我给的，不收费。');

      var w = store.get('whispers', []);
      if (w.length) {
        L.push('你在门口说过 ' + w.length + ' 句话。我都记着，但我不打算告诉你我记的是哪几句。');
      }

      L.push('');
      L.push(v >= 10
        ? '总之：欢迎常来。灯一直亮着，也没人查你为什么来。'
        : '总之：门没锁。什么时候想坐会儿，不用打招呼。');
      return L;
    }

    function fmtH(m) {
      if (m < 60) return m + ' 分钟';
      var h = Math.floor(m / 60), r = m % 60;
      return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
    }

    /* ============ 四、小店日报 ============ */
    function paper(box) {
      var p = el('div', { class: 'card pad-lg' });
      p.appendChild(el('div', { class: 'row between', style: 'margin-bottom:18px' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow', text: '小店日报' }),
          el('h3', { class: 'h-md serif', style: 'margin:0', text: U.ymd() })
        ]),
        el('button', { class: 'btn sm no-print', onclick: function () { window.print(); } }, ['打印这一页'])
      ]));
      p.appendChild(el('div', { class: 'news' }, [
        newsLine('今日到店', dayList.indexOf(U.ymd()) >= 0 ? '是' : '否'),
        newsLine('累计到店', visits + ' 次'),
        newsLine('门口低语', (store.get('whispers', []).length) + ' 句'),
        newsLine('信箱', (store.get('letters', []).length) + ' 封'),
        newsLine('命运', '今天还没替谁做主'),
        newsLine('本店背景音', store.get('radioSec', 0) ? '已备好' : '待命')
      ]));
      p.appendChild(el('p', { class: 'serif small', style: 'margin-top:20px;color:var(--lamp)', text: MZ.dailyPair()[0] + '。' + MZ.dailyPair()[1] }));
      box.appendChild(p);
      box.appendChild(el('div', { class: 'card', style: 'margin-top:16px' }, [
        el('div', { class: 'eyebrow', text: '成就在哪里' }),
        MZ.ui.badgeWall()
      ]));
    }

    function newsLine(k, v) {
      return el('div', { class: 'news-row' }, [
        el('span', { class: 'news-k', text: k }),
        el('span', { class: 'news-d' }),
        el('span', { class: 'news-v', text: v })
      ]);
    }
  }

  var lastTab = 'trace';

  MZ.route('archive', { title: '档案室' }, function (root) {
    var saved = store.get('archTab', null);
    lastTab = (saved && TABS.some(function (t) { return t.id === saved; })) ? saved : 'trace';
    mount(root);
  });
})();
