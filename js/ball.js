/* ============================================================================
   FF.ball - where the ball is at any instant, derived from the play.

   In "auto" mode nothing about the ball's path is hand-drawn. It is computed
   from the ball events plus the players' own routes, so the ball can never
   drift out of sync with the people carrying it.

   The sequence a play may contain:
     1. SNAP           always, at t=0: Center -> Quarterback
     2. FAKES          zero or more. A fake does NOT move the ball - the ball
                       stays with the QB. It only marks a decoy for a window
                       of time, so play-action and misdirection can be drawn.
     3. ONE real move  either a HANDOFF (to Y or Z) or a PASS (to C, X, Y, Z).
                       After it, the ball rides that player's route.

   There is no scramble. In this league the quarterback may never run the ball,
   so it is not a state this module can produce.
   ========================================================================== */
(function (FF) {
  'use strict';

  var HANDOFF_SECONDS = 0.18;   // a quick exchange, not a pitch

  function playerOf(play, positionId) {
    if (!positionId) return null;
    return play.players.filter(function (p) {
      return p.positionId === positionId;
    })[0] || null;
  }

  function posAt(play, positionId, t) {
    var pl = playerOf(play, positionId);
    if (!pl) return null;
    return FF.routes.pointAt(pl.route, t) ||
      { xYards: pl.start.xYards, yYards: pl.start.yYards };
  }

  function events(play) {
    return ((play.ball && play.ball.carrierEvents) || [])
      .slice()
      .sort(function (a, b) { return (a.t || 0) - (b.t || 0); });
  }

  function isFake(e) { return e.type === 'fake-handoff' || e.type === 'fake-pass'; }
  function isReal(e) { return e.type === 'handoff' || e.type === 'pass'; }

  function realEvent(play) {
    return events(play).filter(isReal)[0] || null;
  }

  function fakeEvents(play) {
    return events(play).filter(isFake);
  }

  /* Which players are selling a fake right now. Purely visual - this never
     affects where the ball actually is. */
  function fakingAt(play, t) {
    return fakeEvents(play)
      .filter(function (e) {
        var dur = e.durationSeconds || 0.6;
        return t >= e.t && t <= e.t + dur;
      })
      .map(function (e) { return e.toPositionId; })
      .filter(Boolean);
  }

  function lerp(a, b, f) {
    return {
      xYards: a.xYards + (b.xYards - a.xYards) * f,
      yYards: a.yYards + (b.yYards - a.yYards) * f
    };
  }

  function dist(a, b) {
    var dx = a.xYards - b.xYards, dy = a.yYards - b.yYards;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* How long a pass hangs in the air. The receiver keeps moving while the ball
     travels, so we solve it once with their position at the throw, then again
     against where that flight time actually puts them. */
  function flightTime(play, ev, settings) {
    var speed = settings.passSpeedYardsPerSecond || 14;
    var from = posAt(play, 'QB', ev.t);
    var to = posAt(play, ev.toPositionId, ev.t);
    if (!from || !to) return 0.4;
    var first = dist(from, to) / speed;
    var to2 = posAt(play, ev.toPositionId, ev.t + first) || to;
    return Math.max(0.25, dist(from, to2) / speed);
  }

  /* A gentle bow so a pass reads as a throw rather than a handoff, drawn as a
     quadratic Bezier bulging perpendicular to the line of flight. */
  function arc(from, to, f) {
    var dx = to.xYards - from.xYards, dy = to.yYards - from.yYards;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bow = Math.min(1.6, len * 0.12);
    var cx = (from.xYards + to.xYards) / 2 + (-dy / len) * bow;
    var cy = (from.yYards + to.yYards) / 2 + (dx / len) * bow;
    var u = 1 - f;
    return {
      xYards: u * u * from.xYards + 2 * u * f * cx + f * f * to.xYards,
      yYards: u * u * from.yYards + 2 * u * f * cy + f * f * to.yYards
    };
  }

  /* ------------------------------------------------------------------------
     stateAt(play, t, settings)

     Returns null when no ball should be drawn (defensive plays), otherwise
     { xYards, yYards, carrier, phase } where carrier is the position holding
     it, or null while it is in the air / mid-exchange.
     ---------------------------------------------------------------------- */
  function stateAt(play, t, settings) {
    if (!play || play.side === 'defense') return null;
    settings = settings || FF.store.settings();

    var qb = posAt(play, 'QB', t);
    var c = posAt(play, 'C', t);
    if (!qb || !c) return null;

    /* Manual override for trick plays. */
    if (play.ball && play.ball.mode === 'manual'
        && play.ball.manualRoute && play.ball.manualRoute.length > 1) {
      var mp = FF.routes.pointAt(play.ball.manualRoute, t);
      return { xYards: mp.xYards, yYards: mp.yYards, carrier: null, phase: 'manual' };
    }

    var snapDur = settings.snapDurationSeconds || 0.3;

    if (t < snapDur) {
      var f = snapDur ? (t / snapDur) : 1;
      var p = lerp(c, qb, f);
      return { xYards: p.xYards, yYards: p.yYards, carrier: null, phase: 'snap' };
    }

    var ev = realEvent(play);
    if (!ev || t < ev.t) {
      return { xYards: qb.xYards, yYards: qb.yYards, carrier: 'QB', phase: 'qb' };
    }

    var target = posAt(play, ev.toPositionId, t);
    if (!target) {
      return { xYards: qb.xYards, yYards: qb.yYards, carrier: 'QB', phase: 'qb' };
    }

    if (ev.type === 'handoff') {
      if (t < ev.t + HANDOFF_SECONDS) {
        var hf = (t - ev.t) / HANDOFF_SECONDS;
        var hp = lerp(posAt(play, 'QB', t), target, hf);
        return { xYards: hp.xYards, yYards: hp.yYards, carrier: null, phase: 'handoff' };
      }
      return {
        xYards: target.xYards, yYards: target.yYards,
        carrier: ev.toPositionId, phase: 'carried'
      };
    }

    /* pass */
    var flight = flightTime(play, ev, settings);
    if (t < ev.t + flight) {
      var from = posAt(play, 'QB', ev.t);
      var to = posAt(play, ev.toPositionId, ev.t + flight);
      var ap = arc(from, to, (t - ev.t) / flight);
      return { xYards: ap.xYards, yYards: ap.yYards, carrier: null, phase: 'flight' };
    }
    return {
      xYards: target.xYards, yYards: target.yYards,
      carrier: ev.toPositionId, phase: 'carried'
    };
  }

  /* Who ends up with the ball - used for the "who scores on this play" badge. */
  function finalCarrier(play) {
    var ev = realEvent(play);
    return ev ? ev.toPositionId : (play.side === 'offense' ? 'QB' : null);
  }

  /* One plain sentence describing the play's ball action. */
  function describe(play) {
    if (play.side === 'defense') return 'Defensive play - no ball is drawn.';
    var fakes = fakeEvents(play);
    var ev = realEvent(play);
    var bits = ['Snap to the QB'];
    fakes.forEach(function (f) {
      bits.push((f.type === 'fake-pass' ? 'fake pass' : 'fake handoff')
        + ' to ' + f.toPositionId);
    });
    if (ev) {
      bits.push((ev.type === 'pass' ? 'pass' : 'handoff') + ' to ' + ev.toPositionId);
    } else {
      bits.push('no handoff or pass set');
    }
    return bits.join(', then ') + '.';
  }

  FF.ball = {
    stateAt: stateAt,
    fakingAt: fakingAt,
    realEvent: realEvent,
    fakeEvents: fakeEvents,
    flightTime: flightTime,
    finalCarrier: finalCarrier,
    describe: describe,
    events: events,
    HANDOFF_SECONDS: HANDOFF_SECONDS
  };
})(window.FF = window.FF || {});
