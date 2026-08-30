/* ============================================================================
   Play Editor - steps 3 and 4: line everybody up, then draw their routes.

   Two modes:
     MOVE  drag a player to change where they start (their route comes along)
     DRAW  pick a player, then drag on the field to draw where they run

   Drawing is freehand: drag and the route follows your finger, with as many
   points as the shape needs. A tap adds a single corner instead, for routes
   that are just straight legs. Raw points are thinned with Douglas-Peucker so
   the stored route is the shape drawn, not the jitter.

   Ball logic lands in step 5.

   URL:
     play-editor.html?id=<playId>      edit an existing play
     play-editor.html?new=offense      create one (also: ?new=defense)
   ========================================================================== */
(function (FF) {
  'use strict';

  var SNAP = 0.5;          // start positions snap to the nearest half yard
  var EDGE = 0.8;          // keep players this far off the sideline
  var DRAW_START = 0.6;    // yards of movement before a tap becomes a stroke
  var DRAW_STEP  = 0.45;   // minimum yards between captured freehand points
  var SIMPLIFY   = 0.35;   // Douglas-Peucker tolerance, in yards

  var play = null;
  var svg, ctx, panelEl, warnEl, saveStateEl;
  var mode = 'move';       // 'move' | 'draw'
  var selectedId = null;   // positionId being drawn
  var previewT = 0;        // scrubber position, in seconds

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function snap(v) { return Math.round(v / SNAP) * SNAP; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function playerBy(id) {
    return play.players.filter(function (p) { return p.positionId === id; })[0] || null;
  }

  /* ---------- default content -------------------------------------------- */

  /* Plain language a 4th grader can act on. No "block" anywhere, and the QB is
     never told to run - neither is legal in this league. */
  var NOTES = {
    C:    'Snap the ball to the quarterback, then release and find open space.',
    QB:   'Take the snap, read the field and get the ball out. You cannot run it.',
    X:    'Run your route and get open. If the ball carrier crosses the line, stop and hold your spot.',
    Y:    'Run your route and get open. If the ball carrier crosses the line, stop and hold your spot.',
    Z:    'Run your route and get open. If the ball carrier crosses the line, stop and hold your spot.',
    RUSH: 'Start behind the rush line. At the snap, rush straight upfield at the quarterback.',
    LU:   'Cover the flat and short middle on your side. Nobody catches it in front of you for free.',
    RU:   'Cover the flat and short middle on your side. Nobody catches it in front of you for free.',
    LD:   'Cover the deep half on your side. Nothing gets behind you.',
    RD:   'Cover the deep half on your side. Nothing gets behind you.'
  };

  var DEFENSE_DEFAULT = {
    RUSH: { xYards: 15, yYards: 7.9 },
    LU:   { xYards: 8,  yYards: 5 },
    RU:   { xYards: 22, yYards: 5 },
    LD:   { xYards: 10, yYards: 13 },
    RD:   { xYards: 20, yYards: 13 }
  };

  function makePlayer(positionId, pos) {
    return {
      positionId: positionId,
      rosterPlayerId: null,
      start: { xYards: pos.xYards, yYards: pos.yYards },
      route: [
        { t: 0, xYards: pos.xYards, yYards: pos.yYards },
        { t: 1, xYards: pos.xYards, yYards: pos.yYards }
      ],
      assignmentNote: NOTES[positionId] || ''
    };
  }

  function formationById(id) {
    var list = FF.store.settings().formations || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function createPlay(side) {
    var s = FF.store.settings();
    var seed = side === 'offense'
      ? ((formationById('power') || {}).positions || {})
      : DEFENSE_DEFAULT;

    var p = {
      id: FF.store.uuid(),
      name: side === 'offense' ? 'New Offensive Play' : 'New Defensive Play',
      side: side,
      tags: [],
      durationSeconds: 5,
      lineOfScrimmageYard: s.defaultStartingYardLine,
      players: FF.store.positionsFor(side).map(function (pos) {
        return makePlayer(pos.id, seed[pos.id] || { xYards: 15, yYards: 0 });
      }),
      ball: { mode: 'auto', carrierEvents: [] }
    };

    FF.store.update(function (d) { d.plays.push(p); });
    return p;
  }

  function applyFormation(formationId) {
    var f = formationById(formationId);
    if (!f) return;
    play.players.forEach(function (pl) {
      var pos = f.positions[pl.positionId];
      if (pos) setStart(pl, pos.xYards, pos.yYards);
    });
    saveNow();
    renderPanel();
    redraw();
  }

  function saveAsFormation(formationId) {
    var f = formationById(formationId);
    if (!f) return;
    if (!window.confirm('Overwrite the "' + f.name + '" formation with these positions?\n\n'
        + 'Plays you have already saved are not affected - only new plays that '
        + 'start from ' + f.name + '.')) return;

    var positions = {};
    play.players.forEach(function (pl) {
      positions[pl.positionId] = { xYards: pl.start.xYards, yYards: pl.start.yYards };
    });
    FF.store.update(function (d) {
      d.settings.formations.forEach(function (row) {
        if (row.id === formationId) row.positions = positions;
      });
    });
    FF.ui.refreshBanner();
    flagSaved();
    notify('"' + f.name + '" formation updated from these positions.');
  }

  /* Moving a player carries their whole route with them, rather than
     flattening a drawn route back onto the start point. */
  function setStart(pl, x, y) {
    var dx = x - pl.start.xYards;
    var dy = y - pl.start.yYards;
    pl.start.xYards = x;
    pl.start.yYards = y;
    pl.route = FF.routes.translate(pl.route, dx, dy);
    if (pl.route.length) {
      pl.route[0].xYards = x;
      pl.route[0].yYards = y;
    }
  }

  /* ---------- saving ------------------------------------------------------ */

  var saveTimer = null;

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

  /* ---------- messages ---------------------------------------------------- */

  function notify(msg) {
    if (!warnEl) return;
    warnEl.textContent = msg;
    warnEl.style.display = '';
    clearTimeout(notify._t);
    notify._t = setTimeout(updateWarnings, 4000);
  }

  /* Only a RUSHING defender owes the 7 yards. Zone defenders legally line up
     much closer, so warning about all five would be noise. */
  function updateWarnings() {
    if (!warnEl) return;
    var s = FF.store.settings();
    var msgs = [];

    if (play.side === 'defense') {
      var rush = playerBy('RUSH');
      if (rush && rush.start.yYards < s.noRushZoneYards) {
        msgs.push('The rusher starts ' + rush.start.yYards.toFixed(1)
          + ' yards off the ball. A rusher must start at least '
          + s.noRushZoneYards + ' yards back.');
      }
    } else {
      var xs = ['X', 'Y', 'Z'].map(function (id) {
        var p = playerBy(id);
        return p ? p.start.xYards : null;
      });
      if (xs.every(function (v) { return v !== null; })
          && !(xs[0] <= xs[1] && xs[1] <= xs[2])) {
        msgs.push('X should be the left-most skill player, then Y, then Z. '
          + 'Right now they are out of order.');
      }

      /* The QB may roll out, but he may never carry the ball past the line. */
      var qb = playerBy('QB');
      if (qb && (qb.route || []).some(function (p) { return p.yYards > 0; })) {
        msgs.push('The quarterback’s route crosses the line of scrimmage. '
          + 'He can roll out behind the line, but he can never run the ball.');
      }

      var ev = FF.ball.realEvent(play);
      if (ev) {
        FF.ball.fakeEvents(play).forEach(function (f) {
          if (f.t >= ev.t) {
            msgs.push('The fake to ' + f.toPositionId + ' happens at or after the real '
              + ev.type + '. Fakes should come first.');
          }
        });

        if (ev.type === 'handoff') {
          var qbAt = FF.routes.pointAt(playerBy('QB').route, ev.t);
          var tgt = playerBy(ev.toPositionId);
          if (qbAt && tgt) {
            var d = FF.routes.dist(qbAt, FF.routes.pointAt(tgt.route, ev.t));
            if (d > 1.5) {
              msgs.push(ev.toPositionId + ' is ' + d.toFixed(1)
                + ' yards from the QB at the handoff, so the ball will appear to fly '
                + 'across the gap like a pitch. Use “Fit to the exchange”, or redraw '
                + 'so their paths cross.');
            }
          }
        } else {
          var flight = FF.ball.flightTime(play, ev, s);
          if (ev.t + flight > play.durationSeconds + 0.05) {
            msgs.push('The pass to ' + ev.toPositionId + ' lands after the play ends. '
              + 'Throw earlier, or make the play longer.');
          }
        }
      }
    }

    warnEl.innerHTML = msgs.map(function (m) { return '<span>' + m + '</span>'; }).join('');
    warnEl.style.display = msgs.length ? '' : 'none';
  }

  /* ---------- field ------------------------------------------------------- */

  function redraw() {
    var s = FF.store.settings();
    ctx = FF.field.render(svg, {
      settings: s,
      view: FF.field.viewForPlay(s, play),
      lineOfScrimmageYard: play.lineOfScrimmageYard,
      showNoRush: play.side === 'defense'
    });

    svg.classList.toggle('is-drawing', mode === 'draw');

    var dimOthers = (mode === 'draw' && selectedId);
    var faking = FF.ball.fakingAt(play, previewT);
    var ballState = FF.ball.stateAt(play, previewT, s);

    play.players.forEach(function (pl) {
      var isSel = pl.positionId === selectedId;
      var faded = dimOthers && !isSel;

      /* Show the zone while sizing it, so the number means something. */
      if (play.side === 'defense') {
        FF.field.drawZone(ctx, {
          positionId: pl.positionId,
          xYards: pl.start.xYards,
          absY: ctx.absY(pl.start.yYards, play.lineOfScrimmageYard),
          radiusYards: FF.field.zoneRadiusFor(pl),
          fillOpacity: faded ? 0.1 : 0.24
        });
      }

      if (!FF.routes.isStatic(pl.route)) {
        FF.field.drawRoute(ctx, pl.route, {
          lineOfScrimmageYard: play.lineOfScrimmageYard,
          positionId: pl.positionId,
          color: isSel ? '#FFEB3B' : '#FFFFFF',
          width: isSel ? 0.32 : 0.26,
          opacity: faded ? 0.3 : 1
        });
      }

      /* At the preview time, players stand where their route puts them. */
      var at = FF.routes.pointAt(pl.route, previewT)
        || { xYards: pl.start.xYards, yYards: pl.start.yYards };

      var g = FF.field.drawToken(ctx, {
        side: play.side,
        positionId: pl.positionId,
        xYards: at.xYards,
        absY: ctx.absY(at.yYards, play.lineOfScrimmageYard),
        label: pl.positionId,
        faking: faking.indexOf(pl.positionId) !== -1,
        carrying: ballState && ballState.carrier === pl.positionId
      });
      if (faded) g.setAttribute('opacity', 0.3);
      if (isSel) g.classList.add('is-selected');

      /* Editing only makes sense at the snap. Once the scrubber has moved,
         players are shown mid-route, so dragging them would be meaningless. */
      if (!atSnap()) {
        /* preview only */
      } else if (mode === 'move') {
        g.classList.add('is-draggable');
        makeDraggable(g, pl);
      } else {
        g.classList.add('is-pickable');
        g.addEventListener('pointerdown', function (e) {
          e.stopPropagation();
          select(pl.positionId);
        });
      }
    });

    /* The ball, wherever the events put it at this instant. */
    if (ballState) {
      FF.field.drawBall(ctx, {
        xYards: ballState.xYards,
        absY: ctx.absY(ballState.yYards, play.lineOfScrimmageYard)
      });
    }

    updateWarnings();
  }

  function atSnap() { return previewT <= 0.001; }

  function makeDraggable(g, pl) {
    var grab = null;

    g.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      g.setPointerCapture(e.pointerId);
      g.classList.add('is-dragging');
      var p = ctx.pointToYards(e);
      grab = {
        dx: p.xYards - pl.start.xYards,
        dy: p.absY - ctx.absY(pl.start.yYards, play.lineOfScrimmageYard)
      };
    });

    g.addEventListener('pointermove', function (e) {
      if (!grab) return;
      var p = ctx.pointToYards(e);
      var W = FF.store.settings().fieldWidthYards;
      var losAbs = FF.field.absY(FF.store.settings(), play.lineOfScrimmageYard, 0);

      var x = clamp(snap(p.xYards - grab.dx), EDGE, W - EDGE);
      var relY = clamp(snap((p.absY - grab.dy) - losAbs), -20, 25);

      setStart(pl, x, relY);

      /* Move just this token mid-drag; a full redraw every frame would rebuild
         the field and drop the pointer capture. */
      g.setAttribute('transform', 'translate(' + ctx.ux(x) + ' '
        + ctx.uy(ctx.absY(relY, play.lineOfScrimmageYard)) + ')');
      updateWarnings();
    });

    function end(e) {
      if (!grab) return;
      grab = null;
      g.classList.remove('is-dragging');
      try { g.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      saveNow();
      updateReadouts();
      redraw();
    }
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
  }

  /* ---------- route drawing ------------------------------------------------ */

  function select(positionId) {
    selectedId = positionId;
    mode = 'draw';
    renderPanel();
    redraw();
  }

  function toYards(e) {
    var s = FF.store.settings();
    var p = ctx.pointToYards(e);
    var losAbs = FF.field.absY(s, play.lineOfScrimmageYard, 0);
    return {
      xYards: +clamp(p.xYards, 0, s.fieldWidthYards).toFixed(2),
      yYards: +clamp(p.absY - losAbs, -20, 60).toFixed(2)
    };
  }

  function bindDrawing() {
    var stroke = null;

    svg.addEventListener('pointerdown', function (e) {
      if (mode !== 'draw' || !selectedId || !atSnap()) return;
      var pl = playerBy(selectedId);
      if (!pl) return;
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      stroke = { origin: toYards(e), points: null, moved: false };
    });

    svg.addEventListener('pointermove', function (e) {
      if (!stroke) return;
      var pl = playerBy(selectedId);
      if (!pl) return;
      var at = toYards(e);

      if (!stroke.moved) {
        if (FF.routes.dist(at, stroke.origin) < DRAW_START) return;
        /* Movement beyond the threshold means a freehand stroke: start a new
           route from where the player lines up. */
        stroke.moved = true;
        stroke.points = [
          { xYards: pl.start.xYards, yYards: pl.start.yYards },
          stroke.origin
        ];
      }

      var last = stroke.points[stroke.points.length - 1];
      if (FF.routes.dist(at, last) < DRAW_STEP) return;
      stroke.points.push(at);
      previewStroke(pl, stroke.points);
    });

    function finish(e) {
      if (!stroke) return;
      var pl = playerBy(selectedId);
      var s = stroke;
      stroke = null;
      try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* fine */ }
      if (!pl) return;

      if (s.moved) {
        commitRoute(pl, FF.routes.simplify(s.points, SIMPLIFY));
      } else {
        /* A tap adds one corner to the route in progress. */
        var pts = FF.routes.isStatic(pl.route)
          ? [{ xYards: pl.start.xYards, yYards: pl.start.yYards }]
          : pl.route.map(function (p) { return { xYards: p.xYards, yYards: p.yYards }; });
        pts.push(s.origin);
        commitRoute(pl, pts);
      }
    }
    svg.addEventListener('pointerup', finish);
    svg.addEventListener('pointercancel', finish);
  }

  /* Live line while the finger is still down - cheap, and replaced on commit. */
  function previewStroke(pl, pts) {
    var old = ctx.layers.overlay.querySelector('.ff-preview');
    if (old) old.remove();
    var g = FF.field.drawRoute(ctx, pts, {
      lineOfScrimmageYard: play.lineOfScrimmageYard,
      color: '#FFEB3B',
      width: 0.32,
      layer: ctx.layers.overlay
    });
    if (g) g.classList.add('ff-preview');
  }

  function commitRoute(pl, pts) {
    pl.route = FF.routes.retime(pts, play.durationSeconds || 5);
    saveNow();
    renderPanel();
    redraw();
  }

  function clearRoute(positionId) {
    var pl = playerBy(positionId);
    if (!pl) return;
    pl.route = [
      { t: 0, xYards: pl.start.xYards, yYards: pl.start.yYards },
      { t: play.durationSeconds || 5, xYards: pl.start.xYards, yYards: pl.start.yYards }
    ];
    saveNow();
    renderPanel();
    redraw();
  }

  function undoPoint(positionId) {
    var pl = playerBy(positionId);
    if (!pl || pl.route.length <= 2) { clearRoute(positionId); return; }
    var pts = pl.route.slice(0, pl.route.length - 1)
      .map(function (p) { return { xYards: p.xYards, yYards: p.yYards }; });
    commitRoute(pl, pts);
  }

  /* ---------- the ball ----------------------------------------------------- */

  function ensureSnap() {
    play.ball = play.ball || { mode: 'auto', carrierEvents: [] };
    play.ball.carrierEvents = play.ball.carrierEvents || [];
    var has = play.ball.carrierEvents.some(function (e) { return e.type === 'snap'; });
    if (!has && play.side === 'offense') {
      play.ball.carrierEvents.unshift({
        t: 0, type: 'snap', fromPositionId: 'C', toPositionId: 'QB'
      });
    }
  }

  function setRealEvent(type, toPositionId, t) {
    ensureSnap();
    play.ball.carrierEvents = play.ball.carrierEvents.filter(function (e) {
      return e.type !== 'handoff' && e.type !== 'pass';
    });
    if (type) {
      play.ball.carrierEvents.push({ t: t, type: type, toPositionId: toPositionId });
    }
    saveNow();
    renderPanel();
    redraw();
  }

  function addFake() {
    ensureSnap();
    var eligible = fakeTargets()[0];
    play.ball.carrierEvents.push({
      t: 1.0, type: 'fake-handoff', toPositionId: eligible, durationSeconds: 0.6
    });
    saveNow();
    renderPanel();
    redraw();
  }

  function removeEvent(ev) {
    play.ball.carrierEvents = play.ball.carrierEvents.filter(function (e) { return e !== ev; });
    saveNow();
    renderPanel();
    redraw();
  }

  /* Walk both routes and find the instant they come nearest each other. Only
     looks after the snap, since the ball is not the QB's before that. */
  function closestApproach(aId, bId) {
    var a = playerBy(aId), b = playerBy(bId);
    if (!a || !b) return null;
    var s = FF.store.settings();
    var from = s.snapDurationSeconds || 0.3;
    var dur = play.durationSeconds || 5;
    var best = null;

    for (var t = from; t <= dur; t += 0.02) {
      var pa = FF.routes.pointAt(a.route, t);
      var pb = FF.routes.pointAt(b.route, t);
      if (!pa || !pb) continue;
      var d = FF.routes.dist(pa, pb);
      if (!best || d < best.d) best = { t: +t.toFixed(2), d: d };
    }
    return best;
  }

  function fakeTargets() {
    return play.players
      .map(function (p) { return p.positionId; })
      .filter(function (id) { return id !== 'QB' && id !== 'C'; });
  }

  /* The quarterback may not run the ball, but he may roll out to throw from a
     different spot. This builds that path for him: a short drop, then a slide
     toward the sideline, always staying behind the line of scrimmage. */
  function rollout(pl, dir) {
    var W = FF.store.settings().fieldWidthYards;
    var sx = pl.start.xYards, sy = pl.start.yYards;
    var pts = [
      { xYards: sx, yYards: sy },
      { xYards: clamp(sx + dir * 2.5, EDGE, W - EDGE), yYards: sy - 1.5 },
      { xYards: clamp(sx + dir * 6, EDGE, W - EDGE),   yYards: sy - 1.8 },
      { xYards: clamp(sx + dir * 9, EDGE, W - EDGE),   yYards: sy - 1.2 }
    ];
    commitRoute(pl, pts);
  }

  /* ---------- side panel --------------------------------------------------- */

  function renderBallSection() {
    var s = FF.store.settings();

    panelEl.appendChild(h('h3', { 'class': 'ff-panel-head', text: 'The ball' }));

    if (play.side === 'defense') {
      panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
        text: 'Defensive play — no ball is drawn.' }));
      return;
    }

    ensureSnap();
    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Snap: C → QB at 0.0s. ' + FF.ball.describe(play) }));

    /* --- fakes --- */
    panelEl.appendChild(h('div', { 'class': 'ff-field-label', text: 'Fakes' }));

    FF.ball.fakeEvents(play).forEach(function (ev) {
      var rowEl = h('div', { 'class': 'ff-evt' });

      var kind = h('select', { 'aria-label': 'Fake type' });
      [['fake-handoff', 'Fake handoff'], ['fake-pass', 'Fake pass']].forEach(function (o) {
        var opt = h('option', { value: o[0], text: o[1] });
        if (ev.type === o[0]) opt.selected = true;
        kind.appendChild(opt);
      });
      kind.addEventListener('change', function () {
        ev.type = kind.value; saveNow(); renderPanel(); redraw();
      });

      var who = h('select', { 'aria-label': 'Fake to' });
      fakeTargets().forEach(function (id) {
        var opt = h('option', { value: id, text: 'to ' + id });
        if (ev.toPositionId === id) opt.selected = true;
        who.appendChild(opt);
      });
      who.addEventListener('change', function () {
        ev.toPositionId = who.value; saveNow(); redraw();
      });

      var at = h('input', { type: 'number', step: '0.1', min: '0',
        max: String(play.durationSeconds), value: String(ev.t),
        'aria-label': 'Fake at (seconds)' });
      at.addEventListener('change', function () {
        ev.t = clamp(parseFloat(at.value) || 0, 0, play.durationSeconds);
        at.value = String(ev.t); saveNow(); renderPanel(); redraw();
      });

      var dur = h('input', { type: 'number', step: '0.1', min: '0.1', max: '3',
        value: String(ev.durationSeconds || 0.6), 'aria-label': 'Fake lasts (seconds)' });
      dur.addEventListener('change', function () {
        ev.durationSeconds = clamp(parseFloat(dur.value) || 0.6, 0.1, 3);
        dur.value = String(ev.durationSeconds); saveNow(); redraw();
      });

      var del = h('button', { type: 'button', 'class': 'ff-row-del',
        text: '×', title: 'Remove this fake' });
      del.addEventListener('click', function () { removeEvent(ev); });

      rowEl.appendChild(kind);
      rowEl.appendChild(who);
      rowEl.appendChild(h('span', { 'class': 'ff-small ff-muted', text: 'at' }));
      rowEl.appendChild(at);
      rowEl.appendChild(h('span', { 'class': 'ff-small ff-muted', text: 'for' }));
      rowEl.appendChild(dur);
      rowEl.appendChild(del);
      panelEl.appendChild(rowEl);
    });

    var addF = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
      text: '+ Add fake' });
    addF.addEventListener('click', addFake);
    panelEl.appendChild(h('div', { 'class': 'ff-toolbar ff-tight' }, [addF]));

    /* --- the one real ball movement --- */
    panelEl.appendChild(h('div', { 'class': 'ff-field-label', text: 'Then the ball goes to' }));

    var ev = FF.ball.realEvent(play);
    var realRow = h('div', { 'class': 'ff-evt' });

    var type = h('select', { 'aria-label': 'Ball movement' });
    [['', 'Nobody (QB keeps it)'], ['handoff', 'Handoff'], ['pass', 'Pass']]
      .forEach(function (o) {
        var opt = h('option', { value: o[0], text: o[1] });
        if ((ev && ev.type) === o[0] || (!ev && o[0] === '')) opt.selected = true;
        type.appendChild(opt);
      });

    var eligible = type.value === 'pass'
      ? (s.passEligiblePositions || ['C', 'X', 'Y', 'Z'])
      : (s.handoffEligiblePositions || ['Y', 'Z']);

    var who2 = h('select', { 'aria-label': 'Ball goes to' });
    eligible.forEach(function (id) {
      var opt = h('option', { value: id, text: id });
      if (ev && ev.toPositionId === id) opt.selected = true;
      who2.appendChild(opt);
    });

    var at2 = h('input', { type: 'number', step: '0.1', min: '0',
      max: String(play.durationSeconds),
      value: String(ev ? ev.t : 1.8), 'aria-label': 'At (seconds)' });

    type.addEventListener('change', function () {
      if (!type.value) { setRealEvent(null); return; }
      var list = type.value === 'pass'
        ? (s.passEligiblePositions || ['C', 'X', 'Y', 'Z'])
        : (s.handoffEligiblePositions || ['Y', 'Z']);
      var target = list.indexOf(who2.value) !== -1 ? who2.value : list[0];
      setRealEvent(type.value, target, parseFloat(at2.value) || 1.8);
    });
    who2.addEventListener('change', function () {
      if (type.value) setRealEvent(type.value, who2.value, parseFloat(at2.value) || 1.8);
    });
    at2.addEventListener('change', function () {
      if (type.value) {
        setRealEvent(type.value, who2.value,
          clamp(parseFloat(at2.value) || 0, 0, play.durationSeconds));
      }
    });

    realRow.appendChild(type);
    if (type.value) {
      realRow.appendChild(who2);
      realRow.appendChild(h('span', { 'class': 'ff-small ff-muted', text: 'at' }));
      realRow.appendChild(at2);
    }
    panelEl.appendChild(realRow);

    /* A handoff only looks like a handoff if the two players are in the same
       place when it happens. Rather than make the coach hunt for that instant,
       find the moment their routes come closest and put the exchange there. */
    if (ev && ev.type === 'handoff') {
      var fit = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: 'Fit to the exchange' });
      fit.title = 'Move the handoff to the moment the QB and '
        + ev.toPositionId + ' are closest together';
      fit.addEventListener('click', function () {
        var best = closestApproach('QB', ev.toPositionId);
        if (!best) return;
        setRealEvent('handoff', ev.toPositionId, best.t);
        notify('Handoff moved to ' + best.t.toFixed(2) + 's, where the QB and '
          + ev.toPositionId + ' are ' + best.d.toFixed(1) + ' yards apart'
          + (best.d > 1.5
              ? ' — still a gap. Redraw so their paths actually cross.'
              : ' — that will look like a clean handoff.'));
      });
      panelEl.appendChild(h('div', { 'class': 'ff-toolbar ff-tight' }, [fit]));
    }

    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'The quarterback can never run the ball, so there is no scramble option. '
          + 'He can roll out to throw — use the rollout buttons on QB below.' }));
  }

  /* ---------- side panel --------------------------------------------------- */

  /* ---------- announcer script --------------------------------------------- */

  function renderAnnouncerSection() {
    if (!FF.announcer) return;

    panelEl.appendChild(h('h3', { 'class': 'ff-panel-head', text: 'Announcer' }));

    if (!FF.announcer.supported()) {
      panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
        text: 'This browser cannot speak. The script still saves, and devices '
            + 'that can speak will read it.' }));
    }

    var tokens = play.players.map(function (p) { return '{' + p.positionId + '}'; })
      .concat(['{play}']).join('  ');

    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Write what the announcer says. Use ' + tokens + ' — each is replaced '
          + 'with whoever is playing that spot this week, so the script never '
          + 'needs rewriting when the lineup changes.' }));

    var ta = h('textarea', { rows: '4', 'aria-label': 'Announcer script',
      placeholder: FF.announcer.defaultScript(play) });
    ta.value = play.narration || '';
    ta.addEventListener('input', function () {
      play.narration = ta.value;
      saveSoon();
    });
    panelEl.appendChild(ta);

    var tools = h('div', { 'class': 'ff-toolbar ff-tight' });

    var test = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
      text: '🔊 Test' });
    test.addEventListener('click', function () {
      if (!FF.announcer.supported()) { notify('This browser cannot speak.'); return; }
      if (FF.announcer.isSpeaking()) { FF.announcer.cancel(); return; }
      var lineup = FF.store.activeLineup().players || {};
      FF.announcer.speak(
        FF.announcer.fill(FF.announcer.scriptFor(play), play, lineup));
    });
    tools.appendChild(test);

    var useDefault = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
      text: 'Start from the ball events' });
    useDefault.title = 'Fill the box with a script built from the snap, fakes and handoff';
    useDefault.addEventListener('click', function () {
      ta.value = FF.announcer.defaultScript(play);
      play.narration = ta.value;
      saveNow();
    });
    tools.appendChild(useDefault);

    panelEl.appendChild(tools);
    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Leave it empty and the announcer reads the ball events instead. '
          + 'Each player’s job is read from the assignment notes above, so '
          + 'those need no extra writing.' }));
  }

  function updateReadouts() {
    play.players.forEach(function (pl) {
      var row = panelEl.querySelector('[data-pos="' + pl.positionId + '"] .js-readout');
      if (row) row.textContent = readout(pl);
    });
  }

  function readout(pl) {
    var pts = FF.routes.isStatic(pl.route) ? 0 : pl.route.length;
    return pl.start.xYards + ' across, ' + pl.start.yYards + ' deep'
      + (pts ? ' · route: ' + pts + ' pts, '
               + FF.routes.totalLength(pl.route).toFixed(1) + ' yd'
             : ' · no route');
  }

  function labelledInput(labelText, id, attrs, onInput, immediate) {
    var wrap = document.createDocumentFragment();
    wrap.appendChild(h('label', { 'class': 'ff-field-label', for: id, text: labelText }));
    var input = h('input', Object.assign({ id: id }, attrs));
    input.addEventListener(immediate ? 'change' : 'input', function () { onInput(input); });
    wrap.appendChild(input);
    return wrap;
  }

  function renderPanel() {
    panelEl.innerHTML = '';

    /* --- mode switch --- */
    var modes = h('div', { 'class': 'ff-modes' });
    [['move', 'Move players'], ['draw', 'Draw routes']].forEach(function (m) {
      var b = h('button', {
        type: 'button',
        'class': 'ff-mode' + (mode === m[0] ? ' is-on' : ''),
        text: m[1]
      });
      b.addEventListener('click', function () {
        mode = m[0];
        if (mode === 'move') selectedId = null;
        renderPanel();
        redraw();
      });
      modes.appendChild(b);
    });
    panelEl.appendChild(modes);

    panelEl.appendChild(h('p', { 'class': 'ff-small ff-muted ff-hint', text: mode === 'draw'
      ? (selectedId
          ? 'Drag on the field to draw ' + selectedId + '’s route. Tap to add a single corner.'
          : 'Pick a player below, or tap one on the field.')
      : 'Drag any player to change where they line up. Their route moves with them.' }));

    /* --- play settings --- */
    panelEl.appendChild(labelledInput('Play name', 'playName',
      { type: 'text', value: play.name },
      function (i) { play.name = i.value; saveSoon(); }));

    if (play.side === 'offense') {
      panelEl.appendChild(h('div', { 'class': 'ff-field-label', text: 'Start from a formation' }));
      var row = h('div', { 'class': 'ff-toolbar' });
      (FF.store.settings().formations || []).forEach(function (f) {
        var b = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small', text: f.name });
        b.title = f.description;
        b.addEventListener('click', function () { applyFormation(f.id); });
        row.appendChild(b);
      });
      panelEl.appendChild(row);

      panelEl.appendChild(h('div', { 'class': 'ff-field-label', text: 'Save these positions as' }));
      var row2 = h('div', { 'class': 'ff-toolbar' });
      (FF.store.settings().formations || []).forEach(function (f) {
        var b = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small', text: f.name });
        b.title = 'Overwrite the ' + f.name + ' preset with where the players stand now';
        b.addEventListener('click', function () { saveAsFormation(f.id); });
        row2.appendChild(b);
      });
      panelEl.appendChild(row2);
    }

    panelEl.appendChild(labelledInput('Line of scrimmage (yard line)', 'losYard',
      { type: 'number', min: '0',
        max: String(FF.store.settings().playingFieldLengthYards),
        value: String(play.lineOfScrimmageYard) },
      function (i) {
        var v = parseFloat(i.value);
        if (isNaN(v)) return;
        play.lineOfScrimmageYard = clamp(v, 0, FF.store.settings().playingFieldLengthYards);
        i.value = String(play.lineOfScrimmageYard);
        saveNow();
        redraw();
      }, true));

    panelEl.appendChild(labelledInput('Play length (seconds)', 'playLen',
      { type: 'number', min: '1', max: '15', step: '0.5',
        value: String(play.durationSeconds) },
      function (i) {
        var v = parseFloat(i.value);
        if (isNaN(v) || v <= 0) return;
        play.durationSeconds = v;
        /* Keep every route spread across the new length. */
        play.players.forEach(function (pl) {
          pl.route = FF.routes.retime(pl.route, v);
        });
        if (scrubEl) scrubEl.max = String(v);
        saveNow();
      }, true));

    panelEl.appendChild(labelledInput('Tags (comma separated)', 'playTags',
      { type: 'text', placeholder: 'run, pass, zone', value: (play.tags || []).join(', ') },
      function (i) {
        play.tags = i.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        saveSoon();
      }));

    renderBallSection();
    renderAnnouncerSection();

    /* --- per-player --- */
    panelEl.appendChild(h('h3', { 'class': 'ff-panel-head', text: 'Players & routes' }));

    var carrier = FF.ball.finalCarrier(play);
    var fakedTo = FF.ball.fakeEvents(play).map(function (e) { return e.toPositionId; });

    play.players.forEach(function (pl) {
      var isSel = mode === 'draw' && pl.positionId === selectedId;
      var wrap = h('div', {
        'class': 'ff-assign' + (isSel ? ' is-selected' : ''),
        'data-pos': pl.positionId
      });

      var head = h('div', { 'class': 'ff-assign-head' }, [
        h('span', { 'class': 'ff-pill', text: pl.positionId })
      ]);
      if (play.side === 'offense' && pl.positionId === carrier) {
        head.appendChild(h('span', { 'class': 'ff-pill is-ball', text: '🏈 gets the ball' }));
      }
      if (fakedTo.indexOf(pl.positionId) !== -1) {
        head.appendChild(h('span', { 'class': 'ff-pill is-fake', text: 'sells a fake' }));
      }
      head.appendChild(h('span', { 'class': 'ff-small ff-muted js-readout', text: readout(pl) }));
      wrap.appendChild(head);

      var tools = h('div', { 'class': 'ff-toolbar ff-tight' });

      var draw = h('button', { type: 'button',
        'class': 'ff-btn ' + (isSel ? '' : 'secondary ') + 'ff-small',
        text: isSel ? 'Drawing…' : 'Draw route' });
      draw.addEventListener('click', function () { select(pl.positionId); });
      tools.appendChild(draw);

      /* The QB gets one-click rollouts. He may move to throw from elsewhere,
         he just may never carry the ball across the line. */
      if (pl.positionId === 'QB') {
        [['◀ Roll left', -1], ['Roll right ▶', 1]].forEach(function (r) {
          var b = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
            text: r[0] });
          b.addEventListener('click', function () { rollout(pl, r[1]); });
          tools.appendChild(b);
        });
      }

      if (!FF.routes.isStatic(pl.route)) {
        var undo = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
          text: 'Undo point' });
        undo.addEventListener('click', function () { undoPoint(pl.positionId); });
        tools.appendChild(undo);

        var clr = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
          text: 'Clear' });
        clr.addEventListener('click', function () { clearRoute(pl.positionId); });
        tools.appendChild(clr);
      }
      wrap.appendChild(tools);

      /* Defenders own an area, so their zone bubble is sized here. The rusher
         defaults to none - he is rushing, not covering. */
      if (play.side === 'defense') {
        var zoneRow = h('div', { 'class': 'ff-toolbar ff-tight' }, [
          h('span', { 'class': 'ff-small ff-muted', text: 'Zone size' })
        ]);
        var zone = h('input', { type: 'number', min: '0', max: '20', step: '0.5',
          'class': 'ff-zone-input',
          'aria-label': 'Zone radius for ' + pl.positionId,
          value: String(FF.field.zoneRadiusFor(pl)) });
        zone.addEventListener('change', function () {
          var v = parseFloat(zone.value);
          pl.zoneRadiusYards = isNaN(v) ? 0 : clamp(v, 0, 20);
          zone.value = String(pl.zoneRadiusYards);
          saveNow();
          redraw();
        });
        zoneRow.appendChild(zone);
        zoneRow.appendChild(h('span', { 'class': 'ff-small ff-muted',
          text: pl.positionId === 'RUSH' ? 'yards (0 = rushing, no zone)' : 'yards' }));
        wrap.appendChild(zoneRow);
      }

      var ta = h('textarea', { rows: '3', 'aria-label': 'Assignment for ' + pl.positionId });
      ta.value = pl.assignmentNote || '';
      ta.addEventListener('input', function () { pl.assignmentNote = ta.value; saveSoon(); });
      wrap.appendChild(ta);

      panelEl.appendChild(wrap);
    });

    /* Same routes, different ball action - the fastest way to build the pass
       version of a run you already drew. */
    var dupe = h('button', { type: 'button', 'class': 'ff-btn secondary',
      text: '⧉ Duplicate as new play' });
    dupe.addEventListener('click', function () {
      var name = window.prompt('Name for the copy:', play.name.replace(/ run$/i, '') + ' Pass');
      if (name === null) return;
      var copy = FF.store.duplicatePlay(play.id, name.trim() || (play.name + ' (copy)'));
      if (copy) location.href = 'play-editor.html?id=' + copy.id;
    });
    var flip = h('button', { type: 'button', 'class': 'ff-btn secondary',
      text: '⇄ Flip & save as new' });
    flip.title = 'Save a mirrored copy, so you can call it to either side';
    flip.addEventListener('click', function () {
      var suggested = FF.mirror.mirrorName(play.name);
      var name = window.prompt('Name for the mirrored play:', suggested);
      if (name === null) return;
      var made = FF.store.mirrorPlayAsNew(play.id, name.trim() || suggested);
      if (made) location.href = 'play-editor.html?id=' + made.id;
    });

    panelEl.appendChild(h('div', { 'class': 'ff-panel-foot' }, [dupe, flip]));

    var del = h('button', { type: 'button', 'class': 'ff-btn danger', text: 'Delete play' });
    del.addEventListener('click', function () {
      if (!window.confirm('Delete "' + play.name + '"? This cannot be undone.')) return;
      FF.store.update(function (d) {
        d.plays = d.plays.filter(function (p) { return p.id !== play.id; });
      });
      location.href = 'plays.html';
    });
    panelEl.appendChild(h('div', { 'class': 'ff-panel-foot' }, [del]));
  }

  /* ---------- preview scrubber --------------------------------------------
     Not the real player - that is step 6. This just freezes the play at an
     instant so the ball events can be checked while building them. Editing is
     disabled anywhere but the snap, since mid-route positions are derived.
     ---------------------------------------------------------------------- */

  var scrubEl, scrubTimeEl, hintEl, playBtn, clock;

  function bindScrubber() {
    scrubEl = document.getElementById('scrub');
    scrubTimeEl = document.getElementById('scrubTime');
    hintEl = document.getElementById('editHint');
    playBtn = document.getElementById('scrubPlay');

    clock = FF.playback.create({
      duration: play.durationSeconds || 5,
      onTick: function (t) {
        previewT = t;
        scrubEl.value = String(t);
        scrubTimeEl.textContent = t.toFixed(1) + 's';
        if (clock.isPlaying()) frameOnly(); else { updateHint(); redraw(); }
      },
      onState: function (playing) {
        playBtn.textContent = playing ? '❚❚' : '▶';
        if (!playing) { updateHint(); redraw(); }
      }
    });

    scrubEl.max = String(play.durationSeconds || 5);
    scrubEl.addEventListener('input', function () {
      clock.pause();
      clock.setTime(parseFloat(scrubEl.value) || 0);
    });

    playBtn.addEventListener('click', function () { clock.toggle(); });
    document.getElementById('scrubReset').addEventListener('click', function () {
      clock.restart();
    });
    updateHint();
  }

  /* While the clock is running we only rebuild the moving parts, so playback
     stays smooth and never re-attaches drag handlers mid-flight. */
  function frameOnly() {
    if (!ctx) return;
    ctx.layers.tokens.innerHTML = '';
    ctx.layers.overlay.innerHTML = '';

    var s = FF.store.settings();
    var faking = FF.ball.fakingAt(play, previewT);
    var bs = FF.ball.stateAt(play, previewT, s);

    play.players.forEach(function (pl) {
      var at = FF.routes.pointAt(pl.route, previewT)
        || { xYards: pl.start.xYards, yYards: pl.start.yYards };
      FF.field.drawToken(ctx, {
        side: play.side,
        positionId: pl.positionId,
        xYards: at.xYards,
        absY: ctx.absY(at.yYards, play.lineOfScrimmageYard),
        label: pl.positionId,
        faking: faking.indexOf(pl.positionId) !== -1,
        carrying: bs && bs.carrier === pl.positionId
      });
    });

    if (bs) {
      FF.field.drawBall(ctx, {
        xYards: bs.xYards,
        absY: ctx.absY(bs.yYards, play.lineOfScrimmageYard)
      });
    }
  }

  function updateHint() {
    if (!hintEl) return;
    if (!atSnap()) {
      hintEl.textContent = 'Previewing at ' + previewT.toFixed(1)
        + 's. Press Snap to get back to the start and keep editing.';
      return;
    }
    hintEl.textContent = mode === 'draw'
      ? 'Drag on the field to draw a route. Tap to add a single corner.'
      : 'Drag any player to change where they line up. Their route moves with them.';
  }

  /* ---------- boot --------------------------------------------------------- */

  function init() {
    FF.ui.init();

    /* The editor is coach-only. A parent who lands here - a stale link, a
       bookmark - is sent to the viewer rather than shown a wall of controls. */
    if (!FF.ui.isCoach()) {
      var wanted = qs('id');
      location.replace(wanted ? 'play-viewer.html?id=' + wanted : 'plays.html');
      return;
    }

    svg = document.getElementById('field');
    panelEl = document.getElementById('panel');
    warnEl = document.getElementById('warn');
    saveStateEl = document.getElementById('saveState');

    var id = qs('id');
    var side = qs('new');

    if (id) {
      play = FF.store.playById(id);
    } else if (side === 'offense' || side === 'defense') {
      play = createPlay(side);
      FF.ui.refreshBanner();
      /* Swap in the real id so a refresh does not create a second play. */
      history.replaceState({}, '', 'play-editor.html?id=' + play.id);
    }

    if (!play) {
      document.querySelector('.ff-editor').innerHTML =
        '<section class="ff-card"><div class="ff-stub"><p>That play could not be found.</p>'
        + '<p><a class="ff-btn" href="plays.html">Back to Plays</a></p></div></section>';
      return;
    }

    document.getElementById('sideBadge').textContent =
      play.side === 'offense' ? 'Offense' : 'Defense';

    bindScrubber();
    renderPanel();
    redraw();
    bindDrawing();

    window.addEventListener('beforeunload', function () {
      if (saveTimer) { clearTimeout(saveTimer); FF.store.save(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.FF = window.FF || {});
