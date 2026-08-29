/* ============================================================================
   FF.mirror - run a play to the other side.

   Mirroring is more than negating x. Position letters in this league are
   ALIGNMENT labels, not roles: X is always the left-most skill player and Z is
   always the right-most. So once the coordinates flip, the man who was X is
   now on the right, and calling him X would break the one rule the letters
   exist to express.

   A mirrored play therefore also swaps the paired labels:

       offense   X <-> Z        (C, QB and Y keep their letters)
       defense   LU <-> RU,  LD <-> RD      (RUSH keeps its label)

   Everything that referenced a swapped label has to follow it - the ball
   events especially, or a handoff to Z would end up going to the wrong player.
   Timing is never touched: a mirrored play runs on exactly the same clock.
   ========================================================================== */
(function (FF) {
  'use strict';

  var SWAP = {
    offense: { X: 'Z', Z: 'X' },
    defense: { LU: 'RU', RU: 'LU', LD: 'RD', RD: 'LD' }
  };

  function round(v) { return +Number(v).toFixed(2); }

  /* Swap the words too, keeping their capitalisation, so "run a 5-yard out to
     the left sideline" reads correctly on the mirrored copy. */
  function swapWords(text) {
    if (!text) return text;
    return String(text).replace(/\b(left|right)\b/gi, function (word) {
      var isLeft = word.toLowerCase() === 'left';
      var replacement = isLeft ? 'right' : 'left';
      if (word === word.toUpperCase()) return replacement.toUpperCase();
      if (word[0] === word[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  function mirrorName(name) {
    var swapped = swapWords(name);
    return swapped === name ? name + ' (Flipped)' : swapped;
  }

  function play(src, settings) {
    settings = settings || FF.store.settings();
    var W = settings.fieldWidthYards;
    var swap = SWAP[src.side] || {};
    var copy = JSON.parse(JSON.stringify(src));

    copy.players.forEach(function (p) {
      p.start.xYards = round(W - p.start.xYards);
      p.route = (p.route || []).map(function (pt) {
        return { t: pt.t, xYards: round(W - pt.xYards), yYards: pt.yYards };
      });
      p.positionId = swap[p.positionId] || p.positionId;
      p.assignmentNote = swapWords(p.assignmentNote);
    });

    /* Keep the players in the settings' canonical order, so panels and the
       role legend still read C, QB, X, Y, Z rather than the swapped order. */
    var order = (FF.store.positionsFor(src.side) || []).map(function (p) { return p.id; });
    copy.players.sort(function (a, b) {
      return order.indexOf(a.positionId) - order.indexOf(b.positionId);
    });

    if (copy.ball) {
      (copy.ball.carrierEvents || []).forEach(function (e) {
        if (e.toPositionId) e.toPositionId = swap[e.toPositionId] || e.toPositionId;
        if (e.fromPositionId) e.fromPositionId = swap[e.fromPositionId] || e.fromPositionId;
      });
      if (copy.ball.manualRoute) {
        copy.ball.manualRoute = copy.ball.manualRoute.map(function (pt) {
          return { t: pt.t, xYards: round(W - pt.xYards), yYards: pt.yYards };
        });
      }
    }

    copy.name = mirrorName(src.name);
    return copy;
  }

  FF.mirror = { play: play, swapWords: swapWords, mirrorName: mirrorName, SWAP: SWAP };
})(window.FF = window.FF || {});
