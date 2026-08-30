/* ============================================================================
   FF.ui - shared page chrome: nav bar, team colors, tiny DOM helpers.
   Every page calls FF.ui.init() once, after store.js and field.js have loaded.
   ========================================================================== */
(function (FF) {
  'use strict';

  var NAV = [
    { href: 'index.html',    label: 'Home' },
    { href: 'roster.html',   label: 'Roster' },
    { href: 'plays.html',    label: 'Plays' },
    { href: 'schedule.html', label: 'Schedule' },
    { href: 'settings.html', label: 'Settings' }
  ];

  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function currentPage() {
    var f = location.pathname.split('/').pop();
    return f === '' ? 'index.html' : f;
  }

  /* ---------- coach mode ---------------------------------------------------
     The site defaults to read-only. Editing appears only on devices where the
     coach has switched it on, by visiting ?coach=1 once.

     This is a guardrail, NOT security. A static site has no server to check
     anything against, so any password would be checked in JavaScript that
     anyone can read - protection in appearance only. What this actually
     prevents is a parent or a kid wrecking their own copy of a play by
     accident and then believing the site is broken.
     ---------------------------------------------------------------------- */
  var COACH_KEY = 'ff.coach';

  function readCoach() {
    try { return localStorage.getItem(COACH_KEY) === '1'; }
    catch (e) { return false; }
  }

  function setCoach(on) {
    try {
      if (on) localStorage.setItem(COACH_KEY, '1');
      else localStorage.removeItem(COACH_KEY);
    } catch (e) { /* private mode: coach mode lasts for this page only */ }
    coachMode = !!on;
    document.documentElement.setAttribute('data-coach', coachMode ? '1' : '0');
  }

  var coachMode = false;

  function initCoach() {
    coachMode = readCoach();
    var flag = new URLSearchParams(location.search).get('coach');
    if (flag === '1' || flag === '0') setCoach(flag === '1');
    else document.documentElement.setAttribute('data-coach', coachMode ? '1' : '0');
  }

  function isCoach() { return coachMode; }

  function applyTeamColors() {
    var t = FF.store.team();
    var root = document.documentElement;
    root.style.setProperty('--team-primary', t.primaryColor || '#1B5E20');
    root.style.setProperty('--team-on-primary', t.secondaryColor || '#FFFFFF');
    document.title = (document.title ? document.title + ' - ' : '') + t.name;
  }

  /* Brand mark: the Spartan helmet, in the white version - the source art is
     dark green and would disappear against the dark green header. */
  function buildHeader() {
    var t = FF.store.team();
    var page = currentPage();

    var brand = h('a', { 'class': 'ff-brand', href: 'index.html' }, [
      h('img', { 'class': 'ff-brand-mark', src: 'icons/spartan-white.png',
        alt: '', width: '40', height: '40' }),
      h('span', { 'class': 'ff-brand-text' }, [
        h('strong', { text: t.name }),
        h('small', { text: t.season || '' })
      ])
    ]);

    var links = NAV.map(function (item) {
      return h('a', {
        href: item.href,
        'class': 'ff-nav-link' + (item.href === page ? ' is-current' : ''),
        text: item.label,
        'aria-current': item.href === page ? 'page' : 'false'
      });
    });

    var bar = h('div', { 'class': 'ff-header-bar' }, [brand]);

    /* Which mode this device is in was invisible before, which made a missing
       Edit button look like a bug rather than a setting. */
    if (coachMode) {
      bar.appendChild(h('a', { 'class': 'ff-coachbadge', href: 'settings.html',
        text: 'Coach', title: 'Coach mode is on for this device' }));
    }

    return h('header', { 'class': 'ff-header' }, [
      bar,
      h('nav', { 'class': 'ff-nav', 'aria-label': 'Main' }, links)
    ]);
  }

  /* A quiet reminder that this browser is holding unpublished edits. */
  function buildLocalEditsBanner() {
    if (!coachMode) return null;
    if (!FF.store.hasLocalEdits()) return null;
    return h('div', { 'class': 'ff-banner' }, [
      h('span', { text: 'You have unpublished changes saved in this browser.' }),
      h('a', { href: 'settings.html', text: 'Publish or reset' })
    ]);
  }

  var headerEl = null;

  /* Called after a save, so the "unpublished changes" notice can appear the
     moment the coach's first edit lands rather than on the next page load. */
  function refreshBanner() {
    if (!headerEl) return;
    var existing = document.querySelector('.ff-banner');
    if (existing) existing.remove();
    var banner = buildLocalEditsBanner();
    if (banner) headerEl.insertAdjacentElement('afterend', banner);
  }

  /* Registering the service worker is what lets the site open with no signal.
     It needs a secure origin, so it does nothing when the file is opened
     straight off disk - that is expected, not a failure. */
  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js')['catch'](function (err) {
        console.warn('Offline support unavailable:', err);
      });
    });
  }

  function init() {
    initCoach();
    FF.store.load();
    applyTeamColors();
    registerWorker();

    var mount = document.getElementById('ff-header') || document.body.firstChild;
    headerEl = buildHeader();
    if (mount && mount.id === 'ff-header') mount.replaceWith(headerEl);
    else document.body.insertBefore(headerEl, document.body.firstChild);

    refreshBanner();
  }

  FF.ui = {
    init: init, h: h, NAV: NAV,
    applyTeamColors: applyTeamColors,
    refreshBanner: refreshBanner,
    isCoach: isCoach, setCoach: setCoach
  };
})(window.FF = window.FF || {});
