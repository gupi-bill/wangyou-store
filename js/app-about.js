/* ============================================================
   app-about.js · 关于 & 迷路
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  function mountAbout(root) {
    var visits = store.get('visits', 0);
    var first = store.get('firstVisit', null);
    var days = Object.keys(store.get('days', {})).length;
    var letters = store.get('letters', []).length;
    var slips = store.get('slips', []).length;
    var draws = store.get('fateSpins', 0);
    var kb = store.get('kaleidoCount', 0);

    var facts = [
      ['网络请求', '0 次', '这页不加载任何外部资源，断网也能玩'],
      ['依赖库', '0 个', '全部原生，浏览器自带的东西够用了'],
      ['数据去处', '你的浏览器', 'localStorage，键名前缀 moyou:v1:'],
      ['账号', '不需要', '没登录，没邮箱，没埋点'],
      ['体积', '几十 KB', '比一张手机截图还小']
    ];

    root.innerHTML = '';
    root.appendChild(MZ.ui.pageHead('about', '关于这家店',
      '其实没什么好说的。但既然你走到这儿了，那还是说两句。'));

    var grid = el('div', { class: 'grid c2', style: 'margin-bottom:34px' });
    facts.forEach(function (f) {
      grid.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'eyebrow', text: f[0] }),
        el('div', { class: 'h-md serif', style: 'color:var(--lamp);margin:2px 0 6px', text: f[1] }),
        el('p', { class: 'small muted', style: 'margin:0', text: f[2] })
      ]));
    });
    root.appendChild(grid);

    root.appendChild(el('div', { class: 'card pad-lg', style: 'margin-bottom:34px' }, [
      el('div', { class: 'eyebrow', text: '设计说明' }),
      el('div', { class: 'prose' }, [
        el('p', { text: '它长得暗，是因为深夜的灯本来就比白天的灯好看。它响的地方都在右上角，因为耳朵在那边。它不弹窗，因为弹窗是别人家推销的方式。' }),
        el('p', { text: '五个应用里，电台和万花筒是纯合成的——没有任何音频或图片素材，所有声音由 Web Audio 的振荡器和噪声实时生成，所有图案由算法画出来。这既是技术选择，也是懒：省下载，也省硬盘。' }),
        el('p', { text: '命运老虎机里的那些建议是写死的，一共 ' + (window.MZ_JOBS || []).length + ' 条。它不智能，不联网，不看你。它只是每次都随机抽一条给你，然后闭嘴。这有时候比智能更有用。' }),
        el('p', { text: '给未来写信的封印是软的：改一下系统时间就能提前拆。所以那不是保险，是一整个承诺。' })
      ])
    ]));

    /* 你的数字 */
    var stat = el('div', { class: 'card pad-lg', style: 'margin-bottom:34px' }, [
      el('div', { class: 'eyebrow', text: '你的数字' }),
      el('div', { class: 'grid six' }, [
        s('来过', visits, '次', '推门次数'),
        s('到店', days, '天', '有记录的日子'),
        s('转过', draws, '次', '命运替你做的决定'),
        s('寄出', letters, '封', '还没拆的也算'),
        s('写下', slips, '条', '时间的去向'),
        s('拧出', kb, '张', '万花筒配方')
      ])
    ]);
    if (first) {
      stat.appendChild(el('p', { class: 'small muted mono', style: 'margin:18px 0 0',
        text: '第一次推门：' + new Date(first).toLocaleString('zh-CN') }));
    }
    root.appendChild(stat);

    /* 数据 */
    root.appendChild(el('div', { class: 'card pad-lg', style: 'margin-bottom:34px' }, [
      el('div', { class: 'eyebrow', text: '你的东西' }),
      el('p', { class: 'small muted', text: '都在这台设备上。你可以随时带走，也可以随时烧掉。' }),
      el('div', { class: 'row', style: 'margin-top:14px' }, [
        el('button', { class: 'btn', onclick: MZ.ui.exportSave }, ['导出存档（一个 json）']),
        el('button', { class: 'btn', onclick: function () { document.getElementById('import-file').click(); } }, ['导入存档']),
        el('span', { class: 'spacer' }),
        MZ.ui.confirmBtn('全部清空', MZ.ui.wipeAll, { danger: true, armedLabel: '真的要清空？' })
      ])
    ]));

    /* 快捷键 */
    var keys = [['← →', '顺着货架走'], ['g', '往前跳两格'], ['/', '下一格'],
                ['Esc', '回门口'], ['空格', '在老虎机上转一条'], ['?', '把这些字叫出来']];
    var kcard = el('div', { class: 'card', style: 'margin-bottom:34px' }, [
      el('div', { class: 'eyebrow', text: '快捷键' })
    ]);
    var kgrid = el('div', { class: 'grid c3' });
    keys.forEach(function (k) {
      kgrid.appendChild(el('div', { class: 'kbd-row' }, [
        el('kbd', { text: k[0] }),
        el('span', { class: 'small muted', text: k[1] })
      ]));
    });
    kcard.appendChild(kgrid);
    root.appendChild(kcard);

    /* 保修 */
    root.appendChild(el('div', { class: 'card pad-lg' }, [
      el('div', { class: 'eyebrow', text: '保修条款' }),
      el('ul', { class: 'terms' }, [
        el('li', { text: '本店不保证能解决你的任何问题。' }),
        el('li', { text: '本店保证不主动询问你的任何问题。' }),
        el('li', { text: '本店灯泡随时可能坏，请不要依赖本店照明。' }),
        el('li', { text: '关门时间是明天。' })
      ])
    ]));

    function s(k, v, u, sub) {
      return el('div', { class: 'stat' }, [
        el('div', { class: 'k', text: k }),
        el('div', { class: 'v' }, [String(v), el('span', { style: 'font-size:13px;opacity:.6;margin-left:3px', text: u })]),
        el('div', { class: 's', text: sub })
      ]);
    }
  }

  function mountLost(root) {
    root.innerHTML = '';
    var names = null;
    var box = el('div', { class: 'card pad-lg center', style: 'max-width:640px;margin:6vh auto 0' }, [
      el('div', { style: 'font-size:44px;line-height:1', text: '🚪' }),
      el('h1', { class: 'h-lg', text: '这扇门后面没有房间' }),
      el('p', { class: 'lede', style: 'margin:0 auto 22px', text: '你敲的这扇门不在货架清单上。也许它还没造出来，也许它已经被拆了。' }),
      el('div', { class: 'row', style: 'justify-content:center' }, [
        el('a', { class: 'btn primary', href: '#/home' }, ['回门口']),
        el('a', { class: 'btn ghost', href: '#/archive' }, ['去档案室'])
      ])
    ]);
    root.appendChild(box);
  }

  MZ.route('about', { title: '关于' }, mountAbout);
  MZ.route('lost', { title: '这扇门后面没有房间' }, mountLost);
})();
