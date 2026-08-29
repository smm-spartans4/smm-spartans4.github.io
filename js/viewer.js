/* ============================================================================
   FF.viewer - the animated play viewer.

   One component, used both on its own page and embedded in the editor. It owns
   nothing but a clock: every frame it asks FF.routes where each player is and
   FF.ball where the ball is, then draws that instant. Play, pause, scrub and
   step therefore all produce identical pictures - there is no separate
   "animation" path that could drift from the scrubbed one.

   The field and the route lines are drawn once and left alone; only the player
   tokens and the ball are rebuilt per frame.
   ========================================================================== */
(function (FF) {
  'use strict';

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }

  var LABEL_KEY = 'ff.labelMode';

  function readLabelMode() {
    try { return localStorage.getItem(LABEL_KEY) || 'position'; }
    catch (e) { return 'position'; }
  }
  function writeLabelMode(v) {
    try { localStorage.setItem(LABEL_KEY, v); } catch (e) { /* private mode */ }
  }

  function create(opts) {
    var svg = opts.svg;
    var basePlay = opts.play;
    var play = basePlay;            // the flipped copy when flipping is on
    var flipped = false;
    var labelMode = readLabelMode();
    var settings = opts.settings || FF.store.settings();
    var controlsEl = opts.controls || null;
    var legendEl = opts.legend || null;
    var showRoutes = opts.showRoutes !== false;

    var ctx = null;
    var clock = null;
    var els = {};
    var lineupGroup = 0;
    var lineup = FF.store.activeLineup(null, lineupGroup).players || {};

    /* ---- naming ---------------------------------------------------------- */

    function nameFor(positionId) {
      var p = lineup[positionId];
      return p ? p.name : null;
    }

    /* What goes on the token itself. Position for the coach drawing plays;
       number or name for the kids, who find themselves far faster by their own
       jersey than by remembering they are the Y this week. Falls back to the
       position whenever this week's lineup has no one in that slot. */
    function labelFor(pl) {
      var who = lineup[pl.positionId];
      if (labelMode === 'number' && who && who.jersey) return String(who.jersey);
      if (labelMode === 'name' && who && who.name) return who.name.split(' ')[0];
      return pl.positionId;
    }

    /* Flipping is a view state, not an edit - the saved play never changes. */
    function applyFlip() {
      play = flipped ? FF.mirror.play(basePlay, settings) : basePlay;
      renderStatic();
      buildLegend();
      renderFrame(clock.getTime());
    }

    /* ---- static layers --------------------------------------------------- */

    function renderStatic() {
      ctx = FF.field.render(svg, {
        settings: settings,
        view: FF.field.viewForPlay(settings, play),
        lineOfScrimmageYard: play.lineOfScrimmageYard,
        showNoRush: play.side === 'defense'
      });

      if (!showRoutes) return;
      play.players.forEach(function (pl) {
        if (FF.routes.isStatic(pl.route)) return;
        FF.field.drawRoute(ctx, pl.route, {
          lineOfScrimmageYard: play.lineOfScrimmageYard,
          positionId: pl.positionId,
          color: '#FFFFFF',
          width: 0.24,
          opacity: 0.75
        });
      });
    }

    /* ---- per-frame ------------------------------------------------------- */

    function renderFrame(t) {
      if (!ctx) return;
      ctx.layers.tokens.innerHTML = '';
      ctx.layers.overlay.innerHTML = '';

      var faking = FF.ball.fakingAt(play, t);
      var bs = FF.ball.stateAt(play, t, settings);
      var carrier = bs ? bs.carrier : null;

      play.players.forEach(function (pl) {
        var at = FF.routes.pointAt(pl.route, t)
          || { xYards: pl.start.xYards, yYards: pl.start.yYards };

        FF.field.drawToken(ctx, {
          side: play.side,
          positionId: pl.positionId,
          xYards: at.xYards,
          absY: ctx.absY(at.yYards, play.lineOfScrimmageYard),
          label: labelFor(pl),
          faking: faking.indexOf(pl.positionId) !== -1,
          carrying: carrier === pl.positionId
        });
      });

      if (bs) {
        FF.field.drawBall(ctx, {
          xYards: bs.xYards,
          absY: ctx.absY(bs.yYards, play.lineOfScrimmageYard)
        });
      }

      syncTime(t);
      syncLegend(carrier);
    }

    /* ---- controls -------------------------------------------------------- */

    function buildControls() {
      if (!controlsEl) return;
      controlsEl.innerHTML = '';

      els.playBtn = h('button', { type: 'button', 'class': 'ff-btn ff-play',
        text: '▶ Play', 'aria-label': 'Play' });
      els.playBtn.addEventListener('click', function () { clock.toggle(); });

      els.restart = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: '⟲', title: 'Back to the snap', 'aria-label': 'Restart' });
      els.restart.addEventListener('click', function () { clock.restart(); });

      var back = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: '−0.1s', title: 'Step back', 'aria-label': 'Step back' });
      back.addEventListener('click', function () { clock.step(-0.1); });

      var fwd = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: '+0.1s', title: 'Step forward', 'aria-label': 'Step forward' });
      fwd.addEventListener('click', function () { clock.step(0.1); });

      els.scrub = h('input', { type: 'range', min: '0',
        max: String(play.durationSeconds), step: '0.02', value: '0',
        'class': 'ff-scrubber', 'aria-label': 'Scrub through the play' });
      els.scrub.addEventListener('input', function () {
        clock.pause();
        clock.setTime(parseFloat(els.scrub.value) || 0);
      });

      els.time = h('span', { 'class': 'ff-small ff-muted ff-time' });

      els.speed = h('select', { 'class': 'ff-select ff-small', 'aria-label': 'Speed' });
      [[0.25, '0.25x'], [0.5, '0.5x'], [1, '1x'], [1.5, '1.5x']].forEach(function (s) {
        var o = h('option', { value: String(s[0]), text: s[1] });
        if (s[0] === 1) o.selected = true;
        els.speed.appendChild(o);
      });
      els.speed.addEventListener('change', function () {
        clock.setSpeed(parseFloat(els.speed.value) || 1);
      });

      controlsEl.appendChild(h('div', { 'class': 'ff-controls' }, [
        els.playBtn, els.restart, back, fwd, els.scrub, els.time, els.speed
      ]));

      /* --- second row: how it is shown, not how it plays --- */

      els.flipBtn = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: '⇄ Flip', title: 'Mirror this play left-to-right, for viewing only' });
      els.flipBtn.addEventListener('click', function () {
        flipped = !flipped;
        els.flipBtn.classList.toggle('is-on', flipped);
        els.flipBtn.textContent = flipped ? '⇄ Flipped' : '⇄ Flip';
        applyFlip();
      });

      var labels = h('select', { 'class': 'ff-select ff-small', 'aria-label': 'Player labels' });
      [['position', 'Positions'], ['number', 'Numbers'], ['name', 'Names']]
        .forEach(function (m) {
          var o = h('option', { value: m[0], text: m[1] });
          if (m[0] === labelMode) o.selected = true;
          labels.appendChild(o);
        });
      labels.addEventListener('change', function () {
        labelMode = labels.value;
        writeLabelMode(labelMode);
        renderFrame(clock.getTime());
      });

      var viewRow = h('div', { 'class': 'ff-controls ff-controls-view' }, [
        els.flipBtn,
        h('span', { 'class': 'ff-small ff-muted', text: 'Label players by' }),
        labels
      ]);

      /* Every spot runs two deep, so both groups need to be able to find
         themselves. Only worth showing when a second group actually exists. */
      if (hasSecondGroup()) {
        els.groupSel = h('select', { 'class': 'ff-select ff-small',
          'aria-label': 'Which group' });
        ['Group 1', 'Group 2'].forEach(function (name, i) {
          var o = h('option', { value: String(i), text: name });
          if (i === lineupGroup) o.selected = true;
          els.groupSel.appendChild(o);
        });
        els.groupSel.addEventListener('change', function () {
          lineupGroup = parseInt(els.groupSel.value, 10) || 0;
          lineup = FF.store.activeLineup(null, lineupGroup).players || {};
          buildLegend();
          renderFrame(clock.getTime());
        });
        viewRow.appendChild(els.groupSel);
      }

      controlsEl.appendChild(viewRow);
    }

    function hasSecondGroup() {
      var g = FF.store.activeLineup(null, 0).groups || {};
      return Object.keys(g).some(function (pos) { return (g[pos] || []).length > 1; });
    }

    function syncTime(t) {
      if (els.scrub && document.activeElement !== els.scrub) {
        els.scrub.value = String(t);
      }
      if (els.time) {
        els.time.textContent = t.toFixed(1) + 's / '
          + Number(play.durationSeconds).toFixed(1) + 's';
      }
    }

    function syncButtons(playing) {
      if (!els.playBtn) return;
      els.playBtn.textContent = playing ? '❚❚ Pause' : '▶ Play';
      els.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }

    /* ---- role legend ----------------------------------------------------- */

    function buildLegend() {
      if (!legendEl) return;
      legendEl.innerHTML = '';

      legendEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
        text: FF.ball.describe(play) }));

      play.players.forEach(function (pl) {
        var who = nameFor(pl.positionId);
        var row = h('div', { 'class': 'ff-role', 'data-pos': pl.positionId }, [
          h('div', { 'class': 'ff-role-head' }, [
            h('span', { 'class': 'ff-pill', text: pl.positionId }),
            h('strong', { text: who || '' })
          ]),
          h('p', { 'class': 'ff-small', text: pl.assignmentNote || '' })
        ]);
        legendEl.appendChild(row);
      });
    }

    function syncLegend(carrier) {
      if (!legendEl) return;
      legendEl.querySelectorAll('.ff-role').forEach(function (row) {
        row.classList.toggle('is-carrier',
          !!carrier && row.getAttribute('data-pos') === carrier);
      });
    }

    /* ---- lifecycle ------------------------------------------------------- */

    clock = FF.playback.create({
      duration: play.durationSeconds || 5,
      onTick: renderFrame,
      onState: syncButtons
    });

    function setPlay(next) {
      basePlay = next;
      play = flipped ? FF.mirror.play(basePlay, settings) : basePlay;
      lineup = FF.store.activeLineup(null, lineupGroup).players || {};
      clock.pause();
      clock.setDuration(play.durationSeconds || 5);
      if (els.scrub) els.scrub.max = String(play.durationSeconds || 5);
      renderStatic();
      buildLegend();
      clock.setTime(0);
    }

    buildControls();
    renderStatic();
    buildLegend();
    renderFrame(0);

    return {
      clock: clock,
      setPlay: setPlay,
      redraw: function () { renderStatic(); renderFrame(clock.getTime()); },
      destroy: function () { clock.destroy(); }
    };
  }

  FF.viewer = { create: create };
})(window.FF = window.FF || {});
