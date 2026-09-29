/* ============================================================
   app-fate.js · 命运老虎机
   一共 126 条建议，写死的。它不智能，不联网，不看你。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var JOBS = window.MZ_JOBS || [];
  var NOTES = window.MZ_NOTES || [];

  var CATS = ['小事', '面对', '身体', '对人', '数字', '荒诞', '罕见', '传说'];

  var CAT_COLOR = {
    '小事': 'mint', '面对': 'lamp', '身体': 'mint',
    '对人': 'violet', '数字': 'violet', '荒诞': 'rose',
    '罕见': 'rose', '传说': 'lamp'
  };

  var S = {
    rolling: false, timer: null, cur: null, tickAt: 0
  };

  /* 抽一条：可排除已见的 */
  function draw(exclude) {
    var pool = JOBS.filter(function (j) { return !exclude || !exclude[j.t]; });
    if (!pool.length) pool = JOBS;
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].w || 1);
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= (pool[i].w || 1);
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function mount(root) {
    var data = store.get('fate', { spins: 0, done: [], log: [], seen: {}, noRepeat: true });

    // 上次抽到的那条，接班继续显示，别让人以为没抽过
    var resumed = false;
    if (!S.cur && data.log.length) { S.cur = data.log[0].t; resumed = true; }

    root.innerHTML = '';
    root.appendChild(MZ.ui.pageHead('fate · 03', '命运老虎机',
      '它会抽一条今天可以做的事给你。抽到什么就做什么——不是建议，是排班表。',
      el('span', { class: 'pill mint', id: 'fate-spin-count', text: '转了 ' + data.spins + ' 次' })));

    /* ---- 机器 ---- */
    var machine = el('div', { class: 'fate-machine' });
    var marquee = el('div', { class: 'fate-marquee' });
    var reel = el('div', { class: 'fate-reel', id: 'fate-reel' });
    var above = el('div', { class: 'fate-ghost above', text: '' });
    var below = el('div', { class: 'fate-ghost below', text: '' });
    var main = el('div', { class: 'fate-main', id: 'fate-main' }, ['按一下，让它替你决定']);
    var cat = el('div', { class: 'fate-cat', id: 'fate-cat' });

    var window_ = el('div', { class: 'fate-window' }, [above, reel, below]);
    reel.appendChild(main);
    reel.appendChild(cat);
    machine.appendChild(el('div', { class: 'fate-glass' }, [window_]));
    root.appendChild(machine);

    /* ---- 控制 ---- */
    var ctl = el('div', { class: 'fate-ctl' });
    var spinBtn = el('button', { class: 'btn primary big-btn', type: 'button', id: 'fate-spin' }, ['🎰 转到一条']);
    spinBtn.addEventListener('click', spin);
    ctl.appendChild(el('div', { class: 'center' }, [spinBtn]));
    ctl.appendChild(el('div', { class: 'row', style: 'justify-content:center;margin-top:14px' }, [
      el('span', { class: 'small', text: '不重复抽到过的' }),
      el('label', { class: 'switch' }, [
        el('input', {
          type: 'checkbox', checked: data.noRepeat ? 'checked' : null, 'aria-label': '不重复',
          onchange: function () { data.noRepeat = this.checked; store.set('fate', data); }
        }),
        el('span', { class: 'track' })
      ])
    ]));
    root.appendChild(ctl);

    /* ---- 当前建议卡 ---- */
    var curBox = el('div', { class: 'card', id: 'fate-cur', style: 'margin-top:22px' });
    root.appendChild(curBox);

    /* ---- 统计 ---- */
    var stats = el('div', { class: 'grid c4', style: 'margin-top:16px' });
    root.appendChild(stats);

    /* ---- 历史 ---- */
    var allCard = el('div', { class: 'card', style: 'margin-top:16px' });
    root.appendChild(allCard);

    var hist = el('div', { class: 'card', style: 'margin-top:16px' });
    hist.appendChild(el('div', { class: 'row between', style: 'margin-bottom:12px' }, [
      el('span', { class: 'eyebrow', style: 'margin:0', text: '抽到过的' }),
      MZ.ui.confirmBtn('清空记录', function () {
        data.log = []; data.seen = {}; store.set('fate', data);
        MZ.toast('清空了', '它会重新开始认识你', '🧹');
        mount(root);
      }, { danger: true, armedLabel: '真清空？' })
    ]));
    var histList = el('div', { class: 'fate-hist' });
    hist.appendChild(histList);
    root.appendChild(hist);

    /* 全部 115 条 */
    (function allList() {
      var d = el('details', { class: 'how' });
      d.appendChild(el('summary', { class: 'small', text: '全部 ' + JOBS.length + ' 条都在这儿（抽到过的会亮起来）' }));
      var body = el('div', { class: 'how-body' });
      CATS.filter(function (c) {
        return JOBS.some(function (j) { return j.c === c; });
      }).forEach(function (c) {
        body.appendChild(el('div', { class: 'pool-h mono', text: c + ' · ' + JOBS.filter(function (j) { return j.c === c; }).length + ' 条' }));
        var ul = el('div', { class: 'pool' });
        JOBS.filter(function (j) { return j.c === c; }).forEach(function (j) {
          var got = (data.seen[j.t] || 0) > 0;
          ul.appendChild(el('div', { class: 'pool-i' + (got ? ' got' : ''), text: j.t }));
        });
        body.appendChild(ul);
      });
      d.appendChild(body);
      allCard.appendChild(d);
    })();

    renderAll();

    /* ================= 逻辑 ================= */

    function renderAll() {
      renderStats();
      renderHist();
      if (S.cur) renderCur();
      else curBox.appendChild(el('div', { class: 'empty' }, [
        el('span', { class: 'big', text: '🎰' }),
        '还没转过。按上面那个按钮，让机器替你挑一条。'
      ]));
    }

    function renderStats() {
      stats.innerHTML = '';
      var doneCount = data.done.length;
      var seenCount = Object.keys(data.seen).length;
      stats.appendChild(tile('转过', data.spins, '次', null, '这台机器一共 115 条'));
      stats.appendChild(tile('照做', doneCount, '条', doneCount > 0 ? 'var(--mint)' : null,
        data.spins ? '你认领了 ' + Math.round(doneCount / data.spins * 100) + '%' : '还没开始'));
      stats.appendChild(tile('见过', seenCount + '/' + JOBS.length, '条', seenCount >= JOBS.length ? 'var(--lamp)' : null,
        seenCount >= JOBS.length ? '全见过了，厉害' : '还剩 ' + (JOBS.length - seenCount) + ' 条没露面'));
      stats.appendChild(tile('最近一条', data.log.length ? relTime(data.log[0].ts) : '—', '',
        null, data.log.length ? catName(data.log[0].t) : '转一下就有了'));
    }

    function tile(k, v, u, color, sub) {
      return el('div', { class: 'stat' }, [
        el('div', { class: 'k', text: k }),
        el('div', { class: 'v', style: color ? 'color:' + color : null }, [String(v), el('span', { style: 'font-size:13px;opacity:.6;margin-left:3px', text: u })]),
        el('div', { class: 's', text: sub })
      ]);
    }

    function renderHist() {
      histList.innerHTML = '';
      if (!data.log.length) {
        histList.appendChild(el('div', { class: 'empty' }, [el('span', { class: 'big', text: '📜' }), '抽过的都会记在这儿，替你记着。']));
        return;
      }
      data.log.slice(0, 14).forEach(function (item, i) {
        var job = JOBS.filter(function (j) { return j.t === item.t; })[0];
        var done = data.done.indexOf(item.t) >= 0;
        histList.appendChild(el('div', { class: 'fate-item' + (done ? ' done' : '') }, [
          el('span', { class: 'fate-dot', style: 'background:' + (job ? 'var(--' + (CAT_COLOR[job.c] || 'lamp') + ')' : 'var(--lamp)') }),
          el('span', { class: 'fate-txt', text: item.t }),
          el('span', { class: 'fate-when mono small muted', text: relTime(item.ts) }),
          done ? el('span', { class: 'pill mint', text: '做了' }) : null
        ]));
        i;
      });
    }

    function renderCur() {
      curBox.innerHTML = '';
      var job = JOBS.filter(function (j) { return j.t === S.cur; })[0];
      if (!job) return;
      var already = data.done.indexOf(S.cur) >= 0;
      var times = data.seen[S.cur] || 0;

      curBox.appendChild(el('div', { class: 'row', style: 'margin-bottom:14px' }, [
        el('span', { class: 'pill ' + (CAT_COLOR[job.c] || 'lamp'), text: job.c }),
        el('span', { class: 'spacer' }),
        el('span', { class: 'small muted mono', text: times > 1 ? '这条你抽到过 ' + times + ' 次' : '第一次抽到' })
      ]));
      if (resumed) {
        curBox.appendChild(el('div', { class: 'small muted', style: 'margin:-4px 0 8px' },
          ['↑ 这是你上次抽到的那条。今天的还没转。']));
      }
      curBox.appendChild(el('p', { class: 'fate-big', text: job.t }));
      curBox.appendChild(el('p', { class: 'small muted', text: noteFor(times) }));

      var row = el('div', { class: 'row', style: 'margin-top:18px' });
      if (!already) {
        row.appendChild(el('button', { class: 'btn primary', type: 'button', onclick: function () {
          if (data.done.indexOf(S.cur) < 0) data.done.push(S.cur);
          store.set('fate', data);
          MZ.ding(880, .18);
          MZ.grant('fate5');
          MZ.toast('记下了', '做没做到我不知道，但你说做了', '✔', 3600);
          renderAll();
        } }, ['✔ 我做了']));
      } else {
        row.appendChild(el('span', { class: 'pill mint', text: '✔ 这条你已经认领过了' }));
      }
      row.appendChild(el('button', { class: 'btn ghost', type: 'button', onclick: function () {
        U.copyBtn(function () { return '今天轮到我的事：' + S.cur; })();
      } }, ['复制给未来的自己']));
      row.appendChild(el('span', { class: 'spacer' }));
      row.appendChild(el('button', { class: 'btn ghost', type: 'button', onclick: function () {
        if (data.log[0] && data.log[0].t === S.cur) data.log.shift();
        store.set('fate', data);
        S.cur = null; main.textContent = '按一下，让它替你决定';
        cat.textContent = ''; renderAll();
      } }, ['不认领']));
      curBox.appendChild(row);
    }

    function noteFor(times) {
      if (times > 3) return '这条你反复抽到。要么它真的很重要，要么机器卡住了。';
      if (times > 1) return '又是这条。命运有时候很执着。';
      var n = NOTES[Math.floor(Math.random() * NOTES.length)];
      return n === '这条抽到过 ' ? '机器很少重复。' : n;
    }

    function spin() {
      if (S.rolling) return;
      S.rolling = true;
      spinBtn.disabled = true;
      spinBtn.textContent = '转着呢…';
      machine.classList.add('rolling');
      MZ.audio();

      var exclude = data.noRepeat ? data.seen : null;
      var target = draw(exclude);
      var frames = 26 + Math.floor(Math.random() * 14);
      var i = 0;
      var t0 = Date.now();
      var dur = 1500 + Math.random() * 900;

      clearInterval(S.timer);
      S.timer = setInterval(function () {
        var t = draw(null);
        above.textContent = above.textContent || t.t;
        main.textContent = t.t;
        below.textContent = draw(null).t;
        var el0 = Date.now() - t0;
        // 前快后慢
        var gap = 30 + Math.pow(el0 / dur, 3) * 90;
        if (Date.now() - S.tickAt > gap) { S.tickAt = Date.now(); MZ.ding(1180 + Math.random() * 120, .03); }
        if (++i >= frames) {
          clearInterval(S.timer);
          S.rolling = false;
          spinBtn.disabled = false;
          spinBtn.textContent = '🎰 再转一条';
          machine.classList.remove('rolling');
          main.textContent = target.t;
          main.classList.remove('land');
          void main.offsetWidth;
          main.classList.add('land');
          above.textContent = (draw(null) || {}).t || '';
          below.textContent = '';
          cat.textContent = '';
          cat.className = 'fate-cat';
          var job = JOBS.filter(function (x) { return x.t === target.t; })[0];
          if (job) {
            var p = el('span', { class: 'pill ' + (CAT_COLOR[job.c] || 'lamp'), text: job.c });
            cat.appendChild(p);
          }
          S.cur = target.t;
          data.spins++;
          data.seen[target.t] = (data.seen[target.t] || 0) + 1;
          data.log.unshift({ t: target.t, ts: Date.now() });
          if (data.log.length > 60) data.log.pop();
          store.set('fate', data);
          var sc = document.getElementById('fate-spin-count');
          if (sc) sc.textContent = '转了 ' + data.spins + ' 次';
          if (data.spins >= 20) MZ.grant('fate');
          MZ.ding(760, .3);
          renderAll();
        }
      }, 34);
    }

    /* 空格也能转（同一个 view 会被反复 mount，所以只挂一次） */
    if (!root.__mzSpin) {
      root.__mzSpin = function (e) {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        if (root.__mzSpin.run) root.__mzSpin.run();
      };
      root.addEventListener('keydown', root.__mzSpin);
    }
    root.__mzSpin.run = spin;

    /* 转到一半跑了，就别再往回写了 */
    MZ.bus.on('leave:fate', function () {
      if (S.timer) { clearInterval(S.timer); S.timer = null; }
      S.rolling = false;
    });
  }

  function catName(t) {
    var j = (window.MZ_JOBS || []).filter(function (x) { return x.t === t; })[0];
    return j ? j.c : '—';
  }

  function relTime(ts) {
    var d = Date.now() - ts;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
    if (d < 172800000) return '昨天';
    return Math.floor(d / 86400000) + ' 天前';
  }

  MZ.route('fate', { title: '命运老虎机' }, mount);
})();
