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

  function applyTeamColors() {
    var t = FF.store.team();
    var root = document.documentElement;
    root.style.setProperty('--team-primary', t.primaryColor || '#1B5E20');
    root.style.setProperty('--team-on-primary', t.secondaryColor || '#FFFFFF');
    document.title = (document.title ? document.title + ' - ' : '') + t.name;
  }

  /* Brand mark: a football, drawn inline so it inherits the header color and
     stays crisp at any size. No external image to load or path to get wrong. */
  var BALL_SVG =
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<g transform="rotate(-24 16 16)">' +
        '<path d="M 3 16 Q 16 7.4 29 16 Q 16 24.6 3 16 Z" ' +
              'fill="currentColor" stroke="currentColor" stroke-width="1" ' +
              'stroke-linejoin="round"/>' +
        '<g class="ff-ball-laces">' +
          '<path d="M 10.5 16 H 21.5"/>' +
          '<path d="M 12.2 13.6 V 18.4"/>' +
          '<path d="M 15 13.2 V 18.8"/>' +
          '<path d="M 17.8 13.2 V 18.8"/>' +
          '<path d="M 20.6 13.6 V 18.4"/>' +
        '</g>' +
      '</g>' +
    '</svg>';

  function buildHeader() {
    var t = FF.store.team();
    var page = currentPage();

    var brand = h('a', { 'class': 'ff-brand', href: 'index.html' }, [
      h('span', { 'class': 'ff-brand-mark', html: BALL_SVG }),
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

    return h('header', { 'class': 'ff-header' }, [
      h('div', { 'class': 'ff-header-bar' }, [brand]),
      h('nav', { 'class': 'ff-nav', 'aria-label': 'Main' }, links)
    ]);
  }

  /* A quiet reminder that this browser is holding unpublished edits. */
  function buildLocalEditsBanner() {
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
    refreshBanner: refreshBanner
  };
})(window.FF = window.FF || {});
