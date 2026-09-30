/* ============================================================
   boot.js · 开门
   ============================================================ */
(function () {
  'use strict';
  var store = MZ.store;

  /* ---- 记录这次到访 ---- */
  var isNew = !store.get('firstVisit', null);
  var visits = MZ.bumpVisit();
  MZ.markToday();

  /* ---- 时机成就 ---- */
  var h = new Date().getHours();
  if ((h >= 2 && h < 5)) MZ.grant('night', true);
  if (visits >= 10) MZ.grant('return', true);
  if (MZ.badgeList().filter(function (b) { return b.got; }).length === MZ.BADGES.length) {
    setTimeout(function () { MZ.grant('all'); }, 1200);
  }

  /* ---- 绑定全局零件 ---- */
  MZ.ui.bindFooter();
  MZ.ui.bindMascot(function () { MZ.grant('first', true); });
  MZ.ui.bindKeys();

  /* ---- 卡片上的光标跟随 ---- */
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest ? e.target.closest('.shelf-card') : null;
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });

  /* ---- 路由 ---- */
  window.addEventListener('hashchange', function () { MZ.paint(); });
  MZ.paint(true);

  /* ---- 掉线提示（file:// 打开时不会有） ---- */
  window.addEventListener('offline', function () {
    MZ.toast('断网了', '不过没关系，这家店本来就不需要网', '🔌', 4000);
  });

  /* ---- 空间告急：在丢东西之前先说一声 ---- */
  (function () {
    if (!store.ok) {
      setTimeout(function () {
        MZ.toast('存不下东西', '浏览器不让这家店用本地存储（无痕模式？）。' +
          '这次关门，什么都不会留下。', '😶', 9000);
      }, 1600);
      return;
    }
    // 别每次开门都探 2MB，探一次就够，探完记下来下次再看
    var lastCheck = store.get('spaceCheckedAt', 0);
    var now = Date.now();
    if (now - lastCheck < 6 * 3600 * 1000) return;   // 6 小时内不重复探
    store.set('spaceCheckedAt', now);

    setTimeout(function () {
      var free = store.freeKB();
      if (free >= 0 && free < 512) {                 // 不到 512KB
        MZ.toast('地方不多了', '浏览器给的空间只剩 ' + free + ' KB 左右。' +
          '去档案室「导出存档」把东西带走，会安全些。', '🧯', 10000);
      }
    }, 1800);
  })();

  /* ---- 出错兜底，别让白屏吓着人 ---- */
  var seen = 0;
  window.addEventListener('error', function (e) {
    if (e && e.message && /ResizeObserver/.test(e.message)) return;
    console.error('[忘忧]', e.error || e.message);
    if (seen++ > 4) return;
    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:999;' +
      'background:#3a1520;border:1px solid #e88ba0;color:#f2ece1;padding:10px 14px;' +
      'border-radius:10px;font:12px/1.5 ui-monospace,monospace;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    bar.textContent = '⚠ ' + (e.message || '出错了');
    document.body.appendChild(bar);
  });

  /* ---- 欢迎 ---- */
  setTimeout(function () {
    if (isNew) {
      MZ.grant('first');
      setTimeout(function () {
        MZ.toast('门没锁', '所有东西都存在这台设备上，随时可以删干净', '🏮', 6500);
      }, 1200);
    } else {
      var left = 10 - visits;
      MZ.toast('又来了', left > 0 ? '再有 ' + left + ' 次点亮全部徽章' : '你已经是熟客了', '🔁', 3800);
    }
  }, 700);

  /* ---- 逛满一圈就提醒一下 ---- */
  var seenViews = store.get('seenViews', {});
  MZ.bus.on('enter:home', function () { seenViews = store.get('seenViews', {}); seenViews.home = 1; store.set('seenViews', seenViews); });
  Object.keys(seenViews).length;

  setInterval(function () {
    var dateNow = U_now();
    if (dateNow !== store.get('lastMidnightCheck', '')) {
      store.set('lastMidnightCheck', dateNow);
    }
  }, 60000);
  function U_now() {
    var d = new Date();
    return d.getFullYear() + '-' + MZ.util.pad2(d.getMonth() + 1) + '-' + MZ.util.pad2(d.getDate());
  }
})();
