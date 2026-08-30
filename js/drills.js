/* ============================================================================
   FF.drills - a drill is a LENS on a play, not a copy of one.

   A drill stores three things:

     playId      which saved play it comes from
     positions   which players to put on the field (always includes the QB)
     notes       what each of those players is being told, in the coach's words

   Nothing about the routes is duplicated. Fix a route once in the play and
   every drill built on it is correct immediately - which is the whole point,
   because the alternative is the same correction typed in five places and
   quietly drifting apart.

   Two rules follow from showing only part of a play:

     No Center means no snap. The ball simply starts in the quarterback's
     hands, which is what actually happens when a parent hands it to him and
     says go.

     Anything involving a player who is not in the drill does not happen. A
     fake to Y is dropped from a QB/X/C drill rather than mimed at empty grass.
   ========================================================================== */
(function (FF) {
  'use strict';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function all() { return FF.store.get().drills || []; }

  function byId(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* Drills that would break if this play were deleted. */
  function usingPlay(playId) {
    return all().filter(function (d) { return d.playId === playId; });
  }

  function create(playId) {
    var src = FF.store.playById(playId);
    var made = {
      id: FF.store.uuid(),
      name: src ? (src.name + ' — drill') : 'New drill',
      playId: playId,
      positions: ['QB'],
      description: '',
      notes: {}
    };
    FF.store.update(function (d) {
      d.drills = d.drills || [];
      d.drills.push(made);
    });
    return made;
  }

  function remove(id) {
    FF.store.update(function (d) {
      d.drills = (d.drills || []).filter(function (x) { return x.id !== id; });
      /* Do not leave a practice block pointing at a drill that is gone. */
      (d.practices || []).forEach(function (evt) {
        (evt.itinerary || []).forEach(function (block) {
          if (block.linkedDrillId === id) block.linkedDrillId = null;
        });
      });
    });
  }

  function move(id, delta) {
    FF.store.update(function (d) {
      var list = d.drills || [];
      var from = -1;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) { from = i; break; }
      var to = from + delta;
      if (from < 0 || to < 0 || to >= list.length) return;
      list.splice(to, 0, list.splice(from, 1)[0]);
    });
  }

  /* ------------------------------------------------------------------------
     The derived play. Everything downstream - the viewer, the animation, the
     ball logic, the MP4 export - takes an ordinary play object, so a drill
     only has to become one.
     ---------------------------------------------------------------------- */
  function buildPlay(drill) {
    if (!drill) return null;
    var src = FF.store.playById(drill.playId);
    if (!src) return null;

    var keep = drill.positions || ['QB'];
    var copy = clone(src);

    copy.players = copy.players.filter(function (p) {
      return keep.indexOf(p.positionId) !== -1;
    });

    copy.players.forEach(function (p) {
      var note = drill.notes && drill.notes[p.positionId];
      if (note !== undefined && String(note).trim() !== '') p.assignmentNote = note;
    });

    var hasCenter = keep.indexOf('C') !== -1;
    copy.ball = copy.ball || { mode: 'auto', carrierEvents: [] };
    copy.ball.carrierEvents = (copy.ball.carrierEvents || []).filter(function (e) {
      if (e.type === 'snap') return hasCenter;
      return keep.indexOf(e.toPositionId) !== -1;
    });

    copy.id = 'drill-' + drill.id;
    copy.name = drill.name || copy.name;
    copy.isDrill = true;
    copy.drillNotes = drill.description || '';
    copy.sourcePlayId = src.id;
    copy.sourcePlayName = src.name;
    return copy;
  }

  /* Positions this drill could add, in the order the settings list them. */
  function availablePositions(drill) {
    var src = drill && FF.store.playById(drill.playId);
    if (!src) return [];
    var order = (FF.store.positionsFor(src.side) || []).map(function (p) { return p.id; });
    return order.filter(function (id) {
      return src.players.some(function (p) { return p.positionId === id; });
    });
  }

  /* Keep the chosen positions in the settings' order, so a drill always reads
     C, QB, X, Y, Z rather than the order they happened to be ticked. */
  function sortPositions(drill) {
    var order = availablePositions(drill);
    return (drill.positions || []).slice().sort(function (a, b) {
      return order.indexOf(a) - order.indexOf(b);
    });
  }

  FF.drills = {
    all: all, byId: byId, create: create, remove: remove, move: move,
    buildPlay: buildPlay, usingPlay: usingPlay,
    availablePositions: availablePositions, sortPositions: sortPositions
  };
})(window.FF = window.FF || {});
