/* ============================================================
   忘忧小卖部 · ui.js
   跨页面共用的小零件
   ============================================================ */
(function () {
  'use strict';
  var U = MZ.util, store = MZ.store, el = U.el;

  /* ---------------- 数字滚动 ---------------- */
  function countUp(node, to, dur, fmt) {
    var from = 0, t0 = null, d = dur || 900;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = MZ.util.clamp((t - t0) / d, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = from + (to - from) * e;
      node.textContent = fmt ? fmt(v) : Math.round(v);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- 成就墙 ---------------- */
  function badgeWall(opts) {
    opts = opts || {};
    var list = MZ.badgeList();
    var got = list.filter(function (b) { return b.got; }).length;

    var wrap = el('div', { class: 'badge-wall' });
    list.forEach(function (b) {
      var node = el('button', {
        class: 'badge' + (b.got ? ' got' : ''),
        type: 'button',
        title: b.got ? b.name + ' — ' + b.desc + '（' + new Date(b.at).toLocaleDateString('zh-CN') + '）' : '还没解锁：' + b.desc,
        'aria-label': b.got ? b.name + ' 已解锁' : b.name + ' 未解锁',
        onclick: function () {
          if (b.got) MZ.toast(b.icon + ' ' + b.name, b.desc, b.icon);
          else MZ.toast('还锁着：' + b.name, b.desc, '🔒', 3200);
        }
      }, [
        el('span', { class: 'badge-ic', 'aria-hidden': 'true', text: b.got ? b.icon : '·' }),
        el('span', { class: 'badge-name', text: b.name })
      ]);
      wrap.appendChild(node);
    });

    var head = el('div', { class: 'row between', style: 'margin-bottom:14px' }, [
      el('div', { class: 'eyebrow', text: opts.title || '成就墙' }),
      el('span', { class: 'pill' + (got === list.length ? ' lamp' : ''), text: got + ' / ' + list.length })
    ]);

    return el('div', {}, [head, wrap]);
  }

  /* ---------------- 章节标题 ---------------- */
  function head(eyebrow, title, lede) {
    return el('header', { class: 'page-head' }, [
      el('div', { class: 'eyebrow', text: eyebrow }),
      el('h1', { class: 'h-xl', id: (title && '' ) + '', text: title }),
      lede ? el('p', { class: 'lede', text: lede }) : null
    ]);
  }

  function pageHead(eyebrow, title, lede, extra) {
    return el('div', { class: 'page-head' }, [
      extra ? el('div', { class: 'page-extra' }, [extra]) : null,
      el('div', { class: 'eyebrow', text: eyebrow }),
      el('h1', { class: 'h-xl', text: title }),
      lede ? el('p', { class: 'lede', text: lede }) : null
    ]);
  }

  /* ---------------- 存盘 / 读盘 ---------------- */
  function exportSave() {
    var payload = store.exportAll();
    U.downloadText('忘忧小卖部-存档-' + U.ymd() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    MZ.toast('存档已导出', Object.keys(payload.data).length + ' 项数据，含在这一张纸里了', '📦');
  }

  function importSave(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var n = store.importAll(JSON.parse(fr.result));
        MZ.toast('存档已导入', n + ' 项数据回来了', '📥');
        setTimeout(function () { location.reload(); }, 900);
      } catch (e) {
        MZ.toast('导不进去', e.message, '🧯', 5000);
      }
    };
    fr.onerror = function () { MZ.toast('读不了这个文件', '', '🧯'); };
    fr.readAsText(file);
  }

  function wipeAll() {
    if (!confirm('把所有数据清空？包括你的记录、收藏和没拆的信。\n这一步没法撤销。')) return;
    if (!confirm('真的真的清空？')) return;
    store.wipe();
    MZ.toast('都清掉了', '门还开着，你可以重新开始', '🧹');
    setTimeout(function () { location.reload(); }, 1000);
  }

  function bindFooter() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.foot-btn') : null;
      if (!b) return;
      var act = b.dataset.act;
      if (act === 'export') exportSave();
      else if (act === 'import') document.getElementById('import-file').click();
      else if (act === 'wipe') wipeAll();
    });
    var f = document.getElementById('import-file');
    if (f) f.addEventListener('change', function () {
      if (f.files && f.files[0]) importSave(f.files[0]);
      f.value = '';
    });
  }

  /* ---------------- 彩蛋：连点品牌图标 ---------------- */
  function bindMascot(onUnlock) {
    var mark = document.querySelector('.brand .mark');
    if (!mark) return;
    var n = 0, t = null;
    mark.addEventListener('click', function () {
      n++;
      clearTimeout(t);
      t = setTimeout(function () { n = 0; }, 1200);
      mark.style.transform = 'rotate(' + (n * 37) % 360 + 'deg) scale(1.15)';
      setTimeout(function () { mark.style.transform = ''; }, 180);
      if (n === 7) {
        n = 0;
        MZ.toast('你戳了七下', '本店老板是个很闲的人，接受这个设定', '🏮');
        MZ.whisper('戳了老板七下');
        if (onUnlock) onUnlock();
      }
    });
  }

  /* ---------------- 键盘快捷键 ---------------- */
  function bindKeys() {
    var ORDER = ['home', 'radio', 'kaleido', 'fate', 'slack', 'letter', 'archive', 'about'];
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.key === '/' || e.key === 'g') {
        var i = ORDER.indexOf(MZ.resolve());
        var n = e.key === '/' ? i + 1 : (i + 2) % ORDER.length;
        MZ.go(ORDER[n % ORDER.length]);
        e.preventDefault();
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        MZ.toast('快捷键', '← → 或 g 切换货架 · Esc 回到门口', '⌨', 4200);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.querySelector('.toast-wrap')) { /* 吐司在的时候不乱跳 */ }
      var i = ORDER.indexOf(MZ.resolve());
      if (i < 0) return;
      var d = e.key === 'ArrowRight' ? 1 : -1;
      MZ.go(ORDER[(i + d + ORDER.length) % ORDER.length]);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && MZ.resolve() !== 'home') MZ.go('home');
    });
  }

  /* ---------------- 图表：简易条形 ---------------- */
  function bars(data, opt) {
    opt = opt || {};
    var max = opt.max || Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    var summary = data.map(function (d) { return d.k + ' ' + d.v + (opt.unit || ''); }).join('，');
    var wrap = el('div', {
      class: 'bar-chart',
      role: 'img',
      'aria-label': (opt.label || '柱状图') + '：' + summary
    });
    data.forEach(function (d) {
      var col = el('div', { class: 'bar-col', title: d.k + ' · ' + d.v + (opt.unit || '') });
      var bar = el('div', { class: 'bar' });
      bar.style.setProperty('--h', (max ? (d.v / max) * 100 : 0) + '%');
      bar.style.setProperty('--c', d.c || 'var(--lamp)');
      if (opt.anim !== false) {
        bar.classList.add('rise');
        bar.style.animationDelay = (data.indexOf(d) * 55) + 'ms';
      }
      col.appendChild(bar);
      col.appendChild(el('span', { class: 'bar-k', text: d.k }));
      col.appendChild(el('span', { class: 'bar-v', text: opt.fmt ? opt.fmt(d.v) : String(d.v) }));
      wrap.appendChild(col);
    });
    return wrap;
  }

  /* ---------------- 环形进度 ---------------- */
  function ring(pct, label, sub, color) {
    var p = MZ.util.clamp(pct, 0, 100);
    var box = el('div', { class: 'ring' });
    box.style.setProperty('--p', p);
    box.style.setProperty('--c', color || 'var(--lamp)');
    box.appendChild(el('div', { class: 'ring-in' }, [
      el('div', { class: 'ring-v', text: label != null ? label : Math.round(p) + '%' }),
      sub ? el('div', { class: 'ring-s', text: sub }) : null
    ]));
    return box;
  }

  /* ---------------- 复制按钮 ---------------- */
  function copyBtn(getText, label) {
    return el('button', {
      class: 'btn sm', type: 'button',
      onclick: function () {
        var t = getText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(t).then(function () {
            MZ.toast('复制好了', label || '', '📋', 2400);
          }, function () { fallback(); });
        } else fallback();
        function fallback() {
          var ta = el('textarea', { style: 'position:fixed;opacity:0' });
          ta.value = t; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); MZ.toast('复制好了', '', '📋', 2200); } catch (e) { MZ.toast('复制失败', '手动选中吧', '😶'); }
          document.body.removeChild(ta);
        }
      }
    }, ['复制']);
  }

  /* ---------------- 确认删除的按钮（点两下） ---------------- */
  function confirmBtn(label, onYes, opts) {
    opts = opts || {};
    var armed = false, t = null;
    var b = el('button', { class: 'btn sm ghost ' + (opts.danger ? 'danger' : ''), type: 'button', text: label });
    b.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        b.textContent = opts.armedLabel || '真的要？';
        b.classList.add('armed');
        clearTimeout(t);
        t = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove('armed'); }, 3000);
        return;
      }
      clearTimeout(t);
      armed = false;
      b.textContent = label;
      b.classList.remove('armed');
      onYes();
    });
    return b;
  }

  MZ.ui = {
    countUp: countUp, badgeWall: badgeWall, pageHead: pageHead, head: head,
    exportSave: exportSave, importSave: importSave, wipeAll: wipeAll,
    bindFooter: bindFooter, bindMascot: bindMascot, bindKeys: bindKeys,
    bars: bars, ring: ring, copyBtn: copyBtn, confirmBtn: confirmBtn
  };
})();
