/* ============================================================
   app-letter.js · 给未来写信
   封印是软的：把系统时间往回调就能提前拆。
   所以那不是保险，是一整个承诺。
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  var WHEN = [
    { d: 3, n: '三天后' }, { d: 7, n: '一周后' }, { d: 30, n: '一个月后' },
    { d: 90, n: '三个月后' }, { d: 180, n: '半年后' }, { d: 365, n: '一年后' }
  ];

  var PROMPTS = [
    '你现在最想说的一句话是什么？',
    '今天有什么想不起来的好事？写下来，以后你会需要它。',
    '如果一年后的你看到这封信，你希望 ta 知道现在的什么？',
    '写下一个你现在觉得为难、但以后可能会庆幸的选择。',
    '今天有没有一个瞬间，你希望它能停久一点？',
    '有什么你现在不好意思承认的事？反正一年后没人记得。',
    '给未来的自己留一个具体的提醒：某天要做某件事。',
    '写点没用的。真的，写点没用的。',
    '你最想让他知道，你今天是怎么撑过来的。',
    '你今天原谅自己了吗？没写在这里也行。'
  ];

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '.' + U.pad2(d.getMonth() + 1) + '.' + U.pad2(d.getDate());
  }

  function daysLeft(ts) {
    var now = new Date();
    var due = new Date(ts);
    return Math.ceil((due - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  }

  function mount(root) {
    var letters = store.get('letters', []);
    var writing = false;

    root.innerHTML = '';
    root.appendChild(MZ.ui.pageHead('letter · 05', '给未来写信',
      '写给以后的自己，然后上锁。不到日子拆不开——好吧，其实改一下系统时间也能拆。但那就不是同一件事了。',
      el('span', { class: 'pill lamp', id: 'letter-count', text: letters.length ? letters.length + ' 封' : '还没有信' })));

    var listBox = el('div', { class: 'letter-list' });
    var writeBox = el('div', { class: 'card pad-lg', style: 'margin-bottom:22px' });

    /* ---- 写 ---- */
    function renderWrite() {
      writeBox.innerHTML = '';
      if (!writing) {
        writeBox.appendChild(el('div', { class: 'row between' }, [
          el('div', {}, [
            el('div', { class: 'eyebrow', text: '写信' }),
            el('p', { class: 'small muted', style: 'margin:0', text: '信不会寄出去，也不会消失。它就躺在这儿等你回来。' })
          ]),
          el('button', { class: 'btn primary', type: 'button', onclick: function () { writing = true; renderWrite(); } }, ['✍ 写一封'])
        ]));
        return;
      }

      var head = el('input', { class: 'input', type: 'text', maxlength: '30', placeholder: '标题（可以不写）' });
      var body = el('textarea', { class: 'textarea', rows: '7', maxlength: '2000', placeholder: U.pick(Math.random, PROMPTS) });
      var counter = el('em', { text: '0 / 2000' });
      body.addEventListener('input', function () { counter.textContent = body.value.length + ' / 2000'; });

      var whenDays = 30;
      var whenCustom = '';
      var whenRow = el('div', { class: 'field' }, [
        el('span', { class: 'lab' }, ['什么时候拆', el('em', { id: 'when-hint', text: '一个月后' })])
      ]);
      var wseg = el('div', { class: 'seg seg-wrap' });
      var wbtns = [];
      WHEN.forEach(function (w) {
        var b = el('button', { class: 'seg-b', type: 'button', text: w.n });
        b.addEventListener('click', function () {
          whenDays = w.d; whenCustom = '';
          wbtns.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
          b.setAttribute('aria-selected', 'true');
          whenRow.querySelector('#when-hint').textContent = w.n;
          var d = new Date(); d.setDate(d.getDate() + w.d);
          whenRow.querySelector('#when-date').textContent = fmtDate(d.getTime());
        });
        if (w.d === 30) b.setAttribute('aria-selected', 'true');
        wbtns.push(b);
        wseg.appendChild(b);
      });
      whenRow.appendChild(wseg);

      var custom = el('input', { class: 'input', type: 'date', style: 'margin-top:10px', min: U.ymd() });
      custom.addEventListener('change', function () {
        whenCustom = custom.value;
        if (whenCustom) {
          wbtns.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
          whenRow.querySelector('#when-hint').textContent = '自定义';
        }
      });
      whenRow.appendChild(custom);
      whenRow.appendChild(el('div', { class: 'small muted mono', style: 'margin-top:6px' }, [
        '大约在 ', el('span', { id: 'when-date', text: fmtDate(Date.now() + 30 * 86400000) }), ' 可以拆'
      ]));

      writeBox.appendChild(el('label', { class: 'field' }, [el('span', { class: 'lab' }, ['收件人', el('em', { text: '就是你自己' })]),
        el('input', { class: 'input', type: 'text', value: '以后的自己', disabled: true })]));
      writeBox.appendChild(el('label', { class: 'field' }, [el('span', { class: 'lab' }, ['标题', el('em', { text: '选填' })]), head]));
      writeBox.appendChild(el('label', { class: 'field' }, [el('span', { class: 'lab' }, ['正文', counter]), body]));
      writeBox.appendChild(whenRow);

      writeBox.appendChild(el('div', { class: 'row', style: 'margin-top:6px' }, [
        el('button', { class: 'btn primary', type: 'button', onclick: function () {
          var txt = body.value.trim();
          if (txt.length < 2) { MZ.toast('太短了', '至少写点什么吧', '✉️', 2600); return; }
          var due = whenCustom ? new Date(whenCustom + 'T09:00:00').getTime() : Date.now() + whenDays * 86400000;
          letters.unshift({
            id: 'L' + Date.now().toString(36),
            t: head.value.trim() || '（无题）',
            b: txt,
            from: Date.now(),
            due: due,
            opened: null,
            early: false
          });
          if (letters.length > 60) letters.pop();
          store.set('letters', letters);
          writing = false;
          MZ.grant('letter');
          MZ.ding(660, .24);
          MZ.toast('封好了', fmtDate(due) + ' 才能拆', '✉️', 4200);
          render();
        } }, ['封起来']),
        el('button', { class: 'btn ghost', type: 'button', onclick: function () { writing = false; renderWrite(); } }, ['算了'])
      ]));
    }

    /* ---- 列表 ---- */
    function renderList() {
      listBox.innerHTML = '';
      if (!letters.length) {
        listBox.appendChild(el('div', { class: 'empty' }, [
          el('span', { class: 'big', text: '✉️' }),
          '信箱是空的。写一封吧，哪怕只写一句"你还好吗"。'
        ]));
        return;
      }
      letters.forEach(function (L, idx) {
        var d = daysLeft(L.due);
        var ripe = d <= 0;
        var box = el('article', { class: 'letter' + (L.opened ? ' opened' : '') + (ripe ? ' ripe' : '') });

        box.appendChild(el('div', { class: 'letter-top' }, [
          el('span', { class: 'letter-seal', 'aria-hidden': 'true', text: L.opened ? '📭' : '🔒' }),
          el('div', { class: 'letter-b' }, [
            el('div', { class: 'letter-t', text: L.t }),
            el('div', { class: 'letter-d mono small muted', text: '写于 ' + fmtDate(L.from) + ' · 限 ' + fmtDate(L.due) + ' 拆' })
          ]),
          el('span', { class: 'letter-left mono', text: L.opened ? ('拆于 ' + fmtDate(L.opened)) : (ripe ? '可以拆了' : '还有 ' + d + ' 天') })
        ]));

        if (L.opened) {
          box.appendChild(el('pre', { class: 'letter-body', text: L.b }));
          if (L.early) box.appendChild(el('div', { class: 'small', style: 'color:var(--rose)', text: '✂ 这封被提前拆了。承诺没守住，但也不算全错。' }));
        } else {
          box.appendChild(el('div', { class: 'letter-veil' }, [
            el('div', { class: 'veil-lines' }),
            el('div', { class: 'small muted center', text: ripe ? '日子到了。' : '还有 ' + d + ' 天。别偷看。' })
          ]));
        }

        var row = el('div', { class: 'letter-actions' });
        if (!L.opened) {
          row.appendChild(el('button', { class: 'btn ' + (ripe ? 'primary' : ''), type: 'button', onclick: function () {
            if (!ripe) {
              if (!confirm('还没到日子。\n\n真的要现在拆开吗？拆了就回不去了。')) return;
              L.early = true;
            }
            L.opened = Date.now();
            store.set('letters', letters);
            MZ.grant('open');
            MZ.ding(520, .3);
            render();
            setTimeout(function () {
              var node = listBox.querySelectorAll('.letter')[idx];
              if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
          } }, [ripe ? '拆开' : '非要看一眼']));
        }
        row.appendChild(el('span', { class: 'spacer' }));
        row.appendChild(MZ.ui.confirmBtn('烧掉', function () {
          letters.splice(idx, 1);
          store.set('letters', letters);
          MZ.toast('烧了', '连你自己都读不到了', '🔥', 3600);
          render();
        }, { danger: true, armedLabel: '烧掉？' }));
        box.appendChild(row);
        listBox.appendChild(box);
      });
      updateStat();
    }

    function render() {
      renderWrite();
      renderList();
      var c = document.getElementById('letter-count');
      if (c) c.textContent = letters.length ? letters.length + ' 封' : '还没有信';
    }

    root.appendChild(writeBox);
    root.appendChild(el('div', { class: 'row between', style: 'margin-bottom:12px' }, [
      el('h2', { class: 'h-md', style: 'margin:0', text: '信箱' }),
      el('span', { class: 'small muted', id: 'letter-stat' })
    ]));
    root.appendChild(listBox);

    renderWrite();
    renderList();

    function updateStat() {
      var n = document.getElementById('letter-stat');
      if (!n) return;
      var unopened = letters.filter(function (l) { return !l.opened; });
      if (!unopened.length) { n.textContent = letters.length ? '全拆完了' : ''; return; }
      var soonest = unopened.slice().sort(function (a, b) { return a.due - b.due; })[0];
      n.textContent = unopened.length + ' 封还锁着，最近的一封 ' + fmtDate(soonest.due) + ' 到期';
    }
  }

  MZ.route('letter', { title: '给未来写信' }, mount);
})();
