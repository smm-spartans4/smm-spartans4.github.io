/* ============================================================================
   Drill editor - pick a play, pick who is on the field, write what each of
   them is being told. The routes come from the play and are never copied.

   URL:
     drill-editor.html?id=<drillId>
     drill-editor.html?new=<playId>
   ========================================================================== */
(function (FF) {
  'use strict';

  var drill = null;
  var viewer = null;
  var panelEl, saveStateEl;
  var saveTimer = null;

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }

  /* ---------- saving ------------------------------------------------------ */

  function flagSaved() {
    if (!saveStateEl) return;
    saveStateEl.textContent = 'Saved';
    saveStateEl.classList.add('is-on');
    clearTimeout(flagSaved._t);
    flagSaved._t = setTimeout(function () { saveStateEl.classList.remove('is-on'); }, 1400);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    FF.store.save();
    FF.ui.refreshBanner();
    flagSaved();
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  /* ---------- preview ------------------------------------------------------ */

  function refreshPreview() {
    var built = FF.drills.buildPlay(drill);
    var svg = document.getElementById('field');
    var controls = document.getElementById('controls');
    var legend = document.getElementById('legend');

    if (!built) {
      svg.innerHTML = '';
      controls.innerHTML = '';
      legend.innerHTML = '<p class="ff-muted ff-small">That play no longer exists.</p>';
      return;
    }

    /* Rebuilt rather than updated: the set of players on the field changes,
       and the viewer draws its controls from the play it was handed. */
    if (viewer) viewer.destroy();
    controls.innerHTML = '';
    legend.innerHTML = '';
    viewer = FF.viewer.create({
      svg: svg, controls: controls, legend: legend, play: built
    });
  }

  /* ---------- panel -------------------------------------------------------- */

  function renderPanel() {
    panelEl.innerHTML = '';

    panelEl.appendChild(h('label', { 'class': 'ff-field-label', for: 'drillName',
      text: 'Drill name' }));
    var name = h('input', { type: 'text', id: 'drillName', value: drill.name || '' });
    name.addEventListener('input', function () {
      drill.name = name.value;
      saveSoon();
      document.getElementById('drillTitle').textContent = drill.name || 'Drill';
    });
    panelEl.appendChild(name);

    /* --- which play --- */
    panelEl.appendChild(h('label', { 'class': 'ff-field-label', for: 'drillPlay',
      text: 'Built from' }));
    var playSel = h('select', { id: 'drillPlay' });
    FF.store.plays().forEach(function (p) {
      var o = h('option', { value: p.id,
        text: (p.side === 'offense' ? 'O' : 'D') + ' · ' + p.name });
      if (p.id === drill.playId) o.selected = true;
      playSel.appendChild(o);
    });
    playSel.addEventListener('change', function () {
      drill.playId = playSel.value;
      /* Positions from the old play may not exist in the new one. */
      var ok = FF.drills.availablePositions(drill);
      drill.positions = (drill.positions || []).filter(function (id) {
        return ok.indexOf(id) !== -1;
      });
      if (ok.indexOf('QB') !== -1 && drill.positions.indexOf('QB') === -1) {
        drill.positions.unshift('QB');
      }
      saveNow();
      renderPanel();
      refreshPreview();
    });
    panelEl.appendChild(playSel);

    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Routes come from that play. Fix a route there and this drill '
          + 'follows automatically.' }));

    /* The whole-drill notes: how it is set up and what it is for. Shown at the
       top of the assignments panel, so it is the first thing whoever is
       running the station reads. */
    panelEl.appendChild(h('label', { 'class': 'ff-field-label', for: 'drillNotes',
      text: 'Notes for this drill' }));
    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'How to set it up, how many reps, what to watch for — anything a '
          + 'parent running this station needs before the first whistle.' }));
    var notes = h('textarea', { id: 'drillNotes', rows: '5',
      placeholder: 'Two cones eight yards apart. Six reps each side, then '
                 + 'switch the ball carrier. Watch that the fake is sold before '
                 + 'the handoff, not after.' });
    notes.value = drill.description || '';
    notes.addEventListener('input', function () {
      drill.description = notes.value;
      saveSoon();
      if (viewer) viewer.setPlay(FF.drills.buildPlay(drill));
    });
    panelEl.appendChild(notes);

    /* --- who is on the field --- */
    panelEl.appendChild(h('div', { 'class': 'ff-field-label', text: 'Who is in the drill' }));
    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'The quarterback is always in. Pick two more for a three-player drill.' }));

    var options = FF.drills.availablePositions(drill);
    var checks = h('div', { 'class': 'ff-checks' });

    options.forEach(function (pos) {
      var on = (drill.positions || []).indexOf(pos) !== -1;
      var locked = pos === 'QB';

      var box = h('input', { type: 'checkbox', id: 'pos-' + pos });
      box.checked = on || locked;
      box.disabled = locked;
      box.addEventListener('change', function () {
        var list = (drill.positions || []).filter(function (x) { return x !== pos; });
        if (box.checked) list.push(pos);
        drill.positions = list;
        drill.positions = FF.drills.sortPositions(drill);
        saveNow();
        renderPanel();
        refreshPreview();
      });

      var lab = h('label', { 'class': 'ff-check' + (locked ? ' is-locked' : ''),
        for: box.id });
      lab.appendChild(box);
      lab.appendChild(h('span', { text: pos }));
      checks.appendChild(lab);
    });
    panelEl.appendChild(checks);

    if ((drill.positions || []).length < 2) {
      panelEl.appendChild(h('p', { 'class': 'ff-note is-warn',
        text: 'Add at least one more player - a drill of one is just a diagram.' }));
    }

    /* --- what each of them is told --- */
    panelEl.appendChild(h('h3', { 'class': 'ff-panel-head', text: 'What to tell them' }));
    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Written for whoever is running the station, not for you. Leave one '
          + 'blank and the play’s own assignment note is used instead.' }));

    var src = FF.store.playById(drill.playId);
    FF.drills.sortPositions(drill).forEach(function (pos) {
      var fromPlay = '';
      if (src) {
        var pl = src.players.filter(function (p) { return p.positionId === pos; })[0];
        fromPlay = pl ? (pl.assignmentNote || '') : '';
      }

      var wrap = h('div', { 'class': 'ff-assign' }, [
        h('div', { 'class': 'ff-assign-head' }, [
          h('span', { 'class': 'ff-pill', text: pos })
        ])
      ]);

      var ta = h('textarea', { rows: '3', placeholder: fromPlay,
        'aria-label': 'What to tell ' + pos });
      ta.value = (drill.notes && drill.notes[pos]) || '';
      ta.addEventListener('input', function () {
        drill.notes = drill.notes || {};
        drill.notes[pos] = ta.value;
        saveSoon();
        if (viewer) viewer.setPlay(FF.drills.buildPlay(drill));
      });
      wrap.appendChild(ta);
      panelEl.appendChild(wrap);
    });

    var del = h('button', { type: 'button', 'class': 'ff-btn danger', text: 'Delete drill' });
    del.addEventListener('click', function () {
      if (!window.confirm('Delete "' + (drill.name || 'this drill') + '"?')) return;
      FF.drills.remove(drill.id);
      location.href = 'drills.html';
    });
    panelEl.appendChild(h('div', { 'class': 'ff-panel-foot' }, [del]));
  }

  /* ---------- boot --------------------------------------------------------- */

  function init() {
    FF.ui.init();

    if (!FF.ui.isCoach()) {
      var id = qs('id');
      location.replace(id ? 'play-viewer.html?drill=' + id : 'drills.html');
      return;
    }

    panelEl = document.getElementById('panel');
    saveStateEl = document.getElementById('saveState');

    var existing = qs('id');
    var fromPlay = qs('new');

    if (existing) {
      drill = FF.drills.byId(existing);
    } else if (fromPlay && FF.store.playById(fromPlay)) {
      drill = FF.drills.create(fromPlay);
      FF.ui.refreshBanner();
      history.replaceState({}, '', 'drill-editor.html?id=' + drill.id);
    }

    if (!drill) {
      document.querySelector('.ff-editor').innerHTML =
        '<section class="ff-card"><div class="ff-stub"><p>That drill could not be found.</p>'
        + '<p><a class="ff-btn" href="drills.html">Back to Drills</a></p></div></section>';
      return;
    }

    document.getElementById('drillTitle').textContent = drill.name || 'Drill';
    renderPanel();
    refreshPreview();

    window.addEventListener('beforeunload', function () {
      if (saveTimer) { clearTimeout(saveTimer); FF.store.save(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.FF = window.FF || {});
