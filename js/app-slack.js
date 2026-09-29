/* ============================================================
   app-slack.js · 拖延统计
   诚实地记下你把时间浪费在哪儿了。不评判，只是记。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var CATS = [
    { id: 'phone',   n: '刷手机',   ic: '📱', why: '明明有事' },
    { id: 'daydream',n: '发呆',     ic: '🌫', why: '没在想什么' },
    { id: 'hunt',    n: '找东西',   ic: '🔍', why: '钥匙、充电线、某个文件' },
    { id: 'rehearse',n: '脑内排练', ic: '🎬', why: '把同一段对话演了四十遍' },
    { id: 'drift',   n: '开会走神', ic: '🌫', why: '灵魂出窍' },
    { id: 'start',   n: '纠结要不要开始', ic: '🌀', why: '准备工作做了一整天' },
    { id: 'recheck', n: '重看一遍看过的', ic: '🔁', why: '第三遍打开同一份文档' },
    { id: 'loading', n: '等加载',   ic: '⏳', why: '进度条不涨的时候' },
    { id: 'blank',   n: '站着发呆', ic: '🧍', why: '"我现在该干嘛"' },
    { id: 'tidy',    n: '收拾',     ic: '🧹', why: '桌子收拾了，事儿没动' },
    { id: 'pick',    n: '挑来挑去', ic: '🎧', why: '选歌选了一小时' },
    { id: 'diary',   n: '把记录写成日记', ic: '📔', why: '记笔记变成了写作' },
    { id: 'food',    n: '开外卖软件又关上', ic: '🍜', why: '选择困难' },
    { id: 'sort',    n: '整理收藏夹', ic: '📚', why: '分类很爽，正事很烦' },
    { id: 'life',    n: '躺着想人生', ic: '🌌', why: '没有结论' },
    { id: 'other',   n: '说不清',   ic: '❓', why: '就……没了' }
  ];

  var SPANS = [
    { m: 5, n: '5 分钟' }, { m: 15, n: '15 分钟' }, { m: 30, n: '半小时' },
    { m: 60, n: '一小时' }, { m: 120, n: '两小时' }, { m: 240, n: '半天' }, { m: 480, n: '一整天' }
  ];

  function cat(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[CATS.length - 1];
  }

  function fmtMin(m) {
    if (m < 60) return m + ' 分钟';
    var h = Math.floor(m / 60), r = m % 60;
    return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
  }

  /* 把分钟换成别的单位，一目了然地刺你一下 */
  function asLife(m) {
    return [
      '看完 ' + Math.floor(m / 120) + ' 部电影',
      '睡 ' + Math.floor(m / 420) + ' 觉',
      '吃 ' + Math.floor(m / 25) + ' 顿正经饭',
      '坐 ' + Math.round(m / 8) + ' 趟公交',
      '写 ' + Math.floor(m / 300) + ' 篇小作文',
      '和 ' + Math.floor(m / 20) + ' 个人聊一遍废话'
    ];
  }

  function mount(root) {
    var data = store.get('slack', { slips: [], note: '' });

    root.innerHTML = '';
    root.appendChild(MZ.ui.pageHead('slack · 04', '拖延统计',
      '不做效率工具，不打分，不提醒你该做什么。只做一件事：把"这段时间没了"写下来，写清楚。',
      el('span', { class: 'pill rose', id: 'slack-total-pill', text: '' })));

    /* ---- 记一笔 ---- */
    var addCard = el('div', { class: 'card pad-lg', style: 'margin-bottom:18px' });
    addCard.appendChild(el('div', { class: 'eyebrow', text: '记一笔' }));

    var picked = 'phone';
    var catGrid = el('div', { class: 'cat-grid', role: 'group', 'aria-label': '这段时间在干嘛' });
    var catBtns = {};
    CATS.forEach(function (c) {
      var b = el('button', { class: 'cat', type: 'button', title: c.why }, [
        el('span', { class: 'cat-ic', text: c.ic }),
        el('span', { class: 'cat-n', text: c.n })
      ]);
      b.addEventListener('click', function () {
        picked = c.id;
        Object.keys(catBtns).forEach(function (k) { catBtns[k].classList.toggle('on', k === picked); });
      });
      catGrid.appendChild(b);
      catBtns[c.id] = b;
    });
    catBtns[picked].classList.add('on');
    addCard.appendChild(catGrid);

    var span = '30';
    var spanRow = el('div', { class: 'field', style: 'margin-top:18px' });
    spanRow.appendChild(el('span', { class: 'lab' }, ['大概多久', el('em', { text: '半小时' })]));
    var seg = el('div', { class: 'seg seg-wrap', role: 'group', 'aria-label': '大概多久' });
    SPANS.forEach(function (s) {
      var b = el('button', { class: 'seg-b', type: 'button', text: s.n });
      b.addEventListener('click', function () {
        span = String(s.m);
        U.$$('.seg-b', seg).forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        spanRow.querySelector('em').textContent = s.n;
      });
      if (s.m === 30) b.setAttribute('aria-selected', 'true');
      seg.appendChild(b);
    });
    spanRow.appendChild(seg);
    addCard.appendChild(spanRow);

    var noteInput = el('input', { class: 'input', type: 'text', maxlength: '40', placeholder: '补一句（可以不写）' });
    var noteField = el('label', { class: 'field', style: 'margin:0' }, [
      el('span', { class: 'lab' }, ['当时具体在干嘛', el('em', { text: '选填' })]),
      noteInput
    ]);
    addCard.appendChild(noteField);

    var addRow = el('div', { class: 'row', style: 'margin-top:18px' }, [
      el('button', { class: 'btn primary', type: 'button', onclick: function () {
        var m = parseInt(span, 10);
        data.slips.unshift({ c: picked, m: m, n: noteInput.value.trim(), ts: Date.now(), d: U.ymd() });
        if (data.slips.length > 400) data.slips.pop();
        store.set('slack', data);
        MZ.grant('slack');
        noteInput.value = '';
        var c = cat(picked);
        var total = data.slips.reduce(function (a, b) { return a + b.m; }, 0);
        MZ.ding(520, .14);
        MZ.toast('记下了：' + c.n, '一共 ' + fmtMin(total) + ' 了' + (total >= 480 ? '。够睡一觉。' : '。'), c.ic, 4200);
        render();
      } }, ['记下这段时间']),
      el('span', { class: 'spacer' }),
      el('span', { class: 'small muted', text: '诚实一点，估算就行' })
    ]);
    addCard.appendChild(addRow);
    root.appendChild(addCard);

    /* ---- 总览 ---- */
    var overview = el('div', { class: 'grid c4', style: 'margin-bottom:18px' });
    root.appendChild(overview);

    /* ---- 本周柱状 ---- */
    var week = el('div', { class: 'card', style: 'margin-bottom:18px' });
    root.appendChild(week);

    /* ---- 排行 ---- */
    var rank = el('div', { class: 'card', style: 'margin-bottom:18px' });
    root.appendChild(rank);

    /* ---- 流水 ---- */
    var log = el('div', { class: 'card', style: 'margin-bottom:18px' });
    root.appendChild(log);

    /* ---- 一句话 ---- */
    var verdict = el('div', { class: 'card pad-lg center' });
    root.appendChild(verdict);

    render();

    /* ================= 渲染 ================= */

    function totalMin() { return data.slips.reduce(function (a, b) { return a + b.m; }, 0); }

    function render() {
      var total = totalMin();
      var pill = document.getElementById('slack-total-pill');
      if (pill) pill.textContent = total ? '一共 ' + fmtMin(total) : '还没记过';

      /* 总览 */
      overview.innerHTML = '';
      var days = {};
      data.slips.forEach(function (s) { days[s.d] = (days[s.d] || 0) + s.m; });
      var dayKeys = Object.keys(days);
      var avg = dayKeys.length ? Math.round(total / dayKeys.length) : 0;
      var worst = dayKeys.slice().sort(function (a, b) { return days[b] - days[a]; })[0];
      overview.appendChild(tile('总共', fmtMin(total), total ? '不等价于任何成果' : '还是零', total ? 'var(--rose)' : null));
      overview.appendChild(tile('记了', data.slips.length + ' 笔', dayKeys.length ? '跨 ' + dayKeys.length + ' 天' : '今天还没记'));
      overview.appendChild(tile('平均每天', avg ? fmtMin(avg) : '—', dayKeys.length ? '在记的日子里' : '暂无'));
      overview.appendChild(tile('最惨一天', worst ? fmtMin(days[worst]) : '—', worst || '—', worst ? 'var(--rose)' : null));

      /* 近 14 天 */
      week.innerHTML = '';
      week.appendChild(el('div', { class: 'row between', style: 'margin-bottom:14px' }, [
        el('span', { class: 'eyebrow', style: 'margin:0', text: '最近 14 天' }),
        el('span', { class: 'small muted', text: '单位：分钟' })
      ]));
      var bars = [];
      for (var i = 13; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var key = U.ymd(d);
        var v = days[key] || 0;
        bars.push({ k: (d.getMonth() + 1) + '/' + d.getDate(), v: v, c: v >= 480 ? 'var(--rose)' : 'var(--lamp)' });
      }
      week.appendChild(MZ.ui.bars(bars, { max: 480, unit: ' 分钟' }));

      /* 排行 */
      rank.innerHTML = '';
      rank.appendChild(el('div', { class: 'row between', style: 'margin-bottom:14px' }, [
        el('span', { class: 'eyebrow', style: 'margin:0', text: '都花在哪儿了' }),
        total ? MZ.ui.confirmBtn('清空全部', function () {
          data.slips = []; store.set('slack', data);
          MZ.toast('清空了', '这次是真的放下了', '🧹');
          render();
        }, { danger: true, armedLabel: '真清空？' }) : null
      ]));
      if (!total) {
        rank.appendChild(el('div', { class: 'empty' }, [
          el('span', { class: 'big', text: '🫠' }),
          '还没有记录。等你下一次"就刷五分钟"结束，就可以来记一笔。'
        ]));
      } else {
        var byCat = {};
        data.slips.forEach(function (s) { byCat[s.c] = (byCat[s.c] || 0) + s.m; });
        var rows = Object.keys(byCat).map(function (k) { return { k: cat(k).n, v: byCat[k], c: cat(k).ic, id: k }; })
          .sort(function (a, b) { return b.v - a.v; });
        rows.forEach(function (r, i) {
          var pct = Math.round(r.v / total * 100);
          rank.appendChild(el('div', { class: 'rank-row' }, [
            el('span', { class: 'rank-ic', text: r.c }),
            el('span', { class: 'rank-n', text: r.k }),
            el('span', { class: 'rank-bar' }, [
              el('i', { style: 'width:' + pct + '%;animation-delay:' + (i * 60) + 'ms' })
            ]),
            el('span', { class: 'rank-v mono', text: fmtMin(r.v) }),
            el('span', { class: 'rank-p mono muted', text: pct + '%' })
          ]));
        });
      }

      /* 流水 */
      log.innerHTML = '';
      log.appendChild(el('div', { class: 'row between', style: 'margin-bottom:12px' }, [
        el('span', { class: 'eyebrow', style: 'margin:0', text: '流水' }),
        el('span', { class: 'small muted', text: data.slips.length + ' 笔' })
      ]));
      if (!data.slips.length) {
        log.appendChild(el('div', { class: 'empty' }, ['上面记一笔，这儿就多一行。']));
      } else {
        var list = el('div', { class: 'slack-list' });
        data.slips.slice(0, 30).forEach(function (s, i) {
          var c = cat(s.c);
          list.appendChild(el('div', { class: 'slack-item' }, [
            el('span', { class: 'slack-ic', text: c.ic }),
            el('div', { class: 'slack-b' }, [
              el('div', { class: 'slack-t', text: c.n + (s.n ? '：' + s.n : '') }),
              el('div', { class: 'slack-d mono small muted', text: s.d + ' · ' + fmtMin(s.m) + ' · ' + cat(s.c).why })
            ]),
            MZ.ui.confirmBtn('删', function () {
              data.slips.splice(i, 1);
              store.set('slack', data);
              render();
            }, { danger: true, armedLabel: '？' })
          ]));
        });
        log.appendChild(list);
      }

      /* 一句话 */
      verdict.innerHTML = '';
      if (!total) {
        verdict.appendChild(el('p', { class: 'muted', style: 'margin:0', text: '记满一小时，这里会告诉你那一个小时本来能干什么。' }));
      } else {
        var top = Object.keys(byCat).map(function (k) { return { k: k, v: byCat[k] }; }).sort(function (a, b) { return b.v - a.v; })[0];
        var equivalent = asLife(total);
        var pickEq = equivalent[Math.floor(Math.random() * equivalent.length)];
        verdict.appendChild(el('p', { class: 'serif verdict-main', text: '你已经' + fmtMin(total) + '没能拿回来。' }));
        verdict.appendChild(el('p', { class: 'small muted', text: '最多的去处是「' + cat(top.k).n + '」，' + cat(top.k).why + '。' }));
        verdict.appendChild(el('p', { class: 'small', style: 'color:var(--lamp)' , text: '这差不多够' + pickEq + '。' }));
        verdict.appendChild(el('p', { class: 'small muted', style: 'margin-top:14px',
          text: '当然，这些时间不是"浪费"。有些事只有坐着发呆才做得出来。这儿只是把它记下来，让它别偷偷溜走。' }));
      }
    }

    function tile(k, v, s, color) {
      return el('div', { class: 'stat' }, [
        el('div', { class: 'k', text: k }),
        el('div', { class: 'v', style: color ? 'color:' + color : null, text: v }),
        el('div', { class: 's', text: s })
      ]);
    }
  }

  MZ.route('slack', { title: '拖延统计' }, mount);
})();
