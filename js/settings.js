/* ============================================================================
   Settings - team info, field rules, and the data in/out that makes the
   publish workflow work.

   This is the only page that can move data out of this browser, so it is also
   the only backup the coach has. See README.md for the publish steps.
   ========================================================================== */
(function (FF) {
  'use strict';

  var saveStateEl;

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }

  function flagSaved(msg) {
    if (!saveStateEl) return;
    saveStateEl.textContent = msg || 'Saved';
    saveStateEl.classList.add('is-on');
    clearTimeout(flagSaved._t);
    flagSaved._t = setTimeout(function () { saveStateEl.classList.remove('is-on'); }, 1800);
  }

  var saveTimer = null;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      FF.store.save();
      FF.ui.refreshBanner();
      FF.ui.applyTeamColors();
      flagSaved();
    }, 300);
  }

  /* ---------- field builders ---------------------------------------------- */

  function textRow(host, label, get, set, attrs) {
    host.appendChild(h('label', { 'class': 'ff-field-label', text: label }));
    var input = h('input', Object.assign({ type: 'text', value: get() }, attrs || {}));
    input.addEventListener('input', function () { set(input.value); saveSoon(); });
    host.appendChild(input);
  }

  function numberRow(host, label, get, set, attrs) {
    host.appendChild(h('label', { 'class': 'ff-field-label', text: label }));
    var input = h('input', Object.assign({ type: 'number', value: String(get()) }, attrs || {}));
    input.addEventListener('change', function () {
      var v = parseFloat(input.value);
      if (isNaN(v)) { input.value = String(get()); return; }
      set(v);
      input.value = String(get());
      saveSoon();
    });
    host.appendChild(input);
  }

  function colorRow(host, label, get, set) {
    host.appendChild(h('label', { 'class': 'ff-field-label', text: label }));
    var wrap = h('div', { 'class': 'ff-colorrow' });
    var swatch = h('input', { type: 'color', value: get() });
    var hex = h('input', { type: 'text', value: get(), 'class': 'ff-hex' });

    function apply(v) {
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
      set(v);
      swatch.value = v;
      hex.value = v;
      saveSoon();
    }
    swatch.addEventListener('input', function () { apply(swatch.value); });
    hex.addEventListener('change', function () { apply(hex.value.trim()); });

    wrap.appendChild(swatch);
    wrap.appendChild(hex);
    host.appendChild(wrap);
  }

  /* ---------- sections ----------------------------------------------------- */

  function renderTeam() {
    var host = document.getElementById('teamSection');
    var t = FF.store.team();

    textRow(host, 'Team name', function () { return t.name; },
      function (v) { t.name = v; });
    textRow(host, 'Season', function () { return t.season || ''; },
      function (v) { t.season = v; });
    colorRow(host, 'Primary color (header, buttons)',
      function () { return t.primaryColor || '#17401A'; },
      function (v) { t.primaryColor = v; });
    colorRow(host, 'Lettering color',
      function () { return t.secondaryColor || '#FFFFFF'; },
      function (v) { t.secondaryColor = v; });
  }

  function renderField() {
    var host = document.getElementById('fieldSection');
    var s = FF.store.settings();

    numberRow(host, 'Field width (yards)', function () { return s.fieldWidthYards; },
      function (v) { s.fieldWidthYards = v; }, { min: '10', max: '60', step: '1' });
    numberRow(host, 'Playing field length (yards, goal line to goal line)',
      function () { return s.playingFieldLengthYards; },
      function (v) { s.playingFieldLengthYards = v; }, { min: '20', max: '120', step: '1' });
    numberRow(host, 'End zone depth (yards)', function () { return s.endZoneDepthYards; },
      function (v) { s.endZoneDepthYards = v; }, { min: '5', max: '20', step: '1' });
    numberRow(host, 'First down line (yards from your own goal line)',
      function () { return s.firstDownLineYards; },
      function (v) { s.firstDownLineYards = v; }, { min: '1', max: '100', step: '1' });
    numberRow(host, 'Possession starts at your own (yard line)',
      function () { return s.defaultStartingYardLine; },
      function (v) { s.defaultStartingYardLine = v; }, { min: '0', max: '50', step: '1' });
    numberRow(host, 'Rush line — how far back a rusher must start (yards)',
      function () { return s.noRushZoneYards; },
      function (v) { s.noRushZoneYards = v; }, { min: '0', max: '20', step: '0.5' });
    numberRow(host, 'Pass speed (yards per second)',
      function () { return s.passSpeedYardsPerSecond; },
      function (v) { s.passSpeedYardsPerSecond = v; }, { min: '5', max: '40', step: '1' });
  }

  /* Who may receive the ball. The one hard rule is that the QB can never carry
     it, so he is never on either list; everything else is the coach's call. */
  function checkGroup(host, label, hint, ids, get, set) {
    host.appendChild(h('label', { 'class': 'ff-field-label', text: label }));
    if (hint) host.appendChild(h('p', { 'class': 'ff-small ff-muted', text: hint }));

    var wrap = h('div', { 'class': 'ff-checks' });
    ids.forEach(function (id) {
      var box = h('input', { type: 'checkbox', id: 'chk-' + label.replace(/\W/g, '') + '-' + id });
      box.checked = get().indexOf(id) !== -1;
      box.addEventListener('change', function () {
        var next = ids.filter(function (candidate) {
          return candidate === id ? box.checked : get().indexOf(candidate) !== -1;
        });
        set(next);
        saveSoon();
      });
      var lab = h('label', { 'class': 'ff-check', for: box.id });
      lab.appendChild(box);
      lab.appendChild(h('span', { text: id }));
      wrap.appendChild(lab);
    });
    host.appendChild(wrap);
  }

  function renderBallRules() {
    var host = document.getElementById('ballSection');
    var s = FF.store.settings();
    var ids = (s.offensePositions || [])
      .map(function (p) { return p.id; })
      .filter(function (id) { return id !== 'QB'; });

    checkGroup(host, 'Can take a handoff',
      'A jet sweep to X counts, so X belongs here as much as Y and Z.',
      ids,
      function () { return s.handoffEligiblePositions || []; },
      function (v) { s.handoffEligiblePositions = v; });

    checkGroup(host, 'Can catch a pass',
      'The Center is an eligible receiver in this league once he has snapped it.',
      ids,
      function () { return s.passEligiblePositions || []; },
      function (v) { s.passEligiblePositions = v; });
  }

  /* Say plainly whether this device is actually set up to work offline, so
     the coach is not guessing at the field. */
  function renderOfflineState() {
    var el = document.getElementById('offlineState');
    if (!el) return;

    if (!('serviceWorker' in navigator)) {
      el.className = 'ff-note is-warn';
      el.textContent = 'This browser cannot store the site for offline use.';
      return;
    }
    if (location.protocol === 'file:') {
      el.className = 'ff-note';
      el.textContent = 'You are viewing a local copy of the files. '
        + 'Offline install only works from the published site.';
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && navigator.serviceWorker.controller) {
        el.className = 'ff-note is-ok';
        el.textContent = 'Ready — this device already has the site stored '
          + 'and will open without a connection.';
      } else if (reg) {
        el.className = 'ff-note';
        el.textContent = 'Storing the site now. Reload once and it will be '
          + 'ready to use offline.';
      } else {
        el.className = 'ff-note';
        el.textContent = 'Not stored on this device yet. Reload the page once '
          + 'while online.';
      }
    })['catch'](function () { /* nothing useful to say */ });
  }

  function renderStats() {
    var d = FF.store.get();
    document.getElementById('stats').textContent =
      d.roster.length + ' players · ' + d.plays.length + ' plays · '
      + d.practices.length + ' events';
  }

  /* ---------- data in / out ------------------------------------------------ */

  function renderData() {
    var host = document.getElementById('dataSection');

    var pub = h('button', { type: 'button', 'class': 'ff-btn',
      text: '⬇ Export publish file' });
    pub.addEventListener('click', function () {
      FF.store.exportPublishFile();
      flagSaved('Downloaded team-data.js');
    });

    var bak = h('button', { type: 'button', 'class': 'ff-btn secondary',
      text: '⬇ Export backup (.json)' });
    bak.addEventListener('click', function () {
      FF.store.exportBackup();
      flagSaved('Downloaded team-data.json');
    });

    host.appendChild(h('div', { 'class': 'ff-toolbar' }, [pub, bak]));

    /* --- import --- */
    host.appendChild(h('div', { 'class': 'ff-field-label', text: 'Import a file' }));
    var file = h('input', { type: 'file', accept: '.js,.json,application/json,text/javascript' });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!window.confirm('Import "' + f.name + '"?\n\n'
          + 'This replaces everything currently in this browser — roster, plays, '
          + 'plays and schedule.')) { file.value = ''; return; }

      var reader = new FileReader();
      reader.onload = function () {
        try {
          FF.store.importFromText(String(reader.result));
          alert('Imported. The page will reload.');
          location.reload();
        } catch (err) {
          alert('That file could not be imported.\n\n' + err.message);
          file.value = '';
        }
      };
      reader.readAsText(f);
    });
    host.appendChild(file);

    /* --- reset --- */
    var reset = h('button', { type: 'button', 'class': 'ff-btn danger',
      text: 'Reset to published version' });
    reset.addEventListener('click', function () {
      if (!window.confirm('Throw away every change made in this browser?\n\n'
          + 'Everything goes back to whatever is in data/team-data.js. '
          + 'If you have not exported, this cannot be undone.')) return;
      FF.store.resetToPublished();
      location.reload();
    });
    host.appendChild(h('div', { 'class': 'ff-panel-foot' }, [reset]));
  }

  /* ---------- boot --------------------------------------------------------- */

  function init() {
    FF.ui.init();
    saveStateEl = document.getElementById('saveState');
    renderTeam();
    renderField();
    renderBallRules();
    renderData();
    renderStats();
    renderOfflineState();

    window.addEventListener('beforeunload', function () {
      if (saveTimer) { clearTimeout(saveTimer); FF.store.save(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.FF = window.FF || {});
